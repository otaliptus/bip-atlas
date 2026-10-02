import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  absoluteSatisfied,
  checkLockTimeVerify,
  checkSequenceVerify,
  encodeRelative,
  evaluateCoreLockCase,
  LOCKTIME_THRESHOLD,
  lockFieldsOf,
  medianTimePast,
  readAbsolute,
  readSequence,
  relativeSatisfied,
  SEQUENCE_LOCKTIME_DISABLE_FLAG,
  SEQUENCE_LOCKTIME_MASK,
  SEQUENCE_LOCKTIME_TYPE_FLAG,
  TimelockScopeError,
} from "../src/timelock";
import { parseTransaction } from "../src/tx";

const root = new URL("../../../", import.meta.url);
const raw = (p: string) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/${p}`, root), "utf8").split("\n");
const b65 = raw("bip-0065.mediawiki");
const b68 = raw("bip-0068.mediawiki");
const b112 = raw("bip-0112.mediawiki");
const b113 = raw("bip-0113.mediawiki");
const b143 = raw("bip-0143.mediawiki");
const b174 = raw("bip-0174.mediawiki");
const excerpt = JSON.parse(readFileSync(new URL("sources/external/core-locktime-cases-excerpt.json", root), "utf8"));
const fieldsOfHex = (hex: string) => lockFieldsOf(parseTransaction(hex));

describe("bit layout and constants", () => {
  it("match BIP 68 and BIP 112", () => {
    expect(b68[29]).toContain("If bit (1 << 31) of the sequence number is set");
    expect(SEQUENCE_LOCKTIME_DISABLE_FLAG).toBe(2 ** 31);
    expect(b68[35]).toContain("Bit (1 << 22) determines if the relative lock-time is time-based or block based");
    expect(SEQUENCE_LOCKTIME_TYPE_FLAG).toBe(2 ** 22);
    expect(b68[39]).toContain("a mask of 0x0000ffff MUST be applied");
    expect(SEQUENCE_LOCKTIME_MASK).toBe(0xffff);
    expect(b112[246]).toContain("SEQUENCE_LOCKTIME_MASK = 0x0000ffff");
    expect(b113[50]).toContain("nMedianTimeSpan=11");
  });

  it("takes the height/time threshold from Bitcoin Core's script.h (pinned)", () => {
    expect(excerpt.scriptH.firstLine).toBe(45);
    expect(excerpt.scriptH.lines[2]).toContain(`LOCKTIME_THRESHOLD = ${LOCKTIME_THRESHOLD};`);
    expect(excerpt.scriptH.lines[2]).toContain("Tue Nov  5 00:53:20 1985 UTC");
    expect(new Date(LOCKTIME_THRESHOLD * 1000).toISOString()).toBe("1985-11-05T00:53:20.000Z");
  });

  it("masks away the bits BIP 68 leaves undefined", () => {
    const r = readSequence((0x003f0000 | 0x7f800000 | 0x1234) >>> 0, 2);
    expect([r.enforced, r.unit, r.value]).toEqual([true, "blocks", 0x1234]);
    expect(r.unusedBitsSet).toEqual([16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 29, 30]);
    expect(readSequence(0x00400000 | 0xffff, 2)).toMatchObject({ unit: "time", value: 65535, seconds: 65535 * 512 });
  });

  it("compares the version as unsigned, so 0xffffffff counts as at least 2 (BIP 68, BIP 112)", () => {
    expect(b68[114]).toContain("static_cast<uint32_t>(tx.nVersion) >= 2");
    expect(readSequence(5, 0xffffffff).enforced).toBe(true);
    expect(checkSequenceVerify(5n, { version: 0xffffffff, nLockTime: 0, sequences: [5] }, 0).ok).toBe(true);
  });

  it("gives BIP 68 meaning only to version >= 2 with the disable flag clear", () => {
    expect(readSequence(5, 1)).toMatchObject({ enforced: false, reason: "version" });
    expect(readSequence(0x80000005, 2)).toMatchObject({ enforced: false, reason: "disable-flag" });
    expect(readSequence(0xffffffff, 2)).toMatchObject({ final: true, enforced: false, reason: "disable-flag" });
    expect(readSequence(5, 2)).toMatchObject({ enforced: true, unit: "blocks", value: 5 });
  });
});

describe("height/time threshold cases", () => {
  const f = (nLockTime: number, sequences = [0xfffffffe]) => ({ version: 2, nLockTime, sequences });

  it("reads 499,999,999 as a height and 500,000,000 as a time", () => {
    expect(readAbsolute(f(499_999_999)).kind).toBe("height");
    expect(readAbsolute(f(500_000_000)).kind).toBe("time");
  });

  it("excludes a transaction while height or MTP is <= nLockTime (BIP 113's wording)", () => {
    expect(b113[23]).toContain("transactions are excluded from inclusion in a block if the");
    expect(absoluteSatisfied(f(100), 100, 0)).toBe(false);
    expect(absoluteSatisfied(f(100), 101, 0)).toBe(true);
    expect(absoluteSatisfied(f(600_000_000), 10, 600_000_000)).toBe(false);
    expect(absoluteSatisfied(f(600_000_000), 10, 600_000_001)).toBe(true);
  });

  it("ignores nLockTime when every input is final", () => {
    expect(b68[66]).toContain("Setting nSequence to this value for every input in a transaction");
    expect(readAbsolute(f(100, [0xffffffff, 0xffffffff])).enforced).toBe(false);
    expect(absoluteSatisfied(f(100, [0xffffffff]), 1, 0)).toBe(true);
    expect(readAbsolute(f(100, [0xffffffff, 0])).nonFinalInputs).toEqual([1]);
  });

  it("measures relative locks from the coin, with BIP 68's minus-one semantics", () => {
    // n blocks: first valid at coin height + n.
    expect(relativeSatisfied(10, 2, { height: 100, mtpBefore: 0 }, { height: 109, prevMtp: 0 })).toBe(false);
    expect(relativeSatisfied(10, 2, { height: 100, mtpBefore: 0 }, { height: 110, prevMtp: 0 })).toBe(true);
    // n × 512 s after the MTP before the coin's block.
    const t = encodeRelative({ seconds: 1024 });
    expect(relativeSatisfied(t, 2, { height: 1, mtpBefore: 1000 }, { height: 9, prevMtp: 2023 })).toBe(false);
    expect(relativeSatisfied(t, 2, { height: 1, mtpBefore: 1000 }, { height: 9, prevMtp: 2024 })).toBe(true);
    expect(relativeSatisfied(t, 1, { height: 1, mtpBefore: 1000 }, { height: 2, prevMtp: 0 })).toBe(true);
  });

  it("computes median time past over the last 11 blocks", () => {
    expect(medianTimePast([5, 1, 9, 3, 7, 2, 8, 4, 6, 11, 10])).toBe(6);
    expect(medianTimePast([100, 5, 1, 9, 3, 7, 2, 8, 4, 6, 11, 10])).toBe(6); // the 12th-newest is ignored
    expect(medianTimePast([3, 1])).toBe(3); // fewer than 11 near genesis: upper median, as the reference code indexes
  });
});

describe("BIP-published examples", () => {
  it("BIP 68's encodings and their stated ranges", () => {
    expect(b68[242]).toContain("0 <= nHeight <= 65,535 blocks (1.25 years)");
    expect(encodeRelative({ blocks: 65_535 })).toBe(65_535);
    expect((65_535 * 600) / (365.25 * 86_400)).toBeCloseTo(1.25, 2);
    expect(b68[246]).toContain("0 <= nTime < 33,554,431 seconds (1.06 years)");
    expect(b68[247]).toContain("nSequence = (1 << 22) | (nTime >> 9);");
    expect(encodeRelative({ seconds: 33_554_431 })).toBe((1 << 22) | 65_535);
    expect(() => encodeRelative({ seconds: 33_554_432 })).toThrow(RangeError);
    expect(33_554_431 / (365.25 * 86_400)).toBeCloseTo(1.06, 2);
    expect(readSequence(encodeRelative({ seconds: 33_554_431 }), 2).seconds).toBe(33_553_920);
  });

  it("BIP 143's native P2WPKH example: version 1, nLockTime 17, one non-final input", () => {
    const hex = /([0-9a-f]{100,})/.exec(b143[189])![1];
    const f = fieldsOfHex(hex);
    expect(b143[148]).toContain("nLockTime: 11000000");
    expect(f).toEqual({ version: 1, nLockTime: 17, sequences: [0xffffffee, 0xffffffff] });
    expect(readAbsolute(f)).toMatchObject({ kind: "height", enforced: true, nonFinalInputs: [0], firstHeight: 18 });
    expect(readSequence(f.sequences[0], f.version)).toMatchObject({ enforced: false, reason: "version" });
  });

  it("BIP 174's transactions: an anti-fee-sniping style height and an all-final spend", () => {
    const tx619 = fieldsOfHex(/<pre>([0-9a-f]+)<\/pre>/.exec(b174[618])![1]);
    expect(tx619).toEqual({ version: 2, nLockTime: 1_257_139, sequences: [0xfffffffe] });
    expect(readAbsolute(tx619)).toMatchObject({ kind: "height", enforced: true, firstHeight: 1_257_140 });
    expect(readSequence(0xfffffffe, 2)).toMatchObject({ enforced: false, reason: "disable-flag" });
    const tx833 = fieldsOfHex(/<pre>([0-9a-f]+)<\/pre>/.exec(b174[832])![1]);
    expect(tx833).toEqual({ version: 2, nLockTime: 0, sequences: [0xffffffff, 0xffffffff] });
    expect(readAbsolute(tx833).enforced).toBe(false);
  });
});

describe("the opcodes against Bitcoin Core's pinned cases", () => {
  it("covers 51 one-input cases, 27 valid and 24 invalid", () => {
    expect(excerpt.cases.length).toBe(51);
    expect(excerpt.cases.filter((c: { expected: string }) => c.expected === "valid").length).toBe(27);
  });

  it("agrees with every Core verdict", () => {
    const disagree = excerpt.cases.filter((c: any) => evaluateCoreLockCase(c.prevouts[0][2], fieldsOfHex(c.txHex)).valid !== (c.expected === "valid"));
    expect(disagree.map((c: any) => `${c.file}#${c.index}`)).toEqual([]);
  });

  it("fails each invalid case at the check its Core comment names", () => {
    const expectedCheck = (comment: string) =>
      /negative/i.test(comment) ? "negative"
        : /mismatch/.test(comment) ? "type"
        : /Input locked/.test(comment) ? "input-final"
        : /tx\.version/.test(comment) ? "version"
        : /just beyond|2\^31-1/.test(comment) ? "value"
        : null;
    for (const c of excerpt.cases.filter((x: any) => x.expected === "invalid")) {
      const { result } = evaluateCoreLockCase(c.prevouts[0][2], fieldsOfHex(c.txHex));
      const failed = result.checks.find((k) => !k.ok)!;
      expect(failed.id, `${c.index}: ${c.comment}`).toBe(expectedCheck(c.comment));
    }
  });

  it("follows BIP 65's order: type before value, finality last", () => {
    expect(b65[247]).toContain("if (!(");
    const f = { version: 1, nLockTime: 499_999_999, sequences: [0xffffffff] };
    expect(checkLockTimeVerify(500_000_000n, f, 0).checks.at(-1)!.id).toBe("type");
    expect(checkLockTimeVerify(1n, f, 0).checks.at(-1)!).toMatchObject({ id: "input-final", ok: false });
  });

  it("treats a CSV argument with bit 31 set as a NOP, before any other check (BIP 112)", () => {
    expect(b112[280]).toContain("CHECKSEQUENCEVERIFY behaves as a NOP");
    const r = checkSequenceVerify(2n ** 31n, { version: 1, nLockTime: 0, sequences: [0xffffffff] }, 0);
    expect(r.ok).toBe(true);
    expect(r.checks.at(-1)).toMatchObject({ id: "arg-disabled", stopsHere: true, label: "The argument's disable flag is set: no lock" });
  });

  it("fails CSV when the input's own disable flag is set", () => {
    const r = checkSequenceVerify(10n, { version: 2, nLockTime: 0, sequences: [0x8000000a] }, 0);
    expect(r.checks.at(-1)).toMatchObject({ id: "input-disabled", ok: false });
  });

  it("refuses scripts and arguments outside its scope", () => {
    expect(() => evaluateCoreLockCase("0 CHECKLOCKTIMEVERIFY DROP 1", { version: 1, nLockTime: 0, sequences: [0] })).toThrow(TimelockScopeError);
    expect(() => checkLockTimeVerify(2n ** 39n, { version: 1, nLockTime: 0, sequences: [0] }, 0)).toThrow(TimelockScopeError);
    expect(() => checkLockTimeVerify(0n, { version: 1, nLockTime: 0, sequences: [0] }, 1)).toThrow(RangeError);
  });
});

describe("timelocks chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/timelocks.json", root), "utf8");
  const caseAt = (file: string, index: number) => excerpt.cases.find((c: any) => c.file === file && c.index === index);

  it("states the threshold and its date", () => {
    expect(text).toContain("Bitcoin Core defines it as 500,000,000, which as a Unix time falls on 5 November 1985");
    expect(new Date(LOCKTIME_THRESHOLD * 1000).toISOString().slice(0, 10)).toBe("1985-11-05");
  });

  it("reads the published transactions correctly", () => {
    expect(text).toContain("sets nLockTime to 17 and leaves one input non-final, so no block below height 18 could include it");
    expect(text).toContain("BIP 174’s final transaction has nLockTime 0 and only final inputs");
  });

  it("walks the 499,999,998 / 499,999,999 / 500,000,000 example exactly as the model does", () => {
    expect(text).toContain("An argument of 499,999,999 against nLockTime 499,999,998 fails by one block.");
    const c = caseAt("tx_invalid.json", 68);
    const f = fieldsOfHex(c.txHex);
    expect([c.prevouts[0][2], f.nLockTime]).toEqual(["499999999 CHECKLOCKTIMEVERIFY", 499_999_998]);
    expect(checkLockTimeVerify(499_999_999n, f, 0).checks.at(-1)!.id).toBe("value");
    expect(checkLockTimeVerify(499_999_999n, { ...f, nLockTime: 499_999_999 }, 0).ok).toBe(true);
    const r = checkLockTimeVerify(499_999_999n, { ...f, nLockTime: 500_000_000 }, 0);
    expect([r.ok, r.checks.at(-1)!.id]).toEqual([false, "type"]);
  });

  it("restates BIP 68's ranges and the 12-of-51 figure", () => {
    expect(text).toContain("up to 65,535 blocks, about 1.25 years, or a time below 33,554,431 seconds, about 1.06 years");
    expect(text).toContain("Twelve one-input transactions from Bitcoin Core’s test suite");
    // Distinct cases: the CSV storyboard reuses one of the hero's twelve.
    expect(new Set(text.match(/"core-(valid|invalid)-\d+"/g)!).size).toBe(12);
    expect(excerpt.cases.length).toBe(51);
  });

  it("ties the remaining prose numbers to the pinned lines", () => {
    expect(b65[7]).toContain("Assigned: 2014-10-01");
    expect(b68[10]).toContain("Assigned: 2015-05-28");
    expect(b112[9]).toContain("Assigned: 2015-08-10");
    expect(b113[8]).toContain("Assigned: 2015-08-10");
    expect(text).toContain("four specifications from 2014 and 2015");
    expect(b68[223]).toContain('"versionbits" BIP9 using bit 0');
    expect(b68[225]).toContain("midnight 1st May 2016 UTC (Epoch timestamp 1462060800)");
    expect(new Date(1462060800 * 1000).toISOString()).toBe("2016-05-01T00:00:00.000Z");
    expect(text).toContain("through BIP 9 on bit 0, with a mainnet start of 1 May 2016");
    expect(b112[58]).toContain("30 days after being funded");
    expect(text).toContain("to Alice alone after 30 days");
    expect(b65[229]).toContain("to accept up");
    expect(b65[230]).toContain("5-byte bignums");
    expect(text).toContain("a number of up to five bytes");
    expect(b65[281]).toContain("for nVersion = 4");
    expect(text).toContain("for version-4 blocks");
  });

  it("restates the deployment numbers as the BIPs give them", () => {
    expect(text).toContain("enforced once 750 of the previous 1,000 blocks signalled, with older versions rejected at 950");
    expect(text).toContain("the median of the past 11 blocks’ timestamps");
    expect(text).toContain("a year 2038 problem");
    expect(text).toContain("after the year 2106");
    expect(new Date(0xffffffff * 1000).getUTCFullYear()).toBe(2106);
  });
});
