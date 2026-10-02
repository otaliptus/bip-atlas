import { Arrow, Bracket, Cells, Machine, Magnifier, Storyboard, Value, type Frame } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

const nibbleBits = (hex: string) => [...hex].flatMap((c) => [...parseInt(c, 16).toString(2).padStart(4, "0")]);

/**
 * checksum-storyboard.v1 — static. Four frames: entropy into SHA-256, the
 * hash's first bits, the checksum lifted out, appended to make n × 11 bits.
 */
export function ChecksumStory({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { layout, hashHex, checksumBits } = fixture.derived;
  const bytes = fixture.entropyHex.match(/.{2}/g)!;
  const hashBytes = hashHex.match(/.{2}/g)!;
  const firstByteBits = nibbleBits(hashBytes[0]);
  const n = layout.checksumBits;
  const cell = Math.min(17, 272 / bytes.length);
  const frames: Frame[] = [
    {
      note: `Hash the ${bytes.length} entropy bytes with SHA-256.`,
      desc: `The ${bytes.length} entropy bytes, ${fixture.entropyHex}, go into a SHA-256 machine.`,
      draw: (ids) => (
        <>
          <Cells x={14} y={14} values={bytes} size={cell} roleOf={() => "secret"} />
          <Arrow d="M150 36 V56" ids={ids} />
          <Machine at={[150, 92]} w={70} d={36} h={30} label="SHA-256" sub="hash" />
        </>
      ),
    },
    {
      note: `The hash begins ${hashBytes.slice(0, 4).join(" ")}…; its first byte is ${firstByteBits.join("")}.`,
      desc: `SHA-256 of the entropy begins ${hashHex.slice(0, 16)}. Its first byte, ${hashBytes[0]}, is ${firstByteBits.join("")} in binary.`,
      draw: () => (
        <>
          <Cells x={14} y={14} values={hashBytes.slice(0, 16)} size={17} roleOf={() => "hash"} />
          <Value at={[294, 27]} text="…" anchor="end" />
          <Magnifier id="a01-cs-mag" from={[22.5, 22.5]} fromR={9} at={[150, 106]} r={44}>
            <Cells x={106} y={100} values={firstByteBits} size={11} roleOf={(i) => (i < n ? "check" : "hash")} strong={(i) => i < n} />
          </Magnifier>
        </>
      ),
    },
    {
      note: `Keep the first ${layout.entropyBits} / 32 = ${n} bits, ${checksumBits}. That is the checksum.`,
      desc: `The first ${n} bits of the hash, ${checksumBits}, are kept as the checksum; the rest of the hash is not used.`,
      draw: () => (
        <>
          <Value at={[14, 22]} text={checksumBits} cls="k-value--check" />
          <Cells x={14} y={34} values={nibbleBits(hashHex.slice(0, 4))} size={16} roleOf={(i) => (i < n ? "check" : "hidden")} strong={(i) => i < n} />
          <Bracket x1={14} x2={14 + n * 16} y={54} text={`checksum · ${n} bits`} />
        </>
      ),
    },
    {
      note: `Append it to the entropy: ${layout.entropyBits} + ${n} = ${layout.totalBits} bits, exactly ${layout.wordCount} groups of 11.`,
      desc: `The ${n} checksum bits are appended after the ${layout.entropyBits} entropy bits, making ${layout.totalBits} bits, which is ${layout.wordCount} groups of 11 bits.`,
      draw: () => {
        const unit = 272 / layout.totalBits;
        return (
          <>
            <Value at={[14, 32]} text={`entropy ${layout.entropyBits}`} size={9} />
            <Value at={[286, 32]} text={`+${n}`} anchor="end" size={9} cls="k-value--check" />
            <rect class="k-cell k-fill--secret" x={14} y={40} width={layout.entropyBits * unit} height={22} />
            <rect class="k-cell k-mark--check" x={14 + layout.entropyBits * unit} y={40} width={n * unit} height={22} />
            {Array.from({ length: layout.wordCount - 1 }, (_, k) => (
              <line class="k-cut" x1={14 + (k + 1) * 11 * unit} y1={36} x2={14 + (k + 1) * 11 * unit} y2={66} />
            ))}
            <Bracket x1={14} x2={286} y={70} text={`${layout.totalBits} bits = ${layout.wordCount} × 11`} />
          </>
        );
      },
    },
  ];
  return <Storyboard id="a01-cs" title="Making the checksum" width={300} height={160} frames={frames} />;
}
