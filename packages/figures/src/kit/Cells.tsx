import type { Role } from "./roles";

export interface CellsProps {
  x: number;
  y: number;
  /** One entry per cell; the text drawn inside it (empty string for none). */
  values: string[];
  size?: number;
  perRow?: number;
  rowGap?: number;
  roleOf?: (i: number) => Role;
  /** Saturated fill instead of pastel (e.g. a 1 bit). */
  strong?: (i: number) => boolean;
  text?: boolean;
  /** Draw a cut mark before every n-th cell (e.g. 11 for BIP 39 groups); none at a row start. */
  cutEvery?: number;
  /** Thick outline (e.g. the selected group). */
  emphasis?: (i: number) => boolean;
  /** `fill` for hidden cells, from `idsFor(...).hatch`. */
  hatch?: string;
}

export function cellsSize(n: number, { size = 12, perRow = n, rowGap = 4 }: { size?: number; perRow?: number; rowGap?: number } = {}) {
  const rows = Math.ceil(n / perRow);
  return { width: Math.min(n, perRow) * size, height: rows * size + (rows - 1) * rowGap, rows };
}

/** Row or grid of square cells: bits, bytes or characters. */
export function Cells({ x, y, values, size = 12, perRow = values.length, rowGap = 4, roleOf = () => "plain", strong, text = true, cutEvery, emphasis, hatch }: CellsProps) {
  return (
    <g class="k-cells">
      {values.map((v, i) => {
        const cx = x + (i % perRow) * size;
        const cy = y + Math.floor(i / perRow) * (size + rowGap);
        const role = roleOf(i);
        const tone = strong?.(i) ? "k-mark" : "k-fill";
        return (
          <g>
            <rect
              class={`k-cell ${tone}--${role}${emphasis?.(i) ? " k-cell--em" : ""}`}
              x={cx}
              y={cy}
              width={size}
              height={size}
              style={role === "hidden" && hatch ? `fill:${hatch}` : undefined}
            />
            {text && v ? (
              <text class={`k-cell__t${strong?.(i) ? " k-cell__t--on" : ""}`} x={cx + size / 2} y={cy + size / 2 + 3.4} text-anchor="middle">{v}</text>
            ) : null}
            {cutEvery && i % perRow !== 0 && i % cutEvery === 0 ? <line class="k-cut" x1={cx} y1={cy - 3} x2={cx} y2={cy + size + 3} /> : null}
          </g>
        );
      })}
    </g>
  );
}

/** Square bracket under (or over) a range, with a centred uppercase label. */
export function Bracket({ x1, x2, y, text, below = true, align = "middle" }: { x1: number; x2: number; y: number; text: string; below?: boolean; align?: "start" | "middle" }) {
  const s = below ? 1 : -1;
  const t = y + s * 5;
  const mid = (x1 + x2) / 2;
  const tx = align === "start" ? x1 : mid;
  return (
    <g class="k-label">
      <path class="k-leader" d={`M${x1} ${y} V${t} H${x2} V${y} M${tx === x1 ? x1 + 1 : mid} ${t} V${t + s * 5}`} />
      <text x={tx} y={below ? t + 17 : t - 9} text-anchor={align}>{text.toUpperCase()}</text>
    </g>
  );
}
