import { useEffect, useState } from "preact/hooks";
import type { DerivedTapscriptFixture, TapscriptTraceView } from "../types";

interface Props {
  fixtures: DerivedTapscriptFixture[];
  figureId: string;
}

const shortHex = (hex: string) => (hex.length > 16 ? `${hex.slice(0, 8)}…${hex.slice(-4)}` : hex || "—");

const CHECK_TEXT: Record<string, string> = {
  valid: "valid BIP 340 signature",
  invalid: "invalid signature: script fails",
  empty: "empty signature: not checked, not counted",
  "unknown-key-type": "unknown key type: not checked, counted as success",
};

function Stack({ ids, view, label }: { ids: number[]; view: TapscriptTraceView; label: string }) {
  return (
    <div class="atlas-ts-stack">
      <span class="atlas-ts-stack__label">{label}</span>
      {ids.length ? (
        <ol class="atlas-ts-stack__items" reversed aria-label={`${label}, top first`}>
          {[...ids].reverse().map((i) => {
            const e = view.elements[i];
            return (
              <li data-empty={e.bytes === 0 ? "true" : undefined}>
                <span>{e.label}</span>
                <code>{shortHex(e.hex)}</code>
              </li>
            );
          })}
        </ol>
      ) : (
        <p class="atlas-ts-stack__empty">empty stack</p>
      )}
    </div>
  );
}

/**
 * tapscript-trace.v1 — the Tapscript chapter's hero figure.
 *
 * A player for recorded traces, not an interpreter. Each scenario is a spend
 * copied from Bitcoin Core's script_assets_test.json; the traces were recorded
 * at build time by a recorder that refuses opcodes outside its reviewed set,
 * and the build fails unless every recorded verdict matches Core's label.
 */
export function TapscriptTrace({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const [which, setWhich] = useState<"success" | "failure">("success");
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const view = fixture.derived[which];
  const last = view.steps.length; // step index `last` = final verdict
  const [at, setAt] = useState(0);
  const shown = hydrated ? Math.min(at, last) : last;

  const choose = (id: string) => {
    setFixtureId(id);
    setAt(0);
  };
  const flip = (w: "success" | "failure") => {
    setWhich(w);
    setAt(0);
  };

  const step = shown < last ? view.steps[shown] : null;
  const atEnd = shown >= last;
  const finalStack = last ? view.steps[last - 1].failed ? view.steps[last - 1].before : view.steps[last - 1].after : view.initialStack;
  const sigSoFar = view.steps.slice(0, atEnd ? last : shown + 1).filter((s) => s.sig);
  const budgetNow = sigSoFar.length ? sigSoFar[sigSoFar.length - 1].sig!.budgetAfter : view.budgetStart;
  const currentPos = step?.position ?? -1;
  const stepOfPos = new Map(view.steps.map((s, i) => [s.position, i]));

  return (
    <div class="atlas-lab atlas-ts-lab" data-hydrated={hydrated ? "true" : "false"}>
      <p class="atlas-ts-badge">Recorded, verified example · not a general interpreter</p>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Reviewed scenario (Bitcoin Core test case)</legend>
            {fixtures.map((f) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-case`} checked={f.id === fixtureId} onChange={() => choose(f.id)} />
                <span>{f.label}<small>{f.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented">
            <legend>Witness</legend>
            {(["success", "failure"] as const).map((w) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-witness`} checked={which === w} onChange={() => flip(w)} />
                <span>{w === "success" ? "✓ Success fixture" : "✕ Failure fixture"}<small>{w === "success" ? "Core: valid" : "Core: invalid"}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view: the success witness of the first scenario, played to the end. With JavaScript you can step through each of the
          {" "}{fixtures.length} scenarios, compare the success and failure witnesses, and watch the signature budget.
        </p>
      )}

      <ol class="atlas-ts-script" aria-label="Tapscript, opcode by opcode">
        {view.ops.map((o) => {
          const i = stepOfPos.get(o.position);
          const s = i === undefined ? null : view.steps[i];
          const state = o.position === currentPos ? "current" : s === null ? "never" : !s.executed ? "skipped" : i! < shown || atEnd ? (s.failed ? "failed" : "done") : "ahead";
          return (
            <li data-state={state}>
              <code>{o.name}</code>
            </li>
          );
        })}
      </ol>

      {hydrated ? (
        <div class="atlas-lab__buttons" role="group" aria-label="Step through the trace">
          <button type="button" class="manual-plate-button" onClick={() => setAt((n) => Math.max(0, n - 1))} disabled={shown <= 0}>← Previous step</button>
          <button type="button" class="manual-plate-button" onClick={() => setAt((n) => Math.min(last, n + 1))} disabled={atEnd}>Next step →</button>
          <button type="button" class="manual-plate-button" onClick={() => setAt(atEnd ? 0 : last)}>{atEnd ? "Back to start" : "Play to the end"}</button>
        </div>
      ) : null}

      <div class="atlas-ts-body">
        <section class="atlas-panel atlas-ts-step" aria-live="polite" aria-label="Current step">
          {step ? (
            <>
              <h3 class="atlas-panel__title">Step {shown + 1} of {last} · {step.name}</h3>
              <p class="atlas-ts-step__note" data-failed={step.failed ? "true" : undefined}>{step.failed ? "✕ " : ""}{step.note}</p>
              <div class="atlas-ts-stacks">
                <Stack ids={step.before} view={view} label="Stack before" />
                {step.failed ? (
                  <div class="atlas-ts-stack"><span class="atlas-ts-stack__label">After</span><p class="atlas-ts-stack__empty" data-failed="true">script fails here</p></div>
                ) : (
                  <Stack ids={step.after} view={view} label="Stack after" />
                )}
              </div>
            </>
          ) : (
            <>
              <h3 class="atlas-panel__title">Result</h3>
              <p class="atlas-lab__status">
                <span class="atlas-lab__verdict" data-valid={view.valid ? "true" : "false"}>{view.valid ? "✓ valid" : "✕ invalid"}</span>{" "}
                {view.reason}. Bitcoin Core labels this witness <strong>{view.expected === "success" ? "valid" : "invalid"}</strong>; the recording agrees.
              </p>
              {view.steps.length ? <Stack ids={finalStack} view={view} label={view.steps[last - 1].failed ? "Stack when the script failed" : "Final stack"} /> : null}
            </>
          )}
          {shown === 0 && !atEnd && hydrated ? <Stack ids={view.initialStack} view={view} label="Initial stack from the witness" /> : null}
        </section>

        <section class="atlas-panel atlas-ts-budget" aria-label="Signature checks and budget">
          <h3 class="atlas-panel__title">Signature checks</h3>
          <p class="atlas-ts-budget__start">
            Budget = 50 + {view.witness.totalBytes} witness bytes = <strong>{view.budgetStart}</strong>
          </p>
          {sigSoFar.length ? (
            <ol class="atlas-ts-budget__list">
              {sigSoFar.map((s) => (
                <li data-check={s.sig!.check}>
                  <code>{s.name}</code> · {s.sig!.keyBytes}-byte key · {CHECK_TEXT[s.sig!.check]} → budget {s.sig!.budgetAfter}
                </li>
              ))}
            </ol>
          ) : (
            <p class="atlas-panel__empty">No signature opcode has run yet.</p>
          )}
          <p class="atlas-ts-budget__now">
            Remaining: <strong>{budgetNow}</strong> · non-empty signatures counted: {sigSoFar.filter((s) => s.sig!.check !== "empty" && s.sig!.check !== "invalid").length}
          </p>
          <p class="atlas-panel__scope">
            Witness: {view.witness.items} items — initial stack {view.witness.stackBytes} B, script {view.witness.scriptBytes} B, control block {view.witness.controlBytes} B
            {view.witness.annexBytes ? `, annex ${view.witness.annexBytes} B` : ""}. The control block was checked against the output key, as in Fig. A07.2.
          </p>
        </section>
      </div>

      <details class="atlas-tap-exact">
        <summary>Exact values</summary>
        <dl>
          <div><dt>script</dt><dd><code class="atlas-break">{view.scriptHex}</code></dd></div>
          {view.elements.filter((e) => e.bytes > 8).map((e) => (
            <div><dt>{e.label}</dt><dd><code class="atlas-break">{e.hex}</code></dd></div>
          ))}
        </dl>
      </details>
      <p class="atlas-lab__source">
        Source: Bitcoin Core qa-assets script_assets_test.json, case {fixture.caseIndex} (“{fixture.comment}”), pinned by commit; linked from BIP 341’s test-vector section.
        Signature checks use the BIP 341 signature message with the BIP 342 extension.
      </p>
    </div>
  );
}
