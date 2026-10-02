# BIP 322 interpreter: review follow-ups

These follow the independent review of `packages/models/src/interpreter.ts` (PR #3). That review found no must-fix issues: nothing that should be inconclusive or invalid was reported as valid. This change applies its should-fix items and nits.

| # | Finding | Change | Test |
|---|---|---|---|
| 1 | `OP_0` inside a tapscript was treated as out of scope (the tapscript decoder reports it without data). | `decode()` maps a tapscript `OP_0` to an empty push. | `OP_0 OP_DROP <x1> OP_CHECKSIG` is valid. |
| 2 | Scope was checked before the commitments, so an uncommitted script with an unknown opcode gave `inconclusive` instead of `invalid` (BIP 322 step 1 comes before step 2). | `plan()` checks scope only for scripts whose commitment holds: the HASH160 of the redeem script, the SHA-256 of the witness script, the control block of the tapleaf. Native SegWit with a scriptSig is rejected first. The leaf-version scope check also waits for the commitment. | Uncommitted witness script → invalid; uncommitted OP_SUCCESS leaf → invalid; native SegWit with scriptSig and an out-of-scope committed script → invalid. |
| 3 | The PUSHDATA1 redeem test passed for a reason other than its name. | It asserts the MINIMALDATA reason. A new case covers the single-push rule. | Extra push before the redeem script → "exactly one push". |
| 4 | Several routes were untested: annex, leaf version, OP_SUCCESS, non-32-byte tapscript key, P2SH-wrapped v1, non-push scriptSig (P2SH vs not), v1 program not 32 bytes, 201-op limit, tapscript budget, 520-byte element, hybrid key. Some tests asserted state only. | All now have tests with reasons. State-only assertions now include the reason. | `scope routes`, `consensus limits`, `tapscript details` blocks. |
| 5 | MINIMALIF in legacy scripts is stricter than Core's flags. | Documented in the module header. The BIP states the rule without that limit. | — |
| 6 | A redeem script pushed by `OP_1NEGATE` or `OP_1…16` was not scanned before running. | `plan()` reads the stack item a small-int opcode leaves. The verdict was already the same through the runtime fallback, so the deliberate-breakage run cannot tell the two apart; the test documents the behaviour. | Redeem `0x81` via `OP_1NEGATE` → inconclusive. |
| 7 | A truncated `OP_PUSHDATA1/2/4` decoded as a non-push opcode (out of scope) instead of a script error. | A strict `wellFormed()` check runs before decoding legacy and v0 scripts. | `OP_1 OP_PUSHDATA1` (truncated) → invalid. |
| 8 | The FindAndDelete approximation over-rejects. | The comment says so: it is a superset of Core's match. | — |
| 9 | Dead code and an unused import; the test helper used a push opcode as the BIP 143 scriptCode prefix. | Removed. The helper uses a compact-size prefix. The `bip322.test.ts` branches for unchecked types are gone, since every published vector is now checked. | — |
| 10 | Misleading test label. | Renamed: the CSV version failure is a consensus failure (step 1). | — |

**Deliberate breakage.** Each fix was reverted in turn: the tapscript `OP_0` mapping, scope after the witness-script commitment, scope after the tapleaf commitment, the `wellFormed` check, and the native scriptSig ordering. Each made at least one test fail. Reverting fix 6 does not, as explained above.

**Prose nit:** applied in the illustration rollout's closing PR, after batch 4 merged: `message-signing.json` now says the model "answers inconclusive for any script or spend shape outside what it covers".

`pnpm test` (887 vitest + 36 Python), `pnpm check` and `pnpm build` are green.
