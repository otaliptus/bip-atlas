import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { BUDGET_BASE, SIGOP_COST, decodeNum, decodeTapscript, traceTapscript, type ScriptAssetCase } from "@bip-atlas/models/tapscript";
import { MinimalIf } from "../src/tapscript/MinimalIf";
import { MultisigChain } from "../src/tapscript/MultisigChain";
import { OpSuccess } from "../src/tapscript/OpSuccess";
import { SigPays } from "../src/tapscript/SigPays";
import { SigRules } from "../src/tapscript/SigRules";
import { SigopsBudget } from "../src/tapscript/SigopsBudget";
import { StackStory } from "../src/tapscript/StackStory";
import { TapscriptOrder } from "../src/tapscript/TapscriptOrder";
import { TapscriptTrace } from "../src/tapscript/TapscriptTrace";
import { TapscriptWitness } from "../src/tapscript/TapscriptWitness";
import { runEnd } from "../src/tapscript/common";
import type { DerivedTapscriptFixture, TapscriptCaseFixture, TapscriptTraceView } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures: TapscriptCaseFixture[] = JSON.parse(readFileSync(new URL("fixtures/tapscript.json", root), "utf8")).fixtures;
const excerpt = JSON.parse(readFileSync(new URL("sources/external/core-script-assets-excerpt.json", root), "utf8"));
const chapter = JSON.parse(readFileSync(new URL("content/chapters/tapscript.json", root), "utf8"));
const html = (n: VNode<any>) => render(n);

/** The same reading as derive.ts traceView: elements deduplicated and labelled, stacks as indices. */
function view(c: ScriptAssetCase, which: "success" | "failure"): TapscriptTraceView {
  const t = traceTapscript(c, which);
  expect(t.valid).toBe(which === "success");
  expect(t.commitmentOk).toBe(true);
  const w: string[] = c[which]!.witness;
  const sigs = new Set(t.initialStack.filter((e) => e.length === 128 || e.length === 130));
  const elements: TapscriptTraceView["elements"] = [];
  const idx = (hex: string) => {
    let i = elements.findIndex((e) => e.hex === hex);
    if (i < 0) {
      const bytes = hex.length / 2;
      const n = bytes <= 4 ? decodeNum(hex) : null;
      elements.push({ hex, bytes, label: bytes === 0 ? "empty" : sigs.has(hex) ? `${bytes}-byte signature` : n !== null ? `number ${n}` : bytes === 32 ? "32-byte key" : `${bytes}-byte value` });
      i = elements.length - 1;
    }
    return i;
  };
  const initialStack = t.initialStack.map(idx);
  const steps = t.steps.map((s) => ({ position: s.position, name: s.name, executed: s.executed, note: s.note, failed: !!s.failed, before: s.stackBefore.map(idx), after: s.stackAfter.map(idx), sig: s.sig ?? null }));
  for (const s of steps) {
    if (!s.sig) continue;
    const key = elements[s.before[s.before.length - 1]];
    if (key.bytes !== 32 && key.bytes !== 0) key.label = `${key.bytes}-byte key, unknown type`;
  }
  const size = (e: string) => (e.length / 2 < 253 ? 1 : 3) + e.length / 2;
  const control = w[w.length - (t.annexHex ? 2 : 1)];
  const dec = decodeTapscript(t.scriptHex);
  return {
    expected: which, valid: t.valid, failStage: t.failStage, reason: t.reason, scriptHex: t.scriptHex,
    ops: t.ops.map((o) => ({ position: o.position, name: o.dataHex !== null ? `<${o.dataHex.length / 2}-byte push>` : o.name, dataBytes: o.dataHex === null ? null : o.dataHex.length / 2 })),
    elements, initialStack,
    witness: { items: w.length, stackBytes: t.initialStack.reduce((n, e) => n + size(e), 0), scriptBytes: size(t.scriptHex), controlBytes: size(control), annexBytes: t.annexHex ? size(t.annexHex) : 0, totalBytes: t.witnessBytes, siblings: (control.length / 2 - 33) / 32, controlHex: control },
    budgetStart: t.budgetStart, sigOpsCounted: t.sigOpsCounted, opSuccess: dec.kind === "op-success" ? dec.at.name : null,
    steps,
  };
}
function derived(id: string): DerivedTapscriptFixture {
  const f = fixtures.find((x) => x.id === id)!;
  const c = excerpt.cases[String(f.caseIndex)] as ScriptAssetCase;
  expect(c.comment).toBe(f.comment);
  return { ...f, derived: { success: view(c, "success"), failure: view(c, "failure") } };
}
const figures = chapter.sections.flatMap((s: any) => s.blocks.filter((b: any) => b.type === "figure"));
const figure = (recipe: string) => [chapter.opening.figure, ...figures].find((f: any) => f.recipe === recipe);
const all = (recipe: string) => figure(recipe).fixtures.map(derived);

describe("tapscript figures: placement", () => {
  it("numbers ten figures in reading order and keeps the hero", () => {
    expect([chapter.opening.figure, ...figures].map((f: any) => f.figure)).toEqual(["A08.1", "A08.2", "A08.3", "A08.4", "A08.5", "A08.6", "A08.7", "A08.8", "A08.9", "A08.10"]);
    expect(figure("tapscript-trace.v1").figure).toBe("A08.6");
  });
  it("states the case numbers its captions name", () => {
    expect(figure("tapscript-stack-story.v1").fixtures).toEqual(["core-case-1109"]);
    expect(figure("tapscript-stack-story.v1").caption).toContain("Core case 1109");
    expect(figure("tapscript-minimalif.v1").caption).toContain("Core case 662");
    expect(figure("tapscript-op-success.v1").caption).toContain("Core case 50");
  });
});

describe("A08.1 witness", () => {
  const d = derived("core-case-1135");
  const s = html(h(TapscriptWitness, { fixture: d }));
  it("draws each item and sends the last two to BIP 341", () => {
    expect(s).toContain("item 0 · empty");
    expect(s).toContain("item 1 · 64-byte signature");
    expect(s).toContain(`item 2 · script · ${d.derived.success.scriptHex.length / 2} B`);
    expect(s).toContain(`control block · ${d.derived.success.witness.controlHex.length / 2} B`);
    expect(s).toContain(`>${d.derived.success.witness.controlHex}</code>`);
    expect(s).toContain("BIP 341");
    expect(s).toContain(`>${d.derived.success.scriptHex}</code>`);
  });
});

describe("A08.2 order", () => {
  it("ends each witness at the gate its recorded verdict names", () => {
    const s = html(h(TapscriptOrder, { fixtures: all("tapscript-order.v1") }));
    expect(s).toContain('data-case="50" data-witness="success" data-end="op-success-3"');
    expect(s).toContain('data-case="50" data-witness="failure" data-end="fail-6"');
    expect(s).toContain('data-case="1135" data-witness="success" data-end="valid-6"');
    expect(s).toContain('data-case="804" data-witness="failure" data-end="fail-5"');
    expect(runEnd(derived("core-case-662").derived.failure)).toEqual({ gate: 5, how: "fail" });
  });
});

describe("A08.3 signature rules", () => {
  it("puts recorded witnesses in the tray their trace shows", () => {
    const s = html(h(SigRules, { fixtures: all("tapscript-sig-rules.v1") }));
    const tray = (bins: string) => s.slice(s.indexOf(`data-tray="${bins}"`), s.indexOf("</g>", s.indexOf(`data-tray="${bins}"`) + 900));
    expect(tray("empty-key")).toContain("case 1135 ✕");
    expect(tray("empty-key")).toContain("case 1109 ✕");
    expect(tray("empty")).toContain("case 1135 ✓");
    expect(tray("unknown-key-type")).toContain("case 824 ✓");
    expect(tray("valid invalid")).toContain("case 824 ✕");
    expect(s).toContain("CHECKSIGVERIFY MUST");
    expect(s).toContain(`COSTS ${SIGOP_COST}`);
  });
});

describe("A08.4 multisig", () => {
  it("shows case 804's failure stopping at CHECKMULTISIG", () => {
    const s = html(h(MultisigChain, { fixture: derived("core-case-804") }));
    expect(s).toContain("AFTER 5 OPCODES");
    expect(derived("core-case-824").derived.success.elements.map((e) => e.label)).toContain("33-byte key, unknown type");
    expect(s).toContain("CHECKSIGADD");
    expect(s).toContain("SYMBOLIC");
  });
});

describe("A08.5 stack storyboard", () => {
  const d = derived("core-case-1109");
  const s = html(h(StackStory, { fixture: d }));
  it("has one frame per opcode plus the start, and the budget after the signature", () => {
    expect(s.split('class="k-story__frame"').length - 1).toBe(d.derived.success.steps.length + 1);
    expect(s).toContain(`BUDGET ${d.derived.success.budgetStart}`);
    expect(s).toContain(`BUDGET ${d.derived.success.budgetStart - SIGOP_COST}`);
    expect(s).toContain("push n + 1 = 24");
  });
});

describe("A08.6 hero (no-JS render)", () => {
  const fx = all("tapscript-trace.v1");
  it("plays the first case to the end with its verdict", () => {
    const s = html(h(TapscriptTrace, { fixtures: fx, figureId: "fig-a08-6" }));
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain("Bitcoin Core labels this witness valid; the recording agrees.");
    expect(s).toContain('data-state="on"');
    expect(s).toContain(`>${fx[0].derived.success.scriptHex}</code>`);
  });
  it("shows the OP_SUCCESS exit when that case is first", () => {
    const c50 = fx.find((f: DerivedTapscriptFixture) => f.caseIndex === 50)!;
    const s = html(h(TapscriptTrace, { fixtures: [c50], figureId: "x" }));
    expect(s).toContain("TRAPDOOR: VALID, NOTHING RUNS");
  });
});

describe("A08.7 and A08.8 budget", () => {
  it("adds 65 bytes for a 64-byte signature against a cost of 50, and 1 for an empty one", () => {
    const s = html(h(SigPays, { fixtures: all("tapscript-sig-pays.v1") }));
    expect(s).toContain("+65 WITNESS BYTES");
    expect(s).toContain(`CHECK −${SIGOP_COST}`);
    expect(s).toContain("NET +15");
    expect(s).toContain("+1 WITNESS BYTES");
  });
  it("draws each success witness's budget as 50 + witness size", () => {
    const fx = all("sigops-budget.v1");
    const s = html(h(SigopsBudget, { fixtures: fx }));
    for (const f of fx) expect(s).toContain(f.derived.success.opSuccess ? "NO BUDGET IN FORCE" : `${BUDGET_BASE} + ${f.derived.success.witness.totalBytes} = ${f.derived.success.budgetStart}`);
  });
});

describe("A08.9 OP_SUCCESS and A08.10 MINIMALIF", () => {
  it("case 50: OP_SUCCESS126 is valid without running; OP_NOP leaves nothing", () => {
    const d = derived("core-case-50");
    expect(d.derived.success.opSuccess).toBe("OP_SUCCESS126");
    const s = html(h(OpSuccess, { fixture: d }));
    expect(s).toContain("TRAPDOOR");
    expect(s).toContain("OP_NOP");
  });
  it("case 662: 0x01 fits, the 3-byte value stops OP_IF", () => {
    const d = derived("core-case-662");
    const s = html(h(MinimalIf, { fixture: d }));
    expect(s).toContain("0x01");
    expect(s).toContain("FITS");
    expect(s).toContain("STOPS");
    expect(d.derived.failure.reason).toMatch(/MINIMALIF/);
  });
});
