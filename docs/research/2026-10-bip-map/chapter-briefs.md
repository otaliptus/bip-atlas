# Curriculum unit briefs

Start with [the core route and optional paths](curriculum.md). These are editorial units: a lesson, companion section or reference entry, not a commitment to one page per unit. All 18 existing lessons retain their BIP scope. New material defaults to static prose and drawings. Backlog entries have no delivery commitment. Suggested prior reading is an editorial graph, not a protocol dependency declaration.

## Keys, backups and wallet setup

<a id="mnemonics"></a>
### How can words carry a wallet seed?

`mnemonics` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP39.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep entropy, checksum, seed derivation and the passphrase boundary together. Formosa and seed sharing are optional follow-ups with their own homes.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [payment-primer](#payment-primer).

<a id="hd-wallets"></a>
### How can one seed produce a whole wallet?

`hd-wallets` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP32.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep chain codes, public derivation, hardened boundaries and the leaked-child warning. Derived application entropy belongs in a companion.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [mnemonics](#mnemonics).

<a id="wallet-paths"></a>
### How does a wallet find the right branch?

`wallet-paths` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP44, BIP84, BIP86.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP44/84/86 account, change and address branches and explain the recovery/discovery implication. Additional purposes and path notations belong in derivation-conventions.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [hd-wallets](#hd-wallets), [taproot](#taproot).

<a id="multisig-wallets"></a>
### How do several devices agree on the same wallet?

`multisig-wallets` · **companion / optional** · new · batch: signing

- **Main explanations:** BIP48, BIP67, BIP87, BIP129.
- **Comparison sections:** BIP45, BIP80, BIP81.
- **Allocated only:** none.

Show why keys, order, paths, threshold and script type must agree. Contrast the derivation schemes, then show the BSMS setup exchange. Give the voting-pool variants short historical comparisons.

Static drawing: Cosigners checking the same wallet recipe before producing one receive address.

Suggested prior reading: [wallet-paths](#wallet-paths), [p2sh](#p2sh), [psbt](#psbt).

<a id="descriptors"></a>
### How can a wallet describe all its receiving scripts?

`descriptors` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP380, BIP381, BIP382, BIP383, BIP384, BIP385, BIP386.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep BIP380–386 as the wallet recipe: script wrapper, key origin, derivation and checksum. Multipaths, tapscript threshold expressions and alternative containers belong in a companion.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [wallet-paths](#wallet-paths), [p2sh](#p2sh), [segwit](#segwit), [taproot](#taproot).

<a id="miniscript"></a>
### Can a spending policy be checked before anyone spends?

`miniscript` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP379.
- **Comparison sections:** BIP124.
- **Allocated only:** none.

Distinguish a policy, a structured Miniscript expression, a descriptor wrapper and the resulting Script. Show one signature-plus-time policy and what analysis can establish. Compare the earlier template proposal.

Static drawing: Policy to typed fragments to Script to two possible satisfaction paths.

Suggested prior reading: [descriptors](#descriptors), [timelocks](#timelocks), [tapscript](#tapscript).

<a id="wallet-policies"></a>
### What should a signing device know about a wallet?

`wallet-policies` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP388.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain registering a compact, reviewable account policy on a constrained signer, then instantiating descriptors from a template and keys. Distinguish this account representation from a high-level Miniscript policy language and from chain-code delegation.

Static drawing: A signer reviewing a descriptor template and key list before recognizing later addresses.

Suggested prior reading: [multisig-wallets](#multisig-wallets), [descriptors](#descriptors).

<a id="wallet-recovery"></a>
### What must survive besides the seed?

`wallet-recovery` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP128, BIP138, BIP329, BIP393.
- **Comparison sections:** none.
- **Allocated only:** none.

Follow the recovery task beyond the seed: descriptor/account metadata, labels, scan hints and saved timelock-recovery plans. Give each format its own payload and limitation. BIP138 public-key-derived backup encryption must not carry private keys; these formats do not collectively guarantee recovery.

Static drawing: A recovery inventory showing the seed separately from wallet descriptions, labels, scan hints and recovery plans.

Suggested prior reading: [descriptors](#descriptors), [timelocks](#timelocks).

<a id="mnemonic-alternatives"></a>
### What does a different mnemonic presentation change?

`mnemonic-alternatives` · **reference / reference** · new · batch: backlog

- **Main explanations:** none.
- **Comparison sections:** BIP450.
- **Allocated only:** none.

Explain Formosa sentence themes and BIP39 re-encoding as a Draft alternative representation. Identify which derivation boundary it shares and what the representation changes.

Static drawing: Two word representations meeting at a labelled seed-derivation boundary.

Suggested prior reading: [mnemonics](#mnemonics).

<a id="derivation-conventions"></a>
### How do wallets name and describe different derivation schemes?

`derivation-conventions` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP43, BIP49, BIP88.
- **Comparison sections:** BIP83.
- **Allocated only:** none.

Explain purpose namespacing, nested-SegWit derivation and path templates after the existing path lesson. Give the closed dynamic-tree proposal a separate comparison row; a path notation is not a new key-derivation algorithm.

Static drawing: Purpose and path-template labels over one key tree, with a separate dynamic-tree comparison.

Suggested prior reading: [wallet-paths](#wallet-paths), [segwit](#segwit).

<a id="private-key-backups"></a>
### What is being imported when a wallet accepts an encoded private key?

`private-key-backups` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP38.
- **Comparison sections:** BIP178.
- **Allocated only:** none.

Explain BIP38 encrypted individual private keys and the closed BIP178 WIF extension for intended script types. Keep both distinct from backing up a deterministic wallet seed and from recipient-address encoding.

Static drawing: One private key passing through an import-format envelope or a passphrase-encryption envelope.

Suggested prior reading: [hd-wallets](#hd-wallets), [addresses](#addresses).

<a id="entropy-derivation"></a>
### Can one root provide separate secrets for different applications?

`entropy-derivation` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP85.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain BIP85 application-specific entropy from hardened BIP32 children and the root compromise boundary. Distinguish derived application entropy from another wallet account or an extra backup copy.

Static drawing: One root with hardened branches ending in separately labelled application-entropy outputs.

Suggested prior reading: [hd-wallets](#hd-wallets).

<a id="seed-sharing"></a>
### How can a seed be checked or divided into recovery shares?

`seed-sharing` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP93.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain codex32 encoding, checksum and optional threshold shares. State what material recovery reconstructs and distinguish sharing a seed from requiring multiple signatures to spend.

Static drawing: A seed and its checked encoding beside a threshold reconstruction of shares.

Suggested prior reading: [mnemonics](#mnemonics), [hd-wallets](#hd-wallets).

<a id="descriptor-extensions"></a>
### How can one descriptor express more branches or signing conditions?

`descriptor-extensions` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP387, BIP389.
- **Comparison sections:** BIP391.
- **Allocated only:** none.

Build on the descriptor lesson with tapscript threshold expressions and receive/change multipaths. Give the closed binary-container proposal a comparison section; container encoding and script semantics are different changes.

Static drawing: One descriptor expanding into two branches, alongside a tapscript threshold and a container comparison.

Suggested prior reading: [descriptors](#descriptors), [tapscript](#tapscript).

<a id="signer-delegation"></a>
### Which derivation information should each cosigner receive?

`signer-delegation` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP89.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain chain-code delegation and the coordinator/signer information boundary. State which derivations each party can perform and what a cosigner can still check; separate it from account-policy registration.

Static drawing: Coordinator and signers separated by labelled key and chain-code information boundaries.

Suggested prior reading: [multisig-wallets](#multisig-wallets), [hd-wallets](#hd-wallets).

## Addresses, scripts and signing

<a id="addresses"></a>
### What does an address actually identify?

`addresses` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP173, BIP350.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the Bech32/Bech32m encoding and validation lesson, including Bech32 for witness v0. Give address versus output-script context briefly; additional formats and private-key import formats have separate homes.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [payment-primer](#payment-primer).

<a id="p2sh"></a>
### How can a script hide behind a hash?

`p2sh` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP16.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP16 commitment, reveal and second script evaluation as one worked spend. Bare multisig and competing script-hash designs belong in the history reference.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [addresses](#addresses).

<a id="ecdsa"></a>
### Why can valid signatures still need stricter rules?

`ecdsa` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP66, BIP147, BIP461.
- **Comparison sections:** BIP62, BIP146.
- **Allocated only:** none.

Separate DER encoding, signature malleability, NULLDUMMY, and deterministic low-r/low-s signing. Distinguish consensus rules, policy and a Draft signer algorithm; BIP147 is not an ECDSA equation change.

Static drawing: Same payment intent passing through encoding, dummy-element and signer-choice checks.

Suggested prior reading: [p2sh](#p2sh).

<a id="segwit"></a>
### What changes when signatures move into the witness?

`segwit` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP141, BIP143.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep transaction identity, witness separation, weight and BIP143 signing data. Peer serialization and mining-template fields are separate follow-ups.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [p2sh](#p2sh).

<a id="timelocks"></a>
### When is a coin allowed to move?

`timelocks` · **lesson / optional** · retain · batch: existing

- **Main explanations:** BIP65, BIP68, BIP112, BIP113.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep absolute and relative locks, sequence semantics and median-time-past together. Applications in recovery and contracts link back to this lesson.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [p2sh](#p2sh).

<a id="psbt"></a>
### How do wallets pass an unfinished transaction around?

`psbt` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP174.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP174 container and creator/updater/signer/finalizer workflow. Show why signers need context; v2, Taproot and specialized coordination fields belong in companions.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [segwit](#segwit), [descriptors](#descriptors).

<a id="schnorr"></a>
### What does a Schnorr signature prove?

`schnorr` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP340.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep one-signature verification, x-only keys and the BIP340 construction. Explain signature roles in place; detailed ECDSA encodings and MuSig2 are optional follow-ups.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [segwit](#segwit).

<a id="taproot"></a>
### Why reveal only the spending path you use?

`taproot` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP341.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP341 key path, committed script tree, tweak and selective revelation. Historical MAST and alternative Merkle/execution designs belong in a separate reference.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [segwit](#segwit), [schnorr](#schnorr).

<a id="tapscript"></a>
### How does a Taproot script get evaluated?

`tapscript` · **lesson / optional** · retain · batch: existing

- **Main explanations:** BIP342.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP342 execution and upgrade rules for a revealed Taproot script. Proposed operations and resource changes belong in the proposal path.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [taproot](#taproot).

<a id="musig2"></a>
### How can several people make one signature?

`musig2` · **lesson / optional** · retain · batch: existing

- **Main explanations:** BIP327.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP327 n-of-n key aggregation and two signing rounds, including nonce discipline. Derivation, descriptor representation and PSBT transport belong in musig2-wallets.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [schnorr](#schnorr), [taproot](#taproot).

<a id="fee-bumping"></a>
### How can a transaction get unstuck?

`fee-bumping` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP125, BIP331, BIP431, BIP433.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain replacement, child-pays-for-parent, packages, pinning, restricted topology and keyless anchor outputs. Separate wallet strategy, mempool policy and peer messages; do not equate Draft status with absent implementations.

Static drawing: A parent-child package with fee labels and a pinning versus replaceable topology comparison.

Suggested prior reading: [segwit](#segwit), [network-primer](#network-primer).

<a id="transaction-fingerprints"></a>
### What can transaction shape reveal about a wallet?

`transaction-fingerprints` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP69, BIP126, BIP326, BIP451.
- **Comparison sections:** none.
- **Allocated only:** none.

Compare deterministic ordering, mixed-input advice, anti-fee-sniping and the Draft dust-disposal convention. Present privacy rationales as claims with assumptions; do not recommend one universal sorting or disposal strategy.

Static drawing: Four transaction silhouettes with labelled inference opportunities and limits.

Suggested prior reading: [wallet-paths](#wallet-paths), [timelocks](#timelocks).

<a id="payment-primer"></a>
### What changes when you pay someone in bitcoin?

`payment-primer` · **primer / core** · new · batch: foundation

- **Main explanations:** none.
- **Comparison sections:** none.
- **Allocated only:** none.

Follow a symbolic payment from an unspent output through inputs, new outputs, change and a fee. Distinguish a wallet, a key, an address and a spending condition; introduce hashes and signatures only by their roles. Stop before serialization, derivation arithmetic and chain selection. Use public schematic values; this is a conceptual scaffold, not new BIP coverage.

Static drawing: One payment storyboard: wallet selects an output, constructs a transaction, and proposes new recipient/change outputs.

Suggested prior reading: none.

Supporting BIPs (no new ownership): BIP16, BIP32, BIP141, BIP173, BIP350.

Source work before authoring: Anchor the glossary to the existing evidence ledgers. Add pinned primary protocol documentation for UTXOs, change and fees; the listed BIPs alone are not a complete introductory source.

<a id="address-formats"></a>
### How do recipient encodings relate to output scripts?

`address-formats` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP13, BIP179.
- **Comparison sections:** BIP142.
- **Allocated only:** none.

Compare Base58Check script-hash addresses with the existing witness-address lesson, explain the closed witness-address alternative and the recipient-identifier terminology proposal. Keep private-key import formats in private-key-backups.

Static drawing: Each recipient string pointing to its output script, with proposed terminology labelled separately.

Suggested prior reading: [addresses](#addresses), [p2sh](#p2sh).

<a id="p2sh-history"></a>
### Which script-hash and multisig designs were compared with P2SH?

`p2sh-history` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP11.
- **Comparison sections:** BIP12, BIP17, BIP18, BIP19.
- **Allocated only:** none.

Explain bare threshold multisig, then compare OP_EVAL, CHV, hashScriptCheck and the low-sigop multisig proposal by commitment, execution and resource rule. Do not insert this design history into the first P2SH spend.

Static drawing: Bare multisig beside a compact alternative-design table.

Suggested prior reading: [p2sh](#p2sh).

<a id="psbt-extensions"></a>
### How do PSBT construction and Taproot fields extend the same workflow?

`psbt-extensions` · **companion / optional** · new · batch: signing

- **Main explanations:** BIP370, BIP371.
- **Comparison sections:** BIP10.
- **Allocated only:** none.

Compare v0 and v2 construction representation and show Taproot fields as a separate extension supported by both versions. Use BIP10 only as a short predecessor comparison. Specialized key tweaks, MuSig2 and Silent Payment workflows have separate homes.

Static drawing: The same transaction folder with a v0/v2 representation axis and an independent Taproot-fields axis.

Suggested prior reading: [psbt](#psbt), [taproot](#taproot).

<a id="script-tree-history"></a>
### Which commitment and execution ideas preceded or differ from Taproot?

`script-tree-history` · **reference / reference** · new · batch: backlog

- **Main explanations:** none.
- **Comparison sections:** BIP98, BIP114, BIP116, BIP117.
- **Allocated only:** none.

Compare Fast Merkle Trees, the earlier MAST proposal, branch verification and tail calls. Give each its own mechanism and limit; do not imply Taproot implements these designs.

Static drawing: Four labelled commitment/execution cards beside the already learned Taproot tree.

Suggested prior reading: [taproot](#taproot).

<a id="musig2-wallets"></a>
### How does a MuSig2 signing group become a repeatable wallet?

`musig2-wallets` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP328, BIP373, BIP390.
- **Comparison sections:** none.
- **Allocated only:** none.

Connect aggregate-key derivation, musig() descriptors and PSBT coordination fields. Keep derivation and transport distinct from the signing algorithm. BIP373 fields work in both PSBT versions despite its header requirement.

Static drawing: Participant keys to aggregate child key to descriptor, with nonce-round data in a separate PSBT lane.

Suggested prior reading: [musig2](#musig2), [descriptors](#descriptors), [psbt-extensions](#psbt-extensions).

## Payments, privacy and proofs

<a id="payment-instructions"></a>
### How does a payment request reach a wallet?

`payment-instructions` · **companion / optional** · new · batch: payments

- **Main explanations:** BIP321, BIP353.
- **Comparison sections:** BIP15, BIP20, BIP21.
- **Allocated only:** none.

Explain bitcoin: instructions and their evolution, mandatory parameters, multiple payment methods and DNS discovery. Contrast alias resolution with BIP353; never imply DNSSEC authenticates the human recipient.

Static drawing: Human-readable name to DNS instruction to URI to chosen payment method.

Suggested prior reading: [addresses](#addresses).

<a id="merchant-payments"></a>
### What did the merchant Payment Protocol add?

`merchant-payments` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP70, BIP71, BIP72, BIP73, BIP75.
- **Comparison sections:** BIP74.
- **Allocated only:** none.

Explain merchant requests, acknowledgements, MIME types, URI and HTTP negotiation, zero-value OP_RETURN and encrypted address exchange. Separate historical specification status from present wallet support.

Static drawing: Merchant and payer exchanging request, transaction and acknowledgement, with trust and certificate labels.

Suggested prior reading: [payment-instructions](#payment-instructions).

<a id="payjoin"></a>
### Why would the receiver add an input to your payment?

`payjoin` · **companion / optional** · new · batch: payments

- **Main explanations:** BIP77, BIP78.
- **Comparison sections:** BIP79.
- **Allocated only:** none.

Explain the common-input heuristic, sender/receiver checks, synchronous negotiation, asynchronous directory delivery and the earlier Bustapay design. Payjoin changes construction, not consensus.

Static drawing: Ordinary payment beside a collaboratively built transaction and a three-step directory mailbox flow.

Suggested prior reading: [payment-instructions](#payment-instructions), [psbt](#psbt).

<a id="silent-payments"></a>
### Can one public payment code lead to fresh outputs?

`silent-payments` · **lesson / optional** · retain · batch: existing

- **Main explanations:** BIP352.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP352 fresh-output derivation, sender/receiver work and scan tradeoff. Payment-code comparisons and signer/descriptor integration have separate homes.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [taproot](#taproot), [addresses](#addresses).

<a id="pay-to-contract"></a>
### How can contract data determine a payment key?

`pay-to-contract` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP372.
- **Comparison sections:** BIP175.
- **Allocated only:** none.

Separate two constructions. BIP175 hashes contract documents, sorts their hashes, hashes them with payment_base, maps the digest into non-hardened BIP32 path components, then derives a payment key/address. BIP372 carries generic pay-to-contract key-tweak information in PSBT for a signer. Do not draw BIP175 as a single additive key tweak or imply BIP372 directly implements its derivation path; neither is a covenant restricting future spends.

Static drawing: Two labelled panels: contract documents → combined digest → child-index path → derived address; generic key tweak → PSBT signer information.

Suggested prior reading: [hd-wallets](#hd-wallets), [psbt](#psbt).

<a id="message-signing"></a>
### What can a wallet actually prove?

`message-signing` · **lesson / optional** · retain · batch: existing

- **Main explanations:** BIP322.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep BIP322 message challenges and what a successful proof establishes. Other message, payment-history and reserve proof formats belong in a comparison reference.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [psbt](#psbt), [p2sh](#p2sh).

<a id="timed-contracts"></a>
### What can a hash and a deadline coordinate?

`timed-contracts` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP197.
- **Comparison sections:** BIP199.
- **Allocated only:** none.

Explain HTLC claim/refund paths and the collateral-contract application as uses of hashes and deadlines. State coordination and timeout assumptions without claiming complete Lightning coverage.

Static drawing: Claim/refund paths on a shared timeline, then the collateral application.

Suggested prior reading: [timelocks](#timelocks).

<a id="silent-payment-wallets"></a>
### What must a wallet coordinate to send and recover Silent Payments?

`silent-payment-wallets` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP374, BIP375, BIP376, BIP392.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain sp() descriptors and the distinct Silent Payment send/spend PSBT v2 workflows. Introduce DLEQ only when a signer must show that two public points share the same secret; the proof does not authorize spending. Leave MuSig2 nonce coordination to its own companion.

Static drawing: Separate send and spend lanes, with ECDH shares/proofs and descriptor scan information labelled.

Suggested prior reading: [silent-payments](#silent-payments), [psbt-extensions](#psbt-extensions).

<a id="reusable-payment-codes"></a>
### How do reusable payment codes trade notification against scanning?

`reusable-payment-codes` · **reference / reference** · new · batch: backlog

- **Main explanations:** none.
- **Comparison sections:** BIP47, BIP351.
- **Allocated only:** BIP63.

Compare BIP47 and BIP351 mechanisms with the existing Silent Payments explanation using notification, sender work, receiver work and information leakage. Record BIP63 only as an allocation; it has no published mechanism to teach.

Static drawing: Notification and scanning flows with distinct information boundaries.

Suggested prior reading: [silent-payments](#silent-payments).

<a id="proof-formats"></a>
### What claims do other wallet proof formats establish?

`proof-formats` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP127.
- **Comparison sections:** BIP120, BIP121, BIP137.
- **Allocated only:** none.

Compare legacy compact message signatures, proof of a past payment and its URI exchange, and proof-of-reserves transactions with BIP322. Distinguish key control, payment history, funds availability and solvency.

Static drawing: A table of claim, witness, verifier and what remains unproved.

Suggested prior reading: [message-signing](#message-signing).

<a id="fidelity-bonds"></a>
### How can locking coins make an identity costly to replace?

`fidelity-bonds` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP46.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain timelocked fidelity bonds and certificates as a proposed cost signal. State the observer and reuse assumptions; a cost signal is not a guarantee that its owner will behave honestly.

Static drawing: Locked coins connected to a certificate and an observer judging the cost signal.

Suggested prior reading: [timelocks](#timelocks).

<a id="payment-units"></a>
### What changes when wallets display amounts or exchange rates differently?

`payment-units` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP136, BIP171, BIP176, BIP177.
- **Comparison sections:** none.
- **Allocated only:** none.

Compare denomination proposals and exchange-rate interfaces. Explain units, rate source and conversion assumptions separately; display conventions change no consensus amount.

Static drawing: One underlying amount with alternative display units and a separate external exchange-rate source.

Suggested prior reading: [payment-primer](#payment-primer).

<a id="payment-references"></a>
### Does a reference name a transaction or a position in a chain?

`payment-references` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP122, BIP172.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain blockchain URIs and transaction-position references, including network and confirmation context. A chain position is not the same identifier as a transaction hash.

Static drawing: Transaction hash versus block/position locator, each with its network context.

Suggested prior reading: [network-primer](#network-primer).

## Peers, relay and light clients

<a id="peer-handshake"></a>
### How do two Bitcoin peers agree what they can do?

`peer-handshake` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP14, BIP31, BIP434.
- **Comparison sections:** BIP36, BIP154.
- **Allocated only:** none.

Explain protocol version and user agent, liveness, modern feature negotiation, and the earlier custom-service proposal. Put proof-of-work connection challenges in a separate comparison box about resource admission.

Static drawing: A short peer handshake with liveness and feature cards; a distinct challenge/solution admission sketch.

Suggested prior reading: [network-primer](#network-primer).

<a id="peer-discovery"></a>
### How do you find a peer that can serve you?

`peer-discovery` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP155, BIP159.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain address gossip across network types and the limited historical service advertised by pruned peers. A service bit is a capability advertisement, not a trust guarantee.

Static drawing: Address-book entries for different networks beside full-history and pruned-history service ranges.

Suggested prior reading: [peer-handshake](#peer-handshake).

<a id="relay-controls"></a>
### Which announcements should a peer send?

`relay-controls` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP35, BIP61, BIP130, BIP133.
- **Comparison sections:** BIP60, BIP338.
- **Allocated only:** none.

Explain mempool inventory requests, transaction relay flags, reject messages, header preference, fee filters and the closed no-transaction-relay proposal. Treat Deployed as source metadata, not a claim that modern nodes still expose every message.

Static drawing: A peer message menu showing request, preference, rejection and filtering as different operations.

Suggested prior reading: [peer-handshake](#peer-handshake), [segwit](#segwit).

<a id="block-relay"></a>
### How can peers relay a block without resending everything?

`block-relay` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP152, BIP332.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain compact-block short IDs, reconstruction and missing transactions. Contrast stale-tip announcements as fork-observation information rather than block compression or a new chain-selection rule.

Static drawing: Known transactions filling compact-block slots, with a small stale-branch announcement inset.

Suggested prior reading: [peer-handshake](#peer-handshake), [segwit](#segwit).

<a id="transaction-relay"></a>
### How can peers avoid sending the same transaction twice?

`transaction-relay` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP144, BIP330, BIP337, BIP339.
- **Comparison sections:** none.
- **Allocated only:** none.

Start with witness-aware peer serialization and transaction identity. Then separate reconciliation of announcements from payload compression, flagging BIP337 lossy-outpoint limits. Each mechanism has its own section; these are alternative bandwidth boundaries, not one required upgrade package.

Static drawing: Three layers: transaction identity/serialization, announcement-set reconciliation and optional payload compression.

Suggested prior reading: [peer-handshake](#peer-handshake), [segwit](#segwit).

<a id="light-client-trust"></a>
### What can a light wallet learn without a full node?

`light-client-trust` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP37, BIP111.
- **Comparison sections:** BIP33, BIP64, BIP180.
- **Allocated only:** none.

Compare specialized-node roles, server-side Bloom matching and service opt-in, UTXO queries, and size/weight fraud proofs. Explain proof scope, omission risks and privacy before linking to client-side block filters.

Static drawing: Who sends the query, who sees it, and what is actually proved across three light-client designs.

Suggested prior reading: [network-primer](#network-primer), [peer-handshake](#peer-handshake).

<a id="block-filters"></a>
### How can a wallet scan without giving a server its addresses?

`block-filters` · **lesson / optional** · retain · batch: existing

- **Main explanations:** BIP157, BIP158.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep BIP157/158 as one client/server protocol and encoding lesson, including matching, false positives and trust limits. Older server-side query schemes are an optional comparison.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [network-primer](#network-primer).

<a id="v2-transport"></a>
### What does encrypting a peer connection protect?

`v2-transport` · **lesson / optional** · retain · batch: existing

- **Main explanations:** BIP324.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep BIP324 opportunistic transport encryption and its limits. Authentication and source-routing privacy belong in a comparison reference.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [network-primer](#network-primer).

<a id="transport-alternatives"></a>
### Which privacy property does each network design try to protect?

`transport-alternatives` · **reference / reference** · new · batch: backlog

- **Main explanations:** none.
- **Comparison sections:** BIP150, BIP151, BIP156.
- **Allocated only:** none.

Compare older authenticated/encrypted-channel proposals and Dandelion transaction routing with BIP324. Separate confidentiality against passive observers, peer authentication and source anonymity; no one property supplies the others.

Static drawing: Observer boundary diagram with separate channel, identity and routing rows.

Suggested prior reading: [v2-transport](#v2-transport).

## Consensus, mining and upgrades

<a id="merkle-cleanup"></a>
### Which old consensus edge cases still need cleanup?

`merkle-cleanup` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP53, BIP54.
- **Comparison sections:** none.
- **Allocated only:** none.

Separate transaction/internal-Merkle-node ambiguity from worst-case validation, timewarp and duplicate-transaction cleanup. Compare the narrow BIP53 proposal with the broader Complete BIP54 package; Complete does not mean activated.

Static drawing: A Merkle leaf/internal-node ambiguity sketch and a four-item consensus-cleanup checklist.

Suggested prior reading: [network-primer](#network-primer).

<a id="block-size-history"></a>
### How did competing proposals try to set block limits?

`block-size-history` · **reference / reference** · new · batch: backlog

- **Main explanations:** none.
- **Comparison sections:** BIP100, BIP101, BIP102, BIP103, BIP104, BIP105, BIP106, BIP107, BIP109, BIP110.
- **Allocated only:** none.

Group fixed increases, scheduled growth, miner voting, feedback algorithms and temporary data restrictions. Give each BIP its own comparison row with its actual rule and Closed status; do not retell every debate or imply deployment.

Static drawing: One family table of what sets the limit, when it changes, and which resources it counts.

Suggested prior reading: [network-primer](#network-primer), [segwit](#segwit).

<a id="transaction-alternatives"></a>
### What other transaction designs were proposed?

`transaction-alternatives` · **reference / reference** · new · batch: backlog

- **Main explanations:** none.
- **Comparison sections:** BIP115, BIP131, BIP134, BIP140.
- **Allocated only:** none.

Compare replay protection, coalescing inputs, flexible serialization and normalized IDs. Explain which problem each closed design addressed and how its mechanism differs from SegWit; do not claim a formal replacement relationship.

Static drawing: Four before/after transaction cards with the field or identity rule each proposal changes.

Suggested prior reading: [segwit](#segwit).

<a id="bip-process"></a>
### What does publishing a BIP actually mean?

`bip-process` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP3, BIP123.
- **Comparison sections:** BIP1, BIP2, BIP99, BIP132.
- **Allocated only:** none.

Explain proposal ownership, modern workflow and layers; compare earlier process and committee proposals and fork taxonomy. Separate editorial publication, specification completion, adoption and consensus enforcement.

Static drawing: BIP publication workflow beside a separate implementation/adoption path, with no automatic arrow between them.

Suggested prior reading: [network-primer](#network-primer).

<a id="version-bits"></a>
### How can a soft fork become an enforced rule?

`version-bits` · **lesson / core** · retain · batch: existing

- **Main explanations:** BIP9, BIP8.
- **Comparison sections:** none.
- **Allocated only:** none.

Keep the BIP9/BIP8 signaling, lock-in and activation state machines. Explain that signaling is not validation and document status is not activation; historical deployments and process details are optional references.

Static drawing: Reuse the existing focused drawings; add only short links to related explanations.

Suggested prior reading: [network-primer](#network-primer).

<a id="mining-templates"></a>
### Who chooses the block a miner hashes?

`mining-templates` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP22, BIP23, BIP145, BIP310, BIP323.
- **Comparison sections:** BIP320.
- **Allocated only:** BIP40, BIP41.

Explain node-to-miner block templates, pooled-mining extensions, SegWit template fields, Stratum extension negotiation and version rolling. Keep BIP40/41 as allocated-only records; do not imply a published BIP specification or full Stratum V2 coverage.

Static drawing: Node to pool to hashing worker, labelled with template decisions, negotiated fields and version-bit uses.

Suggested prior reading: [network-primer](#network-primer), [segwit](#segwit), [version-bits](#version-bits).

<a id="test-networks"></a>
### Why does Bitcoin need more than one test network?

`test-networks` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP94, BIP95, BIP325.
- **Comparison sections:** none.
- **Allocated only:** none.

Compare permissionless testnet difficulty behavior and signed-block Signet coordination. Explain Testnet4 versus Draft Testnet5 and BIP54 rules without implying the latter are active on mainnet.

Static drawing: Three network cards comparing genesis, block admission, difficulty behavior and purpose.

Suggested prior reading: [network-primer](#network-primer), [merkle-cleanup](#merkle-cleanup).

<a id="drivechains"></a>
### What would miners control in a drivechain?

`drivechains` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP300, BIP301.
- **Comparison sections:** none.
- **Allocated only:** none.

Separate hashrate-escrow withdrawals from blind merged mining. Explain the proposed mainchain changes, miner influence and user trust assumptions; neither publication nor the word blind establishes security.

Static drawing: Two independent arrows: mainchain escrow/withdrawal and sidechain block-selection bids.

Suggested prior reading: [network-primer](#network-primer), [mining-templates](#mining-templates).

<a id="alternative-pow"></a>
### What would changing proof of work actually change?

`alternative-pow` · **reference / reference** · new · batch: backlog

- **Main explanations:** none.
- **Comparison sections:** BIP52.
- **Allocated only:** none.

Use a short historical chapter on the closed optical/low-energy PoW proposal. Explain the changed work function, deployment implications and the distinction between the authors energy rationale and demonstrated network properties.

Static drawing: Existing hashing pipeline beside the proposed work pipeline, with changed assumptions labelled.

Suggested prior reading: [mining-templates](#mining-templates).

<a id="network-primer"></a>
### How does a proposed payment become part of a shared history?

`network-primer` · **primer / core** · new · batch: foundation

- **Main explanations:** none.
- **Comparison sections:** none.
- **Allocated only:** none.

Separate transaction relay and local mempool policy, full-node validation, miner block construction, proof of work and chain selection. Show a temporary competing tip and why a valid block and a preferred chain are different judgments. Introduce soft forks and signaling as context for the existing activation lesson. Stop before individual peer messages, mining APIs and historical incidents.

Static drawing: Wallet to peer mempools to candidate blocks to independent validation, with two competing tips and a separate signaling lane.

Suggested prior reading: [payment-primer](#payment-primer).

Supporting BIPs (no new ownership): BIP9, BIP22, BIP50, BIP125, BIP152.

Source work before authoring: Use existing activation evidence plus pinned primary documentation for validation and chain selection. Check the general model independently; historical BIP case studies do not supply the whole foundation.

<a id="validation-case-studies"></a>
### What do historical validation failures and fixes teach us?

`validation-case-studies` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP30, BIP34, BIP42, BIP50.
- **Comparison sections:** none.
- **Allocated only:** none.

Use duplicate transaction protection, coinbase height, subsidy arithmetic and the 2013 database-induced chain split as case studies after readers understand nodes and chain selection. Explain the real arithmetic fix behind BIP42 satire. These examples illustrate particular failures; they are not a general definition of consensus.

Static drawing: Four cases, each showing the disagreeing condition, resulting risk and rule or implementation response.

Suggested prior reading: [network-primer](#network-primer).

<a id="activation-history"></a>
### How did different deployment plans use or depart from signaling?

`activation-history` · **reference / reference** · new · batch: backlog

- **Main explanations:** BIP90, BIP91, BIP148.
- **Comparison sections:** BIP135, BIP149, BIP343.
- **Allocated only:** none.

Compare buried deployments, SegWit and Taproot deployment plans and generalized voting. Label each proposal status and distinguish what the document specifies from independently sourced activation history. Keep BIP8/BIP9 mechanics in the existing lesson.

Static drawing: A dated comparison of triggers, thresholds and enforcement, with proposed and observed events explicitly distinguished.

Suggested prior reading: [version-bits](#version-bits), [bip-process](#bip-process).

## Proposed script and cryptographic changes

<a id="covenants"></a>
### Can a coin restrict the transaction that spends it?

`covenants` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP119, BIP346, BIP446.
- **Comparison sections:** none.
- **Allocated only:** none.

Compare checking a template commitment, exposing a configurable transaction hash, and pushing a template hash for use by other operations. Explain exact commitment fields and limits before applications; all are proposals, not current rules.

Static drawing: An output pointing to allowed future transaction shapes; a three-column commitment comparison.

Suggested prior reading: [timelocks](#timelocks), [tapscript](#tapscript).

<a id="rebinding"></a>
### Can a signature be reused for a different state?

`rebinding` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP118, BIP348, BIP349, BIP448.
- **Comparison sections:** none.
- **Allocated only:** none.

Contrast ANYPREVOUT with the TEMPLATEHASH/CHECKSIGFROMSTACK/INTERNALKEY package. Explain what each signature commits to and why reusable states help channel designs. BIP448 is a deployment package, not a fourth independent opcode.

Static drawing: Two compatible transaction states sharing authorization, plus the three-opcode package stack.

Suggested prior reading: [covenants](#covenants).

<a id="vaults"></a>
### Can a wallet give you time to stop a theft?

`vaults` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP443.
- **Comparison sections:** BIP345.
- **Allocated only:** none.

Explain delayed withdrawal and recovery, then compare specialized OP_VAULT with more general contract-verification commitments. Keep BIP345 closed and its Proposed-Replacement relationship distinct from deployment or exact equivalence.

Static drawing: Deposit to delayed withdrawal or emergency recovery, with contract-state commitments marked.

Suggested prior reading: [covenants](#covenants), [timelocks](#timelocks).

<a id="script-operations"></a>
### What can a few extra script operations unlock?

`script-operations` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP347, BIP442, BIP449.
- **Comparison sections:** none.
- **Allocated only:** none.

Give concatenation, pair commitments and x-only key tweaking their own short sections. Explain their different primitives and composition limits, with explicit proposal statuses. A Complete BIP347 document does not mean OP_CAT is active.

Static drawing: Three input/output stack cards, each showing precisely one new operation.

Suggested prior reading: [tapscript](#tapscript).

<a id="script-resources"></a>
### How much work should a script be allowed to do?

`script-resources` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP440, BIP441.
- **Comparison sections:** none.
- **Allocated only:** none.

Explain generalized operation budgets and the separate restoration proposal for a new tapleaf version. Connect cost and memory limits to denial-of-service resistance without presenting benchmark claims as universal guarantees.

Static drawing: Opcode costs filling a budget meter beside the current and proposed script-resource boundaries.

Suggested prior reading: [tapscript](#tapscript).

<a id="post-quantum"></a>
### What would a quantum-safe migration need?

`post-quantum` · **companion / optional** · new · batch: backlog

- **Main explanations:** BIP360, BIP361.
- **Comparison sections:** none.
- **Allocated only:** none.

Separate removing the exposed Taproot key path from adding a post-quantum signature scheme and planning a legacy-signature sunset. Record BIP361 unresolved Requires text; do not invent a PQ-signature BIP or repeat the authors hardware forecasts as fact.

Static drawing: Exposed key path versus committed script path, followed by a migration plan with an explicitly missing signature-scheme prerequisite.

Suggested prior reading: [taproot](#taproot), [schnorr](#schnorr).
