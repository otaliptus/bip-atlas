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
