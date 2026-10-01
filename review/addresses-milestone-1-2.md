# Addresses chapter — milestones 1 and 2 review record

Date: 1 October 2026. Status: **draft, awaiting human review.** Screenshots below are candidates, not approved baselines.

## Run it

```sh
pnpm install
pnpm dev        # http://localhost:4321/learn/addresses/
pnpm test       # vitest (97) + the kit's Python suite (36)
pnpm build      # static site in apps/site/dist
```

Source snapshot (already present under `sources/research-2026-10-01`) was produced with the kit's own tool from a full clone at the observed commit `3a10b5b5f0a7586df8928d580a3009744ebb2079`, which was still `bitcoin/bips` master on 1 October 2026. Vectors are regenerated with:

```sh
python scripts/extract_address_vectors.py --snapshot sources/research-2026-10-01 --out fixtures/bip173-350-vectors.json
```

## What was built

| Path | Purpose |
|---|---|
| `packages/models` | TypeScript Bech32/Bech32m decoder that reports which of six stages rejects an input |
| `packages/publication` | `bip-atlas.publication.v1` schema (new, versioned) and validator; data only, no markup |
| `packages/figures` | Recipe registry and three recipes: `address-anatomy.v1`, `address-checksum-lab.v1` (interactive), `program-regrouping.v1` |
| `apps/site` | Astro static site; one Preact island (the lab), `client:visible` |
| `content/chapters/addresses.json` | Hand-authored chapter, 1,326 words on the default path |
| `content/evidence/addresses.json` | 33 claims, each with verbatim quotes and pinned line numbers |
| `fixtures/bip173-350-vectors.json` | All 79 vectors from BIPs 173 and 350, copied with source lines |
| `fixtures/addresses.json` | 12 chapter samples, each tied to a source line |
| `scripts/extract_address_vectors.py` | Vector extractor; verifies file SHA-256 against the lock first |

The original kit files were not modified.

## Tests actually run

- `vitest`: 97 passed. Covers every BIP173/BIP350 generic and SegWit vector, including the stage that rejects each invalid vector; BIP173's v1/v2/v16 Bech32 examples now failing at the family stage; every single-character substitution in two valid samples failing at the checksum stage; agreement with `examples/address-fixtures.json`; publication validity; every evidence quote present verbatim at its cited lines; sample strings present on their cited lines; catalog title, primary BIPs, figure budget, controls and word range.
- A deliberately broken family rule made 7 tests fail (then restored).
- Kit Python suite: 36 passed. `tsc`: clean.

## Rendered checks actually inspected

- Desktop 1440×900 and mobile 375×812 full pages; lab at desktop in the default, edited-typo and wrong-family states; lab at mobile; cover page.
- Mobile: document width equals the viewport (no horizontal page scroll); the bit diagram scrolls inside its own labelled panel.
- Keyboard: real Tab order sample → address → buttons; arrow keys move and change characters, and the status line updates.
- No JavaScript: built HTML contains the static lab state, all stage results and the full sample table.
- Built CSS and JS reference no third-party hosts; fonts are self-hosted.

## Not verified / open issues

- No screen-reader session, contrast audit or automated accessibility scan has been run.
- One external technical review round has been applied (see below); the chapter has no formal sign-off yet and stays marked as a draft.
- Fonts: Departure Mono is not on npm, so Silkscreen stands in as the pixel face. Source Serif 4 (Latin) adds roughly 250 KB of fonts, regular plus italic, on first visit.
- Milestone 3 (automated generation from the evidence ledger) is not started. The `atlas` CLI does not exist yet.
- The vertical `FIG.` labels and three-column stage grid were tuned by eye at 1440 px and 375 px only; 768–1024 px was not screenshotted.

## Review round 1 (external, 1 October 2026)

All three findings were verified and accepted:

1. **Four-substitution guarantee overstated across families.** The supplied counterexample (four substitutions turning the v0 sample into a valid Bech32m v1 address with a 20-byte program) reproduces, and is now a regression test. The text now limits the guarantee to one checksum family and cites a new claim, `cross-family-limit` (labelled editorial inference, backed by BIP350 L95 and L236). The counterexample string is deliberately not shown on the page, because every address shown there must be a BIP test vector.
2. **"Most characters straddle two bytes" was wrong.** Exactly 4 of 8 do in each 40-bit block; the caption is fixed and a test pins the count.
3. **Correction rule overstated as MUST.** BIP173 says SHOULD NOT. The prose, closing paragraph and lab refusal text now use "should" and "advises".

Default-path word count after edits: 1,366.
