import { Arrow, Cells, Drawing, IsoBox, Label, Value, idsFor, iso, onTop } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/** wordlist-index.v1 — static. Eleven bits make a number from 0 to 2,047, which picks one card from a stack of 2,048. */
export function WordlistIndex({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const g = fixture.derived.groups[0];
  const sample = fixture.derived.wordlistSample;
  const ids = idsFor("a01-list");
  const card = iso(252, 67);
  return (
    <Drawing
      id="a01-list"
      width={340}
      height={262}
      title="Eleven bits pick one word of 2,048"
      desc={`The first 11-bit group of the sample, ${g.bits}, is the number ${g.index}, and entry ${g.index} of the 2,048-word English list is “${g.word}”. The list begins ${sample.map((s) => `${s.index} ${s.word}`).join(", ")}; no two words share their first four letters.`}
    >
      <Cells x={14} y={20} values={[...g.bits]} size={14} roleOf={(i) => (i < g.entropyBitCount ? "secret" : "check")} strong={(i) => g.bits[i] === "1"} />
      <Label at={[91, 34]} side="down" len={12} text="11 bits" />
      <Arrow d="M174 27 H196" ids={ids} />
      <Value at={[204, 31]} text={String(g.index)} size={14} />
      {Array.from({ length: 6 }, (_, k) => <IsoBox at={[220, 96 + (5 - k) * 7]} w={92} d={56} h={3} role="plain" />)}
      <IsoBox at={[252, 70]} w={92} d={56} h={3} role="public" />
      <text class="k-engrave" transform={onTop(card(10, 22, 0))}>{String(g.index)}</text>
      <text class="k-engrave k-engrave--word" transform={onTop(card(10, 38, 0))}>{g.word}</text>
      <Label at={[172, 128]} side="left" len={10} text="2,048 cards" />
      <Value at={[158, 144]} text="INDEX 0–2,047" anchor="end" size={9.5} cls="k-value--label" />
      <Value at={[14, 204]} text="FIRST FOUR LETTERS NEVER REPEAT" size={9.5} cls="k-value--label" />
      {sample.map((s, i) => (
        <g transform={`translate(${14 + i * 106} 214)`}>
          <rect class="k-outline k-fill--plain" width="96" height="30" />
          <text class="k-value k-value--muted" x="6" y="12" style="font-size:8px">{s.index}</text>
          <text class="k-value" x="6" y="25"><tspan class="k-first4">{s.word.slice(0, 4)}</tspan>{s.word.slice(4)}</text>
        </g>
      ))}
    </Drawing>
  );
}
