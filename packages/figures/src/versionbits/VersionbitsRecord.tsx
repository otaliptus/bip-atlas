import { Drawing, Value } from "../kit";
import type { DerivedVersionbitsDeploymentFixture, VersionbitsNetworkView } from "../types";
import { PeriodTile, num } from "./parts";

const day = (s: string) => s.slice(0, 10);

/**
 * versionbits-record.v1 — static. Each deployment in BIP 9's table: its
 * mainnet window as a time bar (cross-checked against its own BIP at build
 * time), and the three periods its recorded activation height implies, on
 * a block-height strip. The testnet rows and Unix times are in a disclosure.
 */
export function VersionbitsRecord({ fixtures }: { fixtures: DerivedVersionbitsDeploymentFixture[] }) {
  const blockH = 120;
  const row = (f: DerivedVersionbitsDeploymentFixture, y: number) => {
    const d = f.derived, m = d.mainnet;
    if (m.activeHeight === null || !m.implied) throw new Error(`${f.id}: needs a recorded mainnet activation height`);
    const i = m.implied;
    const tiles = [
      { state: "STARTED" as const, a: `${num(i.tallyFrom)}–`, b: num(i.tallyTo), note: `≥ ${num(m.threshold)} SIGNALLED` },
      { state: "LOCKED_IN" as const, a: num(i.lockedInFrom), b: "", note: "" },
      { state: "ACTIVE" as const, a: num(m.activeHeight), b: "onward", note: "" },
    ];
    return (
      <g data-deployment={d.name}>
        <Value at={[14, y + 10]} text={`${d.name.toUpperCase()} · BIT ${d.bit} · BIPS ${d.bips.join(", ")}`} size={9} cls="k-value--label" />
        <rect class="k-cell k-fill--time" x="14" y={y + 16} width="316" height="16" />
        <Value at={[19, y + 27.5]} text={`${day(m.start)} → ${day(m.expire)}`} size={9} />
        <Value at={[325, y + 27.5]} text={`= BIP ${f.crossCheck.bip} ✓`} size={8} anchor="end" cls="k-value--label" />
        <Value at={[14, y + 46]} text="IMPLIED BY BIP 9'S RULES" size={8} cls="k-value--label" />
        <path class="k-leader" d={`M14 ${y + 54} V${y + 50} H220 V${y + 54}`} />
        <Value at={[226, y + 46]} text="RECORDED" size={8} cls="k-value--label" />
        {tiles.map((t, k) => (
          <g>
            <PeriodTile x={14 + k * 106} y={y + 56} w={100} h={20} state={t.state} text={false} />
            <text class={`k-vb-lbl${t.state === "ACTIVE" ? " k-cell__t--on" : ""}`} x={14 + k * 106 + 50} y={y + 69.5} text-anchor="middle">{t.state}</text>
            <text class="k-vb-height" x={14 + k * 106} y={y + 88}>{t.a}</text>
            <text class="k-vb-height" x={14 + k * 106} y={y + 98}>{t.b}</text>
            {t.note ? <text class="k-vb-range" x={14 + k * 106} y={y + 109}>{t.note}</text> : null}
          </g>
        ))}
      </g>
    );
  };
  const desc = fixtures
    .map((f) => {
      const d = f.derived, m = d.mainnet, i = m.implied!;
      return `${d.name} on bit ${d.bit} (BIPs ${d.bips.join(", ")}): mainnet window ${day(m.start)} to ${day(m.expire)}, matching BIP ${f.crossCheck.bip}'s Unix times; recorded active from block ${m.activeHeight}; so, by BIP 9's rules, LOCKED_IN from block ${i.lockedInFrom}, after blocks ${i.tallyFrom} to ${i.tallyTo} included at least ${m.threshold} signalling blocks.`;
    })
    .join(" ");
  const netRow = (f: DerivedVersionbitsDeploymentFixture, net: string, v: VersionbitsNetworkView) => (
    <>
      <dt>{f.derived.name}, {net} (BIP 9 assignments, line {f.source.line})</dt>
      <dd>start {v.start} UTC ({v.startEpoch}), timeout {v.expire} UTC ({v.expireEpoch}), state “{v.state}”{v.implied ? `; implied LOCKED_IN from ${num(v.implied.lockedInFrom)}` : ""}</dd>
    </>
  );
  return (
    <>
      <Drawing id="a11-record" width={344} height={fixtures.length * blockH} title="Reading back from an activation height" desc={desc}>
        {fixtures.map((f, k) => row(f, 6 + k * blockH))}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>The table rows, both networks</summary>
        <dl class="atlas-hexlist">
          {fixtures.map((f) => (
            <>
              {netRow(f, "mainnet", f.derived.mainnet)}
              {netRow(f, "testnet", f.derived.testnet)}
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
