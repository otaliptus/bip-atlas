# Phase four: five new chapters

Started 8 November 2026 at the user's request ("find good 5 more topics… and add them properly"). Topics follow the curriculum research in `docs/research/2026-10-bip-map` (entropy derivation, multisig wallet setup, payment instructions, PSBT extensions, ECDSA encoding rules), chosen because each has public test material at the pinned commit.

- **Sources:** `sources/research-2026-11-08-phase4`, made by the kit's own `scripts/snapshot_sources.py` from `bitcoin/bips` at the same commit as every other chapter (`3a10b5b5…`). 15 BIPs: primaries 85, 67, 48, 321, 21, 370, 66, 146, and supporting 16, 32, 39, 62, 141, 143, 174.
- **Catalog:** `catalog-phase4.json` (a separate extension catalog, like phase three), with all five briefs.
- **Figure prefixes:** A19 derived seeds, A20 sorted multisig, A21 payment links, A22 PSBT version 2, A23 strict signatures.

## Done

| Chapter | BIPs | Model and tests | Figures |
|---|---|---|---|
| `derived-seeds` | 85 | `bip85.ts`: every published vector (cases 1–2, DRNG, BIP 39 12/18/24, WIF, XPRV, HEX, Base64 password, dice) | A19.1 hero (7 applications + leak toggle), A19.2 path, A19.3 storyboard, A19.4 bytes each application reads |
| `sorted-multisig` | 67, 48 | `bip67.ts`, `bip48.ts`: all four BIP 67 vectors; all 15 BIP 48 example paths | A20.1 hero (6 orders × as received / sorted), A20.2 byte order, A20.3 script storyboard, A20.4 BIP 48 paths |
| `payment-links` | 321, 21 | `bip321.ts`: all 21 example URIs read as labelled, with reasons; all proof-of-payment examples | A21.1 hero (8 links × 3 illustrative wallets), A21.2 anatomy, A21.3 upper/lowercase, A21.4 proof of payment |

Each has a hand-built ledger (22–27 claims; quotes verified at their lines), fixtures copied from the pinned text with line numbers, a derive step that fails the build if any value differs from the vector, figure tests, prose-number tests, and a `model-coverage.json` entry. All heroes are pre-rendered (`HeroStates`), so the new chapters add no island JavaScript.

**Checks run:** `pnpm check`, `pnpm test` (1,180 passing), `pnpm build`; screenshots at 1440 and 375 of every new figure, reviewed by eye and fixed (label collisions, a clipped header, a mid-word wrap, an unreadable byte packet); `document.documentElement.scrollWidth` equals 375 on all 21 chapters.

**Findings worth keeping:**
- BIP 85's XPRV vector prints the *second* 32 bytes (the key half) as "DERIVED ENTROPY"; BIP 85 puts the chain code first.
- BIP 48's examples table has 15 rows, not 14.
- BIP 321's own example addresses are deliberately invalid, so the model reads addresses by form only. The three wallets in A21.1 are our illustration and are labelled as such (`wallets-illustrative` claim).
- The purpose number 83696968 spelling SEED in ASCII is our reading, labelled as editorial analysis and tested.

The first session ran no independent review (the user asked for no subagents then); it ran on 8 November 2026 with the last two chapters, below.

## Done in the second session (8 November 2026)

| Chapter | BIPs | Model and tests | Figures |
|---|---|---|---|
| `psbt-v2` | 370 | `psbtv2.ts` (reuses `psbt.ts`'s exported `Reader`, `readMap`, `checkRecord`): all 24 invalid vectors rejected for the field their case names, all 14 valid ones read, all 10 lock-time vectors (including the one at L500 with no case line); hex and Base64 agree; unique ID; Signer and Constructor flag rules | A22.1 maps and the 113-byte unsigned transaction they describe (opening), A22.2 invalid-vector table, A22.3 `TX_MODIFIABLE` bits and the flags after one signature, A22.4 hero (10 lock-time vectors) |
| `strict-signatures` | 66, 146 | `der.ts`: BIP 66's fourteen checks in order (each tied to its line), LOW_S, n − S re-encoded, the signature put back into its transaction; both signatures of BIP 143's native P2WPKH example verify (input 1 against the published digest, input 0 against the computed legacy one) | A23.1 hero (published, R pad removed, zero added to S, length byte off by one, S replaced by its twin), A23.2 DER anatomy, A23.3 S / n − S number line, A23.4 txid and wtxid after a flip |

Fixtures are copied from the pinned text by line (the BIP 370 vectors as one-line hex, BIP 143's transaction, signatures, key, scriptCode and digest); the derive steps fail the build if a hex string is not on its line, if an invalid vector is rejected for another field, if a lock time differs from its heading, or if a computed change does not behave as the prose says. Ledgers: 34 claims (psbt-v2) and 30 (strict-signatures), every quote verified at its lines. Both heroes are pre-rendered (`HeroStates`), so no island JavaScript was added (about 58 KB gzipped across all files, unchanged).

**Findings worth keeping:**
- BIP 370 prints the lock-time vector on line 500 without a `* Case:` line; its bytes show only input 2 requiring a time lock (1657048460). The vector at L409 says "Bytes in HEx".
- The first invalid vector (L307, "PSBTv0 but with PSBT_GLOBAL_VERSION set to 2") carries no BIP 370 field: read as version 2, it fails because it still holds `PSBT_GLOBAL_UNSIGNED_TX`. Figures group the invalid vectors by how the model reads them (12 version 0, 12 version 2).
- BIP 370's v2 vectors share their input with the v0 vectors, but not their change output, so the chapter does not call them "the same transaction".
- Input 0's signature in BIP 143's example has a padded R (`0x8b…`); its twin n − S also needs a pad and is 73 bytes, BIP 66's maximum.
- BIP 146 is Closed with "Details TBD" deployment and records LOW_S and NULLFAIL as relay policy; the chapter calls LOW_S a proposed rule and says BIP 146 did not make either a consensus rule.

**Also fixed:** the homepage had no thumbnails for the three earlier phase-four chapters (the `<img>` 404'd): `scripts/capture_thumbnails.mjs` picked a hidden state's drawing in pre-rendered heroes. It now skips `[data-state][hidden]`; thumbnails for all five phase-four chapters are added, the other eighteen left unchanged.

**Checks:** `pnpm check`, `pnpm test` (1,299 vitest passing plus the kit's 36 Python tests), `pnpm build`; screenshots at 1440 and 375 of every new figure and state in `review/screenshots/phase4/`, reviewed by eye and fixed (an unreadable byte packet in A22.1 became a part list, A22.2's grid overflowed and became a table, label collisions in A22.3, a result line clipped at 375 in A22.4, small type in A23.1); `scrollWidth` equals the viewport at 1440 and 375 on all five chapters; axe-core and the keyboard audit (`tools/a11y-tablet-audit.mjs`, 768 and 1024) found no violations on the five heroes.

## Independent technical review (8 November 2026)

Five fresh subagents, one per chapter, each with CLAUDE.md, the chapter, its ledger, model, tests, fixtures, derive step, figures and the pinned BIP text; report-only. None found a model bug against the BIPs. What held up was applied; what was not is listed.

**`psbt-v2`** (1 error, 2 misleading, 12 nits)
- Applied: the A22.2 caption and grouping wrongly counted L307 as a version 0 PSBT with a version 2 field (now "twelve … the first vector is relabelled"); `required-fields` now quotes every row it summarises (OUTPUT_COUNT, OUTPUT_INDEX, OUT_SCRIPT and the five optional fields); new claims `id-changes` (the unique ID changes when inputs or outputs are added) and `conflict` (only-height versus only-time); "should be able to read version 2"; "flags set as appropriate"; MUSTs restored ("must be chosen", "must be set to 0"); "adding or removing"; "one signature", not "one more"; inputs numbered from 1 in A22.1 as in BIP 370's case lines; singular step text for one requiring input; L432 quoted for undefined bits; `signerUpdate` accepts Taproot's `SIGHASH_DEFAULT` (clears both flags); a Creator that is its own Constructor may omit the field (L239).

**`strict-signatures`** (1 error, 3 misleading, 7 nits)
- Applied: the NULLFAIL paragraph said a failing signature "used to" push FALSE, implying a consensus change BIP 146 never made; LOW_S is now "proposed" everywhere (caption, hero lamp, verdict, status), and a new `not-consensus` claim says BIP 146 did not make LOW_S or NULLFAIL consensus rules; "same numbers" corrected for the removed R pad (same digits, read as negative in DER); BIP 66's empty-signature exemption stated; the hero shows LOW_S before ECDSA (BIP 146 L56); "except the sighash byte"; "whose releases had until then accepted"; "for the script types in actual use"; `soft-fork`, `malleability`, `two-sources` re-scoped to author-rationale; `deployment146` quotes L100; "VALID SIGNATURE" for "THE MATHS HOLDS"; a test now verifies both inputs after flipping input 0.

**`derived-seeds`** (1 error, 7 misleading, nits)
- Applied: the dice paragraph said the DRNG is read bit by bit; BIP 85 L410–415 reads whole bytes per roll and keeps the top bits (the dice vector skips 4 of 14 trials, now tested); the HMAC paragraph now gives the authors' three reasons (ledger quote extended), "the authors cannot enforce it on implementations", and that the application sees only the HMAC output; the hero's leak notes say the root stays unknown because it would need k, and k would not give it (hardened); the leak layer now hatches the root key and k text and the unread bytes; captions and the hero source no longer say every value is published (k and unprinted bytes are computed); the password reads bytes 1–16 (21 characters carry 126 bits; tested by Base64-encoding those 16 bytes alone); A19.4's drawing title matches its caption; the WIF is "intended as the hdseed of Bitcoin Core wallets"; "may be inherently less secure"; "the Base64 password application"; "parameters and an index"; "apart from their paths"; the opening says the software holding the root derives the entropy; one backup is enough "as long as the user also knows which application, index and length"; the 12-word storyboard caption says the 48 dropped bytes are not published; HEX and password ranges now tested.
- Not applied (recorded): a `tprv` root still yields mainnet WIF and XPRV outputs; `rootKey` checks depth but not parent fingerprint or child number; dice edge ranges (rolls 0, sides 2^32) untested. None affects a published vector.

**`sorted-multisig`** (0 errors, 5 misleading, nits)
- Applied: "only the threshold and master public keys" attributed to BIP 67's authors, with a new `bip48-xpub` claim (BIP 48's hardened levels mean cosigners share the extended public key at the script-type level); BIP 67's 2(n!) count attributed to its authors (`many-scripts` is now author-rationale) and the circular test replaced by order counts; "each cosigner derives a key at the same path" replaced by a new `bip48-per-address` claim (keys sorted per address, so a cosigner's place can change); A20.4 now fills the public-derivation levels green, as BIP 48 L122/L129 and the wallet-paths chapter do; "a P2SH address shows only a hash … the authors conclude" (`not-enforceable`, `mixed-group` re-scoped); "As written, it covers two script types"; `multisigScript` caps n at 15 (16 compressed keys exceed the 520-byte push; tested); the docstring credits BIP 13 for the address encoding; the hero status no longer calls an address an order; the hero reads the vector's name instead of hard-coding "vector 4"; drawing titles match figure titles.
- Not applied: a `sortedmulti()` cross-reference (BIP 383 is in the phase-three snapshot, not this ledger's) and the reviewer's 2ⁿ·n! bound (the chapter attributes the BIP's own count instead of correcting it).

**`payment-links`** (1 error, 6 misleading, nits)
- Applied: the A21.4 caption miscounted (BIP 321 has five proof-of-payment examples and four callbacks; the figure shows four examples and two callbacks, the tests build all four); the ledger and methodology now say "the 21 URIs in its URIs and Invalid URIs lists"; MUST, SHOULD and MAY restored for the address body, pop decoding, `req-` handling and one-time links; the `req-pop` rule covers both reasons a wallet will not open a callback, and proof URIs "must only be opened when they will simply switch back"; the payment information is the full transaction with witness data, or a BOLT 11 preimage; the A21.3 caption credits BIP 321's note on all-uppercase links, not key case alone; "BIP 21, from 2012, set out the scheme … used by 2024"; "allowed only base58 addresses, and its text made keys case-sensitive"; "bech32 and bech32m"; the dek no longer claims any wallet can open a link; invoices are "placeholders", not something BIP 321 notes; the model now refuses malformed percent-encoding and will not pay for a `req-pop` with no value (both tested); the hero source cites the note's own line.
- Not applied: a mixed-case bech32 body without 0/O/I/l is classed as base58 (form-only reading, as documented); `chrome:`-style browser schemes cannot be listed (the model blocks the five BIP 321 names); `future-in-query` and `one-time` keep their normative scope (both quote MUST/SHOULD sentences).

All five chapters are now `in-review` (shown as "technical review applied"): the independent review is applied, but no human has signed them off, so none is `approved`.
