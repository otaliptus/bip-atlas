import type { Pt } from "./geom";

export type LampState = "on" | "off" | "idle";

/**
 * A verdict lamp: lit with rays and a tick when a check passes, dark with a
 * cross when it fails, a dashed empty bulb when it has not run. The mark is
 * the cue, not a colour, so it reads the same without colour vision. The
 * label is drawn as given (pass it in capitals, keeping case-sensitive names).
 */
export function Lamp({ at, state, label, r = 8 }: { at: Pt; state: LampState; label?: string; r?: number }) {
  const [x, y] = at;
  const rays = state === "on"
    ? Array.from({ length: 8 }, (_, k) => {
        const a = (k * Math.PI) / 4;
        const c = Math.cos(a), s = Math.sin(a);
        return <line class="k-leader" x1={+(x + c * (r + 2.5)).toFixed(2)} y1={+(y + s * (r + 2.5)).toFixed(2)} x2={+(x + c * (r + 6)).toFixed(2)} y2={+(y + s * (r + 6)).toFixed(2)} />;
      })
    : null;
  return (
    <g class="k-lamp" data-state={state}>
      {rays}
      <circle class={`k-outline k-fill--plain${state === "idle" ? " k-dashed" : ""}${state === "off" ? " k-lamp--off" : ""}`} cx={x} cy={y} r={r} />
      {state === "idle" ? null : <text class={`k-lamp__m${state === "on" ? " k-value--ok" : ""}`} x={x} y={y + 3.6} text-anchor="middle">{state === "on" ? "✓" : "✕"}</text>}
      {label ? <text class="k-lamp__t" x={x} y={y + r + (state === "on" ? 16 : 12)} text-anchor="middle">{label}</text> : null}
    </g>
  );
}

/** Greedy word wrap for SVG text: lines of at most `max` characters (a longer single word stays whole). */
export function wrapLines(text: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > max) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}
