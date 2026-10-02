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
  evaluateCoreLockCase,
  createOutputs,
  scan as spScan,
  buildBasicFilter,
  verify as bip322Verify,
  decodeSignature as bip322Decode,
  messageHash as bip322MessageHash,
  addressScript as bip322AddressScript,
  v2Ecdh,
  xOf as v2XOf,
  deriveKeys as v2DeriveKeys,
  senderFor as v2SenderFor,
  encPacket as v2EncPacket,
  REKEY_INTERVAL,
  blockHash as bfBlockHash,
  blockOutputScripts,
  filterHeader as bfFilterHeader,
  golombBits,
  matchFilter,
  BitReader,
  golombDecode,
  BASIC_P,
  readInput as spReadInput,
  receiverAddresses,
  parseWitness,
  decodeAddress as spDecodeAddress,
  keyAgg,
  keyAggAndTweak,
  keyAggCoeff,
  musigHashKeys,
  nonceAgg,
  partialSigAgg,
  partialSigVerify,
  partialSigVerifyInternal,
  sessionValues,
  pointHex,
  hasEvenYPoint,
  xonlyPk,
  getSecondKey,
  InvalidContributionError,
  bip340Verify,
  naiveSumXonly,
  parseDescriptor,
  expand,
  keyAt,
  descsumCheck,
  descsumCreate,
  descsumExpand,
  ALLOWED,
  walkPath,
  p2wpkh,
  p2trKeyPath,
  fromAccountXpub,
  serializeWithVersion,
  parseWalletPath,
  BIP84_VERSIONS,
  parseAssignments,
  utcToEpoch,
  activationHeight,
  bip9Implied,
  versionFor,
  BIP9_THRESHOLD,
  BIP8_THRESHOLD,
  PERIOD,
  lockFieldsOf,
  readAbsolute,
  readSequence,
  encodeRelative,
  LOCKTIME_THRESHOLD,
  SEQUENCE_LOCKTIME_MASK,
  SEQUENCE_LOCKTIME_TYPE_FLAG,
  validLastWords,
} from "@bip-atlas/models";
import { sha256 } from "@noble/hashes/sha2.js";
import type {
  SpVectorFixture,
  DerivedSpFixture,
  SpEligibilityFixture,
  DerivedSpEligibilityFixture,
  Musig2SessionFixture,
  DerivedMusig2SessionFixture,
  Musig2KeyaggFixture,
  DerivedMusig2KeyaggFixture,
  Musig2PsigChecksFixture,
  DerivedMusig2PsigChecksFixture,
  DescriptorVectorFixture,
  DerivedDescriptorFixture,
  DescriptorIndexFixture,
  DerivedDescriptorIndexFixture,
  DescriptorTokenRole,
  WalletPathVectorFixture,
  DerivedWalletPathFixture,
  WalletAddressView,
  VersionbitsDeploymentFixture,
  DerivedVersionbitsDeploymentFixture,
  VersionbitsGuidelineFixture,
  DerivedVersionbitsGuidelineFixture,
  TimelockCaseFixture,
  DerivedTimelockCaseFixture,
  TimelockBipTxFixture,
  DerivedTimelockBipTxFixture,
  TimelockEncodingFixture,
  DerivedTimelockEncodingFixture,
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
  BfBlockFixture,
  DerivedBfBlockFixture,
  BfChainFixture,
  DerivedBfChainFixture,
  BfGolombFixture,
  DerivedBfGolombFixture,
  BfCode,
  V2VectorFixture,
  DerivedV2Fixture,
  V2FramingFixture,
  DerivedV2FramingFixture,
  V2RekeyFixture,
  DerivedV2RekeyFixture,
  Bip322VectorFixture,
  DerivedBip322Fixture,
  Bip322FormatsFixture,
  DerivedBip322FormatsFixture,
  Bip322VerdictsFixture,
  DerivedBip322VerdictsFixture,
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
  const list = englishWordlist();
  const words = f.mnemonic.split(" ");
  const validIndices = validLastWords(words.slice(0, -1), list);
  const actualIndex = list.indexOf(words.at(-1)!);
  if (validIndices.length !== 2048 >> b.layout.checksumBits) throw new Error(`${f.id}: ${validIndices.length} valid last words, expected 2048 / 2^${b.layout.checksumBits}`);
  if (!validIndices.includes(actualIndex)) throw new Error(`${f.id}: the published last word does not pass its own checksum`);
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
      lastWord: { prefixWords: words.length - 1, validIndices, actualIndex },
      wordlistSample: [0, 1, 2].map((index) => ({ index, word: list[index] })),
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

/* ---------- timelocks ---------- */

let lockCases: any = null;
function coreLockCases() {
  if (lockCases) return lockCases;
  const file = "core-locktime-cases-excerpt.json";
  const bytes = readFileSync(`${ROOT}sources/external/${file}`);
  const lock = JSON.parse(readFileSync(`${ROOT}sources/external/external.lock.json`, "utf8"));
  const entry = lock.files.find((f: { file: string }) => f.file === file);
  if (!entry || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error(`${file} does not match the external lock`);
  lockCases = JSON.parse(bytes.toString("utf8"));
  for (const [name, sha] of Object.entries(entry.upstreamSha256 as Record<string, string>))
    if (lockCases.commit !== entry.commit || lockCases.upstream[name]?.sha256 !== sha) throw new Error(`${file} names a different upstream ${name}`);
  if (!lockCases.scriptH.lines[2].includes(`LOCKTIME_THRESHOLD = ${LOCKTIME_THRESHOLD};`)) throw new Error("model threshold differs from the pinned script.h");
  return lockCases;
}

function deriveTimelockCase(f: TimelockCaseFixture): DerivedTimelockCaseFixture {
  const c = resolvePointer(coreLockCases(), f.source.pointer!);
  if (!c || c.file !== f.coreFile || c.index !== f.coreIndex || c.comment !== f.comment || c.expected !== f.expected) throw new Error(`${f.id}: fixture does not match the pinned excerpt`);
  const asm: string = c.prevouts[0][2];
  const fields = lockFieldsOf(parseTransaction(c.txHex));
  const e = evaluateCoreLockCase(asm, fields, 0);
  if (e.valid !== (f.expected === "valid")) throw new Error(`${f.id}: model says ${e.valid ? "valid" : "invalid"}, Core says ${f.expected}`);
  if ((e.script.opcode === "CHECKLOCKTIMEVERIFY") !== (f.lock === "absolute")) throw new Error(`${f.id}: lock kind does not match the opcode`);
  return {
    ...f,
    derived: {
      asm,
      opcode: e.script.opcode,
      argument: e.script.argument.toString(),
      trailingOne: e.script.trailingOne,
      version: fields.version,
      nLockTime: fields.nLockTime,
      nSequence: fields.sequences[0],
      txHex: c.txHex,
      checks: e.result.checks.map((k) => ({ ...k })),
      valid: e.valid,
    },
  };
}

function deriveTimelockBipTx(f: TimelockBipTxFixture): DerivedTimelockBipTxFixture {
  const line = pinnedText(`bip-${String(f.source.bip).padStart(4, "0")}.mediawiki`, SNAPSHOT_PHASE3).split("\n")[f.source.line! - 1];
  if (!line.includes(f.txHex)) throw new Error(`${f.id}: transaction is not on BIP ${f.source.bip} line ${f.source.line}`);
  const fields = lockFieldsOf(parseTransaction(f.txHex));
  const a = readAbsolute(fields);
  return {
    ...f,
    derived: {
      version: fields.version,
      nLockTime: fields.nLockTime,
      lockKind: a.kind,
      enforced: a.enforced,
      firstHeight: a.firstHeight,
      inputs: fields.sequences.map((n) => {
        const r = readSequence(n, fields.version);
        return { nSequence: n, final: r.final, disableFlag: r.disableFlag, relative: r.enforced ? { unit: r.unit, value: r.value } : null, reason: r.reason };
      }),
    },
  };
}

function deriveTimelockEncoding(f: TimelockEncodingFixture): DerivedTimelockEncodingFixture {
  const lines = pinnedText("bip-0068.mediawiki", SNAPSHOT_PHASE3).split("\n");
  if (!lines[f.source.line! - 1].includes(f.source.quote!) || !lines[f.timeLine - 1].includes(f.timeQuote)) throw new Error(`${f.id}: BIP 68 lines moved`);
  coreLockCases();
  const maxTime = encodeRelative({ seconds: 33_554_431 });
  const r = readSequence(maxTime, 2);
  if (encodeRelative({ blocks: 65_535 }) !== SEQUENCE_LOCKTIME_MASK || r.unit !== "time" || r.value !== SEQUENCE_LOCKTIME_MASK) throw new Error(`${f.id}: BIP 68 examples do not round-trip`);
  return {
    ...f,
    derived: {
      threshold: LOCKTIME_THRESHOLD,
      thresholdIso: new Date(LOCKTIME_THRESHOLD * 1000).toISOString(),
      maxLockTimeIso: new Date(0xffffffff * 1000).toISOString(),
      maxBlocks: SEQUENCE_LOCKTIME_MASK,
      maxTimeUnits: r.value,
      maxTimeSeconds: r.seconds!,
      typeFlagSequence: SEQUENCE_LOCKTIME_TYPE_FLAG,
    },
  };
}

/* ---------- version bits ---------- */

function deriveVersionbitsDeployment(f: VersionbitsDeploymentFixture): DerivedVersionbitsDeploymentFixture {
  const text = pinnedText(f.source.file!, SNAPSHOT_PHASE3);
  const row = parseAssignments(text).find((r) => r.name === f.name);
  if (!row || row.line !== f.source.line) throw new Error(`${f.id}: no "${f.name}" row at line ${f.source.line} of ${f.source.file}`);
  const cross = pinnedText(`bip-${String(f.crossCheck.bip).padStart(4, "0")}.mediawiki`, SNAPSHOT_PHASE3).split("\n");
  const net = (n: "mainnet" | "testnet", line: number) => {
    const r = row[n];
    const startEpoch = utcToEpoch(r.start), expireEpoch = utcToEpoch(r.expire);
    if (!cross[line - 1].includes(`(Epoch timestamp ${startEpoch})`) || !cross[line - 1].includes(`(Epoch timestamp ${expireEpoch})`))
      throw new Error(`${f.id}: ${n} dates disagree with BIP ${f.crossCheck.bip} line ${line}`);
    const h = activationHeight(r.state);
    return { ...r, startEpoch, expireEpoch, activeHeight: h, implied: h === null ? null : bip9Implied(h), threshold: BIP9_THRESHOLD[n] };
  };
  return {
    ...f,
    derived: { name: row.name, bit: row.bit, bips: row.bips, signalVersion: versionFor([row.bit]), mainnet: net("mainnet", f.crossCheck.mainnetLine), testnet: net("testnet", f.crossCheck.testnetLine) },
  };
}

function deriveVersionbitsGuideline(f: VersionbitsGuidelineFixture): DerivedVersionbitsGuidelineFixture {
  const lines = pinnedText("bip-0008.mediawiki", SNAPSHOT_PHASE3).split("\n");
  if (!lines[f.source.line! - 1].includes(f.source.quote!) || !lines[f.timeoutLine - 1].includes(f.timeoutQuote)) throw new Error(`${f.id}: BIP 8 guideline lines moved`);
  if (!f.source.quote!.includes(String(BIP8_THRESHOLD.mainnet)) || !f.timeoutQuote.includes(String(26 * PERIOD))) throw new Error(`${f.id}: model constants differ from BIP 8`);
  return { ...f, derived: { threshold: BIP8_THRESHOLD.mainnet, timeoutPeriods: 26 } };
}

/* ---------- wallet paths ---------- */

let abandonMaster: ReturnType<typeof masterFromSeed>["key"] | null = null;
function walletMaster() {
  if (abandonMaster) return abandonMaster;
  const line = pinnedText("bip-0084.mediawiki", SNAPSHOT_PHASE3).split("\n")[68];
  const mnemonic = line.split("=")[1].trim();
  if (!mnemonic.startsWith("abandon") || !mnemonic.endsWith("about")) throw new Error("BIP 84 mnemonic line moved");
  abandonMaster = masterFromSeed(mnemonicToSeed(mnemonic)).key;
  return abandonMaster;
}

function deriveWalletPath(f: WalletPathVectorFixture): DerivedWalletPathFixture {
  const lines = pinnedText(`bip-${String(f.source.bip).padStart(4, "0")}.mediawiki`, SNAPSHOT_PHASE3).split("\n");
  const value = (n: number) => lines[n - 1].split("=").slice(1).join("=").trim();
  const must = (n: number, got: string, what: string) => {
    if (value(n) !== got) throw new Error(`${f.id}: ${what} ${got} differs from BIP ${f.source.bip} line ${n}`);
  };
  const master = walletMaster();
  const ver = f.scheme === 84 ? BIP84_VERSIONS.mainnet : null;
  const ser = (k: Parameters<typeof serialize>[0], kind: "public" | "private") => (ver ? serializeWithVersion(k, kind, ver[kind]) : serialize(k, kind));
  if (f.root) {
    must(f.root.privLine, ser(master, "private"), "root private key");
    must(f.root.pubLine, ser(master, "public"), "root public key");
  }
  const addresses: WalletAddressView[] = f.addresses.map((a) => {
    const w = parseWalletPath(a.path);
    const walk = walkPath(master, a.path);
    const account = walk[3].key;
    if (a.path.startsWith(f.account.path) && f.account.privLine) {
      must(f.account.privLine, ser(account, "private"), "account private key");
      must(f.account.pubLine!, ser(account, "public"), "account public key");
    }
    const leaf = walk[5].key;
    const L = a.lines;
    let output: WalletAddressView["output"] = null;
    if (f.scheme === 84) {
      must(L.pubkey, bytesToHex(leaf.publicKey), "public key");
      const o = p2wpkh(leaf.publicKey);
      must(L.address, o.address, "address");
      output = { kind: "p2wpkh", ...o };
    } else if (f.scheme === 86) {
      must(L.xprv, serialize(leaf, "private"), "xprv");
      must(L.xpub, serialize(leaf, "public"), "xpub");
      const o = p2trKeyPath(leaf.publicKey);
      must(L.internal, o.internalKeyHex, "internal key");
      must(L.output, o.outputKeyHex, "output key");
      must(L.spk, o.scriptPubKeyHex, "scriptPubKey");
      must(L.address, o.address, "address");
      output = { kind: "p2tr", ...o };
    } else {
      if (!lines[L.path - 1].replace(/[ |]/g, "").includes(a.path)) throw new Error(`${f.id}: ${a.path} is not on BIP 44 line ${L.path}`);
    }
    const viaXpub = fromAccountXpub(account, w.change, w.index);
    return {
      path: a.path,
      label: a.label,
      change: w.change,
      index: w.index,
      nodes: walk.map((n) => ({
        level: n.level,
        segment: n.index === null ? "m" : `${n.index}${n.hardened ? "'" : ""}`,
        index: n.index,
        hardened: n.hardened,
        depth: n.depth,
        parentFingerprintHex: n.key.parentFingerprint.toString(16).padStart(8, "0"),
        publicKeyHex: bytesToHex(n.key.publicKey),
      })),
      publicKeyHex: bytesToHex(leaf.publicKey),
      output,
      fromXpubMatches: bytesToHex(viaXpub.publicKey) === bytesToHex(leaf.publicKey),
      checkedLines: Object.values(L),
    };
  });
  if (!addresses.every((a) => a.fromXpubMatches)) throw new Error(`${f.id}: account xpub does not reproduce the leaves`);
  const account = walkPath(master, `${f.account.path}/0/0`)[3].key;
  return {
    ...f,
    derived: { scheme: f.scheme, accountPath: f.account.path, accountXpub: ser(account, "public"), accountXpubPublished: f.account.pubLine !== null, addresses },
  };
}

/* ---------- descriptors ---------- */

const fmtSteps = (steps: Array<{ index: number; hardened: boolean }>) => steps.map((p) => `/${p.index}${p.hardened ? "h" : ""}`).join("");

function deriveDescriptor(f: DescriptorVectorFixture): DerivedDescriptorFixture {
  const lines = pinnedText(`bip-0${f.source.bip}.mediawiki`, SNAPSHOT_PHASE3).split("\n");
  const tt = (n: number) => [...lines[n - 1].matchAll(/<tt>(.*?)<\/tt>/g)].map((m) => m[1]).at(-1);
  if (tt(f.source.line!) !== f.descriptor) throw new Error(`${f.id}: descriptor is not on BIP ${f.source.bip} line ${f.source.line}`);
  const check = descsumCheck(f.descriptor);
  const body = check.body;
  const symbols = descsumExpand(body)!;
  // Character roles, filled in from the parse tree.
  const roles: DescriptorTokenRole[] = [...body].map((c) => (/[(),{}]/.test(c) ? "punct" : "text"));
  const keyOf: Array<number | null> = [...body].map(() => null);
  let error: string | null = null;
  let d: ReturnType<typeof parseDescriptor> | null = null;
  try {
    d = parseDescriptor(f.descriptor);
  } catch (e) {
    error = (e as Error).message;
  }
  const scripts: string[][] = [];
  let outline = "";
  const keys: DerivedDescriptorFixture["derived"]["keys"] = [];
  if (d) {
    const mark = (from: number, to: number, role: DescriptorTokenRole, key: number | null = null) => {
      for (let i = from; i < to; i++) (roles[i] = role), (keyOf[i] = key);
    };
    const walk = (n: any): string => {
      if (n.type === "tree") return `{${walk(n.left)}, ${walk(n.right)}}`;
      mark(n.start, n.nameEnd, "fn");
      return `${n.fn}(${n.args.map((a: any) => (a.type === "key" ? "KEY" : a.type === "num" ? (mark(a.start, a.end, "num"), String(a.value)) : a.type === "text" ? "…" : walk(a))).join(", ")})`;
    };
    outline = walk(d.root);
    d.keys.forEach((k, i) => {
      mark(k.start, k.end, "key", i);
      if (k.origin) mark(k.origin.start, k.origin.end, "origin", i);
      if (k.pathStart !== null) mark(k.pathStart, k.end, "path", i);
      if (k.range) mark(k.end - (k.range === "hardened" ? 3 : 2), k.end, "range", i);
      const n = k.range ? 3 : 1;
      keys.push({
        text: k.text,
        kind: k.kind,
        isPrivate: k.isPrivate,
        origin: k.origin ? `${k.origin.fingerprint}${fmtSteps(k.origin.path)}` : null,
        derivation: k.ext ? fmtSteps(k.path) + (k.range ? `/*${k.range === "hardened" ? "h" : ""}` : "") || null : null,
        range: k.range,
        publicKeys: Array.from({ length: n }, (_, i) => bytesToHex(keyAt(k, i).pub)),
      });
    });
    const children = d.root.fn === "combo" ? (d.ranged ? 2 : 1) : d.ranged ? 3 : 1;
    for (let i = 0; i < children; i++) scripts.push(expand(d, i));
    const published = f.scriptLines.map((n) => tt(n));
    const got = d.root.fn === "combo" ? scripts.flat() : scripts.map((s) => s[0]);
    // BIP 380's checksum vectors list no scripts; every other fixture must match what its BIP lists.
    if (published.length && JSON.stringify(got) !== JSON.stringify(published)) throw new Error(`${f.id}: expansion differs from the published scripts`);
  }
  for (let i = 0; i < roles.length; i++) if (roles[i] === "text" && /[a-zA-Z0-9]/.test(body[i]) === false && body[i] !== "") roles[i] = "punct";
  // Merge characters into tokens.
  const tokens: DerivedDescriptorFixture["derived"]["tokens"] = [];
  [...body].forEach((c, i) => {
    const last = tokens[tokens.length - 1];
    if (last && last.role === roles[i] && last.key === keyOf[i] && roles[i] !== "punct") last.text += c;
    else tokens.push({ text: c, role: roles[i], key: keyOf[i] });
  });
  if (check.given !== null) tokens.push({ text: "#", role: "hash", key: null }, { text: check.given, role: "checksum", key: null });
  return {
    ...f,
    derived: {
      body,
      checksumGiven: check.given,
      checksumComputed: descsumCreate(body),
      checksumVerdict: check.verdict,
      symbolCount: symbols.length,
      symbols,
      tokens,
      error,
      outline,
      keys,
      ranged: d?.ranged ?? false,
      hasPrivateKeys: d?.hasPrivateKeys ?? false,
      scripts,
    },
  };
}

const TEMPLATES: Record<string, string> = {
  pk: "<KEY> OP_CHECKSIG",
  pkh: "OP_DUP OP_HASH160 <KEY_hash160> OP_EQUALVERIFY OP_CHECKSIG",
  sh: "OP_HASH160 <SCRIPT_hash160> OP_EQUAL",
  wpkh: "OP_0 <KEY_hash160>",
  wsh: "OP_0 <SCRIPT_sha256>",
  multi: "k KEY_1 … KEY_n n OP_CHECKMULTISIG",
  sortedmulti: "as multi(), keys sorted",
  combo: "P2PK, P2PKH (+ P2WPKH, P2SH-P2WPKH if compressed)",
  raw: "the script itself",
  addr: "the address's output script",
  tr: "OP_1 <32_byte_output_key>",
};

function deriveDescriptorIndex(f: DescriptorIndexFixture): DerivedDescriptorIndexFixture {
  const lines = pinnedText("bip-0380.mediawiki", SNAPSHOT_PHASE3).split("\n").slice(f.tableFrom - 1, f.tableTo);
  const rows: DerivedDescriptorIndexFixture["derived"]["rows"] = [];
  for (let i = 0; i < lines.length; i++) {
    const exprs = [...lines[i].matchAll(/<tt>(.*?)<\/tt>/g)].map((m) => m[1]);
    if (!exprs.length) continue;
    const bip = Number(/\|(\d+)\]\]/.exec(lines[i + 1])?.[1]);
    for (const e of exprs) {
      const fn = /^([a-z_]+)\(/.exec(e)![1];
      rows.push({ expression: e, bip, contexts: ALLOWED[fn] ?? null, template: TEMPLATES[fn] ?? null });
    }
  }
  if (rows.length < 12) throw new Error(`${f.id}: index table moved`);
  return { ...f, derived: { rows } };
}

/* ---------- MuSig2 ---------- */

const musigVectors = (name: string) => JSON.parse(pinnedText(`bip-0327/vectors/${name}.json`, SNAPSHOT_PHASE3));
const hx = (s: string) => hexToBytes(s.toLowerCase());
const HX = (b: Uint8Array) => bytesToHex(b);
const big = (n: bigint) => n.toString(16).padStart(64, "0");

function checkMusigSource(f: { id: string; source: { file?: string; line?: number; quote?: string } }) {
  const line = pinnedText(f.source.file!, SNAPSHOT_PHASE3).split("\n")[f.source.line! - 1];
  if (!line?.includes(f.source.quote!)) throw new Error(`${f.id}: quote not on ${f.source.file} line ${f.source.line}`);
}

function deriveMusig2Session(f: Musig2SessionFixture): DerivedMusig2SessionFixture {
  checkMusigSource(f);
  const d = musigVectors("sig_agg_vectors");
  const c = d.valid_test_cases[f.caseIndex];
  const X = d.pubkeys.map(hx), P = d.pnonces.map(hx), T = d.tweaks.map(hx), S = d.psigs.map(hx), msg = hx(d.msg);
  const pubkeys: Uint8Array[] = c.key_indices.map((i: number) => X[i]);
  const pubnonces: Uint8Array[] = c.nonce_indices.map((i: number) => P[i]);
  const tweaks: Uint8Array[] = c.tweak_indices.map((i: number) => T[i]);
  const psigs: Uint8Array[] = c.psig_indices.map((i: number) => S[i]);
  const aggnonce = nonceAgg(pubnonces);
  if (HX(aggnonce) !== c.aggnonce.toLowerCase()) throw new Error(`${f.id}: aggregate nonce differs from the vector`);
  const session = { aggnonce, pubkeys, tweaks, isXonly: c.is_xonly as boolean[], msg };
  const v = sessionValues(session);
  const sig = partialSigAgg(psigs, session);
  if (HX(sig) !== c.expected.toLowerCase()) throw new Error(`${f.id}: aggregate signature differs from the vector`);
  const finalX = xonlyPk(keyAggAndTweak(pubkeys, tweaks, c.is_xonly));
  const verifies = bip340Verify(sig, msg, finalX);
  if (!verifies) throw new Error(`${f.id}: signature fails BIP 340 verification`);
  const pk2 = getSecondKey(pubkeys);
  const base = keyAgg(pubkeys);
  if (!psigs.every((p, i) => partialSigVerify(p, pubnonces, pubkeys, tweaks, c.is_xonly, msg, i))) throw new Error(`${f.id}: a published partial signature does not verify`);
  let ctx = base;
  const tweakViews = tweaks.map((t, i) => {
    ctx = keyAggAndTweak(pubkeys, tweaks.slice(0, i + 1), c.is_xonly.slice(0, i + 1));
    return { tweak: HX(t), xonly: c.is_xonly[i] as boolean, resultXonly: HX(xonlyPk(ctx)) };
  });
  return {
    ...f,
    derived: {
      msg: HX(msg),
      keyListHash: HX(musigHashKeys(pubkeys)),
      signers: pubkeys.map((pk, i) => ({
        pubkey: HX(pk),
        coefficient: big(keyAggCoeff(pubkeys, pk)),
        secondKey: HX(pk) === HX(pk2),
        pubnonce: [HX(pubnonces[i].slice(0, 33)), HX(pubnonces[i].slice(33))] as [string, string],
        psig: HX(psigs[i]),
        psigVerifies: partialSigVerify(psigs[i], pubnonces, pubkeys, tweaks, c.is_xonly, msg, i),
      })),
      aggPlain: pointHex(base.Q),
      aggXonly: HX(xonlyPk(base)),
      tweaks: tweakViews,
      finalXonly: HX(finalX),
      aggnonce: [HX(aggnonce.slice(0, 33)), HX(aggnonce.slice(33))],
      b: big(v.b),
      R: pointHex(v.R),
      rEvenY: hasEvenYPoint(v.R),
      e: big(v.e),
      tacc: big(v.tacc),
      signature: HX(sig),
      signatureVerifies: verifies,
    },
  };
}

function deriveMusig2Keyagg(f: Musig2KeyaggFixture): DerivedMusig2KeyaggFixture {
  checkMusigSource(f);
  const d = musigVectors("key_agg_vectors");
  const X = d.pubkeys.map(hx);
  const orders = f.caseIndices.map((ci) => {
    const c = d.valid_test_cases[ci];
    const keys: Uint8Array[] = c.key_indices.map((i: number) => X[i]);
    const agg = HX(xonlyPk(keyAgg(keys)));
    if (agg !== c.expected.toLowerCase()) throw new Error(`${f.id}: case ${ci} differs from the vector`);
    return { keys: keys.map(HX), coefficients: keys.map((k) => big(keyAggCoeff(keys, k))), aggXonly: agg };
  });
  const first = d.valid_test_cases[f.caseIndices[0]].key_indices.map((i: number) => X[i]);
  const naive = HX(naiveSumXonly(first));
  if (orders.some((o) => o.aggXonly === naive)) throw new Error(`${f.id}: the plain sum equals an aggregate`);
  return { ...f, derived: { orders, naiveSumXonly: naive } };
}

function deriveMusig2PsigChecks(f: Musig2PsigChecksFixture): DerivedMusig2PsigChecksFixture {
  checkMusigSource(f);
  const d = musigVectors("sign_verify_vectors");
  const X = d.pubkeys.map(hx), P = d.pnonces.map(hx), M = d.msgs.map(hx);
  const rows: DerivedMusig2PsigChecksFixture["derived"]["rows"] = [];
  const v0 = d.valid_test_cases[0];
  const ok = partialSigVerify(hx(v0.expected), v0.nonce_indices.map((i: number) => P[i]), v0.key_indices.map((i: number) => X[i]), [], [], M[v0.msg_index], v0.signer_index);
  if (!ok) throw new Error(`${f.id}: the valid partial signature does not verify`);
  rows.push({ label: "Published valid partial signature", signer: v0.signer_index, psig: v0.expected.toLowerCase(), verdict: "valid", detail: "s·G = Re + e·a·g·P holds" });
  for (const c of d.verify_fail_test_cases) {
    const r = partialSigVerify(hx(c.sig), c.nonce_indices.map((i: number) => P[i]), c.key_indices.map((i: number) => X[i]), [], [], M[c.msg_index], c.signer_index);
    if (r) throw new Error(`${f.id}: "${c.comment}" verifies but should not`);
    const s = BigInt(`0x${c.sig}`);
    rows.push({ label: c.comment, signer: c.signer_index, psig: c.sig.toLowerCase(), verdict: "invalid", detail: s >= 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n ? "s is not below the group order n" : "s·G = Re + e·a·g·P does not hold" });
  }
  for (const c of d.verify_error_test_cases) {
    let caught: unknown = null;
    try {
      partialSigVerify(hx(c.sig), c.nonce_indices.map((i: number) => P[i]), c.key_indices.map((i: number) => X[i]), [], [], M[c.msg_index], c.signer_index);
    } catch (e) {
      caught = e;
    }
    if (!(caught instanceof InvalidContributionError) || caught.signer !== c.error.signer || caught.contrib !== c.error.contrib) throw new Error(`${f.id}: "${c.comment}" should blame signer ${c.error.signer} (${c.error.contrib})`);
    rows.push({ label: c.comment, signer: c.signer_index, psig: c.sig.toLowerCase(), verdict: "error", detail: `blames signer ${caught.signer! + 1} for an invalid ${caught.contrib}` });
  }
  return { ...f, derived: { rows } };
}

/* ---------- silent payments ---------- */

let spVectorsCache: any = null;
const spVectors = () => (spVectorsCache ??= JSON.parse(pinnedText("bip-0352/send_and_receive_test_vectors.json", SNAPSHOT_PHASE3)));
const spVin = (v: any) => ({ txid: v.txid, vout: v.vout, scriptSigHex: v.scriptSig, witness: parseWitness(v.txinwitness), prevoutSpkHex: v.prevout.scriptPubKey.hex });
const spInputs = (vins: any[]) =>
  vins.map((v) => {
    const r = spReadInput(spVin(v));
    return { outpoint: `${v.txid.slice(0, 8)}…:${v.vout}`, kind: r.kind, pubkey: r.pubkey, skipped: r.skipped };
  });

function deriveSp(f: SpVectorFixture): DerivedSpFixture {
  checkMusigSource(f);
  const c = spVectors()[f.caseIndex];
  if (c.comment !== f.source.quote) throw new Error(`${f.id}: caseIndex ${f.caseIndex} is not the cited vector`);
  const s = c.sending[0], r = c.receiving[0];
  const send = createOutputs(s.given.vin.map((v: any) => ({ ...spVin(v), privateKey: v.private_key })), s.given.recipients.flatMap((x: any) => Array(x.count ?? 1).fill(x.address)));
  if (!s.expected.outputs.some((set: string[]) => set.length === send.outputs.length && set.every((o) => send.outputs.includes(o)))) throw new Error(`${f.id}: sender outputs differ from the vector`);
  const g = r.given;
  const bScan = hexToBytes(g.key_material.scan_priv_key), bSpend = hexToBytes(g.key_material.spend_priv_key);
  const addrs = receiverAddresses(bScan, bSpend, g.labels);
  if (JSON.stringify(addrs) !== JSON.stringify(r.expected.addresses)) throw new Error(`${f.id}: addresses differ from the vector`);
  const res = spScan(g.vin.map(spVin), [...g.outputs], bScan, bSpend, g.labels);
  if (res.sharedSecret !== r.expected.shared_secret || res.tweak !== r.expected.tweak || res.A !== r.expected.input_pub_key_sum) throw new Error(`${f.id}: receiver values differ from the vector`);
  const want = r.expected.outputs.map((o: any) => o.pub_key).sort();
  if (JSON.stringify(res.found.map((x) => x.pubKey).sort()) !== JSON.stringify(want)) throw new Error(`${f.id}: found outputs differ from the vector`);
  const dec = spDecodeAddress(addrs[0]);
  const senderSecret = send.sharedSecrets.find((x) => x.Bscan === dec.Bscan)?.secret ?? null;
  const paidScan = spDecodeAddress(s.given.recipients[0].address).Bscan;
  return {
    ...f,
    derived: {
      comment: c.comment,
      inputs: spInputs(g.vin),
      smallestOutpoint: res.smallestOutpoint!,
      A: res.A!,
      inputHash: res.inputHash!,
      tweak: res.tweak!,
      sharedSecret: res.sharedSecret!,
      secretsAgree: senderSecret === res.sharedSecret,
      senderSecret: send.sharedSecrets.find((x) => x.Bscan === paidScan)?.secret ?? "",
      receiver: { address: addrs[0], Bscan: dec.Bscan, Bspend: dec.Bm, labels: g.labels, labeledAddresses: addrs.slice(1) },
      paidTo: [...new Set<string>(s.given.recipients.map((x: any) => x.address))].map((a) => {
        const i = addrs.indexOf(a);
        const k = spDecodeAddress(a);
        return { address: a, Bscan: k.Bscan, Bm: k.Bm, ours: i >= 0, label: i > 0 ? g.labels[i - 1] : null };
      }),
      senderOutputs: send.outputs,
      txOutputs: g.outputs.map((o: string) => {
        const hit = res.found.find((x) => x.pubKey === o);
        const step = res.steps.find((st) => st.match?.output === o);
        return { key: o, mine: !!hit, label: hit?.label ?? null, k: step?.k ?? null };
      }),
      steps: res.steps.map((st) => ({ k: st.k, tk: st.tk, Pk: st.Pk, matched: !!st.match, via: st.match?.via ?? null })),
    },
  };
}

function deriveSpEligibility(f: SpEligibilityFixture): DerivedSpEligibilityFixture {
  checkMusigSource(f);
  return { ...f, derived: { rows: f.caseIndices.map((i) => ({ comment: spVectors()[i].comment, inputs: spInputs(spVectors()[i].receiving[0].given.vin) })) } };
}

/* ---------- BIPs 157/158 ---------- */
let bfRowsCache: any[][] | null = null;
/** testnet-19.json rows: [height, block hash, block, prev output scripts, previous basic header, basic filter, basic header, notes]. */
const bfRows = () => (bfRowsCache ??= JSON.parse(pinnedText("bip-0158/testnet-19.json", SNAPSHOT_PHASE3)).slice(1));
const bfRow = (height: number) => {
  const r = bfRows().find((x) => x[0] === height);
  if (!r) throw new Error(`no BIP 158 vector for block ${height}`);
  return r;
};
/** Build a vector's filter with the model; throw unless filter, block hash and header equal the published ones. */
function bfBuild(height: number) {
  const [, hash, block, prev, prevHeader, filter, header, notes] = bfRow(height);
  if (bfBlockHash(block) !== hash) throw new Error(`block ${height}: block hash differs from the vector`);
  const f = buildBasicFilter(hash, block, prev, prevHeader);
  if (HX(f.filter) !== filter) throw new Error(`block ${height}: filter differs from the vector`);
  if (f.header !== header) throw new Error(`block ${height}: filter header differs from the vector`);
  return { f, hash, block, prevHeader, notes: notes as string };
}
const bfCode = (delta: bigint): BfCode => {
  const g = golombBits(delta, BASIC_P);
  return { delta: delta.toString(), q: Number(g.q), r: g.r.toString(), unary: g.unary, remainder: g.remainder };
};

function deriveBfBlock(f: BfBlockFixture): DerivedBfBlockFixture {
  checkMusigSource(f);
  const { f: b, hash, block, prevHeader, notes } = bfBuild(f.height);
  // The drawn codes must be the filter's own leading bits.
  const shown = b.deltas.slice(0, 6).map(bfCode);
  const bits = shown.map((c) => c.unary + c.remainder).join("");
  const r = new BitReader(b.compressed);
  const lead = Array.from({ length: bits.length }, () => r.read()).join("");
  if (lead !== bits) throw new Error(`${f.id}: drawn Golomb-Rice codes differ from the filter's bits`);
  const bitsTotal = b.deltas.reduce((n, d) => n + Number(d >> BigInt(BASIC_P)) + 1 + BASIC_P, 0);
  const own = b.elements.slice(0, 3).map((s) => ({ script: s, from: "this block" }));
  // One script from each of the three largest other vector blocks.
  const others = bfRows()
    .filter((x) => x[0] !== f.height)
    .map((x) => ({ height: x[0] as number, elements: buildBasicFilter(x[1], x[2], x[3], x[4]).elements }))
    .sort((a, b) => b.elements.length - a.elements.length)
    .map((x) => ({ script: x.elements.find((e: string) => !b.elements.includes(e)), from: `block ${x.height}` }))
    .filter((p): p is { script: string; from: string } => !!p.script)
    .slice(0, 3);
  const probes = [...own, ...others].map((p) => {
    const m = matchFilter(b.filter, hx(p.script), b.key);
    if (p.from === "this block" && !m.matched) throw new Error(`${f.id}: an element does not match its own filter`);
    // The chapter says none of the foreign test scripts match; fail if a false positive ever appears.
    if (p.from !== "this block" && m.matched) throw new Error(`${f.id}: a script from ${p.from} matches (false positive); update the prose`);
    return { ...p, matched: m.matched, target: m.target.toString(), steps: m.steps.map((s) => ({ value: s.value.toString(), outcome: s.outcome })) };
  });
  return {
    ...f,
    derived: {
      height: f.height, hash, notes, txCount: blockOutputScripts(block).txCount, N: b.N, F: b.F.toString(),
      filterHex: HX(b.filter), filterBytes: b.filter.length, elements: b.views,
      values: b.values.map(String), codes: shown, bitsTotal, paddingBits: b.compressed.length * 8 - bitsTotal,
      probes, filterHash: b.filterHash, prevHeader, header: b.header,
    },
  };
}

function deriveBfChain(f: BfChainFixture): DerivedBfChainFixture {
  checkMusigSource(f);
  const rows = f.heights.map((h, i) => {
    const { f: b, hash, prevHeader } = bfBuild(h);
    const prevH = i > 0 ? f.heights[i - 1] : null;
    const linksToPrevious = prevH === null ? (prevHeader === "0".repeat(64) ? true : null) : prevH === h - 1 ? prevHeader === bfBuild(prevH).f.header : null;
    if (linksToPrevious === false) throw new Error(`${f.id}: block ${h} does not chain to block ${prevH}`);
    if (bfFilterHeader(b.filter, prevHeader).header !== b.header) throw new Error(`${f.id}: header recomputation differs`);
    return { height: h, hash, filterHex: HX(b.filter), filterHash: b.filterHash, prevHeader, header: b.header, linksToPrevious };
  });
  return { ...f, derived: { rows } };
}

function deriveBfGolomb(f: BfGolombFixture): DerivedBfGolombFixture {
  checkMusigSource(f);
  const lines = pinnedText("bip-0158.mediawiki", SNAPSHOT_PHASE3).split("\n");
  const table = lines.filter((l) => /^\| \d+ \|\| \(/.test(l)).map((l) => {
    const m = l.match(/^\| (\d+) \|\| \((\d+), (\d+)\) \|\| <code>([01]+) ([01]+)<\/code>/)!;
    const g = golombBits(BigInt(m[1]), 2);
    if (`${g.unary} ${g.remainder}` !== `${m[4]} ${m[5]}` || Number(g.q) !== Number(m[2]) || Number(g.r) !== Number(m[3])) throw new Error(`${f.id}: model differs from BIP 158's table at n = ${m[1]}`);
    return { n: Number(m[1]), q: Number(m[2]), r: Number(m[3]), code: `${m[4]} ${m[5]}` };
  });
  if (table.length !== 10) throw new Error(`${f.id}: expected ten table rows`);
  const { f: b } = bfBuild(f.exampleHeight);
  const r = new BitReader(b.compressed);
  if (golombDecode(r, BASIC_P) !== b.deltas[0]) throw new Error(`${f.id}: example delta differs`);
  return { ...f, derived: { table, example: { height: f.exampleHeight, value: b.values[0].toString(), F: b.F.toString(), code: bfCode(b.deltas[0]) } } };
}

/* ---------- BIP 324 ---------- */
let v2RowsCache: Record<string, string>[] | null = null;
const v2Rows = () => {
  if (v2RowsCache) return v2RowsCache;
  const [head, ...lines] = pinnedText("bip-0324/packet_encoding_test_vectors.csv", SNAPSHOT_PHASE3).trim().split(/\r?\n/);
  const keys = head.split(",");
  return (v2RowsCache = lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [keys[i], v]))));
};
/** Run a packet vector through the model; throw on any intermediate or output that differs. */
function v2Run(f: { id: string; source: { line?: number } }) {
  const v = v2Rows()[f.source.line! - 2];
  const initiating = v.in_initiating === "1";
  const priv = hx(v.in_priv_ours);
  const bad = (what: string) => { throw new Error(`${f.id}: ${what} differs from the vector`); };
  if (v2XOf(priv) !== v.mid_x_ours) bad("x(ours)");
  const { xShared, secret } = v2Ecdh(priv, hx(v.in_ellswift_theirs), hx(v.in_ellswift_ours), v.mid_x_theirs, initiating);
  if (xShared !== v.mid_x_shared) bad("shared x");
  if (HX(secret) !== v.mid_shared_secret) bad("shared secret");
  const k = v2DeriveKeys(secret);
  if (HX(k.initiatorL) !== v.mid_initiator_l || HX(k.initiatorP) !== v.mid_initiator_p || HX(k.responderL) !== v.mid_responder_l || HX(k.responderP) !== v.mid_responder_p) bad("key schedule");
  const send = initiating ? k.initiatorTerminator : k.responderTerminator, recv = initiating ? k.responderTerminator : k.initiatorTerminator;
  if (HX(send) !== v.mid_send_garbage_terminator || HX(recv) !== v.mid_recv_garbage_terminator) bad("garbage terminators");
  if (HX(k.sessionId) !== v.out_session_id) bad("session ID");
  return { v, initiating, xShared, secret, k, send, recv };
}

function deriveV2(f: V2VectorFixture): DerivedV2Fixture {
  checkMusigSource(f);
  const { v, initiating, xShared, secret, k, send, recv } = v2Run(f);
  if (Number(v.in_idx) !== f.index) throw new Error(`${f.id}: index differs from the cited row`);
  const s = v2SenderFor(k, initiating);
  for (let i = 0; i < f.index; i++) v2EncPacket(s, new Uint8Array(0));
  const unit = hx(v.in_contents), n = Number(v.in_multiply);
  const contents = new Uint8Array(unit.length * n);
  for (let i = 0; i < n; i++) contents.set(unit, i * unit.length);
  const p = v2EncPacket(s, contents, hx(v.in_aad), v.in_ignore === "1");
  const hex = HX(p.packet);
  if (v.out_ciphertext && hex !== v.out_ciphertext) throw new Error(`${f.id}: packet differs from the vector`);
  if (v.out_ciphertext_endswith && !hex.endsWith(v.out_ciphertext_endswith)) throw new Error(`${f.id}: packet ending differs from the vector`);
  return {
    ...f,
    derived: {
      initiating, ellOurs: v.in_ellswift_ours, ellTheirs: v.in_ellswift_theirs, xOurs: v.mid_x_ours, xTheirs: v.mid_x_theirs, xShared,
      sharedSecret: HX(secret), sessionId: HX(k.sessionId),
      keys: { initiatorL: HX(k.initiatorL), initiatorP: HX(k.initiatorP), responderL: HX(k.responderL), responderP: HX(k.responderP) },
      sendTerminator: HX(send), recvTerminator: HX(recv),
      packet: {
        index: p.index, nonce: p.nonce, rekeysSoFar: p.rekeysSoFar, lengthPlain: p.lengthPlain, lengthEnc: p.lengthEnc, ignore: p.header === 0x80,
        contentsLen: contents.length, contentsHead: HX(contents.slice(0, 24)), aadLen: v.in_aad.length / 2,
        ciphertextHead: HX(p.aeadCiphertext.slice(0, 24)), ciphertextTail: HX(p.aeadCiphertext.slice(-24, -16)), tag: p.tag, totalLen: p.packet.length,
        checkedBytes: v.out_ciphertext ? p.packet.length : (v.out_ciphertext_endswith ?? "").length / 2,
      },
    },
  };
}

function deriveV2Framing(f: V2FramingFixture): DerivedV2FramingFixture {
  checkMusigSource(f);
  // Read the short ID from BIP 324's table: rows "!+N" then four cells.
  const lines = pinnedText("bip-0324.mediawiki", SNAPSHOT_PHASE3).split("\n");
  let base = -1, shortId = -1;
  for (const l of lines) {
    const m = l.match(/^!\+(\d+)$/);
    if (m) { base = Number(m[1]); continue; }
    if (base >= 0 && l.startsWith("|") && !l.startsWith("|-") && !l.startsWith("|}")) {
      const cells = l.slice(1).split("||");
      const at = cells.findIndex((c) => c.includes(`<code>${f.messageType}</code>`));
      if (at >= 0) shortId = base + at;
    }
  }
  if (shortId < 1) throw new Error(`${f.id}: ${f.messageType} not found in BIP 324's ID table`);
  return {
    ...f,
    derived: {
      messageType: f.messageType, shortId,
      v1: [{ field: "network magic", bytes: 4 }, { field: "command, 12 ASCII bytes", bytes: 12 }, { field: "payload length", bytes: 4 }, { field: "checksum", bytes: 4 }],
      v2: [{ field: "encrypted length", bytes: 3 }, { field: "header (ignore bit)", bytes: 1 }, { field: `message type ID ${shortId}`, bytes: 1 }, { field: "Poly1305 tag", bytes: 16 }],
    },
  };
}

function deriveV2Rekey(f: V2RekeyFixture): DerivedV2RekeyFixture {
  checkMusigSource(f);
  const { initiating, k } = v2Run(f);
  const s = v2SenderFor(k, initiating);
  const rows: DerivedV2RekeyFixture["derived"]["rows"] = [];
  const last = Math.max(...f.show);
  for (let i = 0; i <= last; i++) {
    if (f.show.includes(i)) rows.push({ packet: i, nonce: HX(s.P.nonce()), epoch: Math.floor(i / REKEY_INTERVAL), key: HX(s.P.key) });
    v2EncPacket(s, new Uint8Array(0));
  }
  return { ...f, derived: { initiating, rows } };
}

/* ---------- BIP 322 ---------- */
const b322Sets: Record<string, any> = {};
const b322Set = (set: "basic" | "gen") => (b322Sets[set] ??= JSON.parse(pinnedText(`bip-0322/${set === "basic" ? "basic" : "generated"}-test-vectors.json`, SNAPSHOT_PHASE3)));
const b322Cache = new Map<string, DerivedBip322Fixture>();

function deriveBip322(f: Bip322VectorFixture): DerivedBip322Fixture {
  if (b322Cache.has(f.id)) return b322Cache.get(f.id)!;
  checkMusigSource(f);
  const v = b322Set(f.set)[f.group][f.index];
  if (!v) throw new Error(`${f.id}: no such vector`);
  const sig: string = f.group === "error" ? v.signature : v.bip322_signatures[0];
  if (f.group === "error" ? v.description !== f.source.quote : !sig.startsWith(f.source.quote!)) throw new Error(`${f.id}: vector is not the cited one`);
  const r = bip322Verify(v.address, v.message, sig);
  if (r.state !== f.expect) throw new Error(`${f.id}: model says ${r.state}, fixture expects ${f.expect}`);
  if (f.group === "full" && r.state === "valid" && (r.time !== Number(v.lock_time) || r.age !== Number(v.sequence))) throw new Error(`${f.id}: T and S differ from the vector`);
  const dec = bip322Decode(sig);
  const tx = parseTransaction(r.toSign.hex);
  const le = (h: string) => parseInt(h.match(/../g)!.reverse().join(""), 16);
  const hash = bip322MessageHash(v.message);
  const { spk, kind } = bip322AddressScript(v.address);
  const out: DerivedBip322Fixture = {
    ...f,
    derived: {
      message: v.message, messageHash: hash, address: v.address, spk, scriptKind: kind, variant: dec.variant, prefixed: dec.prefixed,
      signatureHead: sig.slice(0, 24), signatureChars: sig.length,
      toSpend: { txid: r.toSpend.txid, scriptSig: "0020" + hash, challenge: spk },
      toSign: { txid: r.toSign.txid, version: le(tx.versionHex), lockTime: le(tx.locktimeHex), sequence: le(tx.inputs[0].sequenceHex), scriptSig: tx.inputs[0].scriptSigHex, witness: dec.witness },
      verdict: r.state === "valid" ? { state: "valid", time: r.time, age: r.age } : { state: r.state, reason: r.reason },
      checked: r.checked,
    },
  };
  b322Cache.set(f.id, out);
  return out;
}

function deriveBip322Formats(f: Bip322FormatsFixture): DerivedBip322FormatsFixture {
  checkMusigSource(f);
  const lines = pinnedText("bip-0322.mediawiki", SNAPSHOT_PHASE3).split("\n");
  const start = lines.findIndex((l) => l.startsWith("{| class=\"wikitable\""));
  const rows: DerivedBip322FormatsFixture["derived"]["rows"] = [];
  const strip = (s: string) => s.replace(/<sup>1<\/sup>/g, "¹").replace(/<sup>2<\/sup>/g, "²").replace(/<br\/>/g, "").replace(/<\/?code>/g, "").replace(/^\|\s*/, "").trim();
  for (let i = start; i < lines.length && !lines[i].startsWith("|}"); i++) {
    if (lines[i] === "|-" && lines[i + 1]?.startsWith("| ") && !lines[i + 1].includes("style")) {
      const [name, scripts, prefix, format] = lines.slice(i + 1, i + 5).map(strip);
      rows.push({ name, scripts, prefix, format });
    }
  }
  if (rows.length !== 4 || rows[1].prefix !== "smp" || rows[2].prefix !== "ful" || rows[3].prefix !== "pof") throw new Error(`${f.id}: could not read BIP 322's format table`);
  return { ...f, derived: { rows } };
}

export function deriveFixtures<T extends BaseFixture>(fixtures: T[]): T[] {
  const schnorrGroup = fixtures.filter((f) => f.kind === "schnorr-vector") as unknown as SchnorrVectorFixture[];
  return fixtures.map((f) => {
    if (f.kind === "bip322-vector") return deriveBip322(f as unknown as Bip322VectorFixture) as unknown as T;
    if (f.kind === "bip322-formats") return deriveBip322Formats(f as unknown as Bip322FormatsFixture) as unknown as T;
    if (f.kind === "bip322-verdicts") {
      const vf = f as unknown as Bip322VerdictsFixture;
      checkMusigSource(vf);
      const all = JSON.parse(readFileSync(`${ROOT}fixtures/message-signing.json`, "utf8")).fixtures as Bip322VectorFixture[];
      const rows = vf.cases.map((id) => {
        const d = deriveBip322(all.find((x) => x.id === id)!).derived;
        const detail = d.verdict.state === "valid" ? `valid at time T = ${d.verdict.time} and age S = ${d.verdict.age}` : d.verdict.reason!;
        return { label: all.find((x) => x.id === id)!.label, message: d.message, address: d.address, state: d.verdict.state, detail };
      });
      return { ...vf, derived: { rows } } as unknown as T;
    }
    if (f.kind === "v2-vector") return deriveV2(f as unknown as V2VectorFixture) as unknown as T;
    if (f.kind === "v2-framing") return deriveV2Framing(f as unknown as V2FramingFixture) as unknown as T;
    if (f.kind === "v2-rekey") return deriveV2Rekey(f as unknown as V2RekeyFixture) as unknown as T;
    if (f.kind === "bf-block") return deriveBfBlock(f as unknown as BfBlockFixture) as unknown as T;
    if (f.kind === "bf-chain") return deriveBfChain(f as unknown as BfChainFixture) as unknown as T;
    if (f.kind === "bf-golomb") return deriveBfGolomb(f as unknown as BfGolombFixture) as unknown as T;
    if (f.kind === "sp-vector") return deriveSp(f as unknown as SpVectorFixture) as unknown as T;
    if (f.kind === "sp-eligibility") return deriveSpEligibility(f as unknown as SpEligibilityFixture) as unknown as T;
    if (f.kind === "musig2-session") return deriveMusig2Session(f as unknown as Musig2SessionFixture) as unknown as T;
    if (f.kind === "musig2-keyagg") return deriveMusig2Keyagg(f as unknown as Musig2KeyaggFixture) as unknown as T;
    if (f.kind === "musig2-psig-checks") return deriveMusig2PsigChecks(f as unknown as Musig2PsigChecksFixture) as unknown as T;
    if (f.kind === "descriptor-vector") return deriveDescriptor(f as unknown as DescriptorVectorFixture) as unknown as T;
    if (f.kind === "descriptor-index") return deriveDescriptorIndex(f as unknown as DescriptorIndexFixture) as unknown as T;
    if (f.kind === "wallet-path-vector") return deriveWalletPath(f as unknown as WalletPathVectorFixture) as unknown as T;
    if (f.kind === "versionbits-deployment") return deriveVersionbitsDeployment(f as unknown as VersionbitsDeploymentFixture) as unknown as T;
    if (f.kind === "versionbits-guideline") return deriveVersionbitsGuideline(f as unknown as VersionbitsGuidelineFixture) as unknown as T;
    if (f.kind === "timelock-case") return deriveTimelockCase(f as unknown as TimelockCaseFixture) as unknown as T;
    if (f.kind === "timelock-bip-tx") return deriveTimelockBipTx(f as unknown as TimelockBipTxFixture) as unknown as T;
    if (f.kind === "timelock-encoding") return deriveTimelockEncoding(f as unknown as TimelockEncodingFixture) as unknown as T;
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
