/**
 * Pre-rendered heroes (batch 2: SegWit, PSBT, P2SH, Timelocks).
 *
 * Instead of hydrating a Preact island, these heroes render every state they
 * can show on the server, each as its own static drawing, and a few lines of
 * page script (HeroStates.astro) switch between them from the same compact
 * controls. The drawings are the same components; nothing exact is computed
 * in the browser, and the client JS cost is one small shared script.
 */

/** A segmented strip (radiogroup) or a stepper (range plus previous/next buttons). */
export interface HeroControl {
  kind: "strip" | "stepper";
  /** Short id; also part of each radio's name. */
  name: string;
  /** Accessible name of the radiogroup or range. */
  label: string;
  options: Array<{ value: string; text: string; /** Controls reset to their first option when this one is chosen. */ resets?: string[] }>;
  /** Stepper only: other controls set when the stepper moves (e.g. reveal=shown). */
  sets?: Record<string, string>;
  prevLabel?: string;
  nextLabel?: string;
}

export interface HeroState<S> {
  /** Unique, used in drawing ids. */
  id: string;
  /** Every control combination ("v1|v2|…", in control order) that shows this state. */
  keys: string[];
  state: S;
  /** Text for the range's aria-valuetext while this state shows (stepper heroes). */
  valueText?: string;
}

export interface HeroSpec<S> {
  controls: HeroControl[];
  states: Array<HeroState<S>>;
  /** Key shown first once the script runs. */
  initialKey: string;
  /** State shown without JavaScript. */
  noJsId: string;
  /** Shown without JavaScript, above the drawing. */
  staticNote: string;
}

/** Every combination of the given option lists, as "a|b|c" keys. */
export function combos(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((prefix) => list.map((v) => [...prefix, v])), [[]]);
}

/** Checks a spec: every combination of control values maps to exactly one state, and the no-JS and initial states exist. */
export function checkSpec<S>(spec: HeroSpec<S>): HeroSpec<S> {
  const all = combos(spec.controls.map((c) => c.options.map((o) => o.value))).map((k) => k.join("|"));
  const seen = new Map<string, string>();
  for (const st of spec.states) for (const k of st.keys) {
    if (seen.has(k)) throw new Error(`hero spec: key ${k} maps to two states`);
    seen.set(k, st.id);
  }
  const missing = all.filter((k) => !seen.has(k));
  if (missing.length) throw new Error(`hero spec: no state for ${missing.slice(0, 3).join(", ")}`);
  if (!seen.has(spec.initialKey)) throw new Error("hero spec: unknown initial key");
  if (!spec.states.some((s) => s.id === spec.noJsId)) throw new Error("hero spec: unknown no-JS state");
  return spec;
}
