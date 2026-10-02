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

### Descriptors — independent review

A fresh read-only subagent recomputed, in pure Python, BIP 380's checksum for all eight hero descriptors (symbol counts and checksums), the 18 symbols of raw(deadbeef), BIP 32 children, hash160s and every listed script, and confirmed both new fixtures are verbatim (BIP 381 lines 78 and 82). **No wrong values.**

| # | Severity | Finding | Change |
|---|---|---|---|
| 1 | must-fix | A13.1 labels ran past the viewBox and clipped at 375. | Labels right of centre read leftwards; text at 9.5 units; the checksum is labelled below. |
| 2 | must-fix | The hero's key panel overflowed at 1440. | Origin and "after the key" on separate lines. |
| 3 | must-fix | Children of a hardened range (`/*'`) were labelled 0, 1, 2. | 0′, 1′, 2′ in the hero, A13.2 and the disclosures. |
| 4 | should-fix | Keys under tr() were shown as 33-byte keys; BIP 386 serializes them x-only. | `deriveDescriptor` now gives the x-only key under tr() (`xonly` on the key view); the hero says "x-only". |
| 5 | should-fix | The whole origin was hash yellow. | Only the fingerprint is yellow; the steps are plain (hero, A13.1, A13.4, A13.6). |
| 6 | should-fix | A13.7 showed the group by colour alone, in checksum purple. | Neutral greys plus a "g0/g1/g2" label under each character; purple only for group symbols and the checksum. |
| 7 | should-fix | "No keys" had a public-key glyph; a rejected body used the hidden hatch. | No glyph without keys; a rejected body is a plain box marked "✕ REJECTED". |
| 8 | should-fix | A13.8's recomputed checksum looked like a third vector; the hero's computed checksum for descriptors without one was not marked computed. | "COMPUTED HERE, NOT IN BIP 380"; "COMPUTED HERE · NONE WRITTEN, WHICH IS ALLOWED". |
| 9 | should-fix | A13.3 shortened the origin with no exact value. | The descriptor is in the disclosure. |
| 10 | should-fix | A13.4 did not say what differs; one arrow left from row 3 only. | Per-row labels (WIF or public key, hardened as ' or h, line) and leaders from all three rows into the script. |
| 11 | should-fix | combo() scripts were tagged 1–4. | P2PK, P2PKH, P2WPKH, P2SH-P2WPKH. |
| 12 | should-fix | A13.1's derivation leader was a 2-unit tick; the # box had no label. | Fixed leader lengths; "CHECKSUM · OPTIONAL". |
| 13–15 | nits | ′ and h mixed; A13.6's note named /1/2/*; the push byte coloured as the hash; "HOLDS AN XPRV" hard-coded; every brace labelled "SCRIPT TREE"; the no-JS note and the hero caption. | ′ throughout drawings; "/1/2 steps down … the final /*"; push byte split out; wording from the key kind; inner braces "BRANCH", tr()'s first key "INTERNAL KEY"; note and caption reworded. |
| 16 | nit | Labels of 9 units render at 8.8 px at 375. | Kept at 9 units, the spec's label size (as in the other reviews). |
| 17 | nit | `descTree` popped on ")" or "}" without checking the box kind. | It now throws unless the closer matches. |
| 18 | nit | The figure test re-implements `deriveDescriptor`. | Kept: the pilot tests follow the same pattern; noted for a later shared helper. |

## Client JS budget: layered heroes

The coordinator set the batch budget at ≤ 1 KB net (the site total must stay under 60 KB with all four batches). The first drawing-first heroes cost about 1.7 KB more each than the card heroes they replaced (16.8 KB for the four, against 10.8 KB). So three heroes (HD wallets, Wallet paths, Descriptors), whose states are all known at build time, are now **layered**: the server renders every state's parts once, each tagged `data-when="key=value&…"`, and a small shared island, `StateHero` (`packages/figures/src/StateHero.tsx`, helpers in `heroLayers.ts`), holds the state, draws the strips, slider and toggle, shows the matching layers and announces a status line from a table computed at build time. Highlights that only restyle (the current plate, the highlighted key) follow `data-s-*` attributes through CSS. The Addresses hero stays a computing island, because a reader can change any character.

- Without JavaScript, the initial state's layers are the visible ones, so the static view is unchanged.
- Hidden layers are `display: none`, so assistive technology does not read them. As before, the island's props and the page source hold every state's values; for the HD hero the M view's layers are built from public values only, and tests check the visible M-view render for leaks.
- Measured after the batch: **49,523 bytes** gzipped across `apps/site/dist/_astro/*.js`, against about 51,860 before the batch: about 2.3 KB **less** than before.

## Addresses (A04) — plan as built

| Fig. | Recipe | Kind | Drawing | Data | Claims |
|---|---|---|---|---|---|
| A04.1 | `address-anatomy.v1` (redraw) | static, opening | BIP 173's example as a ribbon of character cells (prefix cyan for network, checksum purple, version outlined), each part bracketed and named; two-row narrow composition. | `v0-p2wpkh` via the bech32 model | string-shape, segwit-hrp, version-char, checksum-six, fixture-v0 |
| A04.2 | `address-alphabet.v1` **new** | static | The 32 data characters in value order (model's CHARSET) and the four left out, struck. | none | alphabet |
| A04.3 | `address-case.v1` **new** | static | Lowercase and uppercase spellings decode to one script; a mixed-case vector refused at the first stage. | `v0-p2wpkh`, `v0-upper` (**new fixture**, BIP 173 line 306), `mixed-case` | case-rules, fixture-v0 |
| A04.4 | `address-polymod-story.v1` **new** | storyboard, 4 frames | Characters → values; prefix expanded (high bits, 0, low bits); 5 + 39 values into POLYMOD; result 0x00000001. | `v0-p2wpkh` | checksum-computation, fixture-v0 |
| A04.5 | `address-checksum-lab.v1` (hero, redraw; still a computing island) | interactive | Ribbon with the edited cell dark and a caret; the decoder's six stages as gates (passed, stopped here, not reached = hatched); POLYMOD residue held against both constants; the scriptPubKey or "REFUSED · NO CORRECTED VERSION". Sample strip, position slider, next/previous letter, restore. | 4 lab fixtures | substitution-guarantee, no-correction, family-rule, fixture-typo, fixture-wrong-family |
| A04.6 | `address-typo-story.v1` **new** (worked tab → storyboard) | storyboard, 4 frames | Valid → one character changed (residue matches neither) → rejected without position → no "did you mean". | `v0-p2wpkh`, `v0-typo` | fixture-typo, no-correction, checksum-computation |
| A04.7 | `address-q-weakness.v1` **new** | static, schematic | q characters inserted before a final p, still valid; why v0 escaped. | none | q-weakness, v0-unaffected |
| A04.8 | `address-two-constants.v1` **new** | static | One POLYMOD, two accepted constants; v0, v1 and the wrong-family vector with their residues and verdicts. | `v0-p2wpkh`, `v1-32byte`, `v1-bech32-checksum` | bech32m-constant, family-rule, fixture-wrong-family, fixture-v1 |
| A04.9 | `program-regrouping.v1` (redraw) | static | Bits as black/white cells under byte brackets and over 5-bit groups with their values and characters; padding bits dashed. | `v0-p2wpkh`, `v1-32byte` | program-regrouping, padding-rule, fixture-v0, fixture-v1 |
| A04.10 | `address-script.v1` **new** | static | Version character → number → opcode byte, push length, program, for v0 and v1. | `v0-p2wpkh`, `v1-32byte` | script-opcodes, fixture-v0, fixture-v1 |

Retired: `AddressWorked`; its content is A04.6. Dead address CSS removed (ribbon, residue, script, regrouping, anatomy); the shared card-lab rules still used by other chapters' card heroes (`.atlas-pipeline`, `.atlas-stage`, `.atlas-choice`, `.atlas-panel`, `.atlas-lab__*`) stay.

### Addresses and the layered heroes — independent review

A fresh read-only subagent decoded all 13 address fixtures with its own BIP 173/350 reference Python (stage, residue and scriptPubKey all match the model), confirmed `v0-upper` is verbatim BIP 173 line 306, tried every single substitution on the lab samples (all stop at the checksum stage), and drove every state of the three layered heroes (24 HD, 63 wallet, 26 descriptor) at 1440 and 375: exactly one layer per group visible, status matching the drawing, no-JS showing only the initial state, and in the HD M view none of 29 sensitive values in any visible text, title/desc, status or open disclosure.

| # | Severity | Finding | Change |
|---|---|---|---|
| B1 | must-fix | Two descriptors without keys could not be selected: the strip fix-up in `StateHero` threw on a strip with no options. | The transition is now a pure, tested `nextState()` in `heroLayers.ts` that leaves an empty strip alone; tests switch to every descriptor and harden/unharden an opened m/1 branch. |
| A1 | should-fix | A04.7 said an inserted q "is refused" for v0; the BIP gives only the two-length reason, and 20 inserted q can make a valid 62-character v0 string. | "Only two lengths, 42 or 62 · a few inserted q give a length v0 forbids"; "checksum still valid". |
| A2 | should-fix | The lab caption said the decoder cannot learn where (Bech32m can locate errors). | "This decoder reports that the string is wrong, not where…". |
| A3 | should-fix | The live status read "Accepted Accepted: …". | The verdict chip is `aria-hidden`. |
| A4 | should-fix | Verdicts in A04.8 and the mixed-case label in A04.3 were typed by hand. | Built from the model's version, family and failed stage; A04.3 throws unless the reason is mixed case. |
| A5 | should-fix | Prefix and checksum in the lab ribbon were told apart by colour only. | Brackets "PREFIX" and "CHECKSUM" on the ribbon; "LAST 6 = CHECKSUM" in A04.4. The family gate says what the version needs. |
| A6 | should-fix | "A typo in the prefix is caught too" had no quote in the ledger. | The figure says "THE PREFIX IS CHECKSUMMED TOO"; `checksum-computation` now quotes BIP 173 lines 156–158. |
| A7 | should-fix | Two prose sentences overstate BIP 350 ("states … within one checksum family"; "overwhelming odds otherwise"). | **Not changed here:** both predate this batch and the brief limits prose edits to figure pointers. Flagged for the chapter's next editorial pass. |
| A8–A10 | nits | Ledger quotes for BIP 173 line 306 and BIP 350 line 208; figure claims citing the fixtures; crowded alphabet cells; "BLACK = 1" on one panel only; an unused import; no arrows from POLYMOD in A04.8. | All applied. |
| B2–B3 | nits | Circular HD status when the parent is itself the hardened node; "change 0" readable as chain 0. | "is a hardened child, which M cannot derive"; "change · index 0". |

Client JS after these fixes: **49,715 bytes** gzipped in total.
