import { PERIOD } from "@bip-atlas/models/versionbits";
import { Cells, Storyboard, Value, type Frame } from "../kit";
import type { DerivedVersionbitsDeploymentFixture } from "../types";
import { Gauge, PeriodTile, hex32, num } from "./parts";

/**
 * versionbits-lifecycle.v1 — static storyboard (was the worked example).
 * One recorded deployment from its parameters to ACTIVE, read back from the
 * activation height in BIP 9's table with BIP 9's rules. The same strip of
 * three periods sits under every frame; one part changes per frame.
 */
export function VersionbitsLifecycle({ fixture }: { fixture: DerivedVersionbitsDeploymentFixture }) {
  const d = fixture.derived;
  const m = d.mainnet;
  if (m.activeHeight === null || !m.implied) throw new Error(`${fixture.id}: needs a recorded mainnet activation height`);
  const i = m.implied;
  const strip = (lit: number) => {
    const parts = [
      { state: "STARTED" as const, top: `${num(i.tallyFrom)}–`, sub: num(i.tallyTo) },
      { state: "LOCKED_IN" as const, top: num(i.lockedInFrom), sub: "" },
      { state: "ACTIVE" as const, top: num(m.activeHeight!), sub: "onward" },
    ];
    return (
      <g>
        {parts.map((p, k) => (
          <g>
            <PeriodTile x={12 + k * 94} y={88} w={88} h={20} state={k < lit ? p.state : null} current={k === lit - 1} text={false} />
            <text class={`k-vb-lbl${k < lit && p.state === "ACTIVE" ? " k-cell__t--on" : ""}`} x={12 + k * 94 + 44} y={101.5} text-anchor="middle">{k < lit ? p.state : "·"}</text>
            <text class="k-vb-height" x={12 + k * 94} y={120}>{p.top}</text>
            <text class="k-vb-height" x={12 + k * 94} y={130}>{p.sub}</text>
          </g>
        ))}
      </g>
    );
  };
  const bitsOf = (v: number) => Array.from({ length: 32 }, (_, k) => String((v >>> (31 - k)) & 1));
  const frames: Frame[] = [
    {
      note: `Parameters: bit ${d.bit}, and a start and a timeout in median time past. BIP 9 fixes the threshold: ${num(m.threshold)} of ${num(PERIOD)}.`,
      desc: `The ${d.name} deployment: bit ${d.bit}, starttime ${m.start} UTC (${m.startEpoch}), timeout ${m.expire} UTC (${m.expireEpoch}), mainnet threshold ${m.threshold} of ${PERIOD} blocks.`,
      draw: () => (
        <>
          <rect class="k-outline k-fill--plain k-cell--em" x="12" y="8" width="276" height="66" />
          <Value at={[20, 24]} text={`${d.name.toUpperCase()} · BIT ${d.bit} · BIPS ${d.bips.join(", ")}`} size={9} cls="k-value--label" />
          <rect class="k-cell k-fill--time" x="20" y="32" width="260" height="14" />
          <Value at={[24, 42.5]} text={`${m.start.slice(0, 10)} → ${m.expire.slice(0, 10)}`} size={8.5} />
          <Value at={[276, 42.5]} text="WINDOW (MTP)" size={7.5} anchor="end" cls="k-value--muted" />
          <Value at={[20, 64]} text={`THRESHOLD, FIXED BY BIP 9: ${num(m.threshold)} / ${num(PERIOD)}`} size={8.5} cls="k-value--label" />
          {strip(0)}
        </>
      ),
    },
    {
      note: `A block that signals for ${d.name} sets bit ${d.bit}: version ${hex32(d.signalVersion)}. That changes no rule by itself.`,
      desc: `A signalling block's version is ${hex32(d.signalVersion)}: top bits 001 and bit ${d.bit} set.`,
      draw: () => (
        <>
          <Value at={[12, 18]} text={`A SIGNALLING BLOCK · ${hex32(d.signalVersion)}`} size={8.5} cls="k-value--label" />
          <Cells x={12} y={28} values={bitsOf(d.signalVersion)} size={8.6} text={false} strong={(k) => bitsOf(d.signalVersion)[k] === "1"} emphasis={(k) => k === 31 - d.bit} />
          <Value at={[12, 50]} text="BIT 31" size={8} cls="k-value--muted" />
          <line class="k-leader" x1={12 + (31 - d.bit) * 8.6 + 4.3} y1={37} x2={12 + (31 - d.bit) * 8.6 + 4.3} y2={56} />
          <Value at={[12 + (31 - d.bit) * 8.6 + 1, 66]} text={`BIT ${d.bit}`} size={8.5} anchor="end" cls="k-value--label" />
          {strip(0)}
        </>
      ),
    },
    {
      note: `Blocks ${num(i.tallyFrom)}–${num(i.tallyTo)}: at least ${num(m.threshold)} signalled. Inferred: the table records no count, only where the deployment became active.`,
      desc: `The period of blocks ${i.tallyFrom} to ${i.tallyTo}, in STARTED, must have had at least ${m.threshold} signalling blocks; the exact count is not recorded in the pinned sources.`,
      draw: () => (
        <>
          <Gauge cx={70} cy={66} r={46} period={PERIOD} threshold={m.threshold} count={null} />
          <Value at={[172, 34]} text={`≥ ${num(m.threshold)} SIGNALLED`} size={8.5} cls="k-value--label" />
          <Value at={[172, 48]} text="COUNT NOT RECORDED" size={8} cls="k-value--muted" />
          {strip(1)}
        </>
      ),
    },
    {
      note: `From block ${num(i.lockedInFrom)}: LOCKED_IN for one period. Nothing is counted and no rule changes; miners should keep signalling.`,
      desc: `Blocks ${i.lockedInFrom} to ${m.activeHeight! - 1} are LOCKED_IN: nothing is counted, the rules are not yet enforced, and miners should keep setting the bit so uptake stays visible.`,
      draw: () => (
        <>
          <Value at={[12, 30]} text="NOTHING COUNTED" size={9} cls="k-value--label" />
          <Value at={[12, 46]} text="RULES NOT YET ENFORCED" size={9} cls="k-value--label" />
          <Value at={[12, 62]} text={`BIT ${d.bit} SHOULD STAY SET`} size={8} cls="k-value--muted" />
          {strip(2)}
        </>
      ),
    },
    {
      note: `From block ${num(m.activeHeight)}, the height BIP 9's table records: ACTIVE. Blocks must follow the rules of BIPs ${d.bips.join(", ")}.`,
      desc: `From block ${m.activeHeight}, as recorded (“${m.state}”), the deployment is ACTIVE and the rules of BIPs ${d.bips.join(", ")} are enforced. ACTIVE is terminal.`,
      draw: () => (
        <>
          <rect class="k-outline k-mark--plain" x="12" y="20" width="160" height="26" />
          <Value at={[20, 37]} text={`RULES OF BIPS ${d.bips.join(", ")}`} size={9} cls="k-value--on" />
          <Value at={[12, 64]} text={`RECORDED: ${m.state.toUpperCase()}`} size={8} cls="k-value--muted" />
          {strip(3)}
        </>
      ),
    },
  ];
  return <Storyboard id="a11-life" title={`${d.name} from parameters to rules`} width={300} height={136} frames={frames} />;
}
