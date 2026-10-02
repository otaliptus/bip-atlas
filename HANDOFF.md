# Handoff: where things stand and what to do next

Last updated: 2 October 2026, at the end of the local session that built the BIP 322 interpreter and the illustration pilot. If you were asked to **"continue"**, work through **Next steps** in order. Read `CLAUDE.md` for commands, layout and the rules the tests enforce.

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

  - Each chapter has had one independent technical review. The fixes were applied and recorded in `review/` (`phase-three.md` covers the new ten). Every `reviewState` is `in-review`: no human has signed off any chapter yet.
- **Phase-three sources:**
  - Snapshot: `sources/research-2026-10-01-phase3`, the same `bitcoin/bips` commit, including each BIP's auxiliary vector files.
  - External pinned files: `sources/external/` holds Bitcoin Core v29.0 locktime cases (an excerpt; `tools/extract-locktime-cases.mjs` rebuilds it).
  - Fixtures cite their source line; the build re-checks each quote.
- **Scope limits worth knowing:**
  - **ElligatorSwift** (BIP 324) is not implemented, because no audited JS library has it and the crypto rule forbids hand-rolling. The v2 model takes decoded X coordinates from the vectors and says so everywhere.
  - **SipHash-2-4** (BIP 158) comes from the `siphash` npm package (Frank Denis). It is not `@noble`, but it is not hand-rolled either; it passes the SipHash paper vector, and SipHash is not security-critical here.
  - **BIP 322 verification** runs every simple and full signature through a reviewed-opcode interpreter (`packages/models/src/interpreter.ts`, PR #3): all published simple and full vectors verify. Scripts outside the reviewed opcode set and proof-of-funds PSBTs report `inconclusive`.
  - **Recorders** (`p2sh.ts`, `tapscript.ts`) and other narrow models throw a scope error for anything outside their reviewed set.
- **Tests:** vitest covers models, content contracts and prose-number tests (about 760), plus the kit's Python suite, all green. `pnpm check` and `pnpm build` are clean. Each model has a deliberate-breakage table in the review record.
- **Visual checks:**
  - Desktop 1440 and mobile 375 screenshots of every phase-three chapter and its key figure states are in `review/screenshots/phase3/`, with no horizontal overflow.
  - axe-core (WCAG 2.1 A/AA + best practice) is clean at 1440, 375, no-JS, the worked tab and interactive states.
  - Client JS is about 49 KB gzipped across all island bundles, under the 60 KB budget.
- **Illustration redesign (in progress, branch `illustration-redesign`):** the user asked for figures much closer to makingsoftware.com. Spec: `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`. Plans: `docs/superpowers/plans/2026-10-02-illustration-*.md`. Decisions D1–D5: `review/decisions.md`.
  - The shared drawing kit is `packages/figures/src/kit/`. Its placement CSS and palette tokens are in `atlas.css`, and the budget policy is `content/figure-policy.json`.
  - The **pilot** redrew Mnemonics (9 figures) and Taproot (7 figures). Records: `review/illustration-pilot-*.md`. Screenshots: `review/screenshots/pilot/`.
  - The other 16 chapters still use the card-style figures.
- **Live:** https://bip-atlas.pages.dev serves `main`. `_headers` sends `X-Robots-Tag: noindex` until a chapter is signed off.

## Next steps

1. **The user reviews the illustration pilot** (Mnemonics and Taproot) on the preview URL of the `illustration-redesign` PR. Apply their feedback to the kit and both chapters before going further.
2. **Then roll the style out in batches of four chapters,** one PR each (spec §8). Each batch is planned like the pilot plans: figure table first, then build, then screenshots, audit and an independent review.
   - hd-wallets, wallet-paths, descriptors, addresses;
   - segwit, psbt, p2sh, timelocks;
   - schnorr, tapscript, musig2, silent-payments;
   - version-bits, block-filters, v2-transport, message-signing.

   After the last batch, raise `supportingMin` in `content/figure-policy.json` to 3 and delete `packages/figures/src/worked/` and the tab code in `Plate.astro`.
3. **BIP 322 interpreter follow-ups** (should-fix, from its review). Make these a small separate PR:
   - `OP_0` inside a tapscript is treated as out of scope;
   - the scope pre-scan runs before the commitment checks;
   - one test passes for the wrong reason;
   - several scope routes have no tests;
   - assorted nits.
4. **Open items:**
   - a live VoiceOver/NVDA session;
   - BIP 324 ElligatorSwift, still blocked: `@noble/curves` 2.4.0 has none;
   - milestone 3 (generation from the ledger), only after sign-off.

## Things a cloud session should know

- **Setup:** `pnpm install` (pnpm 9 via corepack, Node ≥ 20), plus Python 3 for `pnpm test`.
- **`pnpm check` coverage:** it typechecks the packages, not `apps/site/src/lib/derive.ts`. The build catches errors there, so run `pnpm build` too.
- **Visual checks:**
  - Serve the build first (launch config `site-preview`, port 4322), then run `tools/screenshots.mjs` and `tools/a11y-tablet-audit.mjs`. Locally, a cached Playwright with Chromium lives at `~/.npm/_npx/b234c773f454f454/node_modules/playwright/index.mjs` (set `PLAYWRIGHT_MODULE`); do not run `playwright install`.
  - Islands hydrate on `client:visible`: scroll the figure in and wait for `[data-hydrated=true]` before driving it.
  - `{"label": …}` actions match accessible names by substring. Pick unique text, because a `<section aria-label>` can match too.
- **CSV sources:** some pinned CSVs have CRLF line endings. Split on `/\r?\n/`, or the last column's name keeps a `\r` and its checks are silently skipped. This happened once with BIP 324.
- **Out of scope unless the user asks:** don't remove `noindex`, mark chapters `approved`, edit the kit originals, or add input fields for real keys, phrases, addresses, PSBTs or messages to sign.

## User actions pending

- If deploys are still skipped, add a Cloudflare API token with **Account → Cloudflare Pages → Edit** as the repo secret `CLOUDFLARE_API_TOKEN`. `CLOUDFLARE_ACCOUNT_ID` is already set.
- Sign off chapters when ready: set `reviewState: "approved"` and drop `noindex`.
