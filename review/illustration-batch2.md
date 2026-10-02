# Illustration batch 2: SegWit, PSBT, P2SH, Timelocks

Branch: worktree branch of batch 2 (see the report). Redrawn in the illustration-kit style (decisions D1–D5 in `review/decisions.md`; spec `docs/superpowers/specs/2026-10-02-illustration-redesign-design.md`). Pilots: `review/illustration-pilot-mnemonics.md`, `review/illustration-pilot-taproot.md`.

## SegWit (A03) — figure plan

Every value is drawn from `deriveTransaction` (tested `tx` model; the build throws if a serialization, preimage or sighash differs from BIP 143). New derived data: per-input scriptSig and witness kinds, checked structurally at build time (a P2PK scriptSig must be one push; a nested program push must be `0x16 0x00 0x14` + 20 bytes; a P2WPKH witness must be exactly two items and HASH160 of the key must equal the 20-byte program of the scriptCode).

| Fig. | Recipe | Drawing | Fixtures | Claims |
|---|---|---|---|---|
| A03.1 | `two-serializations.v1` (was a bar chart) | Storyboard, 4 frames: the 343-byte tape into a double SHA-256 machine gives the wtxid; the marker and flag are snipped out; the witness is snipped out; the 233 bytes left give the txid. Exact hashes in a disclosure. Replaces the retired `TxWorked` tab. | native-p2wpkh | two-ids, marker-flag, examples-published |
| A03.2 | `witness-field.v1` **new** | Zoom on the witness section of the mixed example: input 0's empty field `00`, input 1's count, lengths, 71-byte signature and 33-byte key; HASH160(key) = the 20-byte program. | native-p2wpkh | witness-format, empty-witness, p2wpkh |
| A03.3 | `witness-commitment.v1` **new** | A schematic block: the txid tree feeds the header's merkle root; the wtxid tree (coinbase leaf all zeros) feeds a commitment in a coinbase output. The example's txid and wtxid label one leaf. | native-p2wpkh | wtxid-commitment, committed, two-ids |
| A03.4 | `transaction-anatomy.v1` (hero, drawing-first) | The serialization as a packet diagram on a byte ruler. Strips: example; lens txid / wtxid / BIP 143. The txid lens hatches marker, flag and witness (magnifier on `00 01`); BIP 143 numbers the bytes that feed each preimage item and lays out the 10-item preimage with the outside items dashed. Status line, desc, exact values. | native-p2wpkh, p2sh-p2wpkh | two-ids, empty-witness, p2wpkh, fixture-inputs |
| A03.5 | `nested-input.v1` **new** | The P2SH-P2WPKH input: a scriptSig that pushes the 22-byte witness program (its push opcodes split from what they push: version 0, push 20, key hash) and a two-item witness. | p2sh-p2wpkh | p2sh-nested, p2wpkh, fixture-inputs |
| A03.6 | `weight-meter.v1` (was a bar chart) | Bytes projected into weight: each base byte stretched ×4, each witness-related byte ×1, to one scale for both examples; 3 × base + total, ⌈÷ 4⌉. | both | weight-units, tx-weight, examples-published, examples-reproduced |
| A03.7 | `sighash-reuse.v1` **new** | Schematic: the original digest hashes the whole transaction once per input; BIP 143 hashes three summaries once and then one fixed-shape preimage per input. No values. | — | quadratic, hash-reuse, summary-hashes |
| A03.8 | `bip143-preimage.v1` **new** | The ten-item preimage of the mixed example's input 1 as a packet on a 32-byte ruler; the three summary hashes yellow; the amount outlined "not in the transaction"; the sighash. Exact items in a disclosure. | native-p2wpkh | ten-items, amount, scriptcode-p2wpkh, examples-reproduced |
| A03.9 | `amount-storyboard.v1` **new** | Storyboard, 3 frames: an offline signer sees the outpoint but no amount; the amount is supplied and lands in item 6 of the digest; a different amount gives a different digest, so the signature fails. | native-p2wpkh | cold-wallet, amount |

Was 3 figures (A03.1 bar chart, A03.2 card hero + `TxWorked` tab, A03.3 bar chart); now 1 hero + 8 static drawings.

## PSBT (A05) — figure plan

Every value comes from `derivePsbtTrace` (tested `psbt` model, BIP 174's published trace reproduced byte for byte). New derived data, fail-closed: the magic bytes checked against the model; the Combiner run in both orders with the same result; the signer's amounts (inputs from the non-witness UTXO or the witness UTXO record, outputs, fee; the build throws on a negative fee); the non-witness UTXO check (computed txid = prevout txid, display order checked against BIP 174's own text).

| Fig. | Recipe | Drawing | Fixtures | Claims |
|---|---|---|---|---|
| A05.1 | `psbt-layout.v1` (was a byte bar) | The Creator's PSBT on a byte ruler: magic, one global record, the 0x00 that closes each map. | bip174-trace | maps, creator, trace-published |
| A05.2 | `psbt-records.v1` **new** | Two records of one type in input 0: key = type byte + the signer's public key, so the keys differ. | bip174-trace | key-structure, signer, no-duplicates |
| A05.3 | `psbt-envelope.v1` (hero, drawing-first) | A role track (computers; the signers' fork drawn as one arc above and one below, non-ancestors faded) over the envelope as map cards. Stepper through the eight published states; strip "added by this role / since the Creator". New records in a black type chip, cleared ones struck through, unknown types dashed. | bip174-trace | updater, signer, combiner, finalizer, trace-reproduced |
| A05.4 | `psbt-role-story.v1` **new** | Storyboard, one frame per state, one cell per record. Replaces the retired `PsbtWorked` tab. | bip174-trace | creator … extractor, trace-published |
| A05.5 | `psbt-signer-display.v1` **new** | What a signer can show: amounts per input with their source, outputs, the fee resting on the claimed witness-UTXO amount. | bip174-trace | signer-display, bip143-fee-issue, updater, signer-view |
| A05.6 | `psbt-utxo-check.v1` **new** | The non-witness UTXO hashed into a txid machine; it matches the prevout of input 0 (both orders shown). | bip174-trace | signer-txid-check, signer-view |
| A05.7 | `psbt-combine.v1` **new** | Two signers' copies of input 0, each with one signature, merged in either order. | bip174-trace | combiner, combine-order, trace-reproduced |
| A05.8 | `psbt-finalize.v1` **new** | Before/after the Input Finalizer: UTXO kept, final scripts added, the rest struck. | bip174-trace | finalizer, trace-reproduced |
| A05.9 | `unknown-fields.v1` (redrawn) | Dashed records this decoder does not understand survive a combine. | unknown-combine | unknown-combine, passthrough, combiner |

Was 3 figures (layout, card hero + `PsbtWorked`, unknown fields); now 1 hero + 8 static drawings. New ledger claim `signer-view` (computed-fixture, inference).

## P2SH (A09) — figure plan

Every value from `deriveP2sh` (tested `p2sh` recorder; every signature verified against the digest the model computed). New derived data, fail-closed: each stack item classified (empty, redeem script, witness script, DER signature, 33-byte key, 20-byte hash, number; anything else throws); the witness script; the legacy spend broken three ways and re-run (last redeem byte altered → hash check fails; an OP_DUP prefix → push-only fails; signatures swapped → the redeem script fails, with the model's own checks).

| Fig. | Recipe | Drawing | Fixtures | Claims |
|---|---|---|---|---|
| A09.1 | `p2sh-commitment.v1` (redrawn) | The lock as an opening object: a 23-byte output holding only a hash; the spend supplies the script, HASH160 gives the lock back. | bip174-legacy | template, scriptsig-form, trace-spends, spends-verified |
| A09.2 | `p2sh-shape.v1` **new** | Three redeem scripts (71, 34, 22 B) behind one output shape. | three pinned spends | template, scriptsig-form, spends-verified |
| A09.3 | `p2sh-stack-story.v1` **new** | Storyboard: the same pushed bytes hashed once as data, then run as a program. Replaces the retired `P2shWorked` tab. | bip174-legacy | rules, multisig-order, spends-verified |
| A09.4 | `p2sh-two-stage.v1` (hero, drawing-first) | Output box with a padlock; the redeem script hatched until revealed; stages as stack plates with a stepper. Strips: spend (neutral labels) and Before / Revealed. Before the spend nothing about the script leaks (labels, values, ids, valuetext, desc). | three pinned spends | rules, spends-verified, multisig-order, p2sh-witness, trace-spends |
| A09.5 | `p2sh-failures.v1` **new** | Three broken spends, each failing at a different stage. | bip174-legacy | tamper, rules, multisig-order |
| A09.6 | `p2sh-wrapped.v1` (redrawn) | scriptSig and witness of the three spends to one byte scale, with weight. | three pinned spends | sizes, weight, p2sh-witness |
| A09.7 | `p2sh-limit.v1` **new** | 520-byte push limit: 3 + 34 per key stops at fifteen keys. | bip174-legacy | limit-520, spends-verified |

Was 3 figures; now 1 hero + 6 static drawings. Ledger: `p2sh-witness` gained BIP 141 L91 and BIP 143 L27 quotes; prose numbers ("872 weight units against 358") tested in `packages/models/test/p2sh.test.ts`.

## Timelocks (A10) — figure plan

Every value from `deriveTimelockCase` / encoding / BIP-tx derivations (tested `timelock` model). New derived data: nLockTime as a UTC time, the low 16 bits and their 512-second reading, and field changes (absolute: nLockTime + 1, input made (non-)final; relative: version flipped, the input's bit 31 flipped), each re-run through the model; labelled "not a Core case" everywhere.

| Fig. | Recipe | Drawing | Fixtures | Claims |
|---|---|---|---|---|
| A10.1 | `timelock-ranges.v1` (redrawn) | nLockTime's 32 bits to scale, split at 500,000,000; the 16-bit relative value as blocks or 512-s units to one wall-clock scale. | bip68-encodings | two-kinds, bip68-type, bip68-ranges |
| A10.2 | `timelock-not-a-lock.v1` **new** | Storyboard, schematic: a future nLockTime locks nothing until the coin's own script says so (CLTV). | — | not-a-lock, nlocktime, cltv-abstract |
| A10.3 | `timelock-pinned-fields.v1` (redrawn) | Version, nSequence cells and nLockTime of four BIP 143/174 transactions, with the nLockTime and BIP 68 readings. | four pinned txs | pinned-reading, final-disables, bip68-version, bip68-disable |
| A10.4 | `timelock-fields.v1` (hero, drawing-first) | A gate: the coin's lock, the spending fields, a CLTV ruler split at the threshold (or two 32-bit rows for CSV), and BIP 65's / BIP 112's checks as lamps in order. Strips: lock kind, Core case, field change; toggle "compare height and time units". | 12 Core cases | core-cases, cltv-rules, csv-rules, csv-nop |
| A10.5 | `timelock-sequence-bits.v1` **new** | nSequence's 32 bits: disable flag, type flag, 16 value bits; the rest faded. | bip68-encodings | bip68-disable, bip68-type, bip68-mask, bip68-ranges |
| A10.6 | `timelock-csv-story.v1` **new** | Storyboard, one frame per BIP 112 check of Core case 127, outlining the bits each check reads. Replaces the retired `TimelockWorked` tab. | core-valid-127 | csv-rules, bip68-mask, core-cases |
| A10.7 | `timelock-mtp.v1` **new** | Schematic: eleven timestamps, sorted, the median picked by the model's `medianTimePast`. | — | mtp, mtp-why |

Was 3 figures; now 1 hero + 6 static drawings.

## Decision: pre-rendered heroes (no islands)

The four heroes were first built as Preact islands; that pushed the client bundle to 61.6 KB gzipped. They now render every state on the server (`packages/figures/src/heroStates.ts` for the spec: strips, one stepper, toggles, `showWhen`, `resets`, `sets`; `apps/site/src/components/HeroStates.astro` for the markup and a ~0.8 KB inline script that shows the matching state, mirrors its status into one `aria-live` region and sets `data-hydrated="true"`). The hero components are stateless; without JS the no-JS state and a note show and the controls stay hidden. Batch-2 figures are imported by subpath in `Figure.astro`, not via the package index, so none of their code reaches the shared island chunk.

Client JS (sum of gzipped `apps/site/dist/_astro/*.js`): **44.0 KB** + the 0.8 KB inline script, against 50.5 KB at the base commit (`9e386e5`). Measured on this branch alone; batches 1, 3 and 4 add their own.

## Independent reviews (read-only subagents with the ledger, model, derive, pinned BIP text and screenshots)

- **SegWit** — applied: witness-program terminology in A03.5; BIP 143's MAY kept as "can be" for summary reuse; a hash per input in the reuse schematic; dashed only for "not a field of the transaction"; the reserved value in the commitment (ledger quotes BIP 141 L72/L76); sighash name derived; continuation marks on wrapped packet fields; push opcodes split from what they push; end labels on the tape; labels ≥ 9 units; figure tests run the site's real `deriveTransaction`. Not changed: a few pre-existing prose sentences the reviewer thought thinly cited (their claims exist and pass the contract tests).
- **PSBT** — applied: fork drawn as two arcs (branches at 375), non-ancestors faded; cleared records struck through, not hatched; dashed kept for "only claimed / unknown type"; fee marked as resting on the claimed witness-UTXO amount; magic, key types and unknown types from derive; txids also in display order tied to BIP 174's text; Combiner checked in both orders at build time; computed-fixture claim `signer-view`; the Finalizer's SHOULD kept.
- **P2SH** — applied: nothing about the script leaks before the spend (neutral spend labels and state values, no stage ids, valuetext, stage reset); swapped-signature checks from the model; program checks drawn for wrapped spends; weights labelled scriptSig + witness; key count from the trace; arrows routed; ledger quotes for the native empty-scriptSig rule and BIP 143's scope; labels at 9 units.
- **Timelocks** — applied: an argument with bit 31 set is a no-op, not a passed "flag is clear" check (model label now "The argument's disable flag is set: no lock", a dash lamp, its own status); the unit layer says when BIP 68 gives nSequence no meaning (version 1 or bit 31 set); "flip input bit 31"; the CHANGED tag no longer overlaps the field name; the CLTV ruler says its halves are scaled apart and its labels stay inside at 0; A10.6 compares from the model's verdicts and outlines the bits each check reads instead of dimming (a dimmed 1 read as a 0); A10.5's mask label on two lines (clipped at 375); A10.3 gives the BIP 68 reading; years and mask computed; Core's comment marked as its group heading; caption no longer says "just an argument and the opcode" (some cases push a 1). Not changed: hero text size at 375 (measured: 9-unit labels in a 344-unit drawing render at about 8.5 px, as in the pilots); the blank band the hidden compare layer leaves; the hero's place in the CLTV section (the brief keeps prose edits to what figures need); "Bitcoin Core v29.0" in the source line (the tag recorded in `sources/external/external.lock.json`, not a computed value).
- **Found while auditing**: `HeroStates.astro` selected its stepper buttons by `data-step`, which the PSBT drawing also uses, so Next/Previous did nothing on PSBT. Renamed to `data-scrub-step`, scoped, and tested that no hero state uses the attribute names the script selects on.

## Checks

- `pnpm test` (922 vitest + 36 Python), `pnpm check`, `pnpm build` green. Figure tests: segwit 15, psbt 14, p2sh 11, timelocks 13.
- Screenshots `review/screenshots/batch2/` (71): 1440 every figure and hero states, 768 hero, 375 hero and two dense figures, no-JS hero, per chapter. No overflow, console errors or external requests.
- Accessibility (`tools/a11y-tablet-audit.mjs`, axe-core, 768 and 1024): no violations for the hero (JS) or the page (JS and no JS) in all four chapters; `scrollWidth` equals the viewport; strips, stepper and summary reachable and operable by keyboard, changes announced through the live region (the timelock unit toggle only reveals a layer; its content is also in the drawing's description). Chromium only; no live screen reader.
