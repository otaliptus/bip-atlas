import { Drawing, Value } from "../kit";
import type { DerivedDerFixture } from "../types";

/**
 * der-low-s.v1 — static. A number line from 0 to the curve order n with
 * n / 2 marked: each published S sits in the lower half, and its twin
 * n − S, an equally valid signature, at the mirror point in the upper half.
 * BIP 146's LOW_S keeps the lower half.
 */
export function DerLowS({ fixtures }: { fixtures: DerivedDerFixture[] }) {
  const x0 = 20, x1 = 324, W = 344;
  const at = (frac: number) => x0 + frac * (x1 - x0);
  const lineY = 58;
  const H = lineY + 30 + (fixtures.length - 1) * 34 + 32;
  const half = at(0.5);
  const desc =
    `A line from 0 to the secp256k1 order n, with n / 2 (0x${fixtures[0].derived.halfOrderHex}) in the middle. ` +
    fixtures.map((f) => `${f.label}: S is ${(f.derived.sFraction * 100).toFixed(1)}% of the way to n, in the lower half; n − S is at ${(f.derived.flippedFraction * 100).toFixed(1)}%, in the upper half, and verifies just as well.`).join(" ") +
    " BIP 146's LOW_S rule accepts only S from 1 to n / 2.";
  return (
    <Drawing id="a23-lows" width={W} height={H} title="S and its twin n − S" desc={desc}>
      <Value at={[x0, 14]} text="EVERY S HAS A TWIN n − S THAT ALSO VERIFIES" size={8.5} cls="k-value--label" />
      <rect class="k-outline k-fill--sig" x={x0} y={lineY - 10} width={half - x0} height={20} />
      <rect class="k-outline k-fill--plain k-dashed" x={half} y={lineY - 10} width={x1 - half} height={20} />
      <Value at={[(x0 + half) / 2, lineY + 3.5]} text="LOW S · ALLOWED" size={8} anchor="middle" cls="k-value--label" />
      <Value at={[(half + x1) / 2, lineY + 3.5]} text="HIGH S · LOW_S FAILS" size={8} anchor="middle" cls="k-value--muted" />
      <Value at={[x0, lineY - 16]} text="0" size={8} anchor="middle" />
      <Value at={[half, lineY - 16]} text="n / 2" size={8} anchor="middle" />
      <Value at={[x1, lineY - 16]} text="n" size={8} anchor="middle" />
      {fixtures.map((f, i) => {
        const y = lineY + 30 + i * 34;
        const s = at(f.derived.sFraction), t = at(f.derived.flippedFraction);
        return (
          <g data-sig={f.id}>
            <path class="k-leader" d={`M${s} ${lineY + 10} V${y}`} />
            <path class="k-leader k-dashed" d={`M${t} ${lineY + 10} V${y}`} />
            <path class="k-line" d={`M${s} ${y} H${t}`} />
            <circle class="k-outline k-mark--sig" cx={s} cy={y} r={4} />
            <circle class="k-outline k-fill--plain" cx={t} cy={y} r={4} />
            <Value at={[s - 7, y + 3.5]} text={`${(f.shortLabel ?? f.label).split(" · ")[0].toUpperCase()}: S`} size={7.5} anchor="end" cls="k-value--label" />
            <Value at={[t + 7, y + 3.5]} text="n − S" size={7.5} cls="k-value--muted" />
            <Value at={[(s + t) / 2, y - 4]} text="MIRROR ABOUT n / 2" size={6.5} anchor="middle" cls="k-value--muted" />
          </g>
        );
      })}
      <Value at={[x0, H - 10]} text="n / 2 = 7FFFFFFF … 681B20A0 (BIP 146)" size={7.5} cls="k-value--muted" />
    </Drawing>
  );
}
