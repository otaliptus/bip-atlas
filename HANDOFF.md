# Handoff: where things stand and what to do next

Last updated: 1 October 2026, at the end of the cloud session that built phase three. If you were asked to **"continue"**, work through **Next steps** in order. Read `CLAUDE.md` for commands, layout and the rules the tests enforce.

## State

- **Eighteen chapters are drafted.**
  - Phases one and two (eight chapters: BIPs 39, 32, 141, 143, 173, 350, 174, 340, 341, 342) are merged to `main` and live.
  - Phase three (ten chapters, branch `main-q0i8zv`) follows `catalog-phase3.json`. Chapters, with figure prefixes A9–A18:

    | Chapter | BIPs |
    |---|---|
    | `p2sh` | 16 |
    | `timelocks` | 65/68/112/113 |
    | `version-bits` | 9/8 |
    | `wallet-paths` | 44/84/86 |
    | `descriptors` | 380–386 |
    | `musig2` | 327 |
    | `silent-payments` | 352 |
    | `block-filters` | 157/158 |
    | `v2-transport` | 324 |
    | `message-signing` | 322 |

  - Each chapter has had one independent technical review. The fixes were applied and recorded in `review/` (`phase-three.md` covers the new ten). Every `reviewState` is `in-review`: no human has signed off any chapter yet.
- **Phase-three sources:**
  - Snapshot: `sources/research-2026-10-01-phase3`, the same `bitcoin/bips` commit, including each BIP's auxiliary vector files.
  - External pinned files: `sources/external/` holds Bitcoin Core v29.0 locktime cases (an excerpt; `tools/extract-locktime-cases.mjs` rebuilds it).
  - Fixtures cite their source line; the build re-checks each quote.
- **Scope limits worth knowing:**
  - **ElligatorSwift** (BIP 324) is not implemented, because no audited JS library has it and the crypto rule forbids hand-rolling. The v2 model takes decoded X coordinates from the vectors and says so everywhere.
  - **SipHash-2-4** (BIP 158) comes from the `siphash` npm package (Frank Denis). It is not `@noble`, but it is not hand-rolled either; it passes the SipHash paper vector, and SipHash is not security-critical here.
  - **BIP 322 verification** covers P2WPKH, P2TR key path and P2WSH multisig. Other scripts report `inconclusive`, which is the BIP's own state for a verifier without a script interpreter.
  - **Recorders** (`p2sh.ts`, `tapscript.ts`) and other narrow models throw a scope error for anything outside their reviewed set.
- **Tests:** vitest covers models, content contracts and prose-number tests (about 760), plus the kit's Python suite, all green. `pnpm check` and `pnpm build` are clean. Each model has a deliberate-breakage table in the review record.
- **Visual checks:**
  - Desktop 1440 and mobile 375 screenshots of every phase-three chapter and its key figure states are in `review/screenshots/phase3/`, with no horizontal overflow.
  - axe-core (WCAG 2.1 A/AA + best practice) is clean at 1440, 375, no-JS, the worked tab and interactive states.
  - Client JS is about 49 KB gzipped across all island bundles, under the 60 KB budget.
- **Live:** https://bip-atlas.pages.dev serves `main`, which is phases one and two. `_headers` sends `X-Robots-Tag: noindex` until a chapter is signed off.

## Next steps

1. **Open (or update) the phase-three PR** from `main-q0i8zv` to `main`, check CI, and merge only when the user asks.
2. **Human review of phase three.** The user should read `review/phase-three.md` and the ten chapters on the preview URL or with `pnpm dev`.
3. **Open items, in rough priority:**
   - **Screen readers:** an accessibility-tree + keyboard + axe audit of all 18 heroes is done (`review/accessibility-and-tablet.md`, fixes applied; message-signing findings recorded, not applied). A live VoiceOver/NVDA session is still open, as are the items in that record's "Not done" list.
   - **Tablet screenshots:** done at 768 and 1024 (`review/screenshots/tablet/`, `tools/a11y-tablet-audit.mjs`); squeezed two-column labs now stack below 80rem.
   - **BIP 322:** a script interpreter would turn the `inconclusive` cases (P2PKH, P2SH, time-lock scripts) into checked ones. That needs the same reviewed-opcode discipline as `tapscript.ts`.
   - **BIP 324:** if an audited ElligatorSwift implementation appears (e.g. in `@noble/curves`), add decoding and check `ellswift_decode_test_vectors.csv`.
   - **Milestone 3** of the spec (generation from the ledger), only after sign-off.

## Things a cloud session should know

- **Setup:** `pnpm install` (pnpm 9 via corepack, Node ≥ 20), plus Python 3 for `pnpm test`.
- **`pnpm check` coverage:** it typechecks the packages, not `apps/site/src/lib/derive.ts`. The build catches errors there, so run `pnpm build` too.
- **Visual checks:**
  - Serve the build first, then run `tools/screenshots.mjs`. Use `PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.mjs`; Chromium is preinstalled, so do not run `playwright install`.
  - `{"label": …}` actions match accessible names by substring. Pick unique text, because a `<section aria-label>` can match too.
- **CSV sources:** some pinned CSVs have CRLF line endings. Split on `/\r?\n/`, or the last column's name keeps a `\r` and its checks are silently skipped. This happened once with BIP 324.
- **Out of scope unless the user asks:** don't remove `noindex`, mark chapters `approved`, edit the kit originals, or add input fields for real keys, phrases, addresses, PSBTs or messages to sign.

## User actions pending

- If deploys are still skipped, add a Cloudflare API token with **Account → Cloudflare Pages → Edit** as the repo secret `CLOUDFLARE_API_TOKEN`. `CLOUDFLARE_ACCOUNT_ID` is already set.
- Sign off chapters when ready: set `reviewState: "approved"` and drop `noindex`.
