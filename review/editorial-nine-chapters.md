# Nine-chapter editorial and figure revision

2 October 2026. The user authorized improvements to Tapscript, Version Bits, MuSig2, Block Filters, Message Signing, Schnorr, Wallet Paths, P2SH and HD Wallets, with particular emphasis on distinctive, useful figures and natural prose.

The five main revisions now start with the reader's question and keep detailed protocol rules, equations and source history in disclosures. The four lighter revisions remove repeated explanations and overlapping figures. Every chapter retains its interactive explorer, all evidence claims remain cited, and figure numbers follow reading order.

| Chapter | Main prose, before → after | Figures, before → after |
| --- | ---: | ---: |
| Tapscript | 1,271 → 646 | 10 → 7 |
| Version Bits | 1,149 → 693 | 9 → 5 |
| MuSig2 | 1,186 → 585 | 7 → 5 |
| Block Filters | 1,299 → 584 | 9 → 6 |
| Message Signing | 1,302 → 608 | 9 → 6 |
| Schnorr | 1,279 → 1,075 | 8 → 7 |
| Wallet Paths | 1,181 → 973 | 8 → 6 |
| P2SH | 1,173 → 881 | 7 → 6 |
| HD Wallets | 1,219 → 1,098 | 10 → 8 |

Word counts cover the default reading path, excluding disclosures, captions and tables. Chapter-specific reading targets are recorded in `content/reading-policy.json`; original catalogs and kit originals are unchanged. There are 56 figures across these chapters, down from 77. Removed placements retain their recipe implementations and model tests.

Six diagrams were redrawn:

- Tapscript: a clearly labelled symbolic two-of-three policy counts valid signatures and empty slots. The separate CHECKMULTISIG failure uses the recorded Core case, rather than the schematic's symbolic signature slots.
- Version Bits: counting, waiting and enforcement sit on opposite sides of the actual activation boundary. Recorded heights are distinguished from inferred preceding periods; no historical signal count is invented.
- MuSig2: private signer contributions converge into the one signature visible on chain. Individual public key values are omitted, secrets are only schematic labels, and the exact published result is disclosed separately.
- Block Filters: the shared filter enters the wallet, watched scripts stay local, and a possible match leads to an observable block request. Filter bytes and script counts come from the existing published fixture.
- Message Signing: the message and address define a challenge; a valid response does not by itself establish identity, freshness or a current balance. The diagram is explicitly schematic.
- Wallet Paths: one seed branches through different hardened purposes to different keys and outputs. BIP 44's lack of a specified output type remains explicit.

The two new dual-composition drawings use their available column width to select a readable layout, including desktop half-columns. Additional repairs cover MuSig2 signer labels and a repeated status sentence, Tapscript witness headings, P2SH weight labels, and a stale P2SH figure reference. The filter explorer has clearer choices, separate match and legend lines, a bit strip sized to its available width, and a dedicated empty-set view.

Validation:

- `pnpm check` passed.
- `pnpm test`: 1,109 Vitest tests passed, one existing skip, and all 36 Python tests passed. After the last caption and MuSig2 status edits, type checking and the affected MuSig2, BIP 322 and publication tests passed again.
- `pnpm build`: all 53 pages built. The existing dependency annotation warning is unchanged.
- `git diff --check` passed. Client JavaScript totals 44,632 gzip bytes, below the 60 KB budget.
- All nine chapters were checked at 1440 and 375 pixels. Document width matches the viewport; visible SVG text stays within it. Initial mobile label clipping in two retained figures was repaired and rechecked. Desktop half-column layouts were also inspected at 1024 pixels.
- Browser interactions checked Tapscript's rejected CHECKMULTISIG witness, BIP 8 activation with lock-in on timeout, MuSig2's three-tweak session, BIP 322's wrong-message rejection, and filter matches, misses, coded bits and the empty filter. No browser warnings or errors were reported.
- Screenshots and geometry results are in [editorial-nine-chapters](editorial-nine-chapters/). Existing tests cover server-rendered/no-JavaScript states; a separate JavaScript-disabled browser session was not run.

These are author and automated checks, not a fresh independent technical review. All nine chapters are marked `draft-unreviewed`. Source snapshots, evidence ledgers, fixtures and cryptographic models were not changed. Earlier edits and unrelated untracked files were preserved. No commit, push or deployment was performed.
