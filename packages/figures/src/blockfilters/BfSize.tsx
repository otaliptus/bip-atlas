import { BASIC_P } from "@bip-atlas/models/blockfilter";
import { Drawing, Value } from "../kit";
import type { DerivedBfBlockFixture } from "../types";
import { group } from "./parts";

const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/**
 * bf-size.v1 — static. How tight the coding is, for two vector blocks, in
 * bits to scale: the N·(P + 1) floor, the published filter, and writing each
 * hashed value at fixed width. The scripts themselves are far off the scale.
 */
export function BfSize({ fixtures }: { fixtures: DerivedBfBlockFixture[] }) {
  const rows = fixtures.map((f) => {
    const d = f.derived;
    if (d.N === 0) throw new Error(`${f.id}: an empty filter has no per-element size`);
    const scriptBits = d.elements.filter((e) => e.included).reduce((n, e) => n + (e.script.length / 2) * 8, 0);
    return { d, floor: d.N * (BASIC_P + 1), actual: d.filterBytes * 8, fixed: d.N * Math.log2(Number(d.F)), scriptBits };
  });
  const max = Math.max(...rows.map((r) => r.fixed));
  const unit = 210 / max;
  const blockH = 100;
  const bar = (x: number, y: number, bits: number, label: string, cls: string) => (
    <g>
      <rect class={`k-cell ${cls}`} x={x} y={y} width={bits * unit} height={13} />
      <text class="k-bf-gap" x={x + bits * unit + 4} y={y + 9.5}>{label}</text>
    </g>
  );
  const desc = rows
    .map((r) => `Block ${r.d.height}: ${r.d.N} elements. The floor N·(P + 1) is ${r.floor} bits; the published filter is ${r.d.filterBytes} bytes, ${r.actual} bits, about ${one(r.actual / r.d.N)} per element; writing each value below F = ${r.d.F} at fixed width would take about ${one(Math.log2(Number(r.d.F)))} bits each, ${Math.round(r.fixed)} in all; the scripts themselves are ${group(r.scriptBits)} bits.`)
    .join(" ");
  return (
    <Drawing id="a16-size" width={344} height={rows.length * blockH + 8} title="How tight the coding is" desc={desc}>
      {rows.map((r, i) => {
        const y = 14 + i * blockH, x = 14;
        return (
          <g>
            <Value at={[x, y]} text={`BLOCK ${group(r.d.height)} · ${r.d.N} ELEMENTS`} size={8.5} cls="k-value--label" />
            {bar(x, y + 8, r.floor, `FLOOR ${r.floor}`, "k-bf-floor")}
            {bar(x, y + 25, r.actual, `FILTER ${r.actual} · ${one(r.actual / r.d.N)}/EL`, "k-mark--net")}
            {bar(x, y + 42, r.fixed, `FIXED ${Math.round(r.fixed)} · ${one(r.fixed / r.d.N)}/EL`, "k-fill--plain")}
            <rect class="k-cell k-fill--plain k-dashed" x={x} y={y + 59} width={210 * 0.82} height={13} />
            <path class="k-bf-break" d={`M${x + 210 * 0.82 - 10} ${y + 57} l6 17 M${x + 210 * 0.82 - 4} ${y + 57} l6 17`} />
            <text class="k-bf-gap" x={x + 210 * 0.82 + 4} y={y + 68.5}>{`SCRIPTS ${group(r.scriptBits)} →`}</text>
          </g>
        );
      })}
      <Value at={[14, rows.length * blockH + 2]} text="BITS, TO SCALE EXCEPT THE BROKEN BAR" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
