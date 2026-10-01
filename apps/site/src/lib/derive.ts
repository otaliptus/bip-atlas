/**
 * Build-time derivation: turn reviewed fixtures into the exact values figures
 * draw, using the tested models and pinned inputs. Runs only in Node at build
 * time. Any mismatch with a published vector stops the build.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  bip143Digest,
  combinePsbts,
  nonWitnessUtxoMatches,
  parsePsbt,
  parseTypeRegistry,
  serializePsbt,
  extractTransaction,
  bytesToHex,
  ckdPriv,
  derivePath,
  entropyToMnemonic,
  fingerprint,
  formatIndex,
  hexToBytes,
  masterFromSeed,
  measureTransaction,
  mnemonicToSeed,
  parsePath,
  parseTransaction,
  parseWordlist,
  serialize,
  serializeRaw,
} from "@bip-atlas/models";
import { sha256 } from "@noble/hashes/sha2.js";
import type {
  BaseFixture,
  Bip32SeedFixture,
  DerivedBip32Fixture,
  DerivedMnemonicFixture,
  DerivedPsbtCombineFixture,
  DerivedPsbtTraceFixture,
  DerivedTransactionFixture,
  MnemonicFixture,
  PsbtCombineFixture,
  PsbtRecordView,
  PsbtTraceFixture,
  TransactionFixture,
} from "@bip-atlas/figures";
import type { FieldName, Psbt, PsbtRecord } from "@bip-atlas/models";

import { ROOT } from "./root";
const SNAPSHOT = "sources/research-2026-10-01";

function pinnedText(path: string): string {
  const bytes = readFileSync(`${ROOT}${SNAPSHOT}/raw/${path}`);
  const lock = JSON.parse(readFileSync(`${ROOT}${SNAPSHOT}/sources.lock.json`, "utf8"));
  const expected = lock.files.find((f: { path: string }) => f.path === path)?.sha256;
  if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error(`${path} does not match the source lock`);
  return bytes.toString("utf8");
}

let english: string[] | null = null;
function englishWordlist(): string[] {
  if (english) return english;
  const path = "bip-0039/english.txt";
  const bytes = readFileSync(`${ROOT}${SNAPSHOT}/raw/${path}`);
  const lock = JSON.parse(readFileSync(`${ROOT}${SNAPSHOT}/sources.lock.json`, "utf8"));
  const expected = lock.files.find((f: { path: string }) => f.path === path)?.sha256;
  if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error(`${path} does not match the source lock`);
  english = parseWordlist(bytes.toString("utf8"));
  return english;
}

function deriveMnemonic(f: MnemonicFixture): DerivedMnemonicFixture {
  const b = entropyToMnemonic(hexToBytes(f.entropyHex), englishWordlist());
  if (b.mnemonic !== f.mnemonic) throw new Error(`${f.id}: model mnemonic differs from the fixture`);
  const vectorSeed = bytesToHex(mnemonicToSeed(f.mnemonic, f.passphrase));
  if (vectorSeed !== f.seedHex) throw new Error(`${f.id}: model seed differs from the published vector`);
  return {
    ...f,
    derived: {
      layout: b.layout,
      entropyBits: b.entropyBits,
      hashHex: b.hashHex,
      checksumBits: b.checksumBits,
      groups: b.groups,
      seeds: [
        { passphrase: f.passphrase, seedHex: vectorSeed, origin: "vector" },
        { passphrase: "", seedHex: bytesToHex(mnemonicToSeed(f.mnemonic, "")), origin: "computed" },
      ],
    },
  };
}

const hex32 = (n: number) => n.toString(16).padStart(8, "0");

function deriveBip32(f: Bip32SeedFixture): DerivedBip32Fixture {
  const master = masterFromSeed(hexToBytes(f.seedHex));
  for (const c of f.vectorChains) {
    const key = derivePath(master.key, c.path);
    if (serialize(key, "private") !== c.xprv || serialize(key, "public") !== c.xpub) {
      throw new Error(`${f.id} ${c.path}: model differs from BIP32 test vector line ${c.line}`);
    }
  }
  const nodes = f.tree.paths.map((path) => {
    const indices = parsePath(path);
    const key = derivePath(master.key, path);
    const parentPath = indices.length ? path.slice(0, path.lastIndexOf("/")) : null;
    const step = parentPath ? ckdPriv(derivePath(master.key, parentPath), indices.at(-1)!) : null;
    const hardenedAt = indices.findIndex((i) => i >= 0x80000000);
    return {
      path,
      parentPath,
      depth: key.depth,
      indexLabel: indices.length ? formatIndex(indices.at(-1)!) : "m",
      hardened: indices.length > 0 && indices.at(-1)! >= 0x80000000,
      xprv: serialize(key, "private"),
      xpub: serialize(key, "public"),
      fingerprintHex: hex32(fingerprint(key)),
      parentFingerprintHex: hex32(key.parentFingerprint),
      childNumberHex: hex32(key.childNumber),
      chainCodeHex: bytesToHex(key.chainCode),
      publicKeyHex: bytesToHex(key.publicKey),
      privateKeyHex: bytesToHex(key.privateKey!),
      hmacDataHex: step ? step.dataHex : null,
      vectorLine: f.vectorChains.find((c) => c.path === path)?.line ?? null,
      hardenedAncestor: hardenedAt >= 0 ? `m/${indices.slice(0, hardenedAt + 1).map(formatIndex).join("/")}` : null,
    };
  });
  const serialKey = derivePath(master.key, f.serializePath);
  const rows = (["public", "private"] as const).map((kind) => {
    const raw = serializeRaw(serialKey, kind);
    return { kind, rawHex: bytesToHex(raw), checksumHex: bytesToHex(sha256(sha256(raw)).slice(0, 4)), base58: serialize(serialKey, kind) };
  });
  return { ...f, derived: { masterIHex: master.iHex, nodes, serialization: { path: f.serializePath, rows } } };
}

function deriveTransaction(f: TransactionFixture): DerivedTransactionFixture {
  const tx = parseTransaction(f.txHex);
  if (tx.segments.map((s) => s.hex).join("") !== f.txHex) throw new Error(`${f.id}: transaction does not round-trip`);
  const s = f.sighash;
  const digest = bip143Digest(tx, s.inputIndex, s.scriptCodeHex, BigInt(s.amountSats));
  if (digest.preimageHex !== s.preimageHex || digest.sighashHex !== s.sighashHex) {
    throw new Error(`${f.id}: BIP143 digest differs from the published example`);
  }
  const ids = (prefix: string, suffix = "") => tx.segments.filter((g) => g.id.startsWith(prefix) && g.id.endsWith(suffix)).map((g) => g.id);
  const i = s.inputIndex;
  const sources: Record<string, { from: string[]; note: string }> = {
    version: { from: ["version"], note: "copied from the transaction" },
    hashPrevouts: { from: ids("input.", ".outpoint"), note: "double SHA-256 of every input’s outpoint" },
    hashSequence: { from: ids("input.", ".sequence"), note: "double SHA-256 of every input’s nSequence" },
    outpoint: { from: [`input.${i}.outpoint`], note: "the input being signed" },
    scriptCode: tx.inputs[i].scriptSigHex
      ? { from: [`input.${i}.scriptsig`], note: `built from the 20-byte witness program inside this input’s redeemScript (BIP 143 line ${s.scriptCodeLine})` }
      : { from: [], note: `built from the spent output’s 20-byte program, which is not in this transaction (BIP 143 line ${s.scriptCodeLine})` },
    amount: { from: [], note: `not in this transaction: the value of the output being spent (BIP 143 line ${s.amountLine})` },
    sequence: { from: [`input.${i}.sequence`], note: "the input being signed" },
    hashOutputs: { from: ids("output."), note: "double SHA-256 of every output" },
    locktime: { from: ["locktime"], note: "copied from the transaction" },
    hashType: { from: [], note: "SIGHASH_ALL, chosen by the signer" },
  };
  return {
    ...f,
    derived: {
      segments: tx.segments,
      measures: measureTransaction(tx),
      digest: { items: digest.items.map((it) => ({ ...it, ...sources[it.id] })), sighashHex: digest.sighashHex },
    },
  };
}

let registry: FieldName[] | null = null;
const fieldRegistry = () => (registry ??= parseTypeRegistry(pinnedText("bip-0174/type-registry.mediawiki")));

const leU32 = (hex: string) => parseInt(hex.match(/../g)!.reverse().join(""), 16);
const btc = (sats: bigint) => `${sats / 100000000n}.${(sats % 100000000n).toString().padStart(8, "0")}`;

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

function derivePsbtTrace(f: PsbtTraceFixture): DerivedPsbtTraceFixture {
  const parsed = new Map(f.steps.map((s) => [s.id, parsePsbt(s.hex)]));
  const combiner = f.steps.find((s) => s.basedOn.length > 1);
  if (combiner && serializePsbt(combinePsbts(combiner.basedOn.map((id) => parsed.get(id)!))) !== combiner.hex) {
    throw new Error(`${f.id}: combining ${combiner.basedOn.join(" + ")} does not reproduce line ${combiner.line}`);
  }
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
  return {
    ...f,
    derived: {
      states,
      extracted: { bytes: f.extracted.hex.length / 2, txidHex: m.txidHex, wtxidHex: m.wtxidHex, inputs: tx.inputs.length, outputs: tx.outputs.length },
      outputsBtc: tx.outputs.map((o) => btc(o.valueSats)),
    },
  };
}

function derivePsbtCombine(f: PsbtCombineFixture): DerivedPsbtCombineFixture {
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

export function deriveFixtures<T extends BaseFixture>(fixtures: T[]): T[] {
  return fixtures.map((f) => {
    if (f.kind === "mnemonic") return deriveMnemonic(f as unknown as MnemonicFixture) as unknown as T;
    if (f.kind === "bip32-seed") return deriveBip32(f as unknown as Bip32SeedFixture) as unknown as T;
    if (f.kind === "transaction") return deriveTransaction(f as unknown as TransactionFixture) as unknown as T;
    if (f.kind === "psbt-trace") return derivePsbtTrace(f as unknown as PsbtTraceFixture) as unknown as T;
    if (f.kind === "psbt-combine") return derivePsbtCombine(f as unknown as PsbtCombineFixture) as unknown as T;
    return f;
  });
}
