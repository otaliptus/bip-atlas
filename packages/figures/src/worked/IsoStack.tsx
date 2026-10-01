/**
 * Exploded isometric stack: one slab per step of a worked example, drawn top
 * to bottom with dashed leaders between them. The drawing is decorative and
 * carries only step numbers; every value lives in the numbered legend beside
 * it (WorkedExample), so nothing informative is ever drawn at a tiny size.
 */
export type Tone = "accent" | "wash" | "plain" | "hatch" | "muted" | "fail";

export interface IsoLayer {
  /** Relative slab length, 0.3–1. */
  size?: number;
  tone?: Tone;
  /** Draw this many cells along the slab's long edge (e.g. 12 words). */
  cells?: number;
  /** Cells to fill with the accent (0-based). */
  highlight?: number[];
  /** Cells to mark as different (e.g. checksum bits). */
  mark?: number[];
}

const C = Math.cos(Math.PI / 6);
const S = 0.5;
const W = 300;
const A_MAX = 150;
const B = 52;
const T = 10;
const GAP = 20;

const pt = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;

export function IsoStack({ layers, label }: { layers: IsoLayer[]; label: string }) {
  const tops: number[] = [];
  let y = 8;
  for (const l of layers) {
    tops.push(y);
    const a = A_MAX * (l.size ?? 1);
    y += (a + B) * S + T + GAP;
  }
  const height = y - GAP + 8;
  return (
    <svg class="atlas-iso" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
      <defs>
        <pattern id="atlas-iso-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" class="atlas-iso__hatch-line" />
        </pattern>
      </defs>
      {layers.map((l, i) => {
        const a = A_MAX * (l.size ?? 1);
        const x0 = W / 2 + 10 - ((a - B) * C) / 2;
        const y0 = tops[i];
        const P0 = [x0, y0];
        const P1 = [x0 + a * C, y0 + a * S];
        const P2 = [P1[0] - B * C, P1[1] + B * S];
        const P3 = [x0 - B * C, y0 + B * S];
        const tone = l.tone ?? "plain";
        const cells = l.cells ?? 0;
        const along = (f: number, base: number[]) => [base[0] + a * f * C, base[1] + a * f * S];
        const next = i < layers.length - 1 ? tops[i + 1] : null;
        return (
          <g class="atlas-iso__slab" data-tone={tone}>
            <polygon class="atlas-iso__left" points={[P3, P2, [P2[0], P2[1] + T], [P3[0], P3[1] + T]].map((p) => pt(p[0], p[1])).join(" ")} />
            <polygon class="atlas-iso__right" points={[P2, P1, [P1[0], P1[1] + T], [P2[0], P2[1] + T]].map((p) => pt(p[0], p[1])).join(" ")} />
            <polygon class="atlas-iso__top" points={[P0, P1, P2, P3].map((p) => pt(p[0], p[1])).join(" ")} />
            {tone === "hatch" ? <polygon fill="url(#atlas-iso-hatch)" points={[P0, P1, P2, P3].map((p) => pt(p[0], p[1])).join(" ")} /> : null}
            {Array.from({ length: cells }, (_, k) => {
              const q0 = along(k / cells, P0), q1 = along((k + 1) / cells, P0), q2 = along((k + 1) / cells, P3), q3 = along(k / cells, P3);
              const kind = l.highlight?.includes(k) ? "on" : l.mark?.includes(k) ? "mark" : null;
              return (
                <>
                  {kind ? <polygon class={`atlas-iso__cell atlas-iso__cell--${kind}`} points={[q0, q1, q2, q3].map((p) => pt(p[0], p[1])).join(" ")} /> : null}
                  {k > 0 ? <line class="atlas-iso__grid" x1={q0[0]} y1={q0[1]} x2={q3[0]} y2={q3[1]} /> : null}
                </>
              );
            })}
            {next !== null ? <line class="atlas-iso__leader" x1={W / 2 + 10} y1={P2[1] + T} x2={W / 2 + 10} y2={next + 4} /> : null}
            <g class="atlas-iso__badge">
              <circle cx={P3[0] - 22} cy={P3[1] + T / 2} r="12" />
              <text x={P3[0] - 22} y={P3[1] + T / 2 + 5} text-anchor="middle">{i + 1}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
