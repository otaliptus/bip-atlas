# Illustration Pilot, Part 2: Taproot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, this session) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redraw the Taproot chapter (BIP 341) in the illustration-kit style: 1 drawing-first hero and 6 static drawings, and finish the pilot for the user's visual review.

**Architecture:** This plan reuses everything from `2026-10-02-illustration-kit-and-mnemonics.md`: the kit, drawing-mode placement, palette tokens, the figure-budget policy and the audit tooling. It adds four kit primitives Taproot needs: `KeyGlyph`, `Computer`, `Boundary` and `Packet`. All values come from `deriveTaprootTree` and `deriveTaprootKeyspend` (`apps/site/src/lib/derive.ts`), which already fail closed against `wallet-test-vectors.json`. No model or derive changes are needed.

**Tech Stack:** As in part 1.

**Spec:** `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md` §5.2. Lessons from part 1:
- **Element screenshots:** use 2× element screenshots (`scratchpad/shoot.mjs` pattern with the cached Playwright at `~/.npm/_npx/b234c773f454f454/node_modules/playwright/index.mjs`). The browser pane scales too much to judge linework.
- **Storyboards:** frames are 300 wide and the grid min is 0.9×, so they sit two-up in the 608 px prose column.
- **SVG text styles:** `.k-drawing text` outranks single-class rules, so text-size classes need `!important` or more specificity.
- **Vertical text:** the margin FIG code needs physical `left`/`top`, because logical insets rotate with `writing-mode`.
- **Accessible names:** a figure's title `<p>` needs its separator inside the span (`{`Fig. ${n} `}`).
- **Hydration:** heroes hydrate on `client:visible`. Test scripts must scroll the figure in and wait for `[data-hydrated=true]`.
- **Dev servers:** use the existing launch configs `site-dev` (4321) and `site-preview` (4322). Do not edit `.claude/launch.json`.

## Global Constraints

Same as part 1 (kit originals untouched; values only from models; 1 hero with catalog controls; ≤ 12 static figures; 1,100–1,800 words; < 60 KB JS; no-JS equivalent; no leaks; fixed palette; commit trailer). Taproot-specific:
- **No curves over the reals** (spec §5.6): keys are drawn as key glyphs and points as labels, never as a plotted curve.
- **No leaking unrevealed tree structure.** In "Only the proof" view, anything the spend does not reveal is not drawn at all; drawing it hatched would still leak the tree's shape. A sibling hash is drawn as one opaque block labelled "leaf or subtree".
- **The key path reveals only Q and a signature.** Not P, not the tree.
- **The tree shape is one published example** (caption keeps the existing caveat).
- **Palette:**
  - Keys: `public` green.
  - Hash blocks (TapLeaf, TapBranch, root, tweak t): `hash` yellow.
  - Signature: `sig` blue.
  - Script cards: `plain`.
  - Not revealed: not drawn (proof view) or `hidden` hatch (only where the spec allows it, i.e. never for tree structure).
- **The tapscript chapter refers to "Fig. A07.2"** (`TapscriptTrace.tsx:179`, `TapscriptWitness.tsx:35`). The hero must keep the number A07.2.

---

## File map

| File | Responsibility |
|---|---|
| `packages/figures/src/kit/Glyphs.tsx` (new) | `KeyGlyph`, `Computer`, `Boundary`. |
| `packages/figures/src/kit/Packet.tsx` (new) | `Packet`: fields laid out on a byte ruler, wrapping rows. |
| `packages/figures/test/kit.test.ts` (modify) | Tests for the four. |
| `packages/figures/src/taproot/treeLayout.ts` (new) | Pure layout of a `TaprootNodeView` tree, plus the proof-view node set. |
| `packages/figures/src/taproot/TaprootTweak.tsx` (rewrite) | A07.1 tweak machine. |
| `packages/figures/src/taproot/TaprootCommitment.tsx` (rewrite) | A07.2 hero. |
| `packages/figures/src/taproot/WitnessStacks.tsx` (new) | A07.3. |
| `packages/figures/src/taproot/VerifierStory.tsx` (new) | A07.4 storyboard. |
| `packages/figures/src/taproot/SpendReveals.tsx` (new) | A07.5. |
| `packages/figures/src/taproot/DepthProof.tsx` (new) | A07.6. |
| `packages/figures/src/taproot/SigMsgLayout.tsx` (rewrite) | A07.7 packet diagram. |
| `packages/figures/test/taproot-figures.test.ts` (new) | Structure and value tests. |
| `registry.ts`, `index.ts`, `Figure.astro`, `atlas.css` | Registration, dispatch, styles; delete dead taproot CSS and `TaprootWorked`. |
| `content/chapters/taproot.json` | Placement, renumbering, the A07.7 caption pointer. |
| `review/illustration-pilot-taproot.md` | Record. |

Final Taproot numbering, in reading order:
- A07.1 tweak (opening)
- A07.2 hero (section `tree`)
- A07.3 witness stacks (`spending`, after block 2)
- A07.4 verifier storyboard (`spending`, after block 3)
- A07.5 what a spend gives away (`reveal`, after block 2)
- A07.6 depth = proof size (`reveal`, after the callout)
- A07.7 SigMsg (`signing`, existing position)

---

### Task 1: Kit additions: KeyGlyph, Computer, Boundary, Packet

**Files:** Create `packages/figures/src/kit/Glyphs.tsx` and `packages/figures/src/kit/Packet.tsx`. Modify `kit/index.ts` and `test/kit.test.ts`.

**Interfaces (produced):**
- `<KeyGlyph at role? label? scale?>`: a key icon, `role` is `"public" | "secret"`, about 30×12 units at scale 1.
- `<Computer at label?>`: retro computer, 26×27 units, with the label centred below.
- `<Boundary x y1 y2 label>`: vertical dashed line with an uppercase label at its top.
- `interface PacketField { id: string; label: string; bytes: number; role?: Role; value?: string }`
- `<Packet x y fields perRow unit? rowH? ruler?>` and `packetSize(fields, perRow, unit?, rowH?) => { width, height, rows }`. Fields fill rows left to right. A field that crosses a row end continues on the next row, with its label repeated as "…cont". The ruler marks byte offsets 0, 8, 16, … above the first row.

- [ ] **Step 1: Failing tests** (append to `kit.test.ts`; add `Boundary, Computer, KeyGlyph, Packet, packetSize` to the import)

```ts
describe("glyphs", () => {
  it("KeyGlyph carries its role and optional label", () => {
    const s = html(h("svg", {}, h(KeyGlyph, { at: [0, 0], role: "public", label: "internal key P" })));
    expect(s).toContain('data-role="public"');
    expect(s).toContain("INTERNAL KEY P");
  });
  it("Computer is labelled", () => expect(html(h("svg", {}, h(Computer, { at: [0, 0], label: "observer" })))).toContain("OBSERVER"));
  it("Boundary is a dashed line with a label", () => {
    const s = html(h("svg", {}, h(Boundary, { x: 50, y1: 0, y2: 100, label: "what the chain sees" })));
    expect(s).toContain("k-boundary");
    expect(s).toContain("WHAT THE CHAIN SEES");
  });
});

describe("Packet", () => {
  const fields = [
    { id: "a", label: "hash_type", bytes: 12, role: "sig" as const },
    { id: "b", label: "nVersion", bytes: 4 },
    { id: "c", label: "sha_prevouts", bytes: 32, role: "hash" as const },
  ];
  it("wraps fields across rows and repeats the label of a continued field", () => {
    const s = html(h("svg", {}, h(Packet, { x: 0, y: 0, fields, perRow: 16, unit: 10 })));
    expect(s).toContain(">hash_type<");
    expect(s).toContain("sha_prevouts …cont");
    expect(packetSize(fields, 16, 10, 22).rows).toBe(3);
  });
  it("draws a byte ruler", () => {
    const s = html(h("svg", {}, h(Packet, { x: 0, y: 0, fields, perRow: 16, unit: 10, ruler: true })));
    expect(s).toContain(">0<");
    expect(s).toContain(">8<");
  });
});
```

48 bytes at 16 per row is 3 rows. `sha_prevouts` starts at byte 16, the start of row 2, fills it, and continues ("…cont") on row 3. The first field is 12 bytes wide so its label fits inside its cell.

- [ ] **Step 2: Run** `npx vitest run packages/figures/test/kit.test.ts`. Expected: FAIL (missing exports).

- [ ] **Step 3: Implement** `kit/Glyphs.tsx`:

```tsx
import type { Pt } from "./geom";

/** Key icon (bow, shaft, bit). Public keys green, secret keys red; label sits below. */
export function KeyGlyph({ at, role = "public", label, scale = 1 }: { at: Pt; role?: "public" | "secret"; label?: string; scale?: number }) {
  const [x, y] = at;
  return (
    <g class="k-key" data-role={role}>
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <circle class={`k-outline k-mark--${role}`} cx="6" cy="6" r="5.5" />
        <circle class="k-outline k-fill--plain" cx="6" cy="6" r="2" />
        <path class={`k-outline k-mark--${role}`} d="M11.5 4.5 H30 V7.5 H27.5 V10.5 H24.5 V7.5 H11.5 Z" />
      </g>
      {label ? <text class="k-key__t" x={x + 15 * scale} y={y + 12 * scale + 12} text-anchor="middle">{label.toUpperCase()}</text> : null}
    </g>
  );
}

/** Retro desktop computer (Making Software's actor). 26 × 27 units. */
export function Computer({ at, label }: { at: Pt; label?: string }) {
  const [x, y] = at;
  return (
    <g class="k-actor" transform={`translate(${x} ${y})`}>
      <rect class="k-outline k-fill--plain" x="0" y="0" width="26" height="20" rx="1.5" />
      <rect class="k-outline k-fill--net" x="3.5" y="3.5" width="19" height="12" />
      <rect class="k-outline k-fill--plain" x="8" y="20" width="10" height="3.5" />
      <rect class="k-outline k-fill--plain" x="3" y="23.5" width="20" height="3.5" />
      {label ? <text class="k-actor__t" x="13" y="39" text-anchor="middle">{label.toUpperCase()}</text> : null}
    </g>
  );
}

/** Dashed vertical boundary with an uppercase label at its top (e.g. OPEN NETWORK). */
export function Boundary({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  return (
    <g class="k-boundary">
      <line class="k-boundary__line" x1={x} y1={y1} x2={x} y2={y2} />
      <text class="k-boundary__t" x={x + 5} y={y1 + 8}>{label.toUpperCase()}</text>
    </g>
  );
}
```

`kit/Packet.tsx`:

```tsx
import type { Role } from "./roles";

export interface PacketField { id: string; label: string; bytes: number; role?: Role; value?: string }

interface Seg { field: PacketField; row: number; col: number; len: number; cont: boolean }

function segments(fields: PacketField[], perRow: number): Seg[] {
  const out: Seg[] = [];
  let at = 0;
  for (const field of fields) {
    let left = field.bytes;
    let cont = false;
    while (left > 0) {
      const row = Math.floor(at / perRow), col = at % perRow;
      const len = Math.min(left, perRow - col);
      out.push({ field, row, col, len, cont });
      at += len;
      left -= len;
      cont = true;
    }
  }
  return out;
}

export function packetSize(fields: PacketField[], perRow: number, unit = 9, rowH = 22) {
  const total = fields.reduce((n, f) => n + f.bytes, 0);
  const rows = Math.ceil(total / perRow);
  return { width: perRow * unit, height: rows * rowH, rows };
}

/** Field-by-field layout on a byte grid (Making Software's packet diagrams). */
export function Packet({ x, y, fields, perRow, unit = 9, rowH = 22, ruler = false }: { x: number; y: number; fields: PacketField[]; perRow: number; unit?: number; rowH?: number; ruler?: boolean }) {
  const segs = segments(fields, perRow);
  return (
    <g class="k-packet">
      {ruler
        ? Array.from({ length: Math.floor(perRow / 8) + 1 }, (_, k) => (
            <g>
              <line class="k-leader" x1={x + k * 8 * unit} y1={y - 6} x2={x + k * 8 * unit} y2={y - 2} />
              <text class="k-packet__ruler" x={x + k * 8 * unit} y={y - 9} text-anchor="middle">{k * 8}</text>
            </g>
          ))
        : null}
      {segs.map((s) => {
        const sx = x + s.col * unit, sy = y + s.row * rowH, w = s.len * unit;
        const name = s.cont ? `${s.field.label} …cont` : s.field.label;
        const fits = name.length * 5.4 + 8 < w;
        return (
          <g data-field={s.field.id}>
            <rect class={`k-cell k-fill--${s.field.role ?? "plain"}`} x={sx} y={sy} width={w} height={rowH} />
            {fits ? <text class="k-packet__t" x={sx + 4} y={sy + rowH / 2 + 3.2}>{name}</text> : null}
          </g>
        );
      })}
    </g>
  );
}
```

A field too narrow for its label, such as the real 1-byte `hash_type`, shows no text inside its cell. The SigMsg figure labels those with leader `Label`s instead.

Append to `kit/index.ts`: `export * from "./Glyphs"; export * from "./Packet";`. Append CSS:

```css
.k-key__t, .k-actor__t, .k-boundary__t, .k-packet__ruler { font-size: 9px !important; letter-spacing: 0.06em; }
.k-packet__t { font-size: 9px !important; }
.k-boundary__line { stroke: var(--atlas-ink); stroke-width: 0.75; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
```

- [ ] **Step 4: Run** the kit tests and `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** "Illustration kit: key and computer glyphs, boundary, packet diagram".

---

### Task 2: Tree layout and proof-view node set (pure, tested)

**Files:** Create `packages/figures/src/taproot/treeLayout.ts`, `packages/figures/test/taproot-figures.test.ts`.

**Interfaces (produced):**

```ts
export interface PlacedNode { hash: string; leaf: number | null; depth: number; x: number; y: number; parent: string | null }
/** Leaves evenly spaced along x in DFS order; parents centred over children; y = depth × levelH. */
export function layoutTree(root: TaprootNodeView, width: number, levelH: number): PlacedNode[];
export type Seen = "revealed" | "recomputed" | "sibling" | "known" | "absent";
/**
 * What the drawing shows of each node. Wallet view: everything known
 * ("known"), the chosen leaf "revealed", its ancestors "recomputed", its
 * proof siblings "sibling". Proof view: the same, except every other node is
 * "absent" (not drawn at all), and so are the descendants of siblings.
 * Key path: wallet view all "known"; proof view all "absent".
 */
export function seenMap(root: TaprootNodeView, path: "key" | "script", leafId: number, proof: boolean): Map<string, Seen>;
```

- [ ] **Step 1: Failing tests** (`taproot-figures.test.ts`). Build a `derived("bip341-spk5")` helper the way part 1 did. Mirror `deriveTaprootTree`:
  - `taprootOutput(f.given.internalPubkey, f.given.scriptTree)` from `@bip-atlas/models/taproot`;
  - leaves sorted by id with `scriptReading` from the same reader `derive.ts` uses;
  - `controlBlockHex` from `out.controlBlocks[out.leaves.indexOf(l)]`;
  - `check` from `checkControlBlock`.

  Before writing the helper, read `derive.ts` lines 503–568 and copy that mapping exactly.

```ts
describe("treeLayout", () => {
  const d = derived("bip341-spk5").derived;
  it("places 5 nodes for vector 5, leaves at the bottom", () => {
    const nodes = layoutTree(d.root!, 300, 60);
    expect(nodes.length).toBe(5);
    const leaves = nodes.filter((n) => n.leaf !== null);
    expect(leaves.map((n) => n.leaf).sort()).toEqual([0, 1, 2]);
    expect(Math.max(...nodes.map((n) => n.depth))).toBe(2);
  });
  it("proof view of leaf B shows B, its two ancestors and two opaque siblings, nothing else", () => {
    const m = seenMap(d.root!, "script", 1, true);
    const counts = [...m.values()].reduce((a, s) => ((a[s] = (a[s] ?? 0) + 1), a), {} as Record<string, number>);
    expect(counts).toEqual({ revealed: 1, recomputed: 2, sibling: 2 });
  });
  it("proof view of leaf A hides the B–C subtree behind one sibling hash", () => {
    const m = seenMap(d.root!, "script", 0, true);
    const counts = [...m.values()].reduce((a, s) => ((a[s] = (a[s] ?? 0) + 1), a), {} as Record<string, number>);
    expect(counts).toEqual({ revealed: 1, recomputed: 1, sibling: 1, absent: 2 });
  });
  it("key path in proof view shows no tree at all", () => {
    expect([...seenMap(d.root!, "key", 0, true).values()].every((s) => s === "absent")).toBe(true);
  });
});
```

- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** `treeLayout.ts`:

```ts
import type { TaprootNodeView } from "../types";

export interface PlacedNode { hash: string; leaf: number | null; depth: number; x: number; y: number; parent: string | null }
export type Seen = "revealed" | "recomputed" | "sibling" | "known" | "absent";

const leavesUnder = (n: TaprootNodeView): number[] => (n.leaf !== null ? [n.leaf] : n.children.flatMap(leavesUnder));

export function layoutTree(root: TaprootNodeView, width: number, levelH: number): PlacedNode[] {
  const leafOrder = leavesUnder(root);
  const step = width / leafOrder.length;
  const out: PlacedNode[] = [];
  const walk = (n: TaprootNodeView, depth: number, parent: string | null): number => {
    const x = n.leaf !== null ? step * (leafOrder.indexOf(n.leaf) + 0.5) : n.children.map((c) => walk(c, depth + 1, n.hash)).reduce((a, b) => a + b, 0) / n.children.length;
    out.push({ hash: n.hash, leaf: n.leaf, depth, x, y: depth * levelH, parent });
    return x;
  };
  walk(root, 0, null);
  return out;
}

export function seenMap(root: TaprootNodeView, path: "key" | "script", leafId: number, proof: boolean): Map<string, Seen> {
  const m = new Map<string, Seen>();
  const visit = (n: TaprootNodeView, insideSibling: boolean) => {
    let s: Seen;
    if (path === "key") s = proof ? "absent" : "known";
    else if (insideSibling) s = proof ? "absent" : "known";
    else if (n.leaf === leafId) s = "revealed";
    else if (leavesUnder(n).includes(leafId)) s = "recomputed";
    else s = "sibling";
    m.set(n.hash, s);
    for (const c of n.children) visit(c, insideSibling || s === "sibling");
  };
  visit(root, false);
  return m;
}
```

In the wallet view a sibling's own node is still `sibling` (its hash goes in the proof), and its descendants are `known`.

- [ ] **Step 4: Run** and expect PASS.
- [ ] **Step 5: Commit** "Taproot: tree layout and what-the-proof-shows map".

---

### Task 3: A07.1 tweak machine and A07.7 SigMsg packet (static redraws)

**Files:** Rewrite `TaprootTweak.tsx` and `SigMsgLayout.tsx`. Add tests to `taproot-figures.test.ts`. In `registry.ts`, add `drawing: true` to `taproot-tweak.v1` and `taproot-sigmsg.v1`.

**A07.1 `TaprootTweak({ fixtures })`** draws one row per fixture (spk0 then spk5), each 344 wide by 132 tall, stacked in one `Drawing` with `id="a07-tweak"`:
- **Left:** `KeyGlyph` at (14, 34), green, labelled "internal key P". Under it, `Value` `P` short hex: `${hex.slice(0,8)}…`.
- **Below the key:** the root.
  - spk5: a small yellow `IsoBox` (w 26, d 26, h 16) labelled "Merkle root", with a short hex under it.
  - spk0: a dashed empty square labelled "no script tree".
- **Centre:** `Machine` "TapTweak" (`sub` "hash") at (150, 70), w 70, d 36, h 28. Arrows from P and the root into it.
- **Right of the machine:** `Value` `t = ${short(tweak)}` in yellow-outlined text, then an arrow labelled "P + t·G" to a green `KeyGlyph` "output key Q".
- **Under Q:** `Cells` showing the output script's first bytes `51 20` (plain) plus one wide cell "Q (32 bytes)" in green. Add a `Label` "scriptPubKey".
- **Row header:** `Value` `vector ${f.vectorIndex} · ${leaves ? n + " scripts" : "key only"}` at the top-left of each row.
- **Disclosure:** keep an HTML `<details class="atlas-disclosure">` after the drawing with the exact P, root, t and Q of both fixtures. This is required: the drawing shortens hex.

Test: both vectors' `outputKeyHex.slice(0, 8)` and `tweakHex.slice(0, 8)` appear, and the exact values appear in the `<details>`.

**A07.7 `SigMsgLayout({ fixture })`:**
- `Packet` with `perRow: 32` and `unit: 9.5` (width 304), `ruler: true`, and fields from `d.items`. Each field has `id` and `label` from the item, `bytes`, and a role:
  - `sha_amounts` and `sha_scriptpubkeys` are `sig` blue (the "all inputs" commitment);
  - other `sha_*` are `hash` yellow;
  - the rest are `plain`.
- An "ALL SPENT OUTPUTS" bracket spans the rows of the two blue fields.
- Small fields (1–4 bytes, label not fitting) get `Label`s with leaders below the packet, in byte order, staggered on two lines.
- Under the packet: `Value` `hash_TapSighash(0x00 ‖ SigMsg) =` followed by the full `sighashHex` on its own line at 8.5 px (64 chars × 5.1 ≈ 330 units). If it does not fit, split it into two 32-char lines.
- Keep the `<details>` with every item's exact hex.

Test: the `<rect>` count inside `.k-packet` equals the number of segments for perRow 32; the blue count is 2 or more (the fields may wrap); the text contains `d.sighashHex.slice(0, 32)`.

- [ ] Steps: failing tests, then implement, then view both at 1440 and 375 with element screenshots and adjust, then commit "Taproot drawings: tweak machine and SigMsg packet".

---

### Task 4: A07.2 hero: drawing-first commitment tree

**Files:** Rewrite `TaprootCommitment.tsx`. Add `drawing: true` to `taproot-commitment.v1`. Tests in `taproot-figures.test.ts`.

**Controls** (catalog strings unchanged): "Switch key/script path", "Select a leaf", "Reveal only the proof material". They are three `atlas-strip` radiogroups:
- **Path:** `Key path` | `Script path`.
- **Leaf:** `Leaf A` | `Leaf B` | `Leaf C`. Disabled, and visually dimmed, when the path is `key`.
- **Show:** `Everything` | `Only the proof`.

**State and defaults:** path `script`, leaf B (id 1), view `wallet`. The no-JS render uses the same defaults, plus a sentence noting that the static view shows leaf B with everything visible.

**Drawing** (`Responsive`: wide 640, narrow 330):
1. **Top band:**
   - A green `KeyGlyph` Q labelled "output key Q", with `Value` `Q` as a short hex.
   - Under it, a `Machine` "TapTweak", fed from the left by a green `KeyGlyph` P "internal key P" and from below by the root.
   - In the key-path proof view, draw only Q, a blue `Seal`-style signature box ("signature · 64 B"), and the text "the spend shows no tree". P and the machine are not drawn.
2. **Tree band:** `layoutTree(d.root, W − 80, 64)` offset by (40, top). Each node is drawn according to `seenMap(...)`:
   - `known`: the leaf is a white card (96 × 34) with "LEAF A" and `scriptReading`; a branch is a small plain `IsoBox` labelled "TapBranch".
   - `revealed`: the leaf card has a thick outline and a `sig`-blue tab "in the witness".
   - `recomputed`: a yellow `IsoBox` with a dashed outline, labelled "recomputed".
   - `sibling`: a yellow `IsoBox` labelled `sibling · ${short(hash)}`. In the proof view the label reads "leaf or subtree?".
   - `absent`: nothing, including no edge into it.
   - Edges connect parent to child only when both are drawn. Recomputed edges are solid; edges to siblings are dashed.
3. **Witness strip** (bottom), proportional widths, total 100% of the drawing width minus margins:
   - Key path: one blue segment "signature · 64 B".
   - Script path, three segments:
     - "script inputs" (hatched, "not shown");
     - `script · ${len} B` (plain);
     - `control block · 33 + 32 × ${m} = ${cbLen} B`, subdivided into `c[0]` (leaf version | parity), `P · 32` and one `e · 32` per sibling (yellow).

**Status line (`aria-live`):**
- Key path: "Key path: the witness is one 64-byte signature for Q. Nothing about the tree is revealed."
- Script path: "Leaf B: the witness carries its script (N bytes) and a 97-byte control block with 2 sibling hashes; the verifier recomputes 2 hashes up to the root and checks Q."

All numbers come from `leaf.scriptHex`, `leaf.controlBlockHex` and `leaf.path`.

**Tests (static render):**
- the no-JS render contains every leaf's `scriptReading`, and the status for leaf B;
- with `seenMap` for leaf A in the proof view, the rendered drawing contains one sibling label and no "LEAF B" or "LEAF C" text. Render the component with an exported `initial` prop override; add `initial?: { path; leafId; view }` for tests and the no-JS story only.
- the key-path proof view contains no `internalKeyHex.slice(0, 8)`.

The last test is the no-leak check.

- [ ] Steps:
  - failing tests;
  - implement;
  - element screenshots of all 3 paths × 2 views at 1440 and 375;
  - fix layout;
  - check the JS budget (< 60 KB total);
  - commit "Taproot hero: drawing-first commitment tree".

---

### Task 5: A07.3–A07.6 static drawings

**Files:** Create `WitnessStacks.tsx`, `VerifierStory.tsx`, `SpendReveals.tsx`, `DepthProof.tsx`. Register four recipes (`taproot-witness-stacks.v1`, `taproot-verifier-story.v1`, `taproot-reveals.v1`, `taproot-depth.v1`). All are `drawing: true`, `fixtureKind: "taproot-tree"`, 1 fixture (`bip341-spk5`). Export and dispatch them.

- **A07.3 `WitnessStacks`:** two columns, `Responsive` stacked on narrow. Each witness is a vertical stack of thin `IsoBox` plates (w 120, d 40, h 6), top item last.
  - Key path: one blue plate "signature · 64 B" from `d.keySpend.signatureHex.length / 2`.
  - Script path for leaf B: plates "script inputs" (hatched), `script · ${n} B` and `control block · ${cb} B`.
  - A `Label` notes "annex: last item starting 0x50, if present", taken from the existing `annex` claim. No annex is drawn: the vector has none.
- **A07.4 `VerifierStory`:** a storyboard from `leaf.check` for leaf B, one frame per step:
  - `length`: "control block is 33 + 32 × m bytes; m = 2";
  - `leaf-hash`: the script card into a TapLeaf machine, giving k0;
  - each `branch`: two cubes (k, e) ordered by `first`, into TapBranch, giving next;
  - `tweak`: P and the root into TapTweak, giving t;
  - `output-key`: P + t·G → Q';
  - `compare`: Q' = Q, a green check, plus the parity bit.

  Notes come from step values; every hash is a short hex with an ellipsis. The full values are in the hero's disclosure and A07.1's, so the caption points there: "Exact values: Fig. A07.1 and the hero's details."
- **A07.5 `SpendReveals`:** two panels side by side (`Responsive`). Each has a `Boundary` "what the chain sees", a `Computer` "observer" on the right, and on the left what the spend publishes.
  - Key path: Q plus a signature box.
  - Script path (leaf B): Q, the script card, the control block, and two sibling cubes labelled "leaf or subtree?".

  Labels: "depth 2 → 2 sibling hashes", from `leaf.path.length`. There is no hatched tree shape anywhere.
- **A07.6 `DepthProof`:** the vector-5 tree (`layoutTree`). Under each leaf is a control-block bar scaled to `controlBlockHex.length / 2` bytes (65, 97, 97), labelled `33 + 32 × m = N B`. The caption keeps the existing tree-shape caveat: the shape is one example, and the BIP's balanced/Huffman suggestions are non-normative.

**Tests:**
- each component renders `bip341-spk5` values: control-block byte counts equal `controlBlockHex.length / 2`;
- the storyboard has `leaf.check.length − (number of non-drawn ids)` frames;
- SpendReveals contains no `internalKeyHex.slice(0, 8)` in its key-path panel (no leak).

- [ ] Steps: failing tests, implement, element screenshots, adjust, commit "Taproot drawings: witnesses, verifier storyboard, reveals, depth".

---

### Task 6: Taproot content, worked tab retirement, dead CSS

- [ ] Insert the four new figures with the claims below, and renumber the SigMsg figure to A07.7. Change its caption from "…the spend shown in the figure above" to "…the spend shown in Fig. A07.2".

| figure | recipe | title | claims | caption |
|---|---|---|---|---|
| A07.3 | `taproot-witness-stacks.v1` | Two witnesses | `["path-choice", "key-path-rule", "script-and-control", "control-contents", "vector5"]` | Count the items: one means the key path, two or more (after any annex) the script path. |
| A07.4 | `taproot-verifier-story.v1` | Rebuilding the commitment | `["tweak-check", "parity-why", "branch-order", "vector5"]` | The verifier's recomputation for leaf B of vector 5, step by step. |
| A07.5 | `taproot-reveals.v1` | What a spend gives away | `["privacy", "key-or-script"]` | A key path spend shows a key and a signature. A script path spend shows one script, the proof for it, and its depth. |
| A07.6 | `taproot-depth.v1` | Depth is proof size | `["tree-shape", "control-contents", "privacy"]` | Each level adds one 32-byte hash to the control block. This tree is one published example, not a required shape. |

- [ ] Remove `TaprootWorked` (component, export, dispatch line). Then grep and delete CSS for `atlas-tweak`, `atlas-tap-*` and `atlas-sigmsg` if unused (keep `atlas-tap-exact` if the disclosures reuse it).
- [ ] Run `pnpm test`, `pnpm check` and `pnpm build`, all green. Confirm the tapscript chapter still links "Fig. A07.2" to the hero.
- [ ] Commit "Taproot: seven drawings in reading order, worked tab retired".

---

### Task 7: Verification, review, pilot hand-off

- [ ] Screenshots into `review/screenshots/pilot/`:
  - `tools/screenshots.mjs taproot` at 1440 for every figure;
  - the hero in 4 states (script/B, script/A proof, key, key proof);
  - 768 for the hero and the storyboard;
  - 375 for the hero, A07.4, A07.5 and A07.7;
  - no-JS for the hero.

  Expect no overflow, errors or external requests. Look at every PNG.
- [ ] Run `tools/a11y-tablet-audit.mjs` for taproot: axe clean, keyboard walk, live status. Run a keyboard test of the three strips with arrow keys.
- [ ] Independent review subagent (read-only), with the same prompt shape as part 1, adapted to BIP 341. Specific checks:
  - no curve plots;
  - no tree structure leaked in the proof view, including in `<desc>` and `<title>`;
  - the key path reveals nothing about P or the tree;
  - the parity bit is explained correctly;
  - the caveat on tree shape is kept;
  - colour meanings match part 1.

  Apply the findings that hold up.
- [ ] Write `review/illustration-pilot-taproot.md` (same structure as the Mnemonics record). Commit and push the branch.
- [ ] Open a PR, `illustration-redesign` → `main` (after PR #4 merges, or stacked on it). The body lists the decisions D1–D5, links both review records and the screenshots, and states plainly that this is the pilot for the user's visual review: the other 16 chapters are untouched.
- [ ] **Stop.** Send the user the key screenshots (both heroes, a storyboard, the plate, the odds grid, the SigMsg packet) and ask for their verdict on the look before any further chapter.
