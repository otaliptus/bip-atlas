import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Arrow, Bracket, Cells, Drawing, IsoBox, Label, Responsive, Value, cellsSize, idsFor, iso, onTop } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

interface Props {
  fixtures: DerivedMnemonicFixture[];
  figureId: string;
}

/**
 * entropy-word-pipeline.v1 — the Mnemonics chapter's hero (drawing-first).
 *
 * The drawing is a ribbon of every bit (entropy pink, checksum purple). The
 * step slider cuts it into 11-bit groups one at a time; the selected group
 * drops out as a number and pulls its card from the wordlist, and the
 * sentence below fills in. Controls: a 128/256-bit strip, sample chips and
 * the slider. All values come from the tested model; nothing is typed in.
 */
export function EntropyWordLab({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const sizes = [...new Set(fixtures.map((f) => f.derived.layout.entropyBits))].sort((a, b) => a - b);
  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const { layout, groups, entropyBits, checksumBits } = fixture.derived;
  // Hydrated, the reader starts from uncut bits (as the prose says) and cuts one group at a time.
  const [step, setStep] = useState(0);
  // Without JavaScript: every group cut, last group selected (the static equivalent).
  const shown = hydrated ? Math.min(step, groups.length) : groups.length;
  const sel = shown > 0 ? groups[shown - 1] : null;
  const bits = [...(entropyBits + checksumBits)];
  const size = layout.entropyBits;

  const choose = (id: string) => {
    setFixtureId(id);
    setStep(0);
  };

  const cutSoFar = groups.slice(0, shown).map((g) => `${g.position + 1} ${g.word} (#${g.index})`).join(", ");
  const describe = () =>
    `${layout.entropyBits} entropy bits followed by ${layout.checksumBits} checksum bits make ${layout.totalBits} bits, ` +
    `${layout.wordCount} groups of 11. ` +
    (shown ? `Groups cut so far, with wordlist index counted from 0: ${cutSoFar}.` : "None cut yet.");
  const status = sel
    ? `Word ${sel.position + 1} of ${layout.wordCount}: bits ${sel.bits} are ${sel.index}, “${sel.word}”.` +
      (sel.checksumBitCount ? ` ${sel.entropyBitCount} entropy bits and ${sel.checksumBitCount} checksum bits.` : "")
    : `${fixture.label}: ${layout.entropyBits} entropy bits and ${layout.checksumBits} checksum bits, not yet cut. Move the slider to cut them into groups of 11.`;

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const perRow = wide ? 44 : 22;
    const cell = wide ? 13 : 12.5;
    const W = wide ? 640 : 330;
    const x0 = (W - perRow * cell) / 2;
    const rib = cellsSize(bits.length, { size: cell, perRow, rowGap: 7 });
    const y0 = 34;
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const inSel = (i: number) => sel !== null && Math.floor(i / 11) === sel.position;
    const dy = y0 + rib.height + 34;
    const card = wide ? iso(430, dy + 6) : iso(200, dy + 44);
    const chipsPerRow = wide ? 6 : 3;
    const chipW = (W - 2 * x0) / chipsPerRow;
    const chipsY = dy + (wide ? 110 : 160);
    const H = chipsY + Math.ceil(groups.length / chipsPerRow) * 26 + 10;
    return (
      <Drawing id={id} width={W} height={H} title={`From ${layout.totalBits} bits to ${layout.wordCount} words`} desc={describe()}>
        <Value at={[x0, 18]} text={`${layout.entropyBits} ENTROPY BITS + ${layout.checksumBits} CHECKSUM = ${layout.totalBits} BITS`} size={9} cls="k-value--label" />
        <Cells
          x={x0}
          y={y0}
          values={bits.map(() => "")}
          size={cell}
          perRow={perRow}
          rowGap={7}
          text={false}
          roleOf={(i) => (i < layout.entropyBits ? "secret" : "check")}
          strong={(i) => bits[i] === "1"}
          cutBefore={(i) => i % 11 === 0 && i / 11 <= shown}
          emphasis={inSel}
        />
        <Bracket
          x1={x0 + (layout.entropyBits % perRow) * cell}
          x2={x0 + perRow * cell}
          y={y0 + rib.height + 3}
          text={`checksum · ${layout.checksumBits}`}
        />
        {sel ? (
          <>
            <Value at={[x0, dy - 7]} text={`GROUP ${sel.position + 1} · 11 BITS`} size={9} cls="k-value--label" />
            <Cells x={x0} y={dy} values={[...sel.bits]} size={16} roleOf={(i) => (i < sel.entropyBitCount ? "secret" : "check")} strong={(i) => sel.bits[i] === "1"} />
            {sel.checksumBitCount ? <Bracket x1={x0 + sel.entropyBitCount * 16} x2={x0 + 176} y={dy + 19} text="checksum" /> : null}
            <Arrow d={`M${x0 + 184} ${dy + 8} H${x0 + 210}`} ids={ids} />
            <Value at={[x0 + 216, dy + 14]} text={String(sel.index)} size={16} />
            <IsoBox at={[card(0, 0)[0], card(0, 0)[1] + 3]} w={96} d={54} h={3} role="public" />
            <text class="k-engrave" transform={onTop(card(10, 20, 0))}>{`#${sel.index}`}</text>
            <text class="k-engrave k-engrave--word" transform={onTop(card(10, 38, 0))}>{sel.word}</text>
            {wide ? <Label at={card(96, 27, 0)} side="right" len={10} text="wordlist card" /> : <Label at={card(0, 54, 0)} side="left" len={10} text="wordlist card" />}
          </>
        ) : (
          <>
            <Value at={[x0, dy + 14]} text="Not cut yet: move the slider." size={11} cls="k-value--muted" />
            <IsoBox at={[card(0, 0)[0], card(0, 0)[1] + 3]} w={96} d={54} h={3} role="hidden" hatch={ids.hatch} />
            {wide ? <Label at={card(96, 27, 0)} side="right" len={10} text="wordlist card" /> : <Label at={card(0, 54, 0)} side="left" len={10} text="wordlist card" />}
          </>
        )}
        {groups.map((g, k) => {
          const x = x0 + (k % chipsPerRow) * chipW;
          const y = chipsY + Math.floor(k / chipsPerRow) * 26;
          const known = k < shown;
          const current = sel !== null && k === sel.position;
          return (
            <g>
              <rect class={`k-outline k-fill--plain${current ? " k-cell--em" : ""}`} x={x + 2} y={y} width={chipW - 4} height={20} style={known ? undefined : `fill:${ids.hatch}`} />
              <text class="k-value k-value--muted" x={x + 7} y={y + 13.5} style="font-size:8px">{String(k + 1).padStart(2, "0")}</text>
              {known ? <text class="k-value" x={x + 24} y={y + 14}>{g.word}</text> : null}
            </g>
          );
        })}
      </Drawing>
    );
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Entropy size">
            {sizes.map((b) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-size`} checked={b === size} onChange={() => choose(fixtures.find((f) => f.derived.layout.entropyBits === b)!.id)} />
                <span>{b} bits</span>
              </label>
            ))}
          </div>
          <div class="atlas-strip" role="radiogroup" aria-label="Public sample">
            {fixtures.filter((f) => f.derived.layout.entropyBits === size).map((f) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-sample`} checked={f.id === fixtureId} onChange={() => choose(f.id)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Reveal 11-bit groups">
          <button type="button" class="atlas-scrub__btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous group">←</button>
          <input
            type="range"
            min={0}
            max={groups.length}
            value={step}
            aria-label="Groups revealed"
            aria-valuetext={step === 0 ? "none" : `${step} of ${groups.length}: ${groups[step - 1].word}`}
            onInput={(e) => setStep(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => setStep(Math.min(groups.length, step + 1))} disabled={step === groups.length} aria-label="Next group">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <p class="atlas-hero__source">Sample: {fixture.source.external} ({fixture.source.pointer}), pinned. Public test material; never use it for funds.</p>
    </div>
  );
}
