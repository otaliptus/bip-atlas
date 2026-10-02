import { Drawing, Responsive, Value } from "../kit";
import type { DerivedTapscriptFixture } from "../types";
import { runEnd } from "./common";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** BIP 342's validation order, as six gates. Gates 2 and 3 have side exits that end validation as valid. */
export const ORDER_GATES = [
  { n: "1", short: "141/341", name: "BIP 141 and BIP 341 checks" },
  { n: "·", short: "0xc0?", name: "applies only to leaf version 0xc0 (others: valid, rules left for later)" },
  { n: "2", short: "DECODE", name: "decode the script (OP_SUCCESSx: valid at once)" },
  { n: "3", short: "LIMITS", name: "initial stack within limits" },
  { n: "4", short: "RUN", name: "execute the script" },
  { n: "4", short: "ONE TRUE", name: "then exactly one element left, and it is true" },
];

/**
 * tapscript-order.v1 — static. The order BIP 342 fixes, as six gates, with
 * every recorded witness drawn as a lane: through the gates it passes,
 * crossed where it is rejected, or out through the OP_SUCCESS side exit.
 */
export function TapscriptOrder({ fixtures }: { fixtures: DerivedTapscriptFixture[] }) {
  const lanes = fixtures.flatMap((f) => (["success", "failure"] as const).map((which) => ({ f, which, v: f.derived[which], end: runEnd(f.derived[which]) })));
  for (const l of lanes) if (l.v.valid !== (l.which === "success")) throw new Error(`${l.f.id}: recorded ${l.which} witness has the wrong verdict`);
  const desc =
    `Validation order, numbered as BIP 342 numbers its steps: ${ORDER_GATES.map((g) => `${g.n === "·" ? "precondition" : `step ${g.n}`}, ${g.name}`).join("; ")}. ` +
    lanes.map((l) => `Case ${l.f.caseIndex} ${l.which} witness: ${l.end.how === "valid" ? "passes every step; valid" : l.end.how === "op-success" ? `leaves at decoding (step 2) through the OP_SUCCESS exit (${l.v.opSuccess}); valid without running` : `rejected at ${ORDER_GATES[l.end.gate - 1].short.toLowerCase()} (step ${ORDER_GATES[l.end.gate - 1].n}): ${l.v.reason}`}.`).join(" ");

  const draw = (wide: boolean) => {
    const id = wide ? "a08-order-w" : "a08-order-n";
    const labelW = wide ? 196 : 66;
    const gateW = wide ? 62 : 38;
    const x0 = 10 + labelW;
    const top = 44, rowH = 19;
    const gx = (i: number) => x0 + i * gateW + gateW / 2;
    const lampX = x0 + 6 * gateW + 16;
    const W = wide ? 640 : 330;
    const legendY = top + lanes.length * rowH + 14;
    const H = wide ? legendY + 8 : legendY + ORDER_GATES.length * 12 + 4;
    return (
      <Drawing id={id} width={W} height={H} title="Checks in a fixed order" desc={desc}>
        <Value at={[10, top - 26]} text={wide ? "CORE CASE · WITNESS" : "CASE"} size={8.5} cls="k-value--label" />
        {ORDER_GATES.map((g, i) => (
          <g>
            <rect class="k-outline k-fill--plain" x={gx(i) - 3} y={top - 8} width="6" height={lanes.length * rowH + 4} />
            <Value at={[gx(i), top - 26]} text={g.n} size={8.5} anchor="middle" cls="k-value--label" />
            {wide ? <Value at={[gx(i), top - 14]} text={g.short} size={8} anchor="middle" cls="k-value--muted" /> : null}
          </g>
        ))}
        <Value at={[lampX, top - 26]} text="OK" size={8.5} anchor="middle" cls="k-value--label" />
        {lanes.map((l, row) => {
          const y = top + row * rowH + 4;
          const stopX = l.end.how === "valid" ? lampX - 8 : gx(l.end.gate - 1);
          return (
            <g data-case={l.f.caseIndex} data-witness={l.which} data-end={`${l.end.how}-${l.end.gate}`}>
              <Value at={[10, y + 3.5]} text={wide ? clip(`${l.f.caseIndex} · ${l.which === "success" ? "✓" : "✕"} ${l.f.label}`, 36) : `${l.f.caseIndex} ${l.which === "success" ? "✓" : "✕"}`} size={8.5} />
              <line class="k-ring" x1={x0 - 4} y1={y} x2={stopX} y2={y} />
              {ORDER_GATES.map((_, i) => (i < l.end.gate - 1 || (l.end.how === "valid" && i <= 5) ? <circle class="k-outline k-mark--plain" cx={gx(i)} cy={y} r="2.2" /> : null))}
              {l.end.how === "fail" ? (
                <g>
                  <rect class="k-outline k-fill--plain k-cell--em" x={stopX - 6} y={y - 6} width="12" height="12" />
                  <text class="k-lamp__m" x={stopX} y={y + 3.6} text-anchor="middle">✕</text>
                </g>
              ) : null}
              {l.end.how === "op-success" ? (
                <g>
                  <path class="k-leader" d={`M${stopX} ${y} l8 -6 H${stopX + gateW - 16}`} />
                  <text class="k-lamp__m k-value--ok" x={stopX + gateW - 9} y={y - 2.4} text-anchor="middle">✓</text>
                </g>
              ) : null}
              {l.end.how === "valid" ? <text class="k-lamp__m k-value--ok" x={lampX} y={y + 3.6} text-anchor="middle">✓</text> : null}
            </g>
          );
        })}
        {wide ? (
          <Value at={[10, legendY]} text="● PASSED · ✕ REJECTED HERE · ↗ OP_SUCCESS EXIT: VALID WITHOUT RUNNING · ✓ VALID" size={8} cls="k-value--muted" />
        ) : (
          ORDER_GATES.map((g, i) => <Value at={[10, legendY + i * 12]} text={`${g.n} ${g.name}`} size={8} cls="k-value--muted" />)
        )}
      </Drawing>
    );
  };
  return <Responsive wide={draw(true)} narrow={draw(false)} />;
}
