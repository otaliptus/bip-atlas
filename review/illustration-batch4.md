# Illustration batch 4: version-bits, block-filters, v2-transport, message-signing

Redrawn in the illustration-kit style approved on the two pilots (decisions D1–D5 in `review/decisions.md`; spec `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`). Each chapter: figure plan first, then tests, components, placement, screenshots and an independent review.

## Version bits (A11)

Was 3 figures (field, card-style hero with a worked-example tab, a table). Plan: 1 drawing-first hero and 8 static drawings, in reading order. The worked example (csv read back from its activation height) becomes the A11.7 storyboard.

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A11.1 | `versionbits-field.v1` (opening, redrawn) | nVersion as 32 bit cells on a bit ruler, grouped in nibbles with their hex digit; top bits 001 bracketed; bits 1 and 0 lit and named on leaders; the three versions a block sets to signal csv, segwit or both. | `bip9-csv`, `bip9-segwit`; `versionFor` | top-bits, 29-bits, assignments |
| A11.2 | `versionbits-top-bits.v1` **new** | A cabinet of eight drawers, one per top-bit pattern 000–111, each an eighth of the version space. Drawer 001 is pulled out (BIP 9: 0x20000000–0x3FFFFFFF, 29 bits); 010 and 011 are labelled for future mechanisms; the rest count as no signal. | model constants `TOP_BITS`, `VERSION_MIN/MAX`, `MAX_BIT` | top-bits, 29-bits |
| A11.3 | `versionbits-bit-reuse.v1` **new** (schematic) | One bit as a track over time: deployment A's window, its end (timeout or activation), a fallow pause, then deployment B. | none (schematic) | bit-reuse, timeout-why |
| A11.4 | `versionbits-threshold.v1` **new** | Three bars to scale on a 0–2,016 ruler: BIP 9 mainnet 1,916, testnet 1,512, BIP 8's suggested 1,815; the remainder says how many non-signalling blocks are enough to stop lock-in. | `bip9-csv`, `bip8-guidelines`; `PERIOD` | threshold, bip8-guidelines, bip8-why |
| A11.5 | `versionbits-boundary.v1` **new** (storyboard, 3 frames) | A railway junction at a STARTED boundary: the first switch tests the timeout, the second the count. Three trains: lock-in, one short, and a full count after the timeout that still fails. Each outcome from `bip9Next`. | `bip9-csv` | threshold, precedence-why, mtp-clock |
| A11.6 | `versionbits-state-machine.v1` (hero, redrawn) | The state machine as a vertical railway with stations (FAILED and MUST_SIGNAL on branches) and a train at the current state; a ribbon of 30 period tiles with the window bracket; a gauge for the current period's count against the threshold. Strips: deployment, this period's count. Stepper: periods. | `bip9-csv`, `bip9-segwit`, `bip8-guidelines`; `simulateBip9/8` | states, threshold, lockin-active, bip8-must-signal, bip8-fail |
| A11.7 | `versionbits-lifecycle.v1` **new** (storyboard, 5 frames; was the worked example) | csv from parameters to ACTIVE: the deployment ticket, a signalling version, the tally period (count not recorded, only ≥ 1,916 implied), LOCKED_IN, ACTIVE. | `bip9-csv`; `bip9Implied` | assignments, implied, lockin-active, signal-lockedin, threshold |
| A11.8 | `versionbits-record.v1` (redrawn) | For csv and segwit: the mainnet window as a time bar with its cross-check stamp, and the three periods its activation height implies, on a height ruler. Testnet rows and Unix times in a disclosure. | `bip9-csv`, `bip9-segwit` | assignments, crosscheck, implied |
| A11.9 | `versionbits-bip8.v1` **new** | Two tracks of BIP 8 periods with the suggested parameters and no period reaching the threshold: lockinontimeout false ends FAILED at the timeout height; true turns the last period into MUST_SIGNAL, then LOCKED_IN and ACTIVE. A magnifier on MUST_SIGNAL: 201 blocks may fail to signal, the 202nd is invalid. | `bip8-guidelines`; `simulateBip8`, `mustSignalInvalid` | bip8-must-signal, bip8-fail, bip8-guidelines, bip8-min-activation |

### Version bits: independent review

A fresh read-only subagent reviewed the ledger, pinned BIP 8/9 text, model, components, tests and 1440/375 screenshots. It confirmed both state machines against the pseudocode (timeout before count in BIP 9, count before MUST_SIGNAL before FAILED in BIP 8, no DEFINED→FAILED in BIP 8), the read-back heights, the cross-checked dates, the MUST_SIGNAL arithmetic and the palette (orange only for windows and heights; states in ink with a letter). Findings and what was done:

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | A11.5's counts and "MTP at the timeout" were not marked hypothetical; its desc said "a csv deployment … FAILED". | "· HYPOTHETICAL" on every frame, "the counts are hypothetical" in the caption, desc says "a deployment with csv's parameters". |
| 2 | must-fix | A11.9's caption said no period reaches the threshold, but a MUST_SIGNAL period must. | "no STARTED period reaching the threshold". |
| 3 | should-fix | BIP 8 runs assume minimum_activation_height 0 without saying so. | Stated in A11.9, the hero's edge label ("ONE PERIOD (MIN. HEIGHT 0)"), desc and source line; `bip8-min-activation` cited on A11.6. |
| 4 | should-fix | The hero's block heights are schematic but looked real. | "schematic blocks …" in the readout and desc. |
| 5 | should-fix | Drawers 100–111 labelled "counts as no signal" suggested valid versions. | "NOT 001: NO BIP 9 SIGNAL" (the ledger has no claim about negative versions, so the figure says nothing about their validity). |
| 6 | should-fix | A11.4 drew 2,016 − t but labelled 2,016 − t + 1. | "100 MAY WITHHOLD · 101 STOP LOCK-IN" (both computed). |
| 7 | should-fix | A11.7 caption implied the table records ≥ 1,916. | "BIP 9's rules imply at least 1,916". |
| 8 | should-fix | A11.1 implied a block signalling both existed. | Caption and row say hypothetical. |
| 9 | should-fix | The hero's DEFINED→FAILED rail and MTP labels were uncited. | Rail labelled "MTP ≥ TIMEOUT"; `mtp-clock` and `params` cited (`states` already covers FAILED past the timeout). |
| 10 | should-fix | `WINDOW = 26` typed by hand. | Hero and A11.9 throw unless it equals the guideline fixture's `timeoutPeriods`; A11.9 draws from the fixture. |
| 11 | should-fix | No-JS text hard-coded "csv" and "period 10". | Built from the first option and the default counts. |
| 12–13 | should-fix | Gauge label ran into text (A11.7); magnifier lines cut tiles (A11.9). | Text moved; lens moved right and sourced from the tile's bottom. |
| 14 | should-fix | Many labels under 9 px at 375; A11.7's bit digits illegible. | Legends and small labels raised to 8.5–9; bit cells drawn without digits (ones in ink). |
| 15 | should-fix | Prose overstated the fallow-period rationale. | "helps detect buggy clients"; A11.3 desc keeps "after a successful soft fork". |
| 16–26 | nits | "Past the timeout" vs ≥; "has passed"; switch-2 label position; "orange" as the cue; threshold called a parameter; "still set" vs should; "≥ 1,916" placement; MUST_SIGNAL style and needle; LOCKED_IN grey; strike through "F"; ambiguous window in desc. | All applied ("at or past", "has been reached", label moved, "bar above tiles", "fixed by BIP 9", "should stay set", "≥ 1,916 SIGNALLED" under the height, dashed-heavy MUST_SIGNAL with no needle, darker LOCKED_IN, haloed F, "window periods 1–26; timeout reached at period 27"). |

## Block filters (A16)

Was 3 figures (a Golomb-Rice table opening the chapter, a card-style hero with a worked-example tab, a header list). Now 1 drawing-first hero and 8 static drawings. The worked example (block 926,485 from scripts to a query) becomes A16.4 (built on the smaller block 1,263,442) and A16.7.

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A16.1 | `bf-two-directions.v1` **new** (opening) | BIP 37 vs BIPs 157/158 as two scenes with a light client and a full node; the served filter is block 926,485's, drawn byte by byte (25 cyan cells). | `bf-block-926485` | bip37-flaws, reverse, light-clients |
| A16.2 | `bf-element-sieve.v1` **new** | Every script the block touches, struck through with the reason when left out (OP_RETURN, repeat, empty), the rest parked one per bay in a lot: the set. | `bf-block-926485` | contents, dedup, vectors |
| A16.3 | `golomb-rice-code.v1` (redrawn, moved from the opening) | BIP 158's P = 2 table as bit cells (unary ones in ink, remainder grey), then the first P = 19 code of a published filter with q and r brackets. | `bf-golomb` | gr-coding, gr-computed |
| A16.4 | `bf-build-story.v1` **new** (storyboard, 5 frames; was the worked example) | Scripts into a SipHash machine; values on [0, F); gaps as arcs; Golomb-Rice codes; N byte + coded bytes = the published 9-byte filter. | `bf-block-1263442` | siphash, key, gcs-steps, gr-coding, serialize, basic-params |
| A16.5 | `bf-size.v1` **new** | Bits to scale for two blocks: floor N·(P + 1), the coded filter, fixed width; the scripts themselves on a broken bar. | `bf-block-180480`, `bf-block-926485` | min-size, size-computed |
| A16.6 | `gcs-filter.v1` (hero, redrawn) | Test script → SipHash → target on the [0, F) line; the client's decode walk as arcs; values never read drawn empty; "Bits" shows the N byte and first codes. Strips: block, test script, values/bits. | six `bf-block-*` | vectors, contents, query, gr-coding, siphash, key, gcs-steps, serialize, gcs-def, scope-of-miss |
| A16.7 | `bf-query-story.v1` **new** (storyboard, 3 frames) | Own script: match, fetch the block. Foreign script: no match, skip. The 1-in-784,931 arithmetic. | `bf-block-926485` | gcs-def, fp-arith, query, scope-of-miss |
| A16.8 | `filter-header-chain.v1` (redrawn) | Each header as a link: previous header + filter hash → dSHA256 → header, chained 2 → 3; block 1 shown as a gap. | `bf-chain` | headers-def, vectors |
| A16.9 | `bf-peer-check.v1` **new** (schematic storyboard) | Two peers' header chains diverge; the client builds that block's filter itself (with the spent scripts); bans the peer that disagreed. | none | client-sync, headers-why, honest-peer, filter-check, block-not-enough |

### Block filters: independent review

A fresh read-only subagent re-ran every hero and A16.7 probe through the model and checked the BIP text, ledger, captions and screenshots. It confirmed the filter rules and MUST strengths, SipHash key and range, Golomb-Rice and serialization, the query algorithm, the false-positive arithmetic, header chaining, the client-sync SHOULD/MAY strengths, and that every drawn value comes from derive with build-time equality checks. Findings and changes:

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | In 6 of 24 hero probes decoding runs out below the target, yet the status said "value N passes it" and drew "PASSED: STOP". | The verdict branches on the last step: "All N values are below it" and "END OF FILTER"; A16.7's label too. A test covers block 987,876. |
| 2 | must-fix | A16.9 frame 2 was clipped and implied the block alone suffices to rebuild the filter. | Redrawn with two inputs, the block and the spent scripts ("not in the block"); `block-not-enough` cited. |
| 3 | should-fix | "One honest peer is enough" stated as fact. | Attributed: "the authors argue". |
| 4 | should-fix | Prose "about 23 bits at fixed width" used log2 F; true fixed width is 24 and 23. (Its "about 21 bits per item" is right once the N byte is left out, as the existing test does.) | Prose, ledger statement and test now say "24 and 23 bits". |
| 5 | should-fix | A16.5's fixed bar used N·log2 F and the filter bar included the N byte. | Fixed width uses ⌈log2 F⌉ (312, 207); "CODED" bars leave out the N byte; caption says so. |
| 6 | should-fix | Hatching undecoded values at their exact positions misused "hidden": the client holds them. | Drawn as empty dashed marks, "in the filter, not read"; caption updated. |
| 7 | should-fix | N = 0 showed "hashes to 0" on an empty range. | No SipHash or target for an empty filter; status "one zero byte, N = 0". |
| 8 | should-fix | Miss wording dropped the "right filter" proviso. | Restored, and "spends an output with it". |
| 9 | should-fix | Hero cited too few claims. | Added siphash, key, gcs-steps, serialize, gcs-def, scope-of-miss. |
| 10 | should-fix | "KEY: THE BLOCK HASH" overstated. | "KEY: FIRST 16 B OF THE BLOCK HASH". |
| 11–18 | nits | Spike arc near 0; overlapping marks; floating sieve arrow; "‖" glyph and genesis label in A16.8; uncoloured hero bits; "each costing a download"; hard-coded greys. | Arc skipped when tiny; decoded marks drawn on top; arrow anchored; "+" and "(GENESIS)"; the rest left as is (hero bit cells stay ink/grey, the prose sentence is the reviewed phase-3 text). |

## v2 transport (A17)

Was 3 figures (framing bars, a card-style hero with a worked-example tab, a rekey table). Now 1 drawing-first hero and 8 static drawings. The worked example (packet 0's key schedule) becomes A17.5. ElligatorSwift is not implemented: every figure that shows an x coordinate says the decoding is the vector's.

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A17.1 | `v1-v2-framing.v1` (opening, redrawn) | Two packet diagrams on one byte scale: v1's 24-byte cleartext header (plain) and v2's length, header, ID and tag (cyan), payload dashed. Totals checked against `V1_HEADER` and `V2_OVERHEAD`. | `v2-framing` | framing-computed, packet-format, message-type |
| A17.2 | `v2-eavesdropper.v1` **new** (schematic storyboard) | Node A, node B, OPEN NETWORK boundary and a listener: v1 readable; v2 random-looking; an active attacker in the middle with session ID A ≠ B. | none | v1-plaintext, aim, forces-active, session-id, no-auth |
| A17.3 | `v2-ellswift.v1` **new** | The initiator's 64 key bytes as cyan cells (u and t halves), the optional garbage, and x with "not decoded here". | `v2-packet-1` | ellswift, garbage, vectors |
| A17.4 | `v2-detect.v1` **new** | The 16 bytes every v1 connection starts with (magic, "version", padding, from `V1_PREFIX`) against the start of a v2 key. | `v2-packet-1` | v1-detect |
| A17.5 | `v2-key-story.v1` **new** (storyboard, 4 frames; was the worked example) | Two encodings; ECDH and the tagged hash to the secret (pink); HKDF's four keys, terminators and session ID; packet 0 with 4,095 bytes of garbage as AAD. | `v2-packet-0` | ecdh, hkdf, terminator-aad, vectors |
| A17.6 | `v2-handshake.v1` (hero, redrawn) | This side and the peer across the open network; wire items step by step; secrets drawn only on the two sides; the listener's panel lists only wire bytes, with a hatched "secret, keys: not on the wire". Strips: vector, v2 packet / v1 equivalent. Stepper: five stages. | five `v2-packet-*` | vectors, ecdh, hkdf, packet-format, rekey |
| A17.7 | `v2-terminator.v1` **new** | Garbage then the 16-byte terminator under a sliding window; "at most 4,095 + 16 = 4,111 B read". | `v2-packet-0` | terminator-why, garbage, terminator-aad |
| A17.8 | `v2-packet-bytes.v1` **new** | All 21 bytes of packet 1 on a byte ruler with what protects each part, and what the endpoints recover. | `v2-packet-1` | packet-format, length-unauth, vectors |
| A17.9 | `v2-rekey.v1` (redrawn) | A ring of 224 packet slots, the nonce on both sides of the boundary, and the key chain epoch 0 → 1 → 2 (secret keys). | `v2-rekey` | rekey, vectors |

### v2 transport: independent review

A fresh read-only subagent checked BIP 324, the ledger, model, components, tests and screenshots. It confirmed that ElligatorSwift is never implied to be decoded (every x is labelled as computed or as the vector's decoding), the tagged hash order and HKDF salt and outputs, terminators and AAD, packet format and what the tag covers, framing sizes, the rekey nonce layout and key derivation, and that nothing in the listener's panel, A17.2, the status or aria text leaks a secret, key, session ID or plaintext (a test enforces this). Findings and changes:

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | The hero's "v1 equivalent" read the vectors' random test contents as application messages (and miscounted packet 448 by 12 bytes). | Replaced by a general "v1 framing" view: a 24-byte cleartext header plus payload, labelled as not about the vector; the desc says so. |
| 2 | must-fix | A17.7's two top labels overlapped. | Terminator label right-aligned on its own. |
| 3 | should-fix | Step 4 omitted decoys before the version packet. | "optional decoys, then a version packet. The first one authenticates its garbage." |
| 4 | should-fix | The listener's first line left out the garbage. | "KEYS + GARBAGE: RANDOM". |
| 5 | should-fix | Hero claims too narrow. | Added terminator-aad, version-packet, garbage, decoys, traffic-analysis, framing-computed. |
| 6 | should-fix | A17.2 frame 2 said "random bytes only", although sizes and timing still show. | Says sizes and timing still show; traffic-analysis cited. |
| 7 | should-fix | Session-ID labels in A17.2 and the side labels in the narrow hero crossed the boundary lines. | Stacked labels; boundaries at a third; shorter side labels at narrow width. |
| 8 | should-fix | Terminators drawn in three colours. | Cyan (wire bytes) everywhere. |
| 9–14 | nits | A17.5 frame 2 suggested x is hashed first, had no arrow and no tag name; unlabelled small packet segment; A17.8 bracket without text; hard-coded secret colour; empty space in A17.3. | Encodings first, arrow to the secret, tag `bip324_ellswift_xonly_ecdh` named; "HDR+C" labels; secret text colour from the token; A17.3 trimmed. |

To keep crypto out of the client bundle, the BIP 324 constants moved to an import-free `packages/models/src/v2constants.ts`, re-exported by `v2transport.ts`; drawing code imports the constants module (importing `v2transport` from a static figure pulled `@noble/curves` into the island bundle, +16 KB).

## Message signing (A18)

Was 3 figures (a formats table, a card-style hero with a worked-example tab, verdict cards). Now 1 drawing-first hero and 8 static drawings. The worked example (one vector from message hash to verdict) becomes A18.6.

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A18.1 | `bip322-formats.v1` (opening, redrawn) | The four formats as envelopes stamped with their prefix (legacy dashed, no prefix), text from BIP 322's table. | `b322-formats` | formats, legacy-rules, simple, full, pof |
| A18.2 | `bip322-message-hash.v1` **new** | Two messages for one address through the tagged-hash machine: unrelated hashes, different to_spend IDs. | `b322-p2wpkh-hello`, `b322-wrong-message` | to-spend, vectors |
| A18.3 | `bip322-virtual-tx.v1` (hero, redrawn) | to_spend and to_sign as two linked tickets (to_sign's input spends to_spend's output 0), the message hash hatched until revealed, a verdict stamp, "never broadcast". Strips: vector, to_spend/to_sign, hash hidden/revealed. | six `b322-*` vectors | vectors, to-spend, to-sign, verdicts |
| A18.4 | `bip322-witness.v1` **new** | The 3-of-3 signature as a witness stack of plates: dummy, three ECDSA signatures, the script. | `b322-p2wsh-3of3` | signature-def, consensus-valid, vectors |
| A18.5 | `bip322-choice.v1` **new** (schematic) | Which envelope: two questions, three outcomes (pof MUST, smp MAY, otherwise ful). | none | encode-choice, simple, full, pof |
| A18.6 | `bip322-verify-story.v1` **new** (storyboard, 4 frames; was the worked example) | A verifier on a full vector: rebuild to_spend, decode to_sign and check the link, run the interpreter, stamp VALID at T and S. | `b322-p2wpkh-full` | basic-validation, time-age, interpreter, vectors |
| A18.7 | `bip322-verdicts.v1` (redrawn) | Three stamps: solid valid, crossed invalid, dashed inconclusive, each with its vector and the model's reason. | `b322-verdicts` | verdicts, time-age, interpreter, vectors |
| A18.8 | `bip322-interpreter.v1` **new** | The interpreter's reviewed opcodes as tags on a rack; tapscript adds CHECKSIGADD; any other opcode → inconclusive. List from the model's `REVIEWED` via derive. | `b322-verdicts` | interpreter, upgradeable-rules, vectors |
| A18.9 | `bip322-limits.v1` **new** (schematic) | A timeline: signed (when, who: hatched), presented, the coins later (unknown); T is a lock-time field, not a date. | none | no-proof, not-sender, no-timestamp |

Derive now also returns the interpreter's reviewed opcode names (`reviewedOpName` added to `interpreter.ts`; the build throws if one has no name).
