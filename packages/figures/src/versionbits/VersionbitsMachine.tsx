import { useEffect, useState } from "preact/hooks";
import { PERIOD, simulateBip8, simulateBip9, type Bip8State } from "@bip-atlas/models/versionbits";
import type { DerivedVersionbitsDeploymentFixture, DerivedVersionbitsGuidelineFixture } from "../types";

type Fx = DerivedVersionbitsDeploymentFixture | DerivedVersionbitsGuidelineFixture;
interface Props {
  fixtures: Fx[];
  figureId: string;
}

/** Periods drawn: one before the start, 26 inside the window (BIP 8's "26 retarget intervals", about a year), and a few after. */
const PERIODS = 30;
const START = 1;
const WINDOW = 26;

const num = (n: number) => n.toLocaleString("en-US");
const BIP9_STATES: Bip8State[] = ["DEFINED", "STARTED", "LOCKED_IN", "ACTIVE", "FAILED"];
const BIP8_STATES: Bip8State[] = ["DEFINED", "STARTED", "MUST_SIGNAL", "LOCKED_IN", "ACTIVE", "FAILED"];
const SHORT: Record<Bip8State, string> = { DEFINED: "DEF", STARTED: "STA", MUST_SIGNAL: "MSG", LOCKED_IN: "LCK", ACTIVE: "ACT", FAILED: "FLD" };

/**
 * versionbits-state-machine.v1 — the Version bits chapter's hero figure.
 *
 * Runs the tested BIP 9 / BIP 8 state machine over a schematic run of
 * retarget periods. Deployment parameters are the pinned ones; the
 * signalling counts are the reader's hypotheticals (no per-period counts are
 * in the pinned sources), and the figure says so.
 */
export function VersionbitsMachine({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Options: each BIP 9 deployment, and BIP 8's guideline parameters with lockinontimeout off and on.
  interface Option { key: string; f: Fx; lot: boolean; label: string; small: string }
  const options: Option[] = fixtures.flatMap((f): Option[] =>
    f.kind === "versionbits-deployment"
      ? [{ key: f.id, f, lot: false, label: f.label, small: `${f.shortLabel} · mainnet` }]
      : [false, true].map((lot) => ({ key: `${f.id}-${lot}`, f, lot, label: `${f.label}, lockinontimeout ${lot ? "true" : "false"}`, small: f.shortLabel ?? "" })),
  );
  const [key, setKey] = useState(options[0].key);
  const opt = options.find((o) => o.key === key)!;
  const isBip9 = opt.f.kind === "versionbits-deployment";
  const threshold = isBip9 ? (opt.f as DerivedVersionbitsDeploymentFixture).derived.mainnet.threshold : (opt.f as DerivedVersionbitsGuidelineFixture).derived.threshold;
  /** Default hypothetical: for a BIP 9 deployment one period (10) reaches the threshold; for BIP 8 none does, to show the timeout paths. */
  const defaults = (o: Option) => Array.from({ length: PERIODS }, (_, k) => o.f.kind === "versionbits-deployment" && k === 10);
  const [meets, setMeets] = useState<boolean[]>(() => defaults(options[0]));
  const [at, setAt] = useState(0);
  const current = hydrated ? at : PERIODS - 1;
  const counts = meets.map((m) => (m ? threshold : threshold - 1));
  const togglable = (state: Bip8State) => state === "STARTED";

  // Period k starts at block k × 2016 of this schematic run; the window opens at period START and closes WINDOW periods later.
  const run: Array<{ state: Bip8State; rule: string | null }> = isBip9
    ? (() => {
        const d = (opt.f as DerivedVersionbitsDeploymentFixture).derived.mainnet;
        const span = d.expireEpoch - d.startEpoch;
        // Schematic clock: MTP reaches starttime at period START and timeout WINDOW periods later.
        const mtpAt = (k: number) => d.startEpoch + ((k - START) * span) / WINDOW;
        const sim = simulateBip9({ bit: 0, starttime: d.startEpoch, timeout: d.expireEpoch, threshold }, Array.from({ length: PERIODS - 1 }, (_, i) => ({ mtp: mtpAt(i + 1), count: counts[i] })));
        return sim.map((s) => ({ state: s.state, rule: s.via?.rule ?? null }));
      })()
    : simulateBip8(
        { bit: 0, startheight: START * PERIOD, timeoutheight: (START + WINDOW) * PERIOD, threshold, minimumActivationHeight: 0, lockinontimeout: opt.lot },
        0,
        counts.slice(0, PERIODS - 1),
      ).map((s) => ({ state: s.state, rule: s.via?.rule ?? null }));

  const state = run[current].state;
  const counted = (k: number) => run[k].state === "STARTED" || run[k].state === "MUST_SIGNAL";
  const states = isBip9 ? BIP9_STATES : BIP8_STATES;
  const reset = (k: string) => {
    setKey(k);
    setMeets(defaults(options.find((o) => o.key === k)!));
    setAt(0);
  };

  return (
    <div class="atlas-lab atlas-vb-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Deployment</legend>
            {options.map((o) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-dep`} checked={o.key === key} onChange={() => reset(o.key)} />
                <span>{o.label}<small>{o.small}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view: a hypothetical csv run in which period 10 reaches the threshold, played to the end. With JavaScript you can choose a deployment, step through
          the periods and set which periods reach the threshold.
        </p>
      )}

      <p class="atlas-vb-badge">Schematic run · hypothetical signalling counts · rules from the tested model</p>

      <ol class="atlas-vb-states" aria-label="Deployment states">
        {states.map((s) => (
          <li data-current={s === state ? "true" : undefined} data-state={s}>{s}</li>
        ))}
      </ol>

      <div class="atlas-vb-periods" role="group" aria-label={`Retarget periods 0 to ${PERIODS - 1}${hydrated ? "; press a counted period to toggle whether it reaches the threshold" : ""}`}>
        {run.map((r, k) => {
          const shown = k <= current;
          const body = (
            <>
              <span class="atlas-vb-period__n">{k}</span>
              <span class="atlas-vb-period__s">{shown ? SHORT[r.state] : "·"}</span>
              <span class="atlas-vb-period__c">{shown && counted(k) ? (r.state === "MUST_SIGNAL" || meets[k] ? "≥" : "<") : ""}</span>
            </>
          );
          const label = `Period ${k}: ${shown ? r.state : "not reached yet"}${
            shown && r.state === "MUST_SIGNAL" ? `, at least ${threshold} of 2016 must signal (required)` : shown && counted(k) ? `, ${counts[k]} of 2016 signal (${meets[k] ? "meets" : "below"} ${threshold})` : ""
          }`;
          return hydrated && shown && togglable(r.state) ? (
            <button type="button" class="atlas-vb-period" data-state={r.state} data-current={k === current ? "true" : undefined} aria-pressed={meets[k]} aria-label={label}
              onClick={() => setMeets(meets.map((m, i) => (i === k ? !m : m)))}>{body}</button>
          ) : (
            <span class="atlas-vb-period" data-state={shown ? r.state : "pending"} data-current={k === current ? "true" : undefined} aria-label={label} role="img">{body}</span>
          );
        })}
      </div>
      <p class="atlas-vb-key">{states.map((s) => `${SHORT[s]} ${s}`).join(" · ")} · ≥ / &lt; reaches / misses the threshold</p>
      <p class="atlas-vb-axis">
        <span>window opens: period {START}</span>
        <span>{isBip9 ? "timeout passes" : "timeoutheight"}: period {START + WINDOW}</span>
      </p>

      {hydrated ? (
        <div class="atlas-lab__buttons" role="group" aria-label="Step through the periods">
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.max(0, at - 1))} disabled={at === 0}>← Previous period</button>
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.min(PERIODS - 1, at + 1))} disabled={at >= PERIODS - 1}>Next period →</button>
          <button type="button" class="manual-plate-button" onClick={() => setAt(at >= PERIODS - 1 ? 0 : PERIODS - 1)}>{at >= PERIODS - 1 ? "Back to start" : "Play to the end"}</button>
        </div>
      ) : null}

      <section class="atlas-panel atlas-vb-now" aria-live="polite" aria-label="Current period">
        <h3 class="atlas-panel__title">Period {current} · blocks {num(current * PERIOD)}–{num(current * PERIOD + PERIOD - 1)} of this run · {state}</h3>
        <p>{run[current].rule ? `Decided at the period’s first block: ${run[current].rule}.` : "The run starts here, in DEFINED."}</p>
        <p class="atlas-panel__scope">
          {state === "ACTIVE"
            ? "The new rules are enforced in this period’s blocks."
            : state === "LOCKED_IN"
              ? "Locked in: nothing more is counted; the rules are not enforced yet."
              : state === "MUST_SIGNAL"
                ? `Blocks must signal: once ${PERIOD - threshold} of this period’s blocks have not, any further non-signalling block is invalid, so at least ${threshold} signal and the deployment locks in.`
                : state === "STARTED"
                  ? `Counting: ${threshold} of this period’s 2016 blocks must signal for lock-in at the next boundary. Signalling alone changes no rule.`
                  : state === "FAILED"
                    ? "Failed: the bit no longer means anything for this deployment."
                    : "Not started: the bit means nothing yet."}
        </p>
      </section>

      {isBip9 ? (
        (() => {
          const d = (opt.f as DerivedVersionbitsDeploymentFixture).derived;
          return d.mainnet.implied ? (
            <p class="atlas-vb-record">
              <strong>What actually happened (mainnet, as BIP 9’s table records it):</strong> {d.name} on bit {d.bit}, active since block {num(d.mainnet.activeHeight!)}.
              By the rules above, that means LOCKED_IN from block {num(d.mainnet.implied.lockedInFrom)}, after blocks {num(d.mainnet.implied.tallyFrom)}–{num(d.mainnet.implied.tallyTo)} included
              at least {num(d.mainnet.threshold)} signalling blocks.
            </p>
          ) : null;
        })()
      ) : (
        <p class="atlas-vb-record">BIP 8 lists no deployments in its pinned assignments file. These are its suggested parameters; minimum_activation_height is 0, which the BIP allows, so LOCKED_IN lasts a single period.</p>
      )}
      <p class="atlas-lab__source">
        Schematic clock: the window is drawn as {WINDOW} periods, the span BIP 8 equates with about a year (52,416 blocks); for BIP 9 deployments the median time past is
        placed linearly between starttime and timeout. Each period either reaches the threshold ({num(threshold)}) or falls one short ({num(threshold - 1)}). Real
        per-period counts are not in the pinned sources.
      </p>
    </div>
  );
}
