# Handoff: where things stand and what to do next

Last updated: 2 October 2026, after the clarity revision. If you were asked to **"continue"**, work through **Next steps** in order. Read `CLAUDE.md` for commands, layout and the rules the tests enforce.

## State

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

  - Each chapter had an independent technical review before the editorial revisions. Seventeen chapters are now `draft-unreviewed`, pending a fresh review; SegWit remains `in-review`. No chapter is marked approved.
  - **Editorial revisions:** fourteen chapters have tighter prose and fewer repeated figures. Detailed rules remain in disclosures, and all evidence claims remain cited. Records and screenshots: `review/editorial-four-chapters.md`, `review/editorial-descriptors.md`, and `review/editorial-nine-chapters.md`. These author and automated checks do not replace an independent technical review.
  - **Clarity revision:** nine chapters now use more literal wording, shorter explanations, and clearer terminology. Timelocks has explicit condition lists. See `review/editorial-clarity.md` for scope and checks.
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
  - Client JS is about 44.6 KB gzipped across `apps/site/dist/_astro/*.js`, under the 60 KB budget.
  - Per-batch screenshots of the redrawn figures are in `review/screenshots/` (`pilot/`, `batch1/` … `batch4/`). They were taken on each batch branch, not retaken on the merged `main`.
- **Illustration redesign (done):** every chapter is drawn in the Making Software-style kit. Spec: `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`. Decisions D1–D5: `review/decisions.md`.
  - The kit is `packages/figures/src/kit/`; its placement CSS and palette tokens are in `atlas.css`. All 153 recipes are `drawing: true`.
  - Records: `review/illustration-pilot-*.md` (Mnemonics, Taproot) and `review/illustration-batch1.md` … `batch4.md`, each with figure tables and an independent review.
  - The worked-example tabs are gone (`packages/figures/src/worked/`, the tab code in `Plate.astro`, the `slot="worked"` block in `Figure.astro`, and their CSS). Their content lives on as static storyboard figures.
  - `content/figure-policy.json`: 1 hero plus 3–12 static figures per chapter. Editorial revisions reduced the chapter-specific counts; `content/reading-policy.json` records their shorter prose targets.
  - Two layered-hero patterns exist side by side: batch 1's `StateHero.tsx` + `heroLayers.ts` (a small Preact island that shows server-rendered layers) and batch 2's `heroStates.ts` + `HeroStates.astro` (every state pre-rendered, switched by an inline script, no island).
- **Live:** https://bip-atlas.pages.dev serves `main`. `_headers` sends `X-Robots-Tag: noindex` until a chapter is signed off.

## Next steps

1. **The user reviews the redrawn chapters** on the live site (or a branch preview) and signs off the look. No human has approved any figure beyond the two pilots.
2. **Optional: fold the two layered-hero patterns into one.** `StateHero.tsx`/`heroLayers.ts` (batch 1) and `heroStates.ts`/`HeroStates.astro` (batch 2) solve the same problem; the pre-rendered one costs no island JS. Moving batch 1's heroes onto it would remove an island chunk. Keep every hero's states, accessible names, `aria-live` status and no-JS state identical, and retake that batch's screenshots.
3. **Retake screenshots on `main`** (1440 / 768 / 375, no-JS heroes) and re-run `tools/a11y-tablet-audit.mjs`; the batch screenshots predate the merges.
4. **Open items:**
   - a live VoiceOver/NVDA session;
   - BIP 324 ElligatorSwift, still blocked: `@noble/curves` 2.4.0 has none;
   - milestone 3 (generation from the ledger), only after sign-off.

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
