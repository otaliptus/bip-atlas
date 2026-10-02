import { INPUT_CHARSET } from "@bip-atlas/models/descsum";
import { Arrow, Bracket, Drawing, Machine, Value, idsFor } from "../kit";
import type { DerivedDescriptorFixture } from "../types";

/**
 * descriptor-checksum.v1 — static. BIP 380's own checksum vector: each
 * character becomes its position (0–31) within one of three groups; after
 * every third character an extra symbol records the three group numbers.
 * The symbols go through the polymod and give the 8 checksum characters.
 * Symbols from the tested checksum model (a transcription of BIP 380's code).
 */
export function DescriptorChecksum({ fixture }: { fixture: DerivedDescriptorFixture }) {
  const d = fixture.derived;
  const chars = [...d.body];
  if (d.checksumGiven !== d.checksumComputed) throw new Error(`${fixture.id}: descriptor-checksum.v1 shows a matching checksum`);
  const ids = idsFor("a13-sum");
  const CW = Math.min(22, 312 / chars.length);
  const SW = Math.min(16, 312 / d.symbols.length);
  const cx = (i: number) => 16 + i * CW;
  const sx = (j: number) => 16 + j * SW;
  const group = (c: string) => INPUT_CHARSET.indexOf(c) >> 5;
  const desc =
    `The body ${d.body} has ${chars.length} characters. ${chars.map((c) => `${c}: group ${group(c)}, position ${INPUT_CHARSET.indexOf(c) & 31}`).join("; ")}. ` +
    `Symbols fed to the checksum, in order: ${d.symbols.map((s) => (s.char === null ? `[groups ${s.value}]` : String(s.value))).join(", ")}. ` +
    `The polymod over these ${d.symbolCount} symbols gives the checksum ${d.checksumComputed}, which matches the published one.`;
  return (
    <Drawing id="a13-sum" width={344} height={250} title="Characters into symbols" desc={desc}>
      <Value at={[16, 14]} text={`${d.body} · ${chars.length} CHARACTERS · POSITION AND GROUP (g0–g2)`} size={9} cls="k-value--label" />
      {chars.map((c, i) => (
        <g>
          <rect class={`k-cell k-ds-g${group(c)}`} x={cx(i)} y={22} width={CW} height="20" />
          <Value at={[cx(i) + CW / 2, 36]} text={c} anchor="middle" size={10} cls={group(c) === 2 ? "k-value--on" : ""} />
          <Value at={[cx(i) + CW / 2, 54]} text={String(INPUT_CHARSET.indexOf(c) & 31)} anchor="middle" size={9} cls="k-value--muted" />
          <Value at={[cx(i) + CW / 2, 66]} text={`g${group(c)}`} anchor="middle" size={9} cls="k-value--muted" />
        </g>
      ))}
      
      {d.symbols.map((s, j) => {
        const isGroup = s.char === null;
        const from = s.char !== null ? cx(s.char) + CW / 2 : null;
        return (
          <g>
            {from !== null ? <line class="k-leader" x1={from} y1={72} x2={sx(j) + SW / 2} y2={98} /> : null}
            <rect class={`k-cell ${isGroup ? "k-fill--check k-cell--em" : "k-fill--plain"}`} x={sx(j)} y={100} width={SW} height="18" />
            <Value at={[sx(j) + SW / 2, 112.5]} text={String(s.value)} anchor="middle" size={9} />
          </g>
        );
      })}
      <Bracket x1={16} x2={16 + d.symbols.length * SW} y={122} text={`${d.symbolCount} symbols · outlined = group symbols`} />
      <Arrow d="M172 150 V166" ids={ids} />
      <Machine at={[146, 190]} w={64} d={26} h={18} label="POLYMOD" role="check" />
      <Arrow d="M206 206 H232" ids={ids} />
      <Value at={[238, 212]} text={`#${d.checksumComputed}`} size={11} cls="k-value--check" />
      <Value at={[16, 244]} text={`= THE CHECKSUM BIP 380 PUBLISHES, LINE ${fixture.source.line}`} size={9} cls="k-value--label" />
    </Drawing>
  );
}
