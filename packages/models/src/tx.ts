/**
 * Transaction teaching model for BIPs 141 and 143: parse a serialized
 * transaction into labelled byte segments, compute its two identifiers, its
 * sizes and weight, and the BIP143 signature digest for SIGHASH_ALL.
 *
 * Hashing uses the audited @noble/hashes. This is not a validator: it checks
 * serialization structure, not signatures, scripts, amounts or consensus rules.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "./hex";

export const dsha256 = (b: Uint8Array) => sha256(sha256(b));

/** Which serialization a byte belongs to. */
export type SegmentPart = "base" | "marker" | "witness";

export interface Segment {
  /** Machine-readable field id, e.g. "input.0.outpoint". */
  id: string;
  label: string;
  part: SegmentPart;
  hex: string;
  /** Index of the input/output/witness this belongs to, if any. */
  index?: number;
}

export interface TxInput {
  prevoutHex: string;
  scriptSigHex: string;
  sequenceHex: string;
}

export interface TxOutput {
  valueSats: bigint;
  scriptPubKeyHex: string;
}

export interface Transaction {
  hasWitness: boolean;
  versionHex: string;
  inputs: TxInput[];
  outputs: TxOutput[];
  witnesses: string[][];
  locktimeHex: string;
  segments: Segment[];
}

export class TxParseError extends Error {}

class Reader {
  offset = 0;
  constructor(readonly bytes: Uint8Array) {}
  take(n: number): Uint8Array {
    if (this.offset + n > this.bytes.length) throw new TxParseError("Unexpected end of transaction data.");
    const out = this.bytes.slice(this.offset, this.offset + n);
    this.offset += n;
    return out;
  }
  varint(): { value: number; raw: Uint8Array } {
    const first = this.take(1);
    const size = first[0] < 0xfd ? 0 : first[0] === 0xfd ? 2 : first[0] === 0xfe ? 4 : 8;
    const rest = this.take(size);
    let value = size === 0 ? first[0] : 0;
    for (let i = size - 1; i >= 0; i--) value = value * 256 + rest[i];
    return { value, raw: Uint8Array.from([...first, ...rest]) };
  }
}

const le64 = (b: Uint8Array) => b.reduceRight((acc, byte) => (acc << 8n) | BigInt(byte), 0n);

/**
 * Parse a serialized transaction. With `allowWitness: false` (as for a PSBT's
 * unsigned transaction) a 0x00 after the version is read as a zero input count,
 * not as the SegWit marker.
 */
export function parseTransaction(hex: string, options: { allowWitness?: boolean } = {}): Transaction {
  const allowWitness = options.allowWitness ?? true;
  const r = new Reader(hexToBytes(hex));
  const segments: Segment[] = [];
  const push = (id: string, label: string, part: SegmentPart, bytes: Uint8Array, index?: number) =>
    segments.push({ id, label, part, hex: bytesToHex(bytes), index });

  const version = r.take(4);
  push("version", "nVersion", "base", version);
  let hasWitness = false;
  if (allowWitness && r.bytes[r.offset] === 0x00) {
    const marker = r.take(1);
    const flag = r.take(1);
    if (flag[0] === 0) throw new TxParseError("Flag must be non-zero.");
    hasWitness = true;
    push("marker", "marker", "marker", marker);
    push("flag", "flag", "marker", flag);
  }
  const inCount = r.varint();
  push("input-count", "input count", "base", inCount.raw);
  const inputs: TxInput[] = [];
  for (let i = 0; i < inCount.value; i++) {
    const prevout = r.take(36);
    const len = r.varint();
    const scriptSig = r.take(len.value);
    const sequence = r.take(4);
    push(`input.${i}.outpoint`, `input ${i} · outpoint`, "base", prevout, i);
    push(`input.${i}.scriptsig`, `input ${i} · scriptSig`, "base", Uint8Array.from([...len.raw, ...scriptSig]), i);
    push(`input.${i}.sequence`, `input ${i} · nSequence`, "base", sequence, i);
    inputs.push({ prevoutHex: bytesToHex(prevout), scriptSigHex: bytesToHex(scriptSig), sequenceHex: bytesToHex(sequence) });
  }
  const outCount = r.varint();
  push("output-count", "output count", "base", outCount.raw);
  const outputs: TxOutput[] = [];
  for (let i = 0; i < outCount.value; i++) {
    const value = r.take(8);
    const len = r.varint();
    const script = r.take(len.value);
    push(`output.${i}.value`, `output ${i} · amount`, "base", value, i);
    push(`output.${i}.script`, `output ${i} · scriptPubKey`, "base", Uint8Array.from([...len.raw, ...script]), i);
    outputs.push({ valueSats: le64(value), scriptPubKeyHex: bytesToHex(script) });
  }
  const witnesses: string[][] = [];
  if (hasWitness) {
    for (let i = 0; i < inputs.length; i++) {
      const count = r.varint();
      const items: string[] = [];
      const raw: number[] = [...count.raw];
      for (let j = 0; j < count.value; j++) {
        const len = r.varint();
        const item = r.take(len.value);
        items.push(bytesToHex(item));
        raw.push(...len.raw, ...item);
      }
      push(`witness.${i}`, `witness ${i} · ${count.value} item${count.value === 1 ? "" : "s"}`, "witness", Uint8Array.from(raw), i);
      witnesses.push(items);
    }
  }
  const locktime = r.take(4);
  push("locktime", "nLockTime", "base", locktime);
  if (r.offset !== r.bytes.length) throw new TxParseError("Trailing bytes after nLockTime.");
  return { hasWitness, versionHex: bytesToHex(version), inputs, outputs, witnesses, locktimeHex: bytesToHex(locktime), segments };
}

/** [nVersion][txins][txouts][nLockTime] — the txid preimage (BIP141). */
export function legacySerialization(tx: Transaction): Uint8Array {
  return hexToBytes(tx.segments.filter((s) => s.part === "base").map((s) => s.hex).join(""));
}

/** [nVersion][marker][flag][txins][txouts][witness][nLockTime] — the wtxid preimage. */
export function witnessSerialization(tx: Transaction): Uint8Array {
  return hexToBytes(tx.segments.map((s) => s.hex).join(""));
}

export interface TxMeasures {
  txidHex: string;
  wtxidHex: string;
  baseSize: number;
  totalSize: number;
  weight: number;
  vsize: number;
}

/** Hashes are given in the byte order they are computed (no display reversal). */
export function measureTransaction(tx: Transaction): TxMeasures {
  const base = legacySerialization(tx);
  const total = witnessSerialization(tx);
  const weight = base.length * 3 + total.length;
  return {
    txidHex: bytesToHex(dsha256(base)),
    wtxidHex: bytesToHex(dsha256(total)),
    baseSize: base.length,
    totalSize: total.length,
    weight,
    vsize: Math.ceil(weight / 4),
  };
}

export const SIGHASH_ALL = 1;

export interface Bip143Digest {
  hashPrevoutsHex: string;
  hashSequenceHex: string;
  hashOutputsHex: string;
  /** The ten preimage items, in order. */
  items: Array<{ id: string; label: string; hex: string }>;
  preimageHex: string;
  sighashHex: string;
}

const le = (n: bigint, bytes: number) => {
  const out = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) out[i] = Number((n >> BigInt(8 * i)) & 0xffn);
  return out;
};

/**
 * BIP143 digest for one input of a version 0 witness program, SIGHASH_ALL only.
 * `amountSats` is the value of the output being spent; it is not in the transaction.
 */
export function bip143Digest(tx: Transaction, inputIndex: number, scriptCodeHex: string, amountSats: bigint, hashType = SIGHASH_ALL): Bip143Digest {
  if (hashType !== SIGHASH_ALL) throw new RangeError("This teaching model only supports SIGHASH_ALL.");
  const input = tx.inputs[inputIndex];
  if (!input) throw new RangeError("No such input.");
  const join = (parts: string[]) => hexToBytes(parts.join(""));
  const hashPrevouts = dsha256(join(tx.inputs.map((i) => i.prevoutHex)));
  const hashSequence = dsha256(join(tx.inputs.map((i) => i.sequenceHex)));
  const hashOutputs = dsha256(
    join(tx.outputs.map((o) => bytesToHex(le(o.valueSats, 8)) + varintHex(o.scriptPubKeyHex.length / 2) + o.scriptPubKeyHex)),
  );
  const items = [
    { id: "version", label: "nVersion", hex: tx.versionHex },
    { id: "hashPrevouts", label: "hashPrevouts", hex: bytesToHex(hashPrevouts) },
    { id: "hashSequence", label: "hashSequence", hex: bytesToHex(hashSequence) },
    { id: "outpoint", label: "outpoint", hex: input.prevoutHex },
    { id: "scriptCode", label: "scriptCode", hex: scriptCodeHex },
    { id: "amount", label: "amount", hex: bytesToHex(le(amountSats, 8)) },
    { id: "sequence", label: "nSequence", hex: input.sequenceHex },
    { id: "hashOutputs", label: "hashOutputs", hex: bytesToHex(hashOutputs) },
    { id: "locktime", label: "nLockTime", hex: tx.locktimeHex },
    { id: "hashType", label: "sighash type", hex: bytesToHex(le(BigInt(hashType), 4)) },
  ];
  const preimage = join(items.map((i) => i.hex));
  return {
    hashPrevoutsHex: bytesToHex(hashPrevouts),
    hashSequenceHex: bytesToHex(hashSequence),
    hashOutputsHex: bytesToHex(hashOutputs),
    items,
    preimageHex: bytesToHex(preimage),
    sighashHex: bytesToHex(dsha256(preimage)),
  };
}

function varintHex(n: number): string {
  if (n < 0xfd) return n.toString(16).padStart(2, "0");
  if (n <= 0xffff) return "fd" + bytesToHex(le(BigInt(n), 2));
  return "fe" + bytesToHex(le(BigInt(n), 4));
}

/** Arithmetic only: weight and virtual size for given byte counts (BIP141). */
export function weightFor(baseSize: number, totalSize: number): { weight: number; vsize: number } {
  if (!Number.isInteger(baseSize) || !Number.isInteger(totalSize) || baseSize < 0 || totalSize < baseSize) {
    throw new RangeError("Sizes require integers with 0 ≤ base ≤ total.");
  }
  const weight = baseSize * 3 + totalSize;
  return { weight, vsize: Math.ceil(weight / 4) };
}
