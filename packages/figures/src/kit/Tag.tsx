import type { Pt } from "./geom";

/**
 * A leader line to a label that keeps its case. Use it instead of `Label`
 * when case carries meaning: in BIP 32, k is a private key and K its public
 * key, m the master private key and M the master public key.
 */
export function Tag({ at, text, len = 14, side = "right", cls = "k-value--label" }: { at: Pt; text: string; len?: number; side?: "left" | "right"; cls?: string }) {
  const s = side === "right" ? 1 : -1;
  const x2 = at[0] + s * len;
  return (
    <g class="k-label k-tag">
      <line class="k-leader" x1={at[0]} y1={at[1]} x2={x2} y2={at[1]} />
      <text class={`k-value ${cls}`.trim()} x={x2 + s * 4} y={at[1] + 3.2} text-anchor={side === "right" ? "start" : "end"} style="font-size:9px">{text}</text>
    </g>
  );
}
