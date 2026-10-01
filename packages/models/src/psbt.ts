/**
 * BIP174 teaching model: parse a PSBT into its key-value maps, validate the
 * version 0 rules exercised by the BIP's test vectors, combine PSBTs, and
 * extract the network transaction from a finalized PSBT.
 *
 * It never signs and never broadcasts. Unknown key types are kept verbatim,
 * because BIP174 requires that they be passed through. Field names come from
 * the caller (the type registry in the pinned BIP174 directory).
 */
import { bytesToHex, hexToBytes } from "./hex";
import { hash160 } from "./bip32";
import { dsha256, parseTransaction, TxParseError, type Transaction } from "./tx";

export const PSBT_MAGIC = "70736274ff";

export type MapScope = "global" | "input" | "output";

export interface PsbtRecord {
  /** Full key bytes (type + key data). Uniqueness is over this value. */
  keyHex: string;
  keyType: number;
  keyDataHex: string;
  valueHex: string;
}

export interface Psbt {
  global: PsbtRecord[];
  inputs: PsbtRecord[][];
  outputs: PsbtRecord[][];
  unsignedTx: Transaction;
}

export class PsbtError extends Error {}

class Reader {
  offset = 0;
  constructor(readonly bytes: Uint8Array) {}
  get done() {
    return this.offset >= this.bytes.length;
  }
  take(n: number): Uint8Array {
    if (this.offset + n > this.bytes.length) throw new PsbtError("Value or key runs past the end of the data.");
    const out = this.bytes.slice(this.offset, this.offset + n);
    this.offset += n;
    return out;
  }
  compactSize(): number {
    const first = this.take(1)[0];
    if (first < 0xfd) return first;
    const size = first === 0xfd ? 2 : first === 0xfe ? 4 : 8;
    const raw = this.take(size);
    let value = 0;
    for (let i = size - 1; i >= 0; i--) value = value * 256 + raw[i];
    return value;
  }
}

function readCompactSizeFrom(bytes: Uint8Array): { value: number; length: number } {
  const r = new Reader(bytes);
  const value = r.compactSize();
  const minimal = value < 0xfd ? 1 : value <= 0xffff ? 3 : value <= 0xffffffff ? 5 : 9;
  if (r.offset !== minimal) throw new PsbtError("Key type is not minimally encoded.");
  return { value, length: r.offset };
}

function readMap(r: Reader, scope: string): PsbtRecord[] {
  const records: PsbtRecord[] = [];
  const seen = new Set<string>();
  for (;;) {
    if (r.done) throw new PsbtError(`The ${scope} map is not terminated.`);
    const keyLen = r.compactSize();
    if (keyLen === 0) return records;
    const key = r.take(keyLen);
    const valueLen = r.compactSize();
    const value = r.take(valueLen);
    const keyHex = bytesToHex(key);
    if (seen.has(keyHex)) throw new PsbtError(`Duplicate key ${keyHex} in the ${scope} map.`);
    seen.add(keyHex);
    const { value: keyType, length } = readCompactSizeFrom(key);
    records.push({ keyHex, keyType, keyDataHex: bytesToHex(key.slice(length)), valueHex: bytesToHex(value) });
  }
}

const isPubkey = (hex: string) =>
  (hex.length === 66 && (hex.startsWith("02") || hex.startsWith("03"))) || (hex.length === 130 && hex.startsWith("04"));

/** Value-format rules for version 0 types whose format this model knows (BIP174: mismatches are invalid). */
function checkValue(scope: MapScope, r: PsbtRecord): void {
  const bytes = r.valueHex.length / 2;
  const fail = (what: string) => {
    throw new PsbtError(`${what} in the ${scope} map has a malformed value.`);
  };
  const isPath = bytes >= 4 && bytes % 4 === 0;
  if (scope === "global" && r.keyType === 0x01) {
    if (r.keyDataHex.length !== 156) throw new PsbtError("A global xpub key must carry a 78-byte extended public key.");
    if (!isPath) fail("Global xpub");
  }
  if (scope === "global" && r.keyType === 0xfb && bytes !== 4) fail("PSBT version");
  if (scope === "input" && r.keyType === 0x03 && bytes !== 4) fail("Sighash type");
  if (((scope === "input" && r.keyType === 0x06) || (scope === "output" && r.keyType === 0x02)) && !isPath) fail("BIP 32 derivation");
  if (scope === "input" && r.keyType === 0x02 && bytes === 0) fail("Partial signature");
  if (scope === "input" && r.keyType === 0x01) {
    if (bytes < 9) fail("Witness UTXO");
    const { value: len, length } = readCompactSizeFrom(hexToBytes(r.valueHex.slice(16)));
    if (8 + length + len !== bytes) fail("Witness UTXO");
  }
  if (scope === "input" && r.keyType === 0x00) {
    try {
      parseTransaction(r.valueHex);
    } catch {
      fail("Non-witness UTXO");
    }
  }
}

/** Key-data rules for the version 0 types whose keys carry no data or a public key. */
function checkKey(scope: MapScope, r: PsbtRecord): void {
  const noKeyData: Record<MapScope, number[]> = {
    global: [0x00, 0xfb],
    input: [0x00, 0x01, 0x03, 0x04, 0x05, 0x07, 0x08],
    output: [0x00, 0x01],
  };
  const pubkeyKeyData: Record<MapScope, number[]> = { global: [], input: [0x02, 0x06], output: [0x02] };
  if (noKeyData[scope].includes(r.keyType) && r.keyDataHex !== "") {
    throw new PsbtError(`Key type 0x${r.keyType.toString(16).padStart(2, "0")} in the ${scope} map must have no key data.`);
  }
  if (pubkeyKeyData[scope].includes(r.keyType) && !isPubkey(r.keyDataHex)) {
    throw new PsbtError(`Key type 0x${r.keyType.toString(16).padStart(2, "0")} in the ${scope} map needs a public key as key data.`);
  }
}

/** Parse and validate a version 0 PSBT. Errors are always PsbtError. */
export function parsePsbt(hex: string): Psbt {
  try {
    return parsePsbtUnchecked(hex);
  } catch (error) {
    if (error instanceof TxParseError) throw new PsbtError(`Unsigned transaction: ${error.message}`);
    throw error;
  }
}

/** The unsigned transaction must use the old serialization: it must parse as one, consuming every byte. */
function parseUnsignedTx(valueHex: string): Transaction {
  try {
    return parseTransaction(valueHex, { allowWitness: false });
  } catch (error) {
    let witnessForm = false;
    try {
      witnessForm = parseTransaction(valueHex).hasWitness;
    } catch {
      /* neither form parses */
    }
    if (witnessForm) throw new PsbtError("The unsigned transaction must not use witness serialization.");
    throw error;
  }
}

function parsePsbtUnchecked(hex: string): Psbt {
  const bytes = hexToBytes(hex);
  if (bytesToHex(bytes.slice(0, 5)) !== PSBT_MAGIC) throw new PsbtError("Missing the psbt magic bytes 70 73 62 74 ff.");
  const r = new Reader(bytes);
  r.take(5);
  const global = readMap(r, "global");
  global.forEach((rec) => {
    checkKey("global", rec);
    checkValue("global", rec);
  });
  const version = global.find((g) => g.keyType === 0xfb);
  if (version && version.valueHex !== "00000000") throw new PsbtError("This model only reads version 0 PSBTs.");
  const txRecord = global.find((g) => g.keyType === 0x00);
  if (!txRecord) throw new PsbtError("Version 0 PSBTs must include the unsigned transaction.");
  const unsignedTx = parseUnsignedTx(txRecord.valueHex);
  if (unsignedTx.inputs.some((i) => i.scriptSigHex !== "")) throw new PsbtError("The unsigned transaction must have empty scriptSigs.");
  const inputs: PsbtRecord[][] = [];
  for (let i = 0; i < unsignedTx.inputs.length; i++) {
    const map = readMap(r, `input ${i}`);
    map.forEach((rec) => {
      checkKey("input", rec);
      checkValue("input", rec);
    });
    inputs.push(map);
  }
  const outputs: PsbtRecord[][] = [];
  for (let i = 0; i < unsignedTx.outputs.length; i++) {
    const map = readMap(r, `output ${i}`);
    map.forEach((rec) => {
      checkKey("output", rec);
      checkValue("output", rec);
    });
    outputs.push(map);
  }
  if (!r.done) throw new PsbtError("Unexpected data after the last output map.");
  return { global, inputs, outputs, unsignedTx };
}

function compactSizeHex(n: number): string {
  if (n < 0xfd) return n.toString(16).padStart(2, "0");
  const le = (v: number, bytes: number) => Array.from({ length: bytes }, (_, i) => ((v >>> (8 * i)) & 0xff).toString(16).padStart(2, "0")).join("");
  if (n <= 0xffff) return "fd" + le(n, 2);
  return "fe" + le(n, 4);
}

/**
 * Record order used by the published BIP174 vectors: by key type, then by key,
 * except that input partial signatures (type 0x02) are ordered by the Hash160
 * of their public key. BIP174 itself does not mandate an order; matching the
 * vectors makes combiner output byte-identical to them.
 */
function sortKey(scope: MapScope, r: PsbtRecord): string {
  const type = r.keyType.toString(16).padStart(16, "0");
  const data = scope === "input" && r.keyType === 0x02 ? bytesToHex(hash160(hexToBytes(r.keyDataHex))) : r.keyHex;
  return type + data;
}

export function serializePsbt(psbt: Psbt): string {
  const map = (records: PsbtRecord[], scope: MapScope) =>
    [...records].sort((a, b) => (sortKey(scope, a) < sortKey(scope, b) ? -1 : 1)).map((rec) => compactSizeHex(rec.keyHex.length / 2) + rec.keyHex + compactSizeHex(rec.valueHex.length / 2) + rec.valueHex).join("") + "00";
  return PSBT_MAGIC + map(psbt.global, "global") + psbt.inputs.map((m) => map(m, "input")).join("") + psbt.outputs.map((m) => map(m, "output")).join("");
}

/** Combiner: the union of all records; PSBTs for different transactions cannot be combined. */
export function combinePsbts(psbts: Psbt[]): Psbt {
  const txOf = (p: Psbt) => p.global.find((g) => g.keyType === 0)!.valueHex;
  if (new Set(psbts.map(txOf)).size !== 1) throw new PsbtError("Cannot combine PSBTs for different transactions.");
  const union = (maps: PsbtRecord[][]) => {
    const out = new Map<string, PsbtRecord>();
    for (const m of maps) for (const rec of m) if (!out.has(rec.keyHex)) out.set(rec.keyHex, rec);
    return [...out.values()];
  };
  const first = psbts[0];
  return {
    global: union(psbts.map((p) => p.global)),
    inputs: first.inputs.map((_, i) => union(psbts.map((p) => p.inputs[i]))),
    outputs: first.outputs.map((_, i) => union(psbts.map((p) => p.outputs[i]))),
    unsignedTx: first.unsignedTx,
  };
}

/** Transaction Extractor: needs a finalized scriptSig or scriptWitness on every input. */
export function extractTransaction(psbt: Psbt): string {
  const tx = psbt.unsignedTx;
  const finals = psbt.inputs.map((m) => ({
    scriptSig: m.find((r) => r.keyType === 0x07)?.valueHex ?? null,
    witness: m.find((r) => r.keyType === 0x08)?.valueHex ?? null,
  }));
  if (finals.some((f) => f.scriptSig === null && f.witness === null)) {
    throw new PsbtError("Not every input is finalized; an extractor must not modify the PSBT.");
  }
  const hasWitness = finals.some((f) => f.witness !== null);
  let hex = tx.versionHex + (hasWitness ? "0001" : "") + compactSizeHex(tx.inputs.length);
  tx.inputs.forEach((input, i) => {
    const sig = finals[i].scriptSig ?? "";
    hex += input.prevoutHex + compactSizeHex(sig.length / 2) + sig + input.sequenceHex;
  });
  hex += compactSizeHex(tx.outputs.length);
  for (const seg of tx.segments.filter((s) => s.id.startsWith("output.") )) hex += seg.hex;
  if (hasWitness) for (const f of finals) hex += f.witness ?? "00";
  return hex + tx.locktimeHex;
}

/** Signer check: a non-witness UTXO must hash to the txid named in the prevout. */
export function nonWitnessUtxoMatches(psbt: Psbt, inputIndex: number): boolean | null {
  const rec = psbt.inputs[inputIndex].find((r) => r.keyType === 0x00);
  if (!rec) return null;
  return bytesToHex(dsha256(hexToBytes(rec.valueHex))) === psbt.unsignedTx.inputs[inputIndex].prevoutHex.slice(0, 64);
}

export interface FieldName {
  scope: MapScope;
  keyType: number;
  name: string;
  constant: string;
  parentBip: number;
}

/** Parse the pinned type registry (bip-0174/type-registry.mediawiki) into field names. */
export function parseTypeRegistry(text: string): FieldName[] {
  const out: FieldName[] = [];
  let scope: MapScope | null = null;
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (/^==Global Types==/.test(line)) scope = "global";
    else if (/^==(Per-)?Input Types==/i.test(line)) scope = "input";
    else if (/^==(Per-)?Output Types==/i.test(line)) scope = "output";
    const m = /^\| <tt>(PSBT_[A-Z0-9_]+) = 0x([0-9A-Fa-f]+)<\/tt>/.exec(line);
    if (m && scope) {
      const name = lines[i - 1].replace(/^\|\s*/, "").trim();
      const parent = /\|(\d+)\]\]/.exec(lines[i + 1] ?? "");
      out.push({ scope, keyType: parseInt(m[2], 16), name, constant: m[1], parentBip: parent ? Number(parent[1]) : NaN });
    }
  });
  return out;
}
