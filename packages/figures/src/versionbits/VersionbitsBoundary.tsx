import { PERIOD, bip9Next, type Bip9Params, type Bip9State } from "@bip-atlas/models/versionbits";
import { Storyboard, Value, type Frame } from "../kit";
import type { DerivedVersionbitsDeploymentFixture } from "../types";
import { num } from "./parts";

/** Track segments of the junction; the route taken is drawn heavy. */
const TRACK = {
  in: "M8 74 H92",
  fail: "M92 74 L118 120 H128",
  on: "M92 74 H184",
  lock: "M184 74 L210 34 H220",
  stay: "M184 74 H220",
};
const STATIONS: Array<{ s: Bip9State; x: number; y: number; note: string }> = [
  { s: "LOCKED_IN", x: 220, y: 24, note: "" },
  { s: "STARTED", x: 220, y: 64, note: "COUNT AGAIN" },
  { s: "FAILED", x: 128, y: 110, note: "" },
];

/**
 * versionbits-boundary.v1 — static storyboard. A STARTED deployment reaches a
 * period boundary, drawn as a railway junction: the first switch tests the
 * clock against the timeout, the second the count against the threshold.
 * Three trains, each routed by the tested model's bip9Next.
 */
export function VersionbitsBoundary({ fixture }: { fixture: DerivedVersionbitsDeploymentFixture }) {
  const m = fixture.derived.mainnet;
  const p: Bip9Params = { bit: fixture.derived.bit, starttime: m.startEpoch, timeout: m.expireEpoch, threshold: m.threshold };
  const before = m.startEpoch; // any MTP in [starttime, timeout) behaves the same
  const cases = [
    { mtp: before, count: m.threshold, clock: "before the timeout" },
    { mtp: before, count: m.threshold - 1, clock: "before the timeout" },
    { mtp: m.expireEpoch, count: PERIOD, clock: "at the timeout" },
  ].map((c) => ({ ...c, t: bip9Next("STARTED", { mtp: c.mtp, count: c.count }, p) }));
  const frames: Frame[] = cases.map((c) => {
    const route = c.t.to === "FAILED" ? ["in", "fail"] : c.t.to === "LOCKED_IN" ? ["in", "on", "lock"] : ["in", "on", "stay"];
    return {
      note:
        c.t.to === "FAILED"
          ? `Median time past ${c.clock}: FAILED, even with all ${num(c.count)} blocks signalling. The clock is checked first.`
          : `Median time past ${c.clock}, ${num(c.count)} of ${num(PERIOD)} signal: ${c.t.to === "LOCKED_IN" ? "LOCKED_IN." : "still STARTED, one short."}`,
      desc: `A ${fixture.derived.name} deployment in STARTED reaches a period boundary with the median time past ${c.clock} and ${num(c.count)} of the previous ${num(PERIOD)} blocks signalling. First switch: is the median time past at or after the timeout? ${c.t.to === "FAILED" ? "Yes, so the train turns to FAILED." : `No. Second switch: is the count at least ${num(m.threshold)}? ${c.t.to === "LOCKED_IN" ? "Yes: LOCKED_IN." : "No: it stays STARTED."}`} The model's rule: ${c.t.rule}.`,
      draw: () => (
        <>
          <Value at={[8, 14]} text={`MTP ${c.clock.toUpperCase()}`} size={8.5} cls="k-value--label" />
          <Value at={[8, 26]} text={`COUNT ${num(c.count)} / ${num(PERIOD)}`} size={8.5} cls="k-value--label" />
          {Object.entries(TRACK).map(([k, d]) => (
            <path class={route.includes(k) ? "k-vb-route" : "k-vb-rail"} d={d} />
          ))}
          {/* Train at the boundary */}
          <rect class="k-outline k-fill--plain" x="14" y="64" width="30" height="10" rx="1.5" />
          <rect class="k-outline k-mark--plain" x="34" y="59" width="8" height="6" />
          <circle class="k-outline k-fill--plain" cx="21" cy="76" r="2.5" />
          <circle class="k-outline k-fill--plain" cx="37" cy="76" r="2.5" />
          <circle class="k-vb-switch" cx="92" cy="74" r="3.5" />
          <text class="k-vb-lbl" x="92" y="54" text-anchor="middle">1 · MTP ≥ TIMEOUT?</text>
          <circle class="k-vb-switch" cx="184" cy="74" r="3.5" />
          <text class="k-vb-lbl" x="164" y="96" text-anchor="middle">{`2 · COUNT ≥ ${num(m.threshold)}?`}</text>
          {STATIONS.map((st) => (
            <g data-arrived={st.s === c.t.to ? "true" : undefined}>
              <rect class={`k-outline k-fill--plain${st.s === c.t.to ? " k-cell--em" : " k-dashed"}`} x={st.x} y={st.y} width="74" height="20" />
              <text class="k-vb-lbl" x={st.x + 37} y={st.y + 13} text-anchor="middle">{st.s}</text>
              {st.note && st.s === c.t.to ? <text class="k-vb-range" x={st.x + 37} y={st.y + 31} text-anchor="middle">{st.note}</text> : null}
            </g>
          ))}
        </>
      ),
    };
  });
  return <Storyboard id="a11-boundary" title="At a period boundary" width={300} height={140} frames={frames} />;
}
