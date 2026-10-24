import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateRbfScenario, type RbfScenario } from "../src/rbf";

const { fixtures }: { fixtures: Array<RbfScenario & { id: string; label: string }> } = JSON.parse(readFileSync(new URL("../../../fixtures/rbf.json", import.meta.url), "utf8"));
const expected: Record<string, string | null> = {
  "rbf-explicit-pass": null,
  "rbf-inherited-pass": null,
  "rbf-no-signal": "signal",
  "rbf-new-unconfirmed-input": "inputs",
  "rbf-low-absolute-fee": "absolute-fee",
  "rbf-low-bandwidth-bump": "bandwidth",
  "rbf-eviction-overflow": "evictions",
  "rbf-ancestor-confirmed": "signal",
};
const signals: Record<string, string> = {
  "rbf-explicit-pass": "explicit",
  "rbf-inherited-pass": "inherited",
  "rbf-no-signal": "none",
  "rbf-new-unconfirmed-input": "explicit",
  "rbf-low-absolute-fee": "explicit",
  "rbf-low-bandwidth-bump": "explicit",
  "rbf-eviction-overflow": "explicit",
  "rbf-ancestor-confirmed": "none",
};

describe("BIP 125 synthetic replacement scenarios", () => {
  for (const fixture of fixtures) {
    it(fixture.label, () => {
      const result = evaluateRbfScenario(fixture);
      expect(result.failedGate).toBe(expected[fixture.id]);
      expect(result.valid).toBe(expected[fixture.id] === null);
      expect(result.requiredFeeSats).toBe(result.originalFeeSats + result.bandwidthBumpSats);
      expect(result.signal).toBe(signals[fixture.id]);
    });
  }

  it("keeps ancestry out of the replaced transaction set", () => {
    const fixture = fixtures.find((item) => item.id === "rbf-inherited-pass")!;
    const result = evaluateRbfScenario(fixture);
    expect(result.signal).toBe("inherited");
    expect(result.originalFeeSats).toBe(200);
    expect(fixture.evictedCount).toBe(1);
    expect(result.gates.find((gate) => gate.id === "evictions")!.detail).toContain("1 evicted");
  });

  it("accepts equality at the absolute bandwidth boundary", () => {
    const result = evaluateRbfScenario(fixtures.find((fixture) => fixture.id === "rbf-explicit-pass")!);
    expect(result.requiredFeeSats).toBe(700);
    expect(result.valid).toBe(true);
  });

  it("reproduces the BIP's 500-byte example", () => {
    const base: RbfScenario = {
      originals: [{ id: "original", inputs: ["a"], sequences: [0], feeSats: 1000, vbytes: 200, unconfirmed: true, ancestors: [] }],
      candidate: { inputs: ["a"], unconfirmedInputs: [], feeSats: 1500, vbytes: 500 },
      minRelayFeeRate: 1,
      evictedCount: 1,
    };
    expect(evaluateRbfScenario(base).valid).toBe(true);
    expect(evaluateRbfScenario({ ...base, candidate: { ...base.candidate, feeSats: 1499 } }).failedGate).toBe("bandwidth");
  });

  it("checks the exact opt-in, eviction and fractional-rate boundaries", () => {
    const base = structuredClone(fixtures.find((item) => item.id === "rbf-explicit-pass")!);
    base.originals[0].sequences = [0xfffffffe];
    expect(evaluateRbfScenario(base).signal).toBe("none");
    base.originals[0].sequences = [0xfffffffd];
    expect(evaluateRbfScenario(base).signal).toBe("explicit");
    base.evictedCount = 100;
    expect(evaluateRbfScenario(base).valid).toBe(true);
    base.minRelayFeeRate = 1.5;
    base.candidate.vbytes = 201;
    base.candidate.feeSats = 802;
    expect(evaluateRbfScenario(base).bandwidthBumpSats).toBe(302);
    expect(evaluateRbfScenario(base).valid).toBe(true);
    base.candidate.feeSats = 801;
    expect(evaluateRbfScenario(base).failedGate).toBe("bandwidth");
  });

  it("retains inheritance while another opt-in ancestor is unconfirmed", () => {
    const fixture = structuredClone(fixtures.find((item) => item.id === "rbf-inherited-pass")!);
    fixture.ancestry!.push({ ...fixture.ancestry![0], id: "other-parent", unconfirmed: false });
    fixture.originals[0].ancestors.push("other-parent");
    expect(evaluateRbfScenario(fixture).signal).toBe("inherited");
    fixture.ancestry![0].unconfirmed = false;
    expect(evaluateRbfScenario(fixture).signal).toBe("none");
  });

  it("requires a shared input", () => {
    const fixture = structuredClone(fixtures.find((item) => item.id === "rbf-explicit-pass")!);
    fixture.candidate.inputs = ["different"];
    expect(evaluateRbfScenario(fixture).failedGate).toBe("signal");
  });

  it("rejects unknown ancestors and cycles", () => {
    const unknown = structuredClone(fixtures.find((item) => item.id === "rbf-inherited-pass")!);
    unknown.originals[0].ancestors = ["missing"];
    expect(() => evaluateRbfScenario(unknown)).toThrow("Unknown ancestor");
    const cycle = structuredClone(fixtures.find((item) => item.id === "rbf-inherited-pass")!);
    cycle.ancestry![0].ancestors = ["child"];
    cycle.originals[0].ancestors = ["parent"];
    expect(() => evaluateRbfScenario(cycle)).toThrow("Ancestor cycle");
  });

  it("rejects malformed fee and sequence data", () => {
    const fixture = structuredClone(fixtures.find((item) => item.id === "rbf-explicit-pass")!);
    fixture.originals[0].sequences = [0x100000000];
    expect(() => evaluateRbfScenario(fixture)).toThrow("Invalid nSequence");
    fixture.originals[0].sequences = [0];
    fixture.minRelayFeeRate = 0;
    expect(() => evaluateRbfScenario(fixture)).toThrow("positive");
  });
});
