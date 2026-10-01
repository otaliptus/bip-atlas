/**
 * Block filter teaching model for BIPs 157 and 158: the basic filter's
 * element set, SipHash-2-4 hashing into [0, N·M), Golomb-Rice coding of the
 * sorted deltas, membership queries with a step trace, and filter hashes and
 * headers.
 *
 * SipHash-2-4 comes from the siphash package (Frank Denis); SHA-256 from the
 * audited @noble/hashes. This is not a node: it reads a serialized block's
 * transactions only far enough to collect output scripts.
 */
import SipHash from "siphash";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "./hex";

export const BASIC_P = 19;
export const BASIC_M = 784931n;

const dsha = (b: Uint8Array) => sha256(sha256(b));
const rev = (hex: string) => hex.match(/../g)!.reverse().join("");

export class FilterError extends Error {}

/* ---------- SipHash-2-4 and hash_to_range ---------- */

const u32le = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** SipHash-2-4 with a 16-byte key, as a 64-bit unsigned integer. */
export function siphash24(key: Uint8Array, msg: Uint8Array): bigint {
  if (key.length !== 16) throw new FilterError("SipHash key must be 16 bytes.");
  const k = [u32le(key, 0), u32le(key, 4), u32le(key, 8), u32le(key, 12)];
  const h = SipHash.hash(k, msg);
  return (BigInt(h.h >>> 0) << 32n) | BigInt(h.l >>> 0);
}

/** (siphash(k, item) · F) >> 64. */
export const hashToRange = (item: Uint8Array, F: bigint, key: Uint8Array) => (siphash24(key, item) * F) >> 64n;

/** k: the first 16 bytes of the block hash in its internal (little-endian) byte order. */
export const filterKey = (blockHashDisplayHex: string) => hexToBytes(rev(blockHashDisplayHex)).slice(0, 16);

/* ---------- bit streams and Golomb-Rice ---------- */

export class BitWriter {
  bits: number[] = [];
  write(b: number) { this.bits.push(b & 1); }
  writeBitsBE(n: bigint, k: number) { for (let i = k - 1; i >= 0; i--) this.write(Number((n >> BigInt(i)) & 1n)); }
  bytes(): Uint8Array {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8));
    this.bits.forEach((b, i) => { if (b) out[i >> 3] |= 0x80 >> (i & 7); });
    return out;
  }
}

export class BitReader {
  pos = 0;
  constructor(readonly data: Uint8Array) {}
  read(): number {
    if (this.pos >= this.data.length * 8) throw new FilterError("Read past the end of the filter.");
    const b = (this.data[this.pos >> 3] >> (7 - (this.pos & 7))) & 1;
    this.pos++;
    return b;
  }
  readBitsBE(k: number): bigint { let v = 0n; for (let i = 0; i < k; i++) v = (v << 1n) | BigInt(this.read()); return v; }
}

/** The Golomb-Rice code of x as a bit string: q ones, a zero, then P remainder bits. */
export function golombBits(x: bigint, P: number): { q: bigint; r: bigint; unary: string; remainder: string } {
  const q = x >> BigInt(P);
  const r = x & ((1n << BigInt(P)) - 1n);
  if (q > 100000n) throw new FilterError("Quotient too large to draw.");
  return { q, r, unary: "1".repeat(Number(q)) + "0", remainder: P ? r.toString(2).padStart(P, "0") : "" };
}

export function golombEncode(w: BitWriter, x: bigint, P: number) {
  let q = x >> BigInt(P);
  while (q > 0n) { w.write(1); q--; }
  w.write(0);
  w.writeBitsBE(x, P);
}

export function golombDecode(r: BitReader, P: number): bigint {
  let q = 0n;
  while (r.read() === 1) q++;
  return (q << BigInt(P)) + r.readBitsBE(P);
}

/* ---------- CompactSize ---------- */

function compactSize(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.of(n);
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8);
  if (n <= 0xffffffff) return Uint8Array.of(0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24);
  throw new FilterError("CompactSize above 2^32 is out of scope.");
}

function readCompactSize(b: Uint8Array, o: number): { value: number; size: number } {
  const f = b[o];
  if (f === undefined) throw new FilterError("Unexpected end of data.");
  if (f < 0xfd) return { value: f, size: 1 };
  const n = f === 0xfd ? 2 : f === 0xfe ? 4 : 8;
  if (o + 1 + n > b.length) throw new FilterError("Unexpected end of data.");
  let v = 0;
  for (let i = n; i >= 1; i--) v = v * 256 + b[o + i];
  return { value: v, size: 1 + n };
}

/* ---------- GCS construction and querying ---------- */

export interface GcsBuild {
  N: number;
  F: bigint;
  /** Hashed values, sorted ascending. */
  values: bigint[];
  deltas: bigint[];
  /** The compressed set (without the N prefix). */
  compressed: Uint8Array;
  /** The serialized filter: CompactSize N, then the compressed set. */
  filter: Uint8Array;
}

export function constructGcs(items: Uint8Array[], P: number, key: Uint8Array, M: bigint): GcsBuild {
  const N = items.length;
  if (N >= 2 ** 32 || M >= 2n ** 32n) throw new FilterError("N and M must be below 2^32.");
  const F = BigInt(N) * M;
  const values = items.map((it) => hashToRange(it, F, key)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const w = new BitWriter();
  const deltas: bigint[] = [];
  let last = 0n;
  for (const v of values) { deltas.push(v - last); golombEncode(w, v - last, P); last = v; }
  const compressed = w.bytes();
  return { N, F, values, deltas, compressed, filter: Uint8Array.from([...compactSize(N), ...compressed]) };
}

export interface MatchStep { delta: bigint; value: bigint; outcome: "less" | "equal" | "greater" }
export interface MatchResult { N: number; F: bigint; target: bigint; matched: boolean; steps: MatchStep[] }

/** gcs_match on a serialized filter (CompactSize N prefix included), recording each decoded value. */
export function matchFilter(filter: Uint8Array, target: Uint8Array, key: Uint8Array, P = BASIC_P, M = BASIC_M): MatchResult {
  const { value: N, size } = readCompactSize(filter, 0);
  const F = BigInt(N) * M;
  const t = hashToRange(target, F, key);
  const r = new BitReader(filter.slice(size));
  const steps: MatchStep[] = [];
  let last = 0n;
  for (let i = 0; i < N; i++) {
    const delta = golombDecode(r, P);
    const value = last + delta;
    if (value === t) { steps.push({ delta, value, outcome: "equal" }); return { N, F, target: t, matched: true, steps }; }
    if (value > t) { steps.push({ delta, value, outcome: "greater" }); break; }
    steps.push({ delta, value, outcome: "less" });
    last = value;
  }
  return { N, F, target: t, matched: false, steps };
}

/** Decode every value of a serialized filter. */
export function decodeFilter(filter: Uint8Array, P = BASIC_P): bigint[] {
  const { value: N, size } = readCompactSize(filter, 0);
  const r = new BitReader(filter.slice(size));
  const out: bigint[] = [];
  let last = 0n;
  for (let i = 0; i < N; i++) { last += golombDecode(r, P); out.push(last); }
  return out;
}

/* ---------- the basic filter's elements ---------- */

export interface BlockScripts { coinbaseOutputs: string[]; outputs: string[]; txCount: number }

/** Read a serialized block's transactions far enough to collect every output script. */
export function blockOutputScripts(blockHex: string): BlockScripts {
  const b = hexToBytes(blockHex);
  let o = 80;
  const cs = () => { const c = readCompactSize(b, o); o += c.size; return c.value; };
  const take = (n: number) => { if (o + n > b.length) throw new FilterError("Unexpected end of block."); const s = b.slice(o, o + n); o += n; return s; };
  const txCount = cs();
  const outputs: string[] = [];
  let coinbaseOutputs: string[] = [];
  for (let t = 0; t < txCount; t++) {
    take(4);
    let witness = false;
    if (b[o] === 0x00 && b[o + 1] !== 0x00) { witness = true; take(2); }
    const nin = cs();
    for (let i = 0; i < nin; i++) { take(36); take(cs()); take(4); }
    const nout = cs();
    const mine: string[] = [];
    for (let i = 0; i < nout; i++) { take(8); mine.push(bytesToHex(take(cs()))); }
    if (witness) for (let i = 0; i < nin; i++) { const items = cs(); for (let j = 0; j < items; j++) take(cs()); }
    take(4);
    if (t === 0) coinbaseOutputs = mine;
    outputs.push(...mine);
  }
  if (o !== b.length) throw new FilterError("Trailing bytes after the last transaction.");
  return { coinbaseOutputs, outputs, txCount };
}

export interface ElementView { script: string; from: "output" | "spent"; included: boolean; reason?: string }

/**
 * The basic filter's elements: every output script except OP_RETURN ones,
 * and every spent output's script (prevScripts, coinbase excluded by the
 * caller), with empty scripts dropped and duplicates collapsed.
 */
export function basicElements(outputScripts: string[], prevScripts: string[]): { elements: string[]; views: ElementView[] } {
  const views: ElementView[] = [];
  const seen = new Set<string>();
  const add = (script: string, from: ElementView["from"]) => {
    if (script === "") return views.push({ script, from, included: false, reason: "empty script (a nil item)" });
    if (from === "output" && script.startsWith("6a")) return views.push({ script, from, included: false, reason: "starts with OP_RETURN" });
    if (seen.has(script)) return views.push({ script, from, included: false, reason: "duplicate of an earlier element" });
    seen.add(script);
    views.push({ script, from, included: true });
  };
  for (const s of outputScripts) add(s, "output");
  for (const s of prevScripts) add(s, "spent");
  return { elements: [...seen], views };
}

export interface BasicFilter extends GcsBuild { key: Uint8Array; elements: string[]; views: ElementView[]; filterHash: string; header: string }

/** Build the basic filter for a block and its header from the previous header (display byte order). */
export function buildBasicFilter(blockHashHex: string, blockHex: string, prevScripts: string[], prevHeaderHex: string): BasicFilter {
  const { outputs } = blockOutputScripts(blockHex);
  const { elements, views } = basicElements(outputs, prevScripts);
  const key = filterKey(blockHashHex);
  const g = constructGcs(elements.map(hexToBytes), BASIC_P, key, BASIC_M);
  const { hash, header } = filterHeader(g.filter, prevHeaderHex);
  return { ...g, key, elements, views, filterHash: hash, header };
}

/** Filter hash = dSHA256(filter); header = dSHA256(filter hash ‖ previous header). Hex in display order. */
export function filterHeader(filter: Uint8Array, prevHeaderHex: string): { hash: string; header: string } {
  const h = dsha(filter);
  const header = dsha(Uint8Array.from([...h, ...hexToBytes(rev(prevHeaderHex))]));
  return { hash: rev(bytesToHex(h)), header: rev(bytesToHex(header)) };
}

/** The block hash (display order) of a serialized block. */
export const blockHash = (blockHex: string) => rev(bytesToHex(dsha(hexToBytes(blockHex).slice(0, 80))));

/** Expected false-positive matches when testing q unrelated items: q / M. */
export const expectedFalsePositives = (queries: number, M = BASIC_M) => queries / Number(M);
