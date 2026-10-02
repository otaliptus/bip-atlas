import type { Role } from "../kit";
import type { SpInputView } from "../types";

/** First 8 hex digits and an ellipsis; every figure using it lists the exact value too. */
export const short = (hex: string) => (hex.length > 12 ? `${hex.slice(0, 8)}…` : hex);

export const KIND: Record<string, string> = { p2pkh: "P2PKH", "p2sh-p2wpkh": "P2SH-P2WPKH", p2wpkh: "P2WPKH", p2tr: "P2TR", other: "other" };
/** The input type as a reader would name it (a P2SH input that does not wrap P2WPKH is just "P2SH"). */
export const kindOf = (i: SpInputView) => (i.kind === "other" && i.skipped?.startsWith("P2SH") ? "P2SH" : KIND[i.kind]);

/** A labelled value chip: a pastel cell with one line of small text. */
export function Chip({ x, y, w, role, text, dashed = false, hatch }: { x: number; y: number; w: number; role: Role; text: string; dashed?: boolean; hatch?: string }) {
  return (
    <g>
      <rect class={`k-cell k-fill--${role}${dashed ? " k-dashed" : ""}`} x={x} y={y} width={w} height="14" style={hatch ? `fill:${hatch}` : undefined} />
      <text class="k-value" x={x + 4} y={y + 10} style="font-size:8px">{text}</text>
    </g>
  );
}
