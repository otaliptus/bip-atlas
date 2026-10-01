/**
 * BIP340 teaching model: the verification algorithm laid out as the BIP's own
 * steps, so a figure can show which check a signature passes or fails.
 *
 * All curve arithmetic, lift_x and tagged hashing come from the audited
 * @noble/curves `schnorr` implementation. This module only sequences those
 * calls and records intermediate values; it never signs, and every result is
 * cross-checked against noble's own `schnorr.verify` in the tests.
 */
import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "./hex";

/** Field size p and group order n, as BIP340 lines 98–99 state them. */
export const FIELD_P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
export const CURVE_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

const { Point, utils } = schnorr;
const toInt = (b: Uint8Array) => (b.length ? BigInt(`0x${bytesToHex(b)}`) : 0n);
const hex32 = (n: bigint) => n.toString(16).padStart(64, "0");

/** hash_name(x) = SHA256(SHA256(tag) || SHA256(tag) || x), via noble. */
export function taggedHash(tag: string, ...parts: Uint8Array[]): Uint8Array {
  return utils.taggedHash(tag, ...parts);
}

export type VerifyStage = "lift-x" | "r-range" | "s-range" | "challenge" | "compute-r" | "infinity" | "even-y" | "x-match";

export const VERIFY_STAGES: readonly VerifyStage[] = ["lift-x", "r-range", "s-range", "challenge", "compute-r", "infinity", "even-y", "x-match"];

export interface VerifyStep {
  stage: VerifyStage;
  ok: boolean;
  /** Values the step produced, as hex or short text. */
  values: Record<string, string>;
}

export interface VerifyTrace {
  valid: boolean;
  /** First failing stage, or null when the signature verifies. */
  failedStage: VerifyStage | null;
  /** Steps actually executed, in order; execution stops at the first failure. */
  steps: VerifyStep[];
  messageBytes: number;
  /** The challenge hash input r || P || m, for display (null if not reached). */
  challengeInputHex: string | null;
}

/**
 * Verify(pk, m, sig) from BIP340 lines 181–190, step by step.
 * Throws only for wrong input lengths (the BIP takes 32-byte pk and 64-byte sig).
 */
export function verifyTrace(pkHex: string, msgHex: string, sigHex: string): VerifyTrace {
  const pk = hexToBytes(pkHex);
  const m = hexToBytes(msgHex);
  const sig = hexToBytes(sigHex);
  if (pk.length !== 32) throw new Error("public key must be 32 bytes");
  if (sig.length !== 64) throw new Error("signature must be 64 bytes");

  const steps: VerifyStep[] = [];
  const done = (failedStage: VerifyStage | null, challengeInputHex: string | null = null): VerifyTrace => ({
    valid: failedStage === null,
    failedStage,
    steps,
    messageBytes: m.length,
    challengeInputHex,
  });

  // 1. P = lift_x(int(pk)); fail if that fails.
  let P: InstanceType<typeof Point>;
  const pkInt = toInt(pk);
  try {
    P = utils.lift_x(pkInt);
  } catch {
    steps.push({ stage: "lift-x", ok: false, values: { reason: pkInt >= FIELD_P ? "x ≥ p" : "no curve point has this x" } });
    return done("lift-x");
  }
  const Pa = P.toAffine();
  steps.push({ stage: "lift-x", ok: true, values: { x: hex32(Pa.x), y: hex32(Pa.y), yParity: Pa.y % 2n === 0n ? "even" : "odd" } });

  // 2. r = int(sig[0:32]); fail if r ≥ p.
  const r = toInt(sig.slice(0, 32));
  steps.push({ stage: "r-range", ok: r < FIELD_P, values: { r: hex32(r) } });
  if (r >= FIELD_P) return done("r-range");

  // 3. s = int(sig[32:64]); fail if s ≥ n.
  const s = toInt(sig.slice(32, 64));
  steps.push({ stage: "s-range", ok: s < CURVE_N, values: { s: hex32(s) } });
  if (s >= CURVE_N) return done("s-range");

  // 4. e = int(hash_BIP0340/challenge(bytes(r) || bytes(P) || m)) mod n.
  const rBytes = sig.slice(0, 32);
  const pBytes = utils.pointToBytes(P);
  const digest = taggedHash("BIP0340/challenge", rBytes, pBytes, m);
  const e = toInt(digest) % CURVE_N;
  const challengeInputHex = bytesToHex(rBytes) + bytesToHex(pBytes) + bytesToHex(m);
  steps.push({ stage: "challenge", ok: true, values: { hash: bytesToHex(digest), e: hex32(e) } });

  // 5. R = s⋅G − e⋅P. noble's multiply rejects 0, so use multiplyUnsafe, which allows it.
  const R = Point.BASE.multiplyUnsafe(s).add(P.multiplyUnsafe(e).negate());
  // 6. Fail if is_infinite(R).
  if (R.is0()) {
    steps.push({ stage: "compute-r", ok: true, values: { R: "point at infinity" } });
    steps.push({ stage: "infinity", ok: false, values: {} });
    return done("infinity", challengeInputHex);
  }
  const Ra = R.toAffine();
  steps.push({ stage: "compute-r", ok: true, values: { x: hex32(Ra.x), y: hex32(Ra.y) } });
  steps.push({ stage: "infinity", ok: true, values: {} });

  // 7. Fail if not has_even_y(R).
  const even = Ra.y % 2n === 0n;
  steps.push({ stage: "even-y", ok: even, values: { yParity: even ? "even" : "odd" } });
  if (!even) return done("even-y", challengeInputHex);

  // 8. Fail if x(R) ≠ r.
  const match = Ra.x === r;
  steps.push({ stage: "x-match", ok: match, values: { xR: hex32(Ra.x), r: hex32(r) } });
  return done(match ? null : "x-match", challengeInputHex);
}

/** noble's own verdict, used as an independent cross-check. */
export function nobleVerify(pkHex: string, msgHex: string, sigHex: string): boolean {
  return schnorr.verify(hexToBytes(sigHex), hexToBytes(msgHex), hexToBytes(pkHex));
}

export interface Bip340Vector {
  /** Line in test-vectors.csv (header is line 1). */
  line: number;
  index: number;
  secretKeyHex: string;
  publicKeyHex: string;
  auxRandHex: string;
  messageHex: string;
  signatureHex: string;
  result: boolean;
  comment: string;
}

/** Parse the pinned BIP340 CSV. Hex is lower-cased; the comment column may contain commas. */
export function parseBip340Csv(text: string): Bip340Vector[] {
  const rows = text.split(/\r?\n/);
  if (rows[0] !== "index,secret key,public key,aux_rand,message,signature,verification result,comment") {
    throw new Error("unexpected BIP340 CSV header");
  }
  const out: Bip340Vector[] = [];
  rows.forEach((row, i) => {
    if (i === 0 || row.trim() === "") return;
    const cells = row.split(",");
    const [index, sk, pk, aux, msg, sig, result] = cells;
    if (result !== "TRUE" && result !== "FALSE") throw new Error(`bad result on CSV line ${i + 1}`);
    out.push({
      line: i + 1,
      index: Number(index),
      secretKeyHex: sk.toLowerCase(),
      publicKeyHex: pk.toLowerCase(),
      auxRandHex: aux.toLowerCase(),
      messageHex: msg.toLowerCase(),
      signatureHex: sig.toLowerCase(),
      result: result === "TRUE",
      comment: cells.slice(7).join(","),
    });
  });
  return out;
}

/** Public key from a secret key (for checking the vectors' key columns), via noble. */
export function publicKeyOf(secretKeyHex: string): string {
  return bytesToHex(schnorr.getPublicKey(hexToBytes(secretKeyHex)));
}
