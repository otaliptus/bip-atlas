/**
 * MuSig2 teaching model (BIP 327): key aggregation, tweaking, nonce
 * generation and aggregation, partial signing, partial-signature
 * verification and aggregation.
 *
 * A transcription of the BIP's reference.py onto @noble/curves point
 * arithmetic and @noble/hashes SHA-256 (no hand-rolled field or curve code).
 * Error types and messages follow the reference so its error vectors can be
 * checked exactly. Like the reference, it is for demonstration and tests,
 * not for signing anything real: it is not constant-time.
 */
import { schnorr as schnorrNoble, secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "./hex";
import { CURVE_N } from "./schnorr";

const Point = secp256k1.Point;
type Pt = InstanceType<typeof Point>;
const G = Point.BASE;
const ZERO = Point.ZERO;

/** The reference's ValueError: an input fails a precondition. */
export class MusigValueError extends Error {}
/** The reference's InvalidContributionError: a signer or aggregator sent a bad value. */
export class InvalidContributionError extends Error {
  constructor(
    readonly signer: number | null,
    readonly contrib: "pubkey" | "pubnonce" | "aggnonce" | "aggothernonce" | "psig",
  ) {
    super(`invalid ${contrib} from ${signer === null ? "the aggregator" : `signer ${signer}`}`);
  }
}

/* ---------- byte helpers ---------- */

const concat = (...a: Uint8Array[]) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) out.set(x, o), (o += x.length);
  return out;
};
const enc = new TextEncoder();
function taggedHash(tag: string, msg: Uint8Array): Uint8Array {
  const t = sha256(enc.encode(tag));
  return sha256(concat(t, t, msg));
}
const int = (b: Uint8Array) => BigInt(`0x${bytesToHex(b) || "0"}`);
const bytes32 = (x: bigint) => hexToBytes(x.toString(16).padStart(64, "0"));
const beBytes = (x: number, len: number) => hexToBytes(x.toString(16).padStart(len * 2, "0"));
const equalBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const mod = (a: bigint) => ((a % CURVE_N) + CURVE_N) % CURVE_N;

const isInf = (P: Pt) => P.equals(ZERO);
const mul = (P: Pt, k: bigint) => (mod(k) === 0n || isInf(P) ? ZERO : P.multiply(mod(k)));
const affine = (P: Pt) => P.toAffine();
const hasEvenY = (P: Pt) => affine(P).y % 2n === 0n;
const xbytes = (P: Pt) => bytes32(affine(P).x);
const cbytes = (P: Pt) => concat(Uint8Array.of(hasEvenY(P) ? 2 : 3), xbytes(P));
const cbytesExt = (P: Pt) => (isInf(P) ? new Uint8Array(33) : cbytes(P));

function cpoint(x: Uint8Array): Pt {
  if (x.length !== 33 || (x[0] !== 2 && x[0] !== 3)) throw new MusigValueError("x is not a valid compressed point.");
  try {
    return Point.fromHex(bytesToHex(x));
  } catch {
    throw new MusigValueError("x is not a valid compressed point.");
  }
}
const cpointExt = (x: Uint8Array) => (x.every((b) => b === 0) && x.length === 33 ? ZERO : cpoint(x));

/** The plain (33-byte compressed) public key of a secret key. */
export function individualPk(sk: Uint8Array): Uint8Array {
  const d = int(sk);
  if (!(d >= 1n && d <= CURVE_N - 1n)) throw new MusigValueError("The secret key must be an integer in the range 1..n-1.");
  return cbytes(G.multiply(d));
}

/* ---------- key aggregation ---------- */

/** KeySort: lexicographic order of the 33-byte keys. */
export function keySort(pubkeys: Uint8Array[]): Uint8Array[] {
  return [...pubkeys].sort((a, b) => (bytesToHex(a) < bytesToHex(b) ? -1 : bytesToHex(a) > bytesToHex(b) ? 1 : 0));
}

export interface KeyAggContext {
  Q: Pt;
  gacc: bigint;
  tacc: bigint;
}

export const musigHashKeys = (pubkeys: Uint8Array[]) => taggedHash("KeyAgg list", concat(...pubkeys));

export function getSecondKey(pubkeys: Uint8Array[]): Uint8Array {
  for (let j = 1; j < pubkeys.length; j++) if (!equalBytes(pubkeys[j], pubkeys[0])) return pubkeys[j];
  return new Uint8Array(33);
}

/** KeyAggCoeff: 1 for the second distinct key, otherwise hash(L || pk) mod n. */
export function keyAggCoeff(pubkeys: Uint8Array[], pk: Uint8Array, pk2 = getSecondKey(pubkeys)): bigint {
  if (equalBytes(pk, pk2)) return 1n;
  return mod(int(taggedHash("KeyAgg coefficient", concat(musigHashKeys(pubkeys), pk))));
}

export function keyAgg(pubkeys: Uint8Array[]): KeyAggContext {
  const pk2 = getSecondKey(pubkeys);
  let Q = ZERO;
  pubkeys.forEach((pk, i) => {
    let P: Pt;
    try {
      P = cpoint(pk);
    } catch {
      throw new InvalidContributionError(i, "pubkey");
    }
    Q = Q.add(mul(P, keyAggCoeff(pubkeys, pk, pk2)));
  });
  if (isInf(Q)) throw new Error("aggregate key is infinity");
  return { Q, gacc: 1n, tacc: 0n };
}

export const xonlyPk = (ctx: KeyAggContext) => xbytes(ctx.Q);

export function applyTweak(ctx: KeyAggContext, tweak: Uint8Array, isXonly: boolean): KeyAggContext {
  if (tweak.length !== 32) throw new MusigValueError("The tweak must be a 32-byte array.");
  const g = isXonly && !hasEvenY(ctx.Q) ? CURVE_N - 1n : 1n;
  const t = int(tweak);
  if (t >= CURVE_N) throw new MusigValueError("The tweak must be less than n.");
  const Q = mul(ctx.Q, g).add(mul(G, t));
  if (isInf(Q)) throw new MusigValueError("The result of tweaking cannot be infinity.");
  return { Q, gacc: mod(g * ctx.gacc), tacc: mod(t + g * ctx.tacc) };
}

export function keyAggAndTweak(pubkeys: Uint8Array[], tweaks: Uint8Array[], isXonly: boolean[]): KeyAggContext {
  if (tweaks.length !== isXonly.length) throw new MusigValueError("The `tweaks` and `is_xonly` arrays must have the same length.");
  return tweaks.reduce((ctx, t, i) => applyTweak(ctx, t, isXonly[i]), keyAgg(pubkeys));
}

/* ---------- nonces ---------- */

function nonceHash(rand: Uint8Array, pk: Uint8Array, aggpk: Uint8Array, i: number, msgPrefixed: Uint8Array, extraIn: Uint8Array): bigint {
  const buf = concat(rand, Uint8Array.of(pk.length), pk, Uint8Array.of(aggpk.length), aggpk, msgPrefixed, beBytes(extraIn.length, 4), extraIn, Uint8Array.of(i));
  return int(taggedHash("MuSig/nonce", buf));
}

/** NonceGen with the randomness supplied (the reference's nonce_gen_internal), as the vectors use it. */
export function nonceGenInternal(rand_: Uint8Array, sk: Uint8Array | null, pk: Uint8Array, aggpk: Uint8Array | null, msg: Uint8Array | null, extraIn: Uint8Array | null) {
  const rand = sk ? sk.map((b, i) => b ^ taggedHash("MuSig/aux", rand_)[i]) : rand_;
  const msgPrefixed = msg === null ? Uint8Array.of(0) : concat(Uint8Array.of(1), beBytes(msg.length, 8), msg);
  const k1 = mod(nonceHash(rand, pk, aggpk ?? new Uint8Array(0), 0, msgPrefixed, extraIn ?? new Uint8Array(0)));
  const k2 = mod(nonceHash(rand, pk, aggpk ?? new Uint8Array(0), 1, msgPrefixed, extraIn ?? new Uint8Array(0)));
  if (k1 === 0n || k2 === 0n) throw new Error("zero nonce");
  const pubnonce = concat(cbytes(G.multiply(k1)), cbytes(G.multiply(k2)));
  const secnonce = concat(bytes32(k1), bytes32(k2), pk);
  return { secnonce, pubnonce };
}

export function nonceAgg(pubnonces: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const j of [1, 2]) {
    let R = ZERO;
    pubnonces.forEach((pn, i) => {
      let Rij: Pt;
      try {
        Rij = cpoint(pn.slice((j - 1) * 33, j * 33));
      } catch {
        throw new InvalidContributionError(i, "pubnonce");
      }
      R = R.add(Rij);
    });
    parts.push(cbytesExt(R));
  }
  return concat(...parts);
}

/* ---------- session, signing, verification ---------- */

export interface SessionContext {
  aggnonce: Uint8Array;
  pubkeys: Uint8Array[];
  tweaks: Uint8Array[];
  isXonly: boolean[];
  msg: Uint8Array;
}

export interface SessionValues {
  Q: Pt;
  gacc: bigint;
  tacc: bigint;
  /** Nonce coefficient: R = R1 + b·R2. */
  b: bigint;
  R: Pt;
  /** BIP 340 challenge for (R, Q, msg). */
  e: bigint;
  /** True when R1 + b·R2 was infinity and G was used instead. */
  rWasInfinity: boolean;
}

export function sessionValues(s: SessionContext): SessionValues {
  const { Q, gacc, tacc } = keyAggAndTweak(s.pubkeys, s.tweaks, s.isXonly);
  const b = mod(int(taggedHash("MuSig/noncecoef", concat(s.aggnonce, xbytes(Q), s.msg))));
  let R1: Pt, R2: Pt;
  try {
    R1 = cpointExt(s.aggnonce.slice(0, 33));
    R2 = cpointExt(s.aggnonce.slice(33, 66));
  } catch {
    throw new InvalidContributionError(null, "aggnonce");
  }
  const R_ = R1.add(mul(R2, b));
  const R = isInf(R_) ? G : R_;
  const e = mod(int(taggedHash("BIP0340/challenge", concat(xbytes(R), xbytes(Q), s.msg))));
  return { Q, gacc, tacc, b, R, e, rWasInfinity: isInf(R_) };
}

function sessionKeyAggCoeff(s: SessionContext, P: Pt): bigint {
  const pk = cbytes(P);
  if (!s.pubkeys.some((k) => equalBytes(k, pk))) throw new MusigValueError("The signer's pubkey must be included in the list of pubkeys.");
  return keyAggCoeff(s.pubkeys, pk);
}

/**
 * Sign: s = k1 + b·k2 + e·a·d (with the sign corrections for R and Q).
 * Overwrites the first 64 bytes of `secnonce` with zeros, as the reference
 * does, so the same nonce cannot sign twice.
 */
export function sign(secnonce: Uint8Array, sk: Uint8Array, s: SessionContext): Uint8Array {
  const { Q, gacc, b, R, e } = sessionValues(s);
  const k1_ = int(secnonce.slice(0, 32));
  const k2_ = int(secnonce.slice(32, 64));
  secnonce.fill(0, 0, 64);
  if (!(k1_ > 0n && k1_ < CURVE_N)) throw new MusigValueError("first secnonce value is out of range.");
  if (!(k2_ > 0n && k2_ < CURVE_N)) throw new MusigValueError("second secnonce value is out of range.");
  const k1 = hasEvenY(R) ? k1_ : CURVE_N - k1_;
  const k2 = hasEvenY(R) ? k2_ : CURVE_N - k2_;
  const d_ = int(sk);
  if (!(d_ > 0n && d_ < CURVE_N)) throw new MusigValueError("secret key value is out of range.");
  const P = G.multiply(d_);
  const pk = cbytes(P);
  if (!equalBytes(pk, secnonce.slice(64, 97))) throw new MusigValueError("Public key does not match nonce_gen argument");
  const a = sessionKeyAggCoeff(s, P);
  const g = hasEvenY(Q) ? 1n : CURVE_N - 1n;
  const d = mod(g * gacc * d_);
  const sig = bytes32(mod(k1 + b * k2 + e * a * d));
  const pubnonce = concat(cbytes(G.multiply(k1_)), cbytes(G.multiply(k2_)));
  if (!partialSigVerifyInternal(sig, pubnonce, pk, s)) throw new Error("own partial signature does not verify");
  return sig;
}

/** PartialSigVerify for one signer: s·G == Re_s + e·a·g·P. */
export function partialSigVerifyInternal(psig: Uint8Array, pubnonce: Uint8Array, pk: Uint8Array, s: SessionContext): boolean {
  const { Q, gacc, b, R, e } = sessionValues(s);
  const sv = int(psig);
  if (sv >= CURVE_N) return false;
  const Rs1 = cpoint(pubnonce.slice(0, 33));
  const Rs2 = cpoint(pubnonce.slice(33, 66));
  const Re_ = Rs1.add(mul(Rs2, b));
  const Re = hasEvenY(R) ? Re_ : Re_.negate();
  const P = cpoint(pk);
  const a = sessionKeyAggCoeff(s, P);
  const g = hasEvenY(Q) ? 1n : CURVE_N - 1n;
  return mul(G, sv).equals(Re.add(mul(P, e * a * mod(g * gacc))));
}

export function partialSigVerify(psig: Uint8Array, pubnonces: Uint8Array[], pubkeys: Uint8Array[], tweaks: Uint8Array[], isXonly: boolean[], msg: Uint8Array, i: number): boolean {
  if (pubnonces.length !== pubkeys.length) throw new MusigValueError("The `pubnonces` and `pubkeys` arrays must have the same length.");
  if (tweaks.length !== isXonly.length) throw new MusigValueError("The `tweaks` and `is_xonly` arrays must have the same length.");
  const aggnonce = nonceAgg(pubnonces);
  return partialSigVerifyInternal(psig, pubnonces[i], pubkeys[i], { aggnonce, pubkeys, tweaks, isXonly, msg });
}

/** PartialSigAgg: s = Σ s_i + e·g·tacc; the signature is (x(R), s). */
export function partialSigAgg(psigs: Uint8Array[], s: SessionContext): Uint8Array {
  const { Q, tacc, R, e } = sessionValues(s);
  let sum = 0n;
  psigs.forEach((p, i) => {
    const si = int(p);
    if (si >= CURVE_N) throw new InvalidContributionError(i, "psig");
    sum = mod(sum + si);
  });
  const g = hasEvenY(Q) ? 1n : CURVE_N - 1n;
  return concat(xbytes(R), bytes32(mod(sum + e * g * tacc)));
}

/** Deterministic signing (the reference's deterministic_sign), for the det_sign vectors. */
export function deterministicSign(sk: Uint8Array, aggothernonce: Uint8Array, pubkeys: Uint8Array[], tweaks: Uint8Array[], isXonly: boolean[], msg: Uint8Array, rand: Uint8Array | null) {
  const sk_ = rand ? sk.map((b, i) => b ^ taggedHash("MuSig/aux", rand)[i]) : sk;
  const aggpk = xonlyPk(keyAggAndTweak(pubkeys, tweaks, isXonly));
  const h = (i: number) => mod(int(taggedHash("MuSig/deterministic/nonce", concat(sk_, aggothernonce, aggpk, beBytes(msg.length, 8), msg, Uint8Array.of(i)))));
  const k1 = h(0), k2 = h(1);
  const pubnonce = concat(cbytes(G.multiply(k1)), cbytes(G.multiply(k2)));
  const secnonce = concat(bytes32(k1), bytes32(k2), individualPk(sk));
  let aggnonce: Uint8Array;
  try {
    aggnonce = nonceAgg([pubnonce, aggothernonce]);
  } catch {
    throw new InvalidContributionError(null, "aggothernonce");
  }
  return { pubnonce, psig: sign(secnonce, sk, { aggnonce, pubkeys, tweaks, isXonly, msg }) };
}

/** Helpers for figures: affine coordinates and compressed bytes of session points. */
export const pointHex = (P: Pt) => bytesToHex(cbytes(P));
export const hasEvenYPoint = hasEvenY;

/** BIP 340 verification of a final signature, via noble (for build-time checks and figures). */
export function bip340Verify(sig: Uint8Array, msg: Uint8Array, xonly: Uint8Array): boolean {
  return schnorrNoble.verify(sig, msg, xonly);
}

/** x coordinate of the plain sum P1 + … + Pn: what aggregation would be without coefficients (not MuSig2). */
export function naiveSumXonly(pubkeys: Uint8Array[]): Uint8Array {
  return xbytes(pubkeys.map(cpoint).reduce((a, b) => a.add(b)));
}
