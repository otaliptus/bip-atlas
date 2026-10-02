import { Drawing, Label, Value } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * last-word-odds.v1 — static. Keep the first n − 1 words, try all 2,048
 * possible last words: the filled cells are the ones whose checksum passes.
 */
export function LastWordOdds({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { validIndices, actualIndex, prefixWords } = fixture.derived.lastWord;
  const valid = new Set(validIndices);
  const n = fixture.derived.wordlistSize;
  const cols = 64, size = 4.75, x0 = 14, y0 = 40;
  const rows = n / cols;
  const ratio = n / validIndices.length;
  const lastWord = fixture.mnemonic.split(" ").at(-1);
  const ax = x0 + (actualIndex % cols) * size + size / 2;
  const ay = y0 + Math.floor(actualIndex / cols) * size + size / 2;
  const bottom = y0 + rows * size;
  return (
    <Drawing
      id="a01-odds"
      width={340}
      height={bottom + 40}
      title="How often a random last word passes"
      desc={`With the first ${prefixWords} words of the sample fixed, each of the ${fmt(n)} possible last words was checked. Cells are in wordlist order, ${cols} per row, from index 0 at the top left to ${fmt(n - 1)} at the bottom right. ${validIndices.length} pass the checksum, one in ${ratio}. The published last word, “${lastWord}”, index ${actualIndex}, is one of them.`}
    >
      <Value at={[x0, 14]} text={`${prefixWords} words fixed: ${fixture.mnemonic.split(" ").slice(0, 2).join(" ")} … + ?`} size={9.5} />
      <Value at={[x0, 29]} text={`${fmt(validIndices.length)} OF ${fmt(n)} PASS · 1 IN ${ratio}`} size={9.5} cls="k-value--check" />
      <Value at={[x0 + cols * size, 29]} text={`#0 → #${fmt(n - 1)}`} anchor="end" size={8} cls="k-value--muted" />
      {Array.from({ length: n }, (_, i) => (
        <rect class={`k-dot ${valid.has(i) ? "k-mark--check" : "k-fill--plain"}`} x={x0 + (i % cols) * size} y={y0 + Math.floor(i / cols) * size} width={size} height={size} />
      ))}
      <circle class="k-ring" cx={ax} cy={ay} r={5} />
      <Label at={[ax, ay + 5]} side="down" len={bottom - ay + 6} text={`published word ${lastWord} · #${actualIndex}`} />
    </Drawing>
  );
}
