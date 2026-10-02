import { PERIOD, mustSignalInvalid } from "@bip-atlas/models/versionbits";
import { Drawing, Magnifier, Value } from "../kit";
import type { DerivedVersionbitsGuidelineFixture } from "../types";
import { PeriodTile, num, ordinal } from "./parts";
import { PERIODS, START, WINDOW, optionsFor, ranges, runFor } from "./VersionbitsMachine";

/**
 * versionbits-bip8.v1 — static. BIP 8's suggested parameters run twice by
 * the tested model, with no period reaching the threshold: lockinontimeout
 * false fails at the timeout height; true turns the last period into
 * MUST_SIGNAL, then LOCKED_IN and ACTIVE. A magnifier shows the MUST_SIGNAL
 * rule from mustSignalInvalid.
 */
export function VersionbitsBip8({ fixture }: { fixture: DerivedVersionbitsGuidelineFixture }) {
  const t = fixture.derived.threshold;
  if (fixture.derived.timeoutPeriods !== WINDOW) throw new Error(`${fixture.id}: the drawn window (${WINDOW} periods) differs from BIP 8's ${fixture.derived.timeoutPeriods}`);
  const none = Array.from({ length: PERIODS }, () => false);
  const tracks = optionsFor([fixture]).map((o) => ({ lot: o.lot, states: runFor(o, none) }));
  const timeoutPeriod = START + WINDOW;
  // The most non-signalling blocks a MUST_SIGNAL period can hold; one more is invalid.
  let allowed = 0;
  while (!mustSignalInvalid(allowed + 1, t)) allowed++;
  const shown = [0, 1, 2, null, timeoutPeriod - 3, timeoutPeriod - 2, timeoutPeriod - 1, timeoutPeriod, timeoutPeriod + 1];
  const tw = 30;
  const xOf = (slot: number) => 14 + slot * 34 - (slot > 3 ? 14 : 0);
  const ms = tracks[1].states.indexOf("MUST_SIGNAL");
  if (ms < 0 || tracks[0].states[timeoutPeriod] !== "FAILED") throw new Error("versionbits-bip8.v1: the model's runs no longer show the two endings");
  const msX = xOf(shown.indexOf(ms)) + tw / 2;
  const desc =
    `BIP 8 with its suggested threshold of ${num(t)} and a window of ${WINDOW} periods, starting at period ${START}; no period reaches the threshold. ` +
    tracks.map((k) => `lockinontimeout ${k.lot}: ${ranges(k.states)}`).join(". ") +
    `. In a MUST_SIGNAL period, ${num(PERIOD)} − ${num(t)} = ${num(allowed)} blocks may fail to signal; the ${ordinal(allowed + 1)} that fails is invalid, so at least ${num(t)} signal. minimum_activation_height is 0, so LOCKED_IN lasts one period.`;
  return (
    <Drawing id="a11-bip8" width={344} height={304} title="Two endings for a stalled deployment" desc={desc}>
      {tracks.map((k, r) => {
        const y = 40 + r * 76;
        return (
          <g data-lot={String(k.lot)}>
            <Value at={[14, y - 14]} text={`LOCKINONTIMEOUT ${String(k.lot).toUpperCase()}`} size={8.5} cls="k-value--label" />
            {shown.map((p, slot) =>
              p === null ? (
                <text class="k-vb-lbl" x={xOf(slot) + 10} y={y + 15}>…</text>
              ) : (
                <g>
                  {p >= START && p < timeoutPeriod ? <rect class="k-cell k-mark--time" x={xOf(slot)} y={y - 5} width={tw + 4} height="2.5" /> : null}
                  <PeriodTile x={xOf(slot)} y={y} w={tw} h={22} state={k.states[p]} />
                  <text class="k-vb-ruler" x={xOf(slot) + tw / 2} y={y + 33} text-anchor="middle">{p}</text>
                </g>
              ),
            )}
          </g>
        );
      })}
      <line class="k-leader k-dashed" x1={xOf(shown.indexOf(timeoutPeriod)) - 2} y1={18} x2={xOf(shown.indexOf(timeoutPeriod)) - 2} y2={160} />
      <Value at={[xOf(shown.indexOf(timeoutPeriod)) + 2, 27]} text="TIMEOUTHEIGHT" size={8} cls="k-value--label" />
      <Value at={[14, 10]} text={`BAR ABOVE TILES: THE WINDOW · ${fixture.derived.timeoutPeriods} PERIODS = ${num(fixture.derived.timeoutPeriods * PERIOD)} BLOCKS`} size={8.5} cls="k-value--muted" />
      <Magnifier id="a11-bip8-mag" from={[msX, 133]} fromR={9} at={[290, 262]} r={42}>
        <rect class="k-cell k-fill--plain k-dashed" x={254} y={249} width={32} height={26} />
        <text class="k-vb-lbl" x={270} y={266} text-anchor="middle">{num(allowed)}</text>
        <rect class="k-cell k-fill--plain k-cell--em" x={292} y={249} width={32} height={26} />
        <path class="k-leader" d="M295 272 L321 252 M295 252 L321 272" />
      </Magnifier>
      <Value at={[14, 214]} text="MINIMUM ACTIVATION HEIGHT 0:" size={8.5} cls="k-value--muted" />
      <Value at={[14, 226]} text="LOCKED_IN LASTS ONE PERIOD" size={8.5} cls="k-value--muted" />
      <Value at={[14, 244]} text={`${num(PERIOD)} − ${num(t)} = ${num(allowed)} BLOCKS`} size={8.5} cls="k-value--label" />
      <Value at={[14, 256]} text="MAY FAIL TO SIGNAL" size={8.5} cls="k-value--label" />
      <Value at={[14, 274]} text={`THE ${ordinal(allowed + 1).toUpperCase()} THAT FAILS`} size={8.5} cls="k-value--label" />
      <Value at={[14, 286]} text="IS INVALID" size={8.5} cls="k-value--label" />
    </Drawing>
  );
}
