import type { ComponentChildren } from "preact";
import type { Pt } from "./geom";

/**
 * Zoom bubble: a small circle at `from` joined by two tangent lines to a
 * lens at `at`, whose content is clipped to the lens. Draw the content in
 * lens coordinates (centred on `at`).
 */
export function Magnifier({ id, from, fromR = 6, at, r = 40, children }: { id: string; from: Pt; fromR?: number; at: Pt; r?: number; children?: ComponentChildren }) {
  const [fx, fy] = from;
  const [cx, cy] = at;
  const n = Math.atan2(cy - fy, cx - fx) + Math.PI / 2;
  const off = (px: number, py: number, rr: number, s: number): Pt => [px + Math.cos(n) * rr * s, py + Math.sin(n) * rr * s];
  const a1 = off(fx, fy, fromR, 1), a2 = off(fx, fy, fromR, -1), b1 = off(cx, cy, r, 1), b2 = off(cx, cy, r, -1);
  return (
    <g class="k-mag">
      <clipPath id={`${id}-clip`}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <line class="k-leader" x1={a1[0]} y1={a1[1]} x2={b1[0]} y2={b1[1]} />
      <line class="k-leader" x1={a2[0]} y1={a2[1]} x2={b2[0]} y2={b2[1]} />
      <circle class="k-mag__src" cx={fx} cy={fy} r={fromR} />
      <circle class="k-mag__lens" cx={cx} cy={cy} r={r} />
      <g clip-path={`url(#${id}-clip)`}>{children}</g>
      <circle class="k-mag__rim" cx={cx} cy={cy} r={r} />
    </g>
  );
}
