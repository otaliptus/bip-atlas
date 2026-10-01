# Handoff — where things stand and what to do next

Last updated: 1 October 2026, end of the local session that built phase one. If you were asked to **"continue"**, work through **Next steps** in order. Read `CLAUDE.md` for commands, layout and the rules the tests enforce.

## State

- **Phase one is done:** five draft chapters (mnemonics, hd-wallets, segwit, addresses, psbt) covering BIPs 32, 39, 141, 143, 173, 174 and 350. Each has had one independent technical review, applied and recorded in `review/` (`addresses-milestone-1-2.md`, `phase-one.md`). Every chapter's `reviewState` is `in-review`: no human sign-off yet.
- **Tests:** 308 vitest tests plus 36 kit Python tests, all green. `pnpm check` and `pnpm build` are clean.
- **Live:** https://bip-atlas.pages.dev (Cloudflare Pages project `bip-atlas`, account `eace7104…`). The first deploy was made from the local machine with wrangler. `_headers` sends `X-Robots-Tag: noindex` until a chapter is signed off.
- **CI:** `.github/workflows/deploy.yml` runs check, test and build on every push and PR. It deploys only when the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets exist: `main` goes to production, other branches to preview URLs. If deploys are skipped, ask the user to add the token (see below); do not try to create one.

## Next steps

1. **Check CI** on the latest push (`gh run list --limit 3`). If the deploy step was skipped because the token is missing, tell the user and carry on; the build and tests still matter.
2. **Phase two, in catalog build order: `schnorr` (BIP 340), then `taproot` (341), then `tapscript` (342).** Follow `BIP_ATLAS_SPEC.md` §5.6–5.8 and the briefs in `catalog.json`: hero recipe IDs, allowed controls (copied exactly into `packages/figures/src/registry.ts`), and the misconception checklists. Pinned inputs already exist:
   - `sources/research-2026-10-01/raw/bip-0340/test-vectors.csv` (use with `@noble/curves` `schnorr`; the BIP's `reference.py` is demonstration-only, so do not port it as the implementation),
   - `sources/research-2026-10-01/raw/bip-0341/wallet-test-vectors.json` (leaf hashes, tweaks, output keys, control blocks),
   - BIP 342 has no vectors in the snapshot. Build a recorded trace player for reviewed scenarios only, with no arbitrary scripts, per §5.8. If a trace cannot be verified from pinned material, say so rather than inventing one.
3. **For each new chapter, repeat the phase-one recipe:**
   1. Model in `packages/models/src/<topic>.ts`, tests in `packages/models/test/` built from the pinned vectors, including a check that the tests fail when you deliberately break the model.
   2. Fixtures in `fixtures/<id>.json`, tied to pinned lines or vector files.
   3. A build-time derive function in `apps/site/src/lib/derive.ts` that throws on any mismatch with a published value.
   4. Figures in `packages/figures/src/<topic>/` (1 interactive hero plus 1–2 static), registered and dispatched in `apps/site/src/components/Figure.astro`. Client components import model subpaths, not the index.
   5. Evidence ledger, then prose in `content/chapters/<id>.json` (1,100–1,800 words; numbers in prose get a test).
   6. Desktop and mobile screenshots, a no-overflow check, and keyboard use of the hero.
   7. An independent review subagent (prompt pattern: see `review/phase-one.md`). Apply what holds up and record it.
4. **Open items, lower priority:** a contrast and accessibility pass (axe or similar) and a screen-reader check of each hero; tablet-width (768–1024 px) screenshots; milestone 3 of the spec (automated generation from the evidence ledger) only after phase two.

## Things a cloud session should know

- **Setup:** `pnpm install` (pnpm 9 via corepack, Node ≥ 20), plus Python 3 for `pnpm test`. No other services are needed.
- **Sources:** `vendor/` (the full `bitcoin/bips` clone) is not in git and is not needed; `sources/research-2026-10-01` holds the pinned snapshot. To refresh sources, follow `README.md` and pin a new commit deliberately.
- **Visual checks:** the local session used a Playwright MCP for screenshots. If no browser tool is available in the cloud, install Chromium with `pnpm dlx playwright install chromium` and script screenshots, or state plainly which visual checks were not done. Never claim them.
- **Publishing:** pushing to `main` deploys to production once the token secret exists. Prefer a branch plus PR (preview URL) for new chapters, and keep `noindex` until the user signs off.
- **Out of scope unless the user asks:** don't remove `noindex`, mark chapters `approved`, edit the kit originals, or add input fields for real keys, phrases, addresses or PSBTs.

## User actions pending

- Create a Cloudflare API token with **Account → Cloudflare Pages → Edit** and store it as a repo secret:
  `gh secret set CLOUDFLARE_API_TOKEN --repo otaliptus/bip-atlas`
  (`CLOUDFLARE_ACCOUNT_ID` is already set.)
- Human sign-off of the five chapters when ready (then set `reviewState: "approved"` and drop `noindex`).
