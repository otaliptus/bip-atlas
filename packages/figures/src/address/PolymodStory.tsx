import { BECH32_CONST, CHARSET, formatResidue, hrpExpand, polymod } from "@bip-atlas/models/bech32";
import { Arrow, Bracket, Cells, Machine, Storyboard, Value, type Frame } from "../kit";
import type { AddressFixture } from "../types";

/**
 * address-polymod-story.v1 — static storyboard. How a decoder checks the six
 * characters of BIP 173's example: data characters to values, the prefix
 * expanded, everything through polymod, and a result of exactly 1. Every
 * number from the tested bech32 model.
 */
export function PolymodStory({ fixture }: { fixture: AddressFixture }) {
  const lower = fixture.address.toLowerCase();
  const sep = lower.lastIndexOf("1");
  const hrp = lower.slice(0, sep);
  const data = [...lower.slice(sep + 1)];
  const values = data.map((c) => CHARSET.indexOf(c));
  if (values.some((v) => v < 0)) throw new Error(`${fixture.id}: character outside the alphabet`);
  const expanded = hrpExpand(hrp);
  const residue = polymod([...expanded, ...values]);
  if (residue !== BECH32_CONST) throw new Error(`${fixture.id}: not a valid Bech32 string`);
  const show = 8;
  const codes = [...hrp].map((c) => c.charCodeAt(0));
  const frames: Frame[] = [
    {
      note: `Each of the ${data.length} data characters becomes its value, 0 to 31.`,
      desc: `The data part ${data.join("")} becomes the values ${values.join(", ")}.`,
      draw: (ids) => (
        <>
          <Cells x={14} y={22} values={data.slice(0, show)} size={26} />
          <Value at={[14 + show * 26 + 6, 39]} text="…" size={11} />
          {data.slice(0, show).map((_, i) => <Arrow d={`M${27 + i * 26} 52 V66`} ids={ids} />)}
          <Cells x={14} y={72} values={values.slice(0, show).map(String)} size={26} roleOf={() => "plain"} />
          <Value at={[14 + show * 26 + 6, 89]} text="…" size={11} />
          <Value at={[14, 118]} text={`${data.length} VALUES · THE LAST 6 ARE THE CHECKSUM`} size={9} cls="k-value--label" />
        </>
      ),
    },
    {
      note: `The prefix “${hrp}” goes in too: the high bits of each letter, a 0, then the low bits.`,
      desc: `The prefix ${hrp} has character codes ${codes.join(", ")}. Expanded, it is ${expanded.join(", ")}: each code divided by 32, then 0, then each code modulo 32.`,
      draw: () => (
        <>
          {[...hrp].map((c, i) => <Value at={[14 + i * 70, 24]} text={`${c} = ${codes[i]}`} size={10} />)}
          <Cells x={14} y={44} values={expanded.map(String)} size={30} roleOf={(i) => (i === hrp.length ? "plain" : "net")} />
          <Bracket x1={14} x2={14 + hrp.length * 30} y={78} text="code ÷ 32" align="start" />
          <Bracket x1={14 + (hrp.length + 1) * 30} x2={14 + expanded.length * 30} y={78} text="code mod 32" align="start" />
          <Value at={[14, 126]} text="THE PREFIX IS CHECKSUMMED TOO" size={9} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `All ${expanded.length + values.length} values run through polymod, a fixed function that keeps a 30-bit state.`,
      desc: `The ${expanded.length} prefix values and the ${values.length} data values, ${expanded.length + values.length} in all, go through polymod.`,
      draw: (ids) => (
        <>
          <Cells x={14} y={14} values={Array(expanded.length).fill("")} size={10} roleOf={() => "net"} text={false} />
          <Cells x={14 + expanded.length * 10 + 4} y={14} values={Array(values.length).fill("")} size={5.5} roleOf={(i) => (i >= values.length - 6 ? "check" : "plain")} text={false} />
          <Value at={[14, 46]} text={`${expanded.length} + ${values.length} = ${expanded.length + values.length} VALUES · LAST 6 = CHECKSUM`} size={9} cls="k-value--label" />
          <Arrow d="M190 30 V48" ids={ids} />
          <Machine at={[164, 76]} w={84} d={30} h={22} label="POLYMOD" role="check" />
        </>
      ),
    },
    {
      note: "The result is exactly 1, the Bech32 constant. Any other result: the string is not one an encoder produced.",
      desc: `polymod returns ${formatResidue(residue)}, which equals the Bech32 constant, so the checksum is valid.`,
      draw: () => (
        <>
          <Value at={[14, 22]} text="RESULT" size={9} cls="k-value--label" />
          <rect class="k-cell k-fill--check k-cell--em" x="14" y="30" width="140" height="30" />
          <Value at={[24, 50]} text={formatResidue(residue)} size={13} />
          <Value at={[166, 50]} text="= BECH32 ✓" size={11} cls="k-value--label" />
          <Value at={[14, 88]} text="THE ENCODER CHOSE THE 6 CHECKSUM" size={9} cls="k-value--muted" />
          <Value at={[14, 100]} text="VALUES TO LAND EXACTLY HERE" size={9} cls="k-value--muted" />
        </>
      ),
    },
  ];
  return <Storyboard id="a04-poly" title="Checking the six characters" width={300} height={136} frames={frames} />;
}
