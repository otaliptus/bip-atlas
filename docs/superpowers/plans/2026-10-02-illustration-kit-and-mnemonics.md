# Illustration Kit + Mnemonics Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared SVG illustration kit and the site plumbing for drawing-style figures, then redo the Mnemonics chapter (BIP 39) end to end in the Making Software style: 1 drawing-first hero plus 8 static drawings.

**Architecture:**
- The drawing primitives live in `packages/figures/src/kit/`. They are pure Preact SVG components with no hooks, so they server-render to static SVG with zero client JS.
- Recipes opt into the new look with `drawing: true` in `registry.ts`. `Plate.astro` then renders them without the card chrome or the "Interactive / Worked example" tabs.
- Values come only from the existing build-time derive step (`apps/site/src/lib/derive.ts`), which throws on any mismatch with the tested models and published vectors.

**Tech Stack:** Astro 5, Preact 10, TypeScript, vitest, `preact-render-to-string` (tests only), `@noble/*` via `@bip-atlas/models`.

**Spec:** `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`. Taproot, the second pilot chapter, gets its own plan once this one lands. Then the work stops for the user's visual review (spec §8).

## Global Constraints

- **Kit originals stay untouched:** never edit `design-tokens.css`, `catalog.json`, `BIP_ATLAS_SPEC.md`, `scripts/`, `tests/`, `examples/` or `prompts/` (see `CHECKSUMS.json`).
- **Values:** every exact value drawn comes from a model or derive; nothing is typed by hand into a component. A shortened hex value must show an ellipsis and offer the exact value elsewhere in the figure or a disclosure.
- **Budgets:**
  - Exactly 1 interactive figure per chapter, whose recipe is the catalog `heroRecipe` and whose `controls` equal the catalog's `allowedControls`.
  - Static figures: `supportingMin` 3, `supportingMax` 12 (new policy file, Task 1).
- **Prose:** the default reading path stays at 1,100–1,800 words. Numbers written in prose need a test.
- **JavaScript:** client JS stays under 60 KB gzipped in total. Client components import model *subpaths* (`@bip-atlas/models/bip39`), never the package index.
- **No-JS and leaks:** every hero has a no-JS static equivalent (`data-hydrated="false"`). No figure shows a value a viewer in that state could not know, including in `<title>` and `aria-label`.
- **Palette:** fixed meanings (spec §4.3). Mnemonics uses secret (entropy, seed, passphrase), check (checksum bits), hash (SHA-256 output) and plain.
- **Text sizes:** labels are 9.5 user units, uppercase IBM Plex Mono. A drawing that must stay legible at 375 px is either composed at ≤ 344 units wide or ships a narrow composition through `Responsive`.
- **Commits:** end every message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch `illustration-redesign`.
- **Commands** (from the repo root):
  - `pnpm test` runs vitest and the Python kit suite.
  - `pnpm check` runs TypeScript.
  - `pnpm build` builds the site and fails closed.
  - Single file: `npx vitest run <path>`.

---

## File map

| File | Responsibility |
|---|---|
| `content/figure-policy.json` (new) | Static-figure budget that overrides the catalog's `figureBudget` (decision D1). |
| `review/decisions.md` (new) | Decision log D1–D5 with dates. |
| `packages/publication/test/chapters.test.ts` (modify) | Budget assertion reads the policy file. |
| `packages/figures/src/kit/geom.ts` (new) | Isometric projection, point formatting, text-on-face transforms. |
| `packages/figures/src/kit/roles.ts` (new) | `Role` type. |
| `packages/figures/src/kit/Drawing.tsx` (new) | `<Drawing>` root (title, desc, hatch, arrow marker), `idsFor`, `<Responsive>`. |
| `packages/figures/src/kit/Label.tsx` (new) | `<Label>` leader-line label, `<Value>` mono value text. |
| `packages/figures/src/kit/Cells.tsx` (new) | `<Cells>` bit/byte/char cells, `cellsSize`, `<Bracket>`. |
| `packages/figures/src/kit/Arrow.tsx` (new) | `<Arrow>` path with marker. |
| `packages/figures/src/kit/Iso.tsx` (new) | `<IsoBox>`, `boxPoints`, `<IsoTopGrid>`, `<Machine>`. |
| `packages/figures/src/kit/Magnifier.tsx` (new) | `<Magnifier>` zoom bubble. |
| `packages/figures/src/kit/Storyboard.tsx` (new) | `<Storyboard>` frames list. |
| `packages/figures/src/kit/index.ts` (new) | Re-exports. |
| `packages/figures/test/kit.test.ts` (new) | Render-to-string structure tests for the kit. |
| `packages/figures/src/registry.ts` (modify) | `drawing?: boolean` field; 6 new mnemonic recipes; existing 3 marked `drawing: true`. |
| `apps/site/src/components/Plate.astro` (modify) | `drawing` mode: no card, no tabs, margin FIG code, title line, caption line. |
| `apps/site/src/components/Figure.astro` (modify) | Pass `drawing`; dispatch new recipes; no worked slot for drawing recipes. |
| `apps/site/src/styles/atlas.css` (modify) | Palette tokens, kit styles, `.atlas-fig` placement, hero styles; delete dead mnemonic CSS. |
| `packages/models/src/bip39.ts` (modify) | `validLastWords(prefix, wordlist)`. |
| `packages/models/test/bip39.test.ts` (modify) | Tests for `validLastWords`. |
| `packages/figures/src/types.ts` (modify) | `MnemonicDerived.lastWord`, `MnemonicDerived.wordlistSample`. |
| `apps/site/src/lib/derive.ts` (modify) | Fill the two new derived fields; throw on mismatch. |
| `packages/figures/src/mnemonic/*.tsx` (rewrite/new) | `MnemonicCard`, `EntropyBits`, `ChecksumStory`, `EntropyWordLab` (hero), `WordlistIndex`, `LastWordOdds`, `SeedDerivation`, `PassphraseSeeds`, `MnemonicChain`. |
| `packages/figures/src/index.ts` (modify) | Export the new components. |
| `content/chapters/mnemonics.json` (modify) | New figure blocks, renumbering, two prose pointer edits. |
| `review/illustration-pilot-mnemonics.md` (new) | Screenshots list, checks, independent review record. |

---

### Task 1: Figure-budget policy and decision log

**Files:**
- Create: `content/figure-policy.json`
- Create: `review/decisions.md`
- Modify: `packages/publication/test/chapters.test.ts:63-70`

**Interfaces:**
- Produces: `content/figure-policy.json` with shape `{ "hero": 1, "supportingMin": number, "supportingMax": number, "decision": string }`.

- [ ] **Step 1: Write the failing test change**

In `packages/publication/test/chapters.test.ts`, add below the `catalog` constant (line 20):

```ts
const policy = read("content/figure-policy.json") as { hero: number; supportingMin: number; supportingMax: number };
```

and replace the two budget lines inside `it("agrees with its catalog brief", …)`:

```ts
      expect(supporting).toBeGreaterThanOrEqual(brief.figureBudget.supportingMin);
      expect(supporting).toBeLessThanOrEqual(brief.figureBudget.supportingMax);
```

with:

```ts
      // The catalog (a kit original) proposes 1–2 static figures; decision D1 in review/decisions.md raises it.
      expect(interactive.length).toBe(policy.hero);
      expect(supporting).toBeGreaterThanOrEqual(policy.supportingMin);
      expect(supporting).toBeLessThanOrEqual(policy.supportingMax);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run packages/publication/test/chapters.test.ts`
Expected: FAIL. The policy file does not exist yet, so the test throws ENOENT reading it.

- [ ] **Step 3: Create the policy file and the decision log**

`content/figure-policy.json`:

```json
{
  "hero": 1,
  "supportingMin": 1,
  "supportingMax": 12,
  "decision": "D1 in review/decisions.md: the user raised the static-figure budget on 2 October 2026 so chapters can use Making Software-style storyboards. supportingMin stays 1 until every chapter is migrated, then becomes 3."
}
```

`review/decisions.md`:

```markdown
# Editorial and design decisions

Decisions that deliberately depart from the kit originals (`BIP_ATLAS_SPEC.md`, `catalog.json`, `design-tokens.css`). Each was taken with the user.

| # | Date | Decision | Overrides | Where it is enforced |
|---|---|---|---|---|
| D1 | 2026-10-02 | Up to 12 static figures per chapter (still exactly 1 interactive hero) | Spec §3 "one dominant figure and one or two supporting figures"; catalog `figureBudget.supportingMax` 2 | `content/figure-policy.json`, `packages/publication/test/chapters.test.ts` |
| D2 | 2026-10-02 | Full Making Software palette with fixed semantic meanings | Spec §4 blue-only identity; `design-tokens.css` colours | `--atlas-c-*` tokens in `apps/site/src/styles/atlas.css` |
| D3 | 2026-10-02 | Drawing-first heroes with one control; worked-example tabs become static storyboards | Phase-two "two-tab figures" pattern | `drawing: true` recipes, `Plate.astro` |
| D4 | 2026-10-02 | Shared SVG kit fed by models; no raster art, no canvas | — | `packages/figures/src/kit/` |
| D5 | 2026-10-02 | Pilot Mnemonics and Taproot, then user review, before other chapters | — | `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md` §8 |
```

`supportingMin` is 1, not 3, during migration, because unmigrated chapters still carry 2. Task 9 does not change it; the final rollout batch raises it to 3.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run packages/publication/test/chapters.test.ts`
Expected: PASS (all chapters, unchanged content).

- [ ] **Step 5: Commit**

```bash
git add content/figure-policy.json review/decisions.md packages/publication/test/chapters.test.ts
git commit -m "Figure budget policy (D1) and design decision log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Kit foundations: geometry, Drawing, Label, Cells, Arrow

**Files:**
- Create: `packages/figures/src/kit/geom.ts`, `roles.ts`, `Drawing.tsx`, `Label.tsx`, `Cells.tsx`, `Arrow.tsx`, `index.ts`
- Create: `packages/figures/test/kit.test.ts`
- Modify: `packages/figures/package.json` (devDependency)

**Interfaces:**
- Produces (used by every later task):
  - `type Pt = [number, number]`; `COS30`, `SIN30`; `iso(ox, oy) => (x, y, z?) => Pt`; `pts(p: Pt[]) => string`; `onTop(p: Pt) => string`; `onLeft(p: Pt) => string`
  - `type Role = "secret" | "public" | "hash" | "sig" | "check" | "net" | "time" | "hidden" | "plain"`
  - `interface DrawingIds { hatch: string; arrow: string }`; `idsFor(id: string): DrawingIds`
  - `<Drawing id width height title desc>`; `<Responsive wide narrow>`
  - `<Label at text side? len? dy?>`; `<Value at text anchor? size? cls?>`
  - `<Cells x y values size? perRow? rowGap? roleOf? strong? text? cutEvery? emphasis? hatch?>`; `cellsSize(n, {size?, perRow?, rowGap?}) => {width, height, rows}`; `<Bracket x1 x2 y text below?>`
  - `<Arrow d ids label? at?>`

- [ ] **Step 1: Add the test renderer**

Run: `pnpm --filter @bip-atlas/figures add -D preact-render-to-string@6.8.0 preact@10.29.8`
Expected: `packages/figures/package.json` gains a `devDependencies` block; the lockfile updates.

- [ ] **Step 2: Write the failing tests**

`packages/figures/test/kit.test.ts`:

```ts
import { h } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Arrow, Bracket, Cells, Drawing, Label, Responsive, cellsSize, idsFor, iso, onTop, pts } from "../src/kit";

const html = (node: preact.VNode) => render(node);
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("geometry", () => {
  it("projects isometrically: +x down-right, +y down-left, +z up", () => {
    const P = iso(100, 50);
    expect(P(0, 0, 0)).toEqual([100, 50]);
    const [x1, y1] = P(10, 0, 0);
    expect(x1).toBeCloseTo(108.66, 2);
    expect(y1).toBeCloseTo(55, 2);
    const [x2, y2] = P(0, 10, 0);
    expect(x2).toBeCloseTo(91.34, 2);
    expect(y2).toBeCloseTo(55, 2);
    expect(P(0, 0, 7)).toEqual([100, 43]);
  });
  it("formats points and face transforms", () => {
    expect(pts([[1, 2], [3.14159, 4]])).toBe("1,2 3.14,4");
    expect(onTop([5, 6])).toBe(`matrix(${Math.cos(Math.PI / 6)} 0.5 ${-Math.cos(Math.PI / 6)} 0.5 5 6)`);
  });
});

describe("Drawing", () => {
  it("is an image labelled by its own title and description", () => {
    const s = html(h(Drawing, { id: "f1", width: 300, height: 100, title: "T", desc: "D" }, h("rect", {})));
    expect(s).toContain('role="img"');
    expect(s).toContain('aria-labelledby="f1-t f1-d"');
    expect(s).toContain('<title id="f1-t">T</title>');
    expect(s).toContain('<desc id="f1-d">D</desc>');
    expect(s).toContain('viewBox="0 0 300 100"');
    expect(s).toContain('id="f1-hatch"');
    expect(s).toContain('id="f1-arrow"');
    expect(idsFor("f1")).toEqual({ hatch: "url(#f1-hatch)", arrow: "url(#f1-arrow)" });
  });
  it("Responsive renders both compositions", () => {
    const s = html(h(Responsive, { wide: h("i", {}, "W"), narrow: h("i", {}, "N") }));
    expect(s).toContain('class="k-resp__wide"><i>W</i>');
    expect(s).toContain('class="k-resp__narrow"><i>N</i>');
  });
});

describe("Label", () => {
  it("draws a leader and an uppercase label", () => {
    const s = html(h("svg", {}, h(Label, { at: [10, 10], text: "Checksum bits" })));
    expect(s).toContain("CHECKSUM BITS");
    expect(count(s, "<line")).toBe(1);
  });
});

describe("Cells", () => {
  it("draws one cell per value with its role class, strong cells saturated", () => {
    const s = html(h("svg", {}, h(Cells, { x: 0, y: 0, values: ["1", "0", "1"], roleOf: (i: number) => (i === 2 ? "check" : "secret"), strong: (i: number) => i !== 1 })));
    expect(count(s, "<rect")).toBe(3);
    expect(count(s, "k-mark--secret")).toBe(1);
    expect(count(s, "k-fill--secret")).toBe(1);
    expect(count(s, "k-mark--check")).toBe(1);
  });
  it("adds a cut mark before every n-th cell", () => {
    const s = html(h("svg", {}, h(Cells, { x: 0, y: 0, values: Array(22).fill(""), cutEvery: 11, text: false })));
    expect(count(s, 'class="k-cut"')).toBe(1);
  });
  it("hidden cells use the drawing's hatch", () => {
    const s = html(h("svg", {}, h(Cells, { x: 0, y: 0, values: ["?"], roleOf: () => "hidden", hatch: "url(#x-hatch)" })));
    expect(s).toContain("fill:url(#x-hatch)");
  });
  it("measures rows", () => {
    expect(cellsSize(132, { size: 13, perRow: 44, rowGap: 6 })).toEqual({ width: 572, height: 3 * 13 + 2 * 6, rows: 3 });
  });
  it("Bracket labels a range", () => {
    expect(html(h("svg", {}, h(Bracket, { x1: 0, x2: 100, y: 0, text: "11 bits" })))).toContain("11 BITS");
  });
});

describe("Arrow", () => {
  it("uses the drawing's arrow marker", () => {
    const s = html(h("svg", {}, h(Arrow, { d: "M0 0 H10", ids: idsFor("z") })));
    expect(s).toContain('marker-end="url(#z-arrow)"');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run packages/figures/test/kit.test.ts`
Expected: FAIL with "Failed to resolve import "../src/kit"".

- [ ] **Step 4: Implement the foundations**

`packages/figures/src/kit/geom.ts`:

```ts
/** Screen point in SVG user units. */
export type Pt = [number, number];

export const COS30 = Math.cos(Math.PI / 6);
export const SIN30 = 0.5;

/**
 * Isometric projection around a screen origin (ox, oy): +x runs down-right,
 * +y runs down-left, +z runs straight up. One unit along any axis is one
 * user unit of screen length.
 */
export function iso(ox: number, oy: number) {
  return (x: number, y: number, z = 0): Pt => [ox + (x - y) * COS30, oy + (x + y) * SIN30 - z];
}

/** Polygon `points` attribute, two decimals at most. */
export const pts = (p: Pt[]) => p.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(" ");

/** Transform that lays text flat on an isometric top face, reading along +x. */
export const onTop = ([x, y]: Pt) => `matrix(${COS30} ${SIN30} ${-COS30} ${SIN30} ${x} ${y})`;

/** Transform for text on a box's front-left face (constant y), reading along +x. */
export const onLeft = ([x, y]: Pt) => `matrix(${COS30} ${SIN30} 0 1 ${x} ${y})`;
```

`packages/figures/src/kit/roles.ts`:

```ts
/**
 * Fixed meanings shared by every figure on the site (spec §4.3). A role sets
 * a fill colour through CSS (`k-fill--<role>` pastel, `k-mark--<role>`
 * saturated); figures must also carry a second cue (a label or pattern).
 */
export type Role = "secret" | "public" | "hash" | "sig" | "check" | "net" | "time" | "hidden" | "plain";
```

`packages/figures/src/kit/Drawing.tsx`:

```tsx
import type { ComponentChildren } from "preact";

export interface DrawingIds {
  /** `fill` value for hidden/unknown areas: 45° hatch. */
  hatch: string;
  /** `marker-end` value for arrows. */
  arrow: string;
}

export const idsFor = (id: string): DrawingIds => ({ hatch: `url(#${id}-hatch)`, arrow: `url(#${id}-arrow)` });

interface DrawingProps {
  /** Unique within the page; prefixes the title, desc, hatch and arrow ids. */
  id: string;
  width: number;
  height: number;
  /** Short name read first by assistive technology. */
  title: string;
  /** Full text equivalent, generated from the same data as the drawing. */
  desc: string;
  children: ComponentChildren;
}

/** Root of every kit drawing: a scalable SVG image with its own text equivalent. */
export function Drawing({ id, width, height, title, desc, children }: DrawingProps) {
  return (
    <svg class="k-drawing" viewBox={`0 0 ${width} ${height}`} style={`--k-w:${width}px`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
      <title id={`${id}-t`}>{title}</title>
      <desc id={`${id}-d`}>{desc}</desc>
      <defs>
        <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" class="k-hatch-bg" />
          <line x1="0" y1="0" x2="0" y2="5" class="k-hatch" />
        </pattern>
        <marker id={`${id}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1 L7 4 L1 7" class="k-arrowhead" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

/**
 * Two compositions of one drawing. CSS shows `wide` from 48rem up and
 * `narrow` below; the hidden one is display:none, so it is also hidden from
 * assistive technology. Give the two Drawings different ids.
 */
export function Responsive({ wide, narrow }: { wide: ComponentChildren; narrow: ComponentChildren }) {
  return (
    <div class="k-resp">
      <div class="k-resp__wide">{wide}</div>
      <div class="k-resp__narrow">{narrow}</div>
    </div>
  );
}
```

`packages/figures/src/kit/Label.tsx`:

```tsx
import type { Pt } from "./geom";

type Side = "left" | "right" | "up" | "down";

/** A short leader line from an anchor to an uppercase monospace label (Making Software style). */
export function Label({ at, text, side = "right", len = 16, dy = 0 }: { at: Pt; text: string; side?: Side; len?: number; dy?: number }) {
  const [x, y] = at;
  if (side === "up" || side === "down") {
    const s = side === "down" ? 1 : -1;
    const y2 = y + s * len;
    return (
      <g class="k-label">
        <line class="k-leader" x1={x} y1={y} x2={x} y2={y2} />
        <text x={x} y={side === "down" ? y2 + 10 : y2 - 4} text-anchor="middle">{text.toUpperCase()}</text>
      </g>
    );
  }
  const s = side === "right" ? 1 : -1;
  const x2 = x + s * len;
  return (
    <g class="k-label">
      <line class="k-leader" x1={x} y1={y} x2={x2} y2={y + dy} />
      <text x={x2 + s * 4} y={y + dy + 3.3} text-anchor={side === "right" ? "start" : "end"}>{text.toUpperCase()}</text>
    </g>
  );
}

/** A value (hex, number, word) in ordinary monospace, normal case. */
export function Value({ at, text, anchor = "start", size = 10, cls = "" }: { at: Pt; text: string; anchor?: "start" | "middle" | "end"; size?: number; cls?: string }) {
  return (
    <text class={`k-value ${cls}`.trim()} x={at[0]} y={at[1]} text-anchor={anchor} style={size === 10 ? undefined : `font-size:${size}px`}>
      {text}
    </text>
  );
}
```

`packages/figures/src/kit/Cells.tsx`:

```tsx
import type { Role } from "./roles";

export interface CellsProps {
  x: number;
  y: number;
  /** One entry per cell; the text drawn inside it (empty string for none). */
  values: string[];
  size?: number;
  perRow?: number;
  rowGap?: number;
  roleOf?: (i: number) => Role;
  /** Saturated fill instead of pastel (e.g. a 1 bit). */
  strong?: (i: number) => boolean;
  text?: boolean;
  /** Draw a cut mark before every n-th cell (e.g. 11 for BIP 39 groups). */
  cutEvery?: number;
  /** Thick outline (e.g. the selected group). */
  emphasis?: (i: number) => boolean;
  /** `fill` for hidden cells, from `idsFor(...).hatch`. */
  hatch?: string;
}

export function cellsSize(n: number, { size = 12, perRow = n, rowGap = 4 }: { size?: number; perRow?: number; rowGap?: number } = {}) {
  const rows = Math.ceil(n / perRow);
  return { width: Math.min(n, perRow) * size, height: rows * size + (rows - 1) * rowGap, rows };
}

/** Row or grid of square cells: bits, bytes or characters. */
export function Cells({ x, y, values, size = 12, perRow = values.length, rowGap = 4, roleOf = () => "plain", strong, text = true, cutEvery, emphasis, hatch }: CellsProps) {
  return (
    <g class="k-cells">
      {values.map((v, i) => {
        const cx = x + (i % perRow) * size;
        const cy = y + Math.floor(i / perRow) * (size + rowGap);
        const role = roleOf(i);
        const tone = strong?.(i) ? "k-mark" : "k-fill";
        return (
          <g>
            <rect
              class={`k-cell ${tone}--${role}${emphasis?.(i) ? " k-cell--em" : ""}`}
              x={cx}
              y={cy}
              width={size}
              height={size}
              style={role === "hidden" && hatch ? `fill:${hatch}` : undefined}
            />
            {text && v ? (
              <text class={`k-cell__t${strong?.(i) ? " k-cell__t--on" : ""}`} x={cx + size / 2} y={cy + size / 2 + 3.4} text-anchor="middle">{v}</text>
            ) : null}
            {cutEvery && i % perRow !== 0 && i % cutEvery === 0 ? <line class="k-cut" x1={cx} y1={cy - 3} x2={cx} y2={cy + size + 3} /> : null}
          </g>
        );
      })}
    </g>
  );
}

/** Square bracket under (or over) a range, with a centred uppercase label. */
export function Bracket({ x1, x2, y, text, below = true }: { x1: number; x2: number; y: number; text: string; below?: boolean }) {
  const s = below ? 1 : -1;
  const t = y + s * 5;
  const mid = (x1 + x2) / 2;
  return (
    <g class="k-label">
      <path class="k-leader" d={`M${x1} ${y} V${t} H${x2} V${y} M${mid} ${t} V${t + s * 5}`} />
      <text x={mid} y={below ? t + 17 : t - 9} text-anchor="middle">{text.toUpperCase()}</text>
    </g>
  );
}
```

The cut-mark test expects exactly one cut for 22 cells cut every 11. With `perRow` defaulting to 22, `i % perRow !== 0` excludes index 0, and index 11 yields the single cut.

`packages/figures/src/kit/Arrow.tsx`:

```tsx
import type { DrawingIds } from "./Drawing";
import type { Pt } from "./geom";

/** Thin arrow along an SVG path, with an optional uppercase label. */
export function Arrow({ d, ids, label, at }: { d: string; ids: DrawingIds; label?: string; at?: Pt }) {
  return (
    <g class="k-arrow">
      <path class="k-line" d={d} marker-end={ids.arrow} />
      {label && at ? <text class="k-arrow__t" x={at[0]} y={at[1]} text-anchor="middle">{label.toUpperCase()}</text> : null}
    </g>
  );
}
```

`packages/figures/src/kit/index.ts`:

```ts
export * from "./geom";
export type { Role } from "./roles";
export * from "./Drawing";
export * from "./Label";
export * from "./Cells";
export * from "./Arrow";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run packages/figures/test/kit.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/figures/src/kit packages/figures/test/kit.test.ts packages/figures/package.json pnpm-lock.yaml
git commit -m "Illustration kit: geometry, Drawing, Label, Cells, Arrow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Kit objects: isometric boxes, Machine, Magnifier, Storyboard

**Files:**
- Create: `packages/figures/src/kit/Iso.tsx`, `Magnifier.tsx`, `Storyboard.tsx`
- Modify: `packages/figures/src/kit/index.ts`
- Modify: `packages/figures/test/kit.test.ts`

**Interfaces:**
- Consumes: `iso`, `pts`, `onTop`, `onLeft`, `Pt` (Task 2); `Role`; `Drawing`, `idsFor`, `DrawingIds`.
- Produces:
  - `<IsoBox at w d h role? hatch? cls?>`. `at` is the screen point of the box's back-top corner, i.e. iso (0,0,h) after projection with origin `at` shifted by +h. See `boxPoints`.
  - `boxPoints({at,w,d,h}) => { P, top, frontLeft, frontRight, topFront, bottomFront, left, right }`
  - `<IsoTopGrid at w d h cols rows roleOf?>`
  - `<Machine at w? d? h? label sub? role?>`
  - `<Magnifier id from fromR? at r? children>`
  - `interface Frame { note: string; desc: string; draw: (ids: DrawingIds) => ComponentChildren }`; `<Storyboard id title width height frames>`

- [ ] **Step 1: Write the failing tests** (append to `kit.test.ts`; update the import line to also import `IsoBox, IsoTopGrid, Machine, Magnifier, Storyboard, boxPoints`)

```ts
describe("isometric objects", () => {
  it("IsoBox draws three faces carrying its role", () => {
    const s = html(h("svg", {}, h(IsoBox, { at: [100, 20], w: 40, d: 20, h: 10, role: "hash" })));
    expect(count(s, "<polygon")).toBe(3);
    expect(s).toContain('data-role="hash"');
    expect(s).toContain("k-face--top");
  });
  it("boxPoints puts the top face's front corner below its back corner", () => {
    const b = boxPoints({ at: [100, 20], w: 40, d: 20, h: 10 });
    expect(b.topFront[1]).toBeGreaterThan(b.top[1]);
    expect(b.bottomFront[1] - b.topFront[1]).toBeCloseTo(10, 5);
  });
  it("IsoTopGrid draws rows × cols cells", () => {
    const s = html(h("svg", {}, h(IsoTopGrid, { at: [0, 0], w: 40, d: 20, h: 5, cols: 4, rows: 2 })));
    expect(count(s, "<polygon")).toBe(8);
  });
  it("Machine names its function on the box", () => {
    const s = html(h("svg", {}, h(Machine, { at: [50, 10], label: "sha-256", sub: "hash" })));
    expect(s).toContain("SHA-256");
    expect(s).toContain(">hash<");
  });
});

describe("Magnifier", () => {
  it("clips its content to the lens", () => {
    const s = html(h("svg", {}, h(Magnifier, { id: "m", from: [10, 10], at: [80, 40], r: 20 }, h("rect", { width: 5, height: 5 }))));
    expect(s).toContain('<clipPath id="m-clip">');
    expect(s).toContain('clip-path="url(#m-clip)"');
  });
});

describe("Storyboard", () => {
  it("renders an ordered list of titled frames with notes", () => {
    const frames = [1, 2, 3].map((n) => ({ note: `Note ${n}`, desc: `Desc ${n}`, draw: () => h("rect", {}) }));
    const s = html(h(Storyboard, { id: "sb", title: "Checksum", width: 300, height: 150, frames }));
    expect(s.startsWith('<ol class="k-story"')).toBe(true);
    expect(count(s, '<li class="k-story__frame">')).toBe(3);
    expect(s).toContain("Checksum, step 2 of 3");
    expect(s).toContain("Note 3");
    expect(s).toContain('id="sb-2-t"');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run packages/figures/test/kit.test.ts`
Expected: FAIL. `IsoBox` (and the other new names) are not exported from `../src/kit`.

- [ ] **Step 3: Implement**

`packages/figures/src/kit/Iso.tsx`:

```tsx
import { iso, onLeft, pts, type Pt } from "./geom";
import type { Role } from "./roles";

export interface BoxGeom {
  /** Screen point of the box's back corner at ground level (iso origin). */
  at: Pt;
  /** Extent along +x (down-right), +y (down-left) and +z (up). */
  w: number;
  d: number;
  h: number;
}

/** Projected corner and face anchors of a box, for labels and arrows. */
export function boxPoints({ at, w, d, h }: BoxGeom) {
  const P = iso(at[0], at[1]);
  return {
    P,
    /** Back corner of the top face. */
    top: P(0, 0, h),
    topCenter: P(w / 2, d / 2, h),
    topFront: P(w, d, h),
    bottomFront: P(w, d, 0),
    /** Middle of the front-left face. */
    left: P(w / 2, d, h / 2),
    /** Middle of the front-right face. */
    right: P(w, d / 2, h / 2),
    /** Leftmost and rightmost silhouette points, mid-height. */
    frontLeft: P(0, d, h / 2),
    frontRight: P(w, 0, h / 2),
  };
}

/** A box in isometric projection: top, front-left and front-right faces. */
export function IsoBox({ at, w, d, h, role = "plain", hatch, cls = "" }: BoxGeom & { role?: Role; hatch?: string; cls?: string }) {
  const P = iso(at[0], at[1]);
  const top: Pt[] = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)];
  const left: Pt[] = [P(0, d, h), P(w, d, h), P(w, d, 0), P(0, d, 0)];
  const right: Pt[] = [P(w, 0, h), P(w, d, h), P(w, d, 0), P(w, 0, 0)];
  return (
    <g class={`k-iso ${cls}`.trim()} data-role={role}>
      <polygon class="k-face k-face--left" points={pts(left)} />
      <polygon class="k-face k-face--right" points={pts(right)} />
      <polygon class="k-face k-face--top" points={pts(top)} style={role === "hidden" && hatch ? `fill:${hatch}` : undefined} />
    </g>
  );
}

/** Grid of cells on a box's top face: columns along +x, rows along +y. */
export function IsoTopGrid({ at, w, d, h, cols, rows, roleOf = () => "plain" }: BoxGeom & { cols: number; rows: number; roleOf?: (i: number) => Role }) {
  const P = iso(at[0], at[1]);
  const cw = w / cols;
  const rd = d / rows;
  return (
    <g class="k-isogrid">
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <polygon
            class={`k-cell k-fill--${roleOf(i)}`}
            points={pts([P(c * cw, r * rd, h), P((c + 1) * cw, r * rd, h), P((c + 1) * cw, (r + 1) * rd, h), P(c * cw, (r + 1) * rd, h)])}
          />
        );
      })}
    </g>
  );
}

/** A function drawn as an isometric box with its name on the front-left face (SHA-256, PBKDF2, TapTweak). */
export function Machine({ at, w = 76, d = 40, h = 34, label, sub, role = "plain" }: { at: Pt; w?: number; d?: number; h?: number; label: string; sub?: string; role?: Role }) {
  const P = iso(at[0], at[1]);
  return (
    <g class="k-machine">
      <IsoBox at={at} w={w} d={d} h={h} role={role} />
      <text class="k-machine__t" transform={onLeft(P(7, d, h - 13))}>{label.toUpperCase()}</text>
      {sub ? <text class="k-machine__s" transform={onLeft(P(7, d, h - 25))}>{sub}</text> : null}
    </g>
  );
}
```

The `Machine` test expects `>hash<` for `sub`. Keep `sub` in normal case, as above.

`packages/figures/src/kit/Magnifier.tsx`:

```tsx
import type { ComponentChildren } from "preact";
import type { Pt } from "./geom";

/**
 * Zoom bubble: a small circle at `from` joined by two tangent lines to a
 * lens at `at`, whose content is clipped to the lens. Draw the content in
 * lens coordinates (centred on `at`).
 */
export function Magnifier({ id, from, fromR = 6, at, r = 40, children }: { id: string; from: Pt; fromR?: number; at: Pt; r?: number; children?: ComponentChildren }) {
  const [fx, fy] = from;
  const [cx, cy] = at;
  const n = Math.atan2(cy - fy, cx - fx) + Math.PI / 2;
  const off = (px: number, py: number, rr: number, s: number): Pt => [px + Math.cos(n) * rr * s, py + Math.sin(n) * rr * s];
  const a1 = off(fx, fy, fromR, 1), a2 = off(fx, fy, fromR, -1), b1 = off(cx, cy, r, 1), b2 = off(cx, cy, r, -1);
  return (
    <g class="k-mag">
      <clipPath id={`${id}-clip`}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <line class="k-leader" x1={a1[0]} y1={a1[1]} x2={b1[0]} y2={b1[1]} />
      <line class="k-leader" x1={a2[0]} y1={a2[1]} x2={b2[0]} y2={b2[1]} />
      <circle class="k-mag__src" cx={fx} cy={fy} r={fromR} />
      <circle class="k-mag__lens" cx={cx} cy={cy} r={r} />
      <g clip-path={`url(#${id}-clip)`}>{children}</g>
      <circle class="k-mag__rim" cx={cx} cy={cy} r={r} />
    </g>
  );
}
```

`packages/figures/src/kit/Storyboard.tsx`:

```tsx
import type { ComponentChildren } from "preact";
import { Drawing, idsFor, type DrawingIds } from "./Drawing";

export interface Frame {
  /** One sentence under the frame, visible to everyone. */
  note: string;
  /** Text equivalent of the drawing. */
  desc: string;
  draw: (ids: DrawingIds) => ComponentChildren;
}

/**
 * The same scene drawn several times with one change per frame (Making
 * Software's storyboards). Frames share one viewBox so they line up; the grid
 * reflows from three columns to one.
 */
export function Storyboard({ id, title, width, height, frames }: { id: string; title: string; width: number; height: number; frames: Frame[] }) {
  return (
    <ol class="k-story" aria-label={title} style={`--k-frame:${width}px`}>
      {frames.map((f, i) => (
        <li class="k-story__frame">
          <Drawing id={`${id}-${i}`} width={width} height={height} title={`${title}, step ${i + 1} of ${frames.length}`} desc={f.desc}>
            {f.draw(idsFor(`${id}-${i}`))}
          </Drawing>
          <p class="k-story__note">
            <span class="k-story__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span> {f.note}
          </p>
        </li>
      ))}
    </ol>
  );
}
```

Append to `packages/figures/src/kit/index.ts`:

```ts
export * from "./Iso";
export * from "./Magnifier";
export * from "./Storyboard";
```

- [ ] **Step 4: Run to verify the tests pass**

Run: `npx vitest run packages/figures/test/kit.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/figures/src/kit packages/figures/test/kit.test.ts
git commit -m "Illustration kit: isometric boxes, Machine, Magnifier, Storyboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Palette tokens, kit CSS and drawing-mode figure placement

**Files:**
- Modify: `packages/figures/src/registry.ts:5-15` (interface), and the entries `mnemonic-card.v1`, `entropy-word-pipeline.v1`, `seed-derivation.v1`
- Modify: `apps/site/src/components/Plate.astro`
- Modify: `apps/site/src/components/Figure.astro:166` and the `worked` fragment
- Modify: `apps/site/src/styles/atlas.css` (append a new section at the end)

**Interfaces:**
- Produces:
  - `RecipeDefinition.drawing?: boolean`.
  - Plate prop `drawing?: boolean`.
  - CSS classes:
    - figure placement: `.atlas-fig`, `.atlas-fig--prose|wide`, `.atlas-fig__code`, `.atlas-fig__title`, `.atlas-fig__stage`, `.atlas-fig__caption`;
    - kit: `.k-drawing`, `.k-resp*`, `.k-story*`, `.k-fill--<role>`, `.k-mark--<role>`, `.k-face--*`, `.k-label`, `.k-leader`, `.k-cell*`, `.k-cut`, `.k-line`, `.k-arrowhead`, `.k-hatch`, `.k-hatch-bg`, `.k-mag*`, `.k-machine__*`, `.k-value`, `.k-engrave`.
- Consumers: every drawing component (Tasks 6–8).

- [ ] **Step 1: Add the registry flag**

In `packages/figures/src/registry.ts`, inside `interface RecipeDefinition`, after `fixtureKind: string;` add:

```ts
  /**
   * Drawn in the illustration-kit style (decision D3): rendered without the
   * figure card or the Interactive / Worked example tabs.
   */
  drawing?: boolean;
```

Add `drawing: true,` to the three existing entries `mnemonic-card.v1`, `entropy-word-pipeline.v1` and `seed-derivation.v1`.

- [ ] **Step 2: Drawing mode in `Plate.astro`**

Replace the `Props` interface and the frontmatter destructuring:

```astro
interface Props {
  figure: Figure;
  numbers: Map<string, number>;
  interactive?: boolean;
  /** Illustration-kit figure: no card, no tabs (decision D3). */
  drawing?: boolean;
  path: string;
}
const { figure, numbers, interactive = false, drawing = false, path } = Astro.props;
const id = `fig-${figure.figure.replace(".", "-").toLowerCase()}`;
const tabbed = interactive && !drawing && Astro.slots.has("worked");
```

Wrap the existing `<figure …>…</figure>` markup in `{drawing ? ( …new markup… ) : ( …existing markup unchanged… )}` with this new markup:

```astro
<figure class:list={["atlas-fig", `atlas-fig--${figure.layout}`]} id={id} aria-labelledby={`${id}-title`} data-interactive={interactive ? "true" : undefined}>
  <span class="atlas-fig__code" aria-hidden="true">FIG. {figure.figure}</span>
  <p class="atlas-fig__title" id={`${id}-title`}><span class="atlas-fig__num">Fig. {figure.figure}</span> {figure.title}</p>
  <div class="atlas-fig__stage"><slot /></div>
  <figcaption class="atlas-fig__caption">
    <Inline text={figure.caption} /><ClaimRefs claims={figure.claims} numbers={numbers} at={path} />
  </figcaption>
</figure>
```

Leave the tab `<script>` as is: it only acts on `[data-tabs]`, which drawing figures never render.

- [ ] **Step 3: Pass the flag from `Figure.astro`**

Change line 166:

```astro
<Plate figure={figure} numbers={numbers} interactive={recipe.interactive} drawing={recipe.drawing === true} path={path}>
```

and change the worked-slot guard from `{recipe.interactive && (` to:

```astro
  {recipe.interactive && !recipe.drawing && (
```

- [ ] **Step 4: Tokens, kit styles and placement CSS**

Append to `apps/site/src/styles/atlas.css`:

```css
/* ==========================================================================
   Illustration kit (decisions D2–D3). Making Software-style drawings:
   black linework, flat fills with fixed meanings, tiny uppercase labels.
   ========================================================================== */
:root {
  --atlas-ink: #222225;
  --atlas-c-secret: #f0365a; --atlas-c-secret-p: #ffd0d9;
  --atlas-c-public: #12b76a; --atlas-c-public-p: #c8f5dc;
  --atlas-c-hash: #f5b800;   --atlas-c-hash-p: #fff0b3;
  --atlas-c-sig: #2945f5;    --atlas-c-sig-p: #d5dcff;
  --atlas-c-check: #8b5cf6;  --atlas-c-check-p: #e6dcff;
  --atlas-c-net: #06b6d4;    --atlas-c-net-p: #c9f1f8;
  --atlas-c-time: #f97316;   --atlas-c-time-p: #ffe0c7;
  --atlas-c-hidden: #9a9aa6; --atlas-c-hidden-p: #ededf2;
  --atlas-c-plain: #ffffff;  --atlas-c-plain-p: #ffffff;
}

/* ---------- figure placement (drawing mode) ---------- */
.atlas-flow > .atlas-fig { margin-block: var(--manual-space-7); position: relative; }
.atlas-flow > .atlas-fig--wide { max-inline-size: var(--manual-wide-max); }
.atlas-fig__title { margin: 0 0 var(--manual-space-4); font-family: var(--manual-code); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--manual-muted); }
.atlas-fig__num { color: var(--manual-blue); margin-inline-end: 0.5rem; }
.atlas-fig__code { display: none; }
.atlas-fig__stage { position: relative; }
.atlas-fig__caption { margin-block-start: var(--manual-space-4); max-inline-size: var(--atlas-measure); font-size: 0.9375rem; line-height: 1.5; font-style: italic; color: var(--manual-muted); }
@media (min-width: 64rem) {
  .atlas-fig__code { display: block; position: absolute; inset-inline-start: -2.5rem; inset-block-start: 0.1rem; writing-mode: vertical-rl; rotate: 180deg; font-family: var(--manual-pixel); font-size: 0.75rem; letter-spacing: 0.04em; color: var(--manual-blue); }
  .atlas-fig__num { display: none; }
}

/* ---------- drawings ---------- */
.k-drawing { display: block; inline-size: 100%; max-inline-size: calc(var(--k-w) * 1.35); block-size: auto; margin-inline: auto; overflow: visible; font-family: var(--manual-code); }
.k-drawing text { font-size: 10px; fill: var(--atlas-ink); }
.k-label text, .k-arrow__t { font-size: 9.5px; letter-spacing: 0.06em; fill: var(--atlas-ink); }
.k-value { font-size: 10px; }
.k-leader, .k-line, .k-cut { fill: none; stroke: var(--atlas-ink); stroke-width: 0.75; vector-effect: non-scaling-stroke; }
.k-cut { stroke-width: 1.5; }
.k-arrowhead { fill: none; stroke: var(--atlas-ink); stroke-width: 1; stroke-linejoin: round; }
.k-hatch { stroke: var(--atlas-c-hidden); stroke-width: 1.2; }
.k-hatch-bg { fill: var(--atlas-c-hidden-p); }
.k-cell, .k-face, .k-outline { stroke: var(--atlas-ink); stroke-width: 0.75; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.k-cell--em { stroke-width: 2; }
.k-cell__t { font-size: 9px; }
.k-cell__t--on { fill: #ffffff; font-weight: 500; }
.k-engrave { font-size: 10px; letter-spacing: 0.02em; }
.k-machine__t { font-size: 9.5px; letter-spacing: 0.06em; font-weight: 500; }
.k-machine__s { font-size: 8.5px; fill: var(--manual-muted); }
.k-mag__src { fill: none; stroke: var(--atlas-ink); stroke-width: 0.75; }
.k-mag__lens { fill: #ffffff; }
.k-mag__rim { fill: none; stroke: var(--atlas-ink); stroke-width: 1.25; }

/* Role fills: pastel by default, saturated with k-mark. */
.k-fill--secret { fill: var(--atlas-c-secret-p); } .k-mark--secret { fill: var(--atlas-c-secret); }
.k-fill--public { fill: var(--atlas-c-public-p); } .k-mark--public { fill: var(--atlas-c-public); }
.k-fill--hash { fill: var(--atlas-c-hash-p); }     .k-mark--hash { fill: var(--atlas-c-hash); }
.k-fill--sig { fill: var(--atlas-c-sig-p); }       .k-mark--sig { fill: var(--atlas-c-sig); }
.k-fill--check { fill: var(--atlas-c-check-p); }   .k-mark--check { fill: var(--atlas-c-check); }
.k-fill--net { fill: var(--atlas-c-net-p); }       .k-mark--net { fill: var(--atlas-c-net); }
.k-fill--time { fill: var(--atlas-c-time-p); }     .k-mark--time { fill: var(--atlas-c-time); }
.k-fill--hidden { fill: var(--atlas-c-hidden-p); } .k-mark--hidden { fill: var(--atlas-c-hidden); }
.k-fill--plain { fill: #ffffff; }                  .k-mark--plain { fill: var(--atlas-ink); }

/* Isometric faces: top pastel, sides mixed toward the saturated colour. */
.k-iso { --k-p: #ffffff; --k-s: #c9c9d2; }
.k-iso[data-role="secret"] { --k-p: var(--atlas-c-secret-p); --k-s: var(--atlas-c-secret); }
.k-iso[data-role="public"] { --k-p: var(--atlas-c-public-p); --k-s: var(--atlas-c-public); }
.k-iso[data-role="hash"] { --k-p: var(--atlas-c-hash-p); --k-s: var(--atlas-c-hash); }
.k-iso[data-role="sig"] { --k-p: var(--atlas-c-sig-p); --k-s: var(--atlas-c-sig); }
.k-iso[data-role="check"] { --k-p: var(--atlas-c-check-p); --k-s: var(--atlas-c-check); }
.k-iso[data-role="net"] { --k-p: var(--atlas-c-net-p); --k-s: var(--atlas-c-net); }
.k-iso[data-role="time"] { --k-p: var(--atlas-c-time-p); --k-s: var(--atlas-c-time); }
.k-iso[data-role="hidden"] { --k-p: var(--atlas-c-hidden-p); --k-s: var(--atlas-c-hidden); }
.k-face--top { fill: var(--k-p); }
.k-face--left { fill: color-mix(in srgb, var(--k-p) 72%, var(--k-s)); }
.k-face--right { fill: color-mix(in srgb, var(--k-p) 48%, var(--k-s)); }

/* Two compositions. */
.k-resp__narrow { display: none; }
@media (max-width: 47.99rem) {
  .k-resp__wide { display: none; }
  .k-resp__narrow { display: block; }
}

/* Storyboards. */
.k-story { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--k-frame)), 1fr)); gap: var(--manual-space-5) var(--manual-space-4); }
.k-story__frame { margin: 0; min-inline-size: 0; }
.k-story__frame .k-drawing { max-inline-size: 100%; }
.k-story__note { margin: var(--manual-space-2) 0 0; font-size: 0.875rem; line-height: 1.45; }
.k-story__n { font-family: var(--manual-code); font-size: 0.75rem; color: var(--manual-blue); margin-inline-end: 0.25rem; }
```

- [ ] **Step 5: Verify typecheck and the existing build still pass**

Run: `pnpm check && pnpm build`
Expected: both succeed. Mnemonics renders its three existing figures in the new frame (no card, no tabs). The hero's worked-example content is gone, which is intended: it returns as a storyboard in Task 6.

- [ ] **Step 6: Commit**

```bash
git add packages/figures/src/registry.ts apps/site/src/components/Plate.astro apps/site/src/components/Figure.astro apps/site/src/styles/atlas.css
git commit -m "Drawing-mode figure placement, palette tokens and kit styles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Mnemonic data for the new figures (model + derive)

**Files:**
- Modify: `packages/models/src/bip39.ts` (add a function after `checkMnemonic`)
- Modify: `packages/models/test/bip39.test.ts`
- Modify: `packages/figures/src/types.ts:44-51`
- Modify: `apps/site/src/lib/derive.ts:220-240`

**Interfaces:**
- Produces:
  - `validLastWords(prefix: readonly string[], wordlist: readonly string[]): number[]` (ascending wordlist indices).
  - `MnemonicDerived.lastWord: { prefixWords: number; validIndices: number[]; actualIndex: number }`.
  - `MnemonicDerived.wordlistSample: Array<{ index: number; word: string }>` (indices 0, 1, 2).

- [ ] **Step 1: Write the failing model test** (append to `packages/models/test/bip39.test.ts`; `english` and `trezor` are already in scope there, and `validLastWords` joins the existing import from `../src/bip39`)

```ts
describe("validLastWords", () => {
  it("12 words: exactly 2048 / 2^4 = 128 last words pass, including the published one", () => {
    const words = trezor.english[1][1].split(" ");
    const valid = validLastWords(words.slice(0, -1), english);
    expect(valid.length).toBe(128);
    expect(valid).toContain(english.indexOf(words.at(-1)!));
    expect([...valid].sort((a, b) => a - b)).toEqual(valid);
  });
  it("24 words: 2048 / 2^8 = 8 pass", () => {
    const v = trezor.english.find((x: string[]) => x[1].split(" ").length === 24)!;
    const words = v[1].split(" ");
    expect(validLastWords(words.slice(0, -1), english).length).toBe(8);
  });
});
```

Before relying on `trezor.english[1]` being the 12-word "legal winner" vector, open `packages/models/test/bip39.test.ts` and read how `trezor` is loaded and indexed. Any 12-word vector works; use the index of one.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run packages/models/test/bip39.test.ts`
Expected: FAIL. `validLastWords` is not exported from `../src/bip39`.

- [ ] **Step 3: Implement**

In `packages/models/src/bip39.ts`, after `checkMnemonic`:

```ts
/**
 * Every wordlist index that completes `prefix` (all words but the last) into
 * a sentence whose checksum passes. For a 12-word sentence this is
 * 2048 / 2^4 = 128 indices; the last word carries 7 free entropy bits.
 */
export function validLastWords(prefix: readonly string[], wordlist: readonly string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < wordlist.length; i++) if (checkMnemonic([...prefix, wordlist[i]], wordlist).valid) out.push(i);
  return out;
}
```

- [ ] **Step 4: Run the model test to verify it passes**

Run: `npx vitest run packages/models/test/bip39.test.ts`
Expected: PASS.

- [ ] **Step 5: Extend the derived type**

In `packages/figures/src/types.ts`, inside `interface MnemonicDerived`, after `seeds: …;`:

```ts
  /** Last-word odds: indices of every last word that would pass the checksum after the first n − 1 words. */
  lastWord: { prefixWords: number; validIndices: number[]; actualIndex: number };
  /** The first wordlist entries, for drawing the list itself. */
  wordlistSample: Array<{ index: number; word: string }>;
```

- [ ] **Step 6: Fill it in `deriveMnemonic`, failing closed**

In `apps/site/src/lib/derive.ts`:
- Add `validLastWords` to the existing import from the bip39 model.
- In `deriveMnemonic`, before `return {`, add:

```ts
  const list = englishWordlist();
  const words = f.mnemonic.split(" ");
  const validIndices = validLastWords(words.slice(0, -1), list);
  const actualIndex = list.indexOf(words.at(-1)!);
  if (validIndices.length !== 2048 >> b.layout.checksumBits) throw new Error(`${f.id}: ${validIndices.length} valid last words, expected 2048 / 2^${b.layout.checksumBits}`);
  if (!validIndices.includes(actualIndex)) throw new Error(`${f.id}: the published last word does not pass its own checksum`);
```

and inside `derived: { … }` after `seeds: [ … ],`:

```ts
      lastWord: { prefixWords: words.length - 1, validIndices, actualIndex },
      wordlistSample: [0, 1, 2].map((index) => ({ index, word: list[index] })),
```

If `deriveMnemonic` already binds the wordlist to a local name, reuse it instead of calling `englishWordlist()` again.

- [ ] **Step 7: Verify**

Run: `pnpm check && pnpm build`
Expected: both succeed. The build log has no derive error for `zero-128`, `ozone-128`, `zero-256` or `all-hour-256`.

- [ ] **Step 8: Commit**

```bash
git add packages/models/src/bip39.ts packages/models/test/bip39.test.ts packages/figures/src/types.ts apps/site/src/lib/derive.ts
git commit -m "BIP 39: valid last words and wordlist sample for the new figures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Mnemonics static drawings, part 1: backup plate, entropy bits, checksum storyboard

**Files:**
- Rewrite: `packages/figures/src/mnemonic/MnemonicCard.tsx`
- Create: `packages/figures/src/mnemonic/EntropyBits.tsx`, `packages/figures/src/mnemonic/ChecksumStory.tsx`
- Modify: `packages/figures/src/registry.ts`, `packages/figures/src/index.ts`, `apps/site/src/components/Figure.astro`
- Test: `packages/figures/test/mnemonic-figures.test.ts` (new)

**Interfaces:**
- Consumes: kit (Tasks 2–3), `DerivedMnemonicFixture` with `derived.lastWord` and `derived.wordlistSample` (Task 5).
- Produces:
  - Components: `MnemonicCard({ fixture })`, `EntropyBits({ fixture })`, `ChecksumStory({ fixture })`.
  - Recipes, all `drawing: true`, `fixtureKind: "mnemonic"`, 1 fixture each: `entropy-bits.v1`, `checksum-storyboard.v1`.

- [ ] **Step 1: Write a shared test fixture builder and failing tests**

`packages/figures/test/mnemonic-figures.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { h } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { checkMnemonic, entropyToMnemonic, mnemonicToSeed, parseWordlist, validLastWords } from "@bip-atlas/models/bip39";
import { bytesToHex, hexToBytes } from "@bip-atlas/models/hex";
import { ChecksumStory } from "../src/mnemonic/ChecksumStory";
import { EntropyBits } from "../src/mnemonic/EntropyBits";
import { MnemonicCard } from "../src/mnemonic/MnemonicCard";
import type { DerivedMnemonicFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/mnemonics.json", root), "utf8")).fixtures;
const wordlistPath = "sources/research-2026-10-01/raw/bip-0039/english.txt";
const list = parseWordlist(readFileSync(new URL(wordlistPath, root), "utf8"));

/** The same derivation the site's build performs (derive.ts), so figures see real values. */
export function derived(id: string): DerivedMnemonicFixture {
  const f = fixtures.find((x: { id: string }) => x.id === id);
  const b = entropyToMnemonic(hexToBytes(f.entropyHex), list);
  const words = f.mnemonic.split(" ");
  return {
    ...f,
    derived: {
      layout: b.layout, entropyBits: b.entropyBits, hashHex: b.hashHex, checksumBits: b.checksumBits, groups: b.groups,
      seeds: [
        { passphrase: f.passphrase, seedHex: bytesToHex(mnemonicToSeed(f.mnemonic, f.passphrase)), origin: "vector" },
        { passphrase: "", seedHex: bytesToHex(mnemonicToSeed(f.mnemonic, "")), origin: "computed" },
      ],
      lastWord: { prefixWords: words.length - 1, validIndices: validLastWords(words.slice(0, -1), list), actualIndex: list.indexOf(words.at(-1)) },
      wordlistSample: [0, 1, 2].map((index) => ({ index, word: list[index] })),
    },
  };
}
const html = (n: preact.VNode) => render(n);
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("MnemonicCard", () => {
  const s = html(h(MnemonicCard, { fixture: derived("ozone-128") }));
  it("engraves all 12 words of the published phrase", () => {
    for (const w of derived("ozone-128").mnemonic.split(" ")) expect(s).toContain(`>${w}<`);
  });
  it("labels the first word's index from the model", () => {
    expect(s).toContain(`INDEX ${derived("ozone-128").derived.groups[0].index}`);
  });
  it("marks itself public test material", () => expect(s).toContain("PUBLIC TEST VECTOR"));
});

describe("EntropyBits", () => {
  const d = derived("ozone-128");
  const s = html(h(EntropyBits, { fixture: d }));
  it("draws 128 bit cells, ones saturated", () => {
    expect(count(s, 'class="k-cell ')).toBe(128);
    expect(count(s, "k-mark--secret")).toBe([...d.derived.entropyBits].filter((b) => b === "1").length);
  });
  it("shows the same entropy as 32 hex characters", () => {
    expect(s.replace(/<[^>]+>/g, "")).toContain(d.entropyHex.slice(0, 8));
  });
});

describe("ChecksumStory", () => {
  const d = derived("zero-128");
  const s = html(h(ChecksumStory, { fixture: d }));
  it("has four frames", () => expect(count(s, '<li class="k-story__frame">')).toBe(4));
  it("draws the hash's first byte and the checksum bits from the model", () => {
    expect(s).toContain(`>${d.derived.hashHex.slice(0, 2)}<`);
    expect(s).toContain(d.derived.checksumBits.split("").join(""));
  });
  it("ends at 132 = 12 × 11", () => expect(s).toContain("132 BITS = 12 × 11"));
});
```

Before relying on these paths, check them:
- The wordlist path must match where `derive.ts` reads `englishWordlist()` from. Run `grep -n "english" apps/site/src/lib/derive.ts` and copy that path.
- If `@bip-atlas/models/hex` does not exist as a subpath, import `bytesToHex`/`hexToBytes` from wherever `packages/models/src/hex.ts` exports them. The package `exports` map `./*` to `./src/*.ts`, so the subpath works.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run packages/figures/test/mnemonic-figures.test.ts`
Expected: FAIL. `../src/mnemonic/ChecksumStory` cannot be resolved.

- [ ] **Step 3: Implement `MnemonicCard`: an engraved metal backup plate**

```tsx
import { Drawing, IsoBox, Label, iso, onTop, COS30, SIN30, type Pt } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/**
 * mnemonic-card.v1 — static. The published phrase engraved on an isometric
 * metal backup plate, three columns of numbered words. Words and indices come
 * from the tested model.
 */
export function MnemonicCard({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { groups, layout } = fixture.derived;
  const cols = 3;
  const rows = Math.ceil(groups.length / cols);
  const W = 252, D = 24 * rows + 30, H = 7;
  const ox = D * COS30 + 6, oy = 12;
  // Box ground origin sits H below the top face, so the top face starts at oy.
  const P = iso(ox, oy + H);
  const width = Math.ceil((W + D) * COS30 + 12);
  const height = Math.ceil((W + D) * SIN30 + H + 70);
  const wordAt = (i: number): Pt => P(14 + (i % cols) * 80, 30 + Math.floor(i / cols) * 24, H);
  const first = groups[0];
  const words = groups.map((g) => g.word).join(" ");
  return (
    <Drawing
      id="a01-card"
      width={width}
      height={height}
      title={`A ${layout.wordCount}-word public test phrase on a backup plate`}
      desc={`A metal backup plate engraved with the ${layout.wordCount} words of a published test phrase, numbered 1 to ${layout.wordCount}: ${words}. The first word, ${first.word}, is wordlist index ${first.index}, which is 11 bits.`}
    >
      <IsoBox at={[ox, oy + H]} w={W} d={D} h={H} role="plain" cls="k-plate" />
      <rect class="k-outline k-fill--plain" transform={onTop(P(10, 8, H))} width="120" height="13" />
      <text class="k-label-flat" transform={onTop(P(15, 17.5, H))}>PUBLIC TEST VECTOR</text>
      {groups.map((g, i) => (
        <g>
          <text class="k-engrave k-engrave--n" transform={onTop(wordAt(i))}>{String(g.position + 1).padStart(2, "0")}</text>
          <text class="k-engrave" transform={onTop(P(14 + (i % cols) * 80 + 16, 30 + Math.floor(i / cols) * 24, H))}>{g.word}</text>
        </g>
      ))}
      <Label at={P(W, D - 4, 0)} side="down" len={26} text={`${layout.wordCount} words · ${layout.entropyBits} + ${layout.checksumBits} bits`} />
      <Label at={P(10, 30, H)} side="left" len={10} text={`index ${first.index}`} />
    </Drawing>
  );
}
```

Placing the left label at `P(10, 30, H)` can push it beyond x = 0. If the Task 10 screenshot shows it clipped, change `ox` to `D * COS30 + 70`; `width` already derives from `ox`.

Add to the kit CSS section in `atlas.css`:

```css
.k-engrave--n { fill: var(--manual-muted); font-size: 8.5px; }
.k-label-flat { font-size: 8px; letter-spacing: 0.08em; }
.k-plate .k-face--top { fill: #f1f1f4; }
```

- [ ] **Step 4: Implement `EntropyBits`**

```tsx
import { Bracket, Cells, Drawing, Label, Value } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/** entropy-bits.v1 — static. The entropy as a grid of bits beside the same value as hexadecimal. */
export function EntropyBits({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { entropyBits, layout } = fixture.derived;
  const bits = [...entropyBits];
  const perRow = 16, size = 13, x0 = 30, y0 = 18;
  const rows = bits.length / perRow;
  const gridW = perRow * size;
  const hexX = x0 + gridW + 30;
  const hexLines = fixture.entropyHex.match(/.{8}/g)!;
  const height = y0 + rows * size + 52;
  return (
    <Drawing
      id="a01-bits"
      width={hexX + 84}
      height={height}
      title={`${layout.entropyBits} bits of entropy`}
      desc={`The ${layout.entropyBits} entropy bits of a published sample drawn as a ${perRow}-by-${rows} grid, ones filled and zeros empty, beside the same value written as ${fixture.entropyHex.length} hexadecimal characters: ${fixture.entropyHex}.`}
    >
      {Array.from({ length: rows }, (_, r) => (
        <Value at={[x0 - 6, y0 + r * size + 9.5]} text={String(r * perRow)} anchor="end" size={8} cls="k-value--muted" />
      ))}
      <Cells x={x0} y={y0} values={bits.map(() => "")} size={size} perRow={perRow} rowGap={0} roleOf={() => "secret"} strong={(i) => bits[i] === "1"} text={false} />
      <Bracket x1={x0} x2={x0 + gridW} y={y0 + rows * size + 4} text={`entropy · ${layout.entropyBits} bits · ${layout.entropyBits / 8} bytes`} />
      {hexLines.map((line, i) => (
        <Value at={[hexX, y0 + 14 + i * 16]} text={line} size={11} />
      ))}
      <Label at={[hexX + 30, y0 + 14 + hexLines.length * 16 - 6]} side="down" len={14} text={`${fixture.entropyHex.length} hex chars`} />
    </Drawing>
  );
}
```

Add CSS: `.k-value--muted { fill: var(--manual-muted); }`

- [ ] **Step 5: Implement `ChecksumStory`**

```tsx
import { Arrow, Bracket, Cells, Machine, Magnifier, Storyboard, Value, iso, type Frame } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/**
 * checksum-storyboard.v1 — static. Four frames: entropy into SHA-256, the
 * hash's first bits, the checksum lifted out, appended to make 12 × 11 bits.
 */
export function ChecksumStory({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { layout, hashHex, checksumBits } = fixture.derived;
  const bytes = fixture.entropyHex.match(/.{2}/g)!;
  const hashBytes = hashHex.match(/.{2}/g)!;
  const firstByteBits = parseInt(hashBytes[0], 16).toString(2).padStart(8, "0");
  const n = layout.checksumBits;
  const W = 300, H = 160;
  const entropyRow = (y: number) => (
    <Cells x={14} y={y} values={bytes} size={Math.min(17, 272 / bytes.length)} roleOf={() => "secret"} />
  );
  const frames: Frame[] = [
    {
      note: `Hash the ${bytes.length} entropy bytes with SHA-256.`,
      desc: `The ${bytes.length} entropy bytes, ${fixture.entropyHex}, go into a SHA-256 machine.`,
      draw: (ids) => (
        <>
          {entropyRow(14)}
          <Arrow d="M150 36 V62" ids={ids} />
          <Machine at={[150, 74]} w={70} d={36} h={30} label="SHA-256" sub="hash" />
        </>
      ),
    },
    {
      note: `The hash begins ${hashBytes.slice(0, 4).join(" ")}…; its first byte is ${firstByteBits}.`,
      desc: `SHA-256 of the entropy begins ${hashHex.slice(0, 16)}. Its first byte, ${hashBytes[0]}, is ${firstByteBits} in binary.`,
      draw: () => (
        <>
          <Cells x={14} y={14} values={hashBytes.slice(0, 16)} size={17} roleOf={() => "hash"} />
          <Value at={[290, 26]} text="…" anchor="end" />
          <Magnifier id={`a01-cs-mag`} from={[22, 22]} fromR={9} at={[150, 104]} r={44}>
            <Cells x={114} y={96} values={[...firstByteBits]} size={9} roleOf={(i) => (i < n ? "check" : "hash")} strong={(i) => i < n} />
          </Magnifier>
        </>
      ),
    },
    {
      note: `Keep the first ${layout.entropyBits} / 32 = ${n} bits: ${checksumBits}. That is the checksum.`,
      desc: `The first ${n} bits of the hash, ${checksumBits}, are kept as the checksum; the rest of the hash is discarded.`,
      draw: () => (
        <>
          <Cells x={14} y={30} values={[...hashHex.slice(0, 4)].flatMap((c) => [...parseInt(c, 16).toString(2).padStart(4, "0")]).slice(0, 16)} size={16} roleOf={(i) => (i < n ? "check" : "hidden")} strong={(i) => i < n} />
          <Bracket x1={14} x2={14 + n * 16} y={52} text={`checksum · ${n} bits`} />
          <Value at={[14, 22]} text={checksumBits.split("").join("")} cls="k-value--check" />
        </>
      ),
    },
    {
      note: `Append it to the entropy: ${layout.entropyBits} + ${n} = ${layout.totalBits} bits, exactly ${layout.wordCount} groups of 11.`,
      desc: `The ${n} checksum bits are appended after the ${layout.entropyBits} entropy bits, making ${layout.totalBits} bits, which is ${layout.wordCount} groups of 11 bits.`,
      draw: () => {
        const unit = 272 / layout.totalBits;
        return (
          <>
            <rect class="k-cell k-fill--secret" x={14} y={40} width={layout.entropyBits * unit} height={22} />
            <rect class="k-cell k-mark--check" x={14 + layout.entropyBits * unit} y={40} width={n * unit} height={22} />
            {Array.from({ length: layout.wordCount - 1 }, (_, k) => (
              <line class="k-cut" x1={14 + (k + 1) * 11 * unit} y1={36} x2={14 + (k + 1) * 11 * unit} y2={66} />
            ))}
            <Value at={[14, 32]} text={`entropy ${layout.entropyBits}`} size={9} />
            <Value at={[286, 32]} text={`+${n}`} anchor="end" size={9} cls="k-value--check" />
            <Bracket x1={14} x2={286} y={70} text={`${layout.totalBits} bits = ${layout.wordCount} × 11`} />
          </>
        );
      },
    },
  ];
  return <Storyboard id="a01-cs" title="Making the checksum" width={W} height={H} frames={frames} />;
}
```

Notes:
- The frame-3 `Value` must contain the checksum digits contiguously, so the test can find `checksumBits`.
- Add CSS `.k-value--check { fill: var(--atlas-c-check); font-weight: 500; }`.
- `iso` is imported but unused here. Remove it from the import if `pnpm check` flags it.

- [ ] **Step 6: Register and dispatch**

In `registry.ts`, after `seed-derivation.v1`, add:

```ts
  {
    id: "entropy-bits.v1",
    description: "The entropy of one public sample as a grid of bits beside its hexadecimal form.",
    minFixtures: 1,
    maxFixtures: 1,
    interactive: false,
    controls: [],
    fixtureKind: "mnemonic",
    drawing: true,
  },
  {
    id: "checksum-storyboard.v1",
    description: "Storyboard: entropy into SHA-256, the first bits kept as the checksum, appended to make n × 11 bits.",
    minFixtures: 1,
    maxFixtures: 1,
    interactive: false,
    controls: [],
    fixtureKind: "mnemonic",
    drawing: true,
  },
```

In `packages/figures/src/index.ts`, after the `SeedDerivation` export:

```ts
export { EntropyBits } from "./mnemonic/EntropyBits";
export { ChecksumStory } from "./mnemonic/ChecksumStory";
```

In `Figure.astro`, add `EntropyBits, ChecksumStory,` to the import list and, after the `seed-derivation.v1` line:

```astro
  {figure.recipe === "entropy-bits.v1" && <EntropyBits fixture={mnemonic[0]} />}
  {figure.recipe === "checksum-storyboard.v1" && <ChecksumStory fixture={mnemonic[0]} />}
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npx vitest run packages/figures/test/mnemonic-figures.test.ts && pnpm check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/figures/src/mnemonic packages/figures/src/registry.ts packages/figures/src/index.ts packages/figures/test/mnemonic-figures.test.ts apps/site/src/components/Figure.astro apps/site/src/styles/atlas.css
git commit -m "Mnemonics drawings: backup plate, entropy bits, checksum storyboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Mnemonics static drawings, part 2: wordlist, last-word odds, seed press, passphrases, chain

**Files:**
- Create: `packages/figures/src/mnemonic/WordlistIndex.tsx`, `LastWordOdds.tsx`, `PassphraseSeeds.tsx`, `MnemonicChain.tsx`
- Rewrite: `packages/figures/src/mnemonic/SeedDerivation.tsx`
- Modify: `registry.ts`, `index.ts`, `Figure.astro`, `packages/figures/test/mnemonic-figures.test.ts`

**Interfaces:**
- Consumes: kit; `derived.lastWord`, `derived.wordlistSample`, `derived.seeds`, `derived.groups`; `PBKDF2_ITERATIONS` from `@bip-atlas/models/bip39`.
- Produces: components `WordlistIndex`, `LastWordOdds`, `SeedDerivation`, `PassphraseSeeds`, `MnemonicChain`. Recipes (all `drawing: true`, `fixtureKind: "mnemonic"`, 1 fixture): `wordlist-index.v1`, `last-word-odds.v1`, `passphrase-seeds.v1`, `mnemonic-chain.v1`. `seed-derivation.v1` already exists.

- [ ] **Step 1: Write failing tests** (append; extend the imports)

```ts
describe("WordlistIndex", () => {
  const d = derived("ozone-128");
  const s = html(h(WordlistIndex, { fixture: d }));
  it("turns the first group's 11 bits into its index and word", () => {
    expect(s).toContain(`>${d.derived.groups[0].index}<`);
    expect(s).toContain(`>${d.derived.groups[0].word}<`);
    expect(count(s, 'class="k-cell ')).toBeGreaterThanOrEqual(11);
  });
  it("shows the first wordlist entries", () => {
    for (const w of d.derived.wordlistSample) expect(s).toContain(w.word.slice(4));
  });
});

describe("LastWordOdds", () => {
  const d = derived("ozone-128");
  const s = html(h(LastWordOdds, { fixture: d }));
  it("draws all 2048 candidates and fills exactly the valid ones", () => {
    expect(count(s, 'class="k-dot ')).toBe(2048);
    expect(count(s, "k-mark--check")).toBe(d.derived.lastWord.validIndices.length);
  });
  it("states the computed odds", () => expect(s).toContain("128 OF 2,048 PASS · 1 IN 16"));
});

describe("SeedDerivation", () => {
  const d = derived("ozone-128");
  const s = html(h(SeedDerivation, { fixture: d }));
  it("shows all 64 seed bytes of the published vector", () => {
    for (const b of d.seedHex.match(/.{2}/g)!) expect(s).toContain(`>${b}<`);
  });
  it("names the iteration count from the model", () => expect(s).toContain("× 2,048"));
});

describe("PassphraseSeeds", () => {
  const d = derived("ozone-128");
  const s = html(h(PassphraseSeeds, { fixture: d }));
  it("draws both seeds in full", () => {
    for (const seed of d.derived.seeds) expect(s).toContain(`>${seed.seedHex.slice(0, 2)}<`);
    expect(count(s, 'class="k-cell ')).toBe(128);
  });
  it("names both passphrases", () => {
    expect(s).toContain("&quot;TREZOR&quot;");
    expect(s).toContain("EMPTY");
  });
});

describe("MnemonicChain", () => {
  const s = html(h(MnemonicChain, { fixture: derived("ozone-128") }));
  it("names the three steps", () => {
    for (const w of ["ENCODE", "STRETCH", "DERIVE"]) expect(s).toContain(w);
  });
  it("renders a wide and a narrow composition", () => expect(count(s, "<svg")).toBe(2));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run packages/figures/test/mnemonic-figures.test.ts`
Expected: FAIL (missing modules).

- [ ] **Step 3: Implement `WordlistIndex`**

```tsx
import { Arrow, Cells, Drawing, IsoBox, Label, Value, idsFor, iso, onTop } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/** wordlist-index.v1 — static. Eleven bits make a number from 0 to 2,047, which picks one card from a stack of 2,048. */
export function WordlistIndex({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const g = fixture.derived.groups[0];
  const sample = fixture.derived.wordlistSample;
  const ids = idsFor("a01-list");
  const card = iso(252, 67);
  return (
    <Drawing
      id="a01-list"
      width={340}
      height={268}
      title="Eleven bits pick one word of 2,048"
      desc={`The first 11-bit group of the sample, ${g.bits}, is the number ${g.index}, and entry ${g.index} of the 2,048-word English list is “${g.word}”. The list begins ${sample.map((s) => `${s.index} ${s.word}`).join(", ")}; no two words share their first four letters.`}
    >
      <Cells x={14} y={20} values={[...g.bits]} size={14} roleOf={(i) => (i < g.entropyBitCount ? "secret" : "check")} strong={(i) => g.bits[i] === "1"} />
      <Label at={[91, 34]} side="down" len={12} text="11 bits" />
      <Arrow d="M174 27 H196" ids={ids} />
      <Value at={[204, 31]} text={String(g.index)} size={14} />
      {Array.from({ length: 6 }, (_, k) => <IsoBox at={[220, 96 + (5 - k) * 7]} w={92} d={56} h={3} role="plain" />)}
      <IsoBox at={[252, 70]} w={92} d={56} h={3} role="public" cls="k-card-out" />
      <text class="k-engrave" transform={onTop(card(10, 22, 0))}>{String(g.index)}</text>
      <text class="k-engrave k-engrave--word" transform={onTop(card(10, 38, 0))}>{g.word}</text>
      <Label at={[214, 150]} side="down" len={14} text="2,048 cards · index 0–2,047" />
      {sample.map((s, i) => (
        <g transform={`translate(${14 + i * 106} 214)`}>
          <rect class="k-outline k-fill--plain" width="96" height="30" />
          <text class="k-value k-value--muted" x="6" y="12" style="font-size:8px">{s.index}</text>
          <text class="k-value" x="6" y="25"><tspan class="k-first4">{s.word.slice(0, 4)}</tspan>{s.word.slice(4)}</text>
        </g>
      ))}
      <Label at={[14, 210]} side="up" len={8} text="first four letters never repeat" />
    </Drawing>
  );
}
```

The card stack uses `public` green deliberately: the wordlist is public. Add CSS:

```css
.k-first4 { font-weight: 600; text-decoration: underline; text-decoration-color: var(--atlas-c-check); text-underline-offset: 2px; }
.k-engrave--word { font-size: 12px; font-weight: 500; }
```

- [ ] **Step 4: Implement `LastWordOdds`**

```tsx
import { Drawing, Label, Value } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/**
 * last-word-odds.v1 — static. Keep the first n − 1 words, try all 2,048
 * possible last words: the filled cells are the ones whose checksum passes.
 */
export function LastWordOdds({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { validIndices, actualIndex, prefixWords } = fixture.derived.lastWord;
  const valid = new Set(validIndices);
  const cols = 64, size = 4.75, x0 = 14, y0 = 34;
  const rows = 2048 / cols;
  const ratio = 2048 / validIndices.length;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const ax = x0 + (actualIndex % cols) * size + size / 2;
  const ay = y0 + Math.floor(actualIndex / cols) * size + size / 2;
  return (
    <Drawing
      id="a01-odds"
      width={340}
      height={y0 + rows * size + 46}
      title="How often a random last word passes"
      desc={`With the first ${prefixWords} words of the sample fixed, each of the 2,048 possible last words was checked: ${validIndices.length} pass the checksum, one in ${ratio}. The published last word is index ${actualIndex}, one of them.`}
    >
      <Value at={[x0, 14]} text={`${prefixWords} words fixed: ${fixture.mnemonic.split(" ").slice(0, 2).join(" ")} … + ?`} size={9.5} />
      {Array.from({ length: 2048 }, (_, i) => (
        <rect class={`k-dot ${valid.has(i) ? "k-mark--check" : "k-fill--plain"}`} x={x0 + (i % cols) * size} y={y0 + Math.floor(i / cols) * size} width={size} height={size} />
      ))}
      <circle class="k-ring" cx={ax} cy={ay} r={5} />
      <Label at={[ax + 5, ay]} side="right" len={x0 + cols * size - ax + 4} text={`published word · ${actualIndex}`} />
      <Label at={[x0 + (cols * size) / 2, y0 + rows * size + 2]} side="down" len={12} text={`${fmt(validIndices.length)} of ${fmt(2048)} pass · 1 in ${ratio}`} />
    </Drawing>
  );
}
```

`Label` uppercases the text, so the test's "128 OF 2,048 PASS · 1 IN 16" matches. Add CSS:

```css
.k-dot { stroke: var(--manual-rule); stroke-width: 0.25; }
.k-ring { fill: none; stroke: var(--atlas-ink); stroke-width: 1.25; vector-effect: non-scaling-stroke; }
```

The right-side label can run past the drawing's width; Task 10's screenshots check this. If it does, use `side="left"` when `ax > 170`.

- [ ] **Step 5: Rewrite `SeedDerivation` as the PBKDF2 press**

```tsx
import { PBKDF2_ITERATIONS } from "@bip-atlas/models/bip39";
import { Arrow, Bracket, Cells, Drawing, Label, Machine, Value, idsFor } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/** seed-derivation.v1 — static. Sentence and salt into PBKDF2, 2,048 rounds, out comes the 64-byte seed (published vector). */
export function SeedDerivation({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const seed = fixture.derived.seeds.find((s) => s.origin === "vector")!;
  const bytes = seed.seedHex.match(/.{2}/g)!;
  const ids = idsFor("a01-seed");
  const head = fixture.mnemonic.split(" ").slice(0, 3).join(" ");
  return (
    <Drawing
      id="a01-seed"
      width={340}
      height={336}
      title="Words and passphrase to seed"
      desc={`PBKDF2 with HMAC-SHA512 runs ${PBKDF2_ITERATIONS.toLocaleString("en-US")} times. Its password is the sentence (“${head} …”) and its salt is the text “mnemonic” followed by the passphrase “${seed.passphrase}”. The result is the 64-byte seed ${seed.seedHex}, which matches the published vector.`}
    >
      <rect class="k-outline k-fill--secret" x="14" y="14" width="150" height="34" />
      <Value at={[22, 28]} text="PASSWORD" size={8} cls="k-value--muted" />
      <Value at={[22, 42]} text={`${head} …`} size={10} />
      <rect class="k-outline k-fill--secret" x="176" y="14" width="150" height="34" />
      <Value at={[184, 28]} text="SALT" size={8} cls="k-value--muted" />
      <Value at={[184, 42]} text={`"mnemonic" + "${seed.passphrase}"`} size={10} />
      <Arrow d="M89 50 V74 H140" ids={ids} />
      <Arrow d="M251 50 V74 H200" ids={ids} />
      <Machine at={[170, 70]} w={80} d={44} h={36} label="PBKDF2" sub="HMAC-SHA512" />
      <path class="k-leader" d="M224 108 a16 10 0 1 1 0.1 0" marker-end={ids.arrow} />
      <Value at={[252, 112]} text={`× ${PBKDF2_ITERATIONS.toLocaleString("en-US")}`} size={11} />
      <Arrow d="M170 154 V176" ids={ids} />
      <Cells x={74} y={186} values={bytes} size={24} perRow={8} rowGap={0} roleOf={() => "secret"} />
      <Bracket x1={74} x2={74 + 8 * 24} y={186 + 8 * 24 + 4} text="seed · 64 bytes = 512 bits" />
      <Label at={[74, 198]} side="left" len={14} text="published vector" />
    </Drawing>
  );
}
```

Cells of size 24 show two hex characters at 9px: legible, and all 64 bytes are exact (the test checks every byte).

- [ ] **Step 6: Implement `PassphraseSeeds`**

```tsx
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/** passphrase-seeds.v1 — static. The same words with two passphrases: two unrelated 64-byte seeds, side by side. */
export function PassphraseSeeds({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const seeds = fixture.derived.seeds;
  const size = 19;
  const name = (p: string) => (p ? `"${p}"` : "empty");
  return (
    <Drawing
      id="a01-pass"
      width={340}
      height={232}
      title="Same words, two passphrases"
      desc={seeds.map((s) => `With passphrase ${name(s.passphrase)} the seed is ${s.seedHex}${s.origin === "vector" ? " (published vector)" : " (computed by the tested implementation)"}.`).join(" ")}
    >
      {seeds.map((s, k) => {
        const x = 14 + k * 168;
        return (
          <g>
            <Value at={[x, 18]} text={`PASSPHRASE ${name(s.passphrase).toUpperCase()}`} size={9} />
            <Cells x={x} y={30} values={s.seedHex.match(/.{2}/g)!} size={size} perRow={8} rowGap={0} roleOf={() => "secret"} />
            <Bracket x1={x} x2={x + 8 * size} y={30 + 8 * size + 4} text={s.origin === "vector" ? "published vector" : "computed"} />
          </g>
        );
      })}
    </Drawing>
  );
}
```

The test expects `&quot;TREZOR&quot;`: preact escapes the `"` inside text. The empty passphrase renders as `PASSPHRASE EMPTY`.

- [ ] **Step 7: Implement `MnemonicChain` (two compositions)**

```tsx
import { Arrow, Cells, Drawing, Label, Machine, Responsive, Value, idsFor } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

const STEPS = ["encode", "stretch", "derive"] as const;

/** mnemonic-chain.v1 — static. Entropy → words → seed → (BIP 32, next chapter): three different steps, three different secrets. */
export function MnemonicChain({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const words = fixture.mnemonic.split(" ");
  const seed = fixture.derived.seeds.find((s) => s.origin === "vector")!;
  const desc = `Three steps, each producing a different secret. Encode: the ${fixture.derived.layout.entropyBits}-bit entropy becomes ${words.length} words. Stretch: PBKDF2 turns the words and passphrase into a 64-byte seed beginning ${seed.seedHex.slice(0, 8)}. Derive: BIP 32, the next chapter, grows keys from the seed.`;
  const parts = (ids: ReturnType<typeof idsFor>, horizontal: boolean) => {
    const at = (i: number): [number, number] => (horizontal ? [20 + i * 160, 40] : [40, 20 + i * 118]);
    return (
      <>
        <g transform={`translate(${at(0)[0]} ${at(0)[1]})`}>
          <Cells x={0} y={0} values={Array(16).fill("")} size={7} perRow={8} rowGap={0} roleOf={() => "secret"} text={false} />
          <Value at={[0, 30]} text="ENTROPY" size={8.5} />
        </g>
        <g transform={`translate(${at(1)[0]} ${at(1)[1]})`}>
          <rect class="k-outline k-fill--plain" width="74" height="54" />
          {words.slice(0, 4).map((w, i) => <Value at={[6, 12 + i * 11]} text={w} size={8.5} />)}
          <Value at={[6, 66]} text={`WORDS · ${words.length}`} size={8.5} />
        </g>
        <g transform={`translate(${at(2)[0]} ${at(2)[1]})`}>
          <Cells x={0} y={0} values={Array(64).fill("")} size={6} perRow={8} rowGap={0} roleOf={() => "secret"} text={false} />
          <Value at={[0, 60]} text="SEED · 64 BYTES" size={8.5} />
        </g>
        <g transform={`translate(${at(3)[0]} ${at(3)[1]})`} class="k-faded">
          <circle class="k-outline k-fill--plain" cx="24" cy="6" r="5" />
          <path class="k-leader" d="M24 11 L10 30 M24 11 L38 30 M10 30 L4 48 M10 30 L16 48 M38 30 L32 48 M38 30 L44 48" />
          <Value at={[0, 64]} text="KEYS · BIP 32" size={8.5} />
        </g>
        {STEPS.map((s, i) => {
          const [x, y] = at(i);
          const d = horizontal ? `M${x + 84} ${y + 20} H${x + 150}` : `M${x + 30} ${y + 76} V${y + 110}`;
          const t: [number, number] = horizontal ? [x + 117, y + 12] : [x + 110, y + 96];
          return <Arrow d={d} ids={ids} label={s} at={t} />;
        })}
      </>
    );
  };
  return (
    <Responsive
      wide={<Drawing id="a01-chain-w" width={680} height={130} title="Still not a key" desc={desc}>{parts(idsFor("a01-chain-w"), true)}</Drawing>}
      narrow={<Drawing id="a01-chain-n" width={300} height={480} title="Still not a key" desc={desc}>{parts(idsFor("a01-chain-n"), false)}</Drawing>}
    />
  );
}
```

Add CSS `.k-faded { opacity: 0.45; }`. `Machine` and `Label` are imported but unused here; remove them if `pnpm check` complains.

- [ ] **Step 8: Register and dispatch**

`registry.ts` (after `checksum-storyboard.v1`):

```ts
  { id: "wordlist-index.v1", description: "Eleven bits as a number that picks one card from a stack of 2,048, with the list's first entries.", minFixtures: 1, maxFixtures: 1, interactive: false, controls: [], fixtureKind: "mnemonic", drawing: true },
  { id: "last-word-odds.v1", description: "All 2,048 candidate last words for a fixed prefix, the valid ones filled.", minFixtures: 1, maxFixtures: 1, interactive: false, controls: [], fixtureKind: "mnemonic", drawing: true },
  { id: "passphrase-seeds.v1", description: "The same words with two passphrases: two unrelated 64-byte seeds.", minFixtures: 1, maxFixtures: 1, interactive: false, controls: [], fixtureKind: "mnemonic", drawing: true },
  { id: "mnemonic-chain.v1", description: "Entropy, words, seed and keys as three separate steps.", minFixtures: 1, maxFixtures: 1, interactive: false, controls: [], fixtureKind: "mnemonic", drawing: true },
```

`index.ts`:

```ts
export { WordlistIndex } from "./mnemonic/WordlistIndex";
export { LastWordOdds } from "./mnemonic/LastWordOdds";
export { PassphraseSeeds } from "./mnemonic/PassphraseSeeds";
export { MnemonicChain } from "./mnemonic/MnemonicChain";
```

`Figure.astro` (import the four, then dispatch):

```astro
  {figure.recipe === "wordlist-index.v1" && <WordlistIndex fixture={mnemonic[0]} />}
  {figure.recipe === "last-word-odds.v1" && <LastWordOdds fixture={mnemonic[0]} />}
  {figure.recipe === "passphrase-seeds.v1" && <PassphraseSeeds fixture={mnemonic[0]} />}
  {figure.recipe === "mnemonic-chain.v1" && <MnemonicChain fixture={mnemonic[0]} />}
```

- [ ] **Step 9: Run tests and typecheck**

Run: `npx vitest run packages/figures/test/mnemonic-figures.test.ts && pnpm check`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/figures apps/site/src/components/Figure.astro apps/site/src/styles/atlas.css
git commit -m "Mnemonics drawings: wordlist, last-word odds, seed press, passphrases, chain

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Mnemonics hero: drawing-first `entropy-word-pipeline.v1`

**Files:**
- Rewrite: `packages/figures/src/mnemonic/EntropyWordLab.tsx`
- Modify: `packages/figures/test/mnemonic-figures.test.ts`
- Modify: `apps/site/src/styles/atlas.css` (hero controls)

**Interfaces:**
- Consumes: kit, `holdFocus` from `../focus`, `DerivedMnemonicFixture[]`.
- Produces: `EntropyWordLab({ fixtures, figureId })`. Props are unchanged, so `Figure.astro` keeps `client:visible`.
- Controls (must stay these three strings in `registry.ts`): "Choose public fixture" (sample chips), "Toggle 128/256-bit fixture" (two-option size strip), "Reveal 11-bit groups" (the step slider: 0 = uncut, k = groups 1…k revealed).

- [ ] **Step 1: Write failing tests for the static (no-JS) render**

```ts
describe("EntropyWordLab (static render)", () => {
  const fx = ["zero-128", "ozone-128", "zero-256", "all-hour-256"].map(derived);
  const s = html(h(EntropyWordLab, { fixtures: fx, figureId: "fig-a01-4" }));
  it("server-renders the fully cut first sample: all groups and words", () => {
    expect(s).toContain('data-hydrated="false"');
    for (const g of fx[0].derived.groups) expect(s).toContain(`>${g.word}<`);
  });
  it("cuts the wide ribbon into word groups", () => {
    // Rows are a multiple of 11 bits wide (44 wide, 22 narrow), so every cut falls inside a row.
    const wide = s.split("k-resp__narrow")[0];
    expect(count(wide, 'class="k-cut"')).toBe(fx[0].derived.layout.wordCount - 1);
  });
  it("colours entropy and checksum bits differently", () => {
    expect(count(s, "k-fill--check") + count(s, "k-mark--check")).toBeGreaterThanOrEqual(fx[0].derived.layout.checksumBits);
  });
  it("renders no controls without JavaScript", () => {
    expect(s).not.toContain('type="range"');
    expect(s).not.toContain('type="radio"');
  });
  it("describes the selected group in the status line", () => {
    const last = fx[0].derived.groups.at(-1)!;
    expect(s).toContain(`Word ${last.position + 1} of ${fx[0].derived.layout.wordCount}`);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run packages/figures/test/mnemonic-figures.test.ts -t EntropyWordLab`
Expected: FAIL. The old component renders `.atlas-bits` markup, not `k-cut` cells.

- [ ] **Step 3: Implement the hero**

```tsx
import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Arrow, Cells, Drawing, IsoBox, Label, Responsive, Value, cellsSize, idsFor, iso, onTop } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

interface Props {
  fixtures: DerivedMnemonicFixture[];
  figureId: string;
}

/**
 * entropy-word-pipeline.v1 — the Mnemonics chapter's hero (drawing-first).
 *
 * The drawing is a ribbon of every bit (entropy pink, checksum purple). The
 * step slider cuts it into 11-bit groups one at a time; the selected group
 * drops out as a number and pulls its card from the wordlist, and the
 * sentence below fills in. Controls: sample chips, a 128/256-bit strip and
 * the slider. All values come from the tested model; nothing is typed in.
 */
export function EntropyWordLab({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const sizes = [...new Set(fixtures.map((f) => f.derived.layout.entropyBits))].sort((a, b) => a - b);
  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const { layout, groups, entropyBits, checksumBits } = fixture.derived;
  const [step, setStep] = useState(groups.length);
  // Without JavaScript: every group cut, last group selected (the static equivalent).
  const shown = hydrated ? step : groups.length;
  const sel = shown > 0 ? groups[shown - 1] : null;
  const bits = [...(entropyBits + checksumBits)];

  const choose = (id: string) => {
    setFixtureId(id);
    setStep(0);
  };
  const size = layout.entropyBits;

  const status = sel
    ? `Word ${sel.position + 1} of ${layout.wordCount}: bits ${sel.bits} are ${sel.index}, “${sel.word}”.` +
      (sel.checksumBitCount ? ` ${sel.entropyBitCount} entropy bits and ${sel.checksumBitCount} checksum bits.` : "")
    : `${layout.entropyBits} entropy bits and ${layout.checksumBits} checksum bits, not yet cut. Move the slider to cut them into groups of 11.`;

  const draw = (w: "wide" | "narrow") => {
    const perRow = w === "wide" ? 44 : 22;
    const cell = w === "wide" ? 13 : 12.5;
    const W = w === "wide" ? 640 : 330;
    const x0 = (W - perRow * cell) / 2;
    const rib = cellsSize(bits.length, { size: cell, perRow, rowGap: 7 });
    const y0 = 34;
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const inSel = (i: number) => sel !== null && Math.floor(i / 11) === sel.position;
    const dy = y0 + rib.height + 34;
    const card = iso(w === "wide" ? 430 : 200, dy + 6);
    const chipsPerRow = w === "wide" ? 6 : 3;
    const chipW = (W - 2 * x0) / chipsPerRow;
    const chipsY = dy + (w === "wide" ? 110 : 160);
    const H = chipsY + Math.ceil(groups.length / chipsPerRow) * 26 + 10;
    const groupX = x0, groupY = dy;
    return (
      <Drawing id={id} width={W} height={H} title={`From ${layout.totalBits} bits to ${layout.wordCount} words`} desc={status}>
        <Value at={[x0, 18]} text={`${layout.entropyBits} ENTROPY BITS + ${layout.checksumBits} CHECKSUM = ${layout.totalBits} BITS`} size={9} />
        <Cells
          x={x0}
          y={y0}
          values={bits.map(() => "")}
          size={cell}
          perRow={perRow}
          rowGap={7}
          text={false}
          roleOf={(i) => (i < layout.entropyBits ? "secret" : "check")}
          strong={(i) => bits[i] === "1"}
          cutEvery={shown > 0 ? 11 : undefined}
          emphasis={inSel}
        />
        {sel ? (
          <>
            <Cells x={groupX} y={groupY} values={[...sel.bits]} size={16} roleOf={(i) => (i < sel.entropyBitCount ? "secret" : "check")} strong={(i) => sel.bits[i] === "1"} />
            <Label at={[groupX + 88, groupY + 16]} side="down" len={10} text={`group ${sel.position + 1} · 11 bits`} />
            <Arrow d={`M${groupX + 184} ${groupY + 8} H${groupX + 210}`} ids={ids} />
            <Value at={[groupX + 216, groupY + 14]} text={String(sel.index)} size={16} />
            <IsoBox at={[card(0, 0)[0], card(0, 0)[1] + 3]} w={96} d={54} h={3} role="public" />
            <text class="k-engrave" transform={onTop(card(10, 20, 3))}>{`#${sel.index}`}</text>
            <text class="k-engrave k-engrave--word" transform={onTop(card(10, 38, 3))}>{sel.word}</text>
            <Label at={card(96, 27, 0)} side="right" len={10} text="wordlist card" />
          </>
        ) : (
          <Value at={[groupX, groupY + 14]} text="Not cut yet: move the slider." size={11} cls="k-value--muted" />
        )}
        {groups.map((g, k) => {
          const x = x0 + (k % chipsPerRow) * chipW;
          const y = chipsY + Math.floor(k / chipsPerRow) * 26;
          const known = k < shown;
          return (
            <g>
              <rect class={`k-outline ${known ? (sel && k === sel.position ? "k-fill--public" : "k-fill--plain") : ""}`} x={x + 2} y={y} width={chipW - 4} height={20} style={known ? undefined : `fill:${ids.hatch}`} />
              <text class="k-value k-value--muted" x={x + 7} y={y + 13.5} style="font-size:8px">{String(k + 1).padStart(2, "0")}</text>
              {known ? <text class="k-value" x={x + 24} y={y + 14}>{g.word}</text> : null}
            </g>
          );
        })}
      </Drawing>
    );
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Entropy size">
            {sizes.map((b) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-size`} checked={b === size} onChange={() => choose(fixtures.find((f) => f.derived.layout.entropyBits === b)!.id)} />
                <span>{b} bits</span>
              </label>
            ))}
          </div>
          <div class="atlas-strip" role="radiogroup" aria-label="Public sample">
            {fixtures.filter((f) => f.derived.layout.entropyBits === size).map((f) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-sample`} checked={f.id === fixtureId} onChange={() => choose(f.id)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Reveal 11-bit groups">
          <button type="button" class="atlas-scrub__btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous group">←</button>
          <input
            type="range"
            min={0}
            max={groups.length}
            value={step}
            aria-label="Groups revealed"
            aria-valuetext={step === 0 ? "none" : `${step} of ${groups.length}: ${groups[step - 1].word}`}
            onInput={(e) => setStep(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => setStep(Math.min(groups.length, step + 1))} disabled={step === groups.length} aria-label="Next group">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <p class="atlas-hero__source">Sample: {fixture.source.external} ({fixture.source.pointer}), pinned. Public test material; never use it for funds.</p>
    </div>
  );
}
```

Hero CSS (append):

```css
/* ---------- drawing-first heroes ---------- */
.atlas-hero { display: grid; gap: var(--manual-space-4); }
.atlas-hero__controls { display: flex; flex-wrap: wrap; gap: var(--manual-space-3) var(--manual-space-5); }
.atlas-strip { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--atlas-ink); }
.atlas-strip__opt { position: relative; }
.atlas-strip__opt input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.atlas-strip__opt span { display: block; padding: 0.35rem 0.75rem; font-family: var(--manual-code); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
.atlas-strip__opt + .atlas-strip__opt span { border-inline-start: 1px solid var(--atlas-ink); }
.atlas-strip__opt input:checked + span { background: var(--atlas-ink); color: #ffffff; }
.atlas-strip__opt input:focus-visible + span { outline: 2px solid var(--manual-focus); outline-offset: 2px; }
.atlas-scrub { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--manual-space-3); align-items: center; max-inline-size: 30rem; margin-inline: auto; inline-size: 100%; }
.atlas-scrub input[type="range"] { inline-size: 100%; accent-color: var(--manual-blue); }
.atlas-scrub__btn { appearance: none; border: 1px solid var(--atlas-ink); background: #ffffff; font-family: var(--manual-code); min-inline-size: 2.75rem; min-block-size: 2.75rem; cursor: pointer; }
.atlas-scrub__btn:disabled { opacity: 0.35; cursor: default; }
.atlas-scrub__btn:focus-visible { outline: 2px solid var(--manual-focus); outline-offset: 2px; }
.atlas-hero__status { margin: 0; font-size: 0.9375rem; text-align: center; }
.atlas-hero__source { margin: 0; font-family: var(--manual-code); font-size: 0.6875rem; color: var(--manual-muted); text-align: center; }
```

Notes:
- The step-0 hint `Value` ("Not cut yet: move the slider.") only appears when hydrated with `step === 0`. The no-JS render always has `shown = groups.length`, so it never shows a slider hint.
- The status starts at `step = groups.length`, so the first hydrated view equals the static one. Choosing a sample resets to 0, an uncut ribbon for the new sample.

- [ ] **Step 4: Run tests, typecheck and the JS budget**

Run: `npx vitest run packages/figures/test/mnemonic-figures.test.ts && pnpm check && pnpm build`
Then:

```bash
find apps/site/dist/_astro -name '*.js' -exec gzip -c {} \; | wc -c
```

Expected:
- Tests and build pass.
- The gzip total stays under 61,440 bytes (60 KB). It was about 49 KB before; the kit adds only the hero's imports.

- [ ] **Step 5: Commit**

```bash
git add packages/figures/src/mnemonic/EntropyWordLab.tsx packages/figures/test/mnemonic-figures.test.ts apps/site/src/styles/atlas.css
git commit -m "Mnemonics hero: drawing-first bit ribbon, wordlist card and step slider

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Mnemonics chapter content: place the figures, renumber, point the prose

**Files:**
- Modify: `content/chapters/mnemonics.json`
- Modify: `apps/site/src/styles/atlas.css` (delete dead mnemonic CSS)
- Modify: `packages/figures/src/worked/Worked.tsx` and `packages/figures/src/index.ts` (remove `MnemonicWorked`) and `Figure.astro` (remove its worked line)

**Interfaces:**
- Consumes: the recipes from Tasks 6–8.
- Produces: the final Mnemonics figure set. In reading order:
  - A01.1 `mnemonic-card.v1` (opening)
  - A01.2 `entropy-bits.v1`
  - A01.3 `checksum-storyboard.v1`
  - A01.4 `entropy-word-pipeline.v1` (hero)
  - A01.5 `wordlist-index.v1`
  - A01.6 `last-word-odds.v1`
  - A01.7 `seed-derivation.v1`
  - A01.8 `passphrase-seeds.v1`
  - A01.9 `mnemonic-chain.v1`

- [ ] **Step 1: Edit the chapter JSON**

Use a small Python script, so the JSON formatting matches the file's existing indentation. Insert these blocks with `"type": "figure"` and `"layout": "prose"`, except the hero, which is `"wide"`:

| Section `id` | Insert after block index | figure | recipe | title | fixtures | claims | caption |
|---|---|---|---|---|---|---|---|
| `randomness` | 1 | A01.2 | `entropy-bits.v1` | 128 random bits | `["ozone-128"]` | `["ent-sizes", "purpose"]` | The entropy of a published sample, bit by bit and as hexadecimal. |
| `checksum` | 2 | A01.3 | `checksum-storyboard.v1` | Making the checksum | `["zero-128"]` | `["zero-example", "checksum-def", "split-11"]` | The all-zero sample: its hash begins with the bits 0011, which become the checksum. |
| `wordlist` | 0 | A01.5 | `wordlist-index.v1` | Eleven bits, one word | `["ozone-128"]` | `["split-11", "wordlist-design", "wordlist-checked"]` | Every 11-bit number has exactly one card in a list of 2,048. |
| `short-checksum` | 1 | A01.6 | `last-word-odds.v1` | One last word in sixteen | `["ozone-128"]` | `["odds-by-length", "short-checksum"]` | Keep the first eleven words and try every possible last word: the filled cells pass the checksum. |
| `passphrase` | 0 | A01.8 | `passphrase-seeds.v1` | Same words, two passphrases | `["ozone-128"]` | `["deniability", "passphrase-empty", "vectors"]` | Neither seed is wrong: each passphrase simply leads to its own wallet. |
| `next` | 1 | A01.9 | `mnemonic-chain.v1` | Still not a key | `["ozone-128"]` | `["two-parts", "pbkdf2", "bip32-next"]` | Three steps, three different secrets; the last step is the next chapter. |

Renumber the existing figures in the JSON:
- The hero `"A01.2"` becomes `"A01.4"`.
- The seed figure `"A01.3"` becomes `"A01.7"`.
- Set its caption to: "The published vector's passphrase is "TREZOR". Change it, or leave it empty, and the seed changes completely: see the next section."
- Set its claims to `["pbkdf2", "independent", "vectors"]`.

Prose pointer edits, in section `checksum`, block 3:
- Old: "The figure below starts from the bits of a public sample. Reveal the groups to see where the cuts fall, then step through to the last word."
- New: "The figure below starts from the bits of a public sample. Move the slider to cut them into groups of 11 and watch each group pick its word."

Before saving, check `packages/models/test/bip39.test.ts` for a `has("…")` assertion on the old sentence (`grep -n "Reveal the groups" packages/models/test`). If one exists, update it to the new sentence in the same commit.

- [ ] **Step 2: Remove the now-unused worked example and CSS**

- In `packages/figures/src/worked/Worked.tsx`, delete `export function MnemonicWorked` and its body.
- In `index.ts`, remove `MnemonicWorked` from the export list.
- In `Figure.astro`, remove `MnemonicWorked` from the imports and delete the line `{figure.recipe === "entropy-word-pipeline.v1" && <MnemonicWorked fixture={mnemonic[0]} />}`.
- Run `grep -rn "atlas-card\b\|atlas-card__\|atlas-seed\|atlas-bits\|atlas-groups\|atlas-group__\|atlas-hash\b\|atlas-hash__\|atlas-bytes\|atlas-mnemonic-lab" packages apps/site/src --include=*.tsx --include=*.astro`.
- For every class with no remaining user, delete its CSS rules in `atlas.css`: the blocks under `/* ---------- FIG A01.1 card ---------- */`, `/* ---------- FIG A01.2 bits to words ---------- */` and `/* ---------- FIG A01.3 seed ---------- */`, plus related `@media` lines. Keep any class that grep still finds in use.

- [ ] **Step 3: Run the content contracts and the whole suite**

Run: `pnpm test`
Expected: PASS, including:
- `chapter mnemonics` › agrees with its catalog brief: 1 interactive figure and 8 static figures, within the policy budget.
- `chapter mnemonics` › keeps the default reading path inside the target word range.
- Every figure cites claims and gets fixtures of its recipe's kind.

- [ ] **Step 4: Build**

Run: `pnpm check && pnpm build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add content/chapters/mnemonics.json apps/site/src/styles/atlas.css packages/figures apps/site/src/components/Figure.astro packages/models/test/bip39.test.ts
git commit -m "Mnemonics: nine drawings in reading order, worked tab retired

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Visual verification, accessibility and independent review

**Files:**
- Create: `review/illustration-pilot-mnemonics.md`
- Create: `review/screenshots/pilot/` (PNG files)

- [ ] **Step 1: Serve the build and take screenshots**

Run `pnpm preview` through the preview tool (or `node tools/screenshots.mjs` against `ATLAS_BASE=http://localhost:4322`):

```bash
node tools/screenshots.mjs mnemonics review/screenshots/pilot '[
 {"name":"1440-top","width":1440},
 {"name":"1440-fig-a01-2","width":1440,"figure":"#fig-a01-2"},
 {"name":"1440-fig-a01-3","width":1440,"figure":"#fig-a01-3"},
 {"name":"1440-hero","width":1440,"figure":"#fig-a01-4"},
 {"name":"1440-hero-step3","width":1440,"figure":"#fig-a01-4","actions":[{"click":"Previous group"},{"click":"Previous group"}]},
 {"name":"1440-fig-a01-5","width":1440,"figure":"#fig-a01-5"},
 {"name":"1440-fig-a01-6","width":1440,"figure":"#fig-a01-6"},
 {"name":"1440-fig-a01-7","width":1440,"figure":"#fig-a01-7"},
 {"name":"1440-fig-a01-8","width":1440,"figure":"#fig-a01-8"},
 {"name":"1440-fig-a01-9","width":1440,"figure":"#fig-a01-9"},
 {"name":"768-hero","width":768,"figure":"#fig-a01-4"},
 {"name":"375-hero","width":375,"height":812,"figure":"#fig-a01-4"},
 {"name":"375-fig-a01-3","width":375,"height":812,"figure":"#fig-a01-3"},
 {"name":"375-fig-a01-9","width":375,"height":812,"figure":"#fig-a01-9"},
 {"name":"nojs-hero","width":1440,"figure":"#fig-a01-4","nojs":true}
]'
```

Expected:
- The tool reports `scrollWidth === width` for every step, with no page errors and no external requests.
- Open every PNG and look at it. Check for clipped labels, overlapping text, labels under 9 px at 375, and the hatch and colours rendering.
- Fix any defect in the component (adjust coordinates), rebuild, and re-shoot that step.

- [ ] **Step 2: Accessibility and keyboard**

Run the existing audit for this chapter:

```bash
node tools/a11y-tablet-audit.mjs mnemonics
```

Read `tools/a11y-tablet-audit.mjs` first for its arguments. It runs axe-core with JS on and off and walks the hero by keyboard.

Expected:
- axe clean.
- Tab reaches the size strip, the sample strip, ←, the slider and → in that order.
- Arrow keys move the slider, and the status line updates (`aria-live`).
- Pressing → at the end keeps focus (via `holdFocus`).

- [ ] **Step 3: Independent technical review**

Dispatch a fresh general-purpose subagent, read-only. Give it this prompt, with the paths filled in:

"Review the Mnemonics chapter's new drawings for technical honesty against BIP 39.
- Inputs: `content/chapters/mnemonics.json`, `content/evidence/mnemonics.json`, the pinned `sources/research-2026-10-01/raw/bip-0039.mediawiki`, `packages/models/src/bip39.ts`, the components in `packages/figures/src/mnemonic/`, and the screenshots in `review/screenshots/pilot/`.
- Check each figure:
  - Does every drawn value come from the model or derive?
  - Does any drawing imply something false? For example: the last word is "the checksum word"; the wordlist index is the word's position in the sentence; entropy and seed are the same thing; a passphrase can be "wrong".
  - Are the colour meanings consistent: secret pink, checksum purple, hash yellow, public green?
  - Does any label or `<desc>` state a number the model does not compute?
- Report must-fix / should-fix / nit with file:line."

Apply the findings that hold up, then re-run `pnpm test && pnpm build`.

- [ ] **Step 4: Write the review record**

`review/illustration-pilot-mnemonics.md` records:
- the screenshot list;
- the overflow results;
- the axe and keyboard results;
- the JS budget number;
- the reviewer's findings and what was applied;
- what was not checked.

The last item must say that no live screen-reader session was run. Do not claim any check that was not run.

- [ ] **Step 5: Commit and push the branch**

```bash
git add review/illustration-pilot-mnemonics.md review/screenshots/pilot packages apps content
git commit -m "Mnemonics pilot: screenshots, accessibility checks and independent review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin illustration-redesign
```

Then write the Taproot plan (`docs/superpowers/plans/<date>-illustration-taproot.md`), reusing the kit. It needs `Computer`/`Boundary` glyphs and a `Packet` primitive, which were not built here (YAGNI). Execute it, and only then stop for the user's visual review (spec §8).
