import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import type { DerivedMnemonicFixture } from "../types";

interface Props {
  fixtures: DerivedMnemonicFixture[];
  figureId: string;
}

const VIEW_W = 960;

/**
 * entropy-word-pipeline.v1 — the BIP39 chapter's hero figure.
 *
 * Every bit, index and word comes precomputed from the tested model (see the
 * site's derive step); this component only lays them out. Readers choose among
 * public fixtures; there is no field for entering words or entropy.
 */
export function EntropyWordLab({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const sizes = [...new Set(fixtures.map((f) => f.derived.layout.entropyBits))].sort((a, b) => a - b);
  const [size, setSize] = useState(sizes[0]);
  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(0);

  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const { layout, groups, entropyBits, checksumBits, hashHex } = fixture.derived;
  // Without JavaScript, show the fully revealed state: it is the static equivalent.
  const showGroups = !hydrated || revealed;
  const current = groups[Math.min(selected, groups.length - 1)];
  const allBits = entropyBits + checksumBits;

  const chooseSize = (bits: number) => {
    setSize(bits);
    const first = fixtures.find((f) => f.derived.layout.entropyBits === bits)!;
    setFixtureId(first.id);
    setSelected(0);
  };
  const chooseFixture = (id: string) => {
    setFixtureId(id);
    setSelected(0);
  };

  const onGridKey = (event: KeyboardEvent) => {
    const columns = window.matchMedia("(min-width: 48rem)").matches ? 2 : 1;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowDown: columns, ArrowLeft: -1, ArrowUp: -columns };
    let next = selected;
    if (event.key in moves) next = selected + moves[event.key];
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = groups.length - 1;
    else return;
    event.preventDefault();
    next = Math.max(0, Math.min(groups.length - 1, next));
    setSelected(next);
    (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-position="${next}"]`)?.focus();
  };

  const bitW = VIEW_W / layout.totalBits;
  const describe = (g: typeof current) =>
    `Word ${g.position + 1} of ${layout.wordCount}: bits ${g.bits}, index ${g.index}, “${g.word}”. ` +
    (g.checksumBitCount === 0
      ? "All 11 bits are entropy."
      : g.entropyBitCount === 0
        ? `All 11 bits are checksum.`
        : `${g.entropyBitCount} entropy bits and ${g.checksumBitCount} checksum bits.`);

  return (
    <div class="atlas-lab atlas-mnemonic-lab" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-segmented">
            <legend>Entropy size</legend>
            {sizes.map((bits) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-size`} checked={bits === size} onChange={() => chooseSize(bits)} />
                <span>{bits}-bit<small>{fixtures.find((f) => f.derived.layout.entropyBits === bits)!.derived.layout.wordCount} words</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-lab__samples">
            <legend>Public sample</legend>
            {fixtures.filter((f) => f.derived.layout.entropyBits === size).map((f) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-sample`} checked={f.id === fixtureId} onChange={() => chooseFixture(f.id)} />
                <span>{f.label}<small>{f.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <label class="atlas-switch">
            <input type="checkbox" role="switch" checked={revealed} onChange={(e) => setRevealed((e.currentTarget as HTMLInputElement).checked)} />
            <span>Reveal 11-bit groups</span>
          </label>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view of the first sample with every 11-bit group revealed. With JavaScript you can switch samples and
          sizes and step through the groups.
        </p>
      )}

      <div class="atlas-bits">
        <p class="atlas-bits__title">
          <span>{layout.entropyBits} entropy bits</span>
          <span class="atlas-bits__plus">+</span>
          <span class="atlas-bits__cs">{layout.checksumBits} checksum bits</span>
          <span class="atlas-bits__eq">= {layout.totalBits} bits</span>
          {showGroups ? <span class="atlas-bits__eq">= {layout.wordCount} × 11</span> : null}
        </p>
        <svg
          class="atlas-bits__svg"
          viewBox={`0 0 ${VIEW_W} 52`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${layout.totalBits} bits: ${layout.entropyBits} of entropy followed by ${layout.checksumBits} checksum bits${showGroups ? `, cut into ${layout.wordCount} groups of 11` : ""}.`}
        >
          <defs>
            <pattern id={`${figureId}-hatch`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" class="atlas-svg-hatch" />
            </pattern>
          </defs>
          <rect x={layout.entropyBits * bitW} y={6} width={layout.checksumBits * bitW} height={28} fill={`url(#${figureId}-hatch)`} />
          {[...allBits].map((b, i) => (
            <rect
              x={i * bitW + 0.4}
              y={b === "1" ? 6 : 26}
              width={Math.max(0.6, bitW - 0.8)}
              height={b === "1" ? 28 : 8}
              class={i >= layout.entropyBits ? "atlas-bit atlas-bit--cs" : "atlas-bit"}
            />
          ))}
          {showGroups
            ? groups.map((g) => (
                <rect
                  x={g.position * 11 * bitW}
                  y={38}
                  width={11 * bitW - 1}
                  height={g.position === current.position && hydrated ? 10 : 6}
                  class={g.position === current.position && hydrated ? "atlas-bitgroup atlas-bitgroup--on" : "atlas-bitgroup"}
                />
              ))
            : Array.from({ length: layout.entropyBits / 8 + 1 }, (_, k) => (
                <line x1={k * 8 * bitW} x2={k * 8 * bitW} y1={36} y2={48} class="atlas-svg-byte-tick" />
              ))}
          {showGroups && hydrated ? (
            <rect x={current.position * 11 * bitW} y={2} width={11 * bitW} height={34} class="atlas-bitgroup-frame" />
          ) : null}
        </svg>
        <p class="atlas-bits__legend" aria-hidden="true">
          <span><i class="atlas-key atlas-key--one" />bit 1</span>
          <span><i class="atlas-key atlas-key--zero" />bit 0</span>
          <span><i class="atlas-key atlas-key--cs" />checksum: first {layout.checksumBits} bits of SHA-256(entropy)</span>
          <span>{showGroups ? <><i class="atlas-key atlas-key--group" />one word = 11 bits</> : <><i class="atlas-key atlas-key--byte" />byte boundary</>}</span>
        </p>
        <p class="atlas-hash">
          <span class="atlas-hash__label">SHA-256(entropy)</span>
          <code>
            <mark>{hashHex.slice(0, Math.ceil(layout.checksumBits / 4))}</mark>
            {hashHex.slice(Math.ceil(layout.checksumBits / 4), 16)}…
          </code>
          <span class="atlas-hash__label">first {layout.checksumBits} bits</span>
          <code class="atlas-hash__bits">{checksumBits}</code>
        </p>
      </div>

      {showGroups ? (
        <>
          <div
            class="atlas-groups"
            role={hydrated ? "listbox" : "list"}
            aria-label={`${layout.wordCount} words, one per 11-bit group`}
            onKeyDown={hydrated ? onGridKey : undefined}
          >
            {groups.map((g) => {
              const on = hydrated && g.position === current.position;
              const content = (
                <>
                  <span class="atlas-group__n">{String(g.position + 1).padStart(2, "0")}</span>
                  <span class="atlas-group__bits" aria-hidden="true">
                    {[...g.bits].map((b, i) => (
                      <span class="atlas-group__bit" data-cs={i >= g.entropyBitCount ? "true" : undefined}>{b}</span>
                    ))}
                  </span>
                  <span class="atlas-group__index">{g.index}</span>
                  <span class="atlas-group__word">{g.word}</span>
                </>
              );
              return hydrated ? (
                <button
                  type="button"
                  role="option"
                  class="atlas-group"
                  data-position={g.position}
                  data-on={on ? "true" : undefined}
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  aria-label={describe(g)}
                  onClick={() => setSelected(g.position)}
                >
                  {content}
                </button>
              ) : (
                <div class="atlas-group" role="listitem" aria-label={describe(g)}>{content}</div>
              );
            })}
          </div>
          {hydrated ? (
            <div class="atlas-lab__edit">
              <div class="atlas-lab__buttons" role="group" aria-label="Step through groups">
                <button type="button" class="manual-plate-button" onClick={() => setSelected(Math.max(0, current.position - 1))} disabled={current.position === 0}>
                  ← Previous word
                </button>
                <button type="button" class="manual-plate-button" onClick={() => setSelected(Math.min(groups.length - 1, current.position + 1))} disabled={current.position === groups.length - 1}>
                  Next word →
                </button>
                <button type="button" class="manual-plate-button" onClick={() => setSelected(groups.length - 1)}>
                  Jump to last word
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p class="atlas-bytes">
          <span class="atlas-hash__label">Entropy as bytes</span>
          <code>{fixture.entropyHex.match(/.{2}/g)!.join(" ")}</code>
        </p>
      )}

      <p class="atlas-lab__status" aria-live="polite">
        {showGroups && hydrated
          ? describe(current)
          : showGroups
            ? `The last word holds ${layout.lastWordEntropyBits} entropy bits and ${layout.checksumBits} checksum bits.`
            : `${layout.entropyBits} bits of entropy, then ${layout.checksumBits} checksum bits taken from its SHA-256 hash. Reveal the groups to see the words.`}
      </p>
      <p class="atlas-lab__source">
        Sample source: {fixture.source.external} ({fixture.source.pointer}), pinned by commit. Public test material;
        never use it for funds.
      </p>
    </div>
  );
}
