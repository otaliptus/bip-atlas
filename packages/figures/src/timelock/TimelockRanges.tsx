import type { DerivedTimelockEncodingFixture } from "../types";

const num = (n: number) => n.toLocaleString("en-US");
const day = (iso: string) => iso.slice(0, 10);

/** timelock-ranges.v1 — static. One 32-bit field split into heights and times; one 16-bit value read as blocks or 512-second units. */
export function TimelockRanges({ fixture }: { fixture: DerivedTimelockEncodingFixture }) {
  const d = fixture.derived;
  const split = (d.threshold / 2 ** 32) * 100;
  return (
    <div class="atlas-tl-ranges">
      <section class="atlas-tl-ranges__row" aria-label="nLockTime">
        <p class="atlas-tl-ranges__head"><strong>nLockTime</strong> · 32 bits, one threshold</p>
        <div class="atlas-tl-ranges__line" role="img" aria-label={`Values below ${num(d.threshold)} are block heights; from ${num(d.threshold)} up they are Unix times, from ${day(d.thresholdIso)} to ${day(d.maxLockTimeIso)}.`}>
          <span class="atlas-tl-ranges__seg" data-kind="height" style={`flex-grow: ${split}`}>heights</span>
          <span class="atlas-tl-ranges__seg" data-kind="time" style={`flex-grow: ${100 - split}`}>Unix times</span>
        </div>
        <p class="atlas-tl-ranges__ticks">
          <span>0</span>
          <span style={`inset-inline-start: ${split}%`}>{num(d.threshold)} = {day(d.thresholdIso)}</span>
          <span>{num(2 ** 32 - 1)} = {day(d.maxLockTimeIso)}</span>
        </p>
      </section>
      <section class="atlas-tl-ranges__row" aria-label="nSequence relative lock-time">
        <p class="atlas-tl-ranges__head"><strong>nSequence</strong> · bits 0–15, unit chosen by bit 22</p>
        <div class="atlas-tl-ranges__pair">
          <div>
            <span class="atlas-tl-ranges__bar" data-kind="height" style="inline-size: 100%" />
            <small>bit 22 clear: up to {num(d.maxBlocks)} blocks (BIP 68: about 1.25 years)</small>
          </div>
          <div>
            <span class="atlas-tl-ranges__bar" data-kind="time" style={`inline-size: ${(d.maxTimeSeconds / (d.maxBlocks * 600)) * 100}%`} />
            <small>bit 22 set: up to {num(d.maxTimeUnits)} × 512 s = {num(d.maxTimeSeconds)} s (BIP 68: about 1.06 years)</small>
          </div>
        </div>
      </section>
      <p class="atlas-lab__source">
        Threshold from Bitcoin Core’s script.h (pinned); ranges from BIP 68’s Compatibility section (lines {fixture.source.line} and {fixture.timeLine}), checked by the tested model. Bar lengths compare wall-clock time at 600 s per block.
      </p>
    </div>
  );
}
