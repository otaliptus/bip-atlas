import type { Role } from "../kit";
import type { P2shItemKind } from "../types";

export const ITEM_H = 16;
export const ITEM_GAP = 3;

const roleOf = (k: P2shItemKind): Role => (k === "signature" ? "sig" : k === "public key" ? "public" : k === "hash" ? "hash" : "plain");

/** A number item's value (little-endian, as script numbers are; these are all small and non-negative). */
const numberValue = (hex: string) => parseInt((hex.match(/../g) ?? []).reverse().join("") || "0", 16);

/** The drawn name of one stack item. */
export function itemText(hex: string, kinds: Record<string, P2shItemKind>): string {
  const k = kinds[hex];
  if (!k) throw new Error("stack item without a reviewed kind");
  if (k === "empty") return "empty";
  if (k === "number") return `${numberValue(hex)}${hex === "01" ? " · true" : ""}`;
  return `${k} · ${hex.length / 2} B`;
}

export const stackHeight = (n: number) => Math.max(n, 1) * (ITEM_H + ITEM_GAP) - ITEM_GAP;

/**
 * A script stack drawn as plates, top of the stack at the top. Signatures
 * blue, keys green, hashes yellow; `em` outlines one item (by index from the
 * bottom), `faded` items are drawn dimmed.
 */
export function StackPlates({ x, y, w, items, kinds, em, faded }: { x: number; y: number; w: number; items: string[]; kinds: Record<string, P2shItemKind>; em?: number; faded?: (i: number) => boolean }) {
  const top = [...items].reverse();
  return (
    <g class="k-stack">
      {items.length === 0 ? <text class="k-card__empty" x={x + 5} y={y + 11}>EMPTY STACK</text> : null}
      {top.map((hex, j) => {
        const i = items.length - 1 - j;
        const k = kinds[hex];
        const py = y + j * (ITEM_H + ITEM_GAP);
        return (
          <g data-item={k} class={faded?.(i) ? "k-faded" : undefined}>
            <rect class={`k-cell k-fill--${roleOf(k)}${em === i ? " k-cell--em" : ""}`} x={x} y={py} width={w} height={ITEM_H} />
            <text class="k-card__name" x={x + 5} y={py + 11}>{itemText(hex, kinds)}</text>
          </g>
        );
      })}
    </g>
  );
}

/** Small padlock glyph: a shackle and a body, the body yellow because the lock is a hash. */
export function Padlock({ at }: { at: [number, number] }) {
  const [x, y] = at;
  return (
    <g class="k-lock">
      <path class="k-outline" d={`M${x + 3} ${y + 8} V${y + 4} a5 5 0 0 1 10 0 V${y + 8}`} style="fill:none" />
      <rect class="k-outline k-fill--hash" x={x} y={y + 8} width="16" height="12" rx="1.5" />
      <circle class="k-mark--plain" cx={x + 8} cy={y + 13.5} r="1.6" />
    </g>
  );
}
