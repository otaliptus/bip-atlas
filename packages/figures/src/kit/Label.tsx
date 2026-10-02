import type { Pt } from "./geom";

type Side = "left" | "right" | "up" | "down";

/** A short leader line from an anchor to an uppercase monospace label (Making Software style). */
export function Label({ at, text, side = "right", len = 16, dy = 0 }: { at: Pt; text: string; side?: Side; len?: number; dy?: number }) {
  const [x, y] = at;
  if (side === "up" || side === "down") {
    const s = side === "down" ? 1 : -1;
    const y2 = y + s * len;
    return (
      <g class="k-label">
        <line class="k-leader" x1={x} y1={y} x2={x} y2={y2} />
        <text x={x} y={side === "down" ? y2 + 10 : y2 - 4} text-anchor="middle">{text.toUpperCase()}</text>
      </g>
    );
  }
  const s = side === "right" ? 1 : -1;
  const x2 = x + s * len;
  return (
    <g class="k-label">
      <line class="k-leader" x1={x} y1={y} x2={x2} y2={y + dy} />
      <text x={x2 + s * 4} y={y + dy + 3.3} text-anchor={side === "right" ? "start" : "end"}>{text.toUpperCase()}</text>
    </g>
  );
}

/** A value (hex, number, word) in ordinary monospace, normal case. */
export function Value({ at, text, anchor = "start", size = 10, cls = "" }: { at: Pt; text: string; anchor?: "start" | "middle" | "end"; size?: number; cls?: string }) {
  return (
    <text class={`k-value ${cls}`.trim()} x={at[0]} y={at[1]} text-anchor={anchor} style={size === 10 ? undefined : `font-size:${size}px`}>
      {text}
    </text>
  );
}
