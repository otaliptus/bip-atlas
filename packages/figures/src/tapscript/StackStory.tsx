import { BUDGET_BASE } from "@bip-atlas/models/tapscript";
import { Lamp, Storyboard, Value, type Frame } from "../kit";
import type { DerivedTapscriptFixture } from "../types";
import { StackPlates } from "./common";

/**
 * tapscript-stack-story.v1 — static. One recorded success witness played
 * opcode by opcode (the chapter's former worked example): the stack as
 * plates, top plate highest, and the signature budget beside it. Every frame
 * comes from the recorded trace.
 */
export function StackStory({ fixture }: { fixture: DerivedTapscriptFixture }) {
  const v = fixture.derived.success;
  if (!v.valid || v.steps.length === 0) throw new Error(`${fixture.id}: the storyboard needs a success witness that runs opcodes`);
  const list = (ids: number[]) => (ids.length ? [...ids].reverse().map((i) => v.elements[i].label).join(", ") : "empty");
  const plates = (ids: number[], hatch: string) => <StackPlates x={46} y={48} ids={ids} view={v} hatch={hatch} />;
  let budget = v.budgetStart;
  const frames: Frame[] = [
    {
      note: `Start: the witness items before the script become the stack. Budget ${BUDGET_BASE} + ${v.witness.totalBytes} witness bytes = ${v.budgetStart}.`,
      desc: `Initial stack, top first: ${list(v.initialStack)}. Budget ${v.budgetStart}.`,
      draw: (ids) => (
        <>
          <Value at={[14, 18]} text="START" size={9} cls="k-value--label" />
          {plates(v.initialStack, ids.hatch)}
          <Value at={[230, 18]} text={`BUDGET ${v.budgetStart}`} size={8.5} cls="k-value--label" />
        </>
      ),
    },
    ...v.steps.map((s, i): Frame => {
      const from = budget;
      if (s.sig) budget = s.sig.budgetAfter;
      const now = budget;
      const last = i === v.steps.length - 1;
      return {
        note: `${s.name}: ${s.note}.${s.sig ? ` Budget ${from} → ${s.sig.budgetAfter}.` : ""}${last ? ` ${v.reason[0].toUpperCase()}${v.reason.slice(1)}: valid.` : ""}`,
        desc: `${s.name}: ${s.note}. Stack after, top first: ${list(s.after)}.${s.sig ? ` Budget ${from} to ${s.sig.budgetAfter}.` : ""}`,
        draw: (ids) => (
          <>
            <Value at={[14, 18]} text={s.name} size={9} cls="k-value--label" />
            {plates(s.after, ids.hatch)}
            <Value at={[230, 18]} text={`BUDGET ${now}`} size={8.5} cls="k-value--label" />
            {s.sig ? <Value at={[230, 30]} text={`${from} − ${from - now}`} size={8.5} cls="k-value--muted" /> : null}
            {last ? <Lamp at={[262, 104]} state="on" label="VALID" /> : null}
          </>
        ),
      };
    }),
  ];
  return (
    <>
      <Storyboard id="a08-story" title={`Core case ${fixture.caseIndex}, opcode by opcode`} width={300} height={140} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Script</dt><dd><code class="atlas-break">{v.scriptHex}</code></dd>
          {v.elements.map((e) => (
            <>
              <dt>{e.label}</dt><dd><code class="atlas-break">{e.hex || "(empty)"}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
