import type { DrawingIds } from "./Drawing";
import type { Pt } from "./geom";

/** Thin arrow along an SVG path, with an optional uppercase label. */
export function Arrow({ d, ids, label, at }: { d: string; ids: DrawingIds; label?: string; at?: Pt }) {
  return (
    <g class="k-arrow">
      <path class="k-line" d={d} marker-end={ids.arrow} />
      {label && at ? <text class="k-arrow__t" x={at[0]} y={at[1]} text-anchor="middle">{label.toUpperCase()}</text> : null}
    </g>
  );
}
