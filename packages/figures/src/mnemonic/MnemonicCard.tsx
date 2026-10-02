import { COS30, Drawing, IsoBox, Label, SIN30, iso, onTop } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/**
 * mnemonic-card.v1 — static. The published phrase engraved on an isometric
 * metal backup plate, three columns of numbered words. Words and indices come
 * from the tested model.
 */
export function MnemonicCard({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { groups, layout } = fixture.derived;
  const cols = 3;
  const rows = Math.ceil(groups.length / cols);
  const W = 252, D = 24 * rows + 44, H = 7;
  const ox = D * COS30 + 6, oy = 12;
  // Box ground origin sits H below the top face, so the top face starts at oy.
  const P = iso(ox, oy + H);
  const width = Math.ceil((W + D) * COS30 + 12);
  const height = Math.ceil((W + D) * SIN30 + H + 70);
  const col = (i: number) => 14 + (i % cols) * 80;
  const row = (i: number) => 46 + Math.floor(i / cols) * 24;
  const first = groups[0];
  return (
    <Drawing
      id="a01-card"
      width={width}
      height={height}
      title={`A ${layout.wordCount}-word public test phrase on a backup plate`}
      desc={`A metal backup plate engraved with the ${layout.wordCount} words of a published test phrase, numbered 1 to ${layout.wordCount}: ${groups.map((g) => g.word).join(" ")}. The first word, ${first.word}, is wordlist index ${first.index}, which is 11 bits.`}
    >
      <IsoBox at={[ox, oy + H]} w={W} d={D} h={H} role="plain" cls="k-plate" />
      <rect class="k-outline k-fill--plain" transform={onTop(P(84, 10, H))} width="104" height="14" />
      <text class="k-label-flat" transform={onTop(P(89, 20, H))}>PUBLIC TEST VECTOR</text>
      {groups.map((g, i) => (
        <g>
          <text class="k-engrave k-engrave--n" transform={onTop(P(col(i), row(i), H))}>{String(g.position + 1).padStart(2, "0")}</text>
          <text class="k-engrave" transform={onTop(P(col(i) + 16, row(i), H))}>{g.word}</text>
        </g>
      ))}
      <Label at={P(W, D - 4, 0)} side="down" len={26} text={`${layout.wordCount} words · ${layout.entropyBits} + ${layout.checksumBits} bits`} />
      <Label at={P(col(0) + 34, row(0) - 9, H)} side="up" len={30} text={`index ${first.index}`} />
    </Drawing>
  );
}
