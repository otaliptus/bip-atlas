import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CURVE_N,
  FIELD_P,
  nobleVerify,
  parseBip340Csv,
  publicKeyOf,
  taggedHash,
  verifyTrace,
} from "../src/schnorr";
import { signForVector } from "./sign-for-vectors";
import { bytesToHex } from "../src/hex";
import { sha256 } from "@noble/hashes/sha2.js";

const root = new URL("../../../", import.meta.url);
const raw = (path: string) => readFileSync(new URL(`sources/research-2026-10-01/raw/${path}`, root), "utf8");
const vectors = parseBip340Csv(raw("bip-0340/test-vectors.csv"));
const bip = raw("bip-0340.mediawiki").split("\n");

/** Where each published failure stops, read from the CSV comment column. */
const EXPECTED_FAILURE: Record<number, string> = {
  5: "lift-x", // public key not on the curve
  6: "even-y", // has_even_y(R) is false
  7: "even-y", // negated message: the recomputed R happens to have odd y
  8: "x-match", // negated s value
  9: "infinity", // sG - eP is infinite
  10: "infinity",
  11: "x-match", // sig[0:32] is not an X coordinate on the curve
  12: "r-range", // sig[0:32] is equal to field size
  13: "s-range", // sig[32:64] is equal to curve order
  14: "lift-x", // public key exceeds the field size
};

describe("BIP340 CSV vectors", () => {
  it("reads all 19 rows, 9 valid and 10 invalid", () => {
    expect(vectors.map((v) => v.index)).toEqual([...Array(19).keys()]);
    expect(vectors.filter((v) => v.result)).toHaveLength(9);
    expect(vectors.filter((v) => !v.result)).toHaveLength(10);
  });

  for (const v of vectors) {
    it(`vector ${v.index} (CSV line ${v.line}) ${v.result ? "verifies" : "fails"}${v.comment ? `: ${v.comment}` : ""}`, () => {
      const trace = verifyTrace(v.publicKeyHex, v.messageHex, v.signatureHex);
      expect(trace.valid).toBe(v.result);
      // Independent cross-check against noble's own verifier.
      expect(nobleVerify(v.publicKeyHex, v.messageHex, v.signatureHex)).toBe(v.result);
      expect(trace.failedStage).toBe(v.result ? null : EXPECTED_FAILURE[v.index]);
      // Execution stops at the first failure: only the last step can be a failure.
      expect(trace.steps.slice(0, -1).every((s) => s.ok)).toBe(true);
      expect(trace.steps.at(-1)!.ok).toBe(v.result);
    });
  }

  for (const v of vectors.filter((x) => x.secretKeyHex)) {
    it(`vector ${v.index}: secret key gives the listed public key and signature`, () => {
      expect(publicKeyOf(v.secretKeyHex)).toBe(v.publicKeyHex);
      expect(signForVector(v.secretKeyHex, v.messageHex, v.auxRandHex)).toBe(v.signatureHex);
    });
  }
});

describe("public-key lift and range checks", () => {
  it("states p and n exactly as BIP340 does", () => {
    expect(bip[97]).toContain(`0x${FIELD_P.toString(16).toUpperCase()}`);
    expect(bip[98]).toContain(`0x${CURVE_N.toString(16).toUpperCase()}`);
  });

  it("rejects x = p and x > p before looking for a point", () => {
    const sig = vectors[1].signatureHex;
    for (const x of [FIELD_P, FIELD_P + 1n, (1n << 256n) - 1n]) {
      const t = verifyTrace(x.toString(16).padStart(64, "0"), "", sig);
      expect(t.failedStage).toBe("lift-x");
      expect(t.steps[0].values.reason).toBe("x ≥ p");
    }
  });

  it("lifts every valid key to the point with even y", () => {
    for (const v of vectors.filter((x) => x.result)) {
      const lift = verifyTrace(v.publicKeyHex, v.messageHex, v.signatureHex).steps[0];
      expect(lift.values.x).toBe(v.publicKeyHex);
      expect(BigInt(`0x${lift.values.y}`) % 2n).toBe(0n);
    }
  });

  it("explains vector 5 as a missing point, not a range failure", () => {
    const t = verifyTrace(vectors[5].publicKeyHex, vectors[5].messageHex, vectors[5].signatureHex);
    expect(t.steps[0].values.reason).toBe("no curve point has this x");
  });

  it("accepts r = p − 1 as in range and s = n − 1 as in range", () => {
    const pk = vectors[1].publicKeyHex;
    const r = (FIELD_P - 1n).toString(16).padStart(64, "0");
    const s = (CURVE_N - 1n).toString(16).padStart(64, "0");
    const t = verifyTrace(pk, vectors[1].messageHex, r + s);
    expect(t.steps.find((x) => x.stage === "r-range")!.ok).toBe(true);
    expect(t.steps.find((x) => x.stage === "s-range")!.ok).toBe(true);
    expect(t.valid).toBe(false);
  });

  it("rejects wrong input lengths outright", () => {
    expect(() => verifyTrace("00", "", vectors[1].signatureHex)).toThrow();
    expect(() => verifyTrace(vectors[1].publicKeyHex, "", "00")).toThrow();
  });
});

describe("arbitrary-length messages", () => {
  const sizes = vectors.filter((v) => v.index >= 15).map((v) => v.messageHex.length / 2);

  it("includes published messages of 0, 1, 17 and 100 bytes", () => {
    expect(sizes).toEqual([0, 1, 17, 100]);
  });

  it("hashes r, P and the whole message into the challenge", () => {
    for (const v of vectors.filter((x) => x.result)) {
      const t = verifyTrace(v.publicKeyHex, v.messageHex, v.signatureHex);
      expect(t.messageBytes).toBe(v.messageHex.length / 2);
      expect(t.challengeInputHex).toBe(v.signatureHex.slice(0, 64) + v.publicKeyHex + v.messageHex);
      expect(t.challengeInputHex!.length / 2).toBe(64 + v.messageHex.length / 2);
    }
  });

  it("does not verify a valid signature against another vector's message", () => {
    const v = vectors[1];
    for (const other of vectors.filter((x) => x.messageHex !== v.messageHex)) {
      const t = verifyTrace(v.publicKeyHex, other.messageHex, v.signatureHex);
      expect(t.valid).toBe(false);
      expect(["even-y", "x-match"]).toContain(t.failedStage);
    }
  });
});

describe("tagged hashes", () => {
  it("prefixes SHA256(tag) twice", () => {
    const tag = new TextEncoder().encode("BIP0340/challenge");
    const data = Uint8Array.of(1, 2, 3);
    const th = sha256(tag);
    const expected = sha256(Uint8Array.from([...th, ...th, ...data]));
    expect(bytesToHex(taggedHash("BIP0340/challenge", data))).toBe(bytesToHex(expected));
  });

  it("changes with the tag", () => {
    const d = new Uint8Array(32);
    expect(bytesToHex(taggedHash("BIP0340/challenge", d))).not.toBe(bytesToHex(taggedHash("BIP0340/aux", d)));
  });
});

describe("schnorr chapter fixtures and prose numbers", () => {
  const fixtures = JSON.parse(readFileSync(new URL("fixtures/schnorr.json", root), "utf8")).fixtures;
  const chapter = JSON.parse(readFileSync(new URL("content/chapters/schnorr.json", root), "utf8"));
  const text = JSON.stringify(chapter);
  const hero = chapter.sections.flatMap((s: any) => s.blocks).find((b: any) => b.recipe === "schnorr-verification.v1");
  const csvLines = raw("bip-0340/test-vectors.csv").split("\n");

  it("copies every fixture from its CSV line", () => {
    for (const f of fixtures) {
      const v = vectors.find((x) => x.line === f.source.line)!;
      expect([v.index, v.publicKeyHex, v.messageHex, v.signatureHex, v.result, v.comment]).toEqual([
        f.vectorIndex, f.publicKeyHex, f.messageHex, f.signatureHex, f.expected, f.comment,
      ]);
      expect(csvLines[f.source.line - 1]).toContain(f.source.quote);
    }
  });

  it("hero holds twelve vectors, three valid and nine invalid", () => {
    const picked = hero.fixtures.map((id: string) => fixtures.find((f: any) => f.id === id));
    expect(picked).toHaveLength(12);
    expect(picked.filter((f: any) => f.expected)).toHaveLength(3);
    expect(text).toContain("Twelve published vectors, three valid and nine invalid");
  });

  it("every message swap on a valid hero vector fails at even-y or x-match", () => {
    const picked = hero.fixtures.map((id: string) => fixtures.find((f: any) => f.id === id));
    const messages = [...new Set(picked.map((f: any) => f.messageHex))] as string[];
    for (const f of picked.filter((x: any) => x.expected)) {
      for (const m of messages.filter((x) => x !== f.messageHex)) {
        expect(["even-y", "x-match"]).toContain(verifyTrace(f.publicKeyHex, m, f.signatureHex).failedStage);
      }
    }
  });

  it("states the numbers the vectors and BIP support", () => {
    expect(text).toContain("messages of 0, 1, 17 and 100 bytes alongside the usual 32");
    expect(text).toContain("checked against all 19 vectors in the CSV");
    expect(text).toContain("128 fixed bytes");
    expect(bip[42]).toContain("up to 72 bytes");
    expect(text).toContain("can reach 72 bytes");
    expect(bip[298]).toContain("2023-04");
    expect(text).toContain("April 2023");
    expect(verifyTrace(vectors[7].publicKeyHex, vectors[7].messageHex, vectors[7].signatureHex).failedStage).toBe("even-y");
    expect(text).toContain("Vector 7 is labelled “negated message”");
  });
});
