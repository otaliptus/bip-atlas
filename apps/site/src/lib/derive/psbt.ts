import { combinePsbts, nonWitnessUtxoMatches, parsePsbt, parseTypeRegistry, serializePsbt, extractTransaction, measureTransaction, parseTransaction, type FieldName, type Psbt, type PsbtRecord } from "@bip-atlas/models";
import type { DerivedPsbtCombineFixture, DerivedPsbtTraceFixture, PsbtCombineFixture, PsbtRecordView, PsbtTraceFixture } from "@bip-atlas/figures";
import { pinnedText } from "./sources";

let registry: FieldName[] | null = null;
const fieldRegistry = () => (registry ??= parseTypeRegistry(pinnedText("bip-0174/type-registry.mediawiki")));

const leU32 = (hex: string) => parseInt(hex.match(/../g)!.reverse().join(""), 16);
export const btc = (sats: bigint) => `${sats / 100000000n}.${(sats % 100000000n).toString().padStart(8, "0")}`;

function readValue(scope: string, r: PsbtRecord, psbt: Psbt, index: number): string | null {
  const bytes = r.valueHex.length / 2;
  if (scope === "global" && r.keyType === 0x00) return `${psbt.unsignedTx.inputs.length} inputs, ${psbt.unsignedTx.outputs.length} outputs, ${bytes} bytes, scriptSigs empty`;
  if (scope === "input" && r.keyType === 0x00) return `whole previous transaction, ${bytes} bytes; its hash ${nonWitnessUtxoMatches(psbt, index) ? "matches" : "does not match"} the input’s prevout`;
  if (scope === "input" && r.keyType === 0x01) {
    const sats = BigInt(`0x${r.valueHex.slice(0, 16).match(/../g)!.reverse().join("")}`);
    return `spent output: ${btc(sats)} BTC and its ${bytes - 9}-byte script`;
  }
  if (scope === "input" && r.keyType === 0x02) return `signature for public key ${r.keyDataHex.slice(0, 10)}…, sighash byte ${r.valueHex.slice(-2)}`;
  if (scope === "input" && r.keyType === 0x03) return r.valueHex === "01000000" ? "SIGHASH_ALL" : `sighash type ${leU32(r.valueHex)}`;
  if ((scope === "input" && r.keyType === 0x06) || (scope === "output" && r.keyType === 0x02)) {
    const fp = r.valueHex.slice(0, 8);
    const path = (r.valueHex.slice(8).match(/.{8}/g) ?? []).map((h) => {
      const v = leU32(h);
      return v >= 0x80000000 ? `${v - 0x80000000}'` : String(v);
    });
    return `master fingerprint ${fp}, path m/${path.join("/")}`;
  }
  if ((scope === "input" && (r.keyType === 0x04 || r.keyType === 0x05)) || (scope === "output" && (r.keyType === 0x00 || r.keyType === 0x01))) return `${bytes}-byte script`;
  if (scope === "input" && r.keyType === 0x07) return `final scriptSig, ${bytes} bytes`;
  if (scope === "input" && r.keyType === 0x08) return `final witness, ${parseInt(r.valueHex.slice(0, 2), 16)} items`;
  return null;
}

function recordViews(psbt: Psbt) {
  const reg = fieldRegistry();
  const view = (scope: "global" | "input" | "output", index: number) => (r: PsbtRecord): PsbtRecordView => {
    const entry = reg.find((e) => e.scope === scope && e.keyType === r.keyType);
    return {
      scope,
      index,
      keyType: r.keyType,
      name: entry?.name ?? "Unknown type",
      constant: entry?.constant ?? null,
      parentBip: entry ? entry.parentBip : null,
      keyDataHex: r.keyDataHex,
      valueHex: r.valueHex,
      reading: readValue(scope, r, psbt, index),
    };
  };
  return [
    { scope: "global" as const, index: 0, records: psbt.global.map(view("global", 0)) },
    ...psbt.inputs.map((m, i) => ({ scope: "input" as const, index: i, records: m.map(view("input", i)) })),
    ...psbt.outputs.map((m, i) => ({ scope: "output" as const, index: i, records: m.map(view("output", i)) })),
  ];
}

export function derivePsbtTrace(f: PsbtTraceFixture): DerivedPsbtTraceFixture {
  const parsed = new Map(f.steps.map((s) => [s.id, parsePsbt(s.hex)]));
  const combiner = f.steps.find((s) => s.basedOn.length > 1);
  if (combiner && serializePsbt(combinePsbts(combiner.basedOn.map((id) => parsed.get(id)!))) !== combiner.hex) {
    throw new Error(`${f.id}: combining ${combiner.basedOn.join(" + ")} does not reproduce line ${combiner.line}`);
  }
  // The figures say either order gives the same bytes: check the other order too.
  if (combiner && serializePsbt(combinePsbts([...combiner.basedOn].reverse().map((id) => parsed.get(id)!))) !== combiner.hex) {
    throw new Error(`${f.id}: combining in the reverse order does not reproduce line ${combiner.line}`);
  }
  const magicHex = f.steps[0].hex.slice(0, 10);
  if (f.steps.some((s) => s.hex.slice(0, 10) !== magicHex) || magicHex !== "70736274ff") throw new Error(`${f.id}: a state does not start with the PSBT magic`);
  const reversed = (hex: string) => hex.match(/../g)!.reverse().join("");
  const last = f.steps.at(-1)!;
  if (extractTransaction(parsed.get(last.id)!) !== f.extracted.hex) throw new Error(`${f.id}: extraction differs from line ${f.extracted.line}`);
  const sig = (r: { scope: string; index: number; keyType: number; keyDataHex: string; valueHex: string }) => `${r.scope}/${r.index}/${r.keyType}/${r.keyDataHex}/${r.valueHex}`;
  const states = f.steps.map((step) => {
    const maps = recordViews(parsed.get(step.id)!);
    const before = new Map(step.basedOn.flatMap((id) => recordViews(parsed.get(id)!).flatMap((m) => m.records)).map((r) => [sig(r), r]));
    const now = new Set(maps.flatMap((m) => m.records).map(sig));
    const sets = step.basedOn.map((id) => new Set(recordViews(parsed.get(id)!).flatMap((m) => m.records).map(sig)));
    const uniqueFrom =
      step.basedOn.length > 1 ? sets.map((own, i) => [...own].filter((k) => sets.every((other, j) => j === i || !other.has(k))).length) : null;
    return {
      id: step.id,
      role: step.role,
      line: step.line,
      basedOn: step.basedOn,
      bytes: step.hex.length / 2,
      uniqueFrom,
      maps: maps.map((m) => ({
        ...m,
        records: m.records.map((r) => ({ ...r, status: (step.basedOn.length === 0 || before.has(sig(r)) ? "kept" : "added") as "added" | "kept" })),
        removed: [...before.values()].filter((r) => r.scope === m.scope && r.index === m.index && !now.has(sig(r))),
      })),
    };
  });
  const tx = parseTransaction(f.extracted.hex);
  const m = measureTransaction(tx);
  // The signer's view: the first state that carries UTXOs (the Updater's).
  const withUtxos = f.steps.map((s) => parsed.get(s.id)!).find((p) => p.inputs.every((inp) => inp.some((r) => r.keyType === 0x00 || r.keyType === 0x01)));
  if (!withUtxos) throw new Error(`${f.id}: no state carries a UTXO for every input`);
  const ins = withUtxos.inputs.map((inp, i) => {
    const prevout = withUtxos.unsignedTx.inputs[i].prevoutHex;
    const vout = leU32(prevout.slice(64));
    const full = inp.find((r) => r.keyType === 0x00);
    if (full) {
      const prev = parseTransaction(full.valueHex);
      const computed = measureTransaction(prev).txidHex;
      if (computed !== prevout.slice(0, 64)) throw new Error(`${f.id}: input ${i} non-witness UTXO does not hash to its prevout`);
      const out = prev.outputs[vout];
      if (!out) throw new Error(`${f.id}: input ${i} prevout index ${vout} is not in its UTXO`);
      return { index: i, sats: out.valueSats, from: "non-witness-utxo" as const, check: { inputIndex: i, utxoBytes: full.valueHex.length / 2, computedTxidHex: computed, prevoutTxidHex: prevout.slice(0, 64), vout, displayTxidHex: reversed(computed) } };
    }
    const wit = inp.find((r) => r.keyType === 0x01)!;
    return { index: i, sats: BigInt(`0x${wit.valueHex.slice(0, 16).match(/../g)!.reverse().join("")}`), from: "witness-utxo" as const, check: null };
  });
  const utxoCheck = ins.find((x) => x.check)?.check;
  if (!utxoCheck) throw new Error(`${f.id}: no input carries a non-witness UTXO`);
  if (!pinnedText("bip-0174.mediawiki").includes(`TXID: <tt>${utxoCheck.displayTxidHex}</tt>`)) throw new Error(`${f.id}: the checked txid is not the one BIP 174 lists`);
  const outSats = withUtxos.unsignedTx.outputs.reduce((n, o) => n + o.valueSats, 0n);
  const fee = ins.reduce((n, x) => n + x.sats, 0n) - outSats;
  if (fee < 0n) throw new Error(`${f.id}: outputs exceed inputs`);
  return {
    ...f,
    derived: {
      states,
      extracted: { bytes: f.extracted.hex.length / 2, txidHex: m.txidHex, wtxidHex: m.wtxidHex, inputs: tx.inputs.length, outputs: tx.outputs.length, txidDisplayHex: reversed(m.txidHex) },
      magicHex,
      outputsBtc: tx.outputs.map((o) => btc(o.valueSats)),
      utxoCheck,
      amounts: { inputs: ins.map((x) => ({ index: x.index, btc: btc(x.sats), from: x.from })), outputsBtc: withUtxos.unsignedTx.outputs.map((o) => btc(o.valueSats)), feeBtc: btc(fee) },
    },
  };
}

export function derivePsbtCombine(f: PsbtCombineFixture): DerivedPsbtCombineFixture {
  const parts = f.parts.map((p) => parsePsbt(p.hex));
  const combined = combinePsbts(parts);
  if (serializePsbt(combined) !== f.combined.hex) throw new Error(`${f.id}: combiner output differs from line ${f.combined.line}`);
  const flat = (p: Psbt) => recordViews(p).flatMap((m) => m.records);
  return {
    ...f,
    derived: {
      parts: f.parts.map((p, i) => ({ line: p.line, records: flat(parts[i]) })),
      combined: { line: f.combined.line, records: flat(parsePsbt(f.combined.hex)) },
    },
  };
}
