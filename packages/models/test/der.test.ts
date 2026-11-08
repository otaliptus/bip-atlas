import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { describe, expect, it } from "vitest";
import {
  CHANGES,
  CURVE_ORDER,
  DER_CHECKS,
  HALF_ORDER,
  applyChange,
  changedBytes,
  checkSignatureEncoding,
  encodeSignature,
  isLowS,
  numbersOf,
  readFields,
  serializeTransaction,
  signatureIn,
  withSignature,
} from "../src/der";
import { hexToBytes } from "../src/hex";
import { ecdsaVerify, legacySighash } from "../src/p2sh";
import { bip143Digest, measureTransaction, parseTransaction } from "../src/tx";

const root = new URL("../../../", import.meta.url);
const snapshot = new URL("sources/research-2026-11-08-phase4/", root);
const lock = JSON.parse(readFileSync(new URL("sources.lock.json", snapshot), "utf8"));
const pinned = (path: string) => {
  const bytes = readFileSync(new URL(`raw/${path}`, snapshot));
  expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(lock.files.find((f: { path: string }) => f.path === path).sha256);
  return bytes.toString("utf8").split("\n");
};
const b66 = pinned("bip-0066.mediawiki");
const b146 = pinned("bip-0146.mediawiki");
const b143 = pinned("bip-0143.mediawiki");
const after = (line: number, label: string) => b143[line - 1].split(label)[1].trim().split(/[\s,]/)[0];

/** BIP 143's native P2WPKH example: input 0 spends a P2PK output (signature in the scriptSig), input 1 a P2WPKH output (in the witness). */
const txHex = after(190, "The serialized signed transaction is:");
const p2pkScript = after(152, "scriptPubKey :");
const p2pkKey = p2pkScript.slice(2, -2);
const wpkhKey = after(158, "public key   :");
const sig1 = after(188, "signature:");
const sig0 = signatureIn(txHex, 0, "scriptSig");
const tx = parseTransaction(txHex);
const digest0 = legacySighash(tx, 0, p2pkScript, 1);
const digest1 = bip143Digest(tx, 1, after(180, "scriptCode:"), 600000000n).sighashHex;
const der = (sig: string) => sig.slice(0, -2);

describe("BIP 66's check, as published", () => {
  it("lists fourteen checks at the lines of IsValidSignatureEncoding", () => {
    expect(DER_CHECKS).toHaveLength(14);
    for (const c of DER_CHECKS) expect(b66[c.line - 1], c.id).toMatch(/^\s+if \(.*\) return false;$/);
    expect(b66[54].trim()).toBe("if (sig.size() < 9) return false;");
    expect(b66[100].trim()).toBe("if (lenS > 1 && (sig[lenR + 6] == 0x00) && !(sig[lenR + 7] & 0x80)) return false;");
  });
  it("reads the example's two signatures: input 0's R needs a zero pad, input 1's does not", () => {
    expect(sig0.slice(0, 12)).toBe("30450221008b");
    expect(readFields(sig0)).toMatchObject({ totalLength: 0x45, hashType: 1 });
    expect(readFields(sig0).rHex).toHaveLength(66);
    expect(readFields(sig1).rHex).toHaveLength(64);
    expect(hexToBytes(sig0)).toHaveLength(72);
    expect(hexToBytes(sig1)).toHaveLength(71);
    expect(b143[187]).toContain(sig1);
  });
  it("both published signatures are strict DER, low S, and verify", () => {
    for (const [sig, digest, key] of [[sig0, digest0, p2pkKey], [sig1, digest1, wpkhKey]]) {
      expect(checkSignatureEncoding(sig)).toEqual({ valid: true, ran: 14, failed: null });
      expect(isLowS(numbersOf(sig).s)).toBe(true);
      expect(ecdsaVerify(der(sig), digest, key)).toBe(true);
    }
    expect(digest1).toBe(after(187, "sigHash:"));
  });
  it("re-encodes the published numbers to the published bytes", () => {
    for (const sig of [sig0, sig1]) {
      const { r, s } = numbersOf(sig);
      expect(encodeSignature(r, s, 1)).toBe(sig);
    }
  });
});

describe("changing the bytes of input 0's signature", () => {
  const run = (c: (typeof CHANGES)[number]["id"]) => applyChange(sig0, c)!;
  it("removing R's zero pad makes R negative: fails at line 84", () => {
    const v = run("pad-removed");
    expect(checkSignatureEncoding(v)).toMatchObject({ valid: false, ran: 9, failed: { id: "r-positive", line: 84 } });
    expect(numbersOf(v)).toEqual(numbersOf(sig0));
    expect(changedBytes(sig0, v)[0]).toBe(1);
  });
  it("an extra zero in front of S: same numbers, fails at line 101", () => {
    const v = run("zero-added");
    expect(checkSignatureEncoding(v)).toMatchObject({ valid: false, ran: 14, failed: { id: "s-minimal", line: 101 } });
    expect(numbersOf(v)).toEqual(numbersOf(sig0));
    expect(hexToBytes(v)).toHaveLength(73);
  });
  it("a total length one too large: fails at line 62", () => {
    const v = run("length-byte");
    expect(checkSignatureEncoding(v)).toMatchObject({ valid: false, ran: 4, failed: { id: "total-length", line: 62 } });
    expect(changedBytes(sig0, v)).toEqual([1]);
  });
  it("S replaced by n − S: still strict DER and still a valid signature, but not low S", () => {
    const v = run("s-flipped");
    expect(checkSignatureEncoding(v).valid).toBe(true);
    const { r, s } = numbersOf(v);
    expect(r).toBe(numbersOf(sig0).r);
    expect(s).toBe(CURVE_ORDER - numbersOf(sig0).s);
    expect(isLowS(s)).toBe(false);
    expect(ecdsaVerify(der(v), digest0, p2pkKey)).toBe(true);
    // noble's own low-S option rejects the same signature.
    expect(secp256k1.verify(hexToBytes(der(v)), hexToBytes(digest0), hexToBytes(p2pkKey), { prehash: false, format: "der", lowS: true })).toBe(false);
    // n − S has its top bit set, so it needs a zero pad: 73 bytes, BIP 66's maximum.
    expect(readFields(v).sHex.slice(0, 2)).toBe("00");
    expect(hexToBytes(v)).toHaveLength(73);
  });
  it("input 1 has no R pad to remove", () => {
    expect(applyChange(sig1, "pad-removed")).toBeNull();
    expect(hexToBytes(applyChange(sig1, "s-flipped")!)).toHaveLength(72);
  });
});

describe("BIP 146's bounds", () => {
  it("n and n / 2 as BIP 146 prints them", () => {
    const flat = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    expect(flat(b146[59].split("=")[1])).toBe(`0x${CURVE_ORDER.toString(16)}`);
    expect(flat(b146[60].split("=").at(-1)!)).toBe(`0x${HALF_ORDER.toString(16)}`);
    expect(b146[37]).toContain("0x7FFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF 5D576E73 57A4501D DFE92F46 681B20A0");
  });
  it("exactly one of S and n − S is low", () => {
    for (const sig of [sig0, sig1]) {
      const { s } = numbersOf(sig);
      expect([isLowS(s), isLowS(CURVE_ORDER - s)]).toEqual([true, false]);
    }
    expect(isLowS(HALF_ORDER)).toBe(true);
    expect(isLowS(HALF_ORDER + 1n)).toBe(false);
    expect(isLowS(0n)).toBe(false);
  });
});

describe("what a flip changes", () => {
  const ids = (hex: string) => measureTransaction(parseTransaction(hex));
  const published = ids(txHex);
  it("the transaction rebuilds byte for byte", () => {
    expect(serializeTransaction(tx)).toBe(txHex);
    expect(withSignature(txHex, 0, "scriptSig", sig0)).toBe(txHex);
    expect(withSignature(txHex, 1, "witness", sig1)).toBe(txHex);
  });
  it("flipping input 0's S (scriptSig) changes the txid and the wtxid; both inputs still verify", () => {
    const flippedHex = withSignature(txHex, 0, "scriptSig", applyChange(sig0, "s-flipped")!);
    const flipped = ids(flippedHex);
    expect(flipped.txidHex).not.toBe(published.txidHex);
    expect(flipped.wtxidHex).not.toBe(published.wtxidHex);
    const t = parseTransaction(flippedHex);
    expect(ecdsaVerify(der(t.inputs[0].scriptSigHex.slice(2)), legacySighash(t, 0, p2pkScript, 1), p2pkKey)).toBe(true);
    expect(ecdsaVerify(der(t.witnesses[1][0]), bip143Digest(t, 1, after(180, "scriptCode:"), 600000000n).sighashHex, wpkhKey)).toBe(true);
  });
  it("flipping input 1's S (witness) changes only the wtxid", () => {
    const flippedHex = withSignature(txHex, 1, "witness", applyChange(sig1, "s-flipped")!);
    const flipped = ids(flippedHex);
    expect(flipped.txidHex).toBe(published.txidHex);
    expect(flipped.wtxidHex).not.toBe(published.wtxidHex);
    // Neither digest covers the signatures, so both inputs still verify.
    const t = parseTransaction(flippedHex);
    expect(ecdsaVerify(der(t.witnesses[1][0]), bip143Digest(t, 1, after(180, "scriptCode:"), 600000000n).sighashHex, wpkhKey)).toBe(true);
    expect(legacySighash(t, 0, p2pkScript, 1)).toBe(digest0);
  });
  it("refuses an empty signature", () => {
    expect(() => checkSignatureEncoding("")).toThrow(RangeError);
  });
});
