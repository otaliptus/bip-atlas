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
