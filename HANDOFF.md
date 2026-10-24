# Handoff: where things stand and what to do next

Last updated: 24 October 2026, after the five-chapter expansion on `feat/atlas-experience`. Production still serves `main`; this branch is a preview, not an approved release. Read `CLAUDE.md` for the project rules and `review/expansion.md` for the review evidence. If asked to **continue**, work through **Next steps** rather than treating the branch as approved.

## State

- **Reader goal:** a clear, engaging illustrated explainer, kept simple. Favor concise prose and static drawings with purposeful interactions. Focused teaching examples are intentional; complete protocol implementations and exhaustive coverage are not the product goal.
- **Atlas experience:** the branch has five trails, searchable contents, a relationship map with an HTML ledger, a capability atlas, mobile figure-first chapters and a mobile TOC, and exact-state sharing for the address and Taproot labs. Earlier editorial history is in `review/first-read.md` and the other review records.
- **Twenty-three chapters, 158 figures:** the original eighteen plus these five, all on `feat/atlas-experience`:

  | Chapter | Primary BIPs | Teaching focus |
  |---|---|---|
  | `psbt-extensions` | 370/371/373 | PSBTv2 construction, Taproot fields, actual MuSig2 signing rounds |
  | `compact-blocks` | 152 | Short IDs, exact prefilled bytes, reconstruction and collision fallback |
  | `rbf` | 125 | Explicit and inherited signaling, fee and eviction gates, receiver policy |
  | `payment-instructions` | 21/321 | Modern payment instructions and local callback construction/refusal |
  | `addrv2` | 155 | Variable-length peer addresses, network-specific rules and negotiation |

- **Design:** the existing editorial system stays intact. Each new opening has a distinct mechanism motif. Flow, packet, comparison and gate layouts share the illustration kit. Long example lists use native selects; every lab state is pre-rendered, with a static no-JavaScript view and exact-value disclosures. MuSig2 uses a static three-stage sequence. No new Preact island or runtime dependency was added.
- **Sources:** `sources/research-2026-10-01-expansion` pins the same `bitcoin/bips` commit `3a10b5b5f0a7586df8928d580a3009744ebb2079`, with 14 BIPs and 52 files. Payment instructions has 26 published URI cases and six callbacks. PSBT has 89 published cases with hex/Base64 checks and all three stages for the first four MuSig2 spends.
- **Synthetic fixtures:** Compact Blocks uses two BIP 143 transactions and a synthetic coinbase-shaped transaction; ambiguity is injected, not claimed as a natural collision. RBF uses declared synthetic policy scenarios and eviction counts from the initial BIP 125 policy, not current-node conformance. Addr v2 uses byte patterns, not endpoints to contact.
- **Source errata:** the extractor records three BIP 371 leading-`<` normalizations verified against Base64, and two upstream duplicate cases. BIP 373's duplicated output-participant bytes are not independent participant-key coverage. `tools/extract-expansion-vectors.mjs` replays deterministically and preserves case boundaries and signing stages.
- **Independent review:** both technical reviewers checked the chapters, ledgers, models and sources, and their findings were applied. Follow-up checks resolved the collision fallback/request inconsistency and confirmed the fixture and callback fixes. These reviews do not constitute human approval. All 23 chapters remain `draft-unreviewed`, and `_headers` still sends `X-Robots-Tag: noindex`.

## Verification

- `pnpm check` passes.
- `pnpm test` passes: **1,385 Vitest tests and one optional pre-existing skip**, plus **36 Python tests**.
- `pnpm build` produces **68 static pages**. The existing third-party Rollup annotation warning remains.
- Client JavaScript is **47.28 KiB gzipped** across the five emitted files, below the 60 KB budget. The new labs add no Preact chunk.
- `review/expansion.md` records the complete browser matrix, source/link checks and accessibility results. Selected screenshots are in `review/screenshots/expansion/`; the cover is `docs/images/cover.png`.
- A live VoiceOver/NVDA session has **not** been performed. Automated axe and keyboard checks are not a substitute for one.

## Scope limits worth knowing

- **ElligatorSwift** (BIP 324) is not implemented because no audited JS library in the project provides it. The v2 model uses decoded public X coordinates from published vectors. SipHash-2-4 comes from the existing `siphash` package; hashing, curves and ciphers otherwise use `@noble/*`.
- **BIP 322** verification is deliberately partial: reviewed scripts and spend shapes only. Unsupported committed scripts/spend shapes and proof-of-funds PSBTs can be `inconclusive`.
- **PSBT extensions** validate map structure, field inclusion/exclusion, selected encodings and locktimes, not every signature or every future extension. They do not sign, finalize, broadcast or declare a transaction safe to sign. Proprietary and unknown records are not semantic approval.
- **Compact Blocks** is a synthetic reconstruction model, not block-header/transaction validation or a live relay implementation. Injected ambiguity does not produce a missing-transaction request; full-block fallback is explicit.
- **RBF** separates ancestry from the transactions actually replaced. Passing the teaching gates does not guarantee relay, replacement or confirmation.
- **Payment instructions** uses only public, deliberately bogus examples. Only the three local placeholder application schemes in published callbacks are supported; unknown and browser schemes are refused rather than probed. Nothing decodes Lightning invoices, launches an app, sends a payment or makes an external callback.
- **Addr v2** checks packet structure and selected reserved ranges, not address-book trust, endpoint ownership or reachability. It never contacts peers.

## Next steps

1. **Human review of all 23 chapters** on the branch preview. Do not merge or call the work approved merely because tests and independent review passed.
2. **Optional:** consolidate the older `StateHero.tsx`/`heroLayers.ts` heroes onto the pre-rendered `HeroStates.astro` pattern, preserving every state, accessible name and no-JS view. The expansion already uses that pattern.
3. **Run a live screen-reader session** and retake the relevant captures after any future changes.
4. **Only after sign-off:** set `reviewState: "approved"` and remove `noindex`. Do not change these settings as part of a feature deployment.

## Things a cloud session should know

- **Setup:** `pnpm install` with pnpm 9 and Node ≥ 20; Python 3 for `pnpm test`.
- **Always run:** `pnpm check && pnpm test && pnpm build`. `pnpm check` does not cover `apps/site/src/lib/derive.ts`; the build catches errors there.
- **Production checks:** `pnpm preview` serves `apps/site/dist` on port 4322. Set `PLAYWRIGHT_MODULE=/home/taliwork/kimi-test/.browser-tools/playwright-system.mjs` and `AXE_PATH=/home/taliwork/kimi-test/.browser-tools/node_modules/axe-core/axe.min.js`. Do not install a new browser or runtime dependency.
- **Browser tools:** `tools/screenshots.mjs` captures named figure states; `tools/a11y-tablet-audit.mjs <outdir> [chapter ...]` covers tablet layout, keyboard focus and axe. Islands hydrate on `client:visible`; wait for `[data-hydrated=true]` before driving them. Pre-rendered heroes use inline scripts, not islands.
- **Fixtures:** `node tools/extract-expansion-vectors.mjs` rebuilds the payment and PSBT fixtures from the pinned snapshot. Some other pinned CSVs use CRLF, so split on `/\r?\n/`.
- **Boundaries:** don't remove `noindex`, mark chapters `approved`, edit kit originals, or add real keys, phrases, addresses, messages, PSBT uploads, signing, broadcast or application execution.

## Deployment

- CI (`.github/workflows/deploy.yml`) runs install, typecheck, tests and build on `main` pushes, pull requests and manual runs. With `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, `main` goes to production and other refs to previews.
- For an explicit branch preview, use the repository's pinned Wrangler after the checks above:

  ```sh
  pnpm exec wrangler pages deploy apps/site/dist --project-name bip-atlas --branch=feat/atlas-experience
  ```

- Do not force-deploy or replace `main`. Production remains https://bip-atlas.pages.dev until an approved merge. The user reviews sign-off and any production changes.
