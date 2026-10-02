# BIP relevance revision

2 October 2026. After an audit of all 18 chapters against their 33 primary BIPs, the user requested the important relevance fixes. Seven chapters changed. The remaining eleven needed no substantive refocusing.

## Changes

- Compact Block Filters now leads with a wallet workflow: obtain and check a filter, test a watched script locally, skip or fetch the block, then inspect outputs and spends. Match and miss use existing tested probes. The false-positive branch is explicitly schematic and invents no vector, script or hash. The original Golomb–Rice explorer remains in a disclosure. The opening distinguishes BIP 157's protocol from BIP 158's construction, and the workflow explains visible block requests and the limits of a miss.
- Timelocks now labels a passing result as a script check, not a valid spend. A schematic timeline shows the separate absolute and relative inclusion boundaries, including the MTP anchors. A regression demonstrates that the published passing CLTV case still fails the block-height condition at nLockTime and passes that condition one height later.
- P2SH's main interaction and output-shape drawing use the legacy spend. The introduction emphasizes the sender/recipient division of responsibility. The later SegWit comparison remains separately identified; its detailed rules and weight discussion are in a disclosure.
- Schnorr opens with the proposal's motivation, including non-malleability, encoding, batch verification and multiparty constructions. A schematic signing handoff precedes the published verifier example. Controls describe the examples and message changes instead of showing vector IDs alone. Three new evidence claims cite the pinned BIP 340 text.
- Silent Payments now asks about a reusable address and fresh outputs. Descriptors asks about output scripts. Message Signing introduces the limitation of the legacy P2PKH format before explaining BIP 322's virtual transactions.

`content/title-policy.json` records six explicit editorial title overrides without changing the frozen kit catalog. Both chapter contracts and navigation use those titles. The editable phase-three catalog records the new wallet-flow controls. P2SH's reading target is 550–1,100 words after moving later SegWit detail off its main path; its main path is 629 words. No fixture or cryptographic model changed.

## Validation

- `pnpm check` passed.
- `pnpm test`: 1,112 Vitest tests passed, one existing optional test skipped, and all 36 Python tests passed. Source quotes, content contracts and published fixtures passed. The final filter wording and evidence adjustment also passed all 165 filter-figure and chapter-contract tests.
- `pnpm build`: all 53 pages built. The existing third-party annotation warning remains; total client JavaScript is below the 60 KB gzip budget.
- Browser checks at 1440 and 375 pixels covered all seven revised chapters, their headings and hydrated figures. They recorded no page errors or horizontal document overflow.
- Exercised the wallet's match, miss and schematic false-positive branches through completion; the optional encoding explorer still handles an empty filter. Exercised relative timelocks, the P2SH reveal/stages, and a changed-message Schnorr failure.
- No-JavaScript checks at 375 pixels covered all four changed interactive figures. Their static equivalents rendered without horizontal overflow.
- Visually inspected the new workflow, timelock timeline, P2SH reveal, Schnorr signing overview and controls, and the revised mobile openings. Screenshots are in `review/bip-relevance/screenshots/`.
- `git diff --check` passed. The existing untracked `presentation/` was not modified.

This record contains author review and automated checks, not a fresh independent technical review. Revised chapters remain `draft-unreviewed`; no approval or indexing status changed.
