# The learning route

A technically curious reader who knows what a Bitcoin payment is but does not yet understand wallet internals, Script or peer protocols. No curve arithmetic or implementation experience is assumed for the core route.

The core has **13 stops**. Finish it for a working model of wallets, spending and node agreement; then choose a path for a concrete task. Familiar readers may enter at any unit after checking its prior reading. Coverage of the entire BIP collection belongs to the reference index, not the completion requirement.

This is a proposed curriculum. The live site still has its existing 18 lessons and navigation. The two primers require source work before authoring. No new unit is published or approved by this plan.

## Core route

### 1. Follow a payment

[payment-primer](chapter-briefs.md#payment-primer)

By the end: Distinguish the coin being spent, the new outputs, the spending condition and the wallet constructing the transaction.

Check your understanding: In the drawing, point to what is consumed, what is created and what an address describes.

### 2. Find and recover the right keys

[mnemonics](chapter-briefs.md#mnemonics) → [hd-wallets](chapter-briefs.md#hd-wallets) → [addresses](chapter-briefs.md#addresses)

By the end: Explain the different jobs of a mnemonic, seed, derived key and recipient address.

Check your understanding: Which of these is secret, which can be shared, and which describes where a payment should go?

### 3. Authorize a spend

[p2sh](chapter-briefs.md#p2sh) → [segwit](chapter-briefs.md#segwit) → [schnorr](chapter-briefs.md#schnorr) → [taproot](chapter-briefs.md#taproot)

By the end: Trace the commitment, signature and revealed data for a spend, and explain what each proposal changes.

Check your understanding: Compare a P2SH spend with a Taproot key-path or script-path spend: what is committed, revealed and checked?

### 4. Describe a wallet and coordinate devices

[wallet-paths](chapter-briefs.md#wallet-paths) → [descriptors](chapter-briefs.md#descriptors) → [psbt](chapter-briefs.md#psbt)

By the end: Connect derivation conventions to a wallet recipe, then separate that recipe from a transaction container and each signer’s role.

Check your understanding: Why can recovery need more than a seed, and which extra information belongs in a descriptor versus a PSBT?

### 5. Understand relay, validation and upgrades

[network-primer](chapter-briefs.md#network-primer) → [version-bits](chapter-briefs.md#version-bits)

By the end: Distinguish local relay policy, block validity, chain selection and activation rules.

Check your understanding: Could one peer decline a transaction while another accepts it, and why is a signaling bit not itself proof of validity?

## Optional paths

Each path assumes the core concepts. Its order includes any extra prior reading; shared lessons appear in several paths and need only be read once. Reference entries are available on demand. These paths are not additional compulsory courses.

### Back up and recover a wallet

[timelocks](chapter-briefs.md#timelocks) → [entropy-derivation](chapter-briefs.md#entropy-derivation) → [seed-sharing](chapter-briefs.md#seed-sharing) → [wallet-recovery](chapter-briefs.md#wallet-recovery)

By the end: Identify the secret and non-secret material needed for a particular recovery plan; distinguish derivation, sharing and metadata.

### Coordinate multiple signers

[derivation-conventions](chapter-briefs.md#derivation-conventions) → [tapscript](chapter-briefs.md#tapscript) → [descriptor-extensions](chapter-briefs.md#descriptor-extensions) → [psbt-extensions](chapter-briefs.md#psbt-extensions) → [multisig-wallets](chapter-briefs.md#multisig-wallets) → [wallet-policies](chapter-briefs.md#wallet-policies) → [signer-delegation](chapter-briefs.md#signer-delegation) → [musig2](chapter-briefs.md#musig2) → [musig2-wallets](chapter-briefs.md#musig2-wallets)

By the end: Trace shared wallet setup and signing while distinguishing script multisig from aggregate signatures.

### Request payments and reason about privacy

[payment-instructions](chapter-briefs.md#payment-instructions) → [payjoin](chapter-briefs.md#payjoin) → [fee-bumping](chapter-briefs.md#fee-bumping) → [timelocks](chapter-briefs.md#timelocks) → [transaction-fingerprints](chapter-briefs.md#transaction-fingerprints) → [silent-payments](chapter-briefs.md#silent-payments) → [psbt-extensions](chapter-briefs.md#psbt-extensions) → [silent-payment-wallets](chapter-briefs.md#silent-payment-wallets) → [message-signing](chapter-briefs.md#message-signing)

By the end: Separate recipient discovery, transaction collaboration, fee policy, output privacy and proof of control.

### Build spending and recovery conditions

[ecdsa](chapter-briefs.md#ecdsa) → [timelocks](chapter-briefs.md#timelocks) → [tapscript](chapter-briefs.md#tapscript) → [descriptor-extensions](chapter-briefs.md#descriptor-extensions) → [miniscript](chapter-briefs.md#miniscript) → [timed-contracts](chapter-briefs.md#timed-contracts) → [fidelity-bonds](chapter-briefs.md#fidelity-bonds)

By the end: Read a spending condition and state its authorization, timeout and resource assumptions.

### Follow data through the peer network

[peer-handshake](chapter-briefs.md#peer-handshake) → [peer-discovery](chapter-briefs.md#peer-discovery) → [relay-controls](chapter-briefs.md#relay-controls) → [block-relay](chapter-briefs.md#block-relay) → [transaction-relay](chapter-briefs.md#transaction-relay) → [light-client-trust](chapter-briefs.md#light-client-trust) → [block-filters](chapter-briefs.md#block-filters) → [v2-transport](chapter-briefs.md#v2-transport)

By the end: Explain which data a peer sends, what a light client can verify and what transport encryption protects.

### Study consensus and mining

[bip-process](chapter-briefs.md#bip-process) → [validation-case-studies](chapter-briefs.md#validation-case-studies) → [mining-templates](chapter-briefs.md#mining-templates) → [merkle-cleanup](chapter-briefs.md#merkle-cleanup) → [test-networks](chapter-briefs.md#test-networks) → [drivechains](chapter-briefs.md#drivechains)

By the end: Distinguish a validation rule, mining interface, deployment mechanism and test-network choice; evaluate proposed changes by their assumptions.

### Evaluate proposed script changes

[timelocks](chapter-briefs.md#timelocks) → [tapscript](chapter-briefs.md#tapscript) → [covenants](chapter-briefs.md#covenants) → [rebinding](chapter-briefs.md#rebinding) → [vaults](chapter-briefs.md#vaults) → [script-operations](chapter-briefs.md#script-operations) → [script-resources](chapter-briefs.md#script-resources) → [post-quantum](chapter-briefs.md#post-quantum)

By the end: Compare proposed capabilities against the existing spending model without treating document status as activation.

## Reference shelf

Use [the numerical BIP index](bip-index.md) for a specific proposal. Historical, competing and specialized formats get substantive explanations here without extending the core lessons. A reference entry can be a subsection or comparison table; these are not all separate pages.

- **Keys, backups and wallet setup:** [mnemonic-alternatives](chapter-briefs.md#mnemonic-alternatives), [private-key-backups](chapter-briefs.md#private-key-backups).
- **Addresses, scripts and signing:** [address-formats](chapter-briefs.md#address-formats), [p2sh-history](chapter-briefs.md#p2sh-history), [script-tree-history](chapter-briefs.md#script-tree-history).
- **Payments, privacy and proofs:** [merchant-payments](chapter-briefs.md#merchant-payments), [pay-to-contract](chapter-briefs.md#pay-to-contract), [reusable-payment-codes](chapter-briefs.md#reusable-payment-codes), [proof-formats](chapter-briefs.md#proof-formats), [payment-units](chapter-briefs.md#payment-units), [payment-references](chapter-briefs.md#payment-references).
- **Peers, relay and light clients:** [light-client-trust](chapter-briefs.md#light-client-trust), [transport-alternatives](chapter-briefs.md#transport-alternatives).
- **Consensus, mining and upgrades:** [block-size-history](chapter-briefs.md#block-size-history), [transaction-alternatives](chapter-briefs.md#transaction-alternatives), [bip-process](chapter-briefs.md#bip-process), [alternative-pow](chapter-briefs.md#alternative-pow), [validation-case-studies](chapter-briefs.md#validation-case-studies), [activation-history](chapter-briefs.md#activation-history).

## First delivery batches

Each batch adds two bounded units. Author and review one batch before starting the next. A batch is accepted on explanation quality, not the number of new BIPs. All other proposed units remain an unscheduled backlog.

### 1. Make the core route understandable

[payment-primer](chapter-briefs.md#payment-primer), [network-primer](chapter-briefs.md#network-primer)

Fill the two conceptual gaps and connect the existing lessons into the core route.

Acceptance: A reader can trace the same schematic payment from wallet construction to node validation and distinguish those roles. Review the two primer sources; preserve existing lesson scopes and figure IDs.

### 2. Complete one shared-wallet workflow

[psbt-extensions](chapter-briefs.md#psbt-extensions), [multisig-wallets](chapter-briefs.md#multisig-wallets)

Connect descriptor/PSBT fundamentals to consistent multisig setup and version-aware signing.

Acceptance: A static worked setup shows agreement on keys, order, paths and script type; a separate compatibility table correctly distinguishes PSBT version from Taproot fields.

### 3. Complete one payment-request workflow

[payment-instructions](chapter-briefs.md#payment-instructions), [payjoin](chapter-briefs.md#payjoin)

Connect a payment request to a collaboratively built transaction and its privacy assumptions.

Acceptance: A request-to-transaction storyboard identifies the recipient-discovery trust boundary and every sender/receiver check claimed by the explanation.

## Accounting, not a page target

| Unit format | Count |
|---|---:|
| companion | 34 |
| lesson | 18 |
| primer | 2 |
| reference | 19 |

The unit count records useful explanatory boundaries. It does not determine site page count, equal lesson lengths or a release deadline. Existing lessons keep their URLs and figures; companion and reference material can live in grouped pages when that is easier to read.
