# Editorial revision: four chapters

2 October 2026. User-requested revision of repetitive figures and impersonal prose in PSBT, Taproot, Silent Payments and v2 Transport. BIP 39 is unchanged.

## Reading experience

Each chapter now starts with the problem a reader can recognise, followed by its mechanism. Exact rules, vector accounting and secondary qualifications remain in disclosures and the evidence ledger. Captions describe what to notice instead of repeating the paragraph above them.

| Chapter | Main prose, before → after | Figures, before → after | Opening illustration |
|---|---:|---:|---|
| PSBT | 1,184 → 934 words | 9 → 8 | Two independently signed documents merge; private keys stay with the signers. |
| Taproot | 1,295 → 957 words | 7 → 7 | Two spend receipts contrast what reaches the blockchain. |
| Silent Payments | 1,184 → 975 words | 7 → 6 | A public address leads to an output the receiver finds by scanning. |
| v2 Transport | 1,201 → 951 words | 9 → 7 | Passive listeners and an active intermediary occupy different network positions. |

`content/reading-policy.json` records a scoped 900–1,400 word range for these four main narratives. The original catalogs remain unchanged. The removed supporting figures are no longer in the reading path; their recipe implementations and tests remain available. PSBT's full merge records and Silent Payments' address encoding are still expandable under their new opening scenes.

## Technical checks

- No models, source snapshots, evidence quotes or public fixtures changed. All ledger claims are still cited; the content validator checks their exact source text and references.
- Opening figures use the existing derived signatures, output keys, script proofs and scan matches. The transport topology is explicitly schematic and displays no invented wire bytes.
- PSBT preserves the distinction between optional signer display, required checks and finalizer SHOULD rules. Taproot distinguishes already-public Q from witness disclosure and names the omitted optional annex. Silent Payments identifies the receiver's private scan key, public spend key and input information; the match is the receiver's knowledge. v2 retains lack of peer authentication and visible traffic sizes/timing.
- Numeric prose assertions were updated for the revised wording; vector arithmetic and byte-for-byte checks remain. Fixture counts now check the actual interactive figure's fixture list instead of requiring boilerplate sentences.
- `pnpm check`: passed. `pnpm test`: 1,107 Vitest tests passed, one pre-existing skip; all 36 Python tests passed. `pnpm build`: all 53 pages built. After resetting review status, all 150 chapter contract tests and the build passed again. `git diff --check`: clean.
- The built client JavaScript totals 44,479 gzip bytes, below the 60 KB budget.

## Browser verification

Captured and visually inspected all four opening figures at 1440-pixel desktop and 375-pixel mobile widths using the local production build. No page horizontal overflow at either width. PSBT's role stepper and merge disclosure work. Silent Payments' address disclosure and sender/receiver/observer controls work. Taproot's proof-only view and v2's handshake stepper work on mobile. No browser warnings/errors were reported during the Silent Payments check. Server-rendered static/no-JavaScript behavior is covered by the existing figure tests; a separate JavaScript-disabled browser run was not performed.

Screenshots are in [editorial-four-chapters](editorial-four-chapters/), including mobile hero states. They are candidate captures, not approved visual baselines.

## Review state

This pass includes an author check against the existing ledger and pinned rules, not a fresh independent technical review. The four chapters were reset to `draft-unreviewed` so the earlier review label does not imply approval of these rewrites. No deployment, commit or push was performed.
