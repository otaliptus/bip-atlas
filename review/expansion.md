# Atlas expansion review

24 October 2026, `feat/atlas-experience`.

## Scope

The branch adds five chapters to the atlas experience, for **23 chapters and 158 figures**:

- **PSBT extensions (BIPs 370/371/373):** PSBTv2 construction, Taproot fields and actual MuSig2 participant, public-nonce and partial-signature stages.
- **Compact Blocks (BIP 152):** short IDs, reconstruction, missing-transaction requests and collision fallback.
- **RBF (BIP 125):** explicit and inherited opt-in, independent fee gates, eviction limits and receiver caution.
- **Payment instructions (BIPs 21/321):** modern instructions, exact amounts and local callback construction or refusal. BIP 321 supersedes BIP 21; the examples do not present them as interchangeable current alternatives.
- **Addr v2 (BIP 155):** variable-length addresses, exact network encodings, reserved ranges and capability negotiation.

The design preserves the editorial system rather than replacing it with a dashboard. Distinct mechanism motifs, packet layouts, comparison plates and validation gates use the existing illustration kit. Long example lists use native selects, every state is pre-rendered, and the no-JavaScript reading path remains intact. MuSig2 shows all three partial signatures as well as the participants and nonces. There is no new Preact island or runtime dependency.

## Evidence and independent review

The expansion snapshot pins `bitcoin/bips` commit `3a10b5b5f0a7586df8928d580a3009744ebb2079`, with 14 BIPs and 52 files. Payment instructions has 26 published URI cases and six callbacks. PSBT has 89 published cases, including all three signing stages for the first four MuSig2 spends. Hex and adjacent Base64 are checked against each other.

Two fresh independent reviewers examined the chapter text, evidence ledgers, fixtures, models and primary sources. Their findings were applied, including:

- RBF ancestry is separate from the replaced transaction set, so inherited-only signaling and fee/eviction accounting are correct.
- Compact-block ambiguity is explicitly injected between non-prefilled candidates. It is not a claimed natural collision and does not emit a contradictory missing-transaction request. Prefilled size uses actual index-plus-transaction bytes.
- PSBT fallback locktime is zero when no input requires a locktime. Tree emptiness, signed numeric fields, proprietary records, map parsing and intended-field failures are tested.
- The extractor is case-bounded, checks hex/Base64 twins, preserves MuSig2 stages and gives the second vector under a shared case label its own ID.
- Callback handling refuses browser and unknown schemes rather than assuming they are safe. Required unknown callbacks block payment; optional unsupported callbacks can be skipped without being opened. Amount parsing accepts the BIP's optional digit positions.
- Published evidence does not claim a malformed-tree vector or independent coverage of the duplicated BIP 373 output-participant case. The three leading-`<` source typos are normalized only after checking their Base64 twins, with provenance retained.

The signing/payment reviewer found no remaining actionable issues within the documented teaching scope and independently replayed fixture extraction byte-for-byte. The network reviewer’s follow-up confirmed that the collision now leaves the nested match intact, emits no missing request, and marks full-block fallback rather than reconstruction. These reviews do not mark any chapter approved.

Synthetic examples are labelled throughout. The compact block and coinbase-shaped transaction are not a block to mine; RBF examples are initial-policy teaching cases with declared eviction counts; addrv2 addresses are byte patterns, not endpoints. No arbitrary wallet input, real seed material, payment execution, signing, broadcasting, application launch or peer contact was added.

## Verification

- `pnpm check`: passed.
- `pnpm test`: **1,385 Vitest tests passed and one pre-existing optional test skipped**; **36 Python tests passed**.
- `pnpm build`: **68 static pages**, including the eight new BIP aliases. The existing third-party Rollup annotation warning remains.
- Full expansion browser audit: **110 distinct scenario/stage states**, **115 chapter/viewport checks** across all 23 chapters at 1440, 1024, 768, 390 and 320 pixels, **27 internal links**, **8 BIP aliases**, **20 axe runs** at desktop/mobile with JavaScript and with the script-stripped no-JavaScript DOM. No failures, runtime errors, duplicate IDs or horizontal overflow were reported.
- The five no-JavaScript labs retain one visible static state and no visible interactive controls. Keyboard scenario selection and the stepper work; range labels match the visible stage.
- `tools/a11y-tablet-audit.mjs`: cover and five new chapters at 768 and 1024 have no overflow, clipping, spilling or sub-9px SVG labels. Keyboard focus order is reversible, and hero/page axe reports are empty with and without scripts.
- Separate map, capability, home and methodology checks at the same five widths and axe at desktop/mobile found no failures.
- Client JavaScript is **48,416 bytes (47.28 KiB) gzipped** across five emitted files, below the 60 KB budget. Expansion adds no new Preact chunk.
- `git diff --check`: only three formatting warnings in pinned upstream source bytes (`bip-0144` trailing whitespace, `bip-0352` end-of-file blank line, `bip-0373` trailing whitespace). Those bytes are preserved verbatim; every other staged file passes the check.

The [machine-readable audit](expansion-audit.json) records the expansion browser results. Representative captures below are in [the expansion screenshot directory](screenshots/expansion/):

- [PSBT opening](screenshots/expansion/psbt-extensions-1440-top.png), [record inspector with a real field error](screenshots/expansion/psbt-extensions-lab-desktop.png), and [all three MuSig2 stages](screenshots/expansion/psbt-extensions-musig-rounds-desktop.png).
- [Compact Blocks opening](screenshots/expansion/compact-blocks-1440-top.png) and [collision fallback with no missing request](screenshots/expansion/compact-blocks-lab-desktop.png).
- [RBF bandwidth failure](screenshots/expansion/rbf-lab-mobile.png), [required-parameter refusal](screenshots/expansion/payment-instructions-lab-mobile.png), and [wrong-length addrv2 refusal](screenshots/expansion/addrv2-lab-mobile.png).
- [Relationship map](screenshots/expansion/map-1440.png) and [capability atlas](screenshots/expansion/capabilities-1440.png).

A live VoiceOver/NVDA session has not been performed. Automated accessibility checks are not a substitute for it. All 23 chapters remain `draft-unreviewed`, and `noindex` remains enabled. The deployment target is the non-production `feat/atlas-experience` Cloudflare Pages preview; `main` is not replaced.
