# Phase four: five new chapters (three done, two designed)

Started 8 November 2026 at the user's request ("find good 5 more topics… and add them properly"). Topics follow the curriculum research in `docs/research/2026-10-bip-map` (entropy derivation, multisig wallet setup, payment instructions, PSBT extensions, ECDSA encoding rules), chosen because each has public test material at the pinned commit.

- **Sources:** `sources/research-2026-11-08-phase4`, made by the kit's own `scripts/snapshot_sources.py` from `bitcoin/bips` at the same commit as every other chapter (`3a10b5b5…`). 15 BIPs: primaries 85, 67, 48, 321, 21, 370, 66, 146, and supporting 16, 32, 39, 62, 141, 143, 174.
- **Catalog:** `catalog-phase4.json` (a separate extension catalog, like phase three). It lists only finished chapters, because the loader requires every catalog chapter to have content; the two remaining briefs are below.
- **Figure prefixes:** A19 derived seeds, A20 sorted multisig, A21 payment links; A22 and A23 are reserved for the remaining two.

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

**Not done: independent technical review.** CLAUDE.md asks for a fresh-subagent review after writing a chapter; the user asked for no subagents in this session. All three chapters stay `draft-unreviewed` until that review runs.

## Remaining: `psbt-v2` (BIP 370), figure prefix A22

- **Model** `psbtv2.ts`: export `Reader`/`readMap` from `psbt.ts` and reuse them. Parse a PSBT of either version: version 2 must exclude `PSBT_GLOBAL_UNSIGNED_TX` and include `TX_VERSION` (0x02), `INPUT_COUNT` (0x04), `OUTPUT_COUNT` (0x05), and per input `PREVIOUS_TXID` (0x0e) and `OUTPUT_INDEX` (0x0f), per output `AMOUNT` (0x03) and `SCRIPT` (0x04). Version 0 must exclude every one of those. A required time lock is ≥ 500000000; a required height lock is > 0 and < 500000000. `TX_MODIFIABLE` (0x06) bits: 0 inputs, 1 outputs, 2 has SIGHASH_SINGLE; undefined bits are valid. Lock-time determination (L208–220): with no requirements use the fallback (or 0); otherwise pick the type every requiring input supports, height on a tie, and take the maximum; with no common type, it cannot be computed. Unique ID (L223–227): the txid of the unsigned transaction with every sequence 0.
- **Vectors** (all as one-line hex): 24 invalid (L306–399), 14 valid (L404–457), lock time 0 / 10000 / 1657048460 / not computable (L462–507; note that L500 is a hex line with no `* Case:` line).
- **Figures:** A22.1 hero, lock-time determination (one strip of the nine lock-time vectors); A22.2 the same 1-input, 2-output transaction as v2 maps and as a v0 unsigned transaction (BIP 370 L297–300 allows the conversion); A22.3 `TX_MODIFIABLE` bits and what Constructor and Signer may do (L241–279); A22.4 a grid of invalid vectors and the rule each breaks.

## Remaining: `strict-signatures` (BIPs 66, 146), figure prefix A23

- **Model** `der.ts`: BIP 66's `IsValidSignatureEncoding` (L41–103) as a step list that names the failing check; low-S (BIP 146 L42–46, half order `7FFF…20A0`); `S' = n − S` for the high-S twin. ECDSA via `ecdsaVerify` in `p2sh.ts` (noble, `lowS: false`); the legacy digest via `legacySighash` in `p2sh.ts`.
- **Test material:** BIP 143's signed native P2WPKH example (line 190 of the phase-four `bip-0143.mediawiki`; `fixtures/segwit.json` shows its shape). Input 0's scriptSig signature has a padded R (`3045022100 8b9d…`); input 1's witness signature `3044 0220 3609…` verifies against sighash `c37af311…`. Flipping input 0's S changes the txid; flipping input 1's changes only the wtxid (BIP 146 L19). Computed variants are allowed as computed fixtures, as the address chapter's character substitution is.
- **Editorial care:** BIP 146 is Closed and its deployment says "Details TBD". Present LOW_S and NULLFAIL as proposed consensus that its compatibility section (L107–109) records as relay policy as of 2016, not as current rules. BIP 66 deployed with the BIP 34 supermajority (L127–129).
- **Figures:** A23.1 hero (choose a change to a published signature: as published, pad removed, extra zero in S, wrong length byte, S flipped; each through BIP 66's checks, ECDSA and LOW_S); A23.2 DER anatomy; A23.3 the S / n − S number line; A23.4 txid versus wtxid after a flip.

## Briefs to add to `catalog-phase4.json` when each chapter lands

Then add the chapter to `chapterOrder` in `content/reading-policy.json` (`psbt-v2` after `psbt`; `strict-signatures` after `sorted-multisig`, before `segwit`) and to `content/model-coverage.json`.

```json
[
  {
    "id": "psbt-v2",
    "primaryBips": [
      370
    ],
    "phase": 4,
    "readingOrder": 22,
    "buildOrder": 22,
    "questionTitle": "Why did PSBT need a second version?",
    "heroRecipe": "psbt-v2-locktime.v1",
    "primitiveFamilies": [
      "information-envelope",
      "stage-pipeline",
      "comparison"
    ],
    "allowedControls": [
      "Choose a published lock-time vector"
    ],
    "misconceptionChecklist": [
      "PSBT version 2 is a container format, not a new transaction version",
      "Inputs and outputs can be added only while the modifiable flags allow it",
      "A PSBT's required lock times can conflict, and then no lock time can be chosen"
    ],
    "requiredTestFamilies": [
      "BIP 370 invalid and valid vectors",
      "Lock-time determination vectors",
      "Modifiable flags"
    ],
    "briefStatus": "proposed-editorial-brief",
    "releaseState": "not-generated",
    "targetWords": {
      "min": 450,
      "max": 1100
    },
    "figureBudget": {
      "hero": 1,
      "supportingMin": 3,
      "supportingMax": 5
    },
    "sourceLinks": [
      "https://bips.dev/370/"
    ]
  },
  {
    "id": "strict-signatures",
    "primaryBips": [
      66,
      146
    ],
    "phase": 4,
    "readingOrder": 23,
    "buildOrder": 23,
    "questionTitle": "Why must a signature have exactly one encoding?",
    "heroRecipe": "der-signature-checks.v1",
    "primitiveFamilies": [
      "byte-ribbon",
      "stage-pipeline",
      "number-line"
    ],
    "allowedControls": [
      "Choose a change to a published signature"
    ],
    "misconceptionChecklist": [
      "A malleated signature is still valid; it changes the transaction's identifier, not who can spend",
      "BIP 146 is recorded as Closed: its low-S rule was proposed as consensus, not deployed by this BIP",
      "SegWit moves witness signatures out of the txid, not out of the wtxid"
    ],
    "requiredTestFamilies": [
      "BIP 66 encoding rules",
      "Signed BIP 143 examples",
      "Low-S arithmetic"
    ],
    "briefStatus": "proposed-editorial-brief",
    "releaseState": "not-generated",
    "targetWords": {
      "min": 450,
      "max": 1100
    },
    "figureBudget": {
      "hero": 1,
      "supportingMin": 3,
      "supportingMax": 5
    },
    "sourceLinks": [
      "https://bips.dev/66/",
      "https://bips.dev/146/"
    ]
  }
]
```
