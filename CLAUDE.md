# BIP Atlas

An illustrated, evidence-checked field guide to selected Bitcoin Improvement Proposals. Static Astro site with small Preact islands, deployed to Cloudflare Pages. The product brief is `BIP_ATLAS_SPEC.md`; the chapter briefs are `catalog.json`. **Read `HANDOFF.md` first** for the current state and the next task. Phase-three chapter briefs are in `catalog-phase3.json`, expansion briefs in `catalog-expansion.json`; review records are in `review/`.

The reader's goal is a clear, engaging explainer of what each proposal changes and why. Keep it simple: favor concise prose and static drawings, with a few purposeful interactions. Do not add controls, modes or animations just to make a chapter feel engaging. Model and test coverage support the explanation; reproducing a whole BIP or all its test cases is not a chapter-completion goal. Keep deeper technical detail available in disclosures, and expand implementation scope when it improves the explanation or fixes incorrect behavior.

## Commands

```sh
pnpm install          # Node ≥ 20 (see .nvmrc), pnpm 9; Python 3 for the kit tests
pnpm test             # vitest (models + content contracts) and the kit's Python suite
pnpm check            # TypeScript
pnpm build            # static site → apps/site/dist (fails closed on any bad value)
pnpm dev              # http://localhost:4321
```

CI (`.github/workflows/deploy.yml`) runs check, test and build on pushes to `main`, pull requests and manual runs, then deploys when the secrets exist: `main` → production, other refs → preview URLs. Deploys need `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. An explicit branch preview can also use the pinned Wrangler: `pnpm exec wrangler pages deploy apps/site/dist --project-name bip-atlas --branch=<branch>` after `pnpm build`.

## Layout

| Path | What |
|---|---|
| `packages/models` | Tested teaching models. Phases one–two: `bech32`, `bip39`, `bip32`, `tx` (141/143), `psbt`, `schnorr` (340), `taproot` (341), `tapscript` (342: a narrow trace *recorder* that throws `TraceScopeError` outside its reviewed opcodes). Phase three: `p2sh` (16, also a recorder), `timelock` (65/68/112/113), `versionbits` (9/8), `walletpaths` (44/84/86), `descsum` + `descriptors` (380–386), `musig2` (327), `silentpayments` (352), `blockfilter` (157/158), `v2transport` (324; ElligatorSwift decodings taken from vectors, not implemented), `bip322` (verification only). Expansion: `psbtExtensions` (370/371/373), `compactBlock` (152), `rbf` (125), `paymentInstructions` (21/321), `addrv2` (155). Hashing, curves and ciphers come from audited `@noble/*` (SipHash from the `siphash` package); never hand-roll crypto. Test-only signing helpers live in `packages/models/test/`, never in `src/`. |
| `packages/publication` | `bip-atlas.publication.v1` schema + validator; `test/chapters.test.ts` applies every content contract to every chapter. |
| `packages/figures` | Recipe registry (`registry.ts`) and Preact figure components. Components only draw; exact values arrive precomputed. `kit/` is the illustration kit (isometric boxes, cells, labels, machines, storyboards, packets, glyphs); every recipe is `drawing: true`. Layered heroes: `StateHero.tsx` + `heroLayers.ts` (a small island that shows server-rendered layers) and `heroStates.ts` + `apps/site/src/components/HeroStates.astro` (every state pre-rendered, switched by an inline script, no island). Expansion uses chapter-specific motifs and native selects for long example lists, without another island. |
| `apps/site` | Astro pages, `lib/content.ts` (load + validate), `lib/derive.ts` (build-time values from models; throws if a value differs from a published vector), `components/Figure.astro` (recipe dispatcher), `styles/atlas.css`. |
| `content/chapters/<id>.json` | Hand-authored chapter: paragraphs with claim IDs, figures naming recipes + fixture IDs. |
| `content/evidence/<id>.json` | Evidence ledger: each claim has scope, support, and verbatim quotes with line numbers in the pinned sources. |
| `fixtures/<id>.json` | Published test material tied to pinned source lines or external vectors, plus explicitly labelled synthetic cases. Preserve provenance, source-errata notes and MuSig2 stage metadata. |
| `sources/research-2026-10-01` (+ `-phase3`, `-expansion`) | Pinned `bitcoin/bips` snapshots (commit `3a10b5b5…`) + `sources.lock.json` hashes. The expansion snapshot contains 14 BIPs and 52 files. `sources/external` holds external vector files + lock, including `core-script-assets-excerpt.json` (6 cases of Bitcoin Core's `script_assets_test.json`, linked from BIP 341 L304; full-file commit and SHA-256 recorded). |
| `tools/` | Repo tooling that is not a kit original, e.g. `extract-script-assets.mjs` and `extract-expansion-vectors.mjs` (case-bounded, stage-preserving extraction with hex/Base64 checks and source-errata metadata). |
| `review/` | Review records and candidate screenshots (not approved baselines). |
| Kit originals | `BIP_ATLAS_SPEC.md`, `catalog.json`, `design-tokens.css`, `scripts/`, `tests/`, `examples/`, `prompts/` — do not modify (see `CHECKSUMS.json`). |

## Rules that the tests enforce (keep them green)

- Every paragraph cites at least one claim; every ledger claim is cited; every quote appears verbatim (whitespace-normalized) at its cited lines.
- Chapter title, BIPs, hero recipe and its `controls` must match the catalogs, except explicit editorial titles in `content/title-policy.json`; figure budget from `content/figure-policy.json` (1 interactive hero + 3 to 12 static figures, decision D1 in `review/decisions.md`; the catalog's own 1–2 is overridden).
- Default reading path follows the catalog's word range, with chapter-specific editorial overrides in `content/reading-policy.json` (`defaultPathWordCount`; details blocks, captions and tables excluded). Do not pad prose to hit the original minimum.
- `chapterOrder` in that same reading policy sets the contents and previous/next navigation. Keep figure IDs stable when changing chapter order.
- Every exact value shown comes from a model; numbers written in prose need a test that checks them (see `bip39.test.ts`, `tx.test.ts`).
- Published fixtures are copied from pinned sources and checked against their Base64 twin when available. Synthetic scenarios must be explicitly labelled and independently tested. Never edit source data to make a result pass; document normalization and duplicate upstream cases instead.

## Editorial rules (from the spec, learned in review)

- Keep MUST / SHOULD / MAY strength exactly as the BIP states it. "Currently" in a BIP is history, not present tense.
- Attribute rationale as the author's rationale; computed facts get `scope: computed-fixture` with `support: inference`.
- Only public test vectors and explicitly labelled synthetic cases; no input fields for addresses, keys, phrases, PSBTs or messages; nothing signs, broadcasts, launches applications or contacts peers.
- Figures must not leak values a viewer in that state could not know (e.g. xpub view showing hardened data, even in `title` tooltips).
- After writing a chapter, run an independent technical review (a fresh subagent with the ledger, model and pinned text) and apply what holds up; record it in `review/`.
- BIP 321 supersedes BIP 21. Callback construction is local and limited to reviewed placeholder schemes; unknown and browser schemes are refused rather than probed.

## Figures and references

- **Drawing style (decisions D2–D3, `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`)**: recipes with `drawing: true` render unframed (`.atlas-fig`), with Making Software-style SVG from `packages/figures/src/kit/`. Fixed palette meanings (`--atlas-c-*`): secret pink, public green, hash yellow, signature blue, checksum purple, network cyan, time orange, hidden hatched; always add a second cue (label, bracket, pattern). Heroes are drawing-first with compact strips or native selects and one stepper/slider; their worked example becomes static storyboard figures. Static drawings compose at ≤ 344 units wide or ship a narrow composition via `Responsive`. All 23 chapters are drawn; the expansion adds five distinct mechanism motifs and a static three-stage MuSig2 sequence.
- There are no worked-example tabs any more: a hero's worked example is a static storyboard figure. A contract test requires every interactive recipe to be `drawing: true` and the dispatcher and `Plate.astro` to have no worked slot. `Plate.astro` keeps its framed card branch only for a future non-drawing recipe.
- Citation markers carry anchors from their `walkBlocks` path (`citeAnchor`); evidence entries link back (↩ a, b, …). Any new block type that cites claims must render `ClaimRefs` with its `at` path.

## Visual checks

Screenshot desktop 1440 and mobile 375 of every chapter and key figure states; `document.documentElement.scrollWidth` must equal the viewport width. Islands must render a static equivalent without JS (`data-hydrated="false"` path). Client JS budget: < 60 KB gzipped across `apps/site/dist/_astro/*.js`; client components must import `@bip-atlas/models/bech32` style subpaths, not the package index, or crypto gets bundled. Expansion states are pre-rendered, so they add no new Preact chunk.
