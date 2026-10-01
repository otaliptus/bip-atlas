/**
 * Silent payments teaching model (BIP 352, version 0): which inputs count,
 * the input hash, the ECDH shared secret, the sender's outputs, the
 * receiver's scan (with labels), and sp1q address encoding.
 *
 * A transcription of the BIP's reference.py onto @noble/curves and
 * @noble/hashes, with @scure/base for bech32m. It never signs anything; the
 * private keys it accepts are the published test vectors'.
 *
 * Scope: like reference.py, scan() assumes the caller already applied the
 * transaction-level rules (at least one taproot output, no spent output with
 * SegWit version > 1); scanEligible() states them separately. scan() checks
 * only the labels it is given, so a wallet must pass the change label m = 0
 * itself.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bech32m } from "@scure/base";
import { hash160 } from "./bip32";
import { bytesToHex, hexToBytes } from "./hex";
import { CURVE_N } from "./schnorr";

const Point = secp256k1.Point;
type Pt = InstanceType<typeof Point>;
const G = Point.BASE;
const ZERO = Point.ZERO;

/** Per-group recipient limit. */
export const K_MAX = 2323;
/** BIP 341's NUMS point H (x coordinate): script-path spends with this internal key are skipped. */
export const NUMS_H = "50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0";

const enc = new TextEncoder();
const concat = (...a: Uint8Array[]) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) out.set(x, o), (o += x.length);
  return out;
};
function taggedHash(tag: string, msg: Uint8Array): Uint8Array {
  const t = sha256(enc.encode(tag));
  return sha256(concat(t, t, msg));
}
const int = (b: Uint8Array) => BigInt(`0x${bytesToHex(b) || "0"}`);
const bytes32 = (x: bigint) => hexToBytes(x.toString(16).padStart(64, "0"));
const ser32 = (i: number) => hexToBytes((i >>> 0).toString(16).padStart(8, "0"));
const mod = (a: bigint) => ((a % CURVE_N) + CURVE_N) % CURVE_N;
const isInf = (P: Pt) => P.equals(ZERO);
const compressed = (P: Pt) => P.toBytes(true);
const xonly = (P: Pt) => P.toBytes(true).slice(1);
const hasEvenY = (P: Pt) => P.toAffine().y % 2n === 0n;

/** A scalar from a hash, as Scalar.from_bytes_checked: must be in 1..n-1, else the operation fails. */
function checkedScalar(b: Uint8Array, what: string): bigint {
  const v = int(b);
  if (v === 0n || v >= CURVE_N) throw new SilentPaymentError(`${what} is not a valid scalar`);
  return v;
}

export class SilentPaymentError extends Error {}

/* ---------- inputs ---------- */

export interface Vin {
  txid: string;
  vout: number;
  scriptSigHex: string;
  /** Witness stack items (hex), already deserialized. */
  witness: string[];
  prevoutSpkHex: string;
}

export type InputKind = "p2pkh" | "p2sh-p2wpkh" | "p2wpkh" | "p2tr" | "other";

export interface InputReading {
  kind: InputKind;
  /** The public key that counts toward the shared secret, or null if this input is skipped. */
  pubkey: string | null;
  /** Why it was skipped. */
  skipped: string | null;
}

/** Deserialize a witness given as one hex string (compact-size count, then items). */
export function parseWitness(hex: string): string[] {
  if (!hex) return [];
  const b = hexToBytes(hex);
  let o = 0;
  const cs = () => {
    const x = b[o++];
    if (x < 0xfd) return x;
    const n = x === 0xfd ? 2 : x === 0xfe ? 4 : 8;
    let v = 0;
    for (let i = 0; i < n; i++) v += b[o + i] * 2 ** (8 * i);
    o += n;
    return v;
  };
  const count = cs();
  const items: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = cs();
    items.push(bytesToHex(b.slice(o, o + len)));
    o += len;
  }
  return items;
}

const isP2tr = (s: Uint8Array) => s.length === 34 && s[0] === 0x51 && s[1] === 0x20;
const isP2wpkh = (s: Uint8Array) => s.length === 22 && s[0] === 0x00 && s[1] === 0x14;
const isP2sh = (s: Uint8Array) => s.length === 23 && s[0] === 0xa9 && s[1] === 0x14 && s[22] === 0x87;
const isP2pkh = (s: Uint8Array) => s.length === 25 && s[0] === 0x76 && s[1] === 0xa9 && s[2] === 0x14 && s[23] === 0x88 && s[24] === 0xac;

function tryCompressed(b: Uint8Array): Pt | null {
  if (b.length !== 33) return null;
  try {
    return Point.fromHex(bytesToHex(b));
  } catch {
    return null;
  }
}

/** get_pubkey_from_input: which key, if any, an input contributes. */
export function readInput(vin: Vin): InputReading {
  const spk = hexToBytes(vin.prevoutSpkHex);
  const sig = hexToBytes(vin.scriptSigHex);
  if (isP2pkh(spk)) {
    const want = bytesToHex(spk.slice(3, 23));
    // Slide a 33-byte window from the end of the scriptSig, so even a malleated scriptSig yields the key.
    for (let i = sig.length; i >= 33; i--) {
      const w = sig.slice(i - 33, i);
      if (bytesToHex(hash160(w)) === want) {
        const P = tryCompressed(w);
        if (P) return { kind: "p2pkh", pubkey: bytesToHex(compressed(P)), skipped: null };
      }
    }
    return { kind: "p2pkh", pubkey: null, skipped: "no compressed key in the scriptSig hashes to the output" };
  }
  if (isP2sh(spk)) {
    const redeem = sig.slice(1);
    if (isP2wpkh(redeem)) {
      const P = tryCompressed(hexToBytes(vin.witness.at(-1) ?? ""));
      if (P) return { kind: "p2sh-p2wpkh", pubkey: bytesToHex(compressed(P)), skipped: null };
      return { kind: "p2sh-p2wpkh", pubkey: null, skipped: "last witness item is not a compressed key" };
    }
    return { kind: "other", pubkey: null, skipped: "P2SH, but not wrapping P2WPKH" };
  }
  if (isP2wpkh(spk)) {
    const P = tryCompressed(hexToBytes(vin.witness.at(-1) ?? ""));
    if (P) return { kind: "p2wpkh", pubkey: bytesToHex(compressed(P)), skipped: null };
    return { kind: "p2wpkh", pubkey: null, skipped: "last witness item is not a compressed key" };
  }
  if (isP2tr(spk)) {
    let stack = [...vin.witness];
    if (stack.length >= 1) {
      if (stack.length > 1 && stack.at(-1)!.startsWith("50")) stack = stack.slice(0, -1); // annex
      if (stack.length > 1) {
        const internal = stack.at(-1)!.slice(2, 66);
        if (internal === NUMS_H) return { kind: "p2tr", pubkey: null, skipped: "script-path spend with the NUMS internal key H" };
      }
      try {
        const P = Point.fromHex(`02${bytesToHex(spk.slice(2))}`);
        return { kind: "p2tr", pubkey: bytesToHex(compressed(P)), skipped: null };
      } catch {
        return { kind: "p2tr", pubkey: null, skipped: "output key is not on the curve" };
      }
    }
    return { kind: "p2tr", pubkey: null, skipped: "empty witness" };
  }
  return { kind: "other", pubkey: null, skipped: "not one of the listed input types" };
}

/** The 36-byte outpoint: txid little-endian (reversed display order), then vout little-endian. */
export function serializeOutpoint(txid: string, vout: number): Uint8Array {
  const t = hexToBytes(txid).reverse();
  return concat(t, hexToBytes([0, 8, 16, 24].map((s) => ((vout >>> s) & 0xff).toString(16).padStart(2, "0")).join("")));
}

/** input_hash = hash_BIP0352/Inputs(smallest outpoint || A). */
export function inputHash(outpoints: Array<{ txid: string; vout: number }>, A: Pt): { hash: Uint8Array; smallest: string } {
  const ser = outpoints.map((o) => bytesToHex(serializeOutpoint(o.txid, o.vout))).sort();
  return { hash: taggedHash("BIP0352/Inputs", concat(hexToBytes(ser[0]), compressed(A))), smallest: ser[0] };
}

/* ---------- labels and addresses ---------- */

export function labelTweak(bScan: Uint8Array, m: number): bigint {
  return checkedScalar(taggedHash("BIP0352/Label", concat(bScan, ser32(m))), "label");
}

export function encodeAddress(Bscan: Uint8Array, Bm: Uint8Array, hrp: "sp" | "tsp" = "sp"): string {
  return bech32m.encode(hrp, [0, ...bech32m.toWords(concat(Bscan, Bm))], 1023);
}

export function decodeAddress(address: string): { hrp: string; version: number; Bscan: string; Bm: string } {
  const d = bech32m.decode(address as `${string}1${string}`, 1023);
  if (d.prefix !== "sp" && d.prefix !== "tsp") throw new SilentPaymentError("human-readable part must be sp or tsp");
  const version = d.words[0];
  const data = bech32m.fromWords(d.words.slice(1));
  if (version === 31) throw new SilentPaymentError("version 31 is reserved");
  if (version === 0 && data.length !== 66) throw new SilentPaymentError("v0 data part must be exactly 66 bytes");
  if (data.length < 66) throw new SilentPaymentError("data part shorter than 66 bytes");
  return { hrp: d.prefix, version, Bscan: bytesToHex(data.slice(0, 33)), Bm: bytesToHex(data.slice(33, 66)) };
}

/** Receiver addresses: unlabeled, then one per label m. */
export function receiverAddresses(bScan: Uint8Array, bSpend: Uint8Array, labels: number[]): string[] {
  const Bscan = compressed(G.multiply(int(bScan)));
  const Bspend = G.multiply(int(bSpend));
  return [encodeAddress(Bscan, compressed(Bspend)), ...labels.map((m) => encodeAddress(Bscan, compressed(Bspend.add(G.multiply(labelTweak(bScan, m))))))];
}

/* ---------- sender ---------- */

export interface SendResult {
  inputPubKeys: string[];
  /** Sum of the eligible private keys after taproot negation, or null if it is zero. */
  aSum: string | null;
  /** One shared secret per scan key, in recipient order of first appearance. */
  sharedSecrets: Array<{ Bscan: string; secret: string }>;
  outputs: string[];
  failure: string | null;
}

/** create_outputs: the sender's side, from the inputs' (test) private keys and the recipients' addresses. */
export function createOutputs(vins: Array<Vin & { privateKey: string }>, recipients: string[]): SendResult {
  const eligible = vins.map((v) => ({ v, r: readInput(v) })).filter((x) => x.r.pubkey !== null);
  const inputPubKeys = eligible.map((x) => x.r.pubkey!);
  if (!eligible.length) return { inputPubKeys, aSum: null, sharedSecrets: [], outputs: [], failure: "no eligible inputs" };
  let a = 0n;
  for (const { v, r } of eligible) {
    let k = int(hexToBytes(v.privateKey));
    if (r.kind === "p2tr" && !hasEvenY(G.multiply(k))) k = CURVE_N - k;
    a = mod(a + k);
  }
  if (a === 0n) return { inputPubKeys, aSum: null, sharedSecrets: [], outputs: [], failure: "input private keys sum to zero" };
  const { hash } = inputHash(vins, G.multiply(a));
  const ih = checkedScalar(hash, "input_hash");
  const groups = new Map<string, string[]>();
  for (const addr of recipients) {
    const d = decodeAddress(addr);
    groups.set(d.Bscan, [...(groups.get(d.Bscan) ?? []), d.Bm]);
  }
  if ([...groups.values()].some((g) => g.length > K_MAX)) return { inputPubKeys, aSum: bytesToHex(bytes32(a)), sharedSecrets: [], outputs: [], failure: `more than K_max = ${K_MAX} recipients share one scan key` };
  const sharedSecrets: SendResult["sharedSecrets"] = [];
  const outputs = new Set<string>();
  for (const [Bscan, Bms] of groups) {
    const secret = Point.fromHex(Bscan).multiply(mod(ih * a));
    sharedSecrets.push({ Bscan, secret: bytesToHex(compressed(secret)) });
    Bms.forEach((Bm, k) => {
      const t = checkedScalar(taggedHash("BIP0352/SharedSecret", concat(compressed(secret), ser32(k))), "t_k");
      outputs.add(bytesToHex(xonly(Point.fromHex(Bm).add(G.multiply(t)))));
    });
  }
  return { inputPubKeys, aSum: bytesToHex(bytes32(a)), sharedSecrets, outputs: [...outputs], failure: null };
}

/* ---------- receiver ---------- */

export interface ScanStep {
  k: number;
  tk: string;
  Pk: string;
  match: null | { output: string; via: "direct" | "label" | "label-negated"; label: number | null };
}

export interface ScanResult {
  inputPubKeys: string[];
  /** A = sum of eligible input keys; null if none, or if they sum to infinity (the transaction is skipped). */
  A: string | null;
  inputHash: string | null;
  /** The lexicographically smallest serialized outpoint, as hashed. */
  smallestOutpoint: string | null;
  /** input_hash·A, the per-transaction value light clients can be served. */
  tweak: string | null;
  sharedSecret: string | null;
  steps: ScanStep[];
  found: Array<{ pubKey: string; privKeyTweak: string; label: number | null }>;
  skipped: string | null;
}

/**
 * The transaction-level rules for v0 (BIP 352, "Scanning silent payment
 * eligible transactions"): scan iff there is a taproot output, at least one
 * input from the list, and no spent output with SegWit version > 1.
 */
export function scanEligible(vins: Vin[], outputScripts: string[]): { eligible: boolean; reason: string | null } {
  if (!outputScripts.some((s) => /^5120[0-9a-f]{64}$/.test(s))) return { eligible: false, reason: "no taproot output" };
  const witnessVersion = (spk: string) => {
    const b = hexToBytes(spk);
    if (b.length < 4 || b.length > 42 || b[1] !== b.length - 2) return null;
    if (b[0] === 0) return 0;
    return b[0] >= 0x51 && b[0] <= 0x60 ? b[0] - 0x50 : null;
  };
  if (vins.some((v) => (witnessVersion(v.prevoutSpkHex) ?? 0) > 1)) return { eligible: false, reason: "spends an output with SegWit version > 1" };
  if (!vins.some((v) => readInput(v).pubkey !== null)) return { eligible: false, reason: "no input from the list" };
  return { eligible: true, reason: null };
}

/** scanning(): find this wallet's outputs among a transaction's taproot output keys. */
export function scan(vins: Vin[], outputs: string[], bScan: Uint8Array, bSpend: Uint8Array, labels: number[]): ScanResult {
  const pubs = vins.map(readInput).filter((r) => r.pubkey !== null).map((r) => r.pubkey!);
  const empty = { inputPubKeys: pubs, A: null, inputHash: null, smallestOutpoint: null, tweak: null, sharedSecret: null, steps: [], found: [] };
  if (!pubs.length) return { ...empty, skipped: "no eligible inputs" };
  const A = pubs.map((h) => Point.fromHex(h)).reduce((s, P) => s.add(P), ZERO);
  if (isInf(A)) return { ...empty, skipped: "input keys sum to the point at infinity" };
  const { hash, smallest } = inputHash(vins, A);
  const ih = checkedScalar(hash, "input_hash");
  const tweakPt = A.multiply(ih);
  const secret = tweakPt.multiply(int(bScan));
  const Bspend = G.multiply(int(bSpend));
  const labelMap = new Map<string, { m: number; t: bigint }>();
  for (const m of labels) {
    const t = labelTweak(bScan, m);
    labelMap.set(bytesToHex(compressed(G.multiply(t))), { m, t });
  }
  const remaining = [...outputs];
  const steps: ScanStep[] = [];
  const found: ScanResult["found"] = [];
  for (let k = 0; k < K_MAX; ) {
    const tk = checkedScalar(taggedHash("BIP0352/SharedSecret", concat(compressed(secret), ser32(k))), "t_k");
    const Pk = Bspend.add(G.multiply(tk));
    const PkX = bytesToHex(xonly(Pk));
    let match: ScanStep["match"] = null;
    // Direct match first; with labels, try each output in order (as the reference does).
    const direct = remaining.indexOf(PkX);
    if (direct >= 0 && !labelMap.size) {
      match = { output: PkX, via: "direct", label: null };
      found.push({ pubKey: PkX, privKeyTweak: bytesToHex(bytes32(tk)), label: null });
      remaining.splice(direct, 1);
    } else if (labelMap.size) {
      for (let i = 0; i < remaining.length && !match; i++) {
        const out = remaining[i];
        if (out === PkX) {
          match = { output: out, via: "direct", label: null };
          found.push({ pubKey: PkX, privKeyTweak: bytesToHex(bytes32(tk)), label: null });
        } else {
          const O = Point.fromHex(`02${out}`);
          for (const [via, cand] of [["label", O.subtract(Pk)], ["label-negated", O.negate().subtract(Pk)]] as const) {
            if (match || isInf(cand)) continue;
            const hit = labelMap.get(bytesToHex(compressed(cand)));
            if (hit) {
              match = { output: out, via, label: hit.m };
              found.push({ pubKey: bytesToHex(xonly(Pk.add(cand))), privKeyTweak: bytesToHex(bytes32(mod(tk + hit.t))), label: hit.m });
            }
          }
        }
        if (match) remaining.splice(i, 1);
      }
    }
    // Keep at most a few steps for figures; the loop itself may run to K_MAX.
    if (steps.length < 8) steps.push({ k, tk: bytesToHex(bytes32(tk)), Pk: PkX, match });
    if (!match) break;
    k++;
  }
  return {
    inputPubKeys: pubs,
    A: bytesToHex(compressed(A)),
    inputHash: bytesToHex(hash),
    smallestOutpoint: smallest,
    tweak: bytesToHex(compressed(tweakPt)),
    sharedSecret: bytesToHex(compressed(secret)),
    steps,
    found,
    skipped: null,
  };
}

/** The spending key for a found output: d = b_spend + tweak (mod n), as BIP 352's Spending section gives it. */
export function spendKeyMatches(bSpend: Uint8Array, privKeyTweak: string, pubKey: string): boolean {
  const d = mod(int(bSpend) + int(hexToBytes(privKeyTweak)));
  return d !== 0n && bytesToHex(xonly(G.multiply(d))) === pubKey;
}
