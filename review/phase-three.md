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
