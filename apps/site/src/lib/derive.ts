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
  parseBip340Csv,
  nobleVerify,
  verifyTrace,
  analyzeSegwitAddress,
  checkControlBlock,
  sigMsg,
  taprootOutput,
  taprootSighash,
  verifyKeyPath,
  decodeNum,
  traceTapscript,
  traceP2sh,
  decodeScript,
  hash160,
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
  DerivedSchnorrFixture,
  SchnorrDerived,
  TaprootTreeDerived,
  DerivedTaprootKeyspendFixture,
  DerivedTaprootTreeFixture,
  TaprootKeyspendFixture,
  TaprootTreeFixture,
  DerivedTapscriptFixture,
  TapscriptCaseFixture,
  TapscriptTraceView,
  DerivedP2shFixture,
  P2shSpendFixture,
  SchnorrVectorFixture,
} from "@bip-atlas/figures";
import type { FieldName, Psbt, PsbtRecord } from "@bip-atlas/models";

import { ROOT } from "./root";
const SNAPSHOT = "sources/research-2026-10-01";
/** Phase-three BIPs, snapshotted separately at the same bitcoin/bips commit. */
export const SNAPSHOT_PHASE3 = "sources/research-2026-10-01-phase3";

/** A raw file from a pinned snapshot, checked against that snapshot's lock. */
export function pinnedText(path: string, snapshot: string = SNAPSHOT): string {
  const bytes = readFileSync(`${ROOT}${snapshot}/raw/${path}`);
  const lock = JSON.parse(readFileSync(`${ROOT}${snapshot}/sources.lock.json`, "utf8"));
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

let bip340: ReturnType<typeof parseBip340Csv> | null = null;
const bip340Vectors = () => (bip340 ??= parseBip340Csv(pinnedText("bip-0340/test-vectors.csv")));

/**
 * A BIP340 vector, checked field by field against the pinned CSV, traced
 * against its own message and against every other message in the same figure.
 */
function deriveSchnorr(f: SchnorrVectorFixture, group: SchnorrVectorFixture[]): DerivedSchnorrFixture {
  const v = bip340Vectors().find((x) => x.line === f.source.line);
  if (
    !v || v.index !== f.vectorIndex || v.publicKeyHex !== f.publicKeyHex || v.messageHex !== f.messageHex ||
    v.signatureHex !== f.signatureHex || v.result !== f.expected || v.comment !== f.comment
  ) {
    throw new Error(`${f.id}: fixture differs from test-vectors.csv line ${f.source.line}`);
  }
  const messages: SchnorrDerived["messages"] = [];
  for (const g of group) {
    if (!messages.some((m) => m.hex === g.messageHex)) {
      messages.push({ key: `m${g.vectorIndex}`, fromVector: g.vectorIndex, hex: g.messageHex, bytes: g.messageHex.length / 2 });
    }
  }
  const traces: SchnorrDerived["traces"] = {};
  for (const m of messages) {
    const t = verifyTrace(f.publicKeyHex, m.hex, f.signatureHex);
    if (nobleVerify(f.publicKeyHex, m.hex, f.signatureHex) !== t.valid) throw new Error(`${f.id}: step-by-step verdict differs from noble for message ${m.key}`);
    traces[m.key] = { valid: t.valid, failedStage: t.failedStage, steps: t.steps };
  }
  const ownMessage = messages.find((m) => m.hex === f.messageHex)!.key;
  if (traces[ownMessage].valid !== f.expected) throw new Error(`${f.id}: model verdict differs from the published result`);
  const own = verifyTrace(f.publicKeyHex, f.messageHex, f.signatureHex);
  return {
    ...f,
    derived: {
      messages,
      ownMessage,
      traces,
      challengeTagHex: bytesToHex(sha256(new TextEncoder().encode("BIP0340/challenge"))),
      challengeHashHex: own.steps.find((s) => s.stage === "challenge")?.values.hash ?? null,
    },
  };
}

let walletVectors: any = null;
const bip341Vectors = () => (walletVectors ??= JSON.parse(pinnedText("bip-0341/wallet-test-vectors.json")));
const resolvePointer = (data: unknown, pointer: string): any => {
  let value: any = data;
  for (const token of pointer.match(/[^.[\]]+/g) ?? []) value = value?.[/^\d+$/.test(token) ? Number(token) : token];
  return value;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Read a script made of pushes and OP_CHECKSIG; anything else is described by size only. */
function readScript(hex: string): string {
  const parts: string[] = [];
  for (let i = 0; i < hex.length; ) {
    const op = parseInt(hex.slice(i, i + 2), 16);
    i += 2;
    if (op >= 1 && op <= 75) {
      const data = hex.slice(i, i + op * 2);
      i += op * 2;
      const ascii = /^(?:[2-7][0-9a-f])+$/.test(data) ? String.fromCharCode(...(data.match(/../g) ?? []).map((h) => parseInt(h, 16))) : null;
      parts.push(op === 32 ? "<32-byte key>" : ascii && /^[ -~]+$/.test(ascii) ? `<push “${ascii}”>` : `<${op}-byte push>`);
    } else if (op === 0xac) parts.push("OP_CHECKSIG");
    else return `${hex.length / 2}-byte script`;
  }
  return parts.join(" ");
}

function spendingTx(pointer = "keyPathSpending[0]") {
  const k = resolvePointer(bip341Vectors(), pointer);
  const tx = parseTransaction(k.given.rawUnsignedTx);
  const spent = k.given.utxosSpent.map((u: { scriptPubKey: string; amountSats: number }) => ({ scriptPubKeyHex: u.scriptPubKey, amountSats: BigInt(u.amountSats) }));
  return { tx, spent };
}

/** A BIP341 scriptPubKey vector: recomputed and compared with every published intermediate and expected value. */
function deriveTaprootTree(f: TaprootTreeFixture): DerivedTaprootTreeFixture {
  const pinned = resolvePointer(bip341Vectors(), f.source.pointer!);
  if (!pinned || !same(pinned.given, f.given) || !same(pinned.intermediary, f.intermediary) || !same(pinned.expected, f.expected)) {
    throw new Error(`${f.id}: fixture differs from wallet-test-vectors.json ${f.source.pointer}`);
  }
  const out = taprootOutput(f.given.internalPubkey, f.given.scriptTree as never);
  const byId = [...out.leaves].sort((a, b) => a.id - b.id);
  if (
    !same(byId.map((l) => l.leafHash), f.intermediary.leafHashes ?? []) || out.merkleRootHex !== f.intermediary.merkleRoot ||
    out.tweak.tweakHex !== f.intermediary.tweak || out.tweak.outputKeyHex !== f.intermediary.tweakedPubkey ||
    out.scriptPubKeyHex !== f.expected.scriptPubKey || !same(byId.map((l) => out.controlBlocks[out.leaves.indexOf(l)]), f.expected.scriptPathControlBlocks ?? [])
  ) {
    throw new Error(`${f.id}: model output differs from the published BIP341 vector`);
  }
  const addr = analyzeSegwitAddress(f.expected.bip350Address, "bc");
  if (!addr.valid || addr.witnessVersion !== 1 || addr.programHex !== out.tweak.outputKeyHex) throw new Error(`${f.id}: address does not carry the output key`);
  const leaves = byId.map((l) => {
    const cb = out.controlBlocks[out.leaves.indexOf(l)];
    const check = checkControlBlock(out.tweak.outputKeyHex, l.scriptHex, cb);
    if (!check.ok) throw new Error(`${f.id}: control block for leaf ${l.id} does not verify`);
    return { id: l.id, leafVersion: l.leafVersion, scriptHex: l.scriptHex, scriptReading: readScript(l.scriptHex), leafHash: l.leafHash, path: l.path, controlBlockHex: cb, check: check.steps };
  });
  let keySpend: TaprootTreeDerived["keySpend"] = null;
  if (f.keySpend) {
    const k = f.keySpend;
    const pk = resolvePointer(bip341Vectors(), k.pointer);
    if (!pk || pk.given.txinIndex !== k.txinIndex || pk.given.hashType !== k.hashType || pk.intermediary.sigHash !== k.sigHash || !same(pk.expected.witness, k.witness) || pk.given.merkleRoot !== f.intermediary.merkleRoot) {
      throw new Error(`${f.id}: key-path spend differs from ${k.pointer}`);
    }
    const { tx, spent } = spendingTx();
    if (spent[k.txinIndex].scriptPubKeyHex !== f.expected.scriptPubKey) throw new Error(`${f.id}: key-path spend is not for this output`);
    const sighashFor = (ht: number) => taprootSighash(sigMsg(tx, spent, k.txinIndex, ht));
    if (sighashFor(k.hashType) !== k.sigHash) throw new Error(`${f.id}: model sighash differs from the vector`);
    const verified = verifyKeyPath(out.tweak.outputKeyHex, k.witness[0], sighashFor);
    if (!verified) throw new Error(`${f.id}: published key-path signature does not verify`);
    keySpend = { signatureHex: k.witness[0], hashType: k.hashType, sighashHex: k.sigHash, verified };
  }
  return {
    ...f,
    derived: {
      internalKeyHex: out.internalKeyHex,
      merkleRootHex: out.merkleRootHex,
      tweakHex: out.tweak.tweakHex,
      outputKeyHex: out.tweak.outputKeyHex,
      parity: out.tweak.parity,
      scriptPubKeyHex: out.scriptPubKeyHex,
      address: f.expected.bip350Address,
      root: out.node,
      leaves,
      keySpend,
    },
  };
}

const SIGMSG_NOTES: Record<string, string> = {
  hash_type: "which parts are signed; 0x00 means SIGHASH_DEFAULT",
  nVersion: "from the transaction",
  nLockTime: "from the transaction",
  sha_prevouts: "every input’s outpoint",
  sha_amounts: "the amount of every output being spent",
  sha_scriptpubkeys: "the scriptPubKey of every output being spent",
  sha_sequences: "every input’s nSequence",
  sha_outputs: "every output this transaction creates",
  spend_type: "key path, no annex",
  input_index: "which input this signature is for",
};

function deriveTaprootKeyspend(f: TaprootKeyspendFixture): DerivedTaprootKeyspendFixture {
  const pinned = resolvePointer(bip341Vectors(), f.source.pointer!);
  const entry = pinned?.inputSpending.find((i: any) => i.given.txinIndex === f.inputSpending.given.txinIndex);
  const strip = (e: any) => ({ ...e, given: { ...e.given, internalPrivkey: undefined }, intermediary: { ...e.intermediary, tweakedPrivkey: undefined } });
  if (!pinned || pinned.given.rawUnsignedTx !== f.rawUnsignedTx || !same(pinned.given.utxosSpent, f.utxosSpent) || !entry || !same(JSON.parse(JSON.stringify(strip(entry))), f.inputSpending)) {
    throw new Error(`${f.id}: fixture differs from wallet-test-vectors.json ${f.source.pointer}`);
  }
  const { tx, spent } = spendingTx(f.source.pointer);
  const g = f.inputSpending.given;
  const items = sigMsg(tx, spent, g.txinIndex, g.hashType);
  const sighash = taprootSighash(items);
  if ("00" + items.map((i) => i.hex).join("") !== f.inputSpending.intermediary.sigMsg || sighash !== f.inputSpending.intermediary.sigHash) {
    throw new Error(`${f.id}: model SigMsg or sighash differs from the vector`);
  }
  const q = spent[g.txinIndex].scriptPubKeyHex.slice(4);
  if (!verifyKeyPath(q, f.inputSpending.expected.witness[0], (ht) => taprootSighash(sigMsg(tx, spent, g.txinIndex, ht)))) {
    throw new Error(`${f.id}: published signature does not verify`);
  }
  const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n).toString();
  return {
    ...f,
    derived: {
      inputs: tx.inputs.length,
      outputs: tx.outputs.length,
      txinIndex: g.txinIndex,
      hashType: g.hashType,
      items: items.map((i) => ({ ...i, bytes: i.hex.length / 2, note: SIGMSG_NOTES[i.id] ?? "" })),
      sigMsgBytes: items.reduce((n, i) => n + i.hex.length / 2, 0),
      sighashHex: sighash,
      totalSpentSats: sum(spent.map((s: { amountSats: bigint }) => s.amountSats)),
      totalOutSats: sum(tx.outputs.map((o) => o.valueSats)),
    },
  };
}

let scriptAssets: any = null;
/** The pinned excerpt of Core's script assets, checked against the external lock. */
function coreScriptAssets() {
  if (scriptAssets) return scriptAssets;
  const file = "core-script-assets-excerpt.json";
  const bytes = readFileSync(`${ROOT}sources/external/${file}`);
  const lock = JSON.parse(readFileSync(`${ROOT}sources/external/external.lock.json`, "utf8"));
  const entry = lock.files.find((f: { file: string }) => f.file === file);
  if (!entry || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error(`${file} does not match the external lock`);
  scriptAssets = JSON.parse(bytes.toString("utf8"));
  if (scriptAssets.upstream.commit !== entry.commit || scriptAssets.upstream.sha256 !== entry.upstreamSha256) throw new Error(`${file} names a different upstream file`);
  return scriptAssets;
}

function traceView(c: any, which: "success" | "failure"): TapscriptTraceView {
  const t = traceTapscript(c, which);
  if (t.valid !== (which === "success")) throw new Error(`case ${c.comment}: recorded ${which} witness ${t.valid ? "passes" : "fails"}, but Core labels it ${which}`);
  if (!t.commitmentOk) throw new Error(`case ${c.comment}: ${which} witness fails the BIP 341 commitment check`);
  const w: string[] = c[which].witness;
  const sigs = new Set(t.initialStack.filter((e) => e.length === 128 || e.length === 130));
  const elements: TapscriptTraceView["elements"] = [];
  const idx = (hex: string) => {
    let i = elements.findIndex((e) => e.hex === hex);
    if (i < 0) {
      const bytes = hex.length / 2;
      const n = bytes <= 4 ? decodeNum(hex) : null;
      const label = bytes === 0 ? "empty" : sigs.has(hex) ? `${bytes}-byte signature` : n !== null ? `number ${n}` : bytes === 32 ? "32-byte key" : `${bytes}-byte value`;
      elements.push({ hex, bytes, label });
      i = elements.length - 1;
    }
    return i;
  };
  const initialStack = t.initialStack.map(idx);
  const size = (e: string) => (e.length / 2 < 253 ? 1 : 3) + e.length / 2;
  const control = w[w.length - (t.annexHex ? 2 : 1)];
  return {
    expected: which,
    valid: t.valid,
    failStage: t.failStage,
    reason: t.reason,
    scriptHex: t.scriptHex,
    ops: t.ops.map((o) => ({ position: o.position, name: o.dataHex !== null ? `<${o.dataHex.length / 2}-byte push>` : o.name, dataBytes: o.dataHex === null ? null : o.dataHex.length / 2 })),
    elements,
    initialStack,
    witness: {
      items: w.length,
      stackBytes: t.initialStack.reduce((n, e) => n + size(e), 0),
      scriptBytes: size(t.scriptHex),
      controlBytes: size(control),
      annexBytes: t.annexHex ? size(t.annexHex) : 0,
      totalBytes: t.witnessBytes,
      siblings: (control.length / 2 - 33) / 32,
    },
    budgetStart: t.budgetStart,
    sigOpsCounted: t.sigOpsCounted,
    steps: t.steps.map((s) => ({ position: s.position, name: s.name, executed: s.executed, note: s.note, failed: !!s.failed, before: s.stackBefore.map(idx), after: s.stackAfter.map(idx), sig: s.sig ?? null })),
  };
}

function deriveTapscript(f: TapscriptCaseFixture): DerivedTapscriptFixture {
  const c = resolvePointer(coreScriptAssets(), f.source.pointer!);
  if (!c || c.comment !== f.comment || f.source.pointer !== `cases.${f.caseIndex}`) throw new Error(`${f.id}: fixture does not match the pinned excerpt`);
  return { ...f, derived: { success: traceView(c, "success"), failure: traceView(c, "failure") } };
}

/** Short reading of a script: data pushes by size, opcodes by name. */
export function scriptAsm(hex: string): string {
  return decodeScript(hex).map((o) => (o.dataHex === null ? o.name : o.dataHex === "" ? "OP_0" : `<${o.dataHex.length / 2} bytes>`)).join(" ");
}

function deriveP2sh(f: P2shSpendFixture): DerivedP2shFixture {
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
  return {
    ...f,
    derived: {
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

export function deriveFixtures<T extends BaseFixture>(fixtures: T[]): T[] {
  const schnorrGroup = fixtures.filter((f) => f.kind === "schnorr-vector") as unknown as SchnorrVectorFixture[];
  return fixtures.map((f) => {
    if (f.kind === "p2sh-spend") return deriveP2sh(f as unknown as P2shSpendFixture) as unknown as T;
    if (f.kind === "tapscript-case") return deriveTapscript(f as unknown as TapscriptCaseFixture) as unknown as T;
    if (f.kind === "taproot-tree") return deriveTaprootTree(f as unknown as TaprootTreeFixture) as unknown as T;
    if (f.kind === "taproot-keyspend") return deriveTaprootKeyspend(f as unknown as TaprootKeyspendFixture) as unknown as T;
    if (f.kind === "schnorr-vector") return deriveSchnorr(f as unknown as SchnorrVectorFixture, schnorrGroup) as unknown as T;
    if (f.kind === "mnemonic") return deriveMnemonic(f as unknown as MnemonicFixture) as unknown as T;
    if (f.kind === "bip32-seed") return deriveBip32(f as unknown as Bip32SeedFixture) as unknown as T;
    if (f.kind === "transaction") return deriveTransaction(f as unknown as TransactionFixture) as unknown as T;
    if (f.kind === "psbt-trace") return derivePsbtTrace(f as unknown as PsbtTraceFixture) as unknown as T;
    if (f.kind === "psbt-combine") return derivePsbtCombine(f as unknown as PsbtCombineFixture) as unknown as T;
    return f;
  });
}
