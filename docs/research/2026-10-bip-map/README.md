# BIP Atlas curriculum and reference plan

**Teach a useful model of Bitcoin first; make the complete BIP collection available around it.** A reader should finish the main route able to explain how a wallet constructs a payment, how spending is authorized and how nodes reach agreement. Reading every proposal is a reference goal, not a course-completion requirement.

The plan has three layers: a **13-stop core route**, **seven optional paths** organized around reader tasks, and a **complete numerical reference index**. All 18 existing lessons keep their current primary BIPs and focused explanations. New material goes into short primers, companions or reference sections. An existing lesson need not absorb the history and extensions of its entire BIP family.

Start with [the readable curriculum](curriculum.md), including outcomes, understanding checks, optional paths and the first delivery batches. [The unit briefs](chapter-briefs.md) describe each explanation; [the BIP index](bip-index.md) answers where a specific proposal belongs.

This is a curriculum redesign, not implemented site content. Research date: **17 October 2026**. The inventory remains pinned to [`bitcoin/bips` at `927b6de9915c9262615a6399de51b200f81e5aa4`](https://github.com/bitcoin/bips/tree/927b6de9915c9262615a6399de51b200f81e5aa4), whose commit is dated 2 October 2026. The live site still has 18 draft-unreviewed chapters and its existing navigation.

## The reader and the main route

Write for a technically curious reader who recognizes a Bitcoin payment but does not yet understand wallet internals, Script or peer protocols. The core should not require curve arithmetic, a node implementation or familiarity with BIP numbers. Introduce a term when the reader needs it; make byte layouts and derivations optional unless they explain the change.

| Stage | Reading order | What the reader should be able to explain |
|---|---|---|
| Follow a payment | **New payment primer** | Inputs, unspent outputs, recipient/change outputs, fees, keys and spending conditions |
| Find the right keys | Mnemonics → HD Wallets → Addresses | How a phrase, seed, key and recipient address differ |
| Authorize a spend | P2SH → SegWit → Schnorr → Taproot | What is committed, revealed, signed and checked |
| Describe a wallet and coordinate devices | Wallet Paths → Descriptors → PSBT | How devices agree on wallet structure and exchange a transaction for signing |
| Understand node agreement | **New network primer** → Version Bits | Relay policy, validation, block construction, chain selection and activation |

The sequence introduces spending types before asking readers to compare their derivation conventions. The two primers supply missing conceptual scaffolding. Duplicate transaction IDs, subsidy arithmetic and the 2013 chain split become later validation case studies, rather than the introduction to consensus.

The primers own **no additional BIPs**. They need evidence work, including pinned primary protocol documentation beyond BIP abstracts; their briefs name these source gaps. They are bounded introductions, not a new general Bitcoin textbook.

Each stage ends with an understanding question in [curriculum.md](curriculum.md). These check whether the explanation works without requiring a quiz engine or extra controls. Familiar readers can enter later after checking the suggested prior reading.

## Optional paths answer concrete questions

The other seven existing lessons—Timelocks, Tapscript, MuSig2, Silent Payments, Message Signing, Block Filters and v2 Transport—remain available within these paths. Shared lessons appear in multiple paths and need only be read once.

| Path | Reader task |
|---|---|
| Back up and recover a wallet | Identify what must survive, distinguishing secrets, shares, derived entropy and recovery metadata |
| Coordinate multiple signers | Agree on the wallet, register signer policies and distinguish script multisig from aggregate signatures |
| Request payments and reason about privacy | Follow recipient discovery, Payjoin, fees, fingerprints, Silent Payments and proof of control |
| Build spending and recovery conditions | Understand signature constraints, deadlines, Miniscript, hash contracts and fidelity bonds |
| Follow data through the peer network | Understand negotiation, discovery, relay, light-client evidence and encrypted transport |
| Study consensus and mining | Examine validation cases, block templates, test networks and proposed sidechain mechanisms |
| Evaluate proposed script changes | Compare commitments, rebinding, vaults, primitives, resource limits and migration assumptions |

Their exact orders are checked against the prior-reading graph. They are learning paths, not protocol dependency declarations. A Draft payment or peer proposal stays with its reader task; the proposal path groups advanced script and cryptographic changes, not every document with a particular status.

## Give each explanation a clear boundary

| Keep the existing lesson focused on | Put additional material here |
|---|---|
| Mnemonics and HD derivation | Separate entropy derivation, seed sharing and mnemonic alternatives; encrypted individual keys and WIF belong in an import-format reference |
| The BIP44/84/86 wallet paths | A companion for additional purpose conventions and path templates |
| Bech32/Bech32m addresses | Recipient-format comparisons; private-key import formats have their own reference |
| One P2SH spend and the SegWit change | Script-hash design history and witness-aware peer relay, respectively |
| BIP380–386 descriptors | Multipaths, tapscript thresholds and alternative containers in a companion |
| The BIP174 workflow | PSBT v2/Taproot compatibility in a companion; MuSig2 and Silent Payment coordination in separate workflows |
| Taproot and MuSig2 mechanisms | Tree-design history and MuSig2 wallet integration, respectively |
| Silent Payments, message proofs and v2 transport | Separate comparison references and wallet integration where needed |
| BIP8/BIP9 activation mechanics | Deployment history and BIP publication as references |

Avoid gathering unrelated mechanisms under a broad label merely to reduce heading count. Amount units and exchange rates have one reference; chain/transaction locators have another. Hash-time contracts and fidelity bonds have separate explanations. Signer account registration and chain-code delegation solve different problems.

One technical correction is part of these boundaries: **BIP175 derives a BIP32 path from contract data**, rather than specifying a single additive key tweak. Its brief now shows contract hashes → combined digest → child-index path → derived payment address. BIP372's PSBT key-tweak information is a separately labelled construction in the same reference. See the pinned [BIP175 procedure](https://github.com/bitcoin/bips/blob/927b6de9915c9262615a6399de51b200f81e5aa4/bip-0175.mediawiki#L74) and [BIP372](https://github.com/bitcoin/bips/blob/927b6de9915c9262615a6399de51b200f81e5aa4/bip-0372.mediawiki).

The plan records **73 editorial units**: 18 existing lessons, two primers, 34 companions and 19 references. This is an ownership and scope inventory, **not a target of 73 full chapters**. A companion can be a linked subsection; several reference entries can share a comparison page. Page boundaries should follow the reader's question and the explanation's size. Do not generate one site route for every record automatically.

## Deliver one useful workflow at a time

Replace broad coverage waves with three bounded batches, each containing two new units:

1. **Core foundations:** payment primer and network primer. Source and review the general model, then connect the existing lessons into the proposed core route.
2. **Shared-wallet signing:** PSBT extensions and multisig wallet setup. Demonstrate agreement on keys, order, paths and script type, and distinguish PSBT version from Taproot fields.
3. **Payment requests:** payment instructions and Payjoin. Trace a request into a collaborative payment, including trust boundaries and sender/receiver checks.

The machine-readable plan gives each batch dependencies and acceptance criteria. Complete and review one before authoring the next. The remaining units are an **unscheduled backlog**; neither document status nor BIP count sets their priority. Choose subsequent work based on a reader task the existing explanations cannot answer. A successful primer adds no new BIP coverage, and that is an acceptable result.

Before the first new unit becomes site content, permit static-only heroes and appropriate figure budgets in the publication contracts. Today [the chapter tests](../../../packages/publication/test/chapters.test.ts) and [figure policy](../../../content/figure-policy.json) assume an interactive hero plus supporting figures. Keep current chapter expectations intact while allowing simpler new formats. This plan does not change those contracts.

Use a separate publication extension catalog when implementing content; the original catalogs and kit files remain frozen. The site loader and publication tests must agree on that catalog. Change the real reading/title policies only as reviewed content is added. Research files are not site publication inputs.

## Keep the product simple

The contents should offer a starting route, optional paths and “find a BIP.” Use a few labelled related-reading links on each lesson. Keep existing URLs and figure identifiers. The relationship graph remains research data; it does not require a graph explorer or dashboard.

New explanations default to concise prose and static drawings with **zero new interactions**. Use an overview drawing and only the supporting figures needed for the question. No fixed word minimum, mandatory model or interactive hero should produce filler. A model is useful when the explanation computes something; implementing an entire proposal is not the completion criterion.

Explanatory coverage requires a BIP's problem, mechanism, assumptions, relationship to nearby designs and precise source status. A worked example or substantive comparison row can satisfy this; a link or number cannot. Technical review must check the actual claims and drawings against pinned sources. Inventory checks cannot certify teaching quality or the correctness of an interpretation.

## Reference completeness and evidence

The pinned index has **213 published documents** and **three allocated-only entries: 40, 41 and 63**. The existing atlas assigns 33 documents as primary BIPs; 180 still lack a primary explanation. Allocations and number gaps are not missing specifications. Every indexed entry has exactly one reference owner, including historical, Process, Informational, Draft and Closed documents.

Upstream records 78 Deployed, 22 Complete, 56 Draft and 57 Closed documents. These are document metadata, not an adoption survey. Complete does not establish activation; Deployed does not establish current support by every wallet or node. Explain publication separately from implementation and consensus, following [BIP3](https://github.com/bitcoin/bips/blob/927b6de9915c9262615a6399de51b200f81e5aa4/bip-0003.md). Source claims about current behavior separately.

Keep four kinds of relationship distinct:

| Kind | What it establishes |
|---|---|
| Declared headers | What an author lists as Requires, Replaces or Proposed-Replacement |
| Source-body references | That a document names another BIP, without implying dependency |
| Curated interpretation | An editorial explanation supported by relevant excerpts, sometimes from both designs |
| Suggested prior reading | A learning order, checked for cycles and availability along each route |

The 112 curated relationships remain a research aid, not a technical sign-off. The revised evidence format permits comparisons supported by both endpoints. Weak excerpts for wallet-policy/Miniscript, entropy derivation, script-hash formats, Silent Payments and drivechains have been replaced. The pair-commitment/contract-verification reference is no longer presented as proof of a concrete composition. The extractor also excludes a domain such as `bip300cusf.com` from being mistaken for an explicit BIP300 name.

Preserve awkward source facts: BIP157/158 mutually require one another, BIP361 names an unresolved `TBD Post Quantum Signature BIP`, and replacement declarations do not imply universal obsolescence. BIP371 and BIP373 fields support both PSBT versions, whereas the Silent Payment workflows have their own v2 requirements. Proposed script operations and consensus cleanups retain their source status and limits.

“All BIPs” covers this frozen collection, not all Bitcoin technology. Lightning BOLTs, SLIPs, the full Stratum V2 specification and unmerged proposals are separate corpora. General primers and external context need separate evidence without being counted as additional BIP coverage.

## Files and validation

| File | Purpose |
|---|---|
| [curriculum.md](curriculum.md) | Generated route, understanding checks, optional paths, reference shelf and batches |
| [chapters.json](chapters.json) | Authored curriculum v2; its `chapters` records are editorial units with explicit `ownedBips`, formats, placement and batches |
| [chapter-briefs.md](chapter-briefs.md) | Generated briefs showing main, comparison and allocation roles separately |
| [bip-index.md](bip-index.md), [inventory.csv](inventory.csv), [inventory.json](inventory.json) | Ownership, teaching objectives, document metadata and extracted references |
| [bip-notes.json](bip-notes.json) | Authored teaching objective for every published BIP |
| [relationships.json](relationships.json), [declared-relations.json](declared-relations.json) | Curated interpretations and separately extracted author declarations |
| [sources.lock.json](sources.lock.json) | Frozen index and hashes of all 213 root specification files |

Offline consistency check, from the repository root:

```sh
python3 tools/research-bip-catalog.py --check
```

Reproduce generated artifacts and verify excerpts against pinned source bytes:

```sh
git clone https://github.com/bitcoin/bips.git /tmp/bip-atlas-bips-research
git -C /tmp/bip-atlas-bips-research checkout --detach 927b6de9915c9262615a6399de51b200f81e5aa4
python3 tools/research-bip-catalog.py --upstream /tmp/bip-atlas-bips-research --check
```

The checker verifies complete unique ownership, unchanged existing lesson assignments, primer exclusions from coverage, route and batch prerequisite ordering, reference reachability, metadata, generated text and relationship endpoints. With `--upstream`, it checks the pinned checkout, hashes and exact excerpts by regeneration. Text matching proves excerpt fidelity, not the interpretation. `--write` regenerates research artifacts only. A corpus refresh needs a separately reviewed snapshot; production chapter evidence stays pinned to its current sources.
