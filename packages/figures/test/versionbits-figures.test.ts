import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import {
  BIP8_THRESHOLD,
  BIP9_THRESHOLD,
  PERIOD,
  activationHeight,
  bip9Implied,
  bip9Next,
  mustSignalInvalid,
  parseAssignments,
  utcToEpoch,
  versionFor,
} from "@bip-atlas/models/versionbits";
import { VersionbitsBip8 } from "../src/versionbits/VersionbitsBip8";
import { VersionbitsField } from "../src/versionbits/VersionbitsField";
import { PERIODS, VersionbitsMachine, defaultMeets, optionsFor, runFor } from "../src/versionbits/VersionbitsMachine";
import { VersionbitsRecord } from "../src/versionbits/VersionbitsRecord";
import { VersionbitsThreshold } from "../src/versionbits/VersionbitsThreshold";
import { hex32, ordinal } from "../src/versionbits/parts";
import type { DerivedVersionbitsDeploymentFixture, DerivedVersionbitsGuidelineFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const raw = (p: string) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/${p}`, root), "utf8");
const fixtures = JSON.parse(readFileSync(new URL("fixtures/version-bits.json", root), "utf8")).fixtures;
const rows = parseAssignments(raw("bip-0009/assignments.mediawiki"));

/** The values deriveVersionbitsDeployment computes (the build also cross-checks the dates against BIPs 68 and 141). */
function dep(id: string): DerivedVersionbitsDeploymentFixture {
  const f = fixtures.find((x: { id: string }) => x.id === id);
  const row = rows.find((r) => r.name === f.name)!;
  const net = (n: "mainnet" | "testnet") => {
    const r = row[n];
    const h = activationHeight(r.state);
    return { ...r, startEpoch: utcToEpoch(r.start), expireEpoch: utcToEpoch(r.expire), activeHeight: h, implied: h === null ? null : bip9Implied(h), threshold: BIP9_THRESHOLD[n] };
  };
  return { ...f, derived: { name: row.name, bit: row.bit, bips: row.bips, signalVersion: versionFor([row.bit]), mainnet: net("mainnet"), testnet: net("testnet") } };
}
function guide(): DerivedVersionbitsGuidelineFixture {
  return { ...fixtures.find((x: { id: string }) => x.id === "bip8-guidelines"), derived: { threshold: BIP8_THRESHOLD.mainnet, timeoutPeriods: 26 } };
}
const html = (n: VNode<any>) => render(n);
const csv = dep("bip9-csv"), segwit = dep("bip9-segwit"), g = guide();

describe("version-bits figures", () => {
  it("A11.1 draws the version that signals for both deployments, bit by bit", () => {
    const s = html(h(VersionbitsField, { fixtures: [csv, segwit] }));
    expect(versionFor([0, 1])).toBe(0x20000003);
    expect(s).toContain(hex32(csv.derived.signalVersion));
    expect(s).toContain(hex32(segwit.derived.signalVersion));
    expect(s).toContain(hex32(versionFor([0, 1])));
    expect(s).toContain("TOP BITS 001");
    expect(s).toContain("29 DEPLOYMENT BITS");
    expect(s).toContain("BIT 0 · CSV");
    expect(s).toContain("BIT 1 · SEGWIT");
    // 32 cells, three of them set (bit 29, bit 1, bit 0)
    expect(s.split('class="k-cell ').length - 1).toBe(32);
    expect(s.split("k-mark--plain").length - 1).toBe(3);
  });



  it("A11.4 draws the three thresholds and how many non-signalling blocks stop lock-in", () => {
    const s = html(h(VersionbitsThreshold, { fixtures: [csv, g] }));
    for (const [t, pct] of [[1916, 95], [1512, 75], [1815, 90]]) {
      expect(s).toContain(`≥ ${t.toLocaleString("en-US")} · ${pct}%`);
      expect(s).toContain(`${PERIOD - t} MAY WITHHOLD · ${PERIOD - t + 1} STOP LOCK-IN`);
    }
    expect([BIP9_THRESHOLD.mainnet, BIP9_THRESHOLD.testnet, BIP8_THRESHOLD.mainnet]).toEqual([1916, 1512, 1815]);
  });



  it("A11.8 shows both deployments' windows and implied periods, with the testnet rows in a disclosure", () => {
    const s = html(h(VersionbitsRecord, { fixtures: [csv, segwit] }));
    for (const f of [csv, segwit]) {
      const m = f.derived.mainnet;
      expect(s).toContain(`${m.start.slice(0, 10)} → ${m.expire.slice(0, 10)}`);
      expect(s).toContain(m.implied!.lockedInFrom.toLocaleString("en-US"));
      expect(s).toContain(`= BIP ${f.crossCheck.bip} ✓`);
      const details = s.slice(s.indexOf("<details"));
      expect(details).toContain(String(f.derived.testnet.startEpoch));
      expect(details).toContain(f.derived.testnet.state);
    }
  });

  it("A11.8 does not hatch LOCKED_IN (hatching means hidden) and keeps labels at 8 units or more", () => {
    const s = html(h(VersionbitsRecord, { fixtures: [csv, segwit] }));
    const drawings = s.slice(0, s.indexOf("<details"));
    expect(drawings).not.toMatch(/fill:url\(/);
    expect((drawings.match(/k-fill--plain k-dashed/g) ?? []).length).toBe(2 * 2);
    const sizes = [...drawings.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(8);
  });

  it("A11.9 runs BIP 8 both ways and draws the MUST_SIGNAL rule from the model", () => {
    const s = html(h(VersionbitsBip8, { fixture: g }));
    expect(mustSignalInvalid(201, 1815)).toBe(false);
    expect(mustSignalInvalid(202, 1815)).toBe(true);
    expect(s).toContain("2,016 − 1,815 = 201 BLOCKS");
    expect(s).toContain("THE 202ND THAT FAILS");
    const [off, on] = optionsFor([g]).map((o) => runFor(o, Array(PERIODS).fill(false)));
    expect(off[27]).toBe("FAILED");
    expect(on.slice(25, 29)).toEqual(["STARTED", "MUST_SIGNAL", "LOCKED_IN", "ACTIVE"]);
    expect(ordinal(201)).toBe("201st");
    expect(ordinal(212)).toBe("212th");
  });
});

describe("version-bits hero", () => {
  const fx = [csv, segwit, g];
  it("offers four runs, csv first, with the hypothetical default", () => {
    const o = optionsFor(fx);
    expect(o.map((x) => x.text)).toEqual(["csv", "segwit", "BIP 8 · LOT off", "BIP 8 · LOT on"]);
    const run = runFor(o[0], defaultMeets(o[0]));
    expect(run[0]).toBe("DEFINED");
    expect(run[10]).toBe("STARTED");
    expect(run[11]).toBe("LOCKED_IN");
    expect(run[12]).toBe("ACTIVE");
  });
  it("renders the no-JS state: the whole run, a status line and a text equivalent", () => {
    const s = html(h(VersionbitsMachine, { fixtures: fx, figureId: "fig-a11-6" }));
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain("Static view");
    expect(s).toContain("Period 29: ACTIVE; the rules are enforced.");
    expect(s).toContain("periods 1–10 STARTED; period 11 LOCKED_IN; periods 12–29 ACTIVE");
    expect(s).toContain('aria-live="polite"');
    expect(s.split('data-station="').length - 1).toBe(2 * 5);
    expect(s).toContain("1,916");
  });
});

describe("version-bits captions", () => {
  const text = readFileSync(new URL("content/chapters/version-bits.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("boundaries of 2,016-block retarget periods");
    expect(text).toContain("included at least 1,916 that signalled");
    expect(text).toContain("two other top-bit patterns for future mechanisms");
    expect(text).toContain("the other 29 are free for deployments");
    expect(PERIOD).toBe(2016);
  });
});
