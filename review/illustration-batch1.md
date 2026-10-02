# Illustration batch 1: HD wallets, Wallet paths, Descriptors, Addresses

Branch: the batch-1 worktree branch. These four chapters were redrawn in the illustration-kit style approved on the two pilots (decisions D1–D5 in `review/decisions.md`). Each chapter has a figure plan written before building, then a record of the checks and the independent review.

## Palette decisions for this batch

- **Private keys** (k, WIF, xprv key data, the 00 ‖ k HMAC input): secret pink.
- **Public keys and public extended keys** (K, xpub): public green.
- **Chain codes: public green.** BIP 32 makes the chain code identical in the private and the public form of a node, and it travels inside every xpub. On its own it cannot spend. Pink would make every xpub look secret, which the chapter says it is not. Its label (`CHAIN CODE c`) is the second cue.
- **HMAC-SHA512 outputs** (I, I_L, I_R as raw bytes): hash yellow. Two exceptions, where the bytes *are* the result: the master split, where I_L is the master private key (pink) and I_R the master chain code (green). For a normal child, I_L stays yellow on purpose: anyone holding the parent's xpub can compute it, which is exactly BIP 32's weakness.
- **Fingerprints and Hash160 identifiers:** hash yellow.
- **Checksums** (Base58Check, descriptor checksum, Bech32/Bech32m): checksum purple.
- **Indices, depth, version bytes, script templates:** plain.
- **Not derivable or not known by this viewer:** hidden hatch, with no value anywhere.

## HD wallets (A02) — plan

| Fig. | Recipe | Kind | Drawing | Data | Claims |
|---|---|---|---|---|---|
| A02.1 | `master-key-split.v1` (redraw) | static, opening | Seed cells → HMAC-SHA512 machine (key tag "Bitcoin seed") → 64 cells cut in half: I_L pink (master private key), I_R green (master chain code). | tv1: seed, `masterIHex`, master xprv | master, vectors |
| A02.2 | `hd-extended-key.v1` **new** | static | An extended private key as an exploded stack of two plates (k pink, c green); N() lifts off the private plate and puts K in its place: (K, c). "CAN SIGN / CANNOT SIGN". | tv1 node m | extended-key, neuter, chain-code |
| A02.3 | `hd-child-story.v1` **new** (worked tab → storyboard) | storyboard, 4 frames | m/0H → m/0H/1: parent plates; HMAC machine keyed by c over K ‖ 00000001; I cut in half; I_L + k_par = k_child, I_R = c_child, matches the vector. | tv1 `hmacOutHex`, nodes | split, ckdpriv-normal, vectors |
| A02.4 | `hd-hmac-inputs.v1` **new** | static, pair | The two HMAC data layouts on a 37-byte ruler: normal = K_par (33 B) ‖ i; hardened = 00 ‖ k_par (32 B) ‖ i. Real bytes from m/0H/1 and m/0H. Magnifier on the index's top bit. | tv1 `hmacDataHex` | ckdpriv-normal, ckdpriv-hardened, indices |
| A02.5 | `derivation-tree.v1` (hero, redraw) | interactive | The tree as key glyphs on typed edges; hardened edges carry a gate. Strips: "You hold" m / M (switch public/private view), "Branch 1" normal / hardened (toggle hardened boundary), "Expand branch" (one edge, opened into a zoom box that shows what goes into its HMAC and whether this holder has it). | tv1, all nodes | ckdpub, pub-to-priv, reconstruction, vectors |
| A02.6 | `hd-two-routes.v1` **new** | static | Two routes to the same child public key: k → I_L + k → point(); K → point(I_L) + K. Meet at one K (build checks equality). | tv1 m/0H → m/0H/1 | ckdpub, equivalence |
| A02.7 | `hd-sharing.v1` **new** | static, schematic | Who holds what: a webshop server, an auditor and a business partner each hold a green xpub tag; none holds a pink key. "SEES PAYMENTS · CANNOT SPEND". | none (schematic) | webshop, webserver-breach, audits, b2b |
| A02.8 | `hd-weakness-story.v1` **new** | storyboard, 4 frames | xpub of m/0H + leaked k of m/0H/1 → recompute I_L → k_par = k_child − I_L → equals m/0H's key; the hardened gate above m/0H stops the climb. | tv1 recovery (derive throws on mismatch) | weakness, recovery-computed, hardened-reason |
| A02.9 | `extended-key-layout.v1` (redraw) | static | 78 + 4 bytes as two packets on 41-byte rows, xpub over xprv; the three fields that differ carry a heavy outline. Field values and both strings in a disclosure. | tv1 serialization of m/0H | serialization, chain-code |
| A02.10 | `hd-fingerprint.v1` **new** | static | Public key → Hash160 machine → 20-byte identifier → first 4 bytes → the child's parent-fingerprint field. | tv1 m, m/0H (`identifierHex`) | identifier, fingerprint-collisions |

Retired: `Bip32Worked`, its export and its `worked` dispatch line; its content is A02.3.

### HD wallets — independent review

A fresh read-only subagent recomputed every drawn value in pure Python (its own secp256k1, RIPEMD-160, hashlib and hmac): all four published chains, I for the master and both steps, the recovery of m/0H's key from its xpub and m/0H/1's private key, both checksums, the identifier and fingerprint, and CKDpub = CKDpriv for every normal child. **No wrong values.** It drove all 12 public-view hero states (branch 1 normal and hardened × every opened branch) at 1440 and 375 and scanned the hero's outer HTML: **no leaks** from the m/0H or m/1H subtrees and no private key anywhere in the M view.

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | `.atlas-hexlist dt` is uppercase, so disclosure labels turned k into K and m into M. | New `.atlas-hexlist--case` modifier (no transform) on every HD disclosure list. |
| 2 | must-fix | "CKDPUB STOPS" overprinted the 0H edge label in the M view. | Index labels sit on the inner side of an edge, gate labels on the outer side. |
| 3 | should-fix | A02.4's magnifier pointed at bytes 2–3 of the index and clipped its text. | Source on the first byte; the bit reading moved below the lens. |
| 4 | should-fix | Several labels rendered below 9 px. | Every label in the HD figures is now at least 9 units. |
| 5 | should-fix | The hero's magnifier glyph collided with node labels. | Placed at the edge's middle, outer side (inner side on a closed gate). |
| 6 | should-fix | Status wording for out-of-reach branches was circular; "M DOES NOT HOLD" was incomplete. | "lies across the hardened edge into …"; "M HOLDS NONE" / "M HOLDS NO KEY OR c HERE". |
| 7–12 | nits | "LISTED ON" lines; the K ‖ i bar all green; "m · SAFE"; the breach line dropped BIP 32's "at most"; the serialization title sat far from its rows; the chain-code engraving was hidden. | "IN THE XPUB AND XPRV ON …"; K and index split; "m · NOT RECOVERABLE"; "AT MOST SEES INCOMING PAYMENTS"; row labels beside each packet; engraving moved. |
| 13 | nit | The hero caption describes the M view while the hero opens in the m view. | Kept: the caption names the state ("Holding M, …") and the first strip switches to it. |
| 14 | note | The island's props carry every node's private key, as the m view needs them. | Recorded here. All of it is BIP 32 test vector 1, public test material. |

## Wallet paths (A12) — plan

| Fig. | Recipe | Kind | Drawing | Data | Claims |
|---|---|---|---|---|---|
| A12.1 | `wallet-path-levels.v1` (redraw) | static, opening | BIP 44's first example as a ribbon of six segments: m pink, three hardened (gate mark), two public (green); "HARDENED / PUBLIC" brackets and the account line; level names on staggered leaders; the table's own reading of the path. | `bip44-paths` (examples table parsed in derive) | levels, purpose, coin-type, account, change, index |
| A12.2 | `wallet-discovery.v1` **new** | storyboard, 3 frames, illustrative | Account discovery: scan account 0′'s external chain; stop a chain after the gap limit of unused addresses; account 1′ has no history → stop. Used addresses are made up and labelled so. | gap limit read from BIP 44 line 124 | discovery, gap-limit, account |
| A12.3 | `wallet-path-examples.v1` **new** | static | All 16 paths of BIP 44's examples table as the tree they form; the two paths the prose names drawn heavy; words from the table's columns. | `bip44-paths` examples | examples, coin-type, account, change |
| A12.4 | `wallet-path-walk.v1` (hero, redraw) | interactive | The path as an exploded stack of six plates; a stepper lights one plate at a time and the last step builds the address (P2WPKH, P2TR, or "BIP 44 names no script"). Strips: scheme (BIP 84 / 86 / 44), receive 0 / receive 1 / change 0. | 3 fixtures | vectors, levels, xpub-exposure, script-by-purpose |
| A12.5 | `wallet-xpub-reach.v1` **new** | static | BIP 84's account xpub and its two public chains, every published address re-derived from the xpub alone, each with its BIP line. | `bip84-vectors` (`fromXpubMatches`, derive throws otherwise) | xpub-exposure, vectors |
| A12.6 | `wallet-p2tr-story.v1` **new** (worked tab → storyboard) | storyboard, 4 frames | BIP 86: 33-byte key → drop the parity byte → TapTweak with no scripts → 5120 ‖ Q and the bech32m address (line 100). | `bip86-vectors` | b86, vectors |
| A12.7 | `wallet-spend-layouts.v1` **new** | static, schematic | Empty scriptSig; witness plates: signature + public key (BIP 84), signature alone (BIP 86). | none | spend-layouts |
| A12.8 | `wallet-path-schemes.v1` (redraw) | static | Three identical towers under 44′, 84′, 86′; at the bottom what each BIP fixes (script, version bytes) and the first receiving key, unrelated under each purpose. | 3 fixtures | script-by-purpose, b84, b86, b84-versions, same-seed, vectors |

Retired: `WalletPathWorked`; its content is A12.6. Added to `deriveWalletPath`: BIP 44's examples table (throws unless it has 16 parseable paths) and its gap limit (throws if the line moves).

## Descriptors (A13) — plan

| Fig. | Recipe | Kind | Drawing | Data | Claims |
|---|---|---|---|---|---|
| A13.1 | `descriptor-sentence.v1` **new** (opening) | static | BIP 382's ranged wpkh() as a sentence of parts, each named on a leader: script expression, key origin (yellow: a fingerprint), key (green), derivation, range, and the optional `#`. | `bip382-wpkh-ranged` tokens | structure, key-expr, ranged, solution |
| A13.2 | `descriptor-nesting.v1` **new** | static | sh(wpkh(xprv…)) as boxes inside boxes with each template, read outside in; pink xprv flagged as a secret; the child-0 P2SH script. | `bip382-sh-wpkh-xprv` | script-expr, b381, b382, secret-or-not |
| A13.3 | `descriptor-template.v1` **new** | static | pkh(): key → HASH160 → the one slot of the template; template rows beside the published bytes (76 a9 14 … 88 ac). | `bip381-pkh-origin` | templates, b381, expansion-tested |
| A13.4 | `descriptor-spellings.v1` **new** | static | Three BIP 381 spellings (' or h; WIF or public key) converge on one script. | `bip381-pkh-origin-wif` (**new fixture**, line 78), `bip381-pkh-origin` (80), `bip381-pkh-origin-h` (**new fixture**, line 82) | origin-no-effect, key-expr |
| A13.5 | `descriptor-anatomy.v1` (hero, redraw) | interactive | The descriptor as nested boxes (one per script expression and script tree), keys split into origin / key / derivation / range; output scripts beside it; strips for descriptor and key, a button to check the checksum. | 8 fixtures | expansion-tested, key-expr, ranged, structure, secret-or-not, not-authentication |
| A13.6 | `descriptor-read-story.v1` **new** (worked tab → storyboard) | storyboard, 4 frames | Template → origin → xpub/1/2/* fanning to three child keys → three scripts as BIP 382 lists them. | `bip382-wpkh-ranged` | ranged, expansion-tested, templates |
| A13.7 | `descriptor-checksum.v1` (redraw, moved from the opening to the checksum section) | static | raw(deadbeef): characters shaded by group with their positions, lines into the symbol row (group symbols outlined), POLYMOD machine, #89f8spxm. | `bip380-raw-valid` | checksum-expand, charset, checksum-tested |
| A13.8 | `descriptor-typo-forgery.v1` **new** | static | Valid vector; the one-letter typo rejected; the same typo with a recomputed checksum, which passes: no key involved. | `bip380-raw-valid`, `bip380-raw-typo` | checksum-tested, not-authentication, checksum-cases |
| A13.9 | `descriptor-expressions.v1` (redraw) | static | BIP 380's index as a map: expressions × contexts (top, in sh(), in wsh(), in tr()), a mark where the model allows it; BIPs 390/392 rows hatched. | `bip380-index` | index, b381–b386 |

Retired: `DescriptorWorked`; its content is A13.6. Prose change: "The figure checks BIP 380's own example…" → "Fig. A13.8 below checks…", because the checksum figures moved. New fixtures are copied from BIP 381 lines 78 and 82; the build re-checks each quote and expansion.

### Wallet paths — independent review

A fresh read-only subagent recomputed, in pure Python from the "abandon … about" mnemonic, every root, account and leaf key, parent fingerprint, HASH160, TapTweak, output key, scriptPubKey and address of all nine paths, and the BIP 44 computed account xpub. **All values matched**; all 18 shortened values have an exact disclosure in their figure; no private key is in any island's props; 18 hero states were checked. (A first review attempt stopped on an API rate limit and was re-run.)

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | The hero caption said "Hatched levels are hardened"; no plate is hatched (hatch means unknown). | "A black tab marks a hardened level." |
| 2 | must-fix | A12.7 overflowed its viewBox; at 375 a plate overprinted the BIP 86 title. | Heights 184 (wide) and 324 (narrow); second stack moved down. |
| 3 | must-fix | A12.8 text clipped ("none ne") and ran together. | The version-byte line split in two ("xpub / xprv" over "NONE NEW"; "—" over "NOT ADDRESSED"). |
| 4 | must-fix | A12.3 legend clipped at 375. | One legend line per level. |
| 5 | should-fix | A12.8 used colour alone for hardened vs public plates. | The same black tab as the hero and A12.1. |
| 6 | should-fix | "The towers differ only at top and bottom" suggested shared coin/account nodes. | "Same levels and indices; every key below the purpose differs"; caption to match. |
| 7 | should-fix | BIP 44's keys (from BIP 84's mnemonic) were disclosed only in the source line. | A12.8 marks the BIP 44 key with * and a footnote; the hero says so at every BIP 44 step and in the status. |
| 8 | should-fix | Step 0 drew a pink key next to "public key …". | Always a green glyph there; the pink m plate already marks the master. |
| 9 | should-fix | The gap limit was stated as a present rule. | "BIP 44 gave the gap limit as 20 …", "GAP LIMIT 20, AS BIP 44 GAVE IT". |
| 10 | should-fix | "no scripts" / "P ONLY" could read as no script commitment. | "TapTweak of P alone"; "HASH OF P ALONE: AN UNSPENDABLE SCRIPT PATH"; status wording to match. |
| 11–16 | nits | "P = x(key)"; the "32 B" bracket under the 0x20 byte; "PUBLIC" bracket and unlabelled account line; chain labels running together; "ACCOUNT XPUB" over a zpub; the narrow xpub label crowding a tag. | "P = lift_x(x)"; "PUSH 32"; "PUBLIC DERIVATION" and "ACCOUNT LINE"; chain labels inside each V; "ACCOUNT XPUB (ZPUB)"; the narrow label moved under the stack. |
| 17 | nit | Some 9-unit labels render at 8.8 px at 375. | Kept: the spec sets labels at 9–9.5 units; same convention as the HD review. |
| 18 | nit | Odd-length storyboards leave a gap at 1440. | Kit behaviour, not changed here. |
