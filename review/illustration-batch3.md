# Illustration batch 3: Schnorr, Tapscript, MuSig2, Silent payments

Branch: worktree `agent-aa26e5e356f9d1e6b`, stacked on `main` after the approved pilots (Mnemonics, Taproot). Spec: `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`; decisions D1–D5 in `review/decisions.md`. Each chapter is redrawn in the kit style: a drawing-first hero (recipe id and catalog controls unchanged), every static figure redrawn, new static figures where the prose needs them, and the worked-example tab retired into a storyboard.

## Plan

Figures are numbered in reading order. "Data" names the fixtures and the derived values drawn; every exact value comes from a tested model through `apps/site/src/lib/derive.ts`, and shortened hex always has an exact-value disclosure in the same figure. Claims are existing ledger claims.

### Schnorr (BIP 340), A06

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A06.1 | `schnorr-signature-layout.v1` (redraw) | The verifier as a machine with three input slots: pk (32 green cells, key glyph), m (cells with an open end: any length), sig (64 cells, r ‖ s bracketed), and an output lamp. | v1 | verify-inputs, final-scheme, implicit-y |
| A06.2 | `schnorr-byte-sizes.v1` **new** | Packet rows on one byte ruler: a DER signature (dashed, variable, up to 72 B), the 64-byte r ‖ s, a 33-byte compressed key (02 ‖ x) and the 32-byte x-only key. | v1 (pk) | encodings, implicit-y, verify-inputs |
| A06.3 | `schnorr-equation.v1` **new** | A balance: s·G on one pan, R + e·P on the other; leaders show where each term comes from (signature halves, the challenge hash, the key, the fixed G). | v1 trace (r, s, e) | final-scheme, verify-steps |
| A06.4 | `schnorr-verify-story.v1` **new** (was the worked tab) | Storyboard, 6 frames, vector 1: lift the key, split and range-check, hash the challenge, compute R, the two checks on R, compare x(R) with r. | v1 trace | verify-steps, lift-x, tagged-hash, vectors-reproduced |
| A06.5 | `schnorr-verification.v1` (hero) | The inputs feed a track of 8 numbered gates ending in a lamp; passed gates ticked, the failing gate crossed with a drop chute, later gates hatched as not reached. A readout under the current gate shows its values. Strips: vector, message; one stage stepper. | 12 vectors, as before | as before |
| A06.6 | `schnorr-fail-gates.v1` **new** | Where each vector stops: one lane per vector across the same 8 gates. Vector 7 ("negated message") stops at the even-y gate; vectors 8 and 11 at the x comparison. | 12 hero vectors | comment-vs-stage, vectors-reproduced, verify-steps |
| A06.7 | `challenge-preimage.v1` (redraw) | A tagged-hash machine fed SHA256(tag) twice, r, P, m; below it the five valid preimages to scale, each with its hash. | v15, v16, v17, v1, v18 | tagged-hash, challenge-sizes, arbitrary-size |
| A06.8 | `schnorr-even-y.v1` **new** | Two y values for one x: the even one kept for P (lift_x), the odd one never used; R with odd y (vector 6) rejected; sk and n − sk give one key (glyphs, no values). | v1, v6 | implicit-y, lift-x, two-secret-keys |

### Tapscript (BIP 342), A08

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A08.1 | `tapscript-witness.v1` (redraw) | The witness as a stack of plates; a bracket sends the last two (script, control block) to BIP 341's commitment check, and the items before the script to BIP 342's run. | case 1135 | scope, order, traces-agree |
| A08.2 | `tapscript-order.v1` **new** | The order of checks as a track of gates with two side exits (other leaf version, OP_SUCCESSx). Recorded runs drawn as tokens: case 1135 reaches the end; case 50's success leaves at the OP_SUCCESS exit; its failure stops at the final-stack gate. | cases 1135, 50 | scope, order, op-success |
| A08.3 | `tapscript-sig-rules.v1` **new** | A sorting tray for a signature opcode: empty key, empty signature, 32-byte key, other key length; each bin says what happens and what it costs, tagged with the recorded cases that exercise it. | 6 cases | sig-pops, sig-known, sig-empty, sig-unknown, sig-nonempty |
| A08.4 | `tapscript-multisig.v1` **new** | The old counting machine (CHECKMULTISIG, case 804's failure) crossed out; the BIP's rewrite as a chain of CHECKSIG / CHECKSIGADD plates with a tally, symbolic keys and slots. | case 804 | multisig-disabled, checksigadd, multisig-rewrite, case-multisig |
| A08.5 | `tapscript-stack-story.v1` **new** (was the worked tab) | Storyboard, case 1109 success: the stack as plates, one opcode per frame, with the budget beside it. | case 1109 | case-checksigadd, sig-nonempty, budget |
| A08.6 | `tapscript-trace.v1` (hero) | Script tape with a read head, the stack as plates, a fuel gauge for the budget and a verdict lamp. Strips: case, success/failure; one step stepper. | 6 cases | as before |
| A08.7 | `sigops-budget.v1` (redraw) | Six fuel tanks to scale: capacity 50 + witness bytes, the part drained by signature checks. | 6 cases | budget, traces-agree |
| A08.8 | `tapscript-sig-pays.v1` **new** | A signature pays its own way: a 64-byte signature adds 65 witness bytes and its check costs 50; an empty one adds 1 and costs nothing. | case 1109, 1135 | budget, budget-arith, sig-empty |
| A08.9 | `tapscript-op-success.v1` **new** | Case 50 in two frames: the decoder meets OP_SUCCESS126 and a trapdoor ends validation as valid; the failure script OP_NOP runs and leaves no element. | case 50 | op-success, case-success |
| A08.10 | `tapscript-minimalif.v1` **new** | OP_IF as a slot that fits two shapes only: empty or 0x01. Case 662's 0x01 fits; its 3-byte value jams. | case 662 | minimalif, case-minimalif |

### MuSig2 (BIP 327), A14

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A14.1 | `musig2-chain-view.v1` **new** (opening) | Two signers behind a boundary; across it, what the chain sees: one key, one 64-byte signature, a BIP 340 verifier lamp. | sig_agg 0 | compact-private, bip340-compat, n-of-n |
| A14.2 | `musig2-coefficients.v1` **new** | Storyboard, 3 frames: the key list hashed to L; L ‖ Pᵢ hashed to aᵢ; the second distinct key gets 1. | sig_agg 0 | keyagg |
| A14.3 | `musig2-keyagg.v1` (redraw, moved from the opening) | Three key glyphs with coefficient tags into a KeyAgg machine, in two orders, plus the crossed-out plain sum. | key_agg 0, 1 | keyagg, order, not-plain-sum |
| A14.4 | `musig2-rounds.v1` (hero) | Signers as computers around a table, an aggregator in the middle; packets move per stage (keys, tweaks, nonces, session values, partial signatures, signature) with a lamp per partial-signature check. Strips: vector, "each signer / aggregated"; one stage stepper. | sig_agg 0–3 | as before |
| A14.5 | `musig2-round-story.v1` **new** (was the worked tab) | Storyboard, 5 frames of the same table: keys, round 1, session values, round 2, the signature. Secret nonces drawn as hatched pink cards, never with values. | sig_agg 0 | flow, two-points, session, sign, aggregate |
| A14.6 | `musig2-nonce-once.v1` **new** | A secret nonce as a one-use ticket: Sign reads it and overwrites it with zeros; a second Sign is refused. No values. | sig_agg 0 (signer label only) | nonce-reuse |
| A14.7 | `musig2-psig-checks.v1` (redraw) | PartialSigVerify as a tester with a lamp per case; the blame cases point at the signer and contribution named. | psig checks | psig-verify, vectors |

### Silent payments (BIP 352), A15

| Fig. | Recipe | Drawing | Data | Claims |
|---|---|---|---|---|
| A15.1 | `sp-address.v1` (redraw) | The 116-character address as a ribbon of character cells (sp, 1, q, data, checksum) with a decode arrow to two key glyphs, B_scan and B_m. | case 0 | address-format, version, address-computed |
| A15.2 | `sp-ecdh.v1` **new** | Storyboard, 5 frames, Alice and Bob across an OPEN NETWORK boundary with an observer: B published, A on chain, a·B and b·A, the same point, P = B + hash(S)·G. Symbolic, no values. | case 0 (none drawn) | ecdh, goals |
| A15.3 | `sp-derive-story.v1` **new** (was the worked tab) | Storyboard, 6 frames, vector 0: address keys, A, input hash, both sides' shared secret, t₀ and P₀, the scan finds P₀. | case 0 | derive, sum-inputs, input-hash, scan-loop |
| A15.4 | `silent-payment-derivation.v1` (hero) | Sender and receiver computers either side of the chain; the transaction in the middle. Strips: vector, view (sender / receiver / outside observer), steps; the observer view shows no shared secret, tweak or ownership. | 6 vectors | as before |
| A15.5 | `sp-input-eligibility.v1` (redraw) | A sorting tray: each vector's inputs as tokens, sorted into "key counts" and "skipped" with the reason. | 5 vectors | eligibility-vectors, input-list, compressed-only, nums |
| A15.6 | `sp-scan-loop.v1` **new** | The receiver's counter k: P₀ found, P₁ found, P₂ not found, stop (vector 10). | case 10 | scan-loop, multi-output |
| A15.7 | `sp-labels.v1` **new** | The unlabeled and labeled addresses of vector 12 as ribbons; their shared leading characters (B_scan) outlined. | case 12 | labels, labels-linkable |

## What shipped

All 32 figures in the plan shipped as listed, with three differences:
- A08.7 is the signature-pays figure and A08.8 the budget tanks: the order was swapped so the explanation comes before the six tanks.
- In A08.2 the gates are numbered as BIP 342 numbers its steps (1, ·, 2, 3, 4, 4). The leaf-version check is drawn as an unnumbered precondition.
- MuSig2's opening figure is now the chain view. The key-aggregation figure moved to the "keys" section, so "The figure above" still points at it.

Every recipe in the four chapters has `drawing: true`. `SchnorrWorked`, `TapscriptWorked`, `Musig2Worked` and `SpWorked` are deleted, together with their exports and their `worked` slot lines. Dead card CSS is removed from the four chapters' sections of `atlas.css`. Figure counts:

| Chapter | Hero | Static |
|---|---|---|
| Schnorr | 1 | 7 |
| Tapscript | 1 | 9 |
| MuSig2 | 1 | 6 |
| Silent payments | 1 | 6 |

Kit additions, each with tests appended to `kit.test.ts`:
- `kit/Lamp.tsx`: `Lamp` (a verdict lamp with ✓, ✕ or dashed marks) and `wrapLines`.
- `kit/Controls.tsx`: `Strip` and `Scrub`, the hero affordances, shared by the four heroes.

Model and derive changes:
- `packages/models/src/tapscript-budget.ts` holds `BUDGET_BASE` and `SIGOP_COST`. It has no imports, so static figures can use the constants without bundling the recorder and `@noble/curves`. `tapscript.ts` uses and re-exports them.
- `deriveTapscript` adds `opSuccess` (it throws unless an OP_SUCCESS trace is an immediate success) and `witness.controlHex`. It also labels a non-32-byte key popped by a signature opcode as "N-byte key, unknown type".
- `deriveSp` now throws when the sender has no shared secret for the scan key it pays, where it used to fall back to `""`.
- `deriveMusig2PsigChecks` writes the verify formula with g′.

## Independent reviews

Each chapter had one fresh read-only reviewer. Each reviewer read the ledger, the pinned BIP text and vectors, the model, derive, the components and the 2× screenshots. What held up was applied.

| Chapter | Must-fix | Applied (summary) |
|---|---|---|
| Schnorr | 2 | (1) Lower-casing turned "R" into "r" in the text equivalents; the status and desc now use stage notes without changing case. (2) "Signed m" was wrong for invalid vectors; it now reads "Own m". Should-fix: V1's lane marked "(no comment)"; a legend in the narrow lanes; the message-control paragraph moved under the hero; computed claims cited; inputs bus in A06.1; lamps out of the lanes; "not used by Verify". |
| Tapscript | 4 | (1) The tape showed where a run would stop before reaching it; unrun opcodes now stay "ahead" until the end. (2) The hero now shows the signature count, and the witness strip is named after its catalog control. (3) The signature-rule tray keeps "CHECKSIGVERIFY MUST fail" and catches bad arguments (empty key, long n), and the headings say "non-empty sig". (4) Clipping at 375. Should-fix: OP_SUCCESS drawn with no budget in force; gate numbering; control block disclosed; the 33-byte key drawn as a key; Fig. A07.4 cited; MUST scope in the prose; the A08.8 caption no longer claims what is not drawn. |
| MuSig2 | 0 | Should-fix: the aggregate nonce's halves named R₁ and R₂ (prose too), with signers' points marked "own"; the secret card follows the session; the zeroing rule kept at MAY; the chain view labelled as what a key path spend *would* show; neutral psig chips with "checked as signer N"; g′; the pointer to Fig. A14.4; narrow collisions; titles. |
| Silent payments | 1 | (1) The sender panel showed the label number m, which only b_scan can recover; it is removed, with a test. Should-fix: label matches show the output actually found; input_hash·A moved to the public column; sender output notes and status; the checksum and the shared character marked in the address ribbon; the labels guard uses ceil; hero claims (`sum-inputs`, `input-hash`, `nums`, `goals`); prose P_k now says "B_m for a labeled address". |

Not applied:
- **Test helpers copy derive (Tapscript, Silent payments).** The tests rebuild derived fixtures from the models, as the pilots do. They do not import `derive.ts`, because importing it would pull it into `pnpm check`, which does not typecheck it today.
- **Sender P subscripts with several scan-key groups (Silent payments).** No vector has several groups; the hero now throws if one ever does.
- **Observer-view vector names (Silent payments).** The vector chooser names the test case. This is test-vector naming outside the drawing, not observer knowledge.

## Checks

- **Tests and build:** `pnpm test` passes (921 vitest + 36 Python), and so do `pnpm check` and `pnpm build`. New figure tests:
  - `schnorr-figures.test.ts`, `tapscript-figures.test.ts`, `musig2-figures.test.ts` and `silentpayments-figures.test.ts` cover values against independent model runs, no-JS heroes, failure states and leak checks. The leak checks: the observer and sender views of the silent-payment hero, and no secret values in MuSig2.
  - The prose-number tests were updated where a pointer sentence changed.
- **Screenshots:** `review/screenshots/batch3/` holds 60 shots: every figure at 1440, two hero states, 768 and 375 heroes, two dense figures at 375, and the no-JS hero. `tools/screenshots.mjs` reported no overflow, no console errors and no external requests at every step. 2× element shots of every figure at 1440 and 375 were checked by eye while building.
- **Accessibility:** `tools/a11y-tablet-audit.mjs` with axe-core ran at 768 and 1024. axe found no violations for each hero (JS), each page (JS) or each page (no JS). The keyboard tab order is reversible: Schnorr 9 stops, Tapscript 13, MuSig2 11, Silent payments 8. There was no overflow or clipping at either width.
- **Client JS:** the gzip-9 total across `dist/_astro/*.js` went from 50.5 KB (base `9e386e5`, measured the same way) to 56.2 KB, under the 60 KB limit. That is +5.7 KB, above the ~2 KB this batch was given. The new heroes carry full text equivalents and drawings, and the four old card heroes were smaller.
  - The first build was at 69.9 KB: the tapscript static figures imported `@bip-atlas/models/tapscript`, whose side effects pulled `@noble/curves` into the shared island chunk. Moving the constants out fixed this.

## Not done

- **No live screen-reader session**, and Chromium only.
- **Bundle budget:** the four heroes' bundle growth (+5.7 KB) exceeds the batch allowance. The obvious next cut is lighter text equivalents. That would weaken the full-text-equivalent rule, so it was not done without asking.
- **Human sign-off:** none yet.
