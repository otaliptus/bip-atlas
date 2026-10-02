# Clarity revision

2 October 2026. The user requested fixes to the important wording problems identified in an editorial review of all eighteen chapters. This pass uses plain-language and ASD-STE100 principles. It does not claim full compliance with the standard's vocabulary, grammar, or word-count rules.

## Changes

Nine chapters changed: Addresses, HD Wallets, Mnemonics, MuSig2, PSBT, Schnorr, Timelocks, v2 Transport, and Wallet Paths.

- Addresses now describes the checksum as verification data that adds no destination data. It explains the risk of automatic correction directly and retains the per-checksum-family qualification on error detection.
- HD Wallets separates the chain code, public derivation, and the private-key recovery risk. The all-normal-path condition and the need for both an xpub and a leaked descendant private key remain explicit.
- Wallet Paths separates accounts, receiving/change chains, account discovery, gap limits, output construction, and witness layouts. The change-output recovery qualification remains in the main text.
- Timelocks uses native list blocks for the CLTV and CSV rejection conditions. The CSV argument's disable bit remains distinct from the input's disable bit. The text explicitly retains negative/empty-argument failure, block-time boundaries, and the relative-lock MTP anchors.
- Schnorr separates verification steps from their rationale and retains the BIP's recommendation strength for signing-context separation.
- Mnemonics introduces and consistently uses the term mnemonic phrase in the revised explanations. It describes a mistyped passphrase's effect on the seed directly.
- PSBT expands UTXO where the main explanation first needs it. MuSig2 introduces nonce terminology and cites the existing nonce-reuse claim. v2 Transport replaces the unexplained phrase “first flight” with “first response.”

Claims were redistributed between split paragraphs where appropriate. Source snapshots, evidence ledgers, fixtures, models, figure recipes, original kit files, and tests were not edited. The existing reading targets still pass.

## Review and validation

The author compared the changed technical conditions with the existing evidence ledgers and pinned BIP text. This is not a fresh independent technical review. Addresses, Mnemonics, and Timelocks moved from `in-review` to `draft-unreviewed`; the other six revised chapters were already `draft-unreviewed`.

- `pnpm test`: 1,109 Vitest tests passed, one existing optional skip, and all 36 Python tests passed. This includes content contracts, source quotes, fixtures, and prose-number assertions. No assertions were weakened or rewritten.
- `pnpm check`: passed.
- `pnpm build`: all 53 pages built. The existing dependency annotation warning remains.
- Browser checks: nine revised chapters plus the contents page at 1440 and 375 pixels, and all nine revised chapters with JavaScript disabled at 375 pixels. All 29 visits passed; every revised hero hydrated and responded to a control change in both interactive sizes. No browser errors, failed resource requests, external requests, broken same-page fragments, or horizontal document overflow were recorded. All 20 linked local routes checked returned HTTP 200.
- Timelocks' new lists contain five CLTV conditions and four conditional CSV comparisons. They rendered at both widths, with no axe-core WCAG 2.1 A/AA or best-practice violations on the page. The mobile CLTV list and Wallet Paths opening were visually inspected.
- `git diff --check`: passed.

Local screenshots and machine-readable browser results are in `/home/taliwork/.cache/bip-atlas-editorial-20261002/` (`smoke.json`, `lists.json`, and `smoke/`).

## Sentence screen

Across the nine revised chapters, the main paragraph, callout, and list text changed from 9,479 to 9,192 whitespace-delimited words. A rough punctuation-based sentence screen found 70 sentences over 25 words before the edit and 28 afterward. Main-text semicolons decreased from 30 to 15.

This screen excludes headings, decks, captions, tables, and details disclosures. It does not implement the standard's special counting rules for technical identifiers, quotations, units, or proper names, and it is not a compliance score.

The checks above were completed locally before publication.
