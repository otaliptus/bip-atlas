# Handoff — where things stand and what to do next

Last updated: 1 October 2026, end of the cloud session that built phase two. If you were asked to **"continue"**, work through **Next steps** in order. Read `CLAUDE.md` for commands, layout and the rules the tests enforce.

## State

- **Phases one and two are drafted:** eight chapters covering all ten primary BIPs (39, 32, 141, 143, 173, 350, 174, 340, 341, 342). Each chapter has had one independent technical review, applied and recorded in `review/` (`addresses-milestone-1-2.md`, `phase-one.md`, `phase-two.md`). Every chapter's `reviewState` is `in-review`: no human sign-off yet.
- **Phase two (this session, branch `main-q0i8zv`):** `schnorr` (BIP 340), `taproot` (BIP 341), `tapscript` (BIP 342). See `review/phase-two.md` for what is tested, the deliberate-breakage table, the review findings and what was not verified.
- **Tapscript sources:** BIP 342 has no executable vectors in the snapshot, so its traces come from six cases of Bitcoin Core's `script_assets_test.json` (linked from BIP 341 L304), pinned by commit and hash as an excerpt in `sources/external/`. The recorder in `packages/models/src/tapscript.ts` is deliberately narrow and throws for unsupported opcodes; the build fails unless each recorded verdict matches Core's label.
- **Tests:** vitest (models + content contracts) plus 36 kit Python tests, all green; one optional sweep test runs only with `SCRIPT_ASSETS_FULL=<path to the full pinned script_assets_test.json>`. `pnpm check` and `pnpm build` are clean.
- **Live:** https://bip-atlas.pages.dev (Cloudflare Pages project `bip-atlas`). `_headers` sends `X-Robots-Tag: noindex` until a chapter is signed off.
- **CI:** `.github/workflows/deploy.yml` runs check, test and build on every push and PR. The deploy step is still skipped: the `CLOUDFLARE_API_TOKEN` repo secret has not been added (see below). `main` goes to production, other branches to preview URLs once it exists.

## Next steps

1. **Check CI** on the latest push. If the deploy step was skipped because the token is missing, tell the user and carry on.
2. **Human review of phase two.** The user should read `review/phase-two.md` and the three chapters (preview or local `pnpm dev`). Merge `main-q0i8zv` into `main` only when the user asks.
3. **Open items, in rough priority:**
   - Accessibility: an axe-core run (WCAG 2.1 A/AA + best practice) is clean on the three phase-two chapters at 1440 and 375 px after fixes. On phase one it reports only `heading-order` (panel titles are `h4` under `h2` sections) in hd-wallets, segwit, addresses and psbt: change those panel titles to `h3`, as done in phase two. Still not done: a screen-reader session for each hero.
   - Tablet-width (768–1024 px) screenshots; `tools/screenshots.mjs` takes a JSON list of states (`PLAYWRIGHT_MODULE` can point at a global Playwright install).
   - Tapscript: the BIP 342 signature-message extension has no vector of its own; if a pinned source with script-path sighash vectors appears, add it. Widening the recorder (OP_CODESEPARATOR, annex, CLTV/CSV) needs new reviewed cases and tests first.
   - Milestone 3 of the spec (automated generation from the evidence ledger), only after the user signs off the hand-authored chapters.
   - Font items from earlier sessions: Departure Mono vs Silkscreen; body-font subsetting.

## Things a cloud session should know

- **Setup:** `pnpm install` (pnpm 9 via corepack, Node ≥ 20), plus Python 3 for `pnpm test`. No other services are needed.
- **Sources:** `vendor/` (the full `bitcoin/bips` clone) is not in git and is not needed; `sources/research-2026-10-01` holds the pinned snapshot. To refresh sources, follow `README.md` and pin a new commit deliberately.
- **Visual checks:** `tools/screenshots.mjs` (Playwright) screenshots chapter states and reports overflow, page errors and third-party requests; serve the build with `pnpm preview` first. Cloud containers have Chromium preinstalled (`/opt/pw-browsers`; do not run `playwright install`). If no browser is available, state plainly which visual checks were not done. Never claim them.
- **Publishing:** pushing to `main` deploys to production once the token secret exists. Prefer a branch plus PR (preview URL) for new chapters, and keep `noindex` until the user signs off.
- **Out of scope unless the user asks:** don't remove `noindex`, mark chapters `approved`, edit the kit originals, or add input fields for real keys, phrases, addresses or PSBTs.

## User actions pending

- Create a Cloudflare API token with **Account → Cloudflare Pages → Edit** and store it as a repo secret:
  `gh secret set CLOUDFLARE_API_TOKEN --repo otaliptus/bip-atlas`
  (`CLOUDFLARE_ACCOUNT_ID` is already set.)
- Human sign-off of the five chapters when ready (then set `reviewState: "approved"` and drop `noindex`).
