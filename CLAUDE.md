# BIP Atlas

An illustrated, evidence-checked field guide to selected Bitcoin Improvement Proposals. Static Astro site with small Preact islands, deployed to Cloudflare Pages. The product brief is `BIP_ATLAS_SPEC.md`; the chapter briefs are `catalog.json`. **Read `HANDOFF.md` first** for the current state and the next task.

## Commands

```sh
pnpm install          # Node ≥ 20 (see .nvmrc), pnpm 9; Python 3 for the kit tests
pnpm test             # vitest (models + content contracts) and the kit's Python suite
pnpm check            # TypeScript
pnpm build            # static site → apps/site/dist (fails closed on any bad value)
pnpm dev              # http://localhost:4321
```

CI (`.github/workflows/deploy.yml`) runs check, test and build on every push and PR, then deploys to Cloudflare Pages: `main` → production, other branches → preview URLs. Deploys need the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Layout

| Path | What |
|---|---|
| `packages/models` | Tested teaching models: `bech32`, `bip39`, `bip32`, `tx` (141/143), `psbt`, `schnorr` (340, step-by-step Verify), `taproot` (341: trees, tweak, control blocks, SigMsg), `tapscript` (342: a narrow trace *recorder*, not an interpreter; it throws `TraceScopeError` for any opcode outside its reviewed set). Hashing and curves come from audited `@noble/*`; never hand-roll crypto. Test-only signing helpers live in `packages/models/test/`, never in `src/`. |
| `packages/publication` | `bip-atlas.publication.v1` schema + validator; `test/chapters.test.ts` applies every content contract to every chapter. |
| `packages/figures` | Recipe registry (`registry.ts`) and Preact figure components. Components only draw; exact values arrive precomputed. |
| `apps/site` | Astro pages, `lib/content.ts` (load + validate), `lib/derive.ts` (build-time values from models; throws if a value differs from a published vector), `components/Figure.astro` (recipe dispatcher), `styles/atlas.css`. |
| `content/chapters/<id>.json` | Hand-authored chapter: paragraphs with claim IDs, figures naming recipes + fixture IDs. |
| `content/evidence/<id>.json` | Evidence ledger: each claim has scope, support, and verbatim quotes with line numbers in the pinned sources. |
| `fixtures/<id>.json` | Public test material, each tied to a pinned BIP line (`source.quote`) or a pinned external vector file (`source.external` + `pointer`). |
| `sources/research-2026-10-01` | Pinned `bitcoin/bips` snapshot (commit `3a10b5b5…`) + `sources.lock.json` hashes. `sources/external` holds external vector files + lock, including `core-script-assets-excerpt.json` (6 cases of Bitcoin Core's `script_assets_test.json`, linked from BIP 341 L304; full-file commit and SHA-256 recorded). |
| `tools/` | Repo tooling that is not a kit original, e.g. `extract-script-assets.mjs` (rebuilds the Core excerpt from the pinned full file). |
| `review/` | Review records and candidate screenshots (not approved baselines). |
| Kit originals | `BIP_ATLAS_SPEC.md`, `catalog.json`, `design-tokens.css`, `scripts/`, `tests/`, `examples/`, `prompts/` — do not modify (see `CHECKSUMS.json`). |

## Rules that the tests enforce (keep them green)

- Every paragraph cites at least one claim; every ledger claim is cited; every quote appears verbatim (whitespace-normalized) at its cited lines.
- Chapter title, BIPs, hero recipe and its `controls` must match `catalog.json`; figure budget 1 interactive hero + 1–2 static supporting figures.
- Default reading path 1,100–1,800 words (`defaultPathWordCount`; details blocks, captions and tables excluded).
- Every exact value shown comes from a model; numbers written in prose need a test that checks them (see `bip39.test.ts`, `tx.test.ts`).
- Fixtures are copied from pinned sources, never invented or edited to make code pass.

## Editorial rules (from the spec, learned in review)

- Keep MUST / SHOULD / MAY strength exactly as the BIP states it. "Currently" in a BIP is history, not present tense.
- Attribute rationale as the author's rationale; computed facts get `scope: computed-fixture` with `support: inference`.
- Only public test vectors; no input fields for addresses, keys, phrases, PSBTs; nothing signs or broadcasts.
- Figures must not leak values a viewer in that state could not know (e.g. xpub view showing hardened data, even in `title` tooltips).
- After writing a chapter, run an independent technical review (a fresh subagent with the ledger, model and pinned text) and apply what holds up; record it in `review/`.

## Visual checks

Screenshot desktop 1440 and mobile 375 of every chapter and key figure states; `document.documentElement.scrollWidth` must equal the viewport width. Islands must render a static equivalent without JS (`data-hydrated="false"` path). Client JS budget: < 60 KB gzipped (currently ~29 KB); client components must import `@bip-atlas/models/bech32` style subpaths, not the package index, or crypto gets bundled.
