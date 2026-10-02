import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Drawing, Lamp, Responsive, Value, idsFor } from "../kit";
import type { DerivedTapscriptFixture, TapscriptTraceView } from "../types";
import { StackPlates, stackHeight } from "./common";

interface Props {
  fixtures: DerivedTapscriptFixture[];
  figureId: string;
}

type Which = "success" | "failure";
const CHECK_TEXT: Record<string, string> = {
  valid: "valid BIP 340 signature",
  invalid: "invalid signature",
  empty: "empty signature, not checked",
  "unknown-key-type": "unknown key type, not checked",
};

/** Opcode cell states on the script tape. */
type Cell = "ahead" | "current" | "done" | "skipped" | "failed" | "never" | "exit";

/**
 * tapscript-trace.v1 — the Tapscript chapter's hero (drawing-first).
 *
 * A player for recorded runs, not an interpreter. The script is a tape of
 * opcode cells with a read head; the stack is drawn as plates; the signature
 * budget is a fuel gauge that drains by 50 per checked signature; a lamp
 * gives the verdict at the end. Each run was recorded at build time from a
 * Bitcoin Core test case by a recorder that refuses unreviewed opcodes, and
 * the build fails unless every verdict matches Core's label.
 */
export function TapscriptTrace({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const [which, setWhich] = useState<Which>("success");
  const [at, setAt] = useState(0);
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const v: TapscriptTraceView = fixture.derived[which];
  const L = v.steps.length;
  // Without JavaScript the run is shown played to the end; hydrated, it starts before the first opcode.
  const p = hydrated ? Math.min(at, L) : L;
  const done = v.steps.slice(0, p);
  const step = p > 0 ? v.steps[p - 1] : null;
  const stack = step ? (step.failed ? step.before : step.after) : v.initialStack;
  const sigs = done.filter((s) => s.sig);
  const budget = sigs.length ? sigs[sigs.length - 1].sig!.budgetAfter : v.budgetStart;
  // The budget base (50 in BIP 342) as the recording computed it: start minus witness size.
  const base = v.budgetStart - v.witness.totalBytes;
  const atEnd = p === L;
  const lamp = atEnd ? (v.valid ? "on" : "off") : "idle";
  const stepOfPos = new Map(v.steps.map((s, i) => [s.position, i]));
  const cellOf = (position: number): Cell => {
    const i = stepOfPos.get(position);
    if (i === undefined) return v.opSuccess !== null && atEnd ? "exit" : "never";
    if (i >= p) return "ahead";
    const s = v.steps[i];
    if (s.failed) return "failed";
    if (i === p - 1) return "current";
    return s.executed ? "done" : "skipped";
  };
  const list = (ids: number[]) => (ids.length ? [...ids].reverse().map((i) => v.elements[i].label).join(", ") : "empty");
  const verdict = `${v.valid ? "Valid" : "Invalid"}: ${v.reason}. Bitcoin Core labels this witness ${v.expected === "success" ? "valid" : "invalid"}; the recording agrees.`;
  const status =
    p === 0
      ? L === 0
        ? verdict
        : `Start: the stack, top first, is ${list(v.initialStack)}. Budget ${base} + ${v.witness.totalBytes} witness bytes = ${v.budgetStart}.`
      : atEnd && step!.failed
        ? `Step ${p} of ${L}, ${step!.name}. ${verdict}`
        : `Step ${p} of ${L}, ${step!.name}: ${step!.note}.${step!.sig ? ` ${CHECK_TEXT[step!.sig.check]}; budget ${step!.sig.budgetAfter}.` : ""}${atEnd ? ` ${verdict}` : ""}`;
  const describe = () =>
    `Bitcoin Core test case ${fixture.caseIndex}, ${which} witness. Script: ${v.ops.map((o) => o.name).join(" ")}. Initial stack, top first: ${list(v.initialStack)}. Budget ${v.budgetStart}. ` +
    done.map((s, i) => `Step ${i + 1}, ${s.name}: ${s.note}; stack ${s.failed ? "when it failed" : "after"}, top first: ${list(s.failed ? s.before : s.after)}${s.sig ? `; budget ${s.sig.budgetAfter}` : ""}.`).join(" ") +
    (atEnd ? ` ${verdict}` : ` ${L - p} step${L - p === 1 ? "" : "s"} not yet shown.`);

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const W = wide ? 640 : 330;
    // The tape: one cell per opcode, wrapping.
    const cells: Array<{ x: number; y: number; w: number; name: string; state: Cell }> = [];
    let cx = 14, cy = 34;
    for (const o of v.ops) {
      const cw = o.name.length * 5.6 + 12;
      if (cx + cw > W - 14) {
        cx = 14;
        cy += 30;
      }
      cells.push({ x: cx, y: cy, w: cw, name: o.name, state: cellOf(o.position) });
      cx += cw + 4;
    }
    const tapeEnd = (cells.length ? cells[cells.length - 1].y : cy) + 22;
    const top = tapeEnd + 34;
    const sh = Math.max(stackHeight(stack.length), 40);
    const gaugeX = wide ? 330 : 230, gaugeH = 96;
    const level = Math.max(0, budget) / v.budgetStart;
    const H = Math.max(top + sh + 24, top + gaugeH + 40);
    return (
      <Drawing id={id} width={W} height={H} title="A recorded tapscript run" desc={describe()}>
        <Value at={[14, 16]} text={`SCRIPT · CORE CASE ${fixture.caseIndex} · ${which.toUpperCase()} WITNESS`} size={8.5} cls="k-value--label" />
        {cells.map((c) => (
          <g class="k-op" data-state={c.state}>
            <rect class={`k-outline k-fill--plain${c.state === "current" || c.state === "failed" ? " k-cell--em" : ""}${c.state === "skipped" || c.state === "never" ? " k-dashed" : ""}`} x={c.x} y={c.y} width={c.w} height="22" />
            <text class={`k-value${c.state === "ahead" || c.state === "never" || c.state === "skipped" ? " k-value--muted" : ""}`} x={c.x + 6} y={c.y + 14.5} style="font-size:8.5px">{c.state === "failed" ? `✕ ${c.name}` : c.name}</text>
            {c.state === "current" || c.state === "failed" ? <path class="k-outline k-mark--plain" d={`M${c.x + c.w / 2 - 4} ${c.y - 8} h8 l-4 5 Z`} /> : null}
            {c.state === "exit" ? <Value at={[c.x + c.w + 6, c.y + 15]} text="TRAPDOOR: VALID, NOTHING RUNS" size={8} cls="k-value--label" /> : null}
            {c.state === "skipped" ? <line class="k-leader" x1={c.x + 4} y1={c.y + 11} x2={c.x + c.w - 4} y2={c.y + 11} /> : null}
          </g>
        ))}
        <Value at={[14, top - 12]} text={step?.failed ? "STACK WHEN IT FAILED, TOP HIGHEST" : "STACK, TOP HIGHEST"} size={8.5} cls="k-value--label" />
        <StackPlates x={36} y={top + 6} ids={stack} view={v} hatch={ids.hatch} />
        {/* Fuel gauge: the signature budget. */}
        <Value at={[gaugeX, top - 12]} text="BUDGET" size={8.5} cls="k-value--label" />
        <rect class="k-outline k-fill--plain" x={gaugeX} y={top} width="30" height={gaugeH} />
        <rect class="k-fuel" x={gaugeX} y={top + gaugeH * (1 - level)} width="30" height={gaugeH * level} />
        <rect class="k-outline" x={gaugeX} y={top} width="30" height={gaugeH} fill="none" />
        <Value at={[gaugeX + 36, top + gaugeH * (1 - level) + 4]} text={`${budget}`} size={9} />
        <Value at={[gaugeX, top + gaugeH + 14]} text={`OF ${v.budgetStart}`} size={8} cls="k-value--muted" />
        <Value at={[gaugeX, top + gaugeH + 26]} text={`${v.budgetStart - budget} SPENT`} size={8} cls="k-value--muted" />
        <Lamp at={[wide ? 440 : 300, top + 40]} state={lamp} label={lamp === "idle" ? "" : v.valid ? "VALID" : "INVALID"} />
      </Drawing>
    );
  };

  const strip = (label: string, name: string, options: Array<{ value: string; text: string }>, current: string, set: (v: string) => void) => (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label class="atlas-strip__opt">
          <input type="radio" name={`${figureId}-${name}`} checked={current === o.value} onChange={() => set(o.value)} />
          <span>{o.text}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          {strip("Bitcoin Core test case", "case", fixtures.map((f) => ({ value: f.id, text: f.label })), fixtureId, (id) => (setFixtureId(id), setAt(0)))}
          {strip("Witness", "witness", [{ value: "success", text: "✓ Success witness" }, { value: "failure", text: "✕ Failure witness" }], which, (w) => (setWhich(w as Which), setAt(0)))}
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the success witness of the first case, played to the end. With JavaScript you can step through each of the {fixtures.length} cases opcode by opcode, compare the success and failure witnesses, and watch the budget.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Step a reviewed trace">
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.max(0, p - 1))} disabled={p === 0} aria-label="Previous step">←</button>
          <input
            type="range"
            min={0}
            max={L}
            value={p}
            disabled={L === 0}
            aria-label="Steps run"
            aria-valuetext={p === 0 ? "start, nothing run" : `step ${p} of ${L}: ${v.steps[p - 1].name}`}
            onInput={(e) => setAt(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.min(L, p + 1))} disabled={p >= L} aria-label="Next step">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this witness</summary>
        <dl class="atlas-hexlist">
          <dt>Script</dt><dd><code class="atlas-break">{v.scriptHex}</code></dd>
          {v.elements.map((e) => (
            <>
              <dt>{e.label}</dt><dd><code class="atlas-break">{e.hex || "(empty)"}</code></dd>
            </>
          ))}
          <dt>Witness size</dt><dd>{v.witness.totalBytes} bytes = 1 (item count) + initial stack {v.witness.stackBytes} + script {v.witness.scriptBytes} + control block {v.witness.controlBytes}{v.witness.annexBytes ? ` + annex ${v.witness.annexBytes}` : ""}, each with its length prefix</dd>
        </dl>
      </details>
      <p class="atlas-hero__source">Bitcoin Core qa-assets script_assets_test.json, case {fixture.caseIndex} (“{fixture.comment}”), pinned by commit and linked from BIP 341. Each control block was checked against its output key first, as in Fig. A07.2.</p>
    </div>
  );
}
