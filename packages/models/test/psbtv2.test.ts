import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { base64 } from "@scure/base";
import { PsbtError } from "../src/psbt";
import { LOCKTIME_THRESHOLD } from "../src/timelock";
import {
  SIGHASH,
  constructorMay,
  determineLockTime,
  parsePsbtV2,
  readPsbtAnyVersion,
  sighashName,
  signerUpdate,
  uniqueId,
  unsignedTransaction,
} from "../src/psbtv2";
import { parseTransaction } from "../src/tx";
import { bytesToHex } from "../src/hex";

const root = new URL("../../../", import.meta.url);
const snapshot = new URL("sources/research-2026-11-08-phase4/", root);
const lock = JSON.parse(readFileSync(new URL("sources.lock.json", snapshot), "utf8"));
const pinned = (path: string) => {
  const bytes = readFileSync(new URL(`raw/${path}`, snapshot));
  expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(lock.files.find((f: { path: string }) => f.path === path).sha256);
  return bytes.toString("utf8").split("\n");
};

/** BIP 370's test vectors: each hex line with its case line (if any), its Base64 twin and the heading above it. */
const text = pinned("bip-0370.mediawiki");
interface Vector { line: number; hex: string; b64: string; caseText: string | null; group: "invalid" | "valid" | "locktime"; lockTime?: number | null }
const vectors: Vector[] = [];
{
  let group: Vector["group"] | null = null;
  let expected: number | null | undefined;
  let caseText: string | null = null;
  for (const [i, l] of text.entries()) {
    if (i < 300) continue;
    if (/^The following are invalid PSBTs:/.test(l)) group = "invalid";
    else if (/^The following are valid PSBTs/.test(l)) group = "valid";
    const lt = /^The timelock for the following PSBTs (?:should be computed to be (\d+)|cannot be computed):/.exec(l);
    if (lt) {
      group = "locktime";
      expected = lt[1] === undefined ? null : Number(lt[1]);
    }
    const c = /^\* Case: (.*)$/.exec(l);
    if (c) caseText = c[1];
    const h = /^\*\* Bytes in H[Ee]x: <pre>([0-9a-f]+)<\/pre>$/.exec(l);
    if (h && group) {
      const b = /^\*\* Base64 String: <pre>([A-Za-z0-9+/=]+)<\/pre>$/.exec(text[i + 1]);
      vectors.push({ line: i + 1, hex: h[1], b64: b![1], caseText, group, ...(group === "locktime" ? { lockTime: expected } : {}) });
      caseText = null;
    }
  }
}
const byGroup = (g: Vector["group"]) => vectors.filter((v) => v.group === g);
const at = (line: number) => vectors.find((v) => v.line === line)!;

describe("BIP 370 test vectors", () => {
  it("finds 24 invalid, 14 valid and 10 lock-time vectors; one has no case line", () => {
    expect(byGroup("invalid")).toHaveLength(24);
    expect(byGroup("valid")).toHaveLength(14);
    expect(byGroup("locktime")).toHaveLength(10);
    expect(vectors.filter((v) => v.caseText === null).map((v) => v.line)).toEqual([500]);
    expect(byGroup("invalid").map((v) => v.line)).toEqual([307, 311, 315, 319, 323, 327, 331, 335, 339, 343, 347, 351, 355, 359, 363, 367, 371, 375, 379, 383, 387, 391, 395, 399]);
  });
  it("prints each vector twice, as hex and Base64, with the same bytes", () => {
    for (const v of vectors) expect(bytesToHex(base64.decode(v.b64)), `L${v.line}`).toBe(v.hex);
  });

  for (const v of byGroup("invalid")) {
    it(`L${v.line} is invalid: ${v.caseText}`, () => {
      const r = readPsbtAnyVersion(v.hex);
      expect(r.valid).toBe(false);
      if (r.valid) return;
      // The case names the field the PSBT gets wrong, except the first: a version 0 PSBT
      // relabelled as version 2 still carries its unsigned transaction, which version 2 excludes.
      const named = v.caseText!.match(/PSBT_[A-Z_]+/)![0];
      expect(r.violation.field).toBe(named === "PSBT_GLOBAL_VERSION" ? "PSBT_GLOBAL_UNSIGNED_TX" : named);
      expect(r.version).toBe(/^PSBTv0/.test(v.caseText!) && named !== "PSBT_GLOBAL_VERSION" ? 0 : 2);
    });
  }

  it("names the rule each invalid vector breaks", () => {
    const rules = byGroup("invalid").map((v) => {
      const r = readPsbtAnyVersion(v.hex);
      return r.valid ? "valid" : r.violation.rule;
    });
    expect(rules).toEqual([
      "v2-excludes", ...Array(12).fill("v0-excludes"),
      "v2-excludes", ...Array(7).fill("v2-requires"), "time-range", "height-range", "height-range",
    ]);
  });

  for (const v of [...byGroup("valid"), ...byGroup("locktime")]) {
    it(`L${v.line} is a valid version 2 PSBT`, () => {
      const r = readPsbtAnyVersion(v.hex);
      expect(r).toMatchObject({ valid: true, version: 2 });
    });
  }

  it("reads the modifiable flags each valid case names", () => {
    for (const v of byGroup("valid")) {
      const bits = [...v.caseText!.matchAll(/\(bit (\d)\)/g)].map((m) => 1 << Number(m[1]));
      const expected = /all defined PSBT_GLOBAL_TX_MODIFIABLE flags/.test(v.caseText!) ? 0x07 : /all possible PSBT_GLOBAL_TX_MODIFIABLE flags/.test(v.caseText!) ? 0xff : bits.length ? bits.reduce((a, b) => a | b) : null;
      const p = parsePsbtV2(v.hex);
      if (/with all PSBTv2 fields/.test(v.caseText!)) expect(p.modifiable).toBe(0x07);
      else expect(p.modifiable, v.caseText!).toBe(expected);
    }
  });

  it("the lock-time vectors give the published lock time, or none", () => {
    for (const v of byGroup("locktime")) expect(determineLockTime(parsePsbtV2(v.hex)).value, `L${v.line}`).toBe(v.lockTime);
    expect(byGroup("locktime").map((v) => v.lockTime)).toEqual([0, 0, 10000, 10000, 10000, 10000, 1657048460, 1657048460, 1657048460, null]);
  });

  it("the unlabelled vector at line 500: only input 2 requires a lock time, a time", () => {
    const p = parsePsbtV2(at(500).hex);
    expect(p.inputs.map((i) => [i.requiredHeight, i.requiredTime])).toEqual([[null, null], [null, 1657048460]]);
    expect(determineLockTime(p)).toMatchObject({ requiring: [1], kind: "time", value: 1657048460 });
  });
});

describe("lock-time determination", () => {
  const lt = (line: number) => determineLockTime(parsePsbtV2(at(line).hex));
  it("with no requirements: the fallback, or 0 without one", () => {
    expect(lt(465)).toMatchObject({ requiring: [], kind: "fallback", value: 0 });
    expect(parsePsbtV2(at(465).hex).fallbackLocktime).toBeNull();
    expect(parsePsbtV2(at(469).hex).fallbackLocktime).toBe(0);
    expect(determineLockTime({ inputs: [], fallbackLocktime: 123 }).value).toBe(123);
  });
  it("prefers height when every requiring input allows both, and takes the maximum", () => {
    expect(lt(487)).toMatchObject({ accepted: { height: true, time: true }, kind: "height", value: 10000 });
    expect(lt(479)).toMatchObject({ kind: "height", value: 10000 });
  });
  it("uses time when one requiring input allows only time", () => {
    expect(lt(493)).toMatchObject({ accepted: { height: false, time: true }, kind: "time", value: 1657048460 });
  });
  it("cannot choose when one input needs a height and another a time", () => {
    expect(lt(506)).toMatchObject({ accepted: { height: false, time: false }, kind: null, value: null });
    expect(() => unsignedTransaction(parsePsbtV2(at(506).hex))).toThrow(PsbtError);
  });
  it("keeps heights below 500000000 and times at or above it", () => {
    expect(LOCKTIME_THRESHOLD).toBe(500000000);
    const time = parsePsbtV2(at(493).hex).inputs.map((i) => i.requiredTime).filter((t) => t !== null) as number[];
    expect(time.every((t) => t >= LOCKTIME_THRESHOLD)).toBe(true);
  });
});

describe("the transaction a version 2 PSBT describes", () => {
  it("builds a version 0 unsigned transaction from the fields (line 413)", () => {
    const p = parsePsbtV2(at(413).hex);
    const { hex, parts } = unsignedTransaction(p);
    const tx = parseTransaction(hex, { allowWitness: false });
    expect(tx.versionHex).toBe("02000000");
    expect(tx.inputs).toHaveLength(1);
    expect(tx.inputs[0].prevoutHex).toBe(p.inputs[0].txidHex + "00000000");
    expect(tx.inputs[0].sequenceHex).toBe("feffffff");
    expect(tx.outputs.map((o) => o.valueSats)).toEqual([800000000n, 199998859n]);
    expect(tx.locktimeHex).toBe("00000000");
    expect(parts.map((x) => x.hex).join("")).toBe(hex);
  });
  it("omitted sequences become 0xffffffff; the all-fields vector takes the height lock 10000", () => {
    expect(parseTransaction(unsignedTransaction(parsePsbtV2(at(409).hex)).hex, { allowWitness: false }).inputs[0].sequenceHex).toBe("ffffffff");
    const all = unsignedTransaction(parsePsbtV2(at(457).hex));
    expect(all.parts.at(-1)).toMatchObject({ hex: "10270000", field: "maximum required height" });
  });
  it("the unique ID ignores sequences and modifiable flags", () => {
    const ids = [409, 413, 421, 437, 453].map((l) => uniqueId(parsePsbtV2(at(l).hex)));
    expect(new Set(ids).size).toBe(1);
    // A different lock time is a different transaction.
    expect(uniqueId(parsePsbtV2(at(457).hex))).not.toBe(ids[0]);
    expect(ids[0]).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("modifiable flags", () => {
  it("a Constructor may add inputs with bit 0, outputs with bit 1; an absent field allows neither", () => {
    expect(constructorMay(0x03)).toEqual({ addInputs: true, addOutputs: true, checkSighashSingle: false });
    expect(constructorMay(0x04)).toEqual({ addInputs: false, addOutputs: false, checkSighashSingle: true });
    expect(constructorMay(null)).toEqual({ addInputs: false, addOutputs: false, checkSighashSingle: false });
  });
  it("a Signer clears or sets flags by the sighash type it used", () => {
    const types = [SIGHASH.ALL, SIGHASH.NONE, SIGHASH.SINGLE, SIGHASH.ALL | SIGHASH.ANYONECANPAY, SIGHASH.NONE | SIGHASH.ANYONECANPAY, SIGHASH.SINGLE | SIGHASH.ANYONECANPAY];
    expect(types.map((t) => [sighashName(t), signerUpdate(0x03, t)])).toEqual([
      ["ALL", 0x00],
      ["NONE", 0x02],
      ["SINGLE", 0x04],
      ["ALL|ANYONECANPAY", 0x01],
      ["NONE|ANYONECANPAY", 0x03],
      ["SINGLE|ANYONECANPAY", 0x05],
    ]);
    // Undefined bits stay as they were.
    expect(signerUpdate(0xff, SIGHASH.ALL)).toBe(0xfc);
    // Taproot's SIGHASH_DEFAULT uses neither ANYONECANPAY nor NONE.
    expect(signerUpdate(0x03, SIGHASH.DEFAULT)).toBe(0x00);
    expect(() => signerUpdate(0x03, 0x04)).toThrow(RangeError);
  });
});

describe("scope", () => {
  it("rejects other PSBT versions and malformed version 2 fields", () => {
    const v1 = at(405).hex.replace("01fb0402000000", "01fb0401000000");
    expect(() => readPsbtAnyVersion(v1)).toThrow(/versions 0 and 2/);
    // PSBT_IN_OUTPUT_INDEX shortened to 3 bytes (and the map's length byte with it).
    const bad = at(405).hex.replace("010f0400000000", "010f03000000");
    expect(readPsbtAnyVersion(bad)).toMatchObject({ valid: false, violation: { rule: "format", field: "PSBT_IN_OUTPUT_INDEX" } });
  });
});
