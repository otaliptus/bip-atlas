import type { DerivedMnemonicFixture } from "../types";

/** mnemonic-card.v1 — static. A public test phrase laid out like a backup card. */
export function MnemonicCard({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { groups, layout } = fixture.derived;
  return (
    <div class="atlas-card">
      <p class="atlas-card__stamp">Public test vector · never use for funds</p>
      <ol class="atlas-card__words" aria-label={`${layout.wordCount}-word public test phrase`}>
        {groups.map((g) => (
          <li class="atlas-card__word">
            <span class="atlas-card__n">{String(g.position + 1).padStart(2, "0")}</span>
            <span class="atlas-card__text">{g.word}</span>
            <span class="atlas-card__index" title="Wordlist index">#{g.index}</span>
          </li>
        ))}
      </ol>
      <p class="atlas-card__foot">
        {layout.wordCount} words · {layout.entropyBits} bits of entropy + {layout.checksumBits} checksum bits ·
        English wordlist
      </p>
    </div>
  );
}
