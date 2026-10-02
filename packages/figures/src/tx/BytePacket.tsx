import type { Role } from "../kit";

export interface ByteField {
  id: string;
  short: string;
  bytes: number;
  role: Role;
  /** Drawn hatched: not covered by the current view. */
  hatched?: boolean;
  /** Drawn faded: present but not used by the current view. */
  faded?: boolean;
  /** Dashed outline: not in the transaction (supplied from outside). */
  outside?: boolean;
  em?: boolean;
  /** Numbered badges (BIP 143 preimage items this field feeds). */
  badges?: number[];
}

export interface PacketSeg { field: ByteField; x: number; y: number; w: number; first: boolean }

/** Lay fields on a byte grid, wrapping rows at `perRow` bytes. */
export function layoutBytes(fields: ByteField[], perRow: number, x: number, y: number, unit: number, rowH: number, gap = 0): PacketSeg[] {
  const out: PacketSeg[] = [];
  let at = 0;
  for (const field of fields) {
    let left = field.bytes;
    let first = true;
    while (left > 0) {
      const row = Math.floor(at / perRow), col = at % perRow;
      const len = Math.min(left, perRow - col);
      out.push({ field, x: x + col * unit, y: y + row * (rowH + gap), w: len * unit, first });
      at += len;
      left -= len;
      first = false;
    }
  }
  return out;
}

export const bytesHeight = (total: number, perRow: number, rowH: number, gap = 0) => {
  const rows = Math.ceil(total / perRow);
  return rows * rowH + (rows - 1) * gap;
};

/**
 * A serialized structure on a byte grid (Making Software's packet diagrams),
 * with the SegWit figures' extra marks: hatched (not covered by this hash),
 * faded (not used), dashed (supplied from outside) and numbered badges.
 */
export function BytePacket({ segs, hatch, ruler, perRow, unit, x, y, rowH }: { segs: PacketSeg[]; hatch: string; ruler?: boolean; perRow: number; unit: number; x: number; y: number; rowH: number }) {
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
        const f = s.field;
        const fits = s.first && f.short.length * 5.5 + 8 < s.w;
        return (
          <g data-field={f.id} data-hatched={f.hatched ? "true" : undefined} class={f.faded ? "k-faded" : undefined}>
            <rect
              class={`k-cell k-fill--${f.role}${f.em ? " k-cell--em" : ""}${f.outside ? " k-dashed" : ""}`}
              x={s.x}
              y={s.y}
              width={s.w}
              height={rowH}
              style={f.hatched ? `fill:${hatch}` : undefined}
            />
            {fits ? (
              <text class="k-packet__t" x={s.x + 4} y={s.y + rowH / 2 + 3.2}>{f.short}</text>
            ) : !s.first && s.w > 14 ? (
              // A continuation of a field from the row above.
              <text class="k-packet__t" x={s.x + 4} y={s.y + rowH / 2 + 3.2}>{s.w > f.short.length * 5.5 + 26 ? `…${f.short}` : "…"}</text>
            ) : null}
          </g>
        );
      })}
      {segs.filter((s) => s.first && s.field.badges?.length).map((s) =>
        s.field.badges!.map((n, k) => (
          <g class="k-badge">
            <circle class="k-outline k-fill--plain" cx={s.x + 6 + k * 13} cy={s.y} r="6" />
            <text x={s.x + 6 + k * 13} y={s.y + 2.9} text-anchor="middle">{n}</text>
          </g>
        )),
      )}
    </g>
  );
}
