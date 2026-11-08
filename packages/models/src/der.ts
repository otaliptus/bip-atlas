/**
 * BIPs 66 and 146 teaching model: BIP 66's IsValidSignatureEncoding as a
 * list of named checks that stops at the first failure, BIP 146's LOW_S
 * range, the high-S twin S' = n − S, and the small byte changes the chapter
 * tries on a published signature. ECDSA verification and the legacy digest
 * are ./p2sh's (audited @noble/curves with lowS: false, so a high S still
 * verifies, as it did before BIP 146).
 *
 * Public test material only: it re-encodes and checks published signatures
 * and never signs.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "./hex";
import { parseTransaction, type Transaction } from "./tx";

/** The secp256k1 group order n, and n / 2 (rounded down), BIP 146's upper bound for S. */
export const CURVE_ORDER: bigint = secp256k1.Point.CURVE().n;
export const HALF_ORDER = CURVE_ORDER / 2n;

export interface DerCheck {
  id: string;
  /** Line of the check in BIP 66's IsValidSignatureEncoding. */
  line: number;
  /** What the check requires, in plain words. */
  label: string;
}

/** BIP 66's checks in the order its function runs them (L55–L101). `sig` includes the sighash byte. */
export const DER_CHECKS: ReadonlyArray<DerCheck & { test: (sig: Uint8Array) => boolean }> = [
  { id: "min-size", line: 55, label: "at least 9 bytes", test: (s) => s.length >= 9 },
  { id: "max-size", line: 56, label: "at most 73 bytes", test: (s) => s.length <= 73 },
  { id: "compound", line: 59, label: "starts with 0x30", test: (s) => s[0] === 0x30 },
  { id: "total-length", line: 62, label: "length byte covers the rest", test: (s) => s[1] === s.length - 3 },
  { id: "s-inside", line: 68, label: "S's length byte is inside", test: (s) => 5 + s[3] < s.length },
  { id: "lengths-sum", line: 75, label: "R and S lengths add up", test: (s) => s[3] + s[5 + s[3]] + 7 === s.length },
  { id: "r-integer", line: 78, label: "R is an integer (0x02)", test: (s) => s[2] === 0x02 },
  { id: "r-nonempty", line: 81, label: "R is not empty", test: (s) => s[3] !== 0 },
  { id: "r-positive", line: 84, label: "R is not negative", test: (s) => !(s[4] & 0x80) },
  { id: "r-minimal", line: 88, label: "R has no extra leading zero", test: (s) => !(s[3] > 1 && s[4] === 0x00 && !(s[5] & 0x80)) },
  { id: "s-integer", line: 91, label: "S is an integer (0x02)", test: (s) => s[s[3] + 4] === 0x02 },
  { id: "s-nonempty", line: 94, label: "S is not empty", test: (s) => s[5 + s[3]] !== 0 },
  { id: "s-positive", line: 97, label: "S is not negative", test: (s) => !(s[s[3] + 6] & 0x80) },
  { id: "s-minimal", line: 101, label: "S has no extra leading zero", test: (s) => !(s[5 + s[3]] > 1 && s[s[3] + 6] === 0x00 && !(s[s[3] + 7] & 0x80)) },
];

export interface EncodingResult {
  valid: boolean;
  /** How many checks ran (all of them when valid; up to and including the failing one otherwise). */
  ran: number;
  failed: DerCheck | null;
}

/** BIP 66's strict-DER check on a signature with its sighash byte. Not called for an empty signature. */
export function checkSignatureEncoding(sigHex: string): EncodingResult {
  const sig = hexToBytes(sigHex);
  if (sig.length === 0) throw new RangeError("BIP 66 does not run its check on an empty signature.");
  for (const [i, c] of DER_CHECKS.entries()) {
    if (!c.test(sig)) return { valid: false, ran: i + 1, failed: { id: c.id, line: c.line, label: c.label } };
  }
  return { valid: true, ran: DER_CHECKS.length, failed: null };
}

export interface DerParts {
  totalLength: number;
  rHex: string;
  sHex: string;
  hashType: number;
}

/**
 * The fields of a signature laid out as 0x30 [total] 0x02 [lenR] R 0x02
 * [lenS] S [sighash], read by their length bytes. It reads malformed
 * encodings too, so the chapter can show that they carry the same numbers;
 * it does not judge them (that is checkSignatureEncoding).
 */
export function readFields(sigHex: string): DerParts {
  const s = hexToBytes(sigHex);
  const lenR = s[3], lenS = s[5 + lenR];
  if (s.length !== lenR + lenS + 7) throw new RangeError("The R and S length bytes do not match the signature's size.");
  return { totalLength: s[1], rHex: bytesToHex(s.slice(4, 4 + lenR)), sHex: bytesToHex(s.slice(6 + lenR, 6 + lenR + lenS)), hashType: s[s.length - 1] };
}

const toInt = (hex: string) => (hex ? BigInt(`0x${hex}`) : 0n);
/** R and S as unsigned numbers, ignoring how they were encoded. */
export function numbersOf(sigHex: string): { r: bigint; s: bigint } {
  const f = readFields(sigHex);
  return { r: toInt(f.rHex), s: toInt(f.sHex) };
}

/** Shortest DER integer: no leading zero bytes, then one 0x00 if the top bit is set. */
function derInt(n: bigint): string {
  if (n <= 0n) throw new RangeError("R and S must be positive.");
  let hex = n.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  if (parseInt(hex.slice(0, 2), 16) & 0x80) hex = `00${hex}`;
  return hex;
}
const byte = (n: number) => n.toString(16).padStart(2, "0");

/** Strict DER for (R, S) plus the sighash byte. */
export function encodeSignature(r: bigint, s: bigint, hashType: number): string {
  const R = derInt(r), S = derInt(s);
  const body = `02${byte(R.length / 2)}${R}02${byte(S.length / 2)}${S}`;
  return `30${byte(body.length / 2)}${body}${byte(hashType)}`;
}

/** BIP 146 LOW_S: 1 ≤ S ≤ n / 2. */
export const isLowS = (s: bigint) => s >= 1n && s <= HALF_ORDER;

export type Change = "published" | "pad-removed" | "zero-added" | "length-byte" | "s-flipped";
export const CHANGES: ReadonlyArray<{ id: Change; label: string }> = [
  { id: "published", label: "As published" },
  { id: "pad-removed", label: "R's zero byte removed" },
  { id: "zero-added", label: "Zero byte added to S" },
  { id: "length-byte", label: "Length byte off by one" },
  { id: "s-flipped", label: "S replaced by its twin" },
];

/**
 * One small change to a strictly encoded signature: drop R's 0x00 pad (only
 * if it has one), put an extra 0x00 in front of S, add one to the total
 * length byte, or replace S by n − S (re-encoded strictly). Null when the
 * change does not apply.
 */
export function applyChange(sigHex: string, change: Change): string | null {
  const f = readFields(sigHex);
  const ht = byte(f.hashType);
  const enc = (rHex: string, sHex: string, total?: number) => {
    const body = `02${byte(rHex.length / 2)}${rHex}02${byte(sHex.length / 2)}${sHex}`;
    return `30${byte(total ?? body.length / 2)}${body}${ht}`;
  };
  switch (change) {
    case "published":
      return sigHex;
    case "pad-removed":
      return f.rHex.startsWith("00") ? enc(f.rHex.slice(2), f.sHex) : null;
    case "zero-added":
      return enc(f.rHex, `00${f.sHex}`);
    case "length-byte":
      return enc(f.rHex, f.sHex, f.totalLength + 1);
    case "s-flipped": {
      const { r, s } = numbersOf(sigHex);
      return encodeSignature(r, CURVE_ORDER - s, f.hashType);
    }
  }
}

/** Byte positions where two encodings differ, comparing from the start (extra bytes count as different). */
export function changedBytes(a: string, b: string): number[] {
  const x = hexToBytes(a), y = hexToBytes(b);
  return Array.from({ length: Math.max(x.length, y.length) }, (_, i) => i).filter((i) => x[i] !== y[i]);
}

/* ---------- putting a signature back into its transaction ---------- */

const compact = (n: number) => (n < 0xfd ? byte(n) : `fd${byte(n & 0xff)}${byte(n >> 8)}`);
const le64 = (n: bigint) => Array.from({ length: 8 }, (_, i) => byte(Number((n >> BigInt(8 * i)) & 0xffn))).join("");

export function serializeTransaction(tx: Transaction): string {
  const ins = tx.inputs.map((i) => i.prevoutHex + compact(i.scriptSigHex.length / 2) + i.scriptSigHex + i.sequenceHex).join("");
  const outs = tx.outputs.map((o) => le64(o.valueSats) + compact(o.scriptPubKeyHex.length / 2) + o.scriptPubKeyHex).join("");
  const wit = tx.hasWitness ? tx.witnesses.map((w) => compact(w.length) + w.map((item) => compact(item.length / 2) + item).join("")).join("") : "";
  return tx.versionHex + (tx.hasWitness ? "0001" : "") + compact(tx.inputs.length) + ins + compact(tx.outputs.length) + outs + wit + tx.locktimeHex;
}

/**
 * The transaction with input `index`'s signature replaced. The signature is
 * either the scriptSig's only push (P2PK) or the witness's first item
 * (P2WPKH); other shapes are out of scope.
 */
export function withSignature(txHex: string, index: number, where: "scriptSig" | "witness", sigHex: string): string {
  const tx = parseTransaction(txHex);
  const inp = tx.inputs[index];
  if (!inp) throw new RangeError("no such input");
  if (where === "scriptSig") {
    const n = inp.scriptSigHex.length / 2 - 1;
    if (n > 75 || parseInt(inp.scriptSigHex.slice(0, 2), 16) !== n) throw new RangeError("Expected a scriptSig that is one signature push.");
    inp.scriptSigHex = byte(sigHex.length / 2) + sigHex;
  } else {
    if (tx.witnesses[index]?.length !== 2) throw new RangeError("Expected a two-item P2WPKH witness.");
    tx.witnesses[index] = [sigHex, tx.witnesses[index][1]];
  }
  const out = serializeTransaction(tx);
  return out;
}

/** The signature as it appears in the transaction, for checking a fixture against it. */
export function signatureIn(txHex: string, index: number, where: "scriptSig" | "witness"): string {
  const tx = parseTransaction(txHex);
  if (where === "witness") return tx.witnesses[index][0];
  return tx.inputs[index].scriptSigHex.slice(2);
}
