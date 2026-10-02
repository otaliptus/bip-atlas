import { MAX_BIT, TOP_BITS, versionFor } from "@bip-atlas/models/versionbits";
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedVersionbitsDeploymentFixture } from "../types";
import { hex32 } from "./parts";

const bitsOf = (v: number) => Array.from({ length: 32 }, (_, k) => String((v >>> (31 - k)) & 1));

/**
 * versionbits-field.v1 — static. A block's nVersion as BIP 9 reads it: 32
 * bit cells (bit 31 on the left), grouped in nibbles with their hex digit.
 * The value drawn is the version of a block signalling for every deployment
 * passed in; each deployment's bit is named on a leader.
 */
export function VersionbitsField({ fixtures }: { fixtures: DerivedVersionbitsDeploymentFixture[] }) {
  const deps = [...fixtures].sort((a, b) => b.derived.bit - a.derived.bit);
  const all = versionFor(deps.map((f) => f.derived.bit));
  const bits = bitsOf(all);
  const topLen = 32 - (MAX_BIT + 1);
  const cell = 9.5, gap = 1.5, x0 = 14, y0 = 54;
  // x of bit position k (0 = bit 31), with a small gap between nibbles.
  const xOf = (k: number) => x0 + k * cell + Math.floor(k / 4) * gap;
  const nibbles = hex32(all).slice(2);
  const rows = [...deps.map((f) => ({ name: `${f.derived.name} only`, v: f.derived.signalVersion })), { name: "both", v: all }];
  const desc =
    `The 32-bit block version, bit 31 on the left. Bits 31 to ${32 - topLen} must read ${bitsOf(TOP_BITS).slice(0, topLen).join("")}; bits ${MAX_BIT} to 0 are the ${MAX_BIT + 1} deployment bits. ` +
    deps.map((f) => `Bit ${f.derived.bit} is ${f.derived.name}.`).join(" ") +
    ` The value drawn is ${hex32(all)}, a block signalling for both. ` +
    rows.map((r) => `${r.name}: ${hex32(r.v)}`).join("; ") + ".";
  return (
    <Drawing id="a11-field" width={344} height={210} title="One bit per deployment" desc={desc}>
      {[31, 28, 24, 16, 8].map((b) => (
        <text class="k-vb-ruler" x={xOf(31 - b) + cell / 2} y={y0 - 4} text-anchor="middle">{b}</text>
      ))}
      {bits.map((v, k) => (
        <Cells x={xOf(k)} y={y0} values={[v]} size={cell} roleOf={() => "plain"} strong={() => v === "1"} />
      ))}
      <Bracket x1={xOf(0)} x2={xOf(topLen - 1) + cell} y={y0 - 14} below={false} text={`top bits ${bitsOf(TOP_BITS).slice(0, topLen).join("")}`} align="start" />
      {[...nibbles].map((c, i) => (
        <Value at={[xOf(i * 4) + 2 * cell + 0.75, y0 + cell + 13]} text={c} size={10} anchor="middle" />
      ))}
      <Value at={[xOf(0) - 2, y0 + cell + 13]} text="0x" size={8} anchor="end" cls="k-value--muted" />
      <Bracket x1={xOf(topLen)} x2={xOf(31) + cell} y={y0 + cell + 19} text={`${MAX_BIT + 1} deployment bits · ${MAX_BIT} to 0`} />
      {deps.map((f, i) => {
        const cx = xOf(31 - f.derived.bit) + cell / 2;
        const ly = 34 - i * 12;
        return (
          <g>
            <line class="k-leader" x1={cx} y1={y0} x2={cx} y2={ly - 3} />
            <text class="k-vb-lbl" x={cx - 4} y={ly} text-anchor="end">{`BIT ${f.derived.bit} · ${f.derived.name.toUpperCase()}`}</text>
          </g>
        );
      })}
      {rows.map((r, i) => (
        <g>
          <Value at={[x0, 128 + i * 18]} text={r.name.toUpperCase()} size={8.5} cls="k-value--label" />
          <Value at={[x0 + 110, 128 + i * 18]} text={hex32(r.v)} size={10} />
          <Value at={[x0 + 190, 128 + i * 18]} text={((set) => `bit${set.length > 1 ? "s" : ""} ${set.join(" and ")} set`)(deps.filter((f) => (r.v >>> f.derived.bit) & 1).map((f) => f.derived.bit))} size={8.5} cls="k-value--muted" />
        </g>
      ))}
      <Value at={[x0, 196]} text="ANY OTHER TOP BITS: THE BLOCK SIGNALS NOTHING" size={8.5} cls="k-value--label" />
    </Drawing>
  );
}
