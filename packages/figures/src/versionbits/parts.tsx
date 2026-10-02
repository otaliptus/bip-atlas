import type { Bip8State } from "@bip-atlas/models/versionbits";

export const num = (n: number) => n.toLocaleString("en-US");
/** 202 → "202nd". */
export const ordinal = (n: number) => `${num(n)}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
export const hex32 = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;

/** One-letter code drawn inside a period tile; the state name is always given in text too. */
export const CODE: Record<Bip8State, string> = { DEFINED: "D", STARTED: "S", MUST_SIGNAL: "M", LOCKED_IN: "L", ACTIVE: "A", FAILED: "F" };

/**
 * A retarget period as a tile. States are drawn in ink, not in palette
 * colours (none of the fixed meanings fits a state): DEFINED dashed,
 * STARTED plain, MUST_SIGNAL heavy, LOCKED_IN grey, ACTIVE solid ink,
 * FAILED crossed out. Each carries its letter as the second cue.
 */
export function PeriodTile({ x, y, w, h, state, current = false, text = true }: { x: number; y: number; w: number; h: number; state: Bip8State | null; current?: boolean; text?: boolean }) {
  const cls = state ? `k-vb-tile k-vb-tile--${state.toLowerCase()}` : "k-vb-tile k-vb-tile--pending";
  return (
    <g data-state={state ?? "pending"}>
      <rect class={`${cls}${current ? " k-cell--em" : ""}`} x={x} y={y} width={w} height={h} />
      {state === "FAILED" ? <path class="k-leader" d={`M${x + 2} ${y + h - 2} L${x + w - 2} ${y + 2}`} /> : null}
      {state && text ? (
        <text class={`k-vb-tile__t${state === "ACTIVE" ? " k-cell__t--on" : state === "FAILED" ? " k-vb-tile__t--f" : ""}`} x={x + w / 2} y={y + h / 2 + 3.2} text-anchor="middle">{CODE[state]}</text>
      ) : null}
    </g>
  );
}

/**
 * A dial for one period's count: 0 to 2,016 along a half circle, the
 * threshold as a heavy tick, the needle at the count. `count` null draws
 * an empty dial (the period is not counted).
 */
export function Gauge({ cx, cy, r, period, threshold, count }: { cx: number; cy: number; r: number; period: number; threshold: number; count: number | null }) {
  const at = (n: number, rr: number) => {
    const a = Math.PI * (1 - n / period);
    return [cx + Math.cos(a) * rr, cy - Math.sin(a) * rr] as const;
  };
  const [t1x, t1y] = at(threshold, r - 7), [t2x, t2y] = at(threshold, r + 5);
  const [sx, sy] = at(threshold, r);
  const [ex, ey] = at(period, r);
  return (
    <g class="k-vb-gauge">
      <path class="k-outline k-fill--plain" d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} />
      {/* Arc from the threshold to the full period: the zone that locks in. */}
      <path class="k-vb-gauge__zone" d={`M${sx} ${sy} A${r} ${r} 0 0 1 ${ex} ${ey} L${cx} ${cy} Z`} />
      <line class="k-cut" x1={t1x} y1={t1y} x2={t2x} y2={t2y} />
      {count === null ? null : (
        <>
          <line class="k-vb-gauge__needle" x1={cx} y1={cy} x2={at(count, r - 4)[0]} y2={at(count, r - 4)[1]} />
          <circle class="k-outline k-mark--plain" cx={cx} cy={cy} r="2.5" />
        </>
      )}
      <text class="k-vb-gauge__t" x={cx - r} y={cy + 11} text-anchor="middle">0</text>
      <text class="k-vb-gauge__t" x={cx + r} y={cy + 11} text-anchor="middle">{num(period)}</text>
      <text class="k-vb-gauge__t" x={t2x + 3} y={t2y - 3} text-anchor="start">{num(threshold)}</text>
    </g>
  );
}
