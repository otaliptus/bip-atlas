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

## Chapter 11 — Version bits (BIPs 9, 8)

**Model:** `packages/models/src/versionbits.ts`, pure integer code: the signalling test (top bits 001 plus the deployment bit), BIP 9's and BIP 8's GetStateForBlock as per-period transitions (BIP 9: FAILED before counting; BIP 8: count, then MUST_SIGNAL, then FAILED; MUST_SIGNAL → LOCKED_IN; LOCKED_IN waits for minimum_activation_height), BIP 8's parameter rules and mandatory-signalling check, a parser for BIP 9's assignment table, and `bip9Implied` (activation height → LOCKED_IN and tally periods).

**Sources:** BIP 9's `assignments.mediawiki` (csv and segwit rows). The build cross-checks every start and timeout against the Unix times in BIP 68's and BIP 141's deployment sections, and fails if they disagree. The four recorded activation heights are period boundaries (tested). BIP 8's assignment file has no rows; its suggested parameters (1,815, 52,416 blocks) come from its selection guidelines. No per-period signalling counts exist in the pinned sources, so the hero's counts are hypothetical and labelled as such.

**Deliberate breakage:** BIP 9 count before timeout (1 test fails), `>` for `≥` at the threshold (2), no top-bits check (1), BIP 8 MUST_SIGNAL off by one (1). A first attempt at the fourth (swapping BIP 8's MUST_SIGNAL and FAILED checks) changed nothing, because with timeoutheight ≥ startheight + 4032 the two orders cannot disagree; it was replaced.

**Independent review: 0 blocking, 7 should-fix, 5 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | MUST_SIGNAL text off by one | "once 201 have not, any further non-signalling block is invalid" (threshold-derived) |
| 2 | A MUST_SIGNAL period could be toggled "below threshold" | MUST_SIGNAL periods are not toggles; shown as "≥ (required)" |
| 3 | No-JS default ran csv to FAILED next to its real activation | Default hypothetical run has period 10 reaching the threshold; static note says it is hypothetical |
| 4 | "signalling is not consent" stretched BIP 8's words | Now quotes "in lieu of full nodes upgrading" and "ultimately enforced by full nodes" |
| 5 | "went wrong in two places" undercounted BIP 8 | "what its authors call perceived mistakes", all four listed, L15 and L27 quoted |
| 6 | BIP 8's diagram vs pseudocode at the timeout | Claim `bip8-fail` notes the model follows the pseudocode, with L38 quoted |
| 7 | No quote for minimum_activation_height in the changelog | L300 added |
| 8 | "No deployments" quote proved nothing | Split into `bip8-empty`, computed-fixture (parser finds no rows) |
| 9 | Warning paragraph flattened "should" | "says it should warn loudly"; tracking clause quoted |
| 10 | "passes starttime" vs ≥; "probably" dropped; uncited opening sentences | "reaches"; "probably at least a year"; `abstract` claim now covers both BIPs |
| 11 | Caveat ignored MUST_SIGNAL | Exception added |
| 12 | "BIPs 68, 112 and 113" untested | Test added |

**Visual and accessibility checks:** screenshots at 1440 and 375 (default, played, BIP 8 lockinontimeout true, worked tab, no-JS); one overflow at 375 px (the record figure's grid items took the table's minimum width) fixed with `min-inline-size: 0`. axe-core clean at 1440, 375, no-JS, worked tab and the played states.

## Chapter 12 — Wallet paths (BIPs 44, 84, 86)

**Model:** `packages/models/src/walletpaths.ts`: BIP 44 path parsing (five levels, hardened pattern, change ∈ {0, 1}), a level-by-level walk from the master key (BIP 32 via `./bip32`), BIP 84's P2WPKH and zpub/zprv version bytes, BIP 86's key-path P2TR (lift_x, TapTweak with no tree, via `./taproot`), and re-derivation from an account xpub. Encodings from `@scure/base`.

**Sources:** BIP 84's and BIP 86's test vectors (same mnemonic): root, account and three leaves each. The build checks every published value and fails on any difference, and checks that the account xpub alone reproduces each leaf. BIP 44 publishes paths only (16 examples, all parsed); its keys in the hero come from BIP 84's mnemonic and are labelled so.

**Deliberate breakage:** no TapTweak (2 tests fail), xpub version bytes for BIP 84 (1), account level unhardened (8), change/index swapped in xpub re-derivation (1).

**Independent review: 0 blocking, 10 should-fix, 4 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | "commits to no script path" reversed BIP 86/341 | "commits to an unspendable script path rather than to none"; L54–57 quoted |
| 2 | "keeps the ordinary xpub prefix" unsupported | "defines no alternate version bytes; its vectors print as xprv/xpub"; schemes figure says "None defined" / "Not specified" |
| 3 | bech32/bech32m not named by BIPs 84/86 | BIP 84 cited for "BIP 173 format"; figure attributes bc1q…/bc1p… to the published addresses |
| 4 | "Two wallets could follow BIP 44 and pay to different outputs" unsupported | "Later BIPs treat the purpose value as what signals the script type" |
| 5 | Gap-limit rationale stated as fact | Attributed to BIP 44's reasoning |
| 6 | BIP 86 "kept the approach anyway" | "largely reuses … for ease of implementation"; quote extended to L28 |
| 7 | "Every value checked against the vectors" overclaimed | Prose, hero and worked example now say which values are published and checked, and which are derived |
| 8 | "not the keys to spend them" | "on its own, it cannot spend" |
| 9 | "None of this needed new cryptography … one number and one encoding" | "No new derivation was needed"; the closing sentence no longer counts changes |
| 10 | Prose facts without text tests | Tests for 44′/84′/86′, first three hardened, 0/1 chains, third/fourth levels, zpub/zprv, SegWit v0, version 1 output |
| 11–14 (nits) | "never share an address", "never reused", SLIP-0044 link, opening citation, "extended public key" wording, label consistency | All applied |

**Visual and accessibility checks:** screenshots at 1440 and 375 (account level, BIP 86 change address, BIP 44 path-only, schemes, levels, worked tab, no-JS); one overflow at 375 (an unbroken 40-hex key hash) fixed. axe-core clean at 1440, 375, no-JS, worked tab and two interactive states.

## Chapter 13 — Descriptors (BIPs 380–386)

**Models:** `packages/models/src/descsum.ts` (BIP 380's checksum, transcribed from its Python; no imports, so islands may use it) and `packages/models/src/descriptors.ts` (key-expression grammar, script expressions, the placement rules of BIPs 381–386, and expansion; Miniscript leaves and the later expressions throw `DescriptorScopeError`).

**Sources:** every valid and invalid vector in BIPs 380–386, parsed from the pinned text by the tests: BIP 380's 8 checksum cases and 21 valid / 16 invalid key expressions; every listed descriptor in BIPs 381–386 expands to exactly the listed scripts, and every listed invalid one is rejected. The one listed valid descriptor with a Miniscript leaf (BIP 386 L100, no script given) is refused as out of scope. Finding while testing: BIP 380 describes its character set as three groups of 32, but its own `INPUT_CHARSET` has 95 characters (32 + 32 + 31); the chapter says so, and a test pins it.

**Deliberate breakage:** checksum generator constant (1 test fails), no sorting in sortedmulti (1), compressed-key rule under wsh dropped (1), tapscript leaf with a 33-byte key (1).

**Independent review: 0 blocking, 6 should-fix, 6 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | Uncompressed keys accepted in tr() leaves | Rejected anywhere under tr(); two tests added |
| 2 | Normalization rule's strength | "should derive … must then be added" |
| 3 | Unsourced rationale (hardware signers; sortedmulti "so cosigners need not agree") | Rewritten from BIP 380 L72–73 as an editorial claim; sortedmulti clause dropped |
| 4 | "unbounded set of scripts" | "a very large set of scripts, one per child index" |
| 5 | Quotes shorter than the claims | `checksum-cases` to L211, `origin-no-effect` to L83, `b386-leaves` to L118, `motivation` adds L32 |
| 6 | Checksum figure repeated "groups of 32" and omitted the trailing symbol | Says 32/32/31 and describes the final group symbol |
| 7 | 16-key P2SH multisig accepted by the parser | Redeem-script size checked while parsing; test |
| 8 | xpub + hardened steps raised a "rule broken" error | New `DescriptorDerivationError` ("valid, but … needs the private extended key") |
| 9 | x-only keys not checked on the curve at parse time | Checked |
| 10 | Hero: origin shown normalized without saying so; static note; legend missing numbers | Labelled "normalized"; note fixed; legend entry added |
| 11 | Wording ("hardened steps already taken", "copied by people", charset order rationale, "directly inside sh()") | Applied |
| 12 | `expansion-tested` said children 0–2 for combo too; untested numbers | Fixed; tests for 520 bytes, 7 uncompressed, "three main standard formats", 20-byte hash |

Not changed: `raw()` with an empty argument, a threshold written `01`, mainnet-only WIF and `addr()`, and uppercase hex are accepted; the BIPs do not rule on them and no vector exercises them.

**Visual and accessibility checks:** screenshots at 1440 and 375 (each descriptor kind, key highlighting, checksum check, the one-character typo, tr() tree on mobile, worked tab, no-JS); no overflow. The key buttons were restructured so each key highlights as one unit. axe-core clean at 1440, 375, no-JS, worked tab and two interactive states.

## Chapter 14 — MuSig2 (BIP 327)

**Model:** `packages/models/src/musig2.ts`, a function-by-function transcription of BIP 327's `reference.py` onto `@noble/curves` point arithmetic (no hand-rolled field or curve code): KeySort, KeyAgg (with the MuSig2* second-key coefficient), ApplyTweak, NonceGen (with supplied randomness, as the vectors use it), NonceAgg, session values (including R = G), Sign (wipes the secret nonce), PartialSigVerify, PartialSigAgg, deterministic signing. Error types and messages follow the reference.

**Sources:** all eight JSON vector files pinned with the BIP: key sort, key aggregation (valid and error), nonce generation, nonce aggregation (valid and error), sign/verify (valid, sign errors, verify failures, verify errors), tweaks (valid and error), deterministic signing (valid and error), signature aggregation (valid and error). The hero uses the four published signature-aggregation sessions, which need no secret keys: the build recomputes every aggregate value, requires every published partial signature to verify, and requires the aggregate to equal the vector's and to pass noble's BIP 340 verification.

**Deliberate breakage:** second-key coefficient not 1 (7 tests fail), nonce coefficient b dropped (4), R-parity negation of nonces dropped (4), tweak term dropped from aggregation (1). A test I first wrote for nonce reuse did not demonstrate what its title claimed; it was removed before commit, and the reuse point rests on the BIP's text plus the secnonce-wipe test.

**Independent review: 0 blocking, 9 should-fix, 6 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | Infinity/G case framed as chance, rationale unquoted | Now: signals a dishonest party; G lets signing continue so the culprit is caught; L738–740 quoted |
| 2 | Duplicate-check rationale misattributed | "to simplify error handling"; the blame point and applications' right to reject duplicates added (L125, L128–131) |
| 3 | "Each coefficient depends on the list" (not the coefficient-1 key) | "each hashed coefficient" |
| 4 | Self-check stated as unconditional | "The BIP recommends…"; footnote quoted |
| 5 | Cost/benefit trade-off misframed | MuSig-DN and MuSig1 comparisons separated as the BIP has them |
| 6 | Benefits folded into the "primary motivation" | Split: motivation, then the authors' arguments |
| 7 | Partial-signature figure mixed 0- and 1-based signers; blame text copied, not checked | Build now asserts the thrown error's signer and contribution; rows use 1-based signers from the model |
| 8 | "The equation fails" wrong for the s ≥ n case | Per-case detail |
| 9 | "Plain sum matches neither" untested; a fixture label wrong | Test and build assertion added; label "different second key" |
| 10–15 (nits) | Key-path scoping of "nothing on chain shows"; "allows" not "suggests"; "make it possible to extract"; "a requirement"; ECDSA tense; caption "a valid one"; derive now fails on any non-verifying partial signature; clearer parity wording | All applied |

**Visual and accessibility checks:** screenshots at 1440 and 375 (start, three-tweak case at the end, hidden aggregates, mobile mid-session, key-aggregation and partial-signature figures, worked tab, no-JS); no overflow. axe-core clean at 1440, 375, no-JS, worked tab and two interactive states.

## Chapter 15 — Silent payments (BIP 352)

**Model:** `packages/models/src/silentpayments.ts`, a transcription of BIP 352's `reference.py` onto `@noble/curves`, `@noble/hashes` and `@scure/base` (bech32m): input reading for the four listed types (P2PKH sliding-window key search with hash160 match, P2SH-P2WPKH, P2WPKH, P2TR with annex pop and NUMS-H skip), outpoint serialization and sort, input hash, sender output creation (taproot negation, a = 0 failure, grouping by scan key, K_max), receiver scan (labels, negated-output label check, K_max stop), address encoding and decoding. `scanEligible()` states the transaction-level rules that, like the reference, `scan()` leaves to the caller.

**Sources:** the pinned `send_and_receive_test_vectors.json`; all 28 cases pass on both sides (outputs, shared secrets, addresses, tweaks, found outputs and spending tweaks). The hero shows six; the build fails unless sender outputs, receiver addresses, A, tweak, shared secret and found outputs equal the vector's, and unless each fixture's case is the one its cited line names.

**Deliberate breakage:** no outpoint sort (20 tests fail), no taproot private-key negation (2), no NUMS skip (2), no label negation (5).

**Independent review: 2 must-fix, 8 should-fix, 10 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | Sender view showed the label integer and the receiver's B_spend, which a sender cannot know | Sender view shows only the paid address and its decoded B_scan · B_m; label and B_spend appear only in the receiver view; picker label "found via a label" |
| 2 | K_max prose said "outputs"; the BIP limits addresses per scan-key group | Prose and test now say "any group of recipient addresses sharing one scan key is larger than K_max = 2323" |
| 3 | "Any UTXO can fund" | "Any UTXO with a known output script…", plus the SegWit v > 1 exclusion (new claim, L292) |
| 4 | Unlinkability and "no larger" stated as fact | Attributed as the authors' goals; DH step qualified "under the usual Diffie–Hellman assumption" |
| 5 | Script-path sender obligation missing | Added the MUST (L254, L293) |
| 6 | Model did not state the transaction-level scan rules | `scanEligible()` with synthetic tests (needs a taproot output; rejects a v2 prevout); module doc states the scope |
| 7 | Worked example: "only someone with b_scan can recognise it" | "only the sender and whoever holds b_scan" |
| 8 | Case 23 notes relied on knowledge the viewer lacks | Sender: "address paid (not the scanning wallet below)"; receiver: "no P_k matches any output" |
| 9 | Sender secret taken from the first group; outpoint serialization duplicated; case index unchecked | Secret taken from the paid scan key's group; smallest outpoint from the model's scan result; build checks the vector comment equals the cited quote |
| 10 | `excluded-multi` statement exceeded its quote | Quote extended through the collaborative-protocol sentence |
| 11–20 (nits) | Spend key with label tweak mod n; change-label recovery scan (new claim); "(possibly labeled) spend key"; abstract wording; ledger line range; overview vs specification citations (new `scan-loop` claim on L345–362, "negligible" split into an author-rationale claim); "five vectors"; "P2SH" kind label; "x-only, read as even y" note; HRP check in `decodeAddress` | All applied. Not changed: `scan()` still checks only the labels passed in, as the reference does; the module doc says a wallet must pass m = 0 itself. Sender private keys are not range-checked; only published vectors reach the model. |

**Visual and accessibility checks:** screenshots at 1440 and 375 (sender and receiver views, labeled and unrelated-output vectors, eligibility figure, address figure, worked tab, no-JS); no overflow. Panel titles keep their case so the math stays readable. axe-core clean at 1440, 375, no-JS, worked tab and four interactive states.

## Chapter 16 — Block filters (BIPs 157/158)

**Model:** `packages/models/src/blockfilter.ts`: the basic filter's element set (output scripts except OP_RETURN, spent scripts, nil items dropped, duplicates collapsed), hash_to_range on BigInt, Golomb-Rice encode/decode with an MSB-first bit stream, GCS construction and querying with a step trace, CompactSize, filter hash and header. SipHash-2-4 comes from the `siphash` package (Frank Denis): not a `@noble` package, but not hand-rolled either. It passes the SipHash paper's reference vector, and SipHash is not security-critical here. SHA-256 comes from `@noble/hashes`.

**Sources:** the pinned `testnet-19.json`. All ten blocks rebuild byte for byte, filters and headers. The BIP's text says five blocks; the file has ten. The build fails if any filter, block hash or header differs; if a drawn Golomb-Rice code differs from the filter's own leading bits; if a block's own script fails to match; or if a script from another block matches (the prose says none do).

**Deliberate breakage:**
- keep OP_RETURN outputs: 2 tests fail;
- key in display byte order: 10 fail;
- modulo instead of multiply-and-shift: 9 fail;
- keep empty scripts: 3 fail;
- no deduplication: fails block 926,485, which has 17 scripts and 9 distinct ones. My first attempt at this breakage left the set in place and changed nothing; it was redone properly.

**Independent review: 2 must-fix, 8 should-fix, 8 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | Block 15,007 has no OP_RETURN output, despite the vector's note | Replaced in the hero by block 987,876 (unparseable coinbase script). The prose now cites the coinbase witness commitment of 926,485 and 1,263,442. |
| 2 | "Gaps are mostly of similar size" was wrong | Now: roughly geometric, small gaps common; the BIP's L124–129 rationale is quoted. |
| 3 | Comparing ~21 bits with "64" overstated the saving | Compared with ≈23 bits at fixed width below N·M (tested). The Golomb figure shows the fixed-width size for its F. |
| 4 | Message limits were off by one | "at most 1,000 blocks of filters, or 2,000 filter headers"; the ledger now states the height-difference rule. |
| 5 | Deduplication was done but never stated | A prose sentence, a computed claim and a test that 926,485 needs it. |
| 6 | The "miss is reliable" paragraph rested on the wrong evidence and lacked a condition | "provided the filter is the right one". The figure's own-block matches are cited. The verdict text says "if this is the correct filter". |
| 7 | A block alone cannot recompute a filter; "ban the peer that lied" | New editorial-analysis paragraph: spent scripts are not in the block, and BIP 157 does not say how to get them. Now "ban any peer whose header does not match". |
| 8 | Checkpoint MAY was ambiguous | "MAY first fetch the filter header at every 1,000th block (getcfcheckpt)…" |
| 9 | Empty filter showed a query on [0, 0) | N = 0 now shows a one-line explanation, with no number line or test scripts. The empty-filter MAY (L407–409) is cited. |
| 10 | "blocks 1–1" | Singular and plural fixed; block 2's previous header is labelled as block 1's. |
| 11–18 (nits) | Wording changes: "most implementations"; "nil" (empty); five/ten vector note; download visibility as an inference. Model: SegWit flag must be 0x01; non-minimal and oversized CompactSize rejected; padding not checked (comment). The chain figure states its display byte order. The siphash exception is recorded here. | Applied. Scope labels on descriptive spec claims were left as normative-rule. |

**Visual and accessibility checks:** screenshots at 1440 and 375 covered:
- the Golomb table;
- hero start, a miss, the empty filter, the unparseable coinbase, mobile with coding shown;
- the header chain;
- the worked tab;
- no-JS.

There is no overflow. axe-core is clean at 1440, 375, no-JS, the worked tab and two interactive states.

## Chapter 17 — v2 transport (BIP 324)

**Model:** `packages/models/src/v2transport.ts`:
- X-only ECDH and the tagged shared secret;
- the HKDF-SHA256 key schedule;
- FSChaCha20 (one continuing length keystream that rekeys from itself) and FSChaCha20Poly1305 (nonce = packet-in-epoch ‖ epoch, rekey every 224);
- packet encryption and decryption;
- v1 header framing, for comparison.

It is built on `@noble/curves`, `@noble/hashes` (HKDF) and `@noble/ciphers` (ChaCha20, ChaCha20-Poly1305).

ElligatorSwift is deliberately out of scope: no audited JS library implements it, and the project forbids hand-rolled curve code. The model takes the decoded X coordinates from the vectors. This is stated in the model doc, the ledger, the hero caption, the hero's per-value notes and the worked example.

**Sources:** `packet_encoding_test_vectors.csv`. All seven rows pass:
- x(ours), the shared x, the secret, all four keys, the terminators and the session ID;
- the full packet for the three rows that publish it;
- the published last 128 bytes for the four rows that publish only a tail.

The test and the build first parsed this CRLF file with `split("\n")`. That left a "\r" in the last column's name, so the tail comparisons were silently skipped. The review's question about tails exposed it. Both now split on `\r?\n`, and a test asserts that four tails and three full ciphertexts are read.

**Deliberate breakage** (tests that fail):

| Breakage | Tests failing |
|---|---|
| Fixed key order in the ECDH hash | 4 |
| No block-counter reset on length rekey | 1 |
| No AEAD rekey | 2 |
| No network magic in the HKDF salt | 8 |

**Independent review: 0 must-fix, 9 should-fix, 10 nits. Applied:**

| # | Finding | Change |
|---|---|---|
| 1 | "Packet equals the vector" was overstated where only a 128-byte tail is published | Caption, ledger and hero source line now say which: the whole packet, or the last N bytes. Tail checks were made real (see above). |
| 2 | Hero v1/v2 comparison was wrong for decoys and packet 0, and implied v1 has type IDs | The comparison appears only for application packets and is reworded. Decoy and packet-0 states explain that v1 has no equivalent. |
| 3 | Session ID alone does not catch a downgrade | Now "protocol version and session ID" (prose and caveat). |
| 4 | "learns nothing from the bytes" and "can be caught" | Now "can no longer read the messages" and "in principle detectable". |
| 5 | "so the network does not split" | Now "to minimize the risk of splitting the network". |
| 6 | "Until BIP 324 … in the clear" | Now "Before BIP 324, every connection carried it in the clear (v1 connections still do)". |
| 7 | Unquoted parts of seven ledger statements | Quotes added: length rekey L448, "not a priority" L174, initiator version packet L133, L149 timing, TLS/Noise L72–75, shaping goal L84, detectability L34, untrusted flags L581, decoy scope L126. |
| 8 | "Decode to x" implied our side's decoding was checked | Now: "computed; that these 64 bytes decode to it is the vector's claim". The worked example carries the ElligatorSwift caveat. The peer's x is hidden until the secret stage. |
| 9 | Unreadable tag on the decoy shot | Fixed (the CSS override landed before the re-shoot); verified. |
| 10–19 (nits) | HKDF label in the salt. Header-flag tense and decoy scope. Exact payload rekey (0xffffffff nonce field) and the length cipher's next nonce. Version packets sent without waiting, possibly after decoys. Terminator rationale attributed. ElligatorSwift wording. Framing note per message. Rekey table says keys after 223 are the model's. `decPacket` doc. Stray `V1_HEADER` check removed. `session-id` scope set to author-rationale. 33-byte overhead without a short ID added to the prose (tested). | All applied. |

**Visual and accessibility checks:** screenshots at 1440 and 375 cover the framing figure, the hero (start, stage 3 on mobile, application packet with comparison, decoy, no-JS), the rekey table and the worked tab. There is no overflow. axe-core is clean at 1440, 375, no-JS, the worked tab and three interactive states.
