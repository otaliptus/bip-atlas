# Phase one — review record

Date: 1 October 2026. Status: **five draft chapters, awaiting human sign-off.** Screenshots in `review/screenshots/` are candidates, not approved baselines.

| Chapter | BIPs | Hero figure | Default-path words | Independent review |
|---|---|---|---|---|
| Mnemonics | 39 | `entropy-word-pipeline.v1` | 1,184 | 8 findings, all applied |
| HD wallets | 32 | `derivation-tree.v1` | 1,191 | 12 findings, all applied |
| SegWit | 141, 143 | `transaction-anatomy.v1` | 1,205 | 11 findings, all applied |
| Addresses | 173, 350 | `address-checksum-lab.v1` | 1,366 | 3 findings (external), all applied |
| PSBT | 174 | `psbt-envelope.v1` | 1,174 | 10 findings, all applied (incl. stricter validation in the model) |

Every reviewer recomputed the numbers independently and found none wrong. Findings were about wording and scope (MUST/SHOULD/MAY, history vs current, fee claims), one figure leak of information a viewer should not have (HD tree tooltips), and gaps in the PSBT model's format validation. All fixed.

## Sources

- `bitcoin/bips` at `3a10b5b5f0a7586df8928d580a3009744ebb2079`, snapshotted with the kit's own tool (`sources/research-2026-10-01`).
- External vectors cited by BIP 39, pinned by commit and SHA-256 in `sources/external/external.lock.json`: `trezor/python-mnemonic` `vectors.json` and `bip32JP` `test_JP_BIP39.json`.

## What the tests establish (308 vitest + 36 kit Python tests)

- **BIP 39:** 24 English + 24 Japanese vectors (entropy → words → seed); wordlist hash, sort order and four-letter uniqueness; 1-in-16 / 1-in-256 last-word checksum odds counted exhaustively.
- **BIP 32:** 17 embedded chains (xprv/xpub, parse round trip), 16 invalid keys each for its stated reason, the parent-xpub + child-xprv exposure, 24 BIP 39 root keys.
- **BIPs 141/143:** both SIGHASH_ALL witness examples byte for byte (serialization, unsigned form, preimage, sighash); weight arithmetic.
- **BIPs 173/350:** all 79 vectors with rejection stage.
- **BIP 174:** 20 invalid / 10 valid PSBTs, minimal key-type encoding, value formats, 0-input unsigned transactions, round trips keeping unknown records, the published trace (combiner output identical in either order, extraction), unknown-field combine, type-registry attribution.
- **Every chapter:** schema validity, catalog agreement (title, BIPs, hero recipe, allowed controls, figure budget), word range, every claim cited, every evidence quote verbatim at its lines, every fixture tied to a pinned line or vector file, fixture kinds matching recipes.
- **Build:** fails closed if any computed value differs from a published vector (seed, xprv, preimage, combiner output, extracted transaction).

## Rendered checks inspected

Desktop 1440 and mobile 375 screenshots of each chapter's opening and every interactive state that matters (reveal/last word, private/public/hardened tree, txid/wtxid/BIP 143 lenses, PSBT Creator → Extractor). No page scrolls horizontally at 375 px. Every island renders a static equivalent without JavaScript. Built pages request nothing from third-party hosts. Client JS: about 22 KB gzipped in total.

## Not verified

- Screen-reader sessions, contrast audit, 768–1024 px screenshots.
- Human editorial sign-off for any chapter.
- Phase two (BIPs 340–342) and the automated generation pipeline.
