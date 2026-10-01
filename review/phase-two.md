# Phase two — review record

Date: 1 October 2026. Status: **three draft chapters, awaiting human sign-off.** Every chapter's `reviewState` is `in-review`; `noindex` stays on. Screenshots in `review/screenshots/` are candidates, not approved baselines.

| Chapter | BIP | Hero figure | Default-path words | Independent review |
|---|---|---|---|---|
| Schnorr | 340 | `schnorr-verification.v1` | WORDS_SCHNORR | 6 should-fix + 5 nits, all applied |
| Taproot | 341 | `taproot-commitment.v1` | WORDS_TAPROOT | 1 blocking (figure leak) + 8 should-fix + 8 nits, all applied |
| Tapscript | 342 | `tapscript-trace.v1` | WORDS_TAPSCRIPT | TAPSCRIPT_SUMMARY |

## Sources

- `bitcoin/bips` at `3a10b5b5f0a7586df8928d580a3009744ebb2079` (unchanged): `bip-0340/test-vectors.csv`, `bip-0341/wallet-test-vectors.json`, and the three BIP texts.
- New external pin: six cases of Bitcoin Core's `unit_test_data/script_assets_test.json` from `bitcoin-core/qa-assets` at commit `0739b29cfb99e8de42298f550e9cdbf1a7659dcf` (full file 9,243,520 bytes, SHA-256 `cd789a58…f095`, 2,244 cases). BIP 341 L304 links this file (on `main`, which is not an acceptable pin, so a commit was resolved). Only an excerpt is committed: `sources/external/core-script-assets-excerpt.json`, produced by `tools/extract-script-assets.mjs`, which refuses to run unless the full file's hash matches. The lock records both the excerpt's hash and the upstream file's.
- BIP 342 L144 says BIP 341's test vectors "also contain examples for Tapscript execution". The pinned wallet-vector file has tapscript leaves but no script-path spends, so nothing there can be executed; the chapter says so.

## What the tests establish

- **BIP 340:** all 19 CSV vectors through a step-by-step `Verify` built on `@noble/curves` (lift_x, point arithmetic, tagged hash), each cross-checked against noble's own `schnorr.verify`; the failing stage of each invalid vector; the 8 vectors with secret keys reproduce their signatures (test-only helper); p and n match the BIP text; x ≥ p, r = p − 1, s = n − 1 edge cases; messages of 0, 1, 17, 32 and 100 bytes; every message swap in the hero fails at even-y or x-match.
- **BIP 341:** all 7 scriptPubKey vectors (leaf hashes, Merkle root, tweak, output key, scriptPubKey, BIP 350 address, control blocks); every control block passes the BIP's commitment check for its own leaf and fails for other leaves, a flipped parity bit and another output key; all 7 key-path inputs (internal key, tweak, tweaked secret key, SigMsg, sighash and the published witness signature, byte for byte); SigMsg length formula for every hash type; undefined hash types, SINGLE without an output and an explicit 0x00 sighash byte rejected.
- **BIP 342:** for each of the 6 reviewed Core cases, the recorder's verdict on both the success and the failure witness matches Core's label, every control block verifies, and the failure stops where the prose says; sigops budget arithmetic; OP_SUCCESSx ranges equal the BIP's list; unsupported opcodes (OP_ADD, OP_CODESEPARATOR, OP_CHECKLOCKTIMEVERIFY), key-path spends and non-0xc0 leaves throw `TraceScopeError`; a one-byte change to the transaction makes a valid signature fail.
- **Optional sweep (not run in CI):** with `SCRIPT_ASSETS_FULL` pointing at the full pinned file, the recorder is run on every TAPROOT case. In this session it accepted 761 witnesses and agreed with Core's label on all 761; the other 1,960 were refused as out of scope; nothing crashed.
- **Every chapter:** the shared content contracts (schema, catalog agreement including the exact allowed controls, word range, every claim cited, every quote verbatim, every fixture tied to a pinned line or external file, fixture kinds) and prose-number tests.
- **Build fails closed** when a Schnorr fixture differs from its CSV line, a Taproot fixture differs from the wallet vectors, a Tapscript fixture differs from the pinned excerpt, or the excerpt's hash differs from the lock (each checked by deliberately corrupting it in this session).

### Deliberate breakage (each restored afterwards)

| Model | Breakage | Tests failing |
|---|---|---|
| schnorr | public key left out of the challenge hash | 11 |
| schnorr | even-y check on R skipped | 2 |
| schnorr | r bounded by n instead of p | 1 |
| taproot | TapBranch children not sorted | 5 |
| taproot | parity bit not compared | 1 |
| taproot | compact_size left out of TapLeaf | 6 |
| taproot | sha_outputs included under SIGHASH_SINGLE | 3 |
| tapscript | MINIMALIF not enforced | 1 |
| tapscript | empty signatures charged to the budget | 2 |
| tapscript | unknown key types verified as BIP 340 keys | 2 |
| tapscript | codesep_pos 0 instead of 0xffffffff in the extension | 6 |

## Rendered checks inspected

Desktop 1440 and mobile 375 screenshots of each chapter's opening and the hero states that matter: Schnorr (valid, odd-y R, r = p, message swap, stage-by-stage reveal, challenge figure), Taproot (wallet view, proof-only for each path, key path, SigMsg), Tapscript (stepping, a failing witness, the budget figure). `scrollWidth` equals the viewport in every state, no page errors, no third-party requests. Every island renders its static equivalent without JavaScript. The three heroes are operable by keyboard (native radios and buttons). Client JS is about 29 KB gzipped in total, with no crypto code in the bundle. axe-core (WCAG 2.1 A/AA and best practice) reports no violations on the three chapters at 1440 and 375 px, after fixing a 4.45:1 label contrast in Fig. A07.1 and panel headings that skipped a level. The cover lists all eight chapters and `/bip/340–342/` resolve.

## Not verified

- Screen-reader sessions and 768–1024 px screenshots.
- Human editorial sign-off for any chapter.
- The BIP 342 signature-message extension (tapleaf hash, key version, codesep position) has no pinned vector of its own; it is exercised only through Core's labels on the recorded cases (a wrong extension makes them fail, as the breakage table shows).
- OP_CODESEPARATOR, the annex in script paths, CLTV/CSV and most arithmetic opcodes are outside the recorder's scope by design.

## Independent reviews

Each chapter was reviewed by a fresh subagent given the chapter, ledger, model, figures, derive checks, fixtures, pinned sources and the spec's misconception checklist, with instructions to recompute values and report findings by severity. Findings and what was done:

### Schnorr (BIP 340) — independent review
Reviewer: fresh subagent with the chapter, ledger, model, figures, pinned BIP text, CSV and test-vectors.py. It re-ran all 19 vectors through the BIP's reference.py step by step; every failing stage matched the model. No blocking findings; 6 should-fix, 5 nits — all applied:
1. "default, deterministic nonces" was wrong (default signer is not deterministic) → reworded to the BIP's "rand generation of the default signing algorithm, or any other deterministic method".
2. "every nonce must be fresh and unpredictable" → scoped to the rand value, with the BIP's strength ("uniformly random, not even partially predictable").
3. Ledger said four vectors carry secret keys; there are eight → fixed.
4. Five sentences lacked a supporting quote → added BIP340 L48, L77, L79, L60, L46 and BIP341 L142 spans.
5. "costs no security" overstated L84 → "not a reduction in security: at most a small constant faster".
6. Swapped-message traces were not cross-checked with noble → derive now asserts noble agrees on every trace shown.
Nits: non-malleability attributed to SUF-CMA as the authors state; message-size claim cites challenge-sizes and notes implementations may reject huge messages; "usually" → "for every valid vector in the figure" (tested); stage label "R is a point" → "R is not infinity"; v11 label → "r is no point's x"; vectors 8 and 11 added as x-match examples; ledger "not necessarily"; "exact test"; hero caption scoped to valid vectors; signForVector moved out of the models package into test code.
Deliberate breakage: dropping the key from the challenge → 11 tests fail; skipping the even-y check → 2; bounding r by n instead of p → 1.
Model finding: the CSV comment for vector 7 ("negated message") names how it was built; the first check it fails is even-y, not the x comparison.

### Taproot (BIP 341) — independent review
Reviewer: fresh subagent with the chapter, ledger, model, figures, derive checks, pinned BIP and wallet vectors. It re-derived the hero's node statuses for each leaf of vector 5 from the control blocks (all correct). 1 blocking, 8 should-fix, 8 nits — all applied:
1. **Blocking — figure leak.** In "Only the proof" mode the hero still drew tree structure a verifier cannot know: a sibling hash was labelled "TapBranch"/"Leaf A" and its children were drawn; key-path proof mode still drew the whole tree. Now a sibling is an opaque "Sibling hash (a leaf or a subtree: the spend does not say)", nothing below it is drawn, and key-path proof mode draws only Q and the signature (no internal key, root or tree boxes).
2. "Exact values" disclosed P, root, tweak and every leaf hash in every state → filtered to what the current view can know.
3. Hero caption and panel listed only script, key and siblings → now list script inputs, control byte (leaf version + parity) and internal key.
4. "The signature commits to the transaction, not to the tree" was misleading (SigMsg covers sha_scriptpubkeys, which contains q) → "names no leaf and reveals nothing about the tree".
5. "Aggregation is not … adding keys by hand" was unsupported → new editorial-analysis claim citing BIP341 L161, L164–165 (key cancellation; MSDL-pop's plain sum needs proofs of possession).
6. No-script rationale over-generalised → qualified ("some ways of sharing one key"; MuSig's randomized aggregation does not have the issue).
7. Fig. A07.1 caption read as a rule → "In both vectors…", and the no-script tweak is labelled a wallet recommendation, not consensus.
8. Ungrammatical opening sentence → split; activation attributed as the BIP's record.
9. "Every value the vectors publish" was not fully tested → tests now check each key-path input's published tweak and output key.
Nits: negation of the secret key when P has odd y; "Among several changes"; aggregation framed as the authors' assumption; control-block paragraph cites tweak-check; 65-byte sig with 0x00 is invalid and the annex SHOULD NOT be used (both added with quotes); privacy claim rescoped to author-rationale; model: verifyKeyPath returns false (not throws) for an undefined hash_type byte, ext_flag range-checked, hex inputs validated; hero equation uses p (bytes) not P.
Deliberate breakage: unsorted branch hashing → 5 tests fail; dropping the parity comparison → 1; omitting compact_size in TapLeaf → 6; including sha_outputs under SIGHASH_SINGLE → 3.
Note: the vectors' "sigMsg" field includes the 0x00 epoch byte in front of SigMsg as BIP 341 defines it; the tests account for this.

TAPSCRIPT_REVIEW_NOTES
