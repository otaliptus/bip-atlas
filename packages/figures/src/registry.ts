/**
 * Registered figure recipes. A publication may only name recipes listed
 * here; each recipe's component is trusted code reviewed with this repo.
 * Static recipes are drawn by the table in statics.ts; each chapter's one
 * interactive hero is wired in apps/site/src/components/Figure.astro.
 */
export interface RecipeDefinition {
  id: string;
  description: string;
  minFixtures: number;
  maxFixtures: number;
  interactive: boolean;
  /** The hero's controls, as the chapter catalog lists them; empty for static figures. */
  controls: string[];
  /** Fixture kind the recipe draws; several allowed kinds are written "a|b". */
  fixtureKind: string;
}

type Count = number | [min: number, max: number];
const range = (n: Count) => (typeof n === "number" ? [n, n] : n);

/** A static drawing taking `fixtures` fixtures of `fixtureKind`. */
function fig(id: string, fixtureKind: string, fixtures: Count, description: string): RecipeDefinition {
  const [minFixtures, maxFixtures] = range(fixtures);
  return { id, description, minFixtures, maxFixtures, interactive: false, controls: [], fixtureKind };
}

/** A chapter's interactive hero, with the controls its catalog brief allows. */
function hero(id: string, fixtureKind: string, fixtures: Count, controls: string[], description: string): RecipeDefinition {
  return { ...fig(id, fixtureKind, fixtures, description), interactive: true, controls };
}

export const RECIPES: readonly RecipeDefinition[] = [
  // mnemonics
  fig("mnemonic-card.v1", "mnemonic", 1, "A public BIP39 test phrase laid out as a numbered backup card."),
  hero("entropy-word-pipeline.v1", "mnemonic", [2, 6], ["Choose public fixture", "Toggle 128/256-bit fixture", "Reveal 11-bit groups"], "Entropy and checksum bits cut into 11-bit groups and looked up as words."),
  fig("seed-derivation.v1", "mnemonic", 1, "Mnemonic and passphrase through PBKDF2-HMAC-SHA512 into a 64-byte seed."),
  fig("entropy-bits.v1", "mnemonic", 1, "The entropy of one public sample as a grid of bits beside its hexadecimal form."),
  fig("checksum-storyboard.v1", "mnemonic", 1, "Storyboard: entropy into SHA-256, the first bits kept as the checksum, appended to make n × 11 bits."),
  fig("wordlist-index.v1", "mnemonic", 1, "Eleven bits as a number that picks one card from a stack of 2,048, with the list's first entries."),
  fig("last-word-odds.v1", "mnemonic", 1, "All 2,048 candidate last words for a fixed prefix, the valid ones filled."),
  fig("passphrase-seeds.v1", "mnemonic", 1, "The same words with two passphrases: two unrelated 64-byte seeds."),
  fig("mnemonic-chain.v1", "mnemonic", 1, "Entropy, words, seed and keys as three separate steps."),

  // hd-wallets
  fig("master-key-split.v1", "bip32-seed", 1, "Seed through HMAC-SHA512, cut in half into master private key and chain code."),
  fig("hd-extended-key.v1", "bip32-seed", 1, "An extended key as two plates, key over chain code; neutering swaps k for K and keeps c."),
  fig("hd-hmac-inputs.v1", "bip32-seed", 1, "The HMAC data of a normal and a hardened step on one byte ruler, with the index's top bit."),
  hero("derivation-tree.v1", "bip32-seed", 1, ["Expand a branch", "Switch public/private view", "Toggle hardened boundary"], "A fixed BIP32 key tree seen with the master xprv or xpub, with a hardened boundary."),
  fig("hd-two-routes.v1", "bip32-seed", 1, "A normal child's public key by CKDpriv and by CKDpub, meeting at the same key."),
  fig("hd-sharing.v1", "bip32-seed", 0, "Schematic: parties that hold only extended public keys, and what each can do."),
  fig("hd-weakness-story.v1", "bip32-seed", 1, "Storyboard: a parent xpub plus a leaked normal child private key gives the parent private key."),
  fig("extended-key-layout.v1", "bip32-seed", 1, "The 78-byte extended key payload plus checksum of one node, public versus private, as packets."),

  // wallet-paths
  fig("wallet-path-levels.v1", "wallet-path-vector", 1, "BIP 44's first example path as a ribbon of six segments, hardened levels above the account line."),
  fig("wallet-discovery.v1", "wallet-path-vector", 1, "Storyboard, illustrative: account discovery and the gap limit, read from BIP 44."),
  hero("wallet-path-walk.v1", "wallet-path-vector", [1, 3], ["Choose a published path scheme", "Step through path levels", "Switch receive/change"], "Steps down a published BIP 44-shaped path level by level to the key and address, from BIP 84 and BIP 86 vectors."),
  fig("wallet-xpub-reach.v1", "wallet-path-vector", 1, "One account xpub and every published address below it, re-derived from the xpub alone."),
  fig("wallet-spend-layouts.v1", "wallet-path-vector", 0, "Schematic: the scriptSig and witness a BIP 84 and a BIP 86 spend carry."),
  fig("wallet-path-schemes.v1", "wallet-path-vector", 3, "The same five-level tower under purposes 44, 84 and 86, and what comes out at the bottom."),

  // derived-seeds
  hero("bip85-applications.v1", "bip85-vector", [2, 8], ["Choose an application", "Show what one leaked output reveals"], "One root key, a hardened path per application, HMAC-SHA512 to 64 bytes, and what each application makes of them."),
  fig("bip85-path.v1", "bip85-vector", 2, "Two published BIP 85 paths read level by level, the purpose number decoded as ASCII."),
  fig("bip85-story.v1", "bip85-vector", 1, "Storyboard: root key, hardened derivation to k, HMAC-SHA512, the bytes kept, the BIP 39 words."),
  fig("bip85-uses.v1", "bip85-vector", [3, 8], "Each application's own 64 bytes, filled where the application reads them."),

  // addresses
  fig("address-anatomy.v1", "address", 1, "One valid address as a ribbon of characters, its five parts bracketed and named."),
  fig("address-alphabet.v1", "address", 0, "Bech32's 32 data characters in value order, and the four left out."),
  fig("address-case.v1", "address", 3, "Lowercase and uppercase spellings of one address decode alike; a mixed-case string is refused first."),
  fig("address-polymod-story.v1", "address", 1, "Storyboard: data characters to values, the prefix expanded, polymod, a result of exactly 1."),
  hero("address-checksum-lab.v1", "address", [2, 6], ["Choose public address fixture", "Change one character", "Compare checksum families"], "Validation stages for public fixtures, with single-character substitution."),
  fig("address-typo-story.v1", "address", 2, "Storyboard: a valid address, one character changed, rejected without position or correction."),
  fig("address-two-constants.v1", "address", 3, "One polymod, two accepted constants, and a v1 program with the wrong family refused at the end."),
  fig("address-q-weakness.v1", "address", 0, "Schematic: q characters inserted before a final p leave a Bech32 checksum valid."),
  fig("program-regrouping.v1", "address", 2, "Witness program bits regrouped from 8-bit bytes into 5-bit characters."),
  fig("address-script.v1", "address", 2, "From address to output script: version character to opcode, then push length and program."),

  // payment-links
  hero("bip321-link-reader.v1", "bip321-uri", [2, 10], ["Choose a published example link"], "One of BIP 321's example links cut into its parts, decoded, and read by three illustrative wallets."),
  fig("bip321-anatomy.v1", "bip321-uri", 1, "One published link part by part, its message percent-decoded."),
  fig("bip321-case.v1", "bip321-uri", 2, "The lowercase and uppercase forms of one link, read alike."),
  fig("bip321-pop.v1", "bip321-uri", [1, 4], "Storyboard: BIP 321's proof-of-payment examples and what the wallet opens or refuses."),

  // p2sh
  fig("p2sh-commitment.v1", "p2sh-spend", 1, "The output as a box locked by a 20-byte hash; the redeem script hashes back to it."),
  fig("p2sh-shape.v1", "p2sh-spend", [1, 4], "Redeem scripts hashed into a fixed 23-byte output shape."),
  hero("p2sh-two-stage.v1", "p2sh-spend", [1, 4], ["Choose a pinned spend", "Step through both evaluations", "Reveal the redeem script"], "BIP 16's checks on pinned spends: push-only scriptSig, hash match, then the redeem script or witness."),
  fig("p2sh-failures.v1", "p2sh-spend", 1, "Storyboard: the same spend broken three ways, each failing at a different stage."),
  fig("p2sh-wrapped.v1", "p2sh-spend", [2, 4], "Where pinned P2SH spends carry their signatures: scriptSig or witness, with their weight."),
  fig("p2sh-limit.v1", "p2sh-spend", 1, "The 520-byte push limit and the fifteen-key multisig it allows."),

  // sorted-multisig
  hero("bip67-key-order.v1", "bip67-vector", 1, ["Choose the order the keys arrive in", "Sort the keys first"], "One vector's three keys in each of six orders, used as received or sorted first, with the script and P2SH address each gives."),
  fig("bip67-byte-order.v1", "bip67-vector", [1, 2], "Published vectors' sorted keys as bytes 1–3 and 33, the byte that decides between neighbours outlined."),
  fig("bip67-script-story.v1", "bip67-vector", 1, "Storyboard: sorted keys, the 2-of-n script byte by byte, HASH160, the Base58Check address."),
  fig("bip48-paths.v1", "bip48-example", [1, 3], "BIP 48's example paths level by level, hardened levels filled."),

  // segwit
  fig("two-serializations.v1", "transaction", 1, "Storyboard: the serialized tape hashed whole (wtxid), then without marker, flag and witness (txid)."),
  fig("witness-field.v1", "transaction", 1, "The witness section byte by byte: an empty field, then count, lengths, signature and key."),
  fig("witness-commitment.v1", "transaction", 1, "Schematic block: the txid tree into the header, the wtxid tree into a coinbase commitment."),
  hero("transaction-anatomy.v1", "transaction", [1, 4], ["Switch txid/wtxid preimage view", "Select a public transaction fixture", "Inspect BIP143 signing preimage"], "A serialized transaction on a byte grid, with txid, wtxid and BIP143 signing lenses."),
  fig("nested-input.v1", "transaction", 1, "A P2SH-wrapped P2WPKH input: the program pushed in the scriptSig, signature and key in the witness."),
  fig("weight-meter.v1", "transaction", [1, 4], "Bytes projected into weight: four units per base byte and one per witness-related byte."),
  fig("sighash-reuse.v1", "transaction", 0, "Schematic: the original digest hashes the whole transaction per input; BIP143 hashes summaries once."),
  fig("bip143-preimage.v1", "transaction", 1, "The ten-item BIP143 preimage of one published input as a packet diagram, and its sighash."),
  fig("amount-storyboard.v1", "transaction", 1, "Storyboard: an offline signer, the amount it cannot see, and why a wrong one fails."),

  // timelocks
  fig("timelock-ranges.v1", "timelock-encoding", 1, "nLockTime's 32 bits split at the threshold, and 16 value bits read as blocks or 512-second units."),
  fig("timelock-not-a-lock.v1", "timelock-case", 0, "Storyboard, schematic: a future nLockTime proves a later spend but locks nothing; CLTV in the coin's script does."),
  fig("timelock-pinned-fields.v1", "timelock-bip-tx", [1, 6], "Lock fields of transactions published in BIPs 143 and 174, as consensus reads them."),
  hero("timelock-fields.v1", "timelock-case", [2, 16], ["Choose absolute or relative lock", "Change a fixture field", "Compare height and time units"], "Bitcoin Core's CLTV/CSV test transactions as a gate of BIP 65's and BIP 112's checks; field changes pre-computed by the tested model."),
  fig("timelock-sequence-bits.v1", "timelock-encoding", 1, "nSequence's 32 bits under BIP 68: disable flag, type flag and the 16-bit value."),
  fig("timelock-csv-story.v1", "timelock-case", 1, "Storyboard: one Core CHECKSEQUENCEVERIFY case, check by check."),
  fig("timelock-mtp.v1", "timelock-case", 0, "Schematic: the last 11 block timestamps sorted, the median being the clock time locks read."),

  // psbt
  fig("psbt-layout.v1", "psbt-trace", 1, "A newly created PSBT byte by byte: magic, one global record, a separator per map."),
  fig("psbt-records.v1", "psbt-trace", 1, "Two partial-signature records in one map: same type, different key data."),
  hero("psbt-envelope.v1", "psbt-trace", 1, ["Advance through a reviewed trace", "Inspect added fields", "Compare partial/final states"], "BIP174's published role trace: the envelope passed from role to role."),
  fig("psbt-signer-display.v1", "psbt-trace", 1, "What a signer can show before signing: input amounts, outputs and fee."),
  fig("psbt-utxo-check.v1", "psbt-trace", 1, "The signer's check that a non-witness UTXO hashes to the txid its input names."),
  fig("psbt-combine.v1", "psbt-trace", 1, "Two signers' copies of one input map merged by the Combiner."),
  fig("psbt-finalize.v1", "psbt-trace", 1, "Input maps after the Input Finalizer: kept, added and cleared records."),
  fig("unknown-fields.v1", "psbt-combine", 1, "Two PSBTs with unknown key-value pairs combined without losing them."),

  // schnorr
  fig("schnorr-signature-layout.v1", "schnorr-vector", 1, "The verifier as a machine with three input slots: a 32-byte x-only key, a message of any length, and a 64-byte signature r ‖ s."),
  fig("schnorr-byte-sizes.v1", "schnorr-vector", 1, "BIP 340's fixed sizes on one byte ruler: DER signature, r ‖ s, compressed key and x-only key."),
  fig("schnorr-equation.v1", "schnorr-vector", 1, "The verification equation s⋅G = R + e⋅P as a balance, with where each term comes from."),
  hero("schnorr-verification.v1", "schnorr-vector", [2, 12], ["Choose public valid/invalid vector", "Change a message fixture", "Reveal verifier stages"], "BIP 340 Verify run step by step on published valid and invalid vectors."),
  fig("schnorr-fail-gates.v1", "schnorr-vector", [2, 14], "Where each published vector stops among Verify's eight checks."),
  fig("challenge-preimage.v1", "schnorr-vector", [2, 6], "The tagged challenge-hash input for messages of several lengths, to scale."),
  fig("schnorr-even-y.v1", "schnorr-vector", 2, "One x coordinate, two y values: the even one kept for keys and for R; two secret keys per x-only key."),

  // taproot
  fig("taproot-tweak.v1", "taproot-tree", [1, 2], "Internal key, Merkle root and TapTweak giving the output key, for published vectors."),
  hero("taproot-commitment.v1", "taproot-tree", 1, ["Switch key/script path", "Select a leaf", "Reveal only the proof material"], "One published script tree: key-path and script-path spends, and what each reveals."),
  fig("taproot-sigmsg.v1", "taproot-keyspend", 1, "The BIP 341 signature message of one published key-path spend, item by item."),
  fig("taproot-witness-stacks.v1", "taproot-tree", 1, "The key-path and script-path witnesses of one output as stacks of items."),
  fig("taproot-verifier-story.v1", "taproot-tree", 1, "Storyboard: the verifier rebuilds the commitment for one leaf, step by step."),
  fig("taproot-reveals.v1", "taproot-tree", 1, "What an observer of the chain sees of a key-path and a script-path spend."),
  fig("taproot-depth.v1", "taproot-tree", 1, "A published tree with each leaf's control block drawn to scale."),

  // tapscript
  fig("tapscript-witness.v1", "tapscript-case", 1, "One recorded script-path witness split into what BIP 341 checks and what BIP 342 runs."),
  fig("tapscript-sig-rules.v1", "tapscript-case", [1, 6], "What a signature opcode does with each shape of key and signature, with the recorded cases in each tray."),
  fig("tapscript-multisig.v1", "tapscript-case", 1, "CHECKMULTISIG failing in a recorded witness, and the CHECKSIGADD chain BIP 342 suggests instead."),
  hero("tapscript-trace.v1", "tapscript-case", [2, 6], ["Step a reviewed trace", "Compare success/failure fixtures", "Inspect signature count"], "Recorded, verified tapscript executions from Bitcoin Core's test cases, step by step."),
  fig("tapscript-sig-pays.v1", "tapscript-case", [1, 6], "What a checked and an empty signature add to the budget and what their checks cost."),
  fig("tapscript-op-success.v1", "tapscript-case", 1, "The OP_SUCCESS case: a trapdoor in the decoder, against a script that runs and fails."),
  fig("tapscript-minimalif.v1", "tapscript-case", 1, "OP_IF accepts only an empty vector or 0x01: a recorded witness that fits and one that does not."),

  // musig2
  fig("musig2-chain-view.v1", "musig2-session", 1, "Signers behind a boundary; what the chain sees of a MuSig2 key path spend: one key, one signature."),
  fig("musig2-keyagg.v1", "musig2-keyagg", 1, "MuSig2 key aggregation with coefficients in two key orders, against the plain sum of the keys."),
  hero("musig2-rounds.v1", "musig2-session", [1, 4], ["Step through signing rounds", "Choose a published vector", "Reveal aggregated values"], "BIP 327 signing sessions from the published sig_agg vectors: key aggregation, nonce round, session values, partial signatures, final BIP 340 signature."),
  fig("musig2-nonce-once.v1", "musig2-session", 1, "Schematic: a secret nonce is used by Sign once and then refused."),
  fig("musig2-psig-checks.v1", "musig2-psig-checks", 1, "BIP 327's partial-signature verification cases and their outcomes."),

  // descriptors
  fig("descriptor-outputs.v1", "descriptor-vector", 1, "One public key and the four different output scripts in a published combo() expansion."),
  fig("descriptor-sentence.v1", "descriptor-vector", 1, "One published descriptor laid out as a sentence of named parts."),
  fig("descriptor-template.v1", "descriptor-vector", 1, "pkh(KEY) filling BIP 381's template: the key's HASH160 in the one slot between fixed opcodes."),
  hero("descriptor-anatomy.v1", "descriptor-vector", [1, 10], ["Choose a published descriptor", "Highlight a key expression", "Check the descriptor checksum"], "Published descriptors from BIPs 380–386 split into their expressions, with keys, expanded scripts and the checksum check."),
  fig("descriptor-typo-forgery.v1", "descriptor-vector", 2, "BIP 380's valid and error-in-payload vectors, and the altered text with a recomputed checksum."),
  fig("descriptor-expressions.v1", "descriptor-index", 1, "BIP 380's index of script expressions as a map of where each may appear."),

  // silent-payments
  fig("sp-address.v1", "sp-vector", 1, "The parts of a version 0 silent payment address."),
  fig("sp-ecdh.v1", "sp-vector", 1, "Storyboard, symbolic: Alice and Bob reach the same Diffie-Hellman point across an open network."),
  hero("silent-payment-derivation.v1", "sp-vector", [1, 8], ["Choose a published vector", "Switch sender/receiver view", "Reveal shared-secret steps"], "BIP 352 send-and-receive vectors: input keys, input hash, shared secret, outputs, and the receiver's scan."),
  fig("sp-input-eligibility.v1", "sp-eligibility", 1, "Which inputs of published BIP 352 vectors contribute a key to the shared secret."),
  fig("sp-scan-loop.v1", "sp-vector", 1, "The receiver's scan as a counter that stops at the first missing output."),
  fig("sp-labels.v1", "sp-vector", 1, "A receiver's labeled addresses share their scan-key characters."),

  // message-signing
  fig("bip322-formats.v1", "bip322-formats", 1, "BIP 322 formats as envelopes."),
  fig("bip322-message-hash.v1", "bip322-vector", 2, "Two messages, two hashes."),
  hero("bip322-virtual-tx.v1", "bip322-vector", [1, 8], ["Choose a published vector", "Switch to_spend/to_sign view", "Reveal the message hash"], "to_spend and to_sign as linked tickets."),
  fig("bip322-witness.v1", "bip322-vector", 1, "A multisig signature's witness stack."),
  fig("bip322-verdicts.v1", "bip322-verdicts", 1, "Three verdicts as stamps."),
  fig("bip322-limits.v1", "bip322-verdicts", 0, "Schematic: what a signature does not prove."),

  // block-filters
  fig("bf-two-directions.v1", "bf-block", 1, "BIP 37 vs BIP 157/158."),
  fig("bf-element-sieve.v1", "bf-block", 1, "A block's scripts sieved into the set."),
  fig("bf-build-story.v1", "bf-block", 1, "Storyboard: building a filter."),
  fig("bf-size.v1", "bf-block", [1, 3], "Filter sizes to scale."),
  hero("gcs-filter.v1", "bf-block", [1, 8], ["Choose a wallet outcome", "Step through the wallet workflow", "Choose a published block", "Test a fixture script against the filter", "Reveal Golomb-Rice coding"], "A wallet uses a filter to choose blocks; optional published examples explain the encoding."),
  fig("bf-peer-check.v1", "bf-chain", 0, "Schematic: peers disagree."),

  // v2-transport
  fig("v1-v2-framing.v1", "v2-framing", 1, "v1 and v2 framing."),
  fig("v2-eavesdropper.v1", "v2-vector", 0, "Schematic: listeners on v1 and v2."),
  fig("v2-ellswift.v1", "v2-vector", 1, "A 64-byte ElligatorSwift key."),
  fig("v2-detect.v1", "v2-vector", 1, "v1 prefix vs v2 key."),
  hero("v2-handshake.v1", "v2-vector", [1, 8], ["Step through the handshake", "Choose a published packet vector", "Compare v1 and v2 framing"], "The BIP 324 handshake, step by step."),
  fig("v2-packet-bytes.v1", "v2-vector", 1, "One packet, byte by byte."),
  fig("v2-rekey.v1", "v2-rekey", 1, "Nonces and keys across a rekey."),

  // version-bits
  fig("versionbits-field.v1", "versionbits-deployment", [1, 4], "nVersion as 32 bit cells."),
  fig("versionbits-threshold.v1", "versionbits-deployment|versionbits-guideline", 2, "Thresholds to scale."),
  hero("versionbits-state-machine.v1", "versionbits-deployment|versionbits-guideline", [1, 4], ["Step through retarget periods", "Choose a published deployment", "Toggle signalling count"], "BIP 9/8 states over a run of periods."),
  fig("versionbits-record.v1", "versionbits-deployment", [1, 4], "Recorded deployments, read back."),
  fig("versionbits-bip8.v1", "versionbits-guideline", 1, "BIP 8's two endings."),
];

export const RECIPE_MAP = /* @__PURE__ */ new Map(/* @__PURE__ */ RECIPES.map((r) => [r.id, r]));
