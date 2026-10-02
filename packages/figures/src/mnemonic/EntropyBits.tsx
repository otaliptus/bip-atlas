import { Bracket, Cells, Drawing, Label, Value } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/** entropy-bits.v1 — static. The entropy as a grid of bits beside the same value as hexadecimal. */
export function EntropyBits({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { entropyBits, layout } = fixture.derived;
  const bits = [...entropyBits];
  const perRow = 16, size = 12.5, x0 = 30, y0 = 18;
  const rows = bits.length / perRow;
  const gridW = perRow * size;
  const hexX = x0 + gridW + 30;
  const hexLines = fixture.entropyHex.match(/.{8}/g)!;
  return (
    <Drawing
      id="a01-bits"
      width={hexX + 84}
      height={y0 + rows * size + 52}
      title={`${layout.entropyBits} bits of entropy`}
      desc={`The ${layout.entropyBits} entropy bits of a published sample drawn as a ${perRow}-by-${rows} grid, ones dark and zeros pale, beside the same value written as ${fixture.entropyHex.length} hexadecimal characters: ${fixture.entropyHex}.`}
    >
      {Array.from({ length: rows }, (_, r) => (
        <Value at={[x0 - 6, y0 + r * size + 9]} text={String(r * perRow)} anchor="end" size={8} cls="k-value--muted" />
      ))}
      <Cells x={x0} y={y0} values={bits.map(() => "")} size={size} perRow={perRow} rowGap={0} roleOf={() => "secret"} strong={(i) => bits[i] === "1"} text={false} />
      <Bracket x1={x0} x2={x0 + gridW} y={y0 + rows * size + 4} text={`entropy · ${layout.entropyBits} bits · ${layout.entropyBits / 8} bytes`} />
      {hexLines.map((line, i) => (
        <Value at={[hexX, y0 + 14 + i * 16]} text={line} size={11} />
      ))}
      <Label at={[hexX + 30, y0 + 14 + hexLines.length * 16 - 6]} side="down" len={14} text={`${fixture.entropyHex.length} hex chars`} />
    </Drawing>
  );
}
