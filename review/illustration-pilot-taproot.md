# Illustration pilot: Taproot (BIP 341)

Branch `illustration-redesign`. This chapter was redrawn in the illustration-kit style (decisions D1–D5 in `review/decisions.md`). Plan: `docs/superpowers/plans/2026-10-02-illustration-taproot.md`.

## What changed

The chapter went from 3 figures to 7: 1 drawing-first hero and 6 static drawings, in reading order.

| Fig. | Recipe | Drawing |
|---|---|---|
| A07.1 | `taproot-tweak.v1` | Vectors 0 and 5: P (key glyph) and the Merkle root (hash cube, or "P only") go into a TapTweak machine, giving t, then P + t·G gives Q in the output script. The exact values are in a disclosure. |
| A07.2 | `taproot-commitment.v1` (hero) | Q, the tweak machine, the script tree (cubes and script cards) and the witness strip. Strips: key/script path, leaf (script path only), Everything / Only the proof. |
| A07.3 | `taproot-witness-stacks.v1` | Key-path and script-path witnesses as stacks of plates. Either can carry an annex. |
| A07.4 | `taproot-verifier-story.v1` | Storyboard, 6 frames: control block → TapLeaf → TapBranch ×2 → TapTweak → compare Q′ with Q. Exact values are in a disclosure. |
| A07.5 | `taproot-reveals.v1` | What an observer across the chain boundary sees of each kind of spend. |
| A07.6 | `taproot-depth.v1` | The published tree with each leaf's control block drawn to scale (65, 97, 97 B). |
| A07.7 | `taproot-sigmsg.v1` | The SigMsg as a packet diagram on a 32-byte ruler, with the two all-inputs commitments outlined, and the sighash. |

**No-leak rule.** In "Only the proof", the hero lays out a *pruned* tree (`pruneForView`): absent nodes are removed and each sibling becomes an opaque tip.
- Neither labels nor positions nor depth reveal anything the spend does not publish.
- The key-path proof view draws only Q and the signature. It names no P, no root and no leaf in the drawing, `<title>`/`<desc>`, status or disclosure.

Tests cover all of this.

**Fail closed.** Figures that follow "leaf B" use `storyLeaf()`, which throws if the leaf is missing. Figures that need the key-path spend throw if it is absent; there are no invented fallbacks.

`TaprootWorked` was retired; its content is now A07.4.

## Checks

- **Tests:** `pnpm test` passed (869 vitest + 36 Python), as did `pnpm check` and `pnpm build`. `packages/figures/test/taproot-figures.test.ts` has 20 tests, covering:
  - tree layout and proof map;
  - the no-JS default;
  - the leaf-A and key-path proof views (no leaks);
  - proof-view height depending only on what is drawn;
  - control-block arithmetic;
  - the static drawings' values;
  - the SigMsg layout and sighash.
- **Screenshots** (`review/screenshots/pilot/taproot-*`): 1440, 768 and 375, every figure, 3 hero states and no-JS. No overflow, console errors or external requests.
- **Accessibility:** axe-core 4.10 found no violations for the hero (JS on), the page (JS on) or the page (JS off). In the keyboard walk, the path and view strips change and announce, and the tab order is 11 stops and reversible.
- **JS budget:** about 52 KB gzipped total (limit 60 KB).
- **References:** the tapscript chapter's references to "Fig. A07.2" still point at the hero.

## Independent review

A fresh read-only subagent rendered every hero state and checked against BIP 341.
- **Passed:** no curves; no values leaked as text; P revealed only on the script path; leaf version, parity and branch sorting; ledger support; SigMsg field order and sizes; the A07.7 caption.
- **Findings and what was done:**

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | The proof view still laid out the full tree, so its height and spacing leaked hidden depth and subtree size. | `pruneForView` lays out only drawn nodes. A test checks that the leaf-A proof view is shallower than the wallet view and than leaf B's proof. |
| 2 | must-fix | A07.4 shortened k0 and branch results with no exact values anywhere. | Added an "Exact values, step by step" disclosure, and simplified the caption. |
| 3 | should-fix | sha_amounts and sha_scriptpubkeys were coloured signature blue. | They are hash yellow with a heavy outline; the legend, the caption ("outlined") and the test were updated. |
| 4 | should-fix | The "IN THE WITNESS" bar used signature blue. | Ink. |
| 5 | should-fix | Wrapped packet fields lost their identity. | Continuations show "…"; field labels carry their size ("· 32 B"). |
| 6 | should-fix | The script-path panel of A07.5 left out the script's inputs. | Added "inputs (here a signature)" and the version byte. The desc says so too. |
| 7–17 | nits | Script inputs drawn as "hidden"; the leaf strip visible on the key path; layout vs sort order; "parity 0" unexplained; "tweak the key" wording; arrows used for checks; the version byte coloured as P; the control-block plate all yellow; hard-coded fallbacks; an arrow from "no script tree"; annex wording. | All applied. Script inputs are now a dashed "not in the vector" segment. The leaf strip is hidden on the key path. A layout/sort note was added. Comparisons are "checked against" or "=" marks. The version byte is split out. Fallbacks throw. "P only" replaces the arrow for vector 0. Annex wording covers both kinds of spend. |

## Not done

- **No live screen-reader session** (VoiceOver/NVDA).
- **Browsers:** only Chromium.
- **Leaf strip keyboard:** the audit tool does not drive the leaf strip after switching to the key path (the strip is hidden there). The leaf strip was exercised by the screenshot actions only.
- **Human sign-off:** the user has not yet reviewed the look. This pilot is for that review.
