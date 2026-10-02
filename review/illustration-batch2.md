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
| A03.5 | `nested-input.v1` **new** | The P2SH-P2WPKH input: a scriptSig that pushes the 22-byte program (magnifier: version 0, push 20, key hash) and a two-item witness. | p2sh-p2wpkh | p2sh-nested, p2wpkh, fixture-inputs |
| A03.6 | `weight-meter.v1` (was a bar chart) | Bytes projected into weight: each base byte stretched ×4, each witness-related byte ×1, to one scale for both examples; 3 × base + total, ⌈÷ 4⌉. | both | weight-units, tx-weight, examples-published, examples-reproduced |
| A03.7 | `sighash-reuse.v1` **new** | Schematic: the original digest hashes the whole transaction once per input; BIP 143 hashes three summaries once and then one fixed-shape preimage per input. No values. | — | quadratic, hash-reuse, summary-hashes |
| A03.8 | `bip143-preimage.v1` **new** | The ten-item preimage of the mixed example's input 1 as a packet on a 32-byte ruler; the three summary hashes yellow; the amount outlined "not in the transaction"; the sighash. Exact items in a disclosure. | native-p2wpkh | ten-items, amount, scriptcode-p2wpkh, examples-reproduced |
| A03.9 | `amount-storyboard.v1` **new** | Storyboard, 3 frames: an offline signer sees the outpoint but no amount; the amount is supplied and lands in item 6 of the digest; a different amount gives a different digest, so the signature fails. | native-p2wpkh | cold-wallet, amount |
