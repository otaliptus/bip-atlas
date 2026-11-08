import { Drawing, Value } from "../kit";
import type { DerivedDerFixture } from "../types";
import { SigRibbon } from "./parts";

/**
 * der-anatomy.v1 — static. Both signatures from BIP 143's example laid out
 * as BIP 66's format comment names them: 0x30, total length, 0x02, R's
 * length, R, 0x02, S's length, S, then the sighash byte outside DER. Input
 * 0's R starts with a byte whose top bit is set, so it carries a 0x00 pad.
 */
export function DerAnatomy({ fixtures }: { fixtures: DerivedDerFixture[] }) {
  const x0 = 14, W = 344;
  const blockH = 92;
  const H = 30 + fixtures.length * blockH + 6;
  const pub = (f: DerivedDerFixture) => f.derived.variants.find((v) => v.id === "published")!;
  const desc = fixtures
    .map((f) => {
      const v = pub(f);
      const r = v.fields.find((x) => x.id === "r")!;
      return `${f.label}, ${v.bytes} bytes: ${v.fields.map((x) => `${x.label} ${x.hex}`).join(", ")}. ${r.hex.startsWith("00") ? `R is ${r.hex.length / 2} bytes: a 0x00 pad, because its first value byte ${r.hex.slice(2, 4)} has its top bit set and would otherwise read as negative.` : `R is ${r.hex.length / 2} bytes with no pad: its first byte ${r.hex.slice(0, 2)} has its top bit clear.`}`;
    })
    .join(" ");
  return (
    <Drawing id="a23-anatomy" width={W} height={H} title="A DER signature, field by field" desc={desc}>
      <Value at={[x0, 14]} text="0x30 [TOTAL] 0x02 [LEN R] R 0x02 [LEN S] S [SIGHASH]" size={8} cls="k-value--label" />
      {fixtures.map((f, k) => {
        const v = pub(f);
        const y = 34 + k * blockH;
        const r = v.fields.find((x) => x.id === "r")!;
        const padded = r.hex.startsWith("00");
        return (
          <g data-sig={f.id}>
            <Value at={[x0, y + 6]} text={`${(f.shortLabel ?? f.label).toUpperCase()} · ${v.bytes} BYTES`} size={8} cls="k-value--label" />
            <SigRibbon x={x0} y={y + 18} v={{ fields: v.fields, changed: [] }} width={W - 2 * x0} />
            <Value at={[x0, y + 68]} text={`TOTAL 0x${v.fields[1].hex} = ${parseInt(v.fields[1].hex, 16)}: EVERY BYTE AFTER IT, EXCEPT THE SIGHASH`} size={7.5} cls="k-value--muted" />
            <Value at={[x0, y + 80]} text={padded ? `R STARTS 00 ${r.hex.slice(2, 4)}: ${r.hex.slice(2, 4).toUpperCase()} HAS ITS TOP BIT SET, SO ONE 00 IS REQUIRED` : `R STARTS ${r.hex.slice(0, 2)}: TOP BIT CLEAR, SO NO PAD IS ALLOWED`} size={7.5} cls="k-value--muted" />
          </g>
        );
      })}
    </Drawing>
  );
}
