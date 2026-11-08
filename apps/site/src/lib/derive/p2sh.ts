import { parsePsbt, bytesToHex, hexToBytes, parseTransaction, traceP2sh, decodeScript, hash160 } from "@bip-atlas/models";
import type { DerivedP2shFixture, P2shSpendFixture, P2shItemKind } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE3, pinnedText } from "./sources";
import { scriptAsm } from "./tapscript";

export function deriveP2sh(f: P2shSpendFixture): DerivedP2shFixture {
  const lines = (bip: number) => pinnedText(`bip-${String(bip).padStart(4, "0")}.mediawiki`, SNAPSHOT_PHASE3).split("\n");
  if (!lines(f.source.bip!)[f.source.line! - 1].includes(f.txHex)) throw new Error(`${f.id}: transaction is not on BIP ${f.source.bip} line ${f.source.line}`);
  let spk: string;
  let amount: bigint | null = f.amountSats === null ? null : BigInt(f.amountSats);
  const pv = f.prevout;
  if (pv.from === "bip-line") {
    const l = lines(f.source.bip!)[pv.line - 1];
    if (!l.includes(pv.scriptPubKeyHex) || !l.includes(pv.amountQuote)) throw new Error(`${f.id}: spent output differs from line ${pv.line}`);
    spk = pv.scriptPubKeyHex;
  } else {
    const hex = /<pre>([0-9a-f]+)<\/pre>/.exec(lines(174)[pv.line - 1])?.[1];
    if (!hex) throw new Error(`${f.id}: no PSBT on BIP 174 line ${pv.line}`);
    const rec = parsePsbt(hex).inputs[pv.inputIndex].find((r) => r.keyType === (pv.from === "psbt-witness-utxo" ? 0x01 : 0x00));
    if (!rec) throw new Error(`${f.id}: PSBT input ${pv.inputIndex} has no UTXO record`);
    if (pv.from === "psbt-witness-utxo") {
      spk = rec.valueHex.slice(18);
      const value = BigInt(`0x${rec.valueHex.slice(0, 16).match(/../g)!.reverse().join("")}`);
      if (amount !== value) throw new Error(`${f.id}: amount differs from the PSBT's witness UTXO`);
    } else {
      const prev = parseTransaction(rec.valueHex);
      const vout = parseInt(parseTransaction(f.txHex).inputs[f.inputIndex].prevoutHex.slice(64).match(/../g)!.reverse().join(""), 16);
      spk = prev.outputs[vout].scriptPubKeyHex;
    }
  }
  const t = traceP2sh(f.txHex, f.inputIndex, spk, amount);
  if (!t.valid) throw new Error(`${f.id}: the recorded spend does not validate`);
  const tx = parseTransaction(f.txHex);
  const wit = tx.witnesses[f.inputIndex] ?? [];
  const witnessScriptHex = t.kind === "p2sh-p2wsh" ? wit[wit.length - 1] : null;
  // What each item on the stacks is, checked structurally; anything else stops the build.
  const itemKinds: Record<string, P2shItemKind> = {};
  const kindOf = (hex: string): P2shItemKind => {
    const n = hex.length / 2;
    if (hex === "") return "empty";
    if (hex === t.redeemScriptHex) return "redeem script";
    if (witnessScriptHex && hex === witnessScriptHex) return "witness script";
    if (hex.startsWith("30") && n === 2 + parseInt(hex.slice(2, 4), 16) + 1) return "signature";
    if (n === 33 && (hex.startsWith("02") || hex.startsWith("03"))) return "public key";
    if (n === 20) return "hash";
    if (n <= 4) return "number";
    throw new Error(`${f.id}: stack item of ${n} bytes is outside the reviewed kinds`);
  };
  for (const s of t.stages) for (const item of [...s.stackBefore, ...s.steps.flatMap((x) => x.stackAfter)]) itemKinds[item] = kindOf(item);
  if (witnessScriptHex) itemKinds[witnessScriptHex] = kindOf(witnessScriptHex);
  // A legacy multisig spend, broken three ways and re-run through the model.
  let failures: DerivedP2shFixture["derived"]["failures"] = null;
  if (t.kind === "legacy") {
    const seg = tx.segments.find((g) => g.id === `input.${f.inputIndex}.scriptsig`)!;
    const withSig = (sig: string) => {
      const n = sig.length / 2;
      if (n >= 0xfd) throw new Error(`${f.id}: scriptSig too long for this check`);
      return tx.segments.map((g) => (g === seg ? n.toString(16).padStart(2, "0") + sig : g.hex)).join("");
    };
    const sigHex = tx.inputs[f.inputIndex].scriptSigHex;
    const redeem = t.redeemScriptHex;
    const at = redeem.length / 2 - 1;
    const altered = redeem.slice(0, -2) + (redeem.endsWith("ae") ? "af" : "ae");
    const ta = traceP2sh(withSig(sigHex.replace(redeem, altered)), f.inputIndex, spk, amount);
    const tn = traceP2sh(withSig("76" + sigHex), f.inputIndex, spk, amount);
    const ops = decodeScript(sigHex).map((o) => o.dataHex!);
    const push = (h: string) => {
      if (h.length / 2 > 75) throw new Error(`${f.id}: a pushed item over 75 bytes is outside this check`);
      return h === "" ? "00" : (h.length / 2).toString(16).padStart(2, "0") + h;
    };
    if (ops.length !== 4 || ops[0] !== "") throw new Error(`${f.id}: expected OP_0, two signatures and the redeem script`);
    const ts = traceP2sh(withSig(push(ops[0]) + push(ops[2]) + push(ops[1]) + push(redeem)), f.inputIndex, spk, amount);
    const failsAt = (x: typeof ta) => x.stages.find((s) => !s.ok)?.id;
    if (ta.valid || failsAt(ta) !== "hash-match" || tn.valid || failsAt(tn) !== "push-only" || ts.valid || failsAt(ts) !== "redeem") {
      throw new Error(`${f.id}: a broken spend did not fail where expected`);
    }
    const swappedChecks = ts.stages.find((s) => s.id === "redeem")?.steps.find((x) => x.checks)?.checks;
    if (!swappedChecks?.length) throw new Error(`${f.id}: the swapped spend recorded no signature checks`);
    failures = {
      alteredRedeem: { byteIndex: at, fromHex: redeem.slice(-2), toHex: altered.slice(-2), hash160Hex: bytesToHex(hash160(hexToBytes(altered))), failsAt: "hash-match" },
      nonPush: { opHex: "76", opName: "OP_DUP", failsAt: "push-only" },
      swapped: { failsAt: "redeem", checks: swappedChecks },
    };
  }
  return {
    ...f,
    derived: {
      itemKinds,
      witnessScriptHex,
      failures,
      kind: t.kind,
      valid: t.valid,
      scriptPubKeyHex: spk,
      committedHashHex: spk.slice(4, 44),
      redeemScriptHex: t.redeemScriptHex,
      redeemAsm: scriptAsm(t.redeemScriptHex),
      redeemHash160Hex: bytesToHex(hash160(hexToBytes(t.redeemScriptHex))),
      redeemSigops: t.redeemSigops,
      scriptSigBytes: tx.inputs[f.inputIndex].scriptSigHex.length / 2,
      // Serialized witness (item count + each item's length prefix + items); 0 when the input has none.
      witnessBytes: wit.length ? tx.segments.find((g) => g.id === `witness.${f.inputIndex}`)!.hex.length / 2 : 0,
      stages: t.stages.map((s) => ({
        id: s.id,
        title: s.title,
        ok: s.ok,
        scriptAsm: s.scriptHex ? scriptAsm(s.scriptHex) : null,
        scriptBytes: s.scriptHex ? s.scriptHex.length / 2 : null,
        stackBefore: s.stackBefore,
        steps: s.steps.map((x) => ({ name: x.name, note: x.note, stackAfter: x.stackAfter, failed: !!x.failed, checks: x.checks ?? null })),
        note: s.note,
      })),
    },
  };
}
