# Phase three — review record

Branch `main-q0i8zv`. Ten chapters from `catalog-phase3.json`, sources pinned in `sources/research-2026-10-01-phase3` (same `bitcoin/bips` commit `3a10b5b5…` as phases one and two). Every chapter is `reviewState: in-review`; no human sign-off yet.

## Chapter 9 — P2SH (BIP 16)

**Model:** `packages/models/src/p2sh.ts`, a narrow recorder (like `tapscript.ts`) for BIP 16's stages: push-only scriptSig, hash match, then the redeem script (legacy, SIGHASH_ALL digest) or BIP 141's P2SH witness path (P2WPKH / P2WSH, BIP 143 digest). Opcodes outside `P2SH_SUPPORTED` throw `P2shScopeError`. Signatures are verified with noble against digests the model computes; the published signatures verifying is the proof the digests are right.

**Fixtures:** BIP 174's final transaction (L833; input 0 legacy 2-of-2, input 1 P2SH-P2WSH 2-of-2, prevouts from the updater PSBT at L797) and BIP 143's P2SH-P2WPKH example (L250, spent output at L215).

**Deliberate breakage:** four breakages (digest hash type, CHECKMULTISIG key order, HASH160 → SHA-256, push-only check) each fail at least one test.

**Independent review (fresh subagent with ledger, model, pinned text): 1 blocking, 8 should-fix, 4 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 (blocking) | Hero's "Hidden" state leaked the redeem script's size, kind, sigops and (after stepping) its assembly | Hidden now shows "Redeem script · unknown" and no stages; the sigops note appears only when revealed |
| 2 | Sigops footer said 0 for wrapped spends | Shown only for the legacy spend |
| 3 | Byte counts mixed bases (scriptSig with push opcodes, witness without prefixes) | Witness now counted as serialized (count + prefixes + items): 218 B and 107 B; claim, prose and figure note updated; tests check both bases |
| 4 | Bars scaled by bytes, not weight | Bars scale by weight units (scriptSig ×4); prose gives 872 vs 358 WU, tested |
| 5 | "earlier transactions … fail them" overgeneralized | "some earlier transactions" |
| 6 | HASH160 sentence had no support | Recast as what the model computes; folded into the `spends-verified` computed claim; P2PKH comparison dropped |
| 7 | `standard-only` read as present tense | "That was relay policy as BIP 16 states it"; scope `history` |
| 8 | Witness path narrower than the rules it describes | Empty-witness P2WPKH now fails instead of throwing; clean-stack rule (exactly one item) for P2WPKH/P2WSH; general BIP 141 witness-program detection, with anything but v0 20/32-byte programs out of scope (throws); legacy path requires an empty witness; "exactly a push of the redeemScript" compared byte for byte; 520-byte item and 10,000-byte witnessScript limits. Three new tests |
| 9 | Sigop rationale misattributed | "the per-block limit protects miners" |
| 10 (nit) | Dek "holds 20 bytes" vs 23 later | "commits to a 20-byte hash" |
| 11 (nit) | Opening history unsupported | Rewritten around BIP 16 L66 (giving the sender the complete script), quoted under `motivation` |
| 12 (nit) | `isPushOnly` and OP_1NEGATE / OP_RESERVED | OP_1NEGATE pushes 0x81; OP_RESERVED in a scriptSig is out of scope (throws) |
| 13 (nit) | Raw `<sup>` in an evidence quote | Evidence quotes render `<sup>` markup |

**Checked and fine (per the reviewer):** the three rules and their order, the template, sigop counting and both BIP examples, 520 bytes / 15 keys, rollout dates and thresholds (presented as recorded, not reconciled), BIP 141/143 facts, the legacy and BIP 143 digests, and the worked example.

## Chapter 10 — Timelocks (BIPs 65, 68, 112, 113)

**Model:** `packages/models/src/timelock.ts`, pure integer code (no crypto, importable by the island): nLockTime reading (height/time threshold, finality bypass), BIP 68 nSequence decoding and relative-lock evaluation (with the reference code's minus-one semantics), BIP 113 median time past, and OP_CHECKLOCKTIMEVERIFY / OP_CHECKSEQUENCEVERIFY checks recorded in the order of BIP 65's and BIP 112's reference code.

**Sources:** the BIPs carry no test vectors, so the opcode cases come from Bitcoin Core's own transaction tests: `sources/external/core-locktime-cases-excerpt.json`, 51 one-input cases (`<n> CHECKLOCKTIMEVERIFY|CHECKSEQUENCEVERIFY [1]`) from `tx_valid.json` / `tx_invalid.json` at tag v29.0 (commit `f490f556…`), plus the `LOCKTIME_THRESHOLD` lines of `script.h`. `tools/extract-locktime-cases.mjs` rebuilds it and refuses to run unless each upstream file matches its pinned SHA-256. The build fails unless the model agrees with Core's label on every hero case; a test checks all 51 (27 valid, 24 invalid) and that each invalid case fails at the check its Core comment names. Field readings also use transactions published in BIP 143 (L190, L206) and BIP 174 (L619, L833).

**Deliberate breakage:** threshold + 1 (5 tests fail), no CSV masking (1), no CLTV finality check (3), CSV version ≥ 1 (2).

**Independent review: 0 blocking, 7 should-fix, 9 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | "no consensus meaning at all" overstated BIP 68 (0xffffffff still affects nLockTime) | Prose, caveat and figure now say "no relative lock under BIP 68"; the finality role is stated |
| 2 | Caveat's "CSV fails" lacked the bit-31 condition | "a CHECKSEQUENCEVERIFY whose argument has bit 31 clear fails" |
| 3 | "long-unused field" contradicted BIP 68 | "repurposes each input's sequence number"; new claim `repurposed` (L22, L234) |
| 4 | nLockTime "until … reached" vs "below height 18" | Added the strict rule (included only once height or time exceeds nLockTime); new claim `last-invalid` (BIP 113 L24–26) |
| 5 | "all three situations" unclear | "both sides" |
| 6 | `csv-escrow` evidence missed 2-of-3 / any time | Quotes extended to L59–61 and L70–76 |
| 7 | Units panel stated a lock for a final input | Says nLockTime is not enforced when the only input is final |
| 8 | "one block per 600 s" and mixed year lengths | "at the 600-second average"; one year constant |
| 9 | Bit map labelled value bits when bit 31 set | With bit 31 set, every other bit is drawn as "no meaning" |
| 10 | Worked example skipped the input-disable check | Step added |
| 11 | "about an hour later" scoped as a rule | Split into `mtp-hour`, author-rationale |
| 12 | `two-kinds` / `core-cases` rest on external files | Statements name the pinned excerpt and the tests |
| 13 | Freeze example dropped DROP | Added |
| 14 | Untested prose numbers | Tests tie 2014/2015, bit 0, 1 May 2016, 30 days, five bytes, version 4 to pinned lines |
| 15 | Unsigned version cast untested | Tests for version 0xffffffff |
| 16 | Dek "by the calendar" | "by block height or date" |

**Visual and accessibility checks:** screenshots at 1440 and 375 (absolute and relative states, edited fields, units comparison, worked tab, no-JS) in `review/screenshots/phase3/`; `scrollWidth` equals the viewport in every state after one fix (the 32-cell bit row overflowed at 375 px; it now wraps to 16 columns). axe-core (WCAG 2.1 A/AA + best practice) is clean at 1440 and 375, without JS, on the worked tab and in the relative/compare states.
