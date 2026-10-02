import type { Role } from "../kit";

/** A part of a byte string: a single byte drawn as a cell with its hex, or a block drawn to scale. */
export type Part =
  | { kind: "byte"; hex: string; role?: Role; note?: string }
  | { kind: "block"; bytes: number; role: Role; text: string };

export interface PlacedPart { part: Part; x: number; w: number }

/** Places parts left to right: bytes as `cell`-wide cells, blocks at `perByte` units per byte. */
export function placeParts(parts: Part[], x: number, cell: number, perByte: number): PlacedPart[] {
  let at = x;
  return parts.map((part) => {
    const w = part.kind === "byte" ? cell : part.bytes * perByte;
    const p = { part, x: at, w };
    at += w;
    return p;
  });
}

/** Draws placed parts as one row: byte cells show their hex, blocks their label. */
export function PartsRow({ placed, y, h = 20 }: { placed: PlacedPart[]; y: number; h?: number }) {
  return (
    <g class="k-parts">
      {placed.map(({ part, x, w }) => (
        <g>
          <rect class={`k-cell k-fill--${part.role ?? "plain"}`} x={x} y={y} width={w} height={h} />
          <text class={part.kind === "byte" ? "k-cell__t" : "k-packet__t"} x={part.kind === "byte" ? x + w / 2 : x + 5} y={y + h / 2 + 3.3} text-anchor={part.kind === "byte" ? "middle" : "start"}>
            {part.kind === "byte" ? part.hex : part.text}
          </text>
        </g>
      ))}
    </g>
  );
}
