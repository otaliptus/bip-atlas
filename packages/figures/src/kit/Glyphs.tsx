import type { Pt } from "./geom";

/** Key icon (bow, shaft, bit). Public keys green, secret keys red; label sits below. */
export function KeyGlyph({ at, role = "public", label, scale = 1 }: { at: Pt; role?: "public" | "secret"; label?: string; scale?: number }) {
  const [x, y] = at;
  return (
    <g class="k-key" data-role={role}>
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <circle class={`k-outline k-mark--${role}`} cx="6" cy="6" r="5.5" />
        <circle class="k-outline k-fill--plain" cx="6" cy="6" r="2" />
        <path class={`k-outline k-mark--${role}`} d="M11.5 4.5 H30 V7.5 H27.5 V10.5 H24.5 V7.5 H11.5 Z" />
      </g>
      {label ? <text class="k-key__t" x={x + 15 * scale} y={y + 12 * scale + 12} text-anchor="middle">{label.toUpperCase()}</text> : null}
    </g>
  );
}

/** Retro desktop computer (Making Software's actor). 26 × 27 units. */
export function Computer({ at, label }: { at: Pt; label?: string }) {
  const [x, y] = at;
  return (
    <g class="k-actor" transform={`translate(${x} ${y})`}>
      <rect class="k-outline k-fill--plain" x="0" y="0" width="26" height="20" rx="1.5" />
      <rect class="k-outline k-fill--net" x="3.5" y="3.5" width="19" height="12" />
      <rect class="k-outline k-fill--plain" x="8" y="20" width="10" height="3.5" />
      <rect class="k-outline k-fill--plain" x="3" y="23.5" width="20" height="3.5" />
      {label ? <text class="k-actor__t" x="13" y="39" text-anchor="middle">{label.toUpperCase()}</text> : null}
    </g>
  );
}

/** Dashed vertical boundary with an uppercase label at its top (e.g. OPEN NETWORK). */
export function Boundary({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  return (
    <g class="k-boundary">
      <line class="k-boundary__line" x1={x} y1={y1} x2={x} y2={y2} />
      <text class="k-boundary__t" x={x + 5} y={y1 + 8}>{label.toUpperCase()}</text>
    </g>
  );
}
