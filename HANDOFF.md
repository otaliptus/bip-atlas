# Handoff: where things stand and what to do next

Last updated: 8 November 2026, after a simplification pass and three of five phase-four chapters (work in the working tree, not committed). Deployment status is tracked by the latest `main` run in [GitHub Actions](https://github.com/otaliptus/bip-atlas/actions/workflows/deploy.yml). If you were asked to **"continue"**, work through **Next steps** in order, subject to the user's latest task. Read `CLAUDE.md` for commands, layout and the rules the tests enforce.

## State

- **Simplification (8 November 2026):** 29 registered figures that no chapter used were removed (components, tests, registry entries, two dead fixture kinds), along with 70 CSS classes that nothing rendered and the unused framed-plate branch. `registry.ts` is a compact table (1,565 → about 200 lines). Static figures draw through `packages/figures/src/statics.ts` and pre-rendered heroes through `heroes.ts`, so `Figure.astro` lists only its islands. `apps/site/src/lib/derive.ts` became `lib/derive/` (one module per chapter, a `DERIVE` table that throws on unknown fixture kinds), and `pnpm check` now typechecks it. Islands are imported by subpath, so each page loads only its own hero: island JS fell from 43 KB to 9–15 KB gzipped per chapter (about 58 KB summed across all files). Built pages were byte-compared against the pre-change build and are identical apart from whitespace and script URLs.
- **Phase four (in progress):** five new chapters chosen from the curriculum research; three are done (`derived-seeds` BIP 85, `sorted-multisig` BIPs 67/48, `payment-links` BIPs 321/21), and `psbt-v2` (BIP 370) and `strict-signatures` (BIPs 66/146) are designed but not started. Sources: `sources/research-2026-11-08-phase4` (kit snapshot script, same commit). Catalog: `catalog-phase4.json`. Record, findings and the remaining designs: `review/phase-four.md`. The site now has 21 chapters; the three new ones are `draft-unreviewed` and have not had an independent review (this session used no subagents, at the user's request).
- **Reader goal:** the user wants a proper, engaging illustrated explainer, kept simple. Favor concise prose and static drawings with a few purposeful interactions. Do not add controls, modes or animations for their own sake. Focused teaching examples are intentional; complete BIP implementations and exhaustive test-case coverage are not the product goal.
- **Curriculum redesign:** [the revised plan](docs/research/2026-10-bip-map/README.md) separates a [13-stop core route](docs/research/2026-10-bip-map/curriculum.md), seven optional paths and a complete BIP reference. All 18 existing lesson scopes stay intact; two conceptual primers fill the payment and node-agreement gaps. Companions and historical comparisons have separate ownership instead of expanding the core lessons. The 73 editorial units are explanations/subsections, not a promised page count. Three initial batches each add two units; everything else is unscheduled. The pinned inventory still accounts for 213 published documents plus allocated-only 40/41/63. The live site remains 18 chapters / 33 primary BIPs; this curriculum is not implemented. Validate with `python3 tools/research-bip-catalog.py --check`; source regeneration additionally takes `--upstream PATH` at commit `927b6de…`. Before authoring new content, source the primers and allow static-only heroes/budgets in the publication contracts. Existing chapter snapshots stay unchanged.
- **First-read pass:** all eighteen chapters give a specific action for the existing main demonstration. Several openings and endings are clearer; historical and algorithm details remain in disclosures. Extra example controls in Schnorr and MuSig2, and the example/calculation controls in Silent Payments, now sit in optional disclosures. Silent Payments starts with the result rather than every intermediate step. No new interactive figures, scenarios or illustrations were added. `chapterOrder` in `content/reading-policy.json` brings related chapters together; the contents and previous/next links use it. Figure IDs stay stable. See `review/first-read.md` for checks and screenshots.
- **BIP 322 address validation:** `addressScript` now uses the address chapter's shared SegWit checks. Mixed-case addresses, invalid witness versions and invalid program lengths are rejected; valid all-uppercase addresses still work. Base58Check addresses must carry a version byte and a 20-byte hash. Three regression tests reproduced the old failures before the fix.
- **Eighteen chapters are drafted.**
  - All eighteen are merged to `main` and live: phases one and two (BIPs 39, 32, 141, 143, 173, 350, 174, 340, 341, 342) and phase three (PR #2).
  - Phase three follows `catalog-phase3.json`. Chapters, with figure prefixes A9–A18:

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

  - Each chapter had an independent technical review before the editorial revisions. All eighteen are now `draft-unreviewed` after the first-read pass, pending a fresh review. No chapter is marked approved.
  - **Editorial revisions:** fourteen chapters have tighter prose and fewer repeated figures. Detailed rules remain in disclosures, and all evidence claims remain cited. Records and screenshots: `review/editorial-four-chapters.md`, `review/editorial-descriptors.md`, and `review/editorial-nine-chapters.md`. These author and automated checks do not replace an independent technical review.
  - **Clarity revision:** nine chapters now use more literal wording, shorter explanations, and clearer terminology. Timelocks has explicit condition lists. See `review/editorial-clarity.md` for scope and checks.
  - **BIP relevance revision:** seven chapters have clearer proposal framing. Compact Filters leads with the wallet workflow; Timelocks separates script checks from block eligibility; P2SH centers its original spend; Schnorr leads with motivation. Titles and the BIP 322 opening were corrected. See `review/bip-relevance.md`. Editorial titles live in `content/title-policy.json`; the kit catalog remains frozen.
- **Phase-three sources:**
  - Snapshot: `sources/research-2026-10-01-phase3`, the same `bitcoin/bips` commit, including each BIP's auxiliary vector files.
  - External pinned files: `sources/external/` holds Bitcoin Core v29.0 locktime cases (an excerpt; `tools/extract-locktime-cases.mjs` rebuilds it).
  - Fixtures cite their source line; the build re-checks each quote.
- **Scope limits worth knowing:**
  - **ElligatorSwift** (BIP 324) is not implemented, because no audited JS library has it and the crypto rule forbids hand-rolling. The v2 model takes decoded X coordinates from the vectors and says so everywhere.
  - **SipHash-2-4** (BIP 158) comes from the `siphash` npm package (Frank Denis). It is not `@noble`, but it is not hand-rolled either; it passes the SipHash paper vector, and SipHash is not security-critical here.
  - **BIP 322 verification** runs every simple and full signature through a reviewed-opcode interpreter (`packages/models/src/interpreter.ts`, PR #3): all published simple and full vectors verify. Scripts or spend shapes outside its reviewed set (once a script is known to be the committed one) and proof-of-funds PSBTs report `inconclusive`.
  - **Recorders** (`p2sh.ts`, `tapscript.ts`) and other narrow models throw a scope error for anything outside their reviewed set.
- **Tests:** vitest covers models, figures, content contracts and prose-number tests (about 1,100), plus the kit's Python suite, all green. `pnpm check` and `pnpm build` are clean. Each model has a deliberate-breakage table in the review record.
- **Visual checks:**
  - Desktop 1440 and mobile 375 screenshots of every phase-three chapter and its key figure states are in `review/screenshots/phase3/`, with no horizontal overflow.
  - axe-core (WCAG 2.1 A/AA + best practice) is clean at 1440, 375, no-JS, the worked tab and interactive states.
  - Client JS: each chapter page loads 9–15 KB gzipped of island code (0 for pre-rendered heroes); about 58 KB summed across all `apps/site/dist/_astro/*.js`.
  - Per-batch screenshots of the redrawn figures are in `review/screenshots/` (`pilot/`, `batch1/` … `batch4/`). They were taken on each batch branch, not retaken on the merged `main`.
- **Illustration redesign (done):** every chapter is drawn in the Making Software-style kit. Spec: `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`. Decisions D1–D5: `review/decisions.md`.
  - The kit is `packages/figures/src/kit/`; its placement CSS and palette tokens are in `atlas.css`. All 153 recipes are `drawing: true`.
  - Records: `review/illustration-pilot-*.md` (Mnemonics, Taproot) and `review/illustration-batch1.md` … `batch4.md`, each with figure tables and an independent review.
  - The worked-example tabs are gone (`packages/figures/src/worked/`, the tab code in `Plate.astro`, the `slot="worked"` block in `Figure.astro`, and their CSS). Their content lives on as static storyboard figures.
  - `content/figure-policy.json`: 1 hero plus 3–12 static figures per chapter. Editorial revisions reduced the chapter-specific counts; `content/reading-policy.json` records their shorter prose targets.
  - Two layered-hero patterns exist side by side: batch 1's `StateHero.tsx` + `heroLayers.ts` (a small Preact island that shows server-rendered layers) and batch 2's `heroStates.ts` + `HeroStates.astro` (every state pre-rendered, switched by an inline script, no island).
- **Live:** https://bip-atlas.pages.dev serves `main`. `_headers` sends `X-Robots-Tag: noindex` until a chapter is signed off.

## Next steps

1. **Finish phase four:** build `psbt-v2` and `strict-signatures` from the designs in `review/phase-four.md` (model, fixtures, derive, figures A22/A23, ledger, prose, catalog entry, reading order, coverage, figure tests, screenshots at 1440 and 375).
2. **Independent technical review** of the five phase-four chapters (a fresh subagent with each ledger, model and pinned text), then record it in `review/phase-four.md`.
3. **Commit** the work on a branch when the user asks (nothing from 8 November is committed). The user's untracked `docs/research/` and `tools/research-bip-catalog.py` are separate work; leave them as they are.
4. **The user reviews the redrawn chapters** on the live site (or a branch preview) and signs off the look. No human has approved any figure beyond the two pilots.
5. **Optional: fold the two hero patterns into one.** Three heroes still use the `StateHero` island with `data-when` layers; the other seven (four older chapters and the three new ones) are pre-rendered by `HeroStates`. Pre-rendering every state is too large for the wallet-paths hero (about 63 states), so a merge means teaching the `HeroStates` script the layered (`data-when`) model, keeping every hero's states, accessible names, `aria-live` status and no-JS state identical.
6. **Open items:** a live VoiceOver/NVDA session; BIP 324 ElligatorSwift, still blocked (no audited JS implementation); milestone 3 (generation from the ledger), only after sign-off.

## Things a cloud session should know

- **Setup:** `pnpm install` (pnpm 9 via corepack, Node ≥ 20), plus Python 3 for `pnpm test`.
- **`pnpm check` coverage:** it typechecks the packages, not `apps/site/src/lib/derive.ts`. The build catches errors there, so run `pnpm build` too.
- **Visual checks:**
  - Serve the build first (launch config `site-preview`, port 4322), then run `tools/screenshots.mjs` and `tools/a11y-tablet-audit.mjs`. Locally, a cached Playwright with Chromium lives at `~/.npm/_npx/b234c773f454f454/node_modules/playwright/index.mjs` (set `PLAYWRIGHT_MODULE`); do not run `playwright install`.
  - Islands hydrate on `client:visible`: scroll the figure in and wait for `[data-hydrated=true]` before driving it. Pre-rendered heroes (`HeroStates.astro`) set `data-hydrated="true"` from their inline script.
  - `{"label": …}` actions match accessible names by substring. Pick unique text, because a `<section aria-label>` can match too.
- **CSV sources:** some pinned CSVs have CRLF line endings. Split on `/\r?\n/`, or the last column's name keeps a `\r` and its checks are silently skipped. This happened once with BIP 324.
- **Out of scope unless the user asks:** don't remove `noindex`, mark chapters `approved`, edit the kit originals, or add input fields for real keys, phrases, addresses, PSBTs or messages to sign.

## User actions pending

- If deploys are still skipped, add a Cloudflare API token with **Account → Cloudflare Pages → Edit** as the repo secret `CLOUDFLARE_API_TOKEN`. `CLOUDFLARE_ACCOUNT_ID` is already set.
- Sign off chapters when ready: set `reviewState: "approved"` and drop `noindex`.
