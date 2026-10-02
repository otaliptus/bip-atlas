import { SEQUENCE_LOCKTIME_DISABLE_FLAG, SEQUENCE_LOCKTIME_MASK, SEQUENCE_LOCKTIME_TYPE_FLAG } from "@bip-atlas/models/timelock";
import type { DrawingIds } from "../kit";

/** Bit positions with a meaning under BIP 68, from the model's masks. */
const DISABLE = Math.log2(SEQUENCE_LOCKTIME_DISABLE_FLAG);
const TYPE = Math.log2(SEQUENCE_LOCKTIME_TYPE_FLAG);
const VALUE_BITS = Math.log2(SEQUENCE_LOCKTIME_MASK + 1);

export type BitRole = "disable" | "type" | "value" | "unused";
/** What bit b means under BIP 68 when bit 31 is clear (with it set, nothing else means anything). */
export const bitRole = (b: number): BitRole => (b === DISABLE ? "disable" : b === TYPE ? "type" : b < VALUE_BITS ? "value" : "unused");

export const CELL = 9.5;

/**
 * A 32-bit field as cells, bit 31 on the left: the disable flag outlined
 * heavily, the type flag and the 16 value bits orange (time), the rest plain
 * and faded (no meaning under BIP 68). A 1 is a saturated cell.
 */
export function BitRow({ x, y, n, label, ruler, focus }: { x: number; y: number; n: number; label: string; ids?: DrawingIds; ruler?: boolean; /** Bits the current step looks at; the others are dimmed. */ focus?: (b: number) => boolean }) {
  return (
    <g class="k-bits" data-bits={(n >>> 0).toString(2).padStart(32, "0")}>
      {ruler
        ? [31, 22, 15, 0].map((b) => (
            <text class="k-card__type" x={x + (31 - b) * CELL + CELL / 2} y={y - 4} text-anchor="middle">{b}</text>
          ))
        : null}
      {Array.from({ length: 32 }, (_, k) => {
        const b = 31 - k;
        const on = ((n >>> b) & 1) === 1;
        const role = bitRole(b);
        const fill = role === "unused" ? (on ? "k-mark--plain" : "k-fill--plain") : role === "disable" ? (on ? "k-mark--plain" : "k-fill--plain") : on ? "k-mark--time" : "k-fill--time";
        return (
          <rect
            class={`k-cell ${fill}${role === "disable" || role === "type" ? " k-cell--em" : ""}`}
            x={x + k * CELL}
            y={y}
            width={CELL}
            height="12"
            style={focus && !focus(b) ? "opacity:0.25" : role === "unused" && !on ? "opacity:0.45" : undefined}
          />
        );
      })}
      <text class="k-card__name" x={x} y={y + 24}>{`${label} · ${on31(n) ? "BIT 31 SET" : "BIT 31 CLEAR"}`}</text>
    </g>
  );
}

const on31 = (n: number) => ((n >>> DISABLE) & 1) === 1;
