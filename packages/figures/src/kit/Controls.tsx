/**
 * The two hero affordances (spec §4.5), shared so each hero does not carry
 * its own copy: a compact segmented strip (a radiogroup) and a stepper
 * (previous, a range, next). No hooks: the hero owns the state.
 */
export interface StripOption { value: string; text: string; /** Accessible name when the visible text is terse (e.g. "V7 ✕"). */ aria?: string }

export function Strip({ label, name, options, current, onPick }: { label: string; name: string; options: StripOption[]; current: string; onPick: (value: string) => void }) {
  return (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label class="atlas-strip__opt">
          <input type="radio" name={name} aria-label={o.aria} checked={current === o.value} onChange={() => onPick(o.value)} />
          <span aria-hidden={o.aria ? "true" : undefined}>{o.text}</span>
        </label>
      ))}
    </div>
  );
}

export function Scrub({ label, value, min = 0, max, valueText, unit, onSet }: { label: string; value: number; min?: number; max: number; valueText: string; unit: string; onSet: (value: number) => void }) {
  return (
    <div class="atlas-scrub" role="group" aria-label={label}>
      <button type="button" class="atlas-scrub__btn" onClick={() => onSet(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Previous ${unit}`}>←</button>
      <input type="range" min={min} max={max} value={value} disabled={max <= min} aria-label={label} aria-valuetext={valueText} onInput={(e) => onSet(Number((e.currentTarget as HTMLInputElement).value))} />
      <button type="button" class="atlas-scrub__btn" onClick={() => onSet(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Next ${unit}`}>→</button>
    </div>
  );
}
