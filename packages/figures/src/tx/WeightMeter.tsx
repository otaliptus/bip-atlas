import type { DerivedTransactionFixture } from "../types";

/** weight-meter.v1 — static. 3 × base + total, shown as 4 units per base byte and 1 per witness byte. */
export function WeightMeter({ fixtures }: { fixtures: DerivedTransactionFixture[] }) {
  const max = Math.max(...fixtures.map((f) => f.derived.measures.weight));
  return (
    <div class="atlas-weight">
      {fixtures.map((f) => {
        const m = f.derived.measures;
        const witness = m.totalSize - m.baseSize;
        return (
          <div class="atlas-weight__row">
            <p class="atlas-weight__name">{f.label} <span>· {f.shortLabel}</span></p>
            <div class="atlas-weight__track" style={`inline-size: ${(m.weight / max) * 100}%`} role="img"
              aria-label={`${m.baseSize} base bytes × 4 = ${m.baseSize * 4} units, plus ${witness} witness-related bytes × 1 = ${witness} units, total ${m.weight} weight units, ${m.vsize} virtual bytes.`}>
              <span class="atlas-weight__base" style={`flex-grow: ${m.baseSize * 4}`}>{m.baseSize} B × 4</span>
              <span class="atlas-weight__wit" style={`flex-grow: ${witness}`}>{witness >= 40 ? `${witness} B × 1` : ""}</span>
            </div>
            <p class="atlas-weight__sum">
              <code>3 × {m.baseSize} + {m.totalSize} = {m.weight}</code> weight units ·{" "}
              <code>⌈{m.weight} ÷ 4⌉ = {m.vsize}</code> vbytes
            </p>
          </div>
        );
      })}
    </div>
  );
}
