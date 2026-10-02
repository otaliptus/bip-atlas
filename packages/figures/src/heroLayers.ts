/**
 * Layered heroes. A drawing-first hero whose states are all known at build
 * time is rendered on the server once per state *layer*: every part that
 * depends on the state carries `data-when="key=a|b&key2=c"`. A small client
 * island (StateHero) keeps the state and shows the matching layers, so the
 * drawing code never ships to the browser. Without JavaScript the layers of
 * the initial state are the ones shown.
 */
export type HeroState = Record<string, string>;

/** "k=a|b&j=c" → does the state match every clause? */
export function matches(when: string, state: HeroState): boolean {
  return when.split("&").every((clause) => {
    const [k, vs] = clause.split("=");
    return vs.split("|").includes(state[k]);
  });
}

/** Stable key of a state, for status lookups: values in the given key order. */
export const stateKey = (keys: readonly string[], state: HeroState) => keys.map((k) => `${k}=${state[k]}`).join("&");

/** Attributes for a layer: its condition, and hidden unless the initial state matches. */
export function layer(when: string, initial: HeroState): { "data-when": string; style?: string } {
  return matches(when, initial) ? { "data-when": when } : { "data-when": when, style: "display:none" };
}

export interface StripControl {
  kind: "strip";
  key: string;
  label: string;
  /** `when` limits an option to some states; `group` names options that stand in for each other (m/1 and m/1H). */
  options: Array<{ value: string; text: string; when?: string; group?: string }>;
  /** Keep the case of option text (k/K, m/M). */
  keepCase?: boolean;
}
export interface ScrubControl {
  kind: "scrub";
  key: string;
  label: string;
  min: number;
  max: number;
  prev: string;
  next: string;
}
export interface ToggleControl {
  kind: "toggle";
  key: string;
  label: string;
  /** Button text when off and when on. */
  off: string;
  on: string;
}
export type Control = StripControl | ScrubControl | ToggleControl;

export interface HeroSpec {
  figureId: string;
  /** State keys in a fixed order; `status` is keyed by stateKey(keys, state). */
  keys: string[];
  initial: HeroState;
  controls: Control[];
  status: Record<string, string>;
  /** Changing the first key resets the listed keys. */
  resets?: Record<string, HeroState>;
  /** Shown instead of the controls without JavaScript. */
  staticNote: string;
  source: string;
}

/**
 * The state after one control changes: apply the key's resets, then move any
 * strip whose value is no longer offered to an option of the same group, or
 * to its first option. A strip with no options in this state is left alone.
 */
export function nextState(spec: Pick<HeroSpec, "controls" | "resets">, state: HeroState, key: string, value: string): HeroState {
  let next: HeroState = { ...state, [key]: value, ...(spec.resets?.[key] ?? {}) };
  for (const c of spec.controls) {
    if (c.kind !== "strip") continue;
    const opts = c.options.filter((o) => !o.when || matches(o.when, next));
    if (!opts.length || opts.some((o) => o.value === next[c.key])) continue;
    const group = c.options.find((o) => o.value === next[c.key])?.group;
    next = { ...next, [c.key]: (opts.find((o) => group && o.group === group) ?? opts[0]).value };
  }
  return next;
}

/** Every reachable state, for building status tables and tests. */
export function allStates(keys: string[], values: Record<string, string[]>, valid: (s: HeroState) => boolean = () => true): HeroState[] {
  let out: HeroState[] = [{}];
  for (const k of keys) out = out.flatMap((s) => values[k].map((v) => ({ ...s, [k]: v })));
  return out.filter(valid);
}
