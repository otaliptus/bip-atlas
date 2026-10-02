# Accessibility and tablet pass: 18 heroes, 768 and 1024 px

Date: 2 October 2026. Build: this branch, served statically from `apps/site/dist`. Not a sign-off: every chapter stays `in-review`, `noindex` is untouched.

## Method

**This was an accessibility-tree and keyboard audit, not a live screen-reader session.** No screen reader (VoiceOver, NVDA, JAWS, TalkBack) was driven, and no macOS or VoiceOver settings were changed. What was done instead, in Chromium (Playwright 1.59.1, the preinstalled `chromium-1217`; no `playwright install` was run):

- **Accessibility tree.** For every hero, `ariaSnapshot()` of the hero `<figure>` in two states: hydrated (JS on), and with JavaScript disabled in the browser context (the `data-hydrated="false"` path). Each tree was read by hand for roles, names, grouping, states and reading order.
- **Keyboard only.** A scripted walk enters the hero and presses Tab from stop to stop. At each stop it operates the control the way a keyboard user would (ArrowDown on a radio, Space on a checkbox or switch, Enter on a button, ArrowRight then ArrowLeft on a tab). It records the accessible name, whether a focus ring is drawn, whether the hero changed, whether a live region's text changed, and where focus went (and whether it fell to `<body>`).
  - Two more checks per hero: the full Tab sequence forwards, then Shift+Tab back, compared for reversibility; and "drive to end", which presses every Next / Down / Check button until it disables or disappears and reports where focus lands.
- **Announcements.** A change counts as announced if it lands in an `aria-live` region, or if focus moves to the changed content. A change counts as discoverable if it follows the control in reading order under a visible label. Whether a real screen reader speaks each live update, and how verbosely, was **not** verified.
- **axe-core 4.10.2** (WCAG 2.0/2.1 A and AA plus best practice) was run three times per chapter: on the hero, on the whole page with JS (after scrolling so every island hydrates), and on the whole page with every script stripped.
- **Leaks.** Each component's source was read for hidden values, and every `title`, `aria-label`, `aria-description` and `aria-valuetext` in each hero was listed and checked against what a viewer in that state could know.
- **Tablet.** Every chapter and the cover were screenshotted at 768×1024 and 1024×768. `document.documentElement.scrollWidth` was compared with `innerWidth`. A layout probe then lists, inside `main`:
  - elements sticking out of the viewport;
  - content clipped by `overflow: hidden`;
  - text spilling out of its box inside figures;
  - horizontal scrollers;
  - SVG text under 9 px.
  
  Screenshots were also looked at by eye (hero, top of page, and every figure plate at 768).

Tooling: `tools/a11y-tablet-audit.mjs` (new; its header gives usage). Raw results are in `review/screenshots/tablet/audit.json`.

Screenshots are in `review/screenshots/tablet/`, quantized to 128 colours to keep the repo small:
- `<chapter>-768-top.png`, `<chapter>-1024-top.png`
- `<chapter>-768-hero.png`, `<chapter>-1024-hero.png`
- `<chapter>-768-hero-state.png` (after the first keyboard action that changed the hero)
- `<chapter>-768-hero-nojs.png`
- `cover-768-top.png`, `cover-1024-top.png`

## Defects found and fixed

| # | Defect | Where | Fix |
|---|---|---|---|
| 1 | **Focus lost to `<body>`** when a pressed button disables or removes itself (Next on the last step, Restore original, ±1 at a bound, Reset to the Core case, Check the descriptor checksum). The keyboard or screen-reader user is thrown to the top of the page. Found by the walk in 8 heroes; the same code path exists in 12. | addresses, mnemonics, psbt, schnorr, tapscript, p2sh, timelocks, version-bits, wallet-paths, descriptors, musig2, v2-transport | New `packages/figures/src/focus.ts` `holdFocus`, attached as the hero root's `onClickCapture`. After the re-render, if focus fell out, it moves to the nearest enabled button in the same group (e.g. Next → Previous), else to a `[data-focus-home]` element (the descriptor's Checksum region, `tabIndex=-1`). It has to run in the capture phase: for real input events Preact re-renders in the microtask after the button's own handler, so by the bubble phase a removed button is already detached. "Drive to end" now ends on Previous / Up a level / the Checksum region in every hero. |
| 2 | `role="tree"` / `treeitem` / `aria-selected` without the tree keyboard model (no arrow keys; focus sits on buttons inside the items). Screen readers switch to focus mode for a tree and expect arrows. | hd-wallets `DerivationTree` | Plain nested lists of buttons. Each twisty is now `aria-label="Branch m/0H"` with `aria-expanded`; the selected node button has `aria-current`. Tab still reaches every button, as before. |
| 3 | Address ribbon: moving the cursor was signalled only by changing the focused group's `aria-label` (spoken inconsistently), and the character under the cursor was never exposed (cells are `aria-hidden`). | addresses `AddressChecksumLab` | Static group label. A visually hidden polite live line now reads e.g. "Position 42 of 62, checksum: “q”." |
| 4 | Live regions swapped in and out with their content (`<p aria-live>` ↔ `<ol aria-live>`), so the region was inserted together with its text and often not announced. When it was, the whole stage list was read. | p2sh `P2shTwoStage` | One persistent, visually hidden polite line, e.g. "Stage 2 of 3, Its hash matches the output: passes." `aria-live` was removed from the list. |
| 5 | Stepping announced only "Stage 3 of 8 revealed." without saying which stage or its result. | schnorr `SchnorrVerifier` | It now announces "Stage 3 of 8 revealed: Read s, passes." |
| 6 | axe `landmark-complementary-is-top-level` on every chapter with a callout (an `<aside>` nested in `main`'s regions). | `Blocks.astro` | Callouts are `<div role="note">`; styling is class-based, so nothing visible changed. |
| 7 | axe `landmark-unique`: the static Fig. A05.1 regions had the same names as the hero's ("Global map", "Input 0 map", …). | psbt `PsbtLayout` | Renamed to "Creator's Global map", etc. |
| 8 | The current deployment state was shown only by colour in the states list. | version-bits | `aria-current="step"` on the current state. |
| 9 | `aria-label` on elements with no role, so assistive technology ignores the name. | taproot structure `div`, descriptor ribbon `p` | `role="group"`. |

## Tablet layout: defects found and fixed

From 1024 px up to 1279 px, the contents rail takes a column, so each plate is narrower than at 768 (about 690 px against 708). Several two-column labs only stacked below 64rem or 48rem, so at 1024 they were squeezed, and two were already squeezed at 768:

| Page | Width | Problem | Fix (`atlas.css`) |
|---|---|---|---|
| segwit hero | 1024 | Byte-map hex column 5 px wide, one character per line (the hero was 12,600 px tall). | `.atlas-tx-lab__body` stacks below 80rem. |
| silent-payments hero | 768, 1024 | Sender panel squeezed: the address ran about 10 characters per line, the note one word per line. | `.atlas-sp-flow` stacks below 80rem. |
| v2-transport hero | 768, 1024 | The two lanes squeezed the 64-byte hex into narrow columns. | `.atlas-v2-lanes` stacks below 80rem. |
| taproot hero | 1024 | Tree leaves wrapped every few characters. | `.atlas-tap-lab__body` stacks below 80rem (was 64rem). |
| descriptors hero | 1024 | Key panel values wrapped narrowly. | `.atlas-ds-body` stacks below 80rem. |
| wallet-paths, Fig. A12.1 (chapter head) | 1024 | Six level cells in the narrow head column clipped words ("maste", "conventio", "independe"). | 3 × 2 grid at 64–80rem. |
| version-bits, Fig. A11.1 (chapter head) | 1024 | 32 bit cells of 7–9 px; bit numbers overlapped. | 16 × 2 grid at 64–80rem (as on mobile). |
| musig2, Fig. A14.1 (chapter head) | 1024 | "· P1" labels ran past the column border. | Key terms wrap (`.atlas-mu-ka__terms li`). |

At 1280 px and up the side-by-side layouts return, with hex columns of 136 px or more (162 px at 1440, as before). Desktop 1440 and mobile 375 rules are otherwise unchanged.

## Tablet overflow results (after fixes)

`scrollWidth === innerWidth` on every page at both widths; no element sticks out of the viewport, nothing is clipped, and there is no SVG text under 9 px.

| Page | 768 | 1024 | Notes |
|---|---|---|---|
| `/` (cover) | 768 = 768 ✓ | 1024 = 1024 ✓ | |
| addresses | ✓ | ✓ | The fixture table and the Fig. A04.3 regrouping scroll horizontally inside focusable, labelled wrappers (intended). |
| block-filters | ✓ | ✓ | |
| descriptors | ✓ | ✓ | At 1024 the Fig. A13.3 table scrolls in its focusable wrapper (intended). |
| hd-wallets | ✓ | ✓ | |
| message-signing | ✓ | ✓ | |
| mnemonics | ✓ | ✓ | |
| musig2 | ✓ | ✓ | |
| p2sh | ✓ | ✓ | |
| psbt | ✓ | ✓ | At 1024 one record name spills 3 px past its cell in Fig. A05.2; not visible as a defect. |
| schnorr | ✓ | ✓ | |
| segwit | ✓ | ✓ | |
| silent-payments | ✓ | ✓ | |
| taproot | ✓ | ✓ | |
| tapscript | ✓ | ✓ | |
| timelocks | ✓ | ✓ | At 1024 the Fig. A10.1 table scrolls in its focusable wrapper (intended). |
| v2-transport | ✓ | ✓ | |
| version-bits | ✓ | ✓ | |
| wallet-paths | ✓ | ✓ | |

No page errors were logged.

## Per-hero results (after fixes)

Common to all 18:
- **Radio groups** are `<fieldset>` + `<legend>` (snapshot: `group "<legend>"`), and each radio is named by its label.
- **Tabs** (A Interactive / B Worked example) use `tablist`, with `aria-selected` and arrow keys.
- **Focus rings** were drawn at every Tab stop: 2 px `--manual-focus` outline, and on the label for visually styled radios.
- **Tab order** was reversible with Shift+Tab in every hero.
- **axe** found nothing on the hero, the page with JS, or the page without scripts.
- **The worked-example SVG** is `role="img"` with an `aria-label`; its numbered markers are presentational, and the legend list carries the text.
- **Without JS:** every hero renders `data-hydrated="false"` and starts with a "Static view: …" note. It has no focusable controls (only evidence links and, where present, a `<details>` summary). Both tab panels are shown with "A · Interactive" / "B · Worked example" headings, in a sensible reading order.

| Hero | Controls | Announcement | Keyboard | Issues found | Fix applied |
|---|---|---|---|---|---|
| mnemonics A01.2 `EntropyWordLab` | 2 radio groups; `switch` "Reveal 11-bit groups"; `listbox` of words (roving tabindex, arrows / Home / End); Prev / Next / Jump buttons | Polite status line (word, bits, index) | 9 stops; listbox arrows OK | Next word on the last word dropped focus. Minor: the focused option's name and the live line say the same sentence. | #1. The double reading is not changed. |
| hd-wallets A02.2 `DerivationTree` | Radio group "You hold"; `switch`; twisty and node buttons | Polite "Details for …" region | 17 stops, all buttons reachable | `role="tree"` without its keyboard model. Leak check passed: in the xpub view, underivable nodes read "not derivable from M"; no xpub, chain code or private key appears in text, `title` or `aria-label`. | #2 |
| segwit A03.2 `TransactionAnatomy` | 2 radio groups; preimage item buttons (`aria-pressed`, BIP 143 lens) | Polite "Lens result" region | 8 stops | Layout squeeze at 1024 only | tx-lab breakpoint |
| addresses A04.2 `AddressChecksumLab` | Radio group; ribbon group (`tabindex=0`; arrows move and change, Home / End / Esc); 5 buttons | Polite verdict line, plus a new polite cursor line | 12 stops | Cursor and character not reliably announced; Next position and Restore original dropped focus | #1, #3 |
| psbt A05.2 `PsbtEnvelope` | Role step buttons (`aria-current="step"`); Prev / Next; radio group "Mark as new"; record buttons (`aria-pressed`) | Polite status line, plus a polite "Field detail" region | 18 stops | Next role on the Extractor dropped focus; axe `landmark-unique` | #1, #7 |
| schnorr A06.2 `SchnorrVerifier` | 2 radio groups; Prev / Next / Show all | Polite status line | 10 stops | Next stage dropped focus; the status line did not name the stage or its result | #1, #5 |
| taproot A07.2 `TaprootCommitment` | 3 radio groups (Leaf is a disabled fieldset on the key path); `<details>` Exact values | Polite "Witness and verification" region | 13 stops | Ignored `aria-label` on a `div`. Leak check passed: proof + key path hides P, the root and the tweak, including in Exact values. | #9 |
| tapscript A08.2 `TapscriptTrace` | 2 radio groups; Prev / Next / "Play to the end" ↔ "Back to start"; `<details>` | Polite "Current step" region | 15 stops | Next step dropped focus | #1 |
| p2sh A09.2 `P2shTwoStage` | 2 radio groups; Prev / Next | New persistent visually hidden polite line | 10 stops | Swapped-in live regions; Next stage dropped focus. Leak check passed: while hidden, the redeem script appears nowhere in the DOM. | #1, #4 |
| timelocks A10.3 `TimelockFields` | 2 radio groups; Set to 1/2, −1 / +1, Make final, 32 bit toggles (`aria-pressed` with "bit 22, type flag, set"), Reset; checkbox Compare | Polite "Checks" region | 12 stops in absolute mode (measured); relative mode adds the 32 bit buttons, each its own stop | −1 / +1 at a bound and Reset dropped focus | #1 |
| version-bits A11.2 `VersionbitsMachine` | Radio group; counted-period toggles (`aria-pressed`, full label); other periods `role="img"` with label; Prev / Next / Play | Polite "Current period" region | 10 stops | Current state not exposed in the states list; Next period dropped focus | #1, #8 |
| wallet-paths A12.2 `WalletPathWalk` | 2 radio groups; level buttons (`aria-current="step"`); Up / Down | Polite "Current level" region | 16 stops | Down a level on the address dropped focus | #1 |
| descriptors A13.2 `DescriptorAnatomy` | Radio group; key buttons (`aria-pressed`, multi-key only); Check button (removed when pressed) | Polite "Highlighted key" and "Checksum" regions | 10 stops | Check dropped focus; ignored `aria-label` on `p` | #1 (focus moves to the Checksum region), #9 |
| musig2 A14.2 `Musig2Rounds` | Radio group; checkbox Reveal; stage buttons (`aria-current`); Prev / Next; signer lanes as `role="table"` | Polite stage note | 16 stops | Next on the last stage dropped focus | #1 |
| silent-payments A15.2 `SpDerivation` | 2 radio groups; checkbox Reveal steps | Polite computation region | 9 stops | Layout squeeze only. Leak check passed: the receiver view shows only the transaction's input keys, the receiver's own keys and derived points. | sp-flow breakpoint |
| block-filters A16.2 `GcsFilter` | Radio group; checkbox Reveal coding; probe radio group | Polite decode-steps list | 9 stops | Minor: revealing the coding is not announced; the section is labelled "Golomb-Rice coding" and follows in reading order | none |
| v2-transport A17.2 `V2Handshake` | Radio group; checkbox Compare; stage buttons (`aria-current`); Prev / Next | Polite stage note | 15 stops | Next on the last stage dropped focus; lanes squeezed at 768 / 1024 | #1, v2-lanes breakpoint |
| message-signing A18.2 `Bip322VirtualTx` | 2 radio groups; checkbox Reveal hash | Polite region on `.atlas-b322-txs` (both tables) | 9 stops, reversible, focus visible, no focus loss (no buttons disable themselves) | See below | **not edited** (another session owns `bip322/`) |

### Message-signing: findings not applied

Another session is editing `packages/figures/src/bip322/` and the message-signing content, so nothing there was changed. Screenshots of it were taken like the others. What was found:

1. **The verdict is not announced when the vector changes, and the region that is announced is too long.** `aria-live="polite"` sits on `<div class="atlas-b322-txs">`, so every change of vector or view reads one or two whole 6–7-row tables. Meanwhile `<p class="atlas-b322-verdict">` (Valid / Invalid / Inconclusive), the main thing that changes with the vector, is outside any live region. Suggested fix in `Bip322VirtualTx.tsx`:
   - change `<div class="atlas-b322-txs" aria-live="polite">` to `<div class="atlas-b322-txs">`;
   - just before the verdict paragraph, add  
     `{hydrated ? <p class="manual-sr-only" aria-live="polite">{`${f.label}: ${STATE[d.verdict.state]}. Showing ${view}${reveal ? ", message hash revealed" : ""}.`}</p> : null}`  
     (or, more simply, put `aria-live="polite"` on the `<p class="atlas-b322-verdict" …>` itself).
2. **Optional, for consistency:** if stepping buttons are ever added, give the root `onClickCapture={hydrated ? holdFocus : undefined}` (import from `../focus`). No button disables itself today, so there is no current defect.
3. **Checked and fine:**
   - fieldset / legend grouping;
   - the checkbox name;
   - axe is clean;
   - the no-JS view shows both virtual transactions and the hash after the static note;
   - with the hash hidden, it appears in neither the head row nor the scriptSig (to_spend's txid is shown, which does not reveal the hash);
   - layout at 768 and 1024 has no overflow (screenshots `message-signing-*`).

## Checks

- `pnpm check`, `pnpm test` (766 passed, 1 skipped; kit Python suite OK) and `pnpm build` are green.
- Client JS: 48.0 KB gzipped across the five bundles (the figures bundle is 38.3 KB); budget 60 KB. Components import only `../focus` and model subpaths.

## Not done

- **No live screen-reader session** (VoiceOver, NVDA, JAWS, TalkBack). Whether each live update is spoken, its timing and its verbosity are untested; so is whether `aria-current` and `aria-pressed` changes are read in each reader.
- **Live-region verbosity** is not restructured. Most heroes put `aria-live` on a whole `section.atlas-panel`, so a change reads the whole panel. Short, persistent status lines (as now in p2sh) would be kinder; that is a larger rewrite, so it was left for a design decision.
- **Timelocks, relative mode, has 32 Tab stops** for the nSequence bits. A roving tabindex with arrow keys would cut that to one; not done.
- **The key tree has no arrow-key navigation.** It is now honestly a list of buttons, not a tree.
- **Minor, not changed:**
  - mnemonics double-reads the word sentence (focused option plus live line);
  - block-filters does not announce the coding reveal;
  - the taproot leaf chooser lists every leaf's depth even in "Only the proof" view (it is the reader's control, not the spend's content, but a stricter reading would hide it).
- **Browsers and devices:** only Chromium at deviceScaleFactor 1. No WebKit / iPad Safari, no real touch device, no 200 % zoom or text-spacing test, and no Windows High Contrast / forced colours.
- **Worked-example tabs** were covered by axe and the accessibility tree only, not walked control by control (they are static).
- Desktop 1440 and mobile 375 screenshots were not retaken. The CSS changes apply only below 80rem or between 64 and 80rem; 375 falls under the existing 48rem rules, which already stacked these layouts.
