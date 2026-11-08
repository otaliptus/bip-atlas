import { Cells } from "../kit";

/** 1234567 → "1,234,567" (decimal strings from the model may exceed 2^53). */
export const group = (n: string | number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** First bytes of a script with an ellipsis; "(empty)" for a nil item. Exact values go in a disclosure. */
export const shortHex = (hex: string, n = 6) => (hex === "" ? "(empty)" : hex.length > n * 2 ? `${hex.slice(0, n * 2)}…` : hex);
/** "block 180480" → "block 180,480". */
export const fromText = (from: string) => from.replace(/\d+/, (m) => group(m));
/** x position of a value in [0, F) on a line from x0 to x1. */
export const along = (v: string, F: string, x0: number, x1: number) => (F === "0" ? x0 : x0 + (Number((BigInt(v) * 100000n) / BigInt(F)) / 100000) * (x1 - x0));

/** One code as cells: the unary quotient (ones in ink, then a zero), then the remainder bits, outlined apart. */
export function Code({ x, y, unary, remainder, size }: { x: number; y: number; unary: string; remainder: string; size: number }) {
  return (
    <g>
      <Cells x={x} y={y} values={[...unary]} size={size} strong={(i) => unary[i] === "1"} />
      <g class="k-bf-rem"><Cells x={x + unary.length * size + 3} y={y} values={[...remainder]} size={size} /></g>
    </g>
  );
}
