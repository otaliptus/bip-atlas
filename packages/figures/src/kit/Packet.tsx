import type { Role } from "./roles";

export interface PacketField { id: string; label: string; bytes: number; role?: Role; value?: string }

interface Seg { field: PacketField; row: number; col: number; len: number; cont: boolean }

function segments(fields: PacketField[], perRow: number): Seg[] {
  const out: Seg[] = [];
  let at = 0;
  for (const field of fields) {
    let left = field.bytes;
    let cont = false;
    while (left > 0) {
      const row = Math.floor(at / perRow), col = at % perRow;
      const len = Math.min(left, perRow - col);
      out.push({ field, row, col, len, cont });
      at += len;
      left -= len;
      cont = true;
    }
  }
  return out;
}

export function packetSize(fields: PacketField[], perRow: number, unit = 9, rowH = 22) {
  const total = fields.reduce((n, f) => n + f.bytes, 0);
  const rows = Math.ceil(total / perRow);
  return { width: perRow * unit, height: rows * rowH, rows };
}

/** Where each field's first segment sits, for leader labels on fields too small to name inside. */
export function packetAnchors(fields: PacketField[], perRow: number, x: number, y: number, unit = 9, rowH = 22) {
  const first = new Map<string, { x: number; y: number; w: number }>();
  for (const s of segments(fields, perRow)) if (!first.has(s.field.id)) first.set(s.field.id, { x: x + s.col * unit, y: y + s.row * rowH, w: s.len * unit });
  return first;
}

/** Field-by-field layout on a byte grid (Making Software's packet diagrams). */
export function Packet({ x, y, fields, perRow, unit = 9, rowH = 22, ruler = false }: { x: number; y: number; fields: PacketField[]; perRow: number; unit?: number; rowH?: number; ruler?: boolean }) {
  const segs = segments(fields, perRow);
  return (
    <g class="k-packet">
      {ruler
        ? Array.from({ length: Math.floor(perRow / 8) + 1 }, (_, k) => (
            <g>
              <line class="k-leader" x1={x + k * 8 * unit} y1={y - 6} x2={x + k * 8 * unit} y2={y - 2} />
              <text class="k-packet__ruler" x={x + k * 8 * unit} y={y - 9} text-anchor="middle">{k * 8}</text>
            </g>
          ))
        : null}
      {segs.map((s) => {
        const sx = x + s.col * unit, sy = y + s.row * rowH, w = s.len * unit;
        const name = s.cont ? `${s.field.label} …cont` : s.field.label;
        const fits = name.length * 5.4 + 8 < w;
        return (
          <g data-field={s.field.id}>
            <rect class={`k-cell k-fill--${s.field.role ?? "plain"}`} x={sx} y={sy} width={w} height={rowH} />
            {fits ? <text class="k-packet__t" x={sx + 4} y={sy + rowH / 2 + 3.2}>{name}</text> : null}
          </g>
        );
      })}
    </g>
  );
}
