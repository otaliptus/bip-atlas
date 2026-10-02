# Editorial and design decisions

Decisions that deliberately depart from the kit originals (`BIP_ATLAS_SPEC.md`, `catalog.json`, `design-tokens.css`). Each was taken with the user.

| # | Date | Decision | Overrides | Where it is enforced |
|---|---|---|---|---|
| D1 | 2026-10-02 | Up to 12 static figures per chapter (still exactly 1 interactive hero) | Spec §3 "one dominant figure and one or two supporting figures"; catalog `figureBudget.supportingMax` 2 | `content/figure-policy.json`, `packages/publication/test/chapters.test.ts` |
| D2 | 2026-10-02 | Full Making Software palette with fixed semantic meanings | Spec §4 blue-only identity; `design-tokens.css` colours | `--atlas-c-*` tokens in `apps/site/src/styles/atlas.css` |
| D3 | 2026-10-02 | Drawing-first heroes with one control; worked-example tabs become static storyboards | Phase-two "two-tab figures" pattern | `drawing: true` recipes, `Plate.astro` |
| D4 | 2026-10-02 | Shared SVG kit fed by models; no raster art, no canvas | — | `packages/figures/src/kit/` |
| D5 | 2026-10-02 | Pilot Mnemonics and Taproot, then user review, before other chapters | — | `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md` §8 |
