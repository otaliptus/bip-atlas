import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { absoluteSatisfied, checkLockTimeVerify, checkSequenceVerify, LOCKTIME_THRESHOLD } from "@bip-atlas/models/timelock";
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
      expect(s).toContain(v.valid ? "THIS SCRIPT CHECK PASSES" : "THIS SCRIPT CHECK FAILS");
      expect(s).toContain("BLOCK ELIGIBILITY IS NOT CHECKED HERE");
      expect(s).not.toContain("THE SPEND IS VALID");
      expect(s.includes("CHANGED")).toBe(st.state.edit !== "core");
      expect(s).not.toContain("aria-live");
      expect(s).not.toMatch(/data-(scrub-step|range|live|toggle|strip|nojs|js)=/);
    }
  });
});

describe("TimelockFields (review fixes)", () => {
  const r = (caseId: string, edit = "core") => html(h(TimelockFields, { fixtures: cases, figureId: "t", initial: { caseId, edit } }));
  it("a passing CLTV script can still be too early for block inclusion", () => {
    const d = cases.find((f) => f.id === "core-valid-99")!.derived;
    const fields = { version: d.version, nLockTime: d.nLockTime, sequences: [d.nSequence] };
    expect(checkLockTimeVerify(BigInt(d.argument), fields, 0).checks.every((c) => c.ok)).toBe(true);
    expect(absoluteSatisfied(fields, d.nLockTime, 0)).toBe(false);
    expect(absoluteSatisfied(fields, d.nLockTime + 1, 0)).toBe(true);
    const s = r("core-valid-99");
    expect(s).toContain("THIS SCRIPT CHECK PASSES");
    expect(s).toContain("BLOCK ELIGIBILITY IS NOT CHECKED HERE");
    expect(s).toContain("HEIGHT > L");
  });
  it("an argument with bit 31 set is drawn as a no-op, not as a passed 'flag is clear' check", () => {
    const s = r("core-valid-131");
    expect(s).toContain("disable flag is set: no lock");
    expect(s).not.toContain("disable flag is clear");
    expect(s).toContain("so the opcode does nothing");
  });
  it("the unit layer says BIP 68 gives no meaning at version 1", () => {
    const rel = cases.find((f) => f.lock === "relative" && f.derived.version >= 2)!;
    const v1 = r(rel.id, "version");
    expect(v1).toContain("VERSION 1: BIP 68 GIVES THIS nSEQUENCE");
    expect(v1).not.toContain("LOW 16 BITS AS BLOCKS");
    expect(v1).toContain("CHANGED: VERSION 1 · NOT A CORE CASE");
  });
  it("the CLTV ruler says its halves have different scales", () => {
    expect(r("core-valid-99")).toContain("HALVES NOT TO ONE SCALE");
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
    expect(s).toContain("VERSION 1: NO BIP 68 MEANING");
    expect(s).toContain("BIP 68: BIT 31 SET ON EVERY INPUT, NO RELATIVE LOCK");
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
    // Focus is an outline, never dimming (a dimmed 1 reads as a 0).
    expect(s).not.toContain("opacity:0.25");
    expect(s).toContain('data-focus="31-31"');
  });
  it("A10.7: the median is the sixth of eleven", () => {
    const s = html(h(TimelockMtp, {}));
    expect(s).toContain("MEDIAN TIME PAST");
    expect((s.match(/k-mark--time/g) ?? []).length).toBe(1);
  });
});
