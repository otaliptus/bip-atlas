# Illustration redesign: closer to Making Software

Date: 2 October 2026. Status: draft for review. Branch: `illustration-redesign` (stacked on `a11y-tablet`, PR #4).

## 1. Why

The user's verdict on the current figures: accurate, but far from makingsoftware.com in mentality, style and "coolness". A side-by-side study (below) confirms it. Our 54 figures are UI panels: bordered boxes of hex strings, tab bars, radio-button scenario pickers, tables and warning banners. Making Software's are drawings of things.

Goal: redraw every figure in the 18 existing chapters, and add the small figures the explanations need, so that a reader puts a BIP Atlas page next to a Making Software page and sees the same kind of book. Nothing about correctness changes: every exact value still comes from a tested model and the build still fails closed.

## 2. What Making Software does (research summary)

Studied in the user's browser on 2 October 2026: all 32 chapter URLs. About 25 chapters have full figure sets, roughly 900 figures in total; the rest (for example *What is code*, *Neural nets*) show one teaser figure.

- **A figure draws an object or a mechanism, never a panel of data.**
  - Physical objects: a CRT drawn as a cutaway, an LCD pixel as an exploded isometric stack, AES as bytes falling through layered blocks.
  - Metaphors for abstractions: a parking lot of cars for a set, a ring of numbered cells for modular arithmetic, actors (Alice, Bob, Eve as retro computers) on either side of an "OPEN NETWORK" boundary.
- **Many small figures, each making one point.** Chapters carry 20–60 figures.
  - Most are *storyboards*: the same scene redrawn with one change. Diffie-Hellman takes 7 frames, a Huffman tree is built in 6, the IP header is revealed row by row, and the LCD stack repeats with one layer lit at a time.
- **Drawing conventions:**
  - Thin black linework.
  - Flat fills, pastel or saturated: pink/red, mint/green, blue, yellow, cyan, orange, purple.
  - Tiny uppercase monospace labels at the end of short leader lines.
  - Magnifier bubbles that zoom into a part.
  - Packet diagrams with a bit ruler along the top.
  - Bytes and bits drawn as rows of square cells.
- **No chrome.** Figures sit directly in the text column, with no frame, no card, no badge, no in-figure prose and rarely a caption.
- **Interactive figures are minimal.**
  - At most one slider, or the figure animates by itself (a Bézier curve with `t` sweeping).
  - Linked views update together (weights bars + basis graph + curve).
  - Small coloured handles; no control panels.

## 3. Decisions taken with the user

| # | Decision | Consequence |
|---|---|---|
| D1 | **Raise the figure budget.** | Each chapter keeps exactly 1 interactive hero and may carry up to 12 static figures, typically 6–12. Deviation from spec §3 is logged (§7.4). |
| D2 | **Full Making Software palette.** | Saturated and pastel fills with fixed meanings, black linework; technical blue stays the brand accent. New tokens live in `atlas.css`; the kit original `design-tokens.css` is untouched. |
| D3 | **Drawing-first heroes, one control.** | The hero is an illustration you act on directly. Scenario pickers shrink to a compact strip. The "Interactive / Worked example" tab bar is removed; worked-example content becomes static storyboards in the prose. |
| D4 | **A shared SVG illustration kit fed by the models.** | No hand-drawn raster art, no canvas/3D engine. Static figures are server-rendered SVG with zero client JS. |
| D5 | **Pilot first.** | Kit + *Mnemonics* + *Taproot* redone end to end and reviewed by the user in the browser before the other 16 chapters. |

## 4. Visual language

### 4.1 Page placement
- Figures sit unframed in the reading column. Remove the bordered figure card, the "Interactive" badge and the blue rule.
- The figure ID stays as a small vertical monospace tag in the left margin (`FIG. A07.2`), like Making Software's `FIG_001`.
- Width classes:
  - `prose`: about 700px, the default for small figures.
  - `wide`: about 960px, for heroes and big isometric scenes.
  - `pair`: two small figures side by side, stacking below 768px.
- Captions become one short line under the drawing in small serif italic. Figures may omit a caption when the prose directly above says it.

### 4.2 Linework and type
- **Ink lines:**
  - Lines use `--ink` (#222225). Object outlines are 1px, construction and leader lines 0.75px, emphasis 1.5px.
  - Joins and caps are round. All strokes use `vector-effect: non-scaling-stroke` so weights hold at any width.
- **Labels:**
  - IBM Plex Mono, uppercase, 9.5px at 1440, letter-spacing 0.06em.
  - Each label sits at the end of a leader line: a 12px horizontal tick from the object, then a gap.
  - Labels never sit inside fills unless they name the cell.
- **Values** (hex, numbers, words) are Plex Mono regular in normal case, never truncated without an ellipsis plus an exact-value disclosure (spec rule, unchanged).
- **Pixel font** (Silkscreen) is kept for the masthead and figure IDs only.

### 4.3 Palette (new tokens in `atlas.css`)

Saturated colours are for small marks, arrows, handles and active cells; pastel versions are for large fills. Every meaning also carries a second cue (a label, outline style or pattern), per spec §4.

| Token | Saturated | Pastel | Fixed meaning across the site |
|---|---|---|---|
| `--c-secret` | #F0365A | #FFD0D9 | Secret material: entropy, private keys, nonces, passphrases |
| `--c-public` | #12B76A | #C8F5DC | Public keys, xpubs, anything safe to share |
| `--c-hash` | #F5B800 | #FFF0B3 | Hash outputs and commitments (TapLeaf, TapBranch, checksums from hashes) |
| `--c-sig` | #2945F5 (brand blue) | #D5DCFF | Signatures and what they sign |
| `--c-check` | #8B5CF6 | #E6DCFF | Checksums and error-detection bits |
| `--c-net` | #06B6D4 | #C9F1F8 | Wire, network, encrypted traffic |
| `--c-time` | #F97316 | #FFE0C7 | Time: lock times, sequences, heights |
| `--c-hidden` | #9A9AA6 + 45° hatch | #EDEDF2 | Not revealed or not known to this viewer |

Construction grid: `--manual-grid` dots at 8px, used only behind isometric scenes.

### 4.4 Primitives (`packages/figures/src/kit/`)

All primitives are pure Preact SVG components with no hooks, so they render to static SVG on the server. Units are SVG user units on an 8-unit grid.

| Primitive | Purpose | Notes |
|---|---|---|
| `iso` helpers: `isoPoint`, `IsoBox`, `IsoPlate`, `IsoStack` | 30° dimetric projection, boxes, thin plates and exploded layer stacks with drop lines | Plates carry a fill token and an optional label anchor |
| `Cells` | A row or grid of byte, bit or character cells, with optional bit ruler and offsets above | Group brackets underneath ("11 BITS"), highlight ranges |
| `PacketDiagram` | Field-by-field layout with a 0…N bit or byte ruler, rows wrapping at a fixed width | For SigMsg, extended keys, PSBT maps, headers |
| `Leader` / `Label` | Leader line plus uppercase label, auto-placed left or right of an anchor | Collision-free placement by a simple column allocator |
| `Magnifier` | Circle that zooms into a region, with two tangent lines to the source | Content is any child SVG |
| `Arrow`, `Flow` | Thin arrows, labelled flows, "×2048" repeat rings | Arrow heads are 4px open chevrons |
| `Machine` | An isometric box that consumes inputs and emits outputs, labelled with a function (SHA-256, PBKDF2, TapTweak) | The core metaphor for hash and KDF steps |
| `Actor` | Retro computer, hardware wallet, phone, node and server icons, plus named people (signer, observer) | Line icons in the same 1px style |
| `Boundary` | Vertical dashed boundary with a label (OPEN NETWORK, WHAT THE CHAIN SEES) | Splits a scene into who-knows-what regions |
| `Ring` | Ring of numbered cells for modular or cyclic quantities | Used for counters and wraps |
| `Tree` | Node-link tree with typed edges: derived-from, commits-to, reveals | Edge styles distinct, per spec §4 |
| `Storyboard` | N frames of the same scene with a step label and one-line note each; frames share a viewBox | 3–4 columns at 1440, 2 at 768, 1 at 375 |
| `Key`, `Seal` | Small key glyph (public green, secret red) and a wax-seal glyph for signatures | Object metaphors used inside scenes |

### 4.5 Heroes: drawing first, one control
- **Layout:** the drawing is the hero. Controls sit inside or directly under it as small affordances:
  - a compact segmented strip to pick a published fixture;
  - one scrubber or stepper for sequential processes;
  - direct clicks on drawing parts: a leaf, a branch, a group.
- **Controls:** the catalog's `allowedControls` stay the contract. Each control maps to one affordance, never a panel of radio cards.
- **Status line:** one short `aria-live` line under the drawing states the current state in words. This is the pattern from PR #4: short status, focus helper, keyboard reachability.
- **Motion:** a stepper may auto-advance once on first view (≤ 4s, respects `prefers-reduced-motion`), then waits for the reader.
- **No-JS:** the server renders the initial state as the same SVG, plus the storyboard figures in the prose. The `data-hydrated="false"` path stays.
- **No leaks:** the value-leak rule is unchanged. A hidden or not-known part is drawn hatched with its label but never its value, including in `title` tooltips.

### 4.6 Accessibility of drawings
- Every figure SVG has `role="img"` and an `aria-labelledby` title.
- Every figure also has a visually hidden description generated from the same derived data, so the description cannot disagree with the drawing.
- Storyboards also render as an ordered list of frame notes for assistive technology.
- Colour is never the only cue: see the second-cue column rule in §4.3.

## 5. Pilot figure plans

New figures are marked **new**. Every value comes from the existing models and derives. Where a figure needs a new derived value, a derive function and a test come with it. All figures keep their claims.

### 5.1 Mnemonics (A01)

| ID | Kind | Drawing | Data |
|---|---|---|---|
| A01.1 | static (opening) | Isometric metal backup plate engraved with the 12 published words, numbered. A small stamped tag reads "PUBLIC TEST VECTOR". A leader to one word reads "INDEX 1268 · 11 BITS". | `ozone-128` |
| A01.4 **new** | static | "128 random bits": a 16×8 grid of bit cells in secret-pink, ruler 0–127, bracket "ENTROPY · 16 BYTES". Beside it the same bits as 32 hex characters, crossed out with "hard to read aloud". | `zero-128`, `ozone-128` |
| A01.5 **new** | storyboard, 4 frames | Checksum: (1) entropy cells enter a SHA-256 machine; (2) the hash comes out as cells and a magnifier shows its first bits `0011`; (3) the first 4 bits are lifted out in check-purple; (4) they are appended to the entropy, and the ruler shows 132 = 12 × 11. | `zero-128` |
| A01.2 | **hero** | Bit ribbon of 132 or 264 cells with 11-bit cut marks. Each cut group drops a numbered index card into a "wordlist drawer" (isometric cabinet labelled 2,048 CARDS), and the card shows the word. One scrubber moves through the groups. A segmented strip picks the fixture (catalog: choose fixture, 128/256 toggle, reveal groups). The status line reads "Group 12 of 12: 7 entropy bits + 4 checksum bits → index 3 → about". | 4 fixtures, as now |
| A01.6 **new** | static | "2,048 = 2¹¹": an 11-bit cell row whose 2,048 values fan out to a card stack. Three cards show first-four-letter uniqueness (`aban·don`, `abil·ity`, `able`). | wordlist |
| A01.7 **new** | static | "How short is the checksum": a 64×32 grid of 2,048 cells, one per possible last word, with the 128 valid ones filled. Labels read "128 / 2,048 = 1 in 16 PASS". | count from tests |
| A01.3 | static | Words + passphrase go into a PBKDF2 press with a "×2048" ring; out comes a 512-bit seed block (64 cells). | `ozone-128` |
| A01.8 **new** | storyboard, 2 frames | Same words, passphrases `"TREZOR"` and `""`: two unrelated seeds. A magnifier on the first bytes shows they share nothing. | published + computed |
| A01.9 **new** | static | "Still not a key": entropy → words → seed → a faded tree, with arrows labelled ENCODE, STRETCH, DERIVE (next chapter). | none (schematic) |

The worked-example tab content (the all-zero walk-through) becomes A01.5 and the hero's initial state.

### 5.2 Taproot (A07)

| ID | Kind | Drawing | Data |
|---|---|---|---|
| A07.1 | static (opening) | Tweak machine: internal key P (green key glyph) and Merkle root (yellow) enter a TapTweak machine, which emits t. Then P + t·G → Q, and Q's x-coordinate drops into the output script (`OP_1 <32 bytes>`). No curve drawing (spec §5.6). | vector 5 |
| A07.2 | **hero** | Isometric hash tree: three script leaves as cards at the bottom, hash blocks (yellow) at the branches, the output Q at the top. One affordance: click a leaf, or the key, to choose the spending path. A two-state strip, "Everything / Only the proof", hatches whatever the spend does not reveal and leaves the proof path solid. A control-block byte strip assembles beside it, piece by piece, from the revealed siblings. | `bip341-spk5` |
| A07.4 **new** | static, pair | Witness stacks as plates. Key path: one plate (64-byte signature). Script path: stack items, script, control block (33 + 32m). Annex rule noted. | spk5, input 4 |
| A07.5 **new** | storyboard, 6 frames | The verifier rebuilds the commitment: leaf hash → branch with sibling (sorted) → branch → TapTweak → P + t·G → compare with Q (match). | spk5, leaf B |
| A07.6 **new** | static | "What a spend gives away": the same tree seen by an OBSERVER across a boundary. Key-path spend: only a key and signature are visible. Script-path spend: one leaf, its depth and the siblings' hashes are visible; the rest is hatched. | spk5 |
| A07.7 **new** | static, pair | Tree shapes: a balanced tree versus a likely-first (Huffman) tree. Leaf depth equals proof length; the caption says these are suggestions in a section the BIP marks as such. | schematic, depths only |
| A07.3 | static | SigMsg as a packet diagram with a byte ruler, rows grouped. Fields that commit to every spent amount and script are coloured `--c-sig` with an "ALL INPUTS" bracket. | `bip341-keyspend-input4` |

The worked-example tab content becomes A07.5.

### 5.3 What carries over unchanged
- Fixtures, derive functions, models, claims, ledgers and prose.
- Prose edits are limited to:
  - pointing at new figures ("the figure below");
  - removing references to the tabs.
- Word-count rules are unchanged; captions remain excluded.

## 6. Architecture changes

- **Kit:** `packages/figures/src/kit/` holds the primitives (§4.4), with a unit test that renders each to a string and snapshots the structure (not pixels).
- **Recipes:** each new static figure is a registered recipe in `registry.ts` with `interactive: false`, its fixture kind and an explicit `Figure.astro` dispatch, as today. Storyboards are recipes too (`checksum-storyboard.v1`), with frames computed in derive.
- **Tokens:** §4.3 tokens go in `atlas.css` under `--atlas-c-*`. The figure card styles are removed, and new `.atlas-fig` placement styles are added.
- **Tabs:** the tab component and `*Worked` components are deleted once each chapter is migrated. Their content moves into storyboard recipes.
- **JS budget:** static figures add no client JS. Heroes stay under the 60 KB total; target ≤ 50 KB after the pilot.

## 7. Contracts and tests

1. **Figure budget.** `chapters.test.ts` reads the budget from the catalog's (kit-original) `figureBudget`. Add `content/figure-policy.json` holding `{ hero: 1, supportingMin: 3, supportingMax: 12 }` and a note pointing at decision D1. The test uses the policy file and still enforces exactly one interactive figure whose recipe is the catalog's hero with the catalog's controls.
2. **Every figure cites claims** and every exact value comes from a model (unchanged). New derived values, such as the 128-of-2,048 count, get derive checks that throw on mismatch with the published vector or the tested model.
3. **Visual checks** (CLAUDE.md, extended for storyboards):
   - screenshots at 1440, 768 and 375, plus no-JS;
   - `scrollWidth` equals viewport width;
   - axe clean;
   - the keyboard walk of the hero (reuse `tools/a11y-tablet-audit.mjs`);
   - labels at least 9px at 375; storyboards reflow to one column.
4. **Spec deviation log:** add `review/decisions.md` with D1–D5. It records that spec §3 ("one dominant figure and one or two supporting figures") and the `design-tokens.css` palette are deliberately overridden by the user, on 2 October 2026.
5. **Independent review per chapter:** a fresh subagent checks that every drawing is technically honest. Examples: no curve drawn over the reals, no implied mandatory tree shape, hidden parts never leak, colour meanings consistent. Findings and fixes go in `review/`.

## 8. Rollout

1. Kit + tokens + figure-placement CSS + budget policy.
2. Pilot: Mnemonics, then Taproot. Screenshots go to the user. **Stop for the user's review of the look.**
3. Batches of four chapters, each a PR with screenshots and a review record:
   - hd-wallets, wallet-paths, descriptors, addresses;
   - segwit, psbt, p2sh, timelocks;
   - schnorr, tapscript, musig2, silent-payments;
   - version-bits, block-filters, v2-transport, message-signing.

Each batch is planned like §5: figure table first, then build.

## 9. Out of scope and risks

- **Out of scope:** no raster or hand-drawn art; no WebGL; no new interactive heroes beyond the one per chapter; no prose rewrites beyond figure references; no change to models or fixtures except new derived values.
- **Risk: label collisions on mobile.** Mitigation: each wide figure declares a mobile composition (stacked or rotated), checked in screenshots.
- **Risk: about 150 new figures is a lot of review.** Mitigation: the storyboard and machine primitives keep figures declarative, so most are a dozen lines of data plus a derive.
- **Risk: losing the explicit spec rule.** Mitigation: the decision log and policy file make the override visible and testable.
