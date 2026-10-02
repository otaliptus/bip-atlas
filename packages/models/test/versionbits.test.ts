import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  activationHeight,
  BIP8_THRESHOLD,
  BIP9_THRESHOLD,
  bip8Next,
  bip8ParamProblems,
  bip9Implied,
  bip9Next,
  MAX_BIT,
  mustSignalInvalid,
  parseAssignments,
  PERIOD,
  signals,
  simulateBip8,
  simulateBip9,
  utcToEpoch,
  VERSION_MAX,
  VERSION_MIN,
  versionFor,
  type Bip8Params,
  type Bip9Params,
} from "../src/versionbits";

const root = new URL("../../../", import.meta.url);
const raw = (p: string) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/${p}`, root), "utf8");
const b8 = raw("bip-0008.mediawiki").split("\n");
const b9 = raw("bip-0009.mediawiki").split("\n");
const b68 = raw("bip-0068.mediawiki").split("\n");
const b141 = raw("bip-0141.mediawiki").split("\n");
const assignments = parseAssignments(raw("bip-0009/assignments.mediawiki"));

const MAX_BIT_COUNT = MAX_BIT + 1;
const P9: Bip9Params = { bit: 0, starttime: 1000, timeout: 2000, threshold: 1916 };

describe("signalling bits", () => {
  it("needs top bits 001 and the deployment bit", () => {
    expect(b9[58]).toContain("The top 3 bits of such blocks must be");
    expect(signals(0x20000001, 0)).toBe(true);
    expect(signals(0x20000002, 0)).toBe(false);
    expect(signals(0x60000001, 0)).toBe(false); // top bits 011
    expect(signals(0x00000001, 0)).toBe(false);
    expect(signals(0x30000000, 28)).toBe(true);
    expect([VERSION_MIN, VERSION_MAX]).toEqual([0x20000000, 0x3fffffff]);
    expect(b9[59]).toContain("[0x20000000...0x3FFFFFFF]");
    expect(versionFor([0, 1])).toBe(0x20000003);
    expect(() => versionFor([29])).toThrow(RangeError);
  });
});

describe("BIP 9 state transitions", () => {
  it("starts on MTP ≥ starttime and fails on MTP ≥ timeout, failure first", () => {
    expect(bip9Next("DEFINED", { mtp: 999, count: 0 }, P9).to).toBe("DEFINED");
    expect(bip9Next("DEFINED", { mtp: 1000, count: 0 }, P9).to).toBe("STARTED");
    expect(bip9Next("DEFINED", { mtp: 2000, count: 0 }, P9).to).toBe("FAILED");
    expect(b9[113]).toContain("The transition to FAILED takes precedence");
    expect(bip9Next("STARTED", { mtp: 2000, count: 2016 }, P9).to).toBe("FAILED");
  });

  it("locks in at the threshold, not one below, then activates one period later", () => {
    expect(bip9Next("STARTED", { mtp: 1500, count: 1915 }, P9).to).toBe("STARTED");
    expect(bip9Next("STARTED", { mtp: 1500, count: 1916 }, P9).to).toBe("LOCKED_IN");
    expect(bip9Next("LOCKED_IN", { mtp: 9999, count: 0 }, P9).to).toBe("ACTIVE");
    expect(bip9Next("ACTIVE", { mtp: 0, count: 0 }, P9).to).toBe("ACTIVE");
    expect(bip9Next("FAILED", { mtp: 0, count: 2016 }, P9).to).toBe("FAILED");
  });

  it("simulates whole periods; locked in even past the timeout once reached", () => {
    const s = simulateBip9(P9, [{ mtp: 1000, count: 0 }, { mtp: 1500, count: 1916 }, { mtp: 2500, count: 0 }, { mtp: 3000, count: 0 }]);
    expect(s.map((x) => x.state)).toEqual(["DEFINED", "STARTED", "LOCKED_IN", "ACTIVE", "ACTIVE"]);
  });
});

describe("BIP 8 state transitions", () => {
  const p: Bip8Params = { bit: 1, startheight: 2016 * 10, timeoutheight: 2016 * 14, threshold: 1815, minimumActivationHeight: 2016 * 18, lockinontimeout: true };

  it("validates its parameters", () => {
    expect(b8[57]).toContain("must be an exact multiple of 2016");
    expect(bip8ParamProblems(p)).toEqual([]);
    expect(bip8ParamProblems({ ...p, startheight: 100 })).toContain("startheight must be a multiple of 2016");
    expect(bip8ParamProblems({ ...p, timeoutheight: p.startheight + 2016 })).toContain("timeoutheight must be at least 4032 blocks after startheight");
  });

  it("forces signalling in the last period with lockinontimeout, then locks in and waits for the minimum height", () => {
    const s = simulateBip8(p, 2016 * 9, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(s.map((x) => `${x.height / 2016}:${x.state}`)).toEqual([
      "9:DEFINED", "10:STARTED", "11:STARTED", "12:STARTED", "13:MUST_SIGNAL", "14:LOCKED_IN", "15:LOCKED_IN", "16:LOCKED_IN", "17:LOCKED_IN", "18:ACTIVE", "19:ACTIVE",
    ]);
  });

  it("fails at the timeout without lockinontimeout, and counts before the timeout check", () => {
    const q = { ...p, lockinontimeout: false, minimumActivationHeight: 0 };
    expect(simulateBip8(q, 2016 * 9, [0, 0, 0, 0, 0, 0]).map((x) => x.state).at(-1)).toBe("FAILED");
    expect(bip8Next("STARTED", { height: p.timeoutheight, count: 1815 }, q).to).toBe("LOCKED_IN");
    expect(bip8Next("STARTED", { height: p.timeoutheight, count: 1814 }, q).to).toBe("FAILED");
  });

  it("invalidates the (2016 − threshold + 1)th non-signalling block in MUST_SIGNAL", () => {
    expect(b8[89]).toContain("'''(2016 - threshold)''' blocks in the retarget period have already failed to signal");
    expect(mustSignalInvalid(201, 1815)).toBe(false);
    expect(mustSignalInvalid(202, 1815)).toBe(true);
  });
});

describe("threshold arithmetic", () => {
  it("matches the percentages the BIPs give", () => {
    expect(b9[112]).toContain("The threshold is ≥1916 blocks (95% of 2016), or ≥1512 for testnet (75% of 2016).");
    expect([BIP9_THRESHOLD.mainnet / PERIOD, BIP9_THRESHOLD.testnet / PERIOD]).toEqual([1916 / 2016, 0.75]);
    expect(Math.round((1916 / 2016) * 1000) / 10).toBe(95);
    expect(b8[50]).toContain("'''threshold''' should be 1815 blocks (90% of 2016), or 1512 (75%) for testnet.");
    expect(Math.round((BIP8_THRESHOLD.mainnet / 2016) * 1000) / 10).toBe(90);
    expect(b8[49]).toContain("52416 blocks (26 retarget intervals)");
    expect(26 * PERIOD).toBe(52_416);
    expect(b9[39]).toContain("1 year (31536000 seconds)");
    expect(365 * 86_400).toBe(31_536_000);
    expect(2016 - 1916).toBe(100);
  });
});

describe("pinned deployment parameters", () => {
  it("parses BIP 9's assignments table", () => {
    expect(assignments.map((r) => [r.name, r.bit, r.bips])).toEqual([["csv", 0, [68, 112, 113]], ["segwit", 1, [141, 143, 147]]]);
  });

  it("agrees with the deployment sections of BIPs 68 and 141", () => {
    const [csv, segwit] = assignments;
    expect(b68[225]).toContain(`(Epoch timestamp ${utcToEpoch(csv.mainnet.start)})`);
    expect(b68[225]).toContain(`(Epoch timestamp ${utcToEpoch(csv.mainnet.expire)})`);
    expect(b68[227]).toContain(`(Epoch timestamp ${utcToEpoch(csv.testnet.start)})`);
    expect(b141[307]).toContain(`(Epoch timestamp ${utcToEpoch(segwit.mainnet.start)})`);
    expect(b141[307]).toContain(`(Epoch timestamp ${utcToEpoch(segwit.mainnet.expire)})`);
    expect(b141[309]).toContain(`(Epoch timestamp ${utcToEpoch(segwit.testnet.start)})`);
    expect(b141[305]).toContain('"segwit" and using bit 1');
  });

  it("places every recorded activation on a period boundary and implies its lock-in period", () => {
    const heights = assignments.flatMap((r) => [activationHeight(r.mainnet.state), activationHeight(r.testnet.state)]);
    expect(heights).toEqual([419_328, 770_112, 481_824, 834_624]);
    for (const h of heights) expect(h! % PERIOD).toBe(0);
    expect(bip9Implied(419_328)).toEqual({ activePeriod: 208, lockedInFrom: 417_312, tallyFrom: 415_296, tallyTo: 417_311 });
    expect(bip9Implied(481_824)).toEqual({ activePeriod: 239, lockedInFrom: 479_808, tallyFrom: 477_792, tallyTo: 479_807 });
  });

  it("finds no BIP 8 deployments listed", () => {
    expect(parseAssignments(raw("bip-0008/assignments.mediawiki"))).toEqual([]);
  });
});

describe("version-bits chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/version-bits.json", root), "utf8");
  const [csv, segwit] = assignments;

  it("dates and statuses", () => {
    expect(b9[9]).toContain("Assigned: 2015-10-04");
    expect(b8[7]).toContain("Assigned: 2017-02-01");
    expect(text).toContain("BIP 9, assigned in 2015 and recorded as deployed");
    expect(text).toContain("BIP 8, assigned in 2017 and now recorded as complete");
    expect(b8[279]).toContain("'''1.0.0''' (2026-08-03)");
    expect(b8[303]).toContain("'''0.0.2''' (2020-02-26)");
    expect(text).toContain("rejected after a three-year timeout in 2020, revised with MUST_SIGNAL and a minimum activation height, and advanced to complete in 2026");
  });

  it("bits and versions", () => {
    expect(text).toContain("which gives versions from 0x20000000 to 0x3FFFFFFF");
    expect(text).toContain("That leaves 29 bits for deployments");
    expect(MAX_BIT_COUNT).toBe(29);
    expect(text).toContain("names its bit, from 0 to 28");
    expect(text).toContain("csv used bit 0 and segwit bit 1");
    expect([csv.bit, segwit.bit]).toEqual([0, 1]);
    expect(csv.bips).toEqual([68, 112, 113]);
    expect(text).toContain("csv, the bundle of BIPs 68, 112 and 113");
  });

  it("thresholds and windows", () => {
    expect(text).toContain("At least 1,916 of them, 95 percent");
    expect(text).toContain("on testnet the threshold was 1,512");
    expect(text).toContain("boundaries of 2,016-block retarget periods");
    expect(text).toContain("at least 4,032 blocks apart");
    expect(text).toContain("1,815 blocks or 90 percent");
    expect(text).toContain("at least a year, 52,416 blocks");
    expect(text).toContain("about a month after a release that includes the change, and a timeout one year later");
  });

  it("the recorded deployments and what they imply", () => {
    expect(text).toContain("on bit 0 with a mainnet window from 1 May 2016 to 1 May 2017, and segwit on bit 1 from 15 November 2016 to 15 November 2017");
    expect([csv.mainnet.start, csv.mainnet.expire, segwit.mainnet.start, segwit.mainnet.expire].map((s) => s.slice(0, 10))).toEqual(["2016-05-01", "2017-05-01", "2016-11-15", "2017-11-15"]);
    expect(text).toContain("block 419,328 for csv and 481,824 for segwit, both multiples of 2,016");
    const c = bip9Implied(activationHeight(csv.mainnet.state)!);
    const s = bip9Implied(activationHeight(segwit.mainnet.state)!);
    expect(text).toContain(`LOCKED_IN from block ${c.lockedInFrom.toLocaleString("en-US")}, which means blocks ${c.tallyFrom.toLocaleString("en-US")} to ${c.tallyTo.toLocaleString("en-US")}`);
    expect(text).toContain(`segwit was LOCKED_IN from ${s.lockedInFrom.toLocaleString("en-US")}`);
  });
});
