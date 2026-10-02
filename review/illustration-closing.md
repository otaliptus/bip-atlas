# Illustration rollout: closing PR

The last step after batches 1–4 (PRs #9 and #10). Every recipe is `drawing: true`, so the worked-example tabs are retired for good.

## Changes

- Deleted `packages/figures/src/worked/` (`Worked.tsx`, `WorkedExample.tsx`, `IsoStack.tsx`), the tab markup and script in `Plate.astro`, the empty `slot="worked"` block in `Figure.astro`, and the tab, worked-example, iso-stack and chapter-accent CSS in `atlas.css` (`--atlas-accent` was read only by those rules). `Plate.astro` keeps its framed branch for a future non-drawing recipe.
- The contract test in `packages/publication/test/chapters.test.ts` now requires every interactive recipe to be `drawing: true` and forbids a worked slot in `Figure.astro` and `Plate.astro`.
- `content/figure-policy.json`: `supportingMin` 1 → 3 (decision D1). Every chapter has 6–9 static figures.
- Prose fixes deferred from earlier reviews:
  - Addresses (batch 1 review, A7): BIP 350 states the four-substitution guarantee; "within one checksum family" is our reading of its per code/verifier table and now says so. "With overwhelming odds otherwise" is now "with odds rather than certainty".
  - Message signing (interpreter review, pending nit): the model answers inconclusive for any committed script or spend shape outside what it covers, not only for scripts outside its opcode set. The `vectors` ledger statement says the same.
- `HANDOFF.md` and `CLAUDE.md` describe the finished rollout.

## Independent review of the prose

A fresh read-only subagent checked the three sentences against pinned BIP 350, BIP 173, BIP 322, the ledgers and `interpreter.ts`. It found no must-fix items.

| # | Kind | Finding | Change |
|---|---|---|---|
| 1 | should-fix | BIP 350 L236 calls only the v1+ → v0 direction "unlikely and hard to analyze"; the sentence applied it to any version change. | "BIP 350 calls the v1+-to-v0 case unlikely but hard to analyze." |
| 2 | should-fix | "substituted characters checked against their own family" read as if the characters were checked. | "always when at most four characters are substituted and the string is checked against its own family's checksum". |
| 3 | should-fix | The cited `vectors` claim still said "scripts outside that set". | Ledger statement names spend shapes and the commitment condition. |
| 4 | nit | "more narrowly" implied BIP 350 says it narrows BIP 173. | "states the firm part as substitutions". |
| 5 | nit | Some out-of-scope shapes are invalid, not inconclusive, because an earlier check fails first. | "unless an earlier check has already failed". |
| 6 | nit | For "bc", BIP 350's table shows a Bech32m string with ≤ 3 substitutions is never accepted by a Bech32 verifier. | Not added: the prose is correct without it. |
| 7 | nit | Upgradeable-rule hits also give inconclusive. | Not changed: the sentence does not say "only". |

## Checks

`pnpm check`, `pnpm test` (1,104 vitest passed, 1 skipped; 36 Python) and `pnpm build` (53 pages) exit 0. No built page references the removed classes. Client JS: 44,636 B gzip-9 across `apps/site/dist/_astro/*.js` (5 files). No screenshots were retaken: the only rendered changes are three prose sentences; the removed markup and CSS had no consumer.
