import { Drawing, Value } from "../kit";
import type { DerivedTransactionFixture } from "../types";

const n = (x: number) => x.toLocaleString("en-US");

/**
 * weight-meter.v1 — static. Bytes projected into weight units on one scale:
 * each base byte is stretched four times, each witness-related byte (marker,
 * flag, witness) once. Sizes and weights come from the parsed transactions.
 */
export function WeightMeter({ fixtures }: { fixtures: DerivedTransactionFixture[] }) {
  const max = Math.max(...fixtures.map((f) => f.derived.measures.weight));
  const x0 = 14, span = 300, unit = span / max, rowH = 112, top = 16;
  const H = top + fixtures.length * rowH + 4;
  return (
    <Drawing
      id="a03-weight"
      width={344}
      height={H}
      title="Bytes into weight"
      desc={fixtures
        .map((f) => {
          const m = f.derived.measures;
          const wit = m.totalSize - m.baseSize;
          return `${f.label}: ${m.baseSize} base bytes count 4 each, ${m.baseSize * 4} units; ${wit} witness-related bytes count 1 each, ${wit} units; weight 3 × ${m.baseSize} + ${m.totalSize} = ${m.weight}, virtual size ${m.vsize}.`;
        })
        .join(" ")}
    >
      {fixtures.map((f, k) => {
        const m = f.derived.measures;
        const wit = m.totalSize - m.baseSize;
        const y = top + k * rowH;
        const bY = y + 22, wY = y + 66, h = 14;
        const bBase = m.baseSize * unit, bWit = wit * unit;
        const wBase = m.baseSize * 4 * unit, wWit = wit * unit;
        return (
          <g data-fixture={f.id}>
            <Value at={[x0, y + 8]} text={`${f.label.toUpperCase()}${f.shortLabel ? ` · ${f.shortLabel.toUpperCase()}` : ""}`} size={9} cls="k-value--label" />
            <rect class="k-cell k-fill--plain" x={x0} y={bY} width={bBase} height={h} />
            <rect class="k-cell k-fill--plain k-wit" x={x0 + bBase} y={bY} width={bWit} height={h} />

            <Value at={[x0 + bBase + bWit + 6, bY + 10.5]} text={`BASE ${m.baseSize} B + ${wit} B WITNESS-RELATED`} size={9} cls="k-value--muted" />
            {/* Projection: base bytes stretch ×4, witness-related bytes keep their length. */}
            <path class="k-proj" d={`M${x0} ${bY + h} L${x0} ${wY} L${x0 + wBase} ${wY} L${x0 + bBase} ${bY + h} Z`} />
            <path class="k-proj k-proj--wit" d={`M${x0 + bBase} ${bY + h} L${x0 + wBase} ${wY} L${x0 + wBase + wWit} ${wY} L${x0 + bBase + bWit} ${bY + h} Z`} />
            <Value at={[x0 + bBase / 2 + 10, bY + h + 18]} text="EACH × 4" size={9} cls="k-value--label" />
            <Value at={[x0 + wBase + wWit + 4, wY - 4]} text="× 1" size={9} cls="k-value--label" />
            <rect class="k-cell k-fill--plain" x={x0} y={wY} width={wBase} height={h} />
            <rect class="k-cell k-fill--plain k-wit" x={x0 + wBase} y={wY} width={wWit} height={h} />
            <Value at={[x0 + 4, wY + 10.5]} text={`${m.baseSize} × 4 = ${n(m.baseSize * 4)}`} size={9} />
            <Value at={[x0 + wBase + 3, wY + 10.5]} text={String(wit)} size={9} />
            <Value at={[x0, wY + h + 14]} text={`WEIGHT 3 × ${m.baseSize} + ${m.totalSize} = ${n(m.weight)} WU · ⌈${n(m.weight)} ÷ 4⌉ = ${m.vsize} vB`} size={9} cls="k-value--label" />
          </g>
        );
      })}
    </Drawing>
  );
}
