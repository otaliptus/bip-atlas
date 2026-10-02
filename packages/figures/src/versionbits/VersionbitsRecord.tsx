import { Drawing, Responsive, Value } from "../kit";
import type { DerivedVersionbitsDeploymentFixture, VersionbitsNetworkView } from "../types";
import { num } from "./parts";

/** One enforcement boundary per deployment. Prior periods are inferred, never presented as observed tallies. */
export function VersionbitsRecord({ fixtures }: { fixtures: DerivedVersionbitsDeploymentFixture[] }) {
  for (const f of fixtures) if (f.derived.mainnet.activeHeight === null || !f.derived.mainnet.implied) throw new Error(`${f.id}: needs a recorded activation height`);
  const desc = fixtures.map(({ derived: d }) => {
    const m = d.mainnet, i = m.implied!;
    return `${d.name}: signals are counted in blocks ${num(i.tallyFrom)}–${num(i.tallyTo)}; LOCKED_IN begins at ${num(i.lockedInFrom)}, and ACTIVE at the recorded height ${num(m.activeHeight!)}. At least ${num(m.threshold)} blocks must have signalled, but the count itself is not recorded. The new rules are enforced only from ACTIVE. Prior periods are inferred from BIP 9's rules.`;
  }).join(" ");
  const draw = (wide: boolean) => {
    const W = wide ? 640 : 344, margin = 14, lane = (W - margin * 2) / 3;
    const blockH = wide ? 153 : 171;
    const id = `a11-record-${wide ? "w" : "n"}`;
    return <Drawing id={id} width={W} height={fixtures.length * blockH + 51} title="The block where the rules change" desc={desc}>
      {["COUNT SIGNALS", "WAIT ONE PERIOD", "ENFORCE RULES"].map((t, k) => <Value at={[margin + k * lane + 5, 16]} text={t} size={wide ? 11 : 8.2} cls="k-value--label" />)}
      {fixtures.map((f, k) => {
        const d = f.derived, m = d.mainnet, i = m.implied!;
        const y = 45 + k * blockH, activeX = margin + 2 * lane;
        return <g data-deployment={d.name}>
          <Value at={[margin, y]} text={`${d.name.toUpperCase()} · BIT ${d.bit}`} size={11} cls="k-value--label" />
          <Value at={[W - margin, y]} text={`BIPS ${d.bips.join(" / ")}`} size={8} anchor="end" cls="k-value--muted" />
          <rect class="k-outline k-fill--plain" x={margin} y={y + 14} width={lane} height="42" />
          {Array.from({ length: 12 }, (_, b) => <path class="k-leader" d={`M${margin + (b + 1) * lane / 13} ${y + 14} v7 M${margin + (b + 1) * lane / 13} ${y + 49} v7`} />)}
          {/* LOCKED_IN is a waiting period, not hidden data: a dashed outline, not the hatch. */}
          <rect class="k-outline k-fill--plain k-dashed" x={margin + lane} y={y + 14} width={lane} height="42" />
          <rect class="k-outline k-mark--plain" x={activeX} y={y + 14} width={lane} height="42" />
          <Value at={[margin + lane / 2, y + 40]} text="STARTED" size={wide ? 13 : 10} anchor="middle" />
          <Value at={[margin + lane * 1.5, y + 40]} text="LOCKED_IN" size={wide ? 13 : 10} anchor="middle" />
          <Value at={[margin + lane * 2.5, y + 40]} text="ACTIVE" size={wide ? 17 : 13} anchor="middle" cls="k-value--on" />
          <line class="k-ring" x1={activeX} y1={y + 7} x2={activeX} y2={y + 125} />
          <Value at={[margin, y + 75]} text={`${num(i.tallyFrom)}–`} size={wide ? 10 : 9} cls="k-value--muted" />
          <Value at={[margin, y + 88]} text={num(i.tallyTo)} size={wide ? 10 : 9} cls="k-value--muted" />
          <Value at={[margin + lane + 6, y + 75]} text={num(i.lockedInFrom)} size={wide ? 12 : 10} />
          <Value at={[activeX + 7, y + 75]} text={num(m.activeHeight!)} size={wide ? 17 : 13} />
          {wide
            ? <Value at={[activeX + 7, y + 90]} text="AND EVERY BLOCK AFTER" size={8} cls="k-value--label" />
            : <><Value at={[activeX + 7, y + 89]} text="AND EVERY BLOCK" size={8} cls="k-value--label" /><Value at={[activeX + 7, y + 99]} text="AFTER" size={8} cls="k-value--label" /></>}
          <Value at={[margin, y + 108]} text={`≥ ${num(m.threshold)} SIGNALS`} size={wide ? 9 : 8} cls="k-value--label" />
          <Value at={[margin, y + 122]} text="PERIODS INFERRED; COUNT NOT RECORDED" size={wide ? 8.5 : 8} cls="k-value--muted" />
          <Value at={[activeX + 7, y + 114]} text="HEIGHT RECORDED" size={wide ? 9 : 8} cls="k-value--label" />
        </g>;
      })}
      <Value at={[14, fixtures.length * blockH + 40]} text="STRIPS SHOW PHASES, NOT INDIVIDUAL BLOCKS" size={8} cls="k-value--muted" />
    </Drawing>;
  };
  const netRow = (f: DerivedVersionbitsDeploymentFixture, net: string, v: VersionbitsNetworkView) => <>
    <dt>{f.derived.name}, {net}</dt>
    <dd>{v.start.slice(0, 10)} → {v.expire.slice(0, 10)} = BIP {f.crossCheck.bip} ✓<br />start {v.start} UTC ({v.startEpoch}), timeout {v.expire} UTC ({v.expireEpoch}), state “{v.state}”{v.implied ? `; implied LOCKED_IN from ${num(v.implied.lockedInFrom)}` : ""}</dd>
  </>;
  return <>
    <div class="k-local-composition"><Responsive wide={draw(true)} narrow={draw(false)} /></div>
    <details class="atlas-disclosure"><summary>Historical windows and heights, both networks</summary><dl class="atlas-hexlist">
      {fixtures.map((f) => <>{netRow(f, "mainnet", f.derived.mainnet)}{netRow(f, "testnet", f.derived.testnet)}</>)}
    </dl></details>
  </>;
}
