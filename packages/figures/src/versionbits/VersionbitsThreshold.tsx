import { PERIOD } from "@bip-atlas/models/versionbits";
import { Drawing, Value } from "../kit";
import type { DerivedVersionbitsDeploymentFixture, DerivedVersionbitsGuidelineFixture } from "../types";
import { num } from "./parts";

type Fx = DerivedVersionbitsDeploymentFixture | DerivedVersionbitsGuidelineFixture;

/**
 * versionbits-threshold.v1 — static. Lock-in thresholds to scale on one
 * 2,016-block period: BIP 9 mainnet and testnet (from the deployment
 * fixture) and BIP 8's suggestion (from its guideline fixture). The rest of
 * each bar is how many blocks may withhold the bit; one more stops lock-in.
 */
export function VersionbitsThreshold({ fixtures }: { fixtures: Fx[] }) {
  const dep = fixtures.find((f): f is DerivedVersionbitsDeploymentFixture => f.kind === "versionbits-deployment");
  const guide = fixtures.find((f): f is DerivedVersionbitsGuidelineFixture => f.kind === "versionbits-guideline");
  if (!dep || !guide) throw new Error("versionbits-threshold.v1 needs a BIP 9 deployment and BIP 8's guideline fixture");
  const bars = [
    { name: "BIP 9 · MAINNET", t: dep.derived.mainnet.threshold },
    { name: "BIP 9 · TESTNET", t: dep.derived.testnet.threshold },
    { name: "BIP 8 · SUGGESTED", t: guide.derived.threshold },
  ];
  const x0 = 16, W = 312, unit = W / PERIOD, y0 = 40, rowH = 50;
  const pct = (t: number) => Math.round((t / PERIOD) * 100);
  const desc =
    `Each bar is one retarget period of ${num(PERIOD)} blocks, to scale. ` +
    bars.map((b) => `${b.name.toLowerCase()}: at least ${num(b.t)} must signal (${pct(b.t)} percent), so ${num(PERIOD - b.t + 1)} non-signalling blocks are enough to stop lock-in in that period`).join("; ") +
    ".";
  return (
    <Drawing id="a11-thr" width={344} height={y0 + bars.length * rowH + 4} title="How many blocks must signal" desc={desc}>
      {[0, 1, 2, 3, 4].map((q) => q * (PERIOD / 4)).map((n) => (
        <g>
          <line class="k-leader" x1={x0 + n * unit} y1={y0 - 8} x2={x0 + n * unit} y2={y0 - 3} />
          <text class="k-vb-ruler" x={x0 + n * unit} y={y0 - 12} text-anchor={n === PERIOD ? "end" : n === 0 ? "start" : "middle"}>{num(n)}</text>
        </g>
      ))}
      {bars.map((b, i) => {
        const y = y0 + i * rowH;
        const wSig = b.t * unit;
        return (
          <g>
            <rect class="k-cell k-vb-signal" x={x0} y={y} width={wSig} height={18} />
            <rect class="k-cell k-fill--plain" x={x0 + wSig} y={y} width={W - wSig} height={18} />
            <line class="k-cut" x1={x0 + wSig} y1={y - 3} x2={x0 + wSig} y2={y + 21} />
            <text class="k-vb-lbl" x={x0 + 5} y={y + 12.5}>{`${b.name} · ≥ ${num(b.t)} · ${pct(b.t)}%`}</text>
            <text class="k-vb-range" x={x0 + W} y={y + 31} text-anchor="end">{`${num(PERIOD - b.t)} MAY WITHHOLD · ${num(PERIOD - b.t + 1)} STOP LOCK-IN`}</text>
          </g>
        );
      })}
    </Drawing>
  );
}
