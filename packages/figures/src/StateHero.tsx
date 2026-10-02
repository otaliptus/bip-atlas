import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { holdFocus } from "./focus";
import { matches, nextState, stateKey, type HeroSpec, type HeroState, type StripControl } from "./heroLayers";

/**
 * The client half of a layered hero (see stateHero.ts): it holds the state,
 * renders the compact controls and the live status, and shows the layers of
 * the server-rendered drawing (children) and exact values (`values` slot)
 * whose `data-when` matches. It draws nothing itself.
 */
export function StateHero({ spec, children, values }: { spec: HeroSpec; children?: ComponentChildren; values?: ComponentChildren }) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<HeroState>(spec.initial);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated || !root.current) return;
    for (const el of root.current.querySelectorAll<HTMLElement | SVGElement>("[data-when]")) el.style.display = matches(el.getAttribute("data-when")!, state) ? "" : "none";
  }, [state, hydrated]);

  const visible = (c: StripControl, s: HeroState) => c.options.filter((o) => !o.when || matches(o.when, s));
  const set = (key: string, value: string) => setState(nextState(spec, state, key, value));
  const attrs = Object.fromEntries(spec.keys.map((k) => [`data-s-${k}`, state[k]]));
  const scrub = spec.controls.find((c) => c.kind === "scrub");

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} ref={root} onClickCapture={hydrated ? holdFocus : undefined} {...attrs}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          {spec.controls.map((c) => {
            if (c.kind === "strip") {
              const opts = visible(c, state);
              return opts.length > 1 ? (
                <div class="atlas-strip" role="radiogroup" aria-label={c.label}>
                  {opts.map((o) => (
                    <label class="atlas-strip__opt">
                      <input type="radio" name={`${spec.figureId}-${c.key}`} checked={state[c.key] === o.value} onChange={() => set(c.key, o.value)} />
                      <span class={c.keepCase ? "k-case" : undefined}>{o.text}</span>
                    </label>
                  ))}
                </div>
              ) : null;
            }
            if (c.kind === "toggle") {
              const on = state[c.key] === "1";
              return (
                <div role="group" aria-label={c.label} data-focus-home tabIndex={-1}>
                  <button type="button" class="atlas-scrub__btn atlas-toggle-btn" aria-pressed={on} onClick={() => set(c.key, on ? "0" : "1")}>{on ? c.on : c.off}</button>
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <p class="atlas-hero__static">{spec.staticNote}</p>
      )}
      {children}
      {hydrated && scrub && scrub.kind === "scrub" ? (
        <div class="atlas-scrub" role="group" aria-label={scrub.label}>
          <button type="button" class="atlas-scrub__btn" onClick={() => set(scrub.key, String(Math.max(scrub.min, +state[scrub.key] - 1)))} disabled={+state[scrub.key] <= scrub.min} aria-label={scrub.prev}>←</button>
          <input type="range" min={scrub.min} max={scrub.max} value={state[scrub.key]} aria-label={scrub.label} aria-valuetext={`${state[scrub.key]} of ${scrub.max}`} onInput={(e) => set(scrub.key, (e.currentTarget as HTMLInputElement).value)} />
          <button type="button" class="atlas-scrub__btn" onClick={() => set(scrub.key, String(Math.min(scrub.max, +state[scrub.key] + 1)))} disabled={+state[scrub.key] >= scrub.max} aria-label={scrub.next}>→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{spec.status[stateKey(spec.keys, state)]}</p>
      {values}
      <p class="atlas-hero__source">{spec.source}</p>
    </div>
  );
}
