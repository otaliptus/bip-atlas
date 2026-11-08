import { Value } from "../kit";
import type { DerivedBip85Fixture } from "../types";

/** Fixed-width lines of a long string (keys, hex), for monospace drawing. */
export const chunks = (s: string, n: number) => s.match(new RegExp(`.{1,${n}}`, "g")) ?? [""];

/** The path after m as cells, each level's value over what it selects. Returns the drawing and its width. */
export function PathRibbon({ x, y, f, cellW, em }: { x: number; y: number; f: DerivedBip85Fixture; cellW: number; em?: number }) {
  const levels = f.derived.levels;
  return (
    <g class="k-bip85-path">
      <Value at={[x, y + 15]} text="m" size={11} />
      {levels.map((l, i) => {
        const cx = x + 16 + i * (cellW + 4);
        return (
          <g data-level={i}>
            <rect class={`k-cell k-fill--secret${em === i ? " k-cell--em" : ""}`} x={cx} y={y} width={cellW} height={22} />
            <Value at={[cx + cellW / 2, y + 15]} text={l.value} size={l.value.length > 7 ? 8.5 : 10} anchor="middle" />
            <Value at={[cx + cellW / 2, y + 34]} text={l.meaning.toUpperCase()} size={7.5} anchor="middle" cls="k-value--muted" />
          </g>
        );
      })}
    </g>
  );
}
export const pathRibbonWidth = (f: DerivedBip85Fixture, cellW: number) => 16 + f.derived.levels.length * (cellW + 4) - 4;

/**
 * The 64 entropy bytes as cells, `perRow` to a row. Bytes an application
 * reads are filled (secret, the derived material); bytes it drops are faded.
 */
export function ByteBar({ x, y, f, size, perRow = 64 }: { x: number; y: number; f: DerivedBip85Fixture; size: number; perRow?: number }) {
  const used = (i: number) => f.derived.uses.find((u) => i >= u.from && i < u.to);
  return (
    <g class="k-bip85-bytes">
      {Array.from({ length: 64 }, (_, i) => {
        const u = used(i);
        const cx = x + (i % perRow) * size;
        const cy = y + Math.floor(i / perRow) * (size + 3);
        const second = f.derived.uses.length > 1 && u === f.derived.uses[1];
        return <rect class={`k-cell ${u ? (second ? "k-mark--secret" : "k-fill--secret") : "k-fill--plain k-faded"}`} x={cx} y={cy} width={size} height={size} data-used={u ? "true" : "false"} />;
      })}
    </g>
  );
}
export const byteBarHeight = (size: number, perRow = 64) => Math.ceil(64 / perRow) * (size + 3) - 3;

/** One line per use: which bytes, and what they become. */
export const usesText = (f: DerivedBip85Fixture) =>
  f.derived.uses.map((u) => (u.from === 0 && u.to === 64 ? `ALL 64 BYTES: ${u.as}` : `BYTES ${u.from + 1}–${u.to}: ${u.as}`).toUpperCase());

/** The application's output, laid out by kind, at most `width` units wide. Returns the lines drawn. */
export function outputLines(f: DerivedBip85Fixture, width: number): string[] {
  const d = f.derived;
  const perLine = Math.max(8, Math.floor(width / 5.6));
  if (d.outputKind === "words") {
    const words = d.output.split(" ");
    const perRow = width >= 400 ? 6 : 4;
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += perRow) lines.push(words.slice(i, i + perRow).map((w, k) => `${String(i + k + 1).padStart(2, "0")} ${w}`).join("  "));
    return lines;
  }
  if (d.outputKind === "rolls") return [d.output.split(",").join(", ")];
  return chunks(d.output, perLine);
}

export const OUTPUT_NAME: Record<DerivedBip85Fixture["derived"]["outputKind"], string> = {
  entropy: "64 bytes of entropy",
  words: "BIP 39 mnemonic",
  wif: "WIF private key",
  xprv: "extended private key",
  hex: "hex string",
  password: "password",
  rolls: "dice rolls, zero-indexed",
};
