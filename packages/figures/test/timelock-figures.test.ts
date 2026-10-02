import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { checkLockTimeVerify, checkSequenceVerify, LOCKTIME_THRESHOLD } from "@bip-atlas/models/timelock";
import { TimelockFields, timelockHeroSpec } from "../src/timelock/TimelockFields";
import { TimelockCsvStory, TimelockMtp, TimelockNotALock, TimelockPinned, TimelockRanges, TimelockSequenceBits } from "../src/timelock/TimelockStatics";
import type { DerivedTimelockBipTxFixture, DerivedTimelockCaseFixture, DerivedTimelockEncodingFixture } from "../src/types";
import { deriveChapter } from "./derived";

const html = (n: VNode<any>) => render(n);
const all = await deriveChapter<any>("timelocks.json");
const cases = all.filter((f) => f.kind === "timelock-case") as DerivedTimelockCaseFixture[];
const txs = all.filter((f) => f.kind === "timelock-bip-tx") as DerivedTimelockBipTxFixture[];
const enc = all.find((f) => f.kind === "timelock-encoding") as DerivedTimelockEncodingFixture;

describe("derived field changes", () => {
  it("re-run each change through the model, as an independent call confirms", () => {
    for (const f of cases) {
      for (const e of f.derived.edits) {
        const fields = { version: e.version, nLockTime: e.nLockTime, sequences: [e.nSequence] };
        const arg = BigInt(f.derived.argument);
        const r = f.derived.opcode === "CHECKLOCKTIMEVERIFY" ? checkLockTimeVerify(arg, fields, 0) : checkSequenceVerify(arg, fields, 0);
        expect(e.checks.map((c) => [c.id, c.ok])).toEqual(r.checks.map((c) => [c.id, c.ok]));
      }
    }
  });
  it("the prose's example: 499,999,999 passes at nLockTime 499,999,999 and fails once nLockTime becomes a time", () => {
    const c = cases.find((f) => f.id === "core-valid-99")!;
    expect(c.derived.valid).toBe(true);
    const plus = c.derived.edits.find((e) => e.id === "locktime-plus")!;
    expect(plus.nLockTime).toBe(LOCKTIME_THRESHOLD);
    expect(plus.checks.find((k) => !k.ok)!.id).toBe("type");
  });
});

describe("TimelockFields (hero, pre-rendered states)", () => {
  const spec = timelockHeroSpec(cases);
  it("one state per case and change, every control combination covered", () => {
    expect(spec.states).toHaveLength(cases.length * 3);
    expect(spec.controls.map((c) => c.kind)).toEqual(["strip", "strip", "strip", "strip", "strip", "toggle"]);
  });
  it("each state draws the checks the model ran and marks changed fields", () => {
    for (const st of spec.states) {
      const s = html(h(TimelockFields, { fixtures: cases, figureId: `t-${st.id}`, initial: st.state }));
      const f = cases.find((x) => x.id === st.state.caseId)!;
      const v = st.state.edit === "core" ? f.derived : f.derived.edits.find((e) => e.id === st.state.edit)!;
      expect((s.match(/data-check=/g) ?? []).length).toBe(v.checks.length);
      expect(s).toContain(v.valid ? "THE SPEND IS VALID" : "THE SPEND IS INVALID");
      expect(s.includes("CHANGED")).toBe(st.state.edit !== "core");
      expect(s).not.toContain("aria-live");
    }
  });
});

describe("Static timelock drawings", () => {
  it("A10.1: threshold and ranges from the model", () => {
    const s = html(h(TimelockRanges, { fixture: enc }));
    expect(s).toContain("500,000,000 = 1985-11-05");
    expect(s).toContain("33,553,920 S");
    expect(enc.derived.maxTimeSeconds).toBe(33_553_920);
  });
  it("A10.2: schematic, no numbers", () => {
    const s = html(h(TimelockNotALock, {})).replace(/<[^>]*>/g, " ");
    expect(s).not.toMatch(/\d{3}/);
  });
  it("A10.3: four transactions and their readings", () => {
    const s = html(h(TimelockPinned, { fixtures: txs }));
    expect(s).toContain("NO BLOCK BELOW HEIGHT 18");
    expect(s).toContain("EVERY INPUT FINAL");
  });
  it("A10.5: BIP 68's two encodings as bits", () => {
    const s = html(h(TimelockSequenceBits, { fixture: enc }));
    expect(s).toContain("0x0000ffff");
    expect(s).toContain("0x0040ffff");
    expect(s).toContain(`data-bits="${(0x40ffff).toString(2).padStart(32, "0")}"`);
  });
  it("A10.6: one frame per check of the Core case", () => {
    const f = cases.find((x) => x.id === "core-valid-127")!;
    const s = html(h(TimelockCsvStory, { fixture: f }));
    expect(s.split('class="k-story__frame"').length - 1).toBe(f.derived.checks.length);
  });
  it("A10.7: the median is the sixth of eleven", () => {
    const s = html(h(TimelockMtp, {}));
    expect(s).toContain("MEDIAN TIME PAST");
    expect((s.match(/k-mark--time/g) ?? []).length).toBe(1);
  });
});
