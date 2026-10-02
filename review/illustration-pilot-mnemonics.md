# Illustration pilot: Mnemonics (BIP 39)

Branch `illustration-redesign`. This chapter was redrawn in the illustration-kit style (decisions D1–D5 in `review/decisions.md`; spec `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`).

## What changed

The chapter went from 3 figures to 9: 1 drawing-first hero and 8 static drawings, in reading order.

| Fig. | Recipe | Drawing |
|---|---|---|
| A01.1 | `mnemonic-card.v1` | The published phrase engraved on an isometric metal backup plate. |
| A01.2 | `entropy-bits.v1` | The 128 entropy bits as a 16 × 8 grid, beside the same value as 32 hex characters. |
| A01.3 | `checksum-storyboard.v1` | Storyboard, 4 frames: SHA-256 machine, a magnifier on the first byte, the 4 checksum bits, 132 = 12 × 11. The full hash is in a disclosure. |
| A01.4 | `entropy-word-pipeline.v1` (hero) | A bit ribbon, entropy pink and checksum purple, cut by a step slider one group at a time. Each group becomes a number and pulls its wordlist card. A 128/256 strip and a sample strip. |
| A01.5 | `wordlist-index.v1` | 11 bits → index → one card from a stack of 2,048. The first entries show their unique four-letter prefixes. |
| A01.6 | `last-word-odds.v1` | All 2,048 candidate last words with the 11 words before fixed; the 128 that pass are filled, and the published word is circled. |
| A01.7 | `seed-derivation.v1` | Password and salt into a PBKDF2 "press" (× 2,048), out comes the full 64-byte seed. |
| A01.8 | `passphrase-seeds.v1` | The same words with two passphrases: two full 64-byte seeds. |
| A01.9 | `mnemonic-chain.v1` | Entropy → (encode) words → (stretch, with the passphrase) seed → (derive) keys. |

The Interactive / Worked example tab bar is gone; the worked example is now the A01.3 storyboard. The contract test was updated so that drawing-style heroes have no worked tab.

## Data added

- `validLastWords(prefix, wordlist)` in `packages/models/src/bip39.ts`, tested at 128 for a 12-word phrase and 8 for a 24-word phrase.
- In `deriveMnemonic`:
  - `lastWord`. The build throws unless the count is exactly 2048 >> CS and the published last word is among the valid ones.
  - `wordlistSample` and `wordlistSize`.

## Checks

- **Tests:** `pnpm test` passed (868 vitest + 36 Python at the last run), as did `pnpm check` and `pnpm build`.
  - Figure tests (`packages/figures/test/mnemonic-figures.test.ts`) check that every drawn value comes from the model: bits, hash bytes, checksum, indices, words, the 128-of-2,048 count, all 64 seed bytes, and the no-JS hero render.
- **Screenshots** (`review/screenshots/pilot/mnemonics-*`): 1440, 768 and 375, every figure, two hero states, and no-JS.
  - The tool reported `scrollWidth === width` at every step, with no console errors and no external requests.
- **Accessibility:** `tools/a11y-tablet-audit.mjs` with axe-core 4.10 found no violations for the hero (JS on), the page (JS on) or the page (JS off).
  - Keyboard: both strips change and announce, Next keeps focus, and the tab order is 8 stops and reversible.
  - A separate script drove the slider with arrows and Home; `aria-valuetext` and the live status updated.
- **JS budget:** 51.7 KB gzipped total client JS, after both pilot chapters (was 48 KB).

## Independent review

A fresh subagent ran a read-only review. It recomputed every value with independent Python (hashlib and the pinned wordlist) and found **no wrong values**. Findings and what was done:

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | A01.9 said encoding produces a "different secret", left the passphrase out of the stretch step, and coloured the words not-secret. | Reworded the desc and caption ("the same secret in another form"), added a passphrase input into STRETCH, and filled the words box secret pink. |
| 2 | should-fix | The hero opened fully cut and drew every cut mark at step 1, contradicting the prose ("move the slider to cut"). | Hydrated state starts at step 0. Cuts appear one group at a time (`Cells.cutBefore`). The no-JS view stays fully cut. |
| 3 | should-fix | The hero's text equivalent described only the current group. | The desc now lists every group cut so far, with index counted from 0. The status stays the live line. |
| 4 | should-fix | Green ("public") was used to mean "selected"; only one wordlist card was green. | The selected chip is outline only. The whole card stack is public green. |
| 5 | should-fix | Checksum bits differed from entropy bits only by hue. | Added "checksum" brackets under the ribbon and under the zoomed group. |
| 6 | should-fix | The storyboard shortened the hash with no exact value (spec MUST). | The full hash is in the frame desc, plus a disclosure under the storyboard. |
| 7 | nit | Some BIP constants (2,048, 64, 16) were typed by hand. | Now from `wordlistSize`, `SEED_BYTES`, `layout.entropyBits / 8` and `seedHex.length / 2`. |
| 8–15 | nits | The words box had no ellipsis; "#" index style was missing; odds grid corners and the published word were unnamed; the first-four underline used the checksum colour; the A01.2 desc said "empty"; the A01.1 caption said "carry the entropy"; the prose passphrase sentence was off; NFKD wasn't shown; lens cells clipped; the plate leader was ambiguous. | All applied. The caption and one prose sentence were edited, and the word count stays in range. |
| 16 | nit | The test helper duplicated derive without its checks. | Added a test that the "vector" seed equals the fixture's published seed. |

## Not done

- **No live screen-reader session** (VoiceOver/NVDA). Accessibility was checked through the accessibility tree, axe and keyboard scripts only.
- **Browsers:** only Chromium; no Safari or real touch devices.
- **Tablet:** tablet widths beyond 768 and 1024 were not re-audited for this chapter specifically.
- **Human sign-off:** the user has not yet reviewed the look. This pilot is for that review.
