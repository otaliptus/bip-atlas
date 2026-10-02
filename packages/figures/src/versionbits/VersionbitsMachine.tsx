import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { PERIOD, simulateBip8, simulateBip9, type Bip8State } from "@bip-atlas/models/versionbits";
import { Drawing, Responsive, Value } from "../kit";
import type { DerivedVersionbitsDeploymentFixture, DerivedVersionbitsGuidelineFixture } from "../types";
import { Gauge, PeriodTile, num } from "./parts";

type Fx = DerivedVersionbitsDeploymentFixture | DerivedVersionbitsGuidelineFixture;
interface Props {
  fixtures: Fx[];
  figureId: string;
}

/** Periods drawn: one before the start, 26 inside the window (BIP 8's "26 retarget intervals", about a year), and a few after. */
export const PERIODS = 30;
export const START = 1;
export const WINDOW = 26;

interface Option { key: string; f: Fx; lot: boolean; text: string; name: string }

/** The run for one option and one set of hypothetical counts (same rules as the tested model; nothing else decides). */
export function runFor(o: Option, meets: boolean[]): Bip8State[] {
  const threshold = thresholdOf(o.f);
  const counts = meets.map((m) => (m ? threshold : threshold - 1));
  if (o.f.kind === "versionbits-deployment") {
    const d = o.f.derived.mainnet;
    // Schematic clock: MTP reaches starttime at period START and timeout WINDOW periods later.
    const mtpAt = (k: number) => d.startEpoch + ((k - START) * (d.expireEpoch - d.startEpoch)) / WINDOW;
    return simulateBip9({ bit: o.f.derived.bit, starttime: d.startEpoch, timeout: d.expireEpoch, threshold }, Array.from({ length: PERIODS - 1 }, (_, i) => ({ mtp: mtpAt(i + 1), count: counts[i] }))).map((s) => s.state);
  }
  return simulateBip8({ bit: 0, startheight: START * PERIOD, timeoutheight: (START + WINDOW) * PERIOD, threshold, minimumActivationHeight: 0, lockinontimeout: o.lot }, 0, counts.slice(0, PERIODS - 1)).map((s) => s.state);
}

export const thresholdOf = (f: Fx) => (f.kind === "versionbits-deployment" ? f.derived.mainnet.threshold : f.derived.threshold);

export function optionsFor(fixtures: Fx[]): Option[] {
  for (const f of fixtures) if (f.kind === "versionbits-guideline" && f.derived.timeoutPeriods !== WINDOW) throw new Error(`${f.id}: window differs from BIP 8's suggestion`);
  return fixtures.flatMap((f): Option[] =>
    f.kind === "versionbits-deployment"
      ? [{ key: f.id, f, lot: false, text: f.derived.name, name: `${f.derived.name} (BIP 9, bit ${f.derived.bit}, mainnet parameters)` }]
      : [false, true].map((lot) => ({ key: `${f.id}-${lot}`, f, lot, text: `BIP 8 · LOT ${lot ? "on" : "off"}`, name: `BIP 8's suggested parameters, lockinontimeout ${lot}` })),
  );
}

/** Hypothetical default: for a BIP 9 deployment one period (10) reaches the threshold; for BIP 8 none does, to show the timeout paths. */
export const defaultMeets = (o: Option) => Array.from({ length: PERIODS }, (_, k) => o.f.kind === "versionbits-deployment" && k === 10);

/** "periods 1–9 STARTED; 10 LOCKED_IN" from a list of states. */
export function ranges(states: Bip8State[]): string {
  const out: string[] = [];
  for (let i = 0; i < states.length; ) {
    let j = i;
    while (j + 1 < states.length && states[j + 1] === states[i]) j++;
    out.push(`${i === j ? `period ${i}` : `periods ${i}–${j}`} ${states[i]}`);
    i = j + 1;
  }
  return out.join("; ");
}

const counted = (s: Bip8State) => s === "STARTED" || s === "MUST_SIGNAL";

/**
 * versionbits-state-machine.v1 — the Version bits chapter's hero (drawing-first).
 *
 * The tested BIP 9 / BIP 8 state machine drawn as a railway: stations for the
 * states, a train at the current one. Below it, a ribbon of retarget
 * periods and a dial for the current period's count. Deployment parameters
 * are the pinned ones; the per-period counts are the reader's hypotheticals
 * (no per-period counts are in the pinned sources), and the figure says so.
 */
export function VersionbitsMachine({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const options = optionsFor(fixtures);
  const [key, setKey] = useState(options[0].key);
  const opt = options.find((o) => o.key === key)!;
  const isBip9 = opt.f.kind === "versionbits-deployment";
  const threshold = thresholdOf(opt.f);
  const [meets, setMeets] = useState<boolean[]>(() => defaultMeets(options[0]));
  const [at, setAt] = useState(0);
  const current = hydrated ? at : PERIODS - 1;
  const states = runFor(opt, meets);
  const state = states[current];
  const choose = (k: string) => {
    setKey(k);
    setMeets(defaultMeets(options.find((o) => o.key === k)!));
    setAt(0);
  };

  const next = current + 1 < PERIODS ? states[current + 1] : null;
  const count = state === "STARTED" ? (meets[current] ? threshold : threshold - 1) : null;
  const countText = state === "MUST_SIGNAL" ? `at least ${num(threshold)} must signal` : count === null ? (state === "ACTIVE" ? "the rules are enforced" : "nothing is counted") : `${num(count)} of ${num(PERIOD)} signal (hypothetical)`;
  const status = `Period ${current}: ${state}; ${countText}.${next && next !== state ? ` Next: ${next}.` : ""}`;
  const desc = `Schematic run of ${PERIODS} periods for ${opt.name}, threshold ${num(threshold)}; window periods ${START}–${START + WINDOW - 1}, timeout reached at period ${START + WINDOW}; ${isBip9 ? "" : "minimum_activation_height 0; "}period heights are schematic. So far: ${ranges(states.slice(0, current + 1))}. ${status}`;

  // Stations: the main line, then a branch (FAILED, or MUST_SIGNAL for BIP 8 with lockinontimeout).
  const branch: Bip8State = opt.lot ? "MUST_SIGNAL" : "FAILED";
  const main: Bip8State[] = ["DEFINED", "STARTED", "LOCKED_IN", "ACTIVE"];
  const seen = new Set(states.slice(0, current + 1));
  const went = (a: Bip8State, b: Bip8State) => states.slice(0, current + 1).some((s, i) => i > 0 && states[i - 1] === a && s === b);
  const edgeLabel: Record<string, string> = {
    "DEFINED>STARTED": isBip9 ? "MTP ≥ STARTTIME" : "HEIGHT ≥ START",
    "STARTED>LOCKED_IN": `≥ ${num(threshold)} SIGNAL`,
    "LOCKED_IN>ACTIVE": isBip9 ? "AFTER ONE PERIOD" : "ONE PERIOD (MIN. HEIGHT 0)",
  };

  const railway = (x0: number, y0: number) => {
    const tx = x0 + 104, bx = x0 + 214;
    const sy = (s: Bip8State) => y0 + 14 + main.indexOf(s) * 58;
    const by = sy("STARTED");
    const seg = (d: string, on: boolean) => <path class={on ? "k-vb-route" : "k-vb-rail"} d={d} />;
    return (
      <g class="k-vb-railway">
        {main.slice(1).map((s, i) => {
          const a = main[i];
          return (
            <>
              {seg(`M${tx} ${sy(a)} V${sy(s)}`, went(a, s))}
              <text class="k-vb-range" x={tx + 8} y={(sy(a) + sy(s)) / 2 + 3}>{edgeLabel[`${a}>${s}`]}</text>
            </>
          );
        })}
        {seg(`M${tx} ${by} H${bx}`, went("STARTED", branch))}
        <text class="k-vb-range" x={tx + 8} y={by - 5}>{opt.lot ? "LAST PERIOD" : isBip9 ? "MTP ≥ TIMEOUT" : "TIMEOUT HEIGHT"}</text>
        {isBip9 ? <>{seg(`M${tx} ${sy("DEFINED")} H${bx + 48} V${by - 10}`, went("DEFINED", "FAILED"))}<text class="k-vb-range" x={bx - 60} y={sy("DEFINED") - 5}>MTP ≥ TIMEOUT</text></> : null}
        {opt.lot ? <>{seg(`M${bx + 48} ${by + 10} V${sy("LOCKED_IN")} H${tx}`, went("MUST_SIGNAL", "LOCKED_IN"))}<text class="k-vb-range" x={bx + 54} y={sy("LOCKED_IN") - 5}>ALWAYS</text></> : null}
        {[...main.map((s) => ({ s, x: x0, y: sy(s) })), { s: branch, x: bx, y: by }].map(({ s, x, y }) => (
          <g data-station={s} data-current={s === state ? "true" : undefined}>
            <circle class="k-vb-switch" cx={x === bx ? bx : tx} cy={y} r="3" />
            <rect class={`k-outline k-fill--plain${s === state ? " k-cell--em" : seen.has(s) ? "" : " k-dashed"}`} x={x === bx ? bx + 4 : x} y={y - 10} width="92" height="20" />
            <text class="k-vb-lbl" x={(x === bx ? bx + 4 : x) + 46} y={y + 3.4} text-anchor="middle">{s}</text>
          </g>
        ))}
        {/* The train, at the current state */}
        {(() => {
          const y = state === branch ? by : sy(state);
          const x = state === branch ? bx - 16 : tx;
          return (
            <g class="k-vb-train">
              <rect class="k-outline k-mark--plain" x={x - 7} y={y - 13} width="14" height="26" rx="3" />
              <rect class="k-outline k-fill--plain" x={x - 4.5} y={y - 10} width="9" height="5" />
              <rect class="k-outline k-fill--plain" x={x - 4.5} y={y + 5} width="9" height="5" />
            </g>
          );
        })()}
      </g>
    );
  };

  const ribbon = (x0: number, y0: number, perRow: number, tw: number, th: number, step: number) => (
    <g class="k-vb-ribbon">
      {states.map((st, k) => {
        const x = x0 + (k % perRow) * (tw + 2);
        const y = y0 + Math.floor(k / perRow) * step;
        const shown = k <= current;
        const inWindow = k >= START && k < START + WINDOW;
        return (
          <g>
            {k % perRow === 0 ? <text class="k-vb-ruler" x={x - 4} y={y + th / 2 + 3} text-anchor="end">{k}</text> : null}
            {inWindow ? <rect class="k-cell k-mark--time" x={x} y={y - 4} width={tw + (k % perRow === perRow - 1 || k === START + WINDOW - 1 ? 0 : 2)} height="2.5" /> : null}
            <PeriodTile x={x} y={y} w={tw} h={th} state={shown ? st : null} current={k === current} />
            {shown && counted(st) ? <text class="k-vb-mark" x={x + tw / 2} y={y + th + 10} text-anchor="middle">{st === "MUST_SIGNAL" || meets[k] ? "≥" : "<"}</text> : null}
          </g>
        );
      })}
    </g>
  );

  const readout = (x: number, y: number) => (
    <g>
      <Gauge cx={x + 52} cy={y + 56} r={48} period={PERIOD} threshold={threshold} count={count} />
      <Value at={[x + 142, y + 20]} text={`PERIOD ${current}`} size={9.5} cls="k-value--label" />
      <Value at={[x + 142, y + 33]} text={`schematic blocks ${num(current * PERIOD)}–${num(current * PERIOD + PERIOD - 1)}`} size={8.5} />
      <Value at={[x + 142, y + 46]} text={state} size={9.5} cls="k-value--label" />
      <Value at={[x + 142, y + 59]} text={state === "MUST_SIGNAL" ? "≥ THRESHOLD REQUIRED" : count === null ? "NOT COUNTED" : "HYPOTHETICAL"} size={8} cls="k-value--muted" />
    </g>
  );

  const legend = (x: number, y: number) => <Value at={[x, y]} text="D DEFINED · S STARTED · M MUST_SIGNAL · L LOCKED_IN · A ACTIVE · F FAILED" size={8.5} cls="k-value--muted" />;

  const wide = (
    <Drawing id={`${figureId}-wide`} width={640} height={262} title="From signalling to rules" desc={desc}>
      {railway(8, 14)}
      <Value at={[344, 14]} text={`RETARGET PERIODS · ${num(PERIOD)} BLOCKS EACH`} size={8.5} cls="k-value--label" />
      {ribbon(360, 34, 10, 24, 22, 38)}
      <Value at={[360, 152]} text="BAR ABOVE TILES: THE WINDOW, START TO TIMEOUT" size={8.5} cls="k-value--muted" />
      {readout(344, 166)}
      {legend(8, 256)}
    </Drawing>
  );
  const narrow = (
    <Drawing id={`${figureId}-narrow`} width={330} height={466} title="From signalling to rules" desc={desc}>
      {railway(6, 14)}
      <Value at={[6, 258]} text={`PERIODS · ${num(PERIOD)} BLOCKS EACH`} size={8.5} cls="k-value--label" />
      {ribbon(22, 274, 15, 18, 20, 36)}
      <Value at={[6, 358]} text="BAR ABOVE TILES: THE WINDOW" size={8.5} cls="k-value--muted" />
      {readout(6, 366)}
      <Value at={[6, 448]} text="D DEFINED · S STARTED · M MUST_SIGNAL" size={8.5} cls="k-value--muted" />
      <Value at={[6, 460]} text="L LOCKED_IN · A ACTIVE · F FAILED" size={8.5} cls="k-value--muted" />
    </Drawing>
  );

  const canToggle = state === "STARTED";
  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Deployment">
            {options.map((o) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-dep`} checked={o.key === key} onChange={() => choose(o.key)} aria-label={o.name} />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
          <div class="atlas-strip" role="radiogroup" aria-label={`Signalling count in period ${current}`}>
            {[true, false].map((m) => (
              <label class="atlas-strip__opt" data-disabled={canToggle ? undefined : "true"}>
                <input type="radio" name={`${figureId}-count`} disabled={!canToggle} checked={canToggle && meets[current] === m} onChange={() => setMeets(meets.map((v, i) => (i === current ? m : v)))} />
                <span>{m ? `${num(threshold)} signal` : `${num(threshold - 1)}: one short`}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: a hypothetical {options[0].text} run, period {defaultMeets(options[0]).indexOf(true)} reaching the threshold, played to the end. With JavaScript you can pick a deployment, step through periods and set the counts.</p>
      )}
      <Responsive wide={wide} narrow={narrow} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Step through retarget periods">
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.max(0, at - 1))} disabled={at === 0} aria-label="Previous period">←</button>
          <input type="range" min={0} max={PERIODS - 1} value={at} aria-label="Retarget period" aria-valuetext={`Period ${at}: ${states[at]}`} onInput={(e) => setAt(Number((e.currentTarget as HTMLInputElement).value))} />
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.min(PERIODS - 1, at + 1))} disabled={at === PERIODS - 1} aria-label="Next period">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <p class="atlas-hero__source">{isBip9 ? "BIP 9 table" : "BIP 8 guidelines, minimum_activation_height 0"}, line {opt.f.source.line}. Schematic clock and hypothetical counts (none are in the pinned sources); states from the tested model.</p>
    </div>
  );
}
