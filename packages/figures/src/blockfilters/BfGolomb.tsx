import { BASIC_P } from "@bip-atlas/models/blockfilter";
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedBfGolombFixture } from "../types";
import { group } from "./parts";

/** One code as cells: the unary quotient (ones in ink, then a zero), then the remainder bits, outlined apart. */
export function Code({ x, y, unary, remainder, size }: { x: number; y: number; unary: string; remainder: string; size: number }) {
  return (
    <g>
      <Cells x={x} y={y} values={[...unary]} size={size} strong={(i) => unary[i] === "1"} />
      <g class="k-bf-rem"><Cells x={x + unary.length * size + 3} y={y} values={[...remainder]} size={size} /></g>
    </g>
  );
}

/**
 * golomb-rice-code.v1 — static. BIP 158's P = 2 table drawn as bit cells,
 * each row recomputed by the tested model at build time, then the first code
 * of a published filter with the basic filter's P = 19.
 */
export function BfGolomb({ fixture }: { fixture: DerivedBfGolombFixture }) {
  const d = fixture.derived;
  const e = d.example.code;
  const fixed = Math.ceil(Math.log2(Number(d.example.F)));
  const rowH = 15, y0 = 40, cs = 11;
  const ey = y0 + d.table.length * rowH + 44;
  return (
    <Drawing
      id="a16-gr"
      width={344}
      height={ey + 62}
      title="Golomb-Rice codes"
      desc={`With P = 2, n is split into q = n divided by 4, written as q ones and a zero, and r = n mod 4 in two bits: ${d.table.map((t) => `${t.n} is ${t.code}`).join("; ")}. With P = ${BASIC_P}, the smallest value in block ${d.example.height}'s filter, ${e.delta}, has q = ${e.q} and r = ${e.r}: ${e.unary} then ${e.remainder}, ${e.unary.length + e.remainder.length} bits, where a fixed-width value below F = ${d.example.F} would take ${fixed}.`}
    >
      <Value at={[16, 14]} text="P = 2 · BIP 158'S TABLE, RECOMPUTED" size={8.5} cls="k-value--label" />
      <Value at={[16, y0 - 8]} text="N" size={8} cls="k-value--muted" />
      <Value at={[44, y0 - 8]} text="(Q, R)" size={8} cls="k-value--muted" />
      <Value at={[104, y0 - 8]} text="Q IN UNARY · R IN 2 BITS" size={8} cls="k-value--muted" />
      {d.table.map((t, i) => {
        const [u, r] = t.code.split(" ");
        const y = y0 + i * rowH;
        return (
          <g>
            <Value at={[16, y + 9]} text={String(t.n)} size={9.5} />
            <Value at={[44, y + 9]} text={`(${t.q}, ${t.r})`} size={9} cls="k-value--muted" />
            <Code x={104} y={y} unary={u} remainder={r} size={cs} />
          </g>
        );
      })}
      <Value at={[16, ey - 22]} text={`P = ${BASIC_P} · THE FIRST CODE IN BLOCK ${group(d.example.height)}'S FILTER`} size={8.5} cls="k-value--label" />
      <Value at={[16, ey - 8]} text={`value ${group(e.delta)}: q = ${e.q}, r = ${group(e.r)}`} size={9} />
      <Code x={16} y={ey} unary={e.unary} remainder={e.remainder} size={13} />
      <Bracket x1={16} x2={16 + e.unary.length * 13} y={ey + 16} text="q" />
      <Bracket x1={19 + e.unary.length * 13} x2={19 + (e.unary.length + e.remainder.length) * 13} y={ey + 16} text={`r · ${BASIC_P} bits`} />
      <Value at={[16, ey + 54]} text={`${e.unary.length + e.remainder.length} BITS · FIXED WIDTH BELOW F = ${group(d.example.F)} TAKES ${fixed}`} size={8} cls="k-value--muted" />
    </Drawing>
  );
}
