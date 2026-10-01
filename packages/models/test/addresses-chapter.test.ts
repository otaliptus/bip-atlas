import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeSegwitAddress } from "../src";

const root = new URL("../../../", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/addresses.json", root), "utf8")).fixtures;
const vectors = JSON.parse(readFileSync(new URL("fixtures/bip173-350-vectors.json", root), "utf8")).vectors;

describe("addresses chapter fixtures", () => {
  it("match the extracted vector list when they come from it", () => {
    for (const f of fixtures) {
      const v = vectors.find((x: { bip: number; line: number }) => x.bip === f.source.bip && x.line === f.source.line);
      if (v) expect(v.string, f.id).toBe(f.address);
    }
  });

  it("produce the outcomes the chapter describes", () => {
    const stage = (id: string) => {
      const f = fixtures.find((x: { id: string }) => x.id === id)!;
      return analyzeSegwitAddress(f.address, f.network).failedStage;
    };
    expect(stage("v0-p2wpkh")).toBeNull();
    expect(stage("v1-32byte")).toBeNull();
    expect(stage("v1-bech32-checksum")).toBe("family");
    expect(stage("v0-bech32m-checksum")).toBe("family");
    expect(stage("v0-typo")).toBe("checksum");
    expect(stage("bip173-v1-bech32")).toBe("family");
    expect(stage("mixed-case")).toBe("characters");
    expect(stage("bad-alphabet")).toBe("structure");
    expect(stage("wrong-prefix")).toBe("network");
    expect(stage("v0-wrong-length")).toBe("program");
    expect(stage("excess-padding")).toBe("program");
    expect(stage("version-17")).toBe("program");
  });

  it("offers between two and six lab samples", () => {
    const lab = fixtures.filter((f: { lab: boolean }) => f.lab);
    expect(lab.length).toBeGreaterThanOrEqual(2);
    expect(lab.length).toBeLessThanOrEqual(6);
  });
});
