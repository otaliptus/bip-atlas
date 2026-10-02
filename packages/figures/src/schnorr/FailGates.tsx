import { Drawing, Responsive, Value } from "../kit";
import type { DerivedSchnorrFixture } from "../types";
import { SCHNORR_STAGES, gateStatuses, ownTrace } from "./stages";

/** The lane name: the CSV comment (how the vector was made) when it has one, else the site's label. */
const laneText = (f: DerivedSchnorrFixture) => f.comment || `(no comment) ${f.label}`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * schnorr-fail-gates.v1 — static. Every vector of the hero run through the
 * same eight gates at once: a lane per vector, ticked through the gates it
 * passes, crossed at the gate that stops it, and nothing drawn after that.
 * Lanes are named by the CSV comment, which says how a vector was made, not
 * which check rejects it.
 */
export function FailGates({ fixtures }: { fixtures: DerivedSchnorrFixture[] }) {
  const lanes = fixtures.map((f) => {
    const t = ownTrace(f);
    if (t.valid !== f.expected) throw new Error(`${f.id}: verdict differs from the published result`);
    return { f, t, gates: gateStatuses(t) };
  });
  const desc = lanes
    .map(({ f, t }) => {
      const at = SCHNORR_STAGES.findIndex((s) => s.id === t.failedStage);
      return `Vector ${f.vectorIndex}${f.comment ? ` (CSV comment: “${f.comment}”)` : ""}: ${t.valid ? "passes all eight gates; true" : `stops at gate ${at + 1} (${SCHNORR_STAGES[at].label}); later gates are not reached`}.`;
    })
    .join(" ");

  const draw = (wide: boolean) => {
    const id = wide ? "a06-gates-w" : "a06-gates-n";
    const labelW = wide ? 214 : 34;
    const gateW = wide ? 44 : 31;
    const x0 = 10 + labelW;
    const top = wide ? 46 : 30;
    const rowH = 20;
    const W = wide ? 640 : 330;
    const gx = (i: number) => x0 + i * gateW + gateW / 2;
    const lampX = x0 + 8 * gateW + 18;
    const H = top + lanes.length * rowH + (wide ? 18 : 18 + 5 * 13 + 10);
    return (
      <Drawing id={id} width={W} height={H} title="Where each vector stops" desc={desc}>
        {SCHNORR_STAGES.map((st, i) => (
          <g>
            <rect class="k-outline k-fill--plain" x={gx(i) - 3} y={top - 6} width="6" height={lanes.length * rowH + 4} />
            <Value at={[gx(i), top - 22]} text={String(i + 1)} size={8.5} anchor="middle" cls="k-value--label" />
            {wide ? <Value at={[gx(i), top - 11]} text={st.gate} size={8} anchor="middle" cls="k-value--muted" /> : null}
          </g>
        ))}
        <Value at={[10, top - 22]} text={wide ? "VECTOR · CSV COMMENT" : "VEC."} size={8.5} cls="k-value--label" />
        <Value at={[lampX, top - 22]} text="OK" size={8.5} anchor="middle" cls="k-value--label" />
        {lanes.map(({ f, t, gates }, row) => {
          const y = top + row * rowH + 6;
          const stop = gates.indexOf("fail");
          const end = t.valid ? lampX - 9 : gx(stop);
          return (
            <g data-vector={f.vectorIndex} data-stops={t.valid ? "none" : t.failedStage}>
              <Value at={[10, y + 3.5]} text={wide ? clip(`V${f.vectorIndex} · ${laneText(f)}`, 38) : `V${f.vectorIndex}`} size={8.5} />
              <line class="k-ring" x1={x0 - 4} y1={y} x2={end} y2={y} />
              {gates.map((g, i) =>
                g === "pass" ? <circle class="k-outline k-mark--plain" cx={gx(i)} cy={y} r="2.2" /> : g === "fail" ? (
                  <g>
                    <rect class="k-outline k-fill--plain k-cell--em" x={gx(i) - 6} y={y - 6} width="12" height="12" />
                    <text class="k-lamp__m" x={gx(i)} y={y + 3.6} text-anchor="middle">✕</text>
                  </g>
                ) : null,
              )}
              {t.valid ? <text class="k-lamp__m k-value--ok" x={lampX} y={y + 3.6} text-anchor="middle">✓</text> : null}
            </g>
          );
        })}
        {wide ? (
          <Value at={[10, H - 6]} text="● PASSED · ✕ STOPPED HERE · NOTHING AFTER IT: NOT REACHED · ✓ TRUE" size={8} cls="k-value--muted" />
        ) : (
          <g>
            <Value at={[10, top + lanes.length * rowH + 18 + 4 * 13]} text="● PASSED · ✕ STOPPED · BLANK: NOT REACHED" size={8} cls="k-value--muted" />
            <Value at={[10, top + lanes.length * rowH + 18 + 4 * 13]} text="● PASSED · ✕ STOPPED · BLANK: NOT REACHED" size={8} cls="k-value--muted" />
            <Value at={[10, top + lanes.length * rowH + 18 + 4 * 13]} text="● PASSED · ✕ STOPPED · BLANK: NOT REACHED" size={8} cls="k-value--muted" />
            {SCHNORR_STAGES.map((st, i) => (
              <Value at={[10 + (i % 2) * 160, top + lanes.length * rowH + 18 + Math.floor(i / 2) * 13]} text={`${i + 1} ${st.gate}`} size={8.5} cls="k-value--muted" />
            ))}
          </g>
        )}
      </Drawing>
    );
  };
  return (
    <>
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <details class="atlas-disclosure">
        <summary>The CSV comments in full</summary>
        <dl class="atlas-hexlist">
          {lanes.map(({ f }) => (
            <>
              <dt>Vector {f.vectorIndex} (line {f.source.line})</dt>
              <dd>{f.comment ? `“${f.comment}”` : "no comment"}</dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
