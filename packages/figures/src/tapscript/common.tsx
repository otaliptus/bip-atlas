import { IsoBox, Value } from "../kit";
import type { Role } from "../kit";
import type { DerivedTapscriptFixture, TapscriptElement, TapscriptTraceView } from "../types";

/** First 8 hex digits and an ellipsis for long values; every figure that uses it lists the exact value too. */
export const shortHex = (hex: string) => (hex.length > 16 ? `${hex.slice(0, 8)}…` : hex === "" ? "(empty)" : hex);

/** Serialized size of one witness item: its compact-size length prefix plus its bytes (as derive.ts counts it). */
export const itemSize = (bytes: number) => (bytes < 253 ? 1 : 3) + bytes;

/** Colour role of a stack element, from its reading: signatures blue, 32-byte keys green, the rest plain. */
export function elementRole(e: TapscriptElement): Role {
  if (e.label.endsWith("signature")) return "sig";
  if (e.label === "32-byte key" || e.label.includes("key, unknown type")) return "public";
  return "plain";
}

export const caseName = (f: DerivedTapscriptFixture) => `case ${f.caseIndex}`;

/** Where a run ends, as one of the six gates of BIP 342's order (1-based), and how. */
export function runEnd(v: TapscriptTraceView): { gate: number; how: "valid" | "op-success" | "fail" } {
  if (v.opSuccess !== null) return { gate: 3, how: "op-success" };
  if (v.valid) return { gate: 6, how: "valid" };
  const gate = { bip141: 1, commitment: 1, decode: 3, "initial-stack": 4, execute: 5, "final-stack": 6 }[v.failStage ?? ""];
  if (!gate) throw new Error(`unknown fail stage ${v.failStage}`);
  return { gate, how: "fail" };
}

/**
 * A stack drawn as thin isometric plates, bottom element lowest. `ids` are
 * indices into the view's elements, bottom of stack first (the derive order).
 * Each plate is labelled on the right by its reading.
 */
export function StackPlates({ x, y, ids, view, hatch, gap = 15, w = 56, max = 6 }: { x: number; y: number; ids: number[]; view: TapscriptTraceView; hatch: string; gap?: number; w?: number; max?: number }) {
  const shown = ids.slice(-max);
  const hidden = ids.length - shown.length;
  const d = 22, h = 5;
  // The top of the drawing is the top plate; plate k (0 = bottom of what is shown) sits gap units higher than k − 1.
  const baseY = y + (shown.length - 1) * gap;
  return (
    <g class="k-stack">
      {shown.length === 0 ? (
        <>
          <rect class="k-outline k-fill--plain k-dashed" x={x - 16} y={y} width={w + 8} height="16" />
          <Value at={[x + w / 2 - 12, y + 11.5]} text="empty stack" size={8.5} anchor="middle" cls="k-value--muted" />
        </>
      ) : null}
      {shown.map((id, k) => {
        const e = view.elements[id];
        const at: [number, number] = [x, baseY - k * gap];
        const role = elementRole(e);
        return (
          <g data-element={e.label}>
            <IsoBox at={at} w={w} d={d} h={h} role={role} hatch={hatch} cls={e.bytes === 0 ? "k-iso--dashed" : ""} />
            <line class="k-leader" x1={at[0] + w * 0.866 + 2} y1={at[1] + (w + d / 2) / 2 - h / 2 - 4} x2={at[0] + w * 0.866 + 12} y2={at[1] + (w + d / 2) / 2 - h / 2 - 4} />
            <Value at={[at[0] + w * 0.866 + 15, at[1] + (w + d / 2) / 2 - h / 2 - 1]} text={k === shown.length - 1 ? `${e.label} · top` : e.label} size={8.5} />
          </g>
        );
      })}
      {hidden > 0 ? <Value at={[x, baseY + (w + d) / 2 + 12]} text={`+ ${hidden} more below`} size={8} cls="k-value--muted" /> : null}
    </g>
  );
}

/** Height a StackPlates drawing needs for n plates. */
export const stackHeight = (n: number, gap = 15, w = 56) => Math.max(0, Math.min(n, 6) - 1) * gap + (w + 22) / 2 + 2;
