import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Arrow, Drawing, Lamp, Responsive, Value, idsFor, wrapLines } from "../kit";
import type { DerivedSchnorrFixture, SchnorrTraceView } from "../types";
import { SCHNORR_STAGES, short, stageNote } from "./stages";

interface Props {
  fixtures: DerivedSchnorrFixture[];
  figureId: string;
}

type Status = "pass" | "fail" | "not-reached" | "pending";
const STATUS_WORD: Record<Status, string> = { pass: "passes", fail: "fails", "not-reached": "not reached", pending: "not revealed yet" };
const VALUE_NAMES: Record<string, string> = { x: "x", y: "y", r: "r", s: "s", hash: "hash", e: "e", xR: "x(R)" };
const N = SCHNORR_STAGES.length;

/** Hex values a stage produced, in display order (the lifted key's x is pk itself, so it is not repeated). */
function stageHex(stageIndex: number, values: Record<string, string>): Array<[string, string]> {
  return Object.entries(values).filter(([k, v]) => k in VALUE_NAMES && /^[0-9a-f]{64}$/.test(v) && !(stageIndex === 0 && k === "x"));
}

/**
 * schnorr-verification.v1 — the Schnorr chapter's hero (drawing-first).
 *
 * The verifier drawn as a track: the three inputs feed eight numbered gates
 * in BIP 340's order, ending in a lamp. Passed gates are ticked; the gate
 * that stops a run is crossed; gates after it are drawn as never reached.
 * A readout under the current gate shows what it computed. Every value comes
 * from the tested model run at build time on published CSV vectors
 * (cross-checked against noble); nothing here signs or accepts typed input.
 */
export function SchnorrVerifier({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const [messageKey, setMessageKey] = useState(fixture.derived.ownMessage);
  const [revealed, setRevealed] = useState(N);
  const shown = hydrated ? revealed : N;

  const chooseFixture = (id: string) => {
    const next = fixtures.find((f) => f.id === id)!;
    setFixtureId(id);
    setMessageKey(next.derived.ownMessage);
  };

  const message = fixture.derived.messages.find((m) => m.key === messageKey)!;
  const own = messageKey === fixture.derived.ownMessage;
  const trace: SchnorrTraceView = fixture.derived.traces[messageKey];
  const r = fixture.signatureHex.slice(0, 64), s = fixture.signatureHex.slice(64);
  const statusOf = (i: number): Status => (i >= shown ? "pending" : i >= trace.steps.length ? "not-reached" : trace.steps[i].ok ? "pass" : "fail");
  const failedAt = trace.failedStage ? SCHNORR_STAGES.findIndex((st) => st.id === trace.failedStage) : -1;
  // The gate in focus: the last one revealed, or, once all are shown, the one that stopped the run.
  const cur = shown >= N && failedAt >= 0 ? failedAt : shown - 1;
  const curStep = trace.steps[cur] ?? null;
  const lamp = shown < N && (failedAt < 0 || cur < failedAt) ? "idle" : trace.valid ? "on" : "off";
  const msgName = own ? `its own ${message.bytes}-byte message` : `the ${message.bytes}-byte message of vector ${message.fromVector}`;

  const verdict = trace.valid
    ? "Every gate passes: Verify succeeds."
    : `Verify stops at gate ${failedAt + 1}, ${SCHNORR_STAGES[failedAt].label.toLowerCase()}; later gates never run.`;
  const published = own
    ? `Published result for vector ${fixture.vectorIndex}: ${fixture.expected ? "TRUE" : "FALSE"}.`
    : `This pairing of vector ${fixture.vectorIndex}'s key and signature with vector ${message.fromVector}'s message is not itself a published vector; the tested model computes the result.`;
  const status =
    shown >= N
      ? `Vector ${fixture.vectorIndex} with ${msgName}. ${verdict} ${published}`
      : `Gate ${shown} of ${N}, ${SCHNORR_STAGES[cur].label.toLowerCase()}: ${STATUS_WORD[statusOf(cur)]}${curStep && statusOf(cur) !== "not-reached" ? ` (${stageNote(curStep.stage, curStep.values, curStep.ok)})` : ""}.`;

  const describe = () =>
    `Verify for vector ${fixture.vectorIndex}: public key ${fixture.publicKeyHex}, ${msgName} ${message.hex || "(empty)"}, signature r = ${r}, s = ${s}. ` +
    SCHNORR_STAGES.map((st, i) => {
      const k = statusOf(i);
      const step = trace.steps[i];
      const vals = step && k !== "pending" ? stageHex(i, step.values).map(([n, v]) => `${VALUE_NAMES[n]} = ${v}`).join(", ") : "";
      return `Gate ${i + 1}, ${st.label}: ${STATUS_WORD[k]}${step && (k === "pass" || k === "fail") ? `, ${stageNote(step.stage, step.values, step.ok)}` : ""}${vals ? ` (${vals})` : ""}.`;
    }).join(" ") +
    (shown >= N ? ` The lamp shows ${trace.valid ? "true" : "false"}.` : "");

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const W = wide ? 640 : 330;
    // Gate centres: one row of eight (wide) or two rows of four (narrow).
    const row1 = wide ? 104 : 150, row2 = 236;
    const gateAt = (i: number): [number, number] =>
      wide ? [48 + i * 66, row1] : [34 + (i % 4) * 68, i < 4 ? row1 : row2];
    const lampAt: [number, number] = wide ? [600, row1] : [298, row2];
    const readY = (wide ? row1 : row2) + 58;
    const H = readY + 60;
    const inputs = (
      <g>
        <Value at={[14, 18]} text="PK · 32 B" size={8.5} cls="k-value--label" />
        <rect class="k-outline k-fill--public" x="14" y="24" width={wide ? 120 : 104} height="20" />
        <Value at={[20, 38]} text={short(fixture.publicKeyHex)} size={9} />
        <Value at={[wide ? 150 : 128, 18]} text={`M · ${message.bytes} B${own ? "" : ` · FROM V${message.fromVector}`}`} size={8.5} cls="k-value--label" />
        <rect class={`k-outline k-fill--plain${own ? "" : " k-cell--em"}`} x={wide ? 150 : 128} y="24" width={wide ? 120 : 104} height="20" />
        <Value at={[wide ? 156 : 134, 38]} text={message.bytes ? short(message.hex) : "(empty)"} size={9} />
        <Value at={[wide ? 286 : 14, wide ? 18 : 62]} text="SIG · 64 B = r ‖ s" size={8.5} cls="k-value--label" />
        <rect class="k-outline k-fill--sig" x={wide ? 286 : 14} y={wide ? 24 : 68} width={wide ? 120 : 104} height="20" />
        <Value at={[wide ? 292 : 20, wide ? 38 : 82]} text={`r ${short(r)}`} size={9} />
        <rect class="k-outline k-fill--sig" x={wide ? 406 : 118} y={wide ? 24 : 68} width={wide ? 120 : 104} height="20" />
        <Value at={[wide ? 412 : 124, wide ? 38 : 82]} text={`s ${short(s)}`} size={9} />
      </g>
    );
    const track = wide
      ? `M14 ${row1} H${lampAt[0] - 12}`
      : `M14 ${row1} H316 V${(row1 + row2) / 2} H14 V${row2} H${lampAt[0] - 12}`;
    const curStatus = statusOf(cur);
    const readLines: string[] = [];
    if (curStatus === "pending" || curStatus === "not-reached") readLines.push(curStatus === "not-reached" ? "Never runs: an earlier gate stopped the run." : "");
    else if (curStep) readLines.push(...wrapLines(stageNote(curStep.stage, curStep.values, curStep.ok), wide ? 90 : 52));
    const hexes = curStep && (curStatus === "pass" || curStatus === "fail") ? stageHex(cur, curStep.values) : [];
    return (
      <Drawing id={id} width={W} height={H} title="Verify, gate by gate" desc={describe()}>
        {inputs}
        <Arrow d={`M24 ${wide ? 46 : 90} V${row1 - 4}`} ids={ids} />
        <path class="k-ring" d={track} />
        {SCHNORR_STAGES.map((st, i) => {
          const [x, y] = gateAt(i);
          const k = statusOf(i);
          return (
            <g class="k-gate" data-status={k} data-current={i === cur ? "true" : undefined}>
              <rect class={`k-outline k-fill--plain${k === "fail" || i === cur ? " k-cell--em" : ""}${k === "pending" || k === "not-reached" ? " k-dashed" : ""}`} x={x - 13} y={y - 17} width="26" height="34" style={k === "not-reached" ? `fill:${ids.hatch}` : undefined} />
              <Value at={[x, y - 23]} text={String(i + 1)} size={8.5} anchor="middle" cls="k-value--label" />
              <Value at={[x, y + 30]} text={i === cur ? `▲ ${st.gate}` : st.gate} size={8} anchor="middle" cls={k === "pass" || k === "fail" ? "" : "k-value--muted"} />
              {k === "pass" ? <text class="k-lamp__m k-value--ok" x={x} y={y + 4} text-anchor="middle">✓</text> : null}
              {k === "fail" ? (
                <>
                  <text class="k-lamp__m" x={x} y={y + 4} text-anchor="middle">✕</text>
                  <path class="k-leader" d={`M${x} ${y + 36} V${y + 44}`} marker-end={ids.arrow} />
                </>
              ) : null}
            </g>
          );
        })}
        <Lamp at={lampAt} state={lamp} label={lamp === "idle" ? "" : trace.valid ? "TRUE" : "FALSE"} />
        {shown > 0 ? (
          <>
            <Value at={[14, readY]} text={`GATE ${cur + 1} · ${SCHNORR_STAGES[cur].label} · ${STATUS_WORD[curStatus]}`} size={9} cls="k-value--label" />
            {readLines.map((l, i) => <Value at={[14, readY + 15 + i * 13]} text={l} size={9.5} />)}
            {hexes.map(([n, v], i) => (
              <Value at={[14 + (wide ? (i % 3) * 200 : (i % 2) * 150), readY + 15 + readLines.length * 13 + Math.floor(i / (wide ? 3 : 2)) * 13]} text={`${VALUE_NAMES[n]} ${short(v)}`} size={9.5} cls={n === "hash" || n === "e" ? "k-value--hash" : ""} />
            ))}
          </>
        ) : null}
      </Drawing>
    );
  };

  const strip = (label: string, name: string, options: Array<{ value: string; text: string; aria: string }>, current: string, set: (v: string) => void) => (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label class="atlas-strip__opt">
          <input type="radio" name={`${figureId}-${name}`} aria-label={o.aria} checked={current === o.value} onChange={() => set(o.value)} />
          <span aria-hidden="true">{o.text}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          {strip("Public BIP 340 vector", "vector", fixtures.map((f) => ({ value: f.id, text: `V${f.vectorIndex} ${f.expected ? "✓" : "✕"}`, aria: `Vector ${f.vectorIndex}, ${f.expected ? "valid" : "invalid"}: ${f.label}` })), fixtureId, chooseFixture)}
          {strip("Message", "message", fixture.derived.messages.map((m) => ({
            value: m.key,
            text: m.key === fixture.derived.ownMessage ? `Signed m · ${m.bytes} B` : `m of V${m.fromVector} · ${m.bytes} B`,
            aria: m.key === fixture.derived.ownMessage ? `Its own message, ${m.bytes} bytes` : `The message of vector ${m.fromVector}, ${m.bytes} bytes`,
          })), messageKey, setMessageKey)}
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: vector {fixtures[0].vectorIndex} checked against its own message, every gate shown. With JavaScript you can choose any of the {fixtures.length} published vectors, swap in another vector’s message, and step through the gates.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Reveal verifier stages">
          <button type="button" class="atlas-scrub__btn" onClick={() => setRevealed(Math.max(1, revealed - 1))} disabled={revealed <= 1} aria-label="Previous gate">←</button>
          <input
            type="range"
            min={1}
            max={N}
            value={revealed}
            aria-label="Gates revealed"
            aria-valuetext={`gate ${revealed} of ${N}: ${SCHNORR_STAGES[revealed - 1].label}, ${STATUS_WORD[statusOf(revealed - 1)]}`}
            onInput={(e) => setRevealed(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => setRevealed(Math.min(N, revealed + 1))} disabled={revealed >= N} aria-label="Next gate">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this view</summary>
        <dl class="atlas-hexlist">
          <dt>pk (32 bytes)</dt><dd><code class="atlas-break">{fixture.publicKeyHex}</code></dd>
          <dt>m ({message.bytes} bytes{own ? "" : `, from vector ${message.fromVector}`})</dt><dd><code class="atlas-break">{message.hex || "(empty)"}</code></dd>
          <dt>r</dt><dd><code class="atlas-break">{r}</code></dd>
          <dt>s</dt><dd><code class="atlas-break">{s}</code></dd>
          {trace.steps.slice(0, shown).flatMap((step, i) =>
            stageHex(i, step.values).map(([n, v]) => (
              <>
                <dt>Gate {i + 1}: {VALUE_NAMES[n]}</dt><dd><code class="atlas-break">{v}</code></dd>
              </>
            )),
          )}
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 340 test-vectors.csv line {fixture.source.line}{fixture.comment ? ` (“${fixture.comment}”)` : ""}. Arithmetic by @noble/curves; every result is cross-checked against noble’s own verifier.</p>
    </div>
  );
}
