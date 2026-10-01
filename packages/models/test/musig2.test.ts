import { readFileSync } from "node:fs";
import { schnorr } from "@noble/curves/secp256k1.js";
import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes } from "../src/hex";
import {
  deterministicSign,
  individualPk,
  InvalidContributionError,
  keyAgg,
  keyAggAndTweak,
  keyAggCoeff,
  keySort,
  MusigValueError,
  nonceAgg,
  nonceGenInternal,
  partialSigAgg,
  partialSigVerify,
  partialSigVerifyInternal,
  sessionValues,
  sign,
  xonlyPk,
} from "../src/musig2";

const root = new URL("../../../", import.meta.url);
const vec = (name: string) => JSON.parse(readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/bip-0327/vectors/${name}.json`, root), "utf8"));
const h = (s: string) => hexToBytes(s.toLowerCase());
const H = (b: Uint8Array) => bytesToHex(b).toUpperCase();
const all = (l: string[]) => l.map(h);

/** The reference's get_error_details + assert_raises. */
function expectError(fn: () => unknown, error: { type: string; signer?: number | null; contrib?: string; message?: string }) {
  let caught: unknown = null;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught, JSON.stringify(error)).not.toBeNull();
  if (error.type === "invalid_contribution") {
    expect(caught).toBeInstanceOf(InvalidContributionError);
    const e = caught as InvalidContributionError;
    expect(e.signer).toBe(error.signer ?? null);
    if (error.contrib) expect(e.contrib).toBe(error.contrib);
  } else {
    expect(caught).toBeInstanceOf(MusigValueError);
    expect((caught as Error).message).toBe(error.message);
  }
}

describe("BIP 327 JSON vectors", () => {
  it("key_sort", () => {
    const d = vec("key_sort_vectors");
    expect(keySort(all(d.pubkeys)).map(H)).toEqual(d.sorted_pubkeys);
  });

  it("key_agg: valid and error cases", () => {
    const d = vec("key_agg_vectors");
    const X = all(d.pubkeys), T = all(d.tweaks);
    for (const c of d.valid_test_cases) expect(H(xonlyPk(keyAgg(c.key_indices.map((i: number) => X[i]))))).toBe(c.expected);
    for (const c of d.error_test_cases)
      expectError(() => keyAggAndTweak(c.key_indices.map((i: number) => X[i]), c.tweak_indices.map((i: number) => T[i]), c.is_xonly), c.error);
  });

  it("nonce_gen", () => {
    for (const c of vec("nonce_gen_vectors").test_cases) {
      const m = (k: string) => (c[k] === null ? null : h(c[k]));
      const r = nonceGenInternal(h(c.rand_), m("sk"), h(c.pk), m("aggpk"), m("msg"), m("extra_in"));
      expect([H(r.secnonce), H(r.pubnonce)]).toEqual([c.expected_secnonce, c.expected_pubnonce]);
    }
  });

  it("nonce_agg: valid and error cases", () => {
    const d = vec("nonce_agg_vectors");
    const P = all(d.pnonces);
    for (const c of d.valid_test_cases) expect(H(nonceAgg(c.pnonce_indices.map((i: number) => P[i])))).toBe(c.expected);
    for (const c of d.error_test_cases) expectError(() => nonceAgg(c.pnonce_indices.map((i: number) => P[i])), c.error);
  });

  it("sign_verify: valid, sign errors, verify failures and verify errors", () => {
    const d = vec("sign_verify_vectors");
    const sk = h(d.sk), X = all(d.pubkeys), sec = all(d.secnonces), P = all(d.pnonces), A = all(d.aggnonces), M = all(d.msgs);
    expect(H(individualPk(sk))).toBe(d.pubkeys[0]);
    expect(H(nonceAgg([P[0], P[1], P[2]]))).toBe(d.aggnonces[0]);
    expect(H(nonceAgg([P[0], P[3]]))).toBe(d.aggnonces[1]); // the infinity point, encoded as zeros
    for (const c of d.valid_test_cases) {
      const pubkeys = c.key_indices.map((i: number) => X[i]);
      const pubnonces = c.nonce_indices.map((i: number) => P[i]);
      expect(H(nonceAgg(pubnonces))).toBe(d.aggnonces[c.aggnonce_index]);
      const s = { aggnonce: A[c.aggnonce_index], pubkeys, tweaks: [], isXonly: [], msg: M[c.msg_index] };
      expect(H(sign(Uint8Array.from(sec[0]), sk, s))).toBe(c.expected);
      expect(partialSigVerify(h(c.expected), pubnonces, pubkeys, [], [], M[c.msg_index], c.signer_index)).toBe(true);
    }
    for (const c of d.sign_error_test_cases) {
      const s = { aggnonce: A[c.aggnonce_index], pubkeys: c.key_indices.map((i: number) => X[i]), tweaks: [], isXonly: [], msg: M[c.msg_index] };
      expectError(() => sign(Uint8Array.from(sec[c.secnonce_index]), sk, s), c.error);
    }
    for (const c of d.verify_fail_test_cases)
      expect(partialSigVerify(h(c.sig), c.nonce_indices.map((i: number) => P[i]), c.key_indices.map((i: number) => X[i]), [], [], M[c.msg_index], c.signer_index)).toBe(false);
    for (const c of d.verify_error_test_cases)
      expectError(() => partialSigVerify(h(c.sig), c.nonce_indices.map((i: number) => P[i]), c.key_indices.map((i: number) => X[i]), [], [], M[c.msg_index], c.signer_index), c.error);
  });

  it("tweak: valid and error cases", () => {
    const d = vec("tweak_vectors");
    const sk = h(d.sk), X = all(d.pubkeys), P = all(d.pnonces), T = all(d.tweaks), msg = h(d.msg), aggnonce = h(d.aggnonce);
    for (const c of d.valid_test_cases) {
      const pubkeys = c.key_indices.map((i: number) => X[i]);
      const tweaks = c.tweak_indices.map((i: number) => T[i]);
      const s = { aggnonce, pubkeys, tweaks, isXonly: c.is_xonly, msg };
      expect(H(sign(h(d.secnonce), sk, s))).toBe(c.expected);
      expect(partialSigVerify(h(c.expected), c.nonce_indices.map((i: number) => P[i]), pubkeys, tweaks, c.is_xonly, msg, c.signer_index)).toBe(true);
    }
    for (const c of d.error_test_cases) {
      const s = { aggnonce, pubkeys: c.key_indices.map((i: number) => X[i]), tweaks: c.tweak_indices.map((i: number) => T[i]), isXonly: c.is_xonly, msg };
      expectError(() => sign(h(d.secnonce), sk, s), c.error);
    }
  });

  it("det_sign: valid and error cases", () => {
    const d = vec("det_sign_vectors");
    const sk = h(d.sk), X = all(d.pubkeys), M = all(d.msgs);
    for (const c of d.valid_test_cases) {
      const pubkeys = c.key_indices.map((i: number) => X[i]);
      const r = deterministicSign(sk, h(c.aggothernonce), pubkeys, all(c.tweaks), c.is_xonly, M[c.msg_index], c.rand === null ? null : h(c.rand));
      expect([H(r.pubnonce), H(r.psig)]).toEqual(c.expected);
      const aggnonce = nonceAgg([h(c.aggothernonce), r.pubnonce]);
      expect(partialSigVerifyInternal(r.psig, r.pubnonce, pubkeys[c.signer_index], { aggnonce, pubkeys, tweaks: all(c.tweaks), isXonly: c.is_xonly, msg: M[c.msg_index] })).toBe(true);
    }
    for (const c of d.error_test_cases)
      expectError(() => deterministicSign(sk, h(c.aggothernonce), c.key_indices.map((i: number) => X[i]), all(c.tweaks), c.is_xonly, M[c.msg_index], c.rand === null ? null : h(c.rand)), c.error);
  });

  it("sig_agg: aggregates to a BIP 340 signature that noble verifies", () => {
    const d = vec("sig_agg_vectors");
    const X = all(d.pubkeys), P = all(d.pnonces), T = all(d.tweaks), S = all(d.psigs), msg = h(d.msg);
    for (const c of d.valid_test_cases) {
      const aggnonce = h(c.aggnonce);
      expect(H(nonceAgg(c.nonce_indices.map((i: number) => P[i])))).toBe(c.aggnonce);
      const pubkeys = c.key_indices.map((i: number) => X[i]);
      const tweaks = c.tweak_indices.map((i: number) => T[i]);
      const s = { aggnonce, pubkeys, tweaks, isXonly: c.is_xonly, msg };
      const sig = partialSigAgg(c.psig_indices.map((i: number) => S[i]), s);
      expect(H(sig)).toBe(c.expected);
      expect(schnorr.verify(sig, msg, xonlyPk(keyAggAndTweak(pubkeys, tweaks, c.is_xonly)))).toBe(true);
    }
    for (const c of d.error_test_cases) {
      const s = { aggnonce: nonceAgg(c.nonce_indices.map((i: number) => P[i])), pubkeys: c.key_indices.map((i: number) => X[i]), tweaks: c.tweak_indices.map((i: number) => T[i]), isXonly: c.is_xonly, msg };
      expectError(() => partialSigAgg(c.psig_indices.map((i: number) => S[i]), s), c.error);
    }
  });
});

describe("key aggregation coefficients", () => {
  const d = vec("key_agg_vectors");
  const X = all(d.pubkeys);

  it("gives the second distinct key coefficient 1 and every other key a hashed one", () => {
    const keys = [X[0], X[1], X[2]];
    expect(keyAggCoeff(keys, X[1])).toBe(1n);
    expect(keyAggCoeff(keys, X[0])).not.toBe(1n);
    expect(keyAggCoeff(keys, X[2])).not.toBe(1n);
  });

  it("is not the sum of the raw keys, and depends on order", () => {
    const keys = [X[0], X[1], X[2]];
    const ordered = H(xonlyPk(keyAgg(keys)));
    expect(ordered).toBe(d.valid_test_cases[0].expected);
    expect(H(xonlyPk(keyAgg([X[2], X[1], X[0]])))).toBe(d.valid_test_cases[1].expected);
    expect(ordered).not.toBe(d.valid_test_cases[1].expected);
  });
});

describe("nonce reuse", () => {
  it("sign() wipes the secret nonce, so a second use fails", () => {
    const d = vec("sign_verify_vectors");
    const sk = h(d.sk), X = all(d.pubkeys), A = all(d.aggnonces), M = all(d.msgs);
    const secnonce = h(d.secnonces[0]);
    const s = { aggnonce: A[0], pubkeys: [X[0], X[1], X[2]], tweaks: [], isXonly: [], msg: M[0] };
    sign(secnonce, sk, s);
    expect(() => sign(secnonce, sk, s)).toThrow("first secnonce value is out of range.");
  });
});
