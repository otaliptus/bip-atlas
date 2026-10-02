# Factual audit fixes — 2 October 2026

Applied the seven items in the user-supplied factual audit against application baseline `6671162`. The source snapshots remain pinned to `bitcoin/bips` commit `3a10b5b5f0a7586df8928d580a3009744ebb2079`.

| Item | Resolution | Evidence checked |
|---|---|---|
| 1. Basic-filter misses | Qualified both explanations and the `scope-of-miss` ledger claim to the included set of a correctly constructed filter. Named empty scripts and OP_RETURN outputs as exclusions. | BIP 158 L60–63, L270–275. |
| 2. Wrapped SegWit byte layout | A03.5 now names OP_0, the push-length opcode and program bytes. P2SH distinguishes 22/34-byte redeem scripts from 20/32-byte witness programs. The numerical tests check both prefix opcodes and both lengths against the pinned spends. | BIP 141 L84–88, L92; BIP 143 L216; BIP 174’s final role-trace spend. |
| 3. Relative-time anchors | Stated the exact comparison between the candidate spending block’s parent MTP and the coin’s confirmation block’s parent MTP plus the delay. Updated `bip68-age` with the defining source lines. | BIP 68 L46–51; existing `relativeSatisfied` boundary tests. |
| 4. xpub versus server compromise | Narrowed the disclosure statement to the xpub alone. Added address substitution and diversion of future payments as an explicitly identified operational inference. | BIP 32 L36, L189; new `server-address-substitution` editorial claim. |
| 5. Account discovery versus recovery | Scoped external-only scanning to account discovery and stated that recovery also includes internal/change outputs. Recorded that distinction as an inference. | BIP 44 L88–94, L108–112, L124–130; new `recovery-change` editorial claim. |
| 6. Output key versus witness | Taproot prose and A07.5 distinguish the already-published output key from the signature and optional annex supplied by a key-path witness. A14.1 makes the same key/signature distinction for its MuSig2 test vector. | BIP 341 L61–65; BIP 327 L38–41. |
| 7. Methodology coverage | Added an entry for every chapter, separating published material, additional checks, and limits/supplied values. Documented narrow trace recorders, synthetic histories, the skipped optional full Core sweep, supplied ElligatorSwift decodings and partial BIP 322 verification. Explained that quote fidelity does not validate an inference. | Model and figure test suites, plus publication contracts. |

The methodology loader fails if a published chapter lacks a complete coverage entry; a contract test requires the coverage inventory to match the chapter inventory. The page’s Core excerpt links now target the actual upstream file paths rather than descriptive text from the lock file.

No protocol model, fixture, pinned source or kit original was changed. Chapters retain `in-review`, and `noindex` remains in place. These fixes have been checked locally; this record does not constitute human sign-off or an independent review of the revised chapters.

## Verification

- `pnpm check`: exit 0.
- `pnpm test`: 1,106 Vitest tests passed, one skipped; 36 Python tests passed.
- `pnpm build`: exit 0, 53 pages. The existing dependency annotation warning remains non-fatal.
- Client JavaScript: 44,715 bytes gzip-9, below the 61,440-byte budget.
- Browser checks on all eight edited chapters at 1440, 768 and 375 pixels: corrected text present, no page-level horizontal overflow or page errors.
- Methodology: all 18 rows render; desktop table fits its region; mobile overflow is confined to the focusable table region and ArrowRight scrolls it. All 18 rows also render with JavaScript disabled at 375 pixels without page overflow.
- Inspected desktop and mobile methodology screenshots. This was a layout and keyboard check, not a new axe audit or live screen-reader session.

## Pinned specifications

[BIP 158](https://github.com/bitcoin/bips/blob/3a10b5b5f0a7586df8928d580a3009744ebb2079/bip-0158.mediawiki), [BIP 141](https://github.com/bitcoin/bips/blob/3a10b5b5f0a7586df8928d580a3009744ebb2079/bip-0141.mediawiki), [BIP 68](https://github.com/bitcoin/bips/blob/3a10b5b5f0a7586df8928d580a3009744ebb2079/bip-0068.mediawiki), [BIP 32](https://github.com/bitcoin/bips/blob/3a10b5b5f0a7586df8928d580a3009744ebb2079/bip-0032.mediawiki), [BIP 44](https://github.com/bitcoin/bips/blob/3a10b5b5f0a7586df8928d580a3009744ebb2079/bip-0044.mediawiki), [BIP 341](https://github.com/bitcoin/bips/blob/3a10b5b5f0a7586df8928d580a3009744ebb2079/bip-0341.mediawiki), [BIP 327](https://github.com/bitcoin/bips/blob/3a10b5b5f0a7586df8928d580a3009744ebb2079/bip-0327.mediawiki).
