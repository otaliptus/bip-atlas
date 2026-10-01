# BIP Atlas: an automated, illustrated Bitcoin field guide

**Version:** 0.1.0 implementation brief  
**Research date:** 1 October 2026  
**Scope:** eight chapters, ten primary BIPs, five supporting BIPs; a build-time publishing pipeline.  
**Status:** specification and tested ingestion/model starter, not a finished website.

## 0. Product decision

Build a small, beautiful publication that explains selected BIPs through readable essays and precise interactive diagrams. Use bips.dev as the convenient human-readable reference and `bitcoin/bips` as the versioned source for generation. Do not make a general-purpose “paste any URL” application in the first release. The user-facing product is the field guide; the compiler is an internal build tool.

The assumed deployment is a site under your control. Nothing in this package modifies bips.dev or implies affiliation with its operator. When extending a fork of its repository, the same compiler can produce additional explanatory pages without overwriting the original proposal pages.

The key promise is: **read the idea, manipulate the mechanism, inspect the evidence.** An explainer must let a reader understand what changes, why it changes, and where its explanation deliberately stops.

This specification specializes the earlier Field Guide Compiler. Retain its Blueprint Editorial styling, stable content rendering, and numerical correctness requirements. Replace its broad ingestion product, authoring studio, and database-heavy deployment with a fixed chapter catalog, Git-pinned inputs, a command-line generation pipeline, and static publishing. Do not implement accounts, payments, a public chatbot, a wallet, or a general cryptographic playground.

Normative words MUST, SHOULD, and MAY indicate requirements, defaults, and optional features. Word counts, component dimensions, performance budgets, and review policies below are proposed product defaults, not measurements of Making Software or bips.dev.

## 1. Research findings and their implementation consequences

The bips.dev README describes a Zola-generated static site using the `bitcoin/bips` repository as input. Its inspected repository also contains Rust source, a BIPs Git submodule, templates/static assets under `web`, and a Justfile that orchestrates generation, CSS, Zola, and search. This gives two sensible integration paths; it does not require recreating the site's infrastructure. [R01, R02]

The inspected bips.dev Justfile's `bips` step updates its submodule with `--remote`. That is suitable for discovering upstream changes but must not run implicitly during a reproducible explainer release. Resolve a source revision during an explicit refresh, record it, and build from that revision. The README also references some older script paths absent from the inspected tree, so use the pinned actual build definitions rather than assuming every README command still exists. [R02]

The GitHub connector returned `bitcoin/bips` master commit `3a10b5b5f0a7586df8928d580a3009744ebb2079`, dated 28 September 2026, during this research. The inspected bips.dev tree was `6def95041640fa7dd4721e18d700770b25f5e816`. These are research observations, not promises that those branches remain current. No complete upstream source snapshot is distributed in this package. [R03]

BIP 3 is the current process document in the inspected material. It permits MediaWiki and Markdown, defines an RFC-822-like preamble, describes the statuses Draft, Complete, Deployed, and Closed, and explains that repository inclusion is not community consensus or a blanket recommendation. Preserve status and metadata verbatim; do not infer deployment from the existence of a BIP. Retain legacy and unknown fields when processing historical revisions. [R04]

Several BIPs describe the historical circumstances in which they were proposed. Their use of “currently,” “future,” or “will be deployed” must not automatically become present-tense claims in the explainer. A statement of intended activation is not proof of actual activation. A proposal's rationale is not an independently measured outcome. Treat these as explicit evidence categories.

## 2. The launch curriculum

The selection below is an editorial recommendation for broad conceptual coverage, useful visual mechanisms, and testability. It is not a definitive ranking of every BIP's historical importance.

### Phase one: five chapters covering seven primary BIPs

| Chapter | Primary BIPs | Question | Main visual |
|---|---|---|---|
| Mnemonics | 39 | How can a wallet backup become a list of words? | Bit ribbon resolving into 11-bit groups and words. |
| HD wallets | 32 | How can one seed grow an entire wallet? | Derivation tree with public/private capability boundaries. |
| SegWit | 141, 143 | Why does a transaction have two identifiers? | Exploded serialization with hash and weight lenses. |
| Addresses | 173, 350 | How does an address notice a typing mistake? | Character strip, checksum validation, and witness version selector. |
| PSBT | 174 | How can separate devices help sign one transaction? | Information envelope moving through reviewed roles. |

### Phase two: three additional chapters, reaching ten primary BIPs

| Chapter | Primary BIP | Question | Main visual |
|---|---|---|---|
| Schnorr | 340 | What does a signature verifier actually check? | Verification pipeline with public valid/invalid vectors. |
| Taproot | 341 | How can an output commit to several ways of spending? | Internal key, script tree, tweak, and selective proof revelation. |
| Tapscript | 342 | What changes when Bitcoin runs a Taproot script? | Reviewed opcode/stack execution traces. |

The primary set is therefore exactly `32, 39, 141, 143, 173, 174, 340, 341, 342, 350`. A joint chapter is intentional: readers should not learn the earlier witness-address encoding in isolation from its later version-specific modification. BIP 350 requires Bech32 for witness v0 and Bech32m for witness v1–v16. [R08, R09]

The supporting set is `3, 16, 144, 370, 371`. These provide process, P2SH/serialization, and PSBT-version context when needed; they do not receive standalone launch chapters. This set is not a complete transitive dependency closure. Expand supporting sources only when a specific claim requires them, with an explicit budget and pinned revision. Do not teach BIP44 path structure as though it were defined entirely by BIP32. [R05, R07, R10]

Reading order and build order are different. Read mnemonics, keys, transactions, addresses, PSBT, then Taproot-related material. Build the address chapter first because it exercises the typography, byte/character drawing primitives, controls, negative cases, and exact test-vector comparison without accepting secret material. Then build mnemonics and HD wallets before the more complex transaction and script material.

`catalog.json` is the machine-readable version of this curriculum. The titles, controls, warnings, and test families are proposed briefs, not generated or reviewed publications.

## 3. Reader experience and information architecture

### 3.1 Public routes

Use `/` for the cover and contents, `/learn/<chapter-id>/` for a chapter, `/bip/<number>/` as a stable alias to the appropriate chapter, and `/methodology/` for sources, generation, review, and limitations. A pair such as BIPs 173 and 350 should resolve to the same canonical chapter rather than generate two near-identical essays.

A site fork MUST leave the original numeric proposal pages available and distinguish “Proposal” from “Visual guide.” Put explanatory material under a separate namespace. Source pages are not to be silently rewritten into educational paraphrases.

Every chapter shows its question-led title, BIP number(s), a short promise, exact source revision, latest successful source check, and review state. Long preambles and author lists belong in a readable Source details disclosure, not as a wall above the article. Preserve proper authorship and notices. The explainer is independently written; it is not the official proposal or a normative implementation reference.

### 3.2 Three simultaneous reading depths

The default path explains the mechanism in approximately 1,100–1,800 words. A “Details” disclosure expands byte-level distinctions, equations, and caveats. A “Source” disclosure links the local claim to the exact pinned specification section. Do not generate three unrelated versions whose statements drift apart. They must use the same claim IDs and evidence.

The visible structure is a question, familiar situation, minimal mental model, first revealing figure, worked public example, important caveat, and consequence. Avoid mechanically repeating visible headings like Abstract, Motivation, and Specification. The compiler uses those source sections; the reader receives an authored explanation.

### 3.3 Chapter rhythm

Use one dominant figure and one or two supporting figures per chapter. A supporting figure can be static. Do not turn every paragraph into an interactive lesson or every technical noun into a tooltip. One well-chosen control is more useful than an elaborate control panel.

A useful default rhythm is 120–250 words, figure, 150–300 words, smaller figure, worked example, caveat. This is a starting composition, not a validator that forces unnecessary text to meet a quota. A short, accurate section must not be padded because its figure is visually large.

## 4. Visual system: Bitcoin content, editorial identity

Keep the original proposal's near-white paper, dark serif prose, vivid blue technical marks, restrained pixel typography, construction lines, and numbered figures. Do not convert it into a cryptocurrency marketing page. Exclude gold coins, ubiquitous orange gradients, price tickers, dashboard statistics, glowing network globes, and random blockchain cubes.

The dominant visual objects should be things the article actually explains: a transaction's serialization, a set of bit groups, a derivation tree, an address, a PSBT map, or a commitment proof.

### 4.1 Tokens and typography

Use the accompanying `design-tokens.css` from the earlier specification as a starting design system. Proposed core colors are paper `#FAFAFC`, ink `#222225`, technical blue `#2945F5`, dark blue `#1934C6`, and grid `#E6E8FA`. The body is serif, around 18px with 1.6 line height and a 64–68ch reading measure. A distinct pixel monospace is reserved for the masthead and short specimen identifiers; meaningful bytes and labels use a readable ordinary monospace.

No font files are included. Acquire and license your own font assets. Preserve browser zoom, user text sizing, and readable fallback metrics. A pixel aesthetic does not justify tiny captions or informative 11px text.

For a BIP chapter, the masthead might read `BIP ATLAS`; a specimen label might read `BIP 0173 + 0350`; a figure identifier might read `FIG. A04.1`. The headline itself is a large serif question. Do not set long headlines in the pixel font. Avoid the visual ambiguity of leading-zero BIP numbers in URLs; decorative labels may pad them, canonical metadata remains numeric.

### 4.2 Composition

Use a page maximum around 1,200px and a prose column around 700px, with a wide figure option around 960px. The first desktop composition may pair a narrow introduction with a larger diagram. Subsequent sections return to a calm central reading column. Borders should delineate byte segments and figure boundaries, not wrap every text paragraph in a card.

A useful article top is:

```text
BIP ATLAS                           CONTENTS / METHODOLOGY
─────────────────────────────────────────────────────────
BIP 0173 + 0350                     Source revision …
How does an address notice
one wrong character?

Short reader promise.              Oversized annotated
A concrete reason to care.         address specimen.
─────────────────────────────────────────────────────────
The first explanatory section …
```

This is a layout specification, not a generated screenshot or verified mockup. The approved first article must be captured at desktop and mobile widths before becoming a visual baseline.

### 4.3 Drawing grammar

Primary SVG strokes start around 1.5px; construction strokes are lighter and may be dashed. Use a shared arrowhead, corner treatment, baseline, annotation spacing, and selection treatment. Reserve dotted leaders for annotation and solid arrows for actual relationships. Keep cryptographic hashes and public-key values as byte data, not invented decoration.

Byte cells show their offsets and lengths where those matter. Character cells use a shared size and align to semantic groups. A visually shortened hexadecimal value MUST contain an ellipsis and offer the exact value through a disclosure. Never display truncated bytes as a complete valid fixture.

Tree edges distinguish “derived from,” “commits to,” and “recommended reading before.” Those are different relationships and must never be collapsed into one undocumented arrow style. A curriculum prerequisite is not a BIP's formal `Requires` field.

Use color plus a secondary cue: outline, label, pattern, or line style. Blue versus gray alone must not be the only way to tell “revealed” from “hidden,” “included in hash” from “excluded,” or “valid” from “invalid.”

### 4.4 Mobile behavior

At narrow widths, horizontal pipelines become vertical, labels move into numbered legends, a bit ribbon becomes grouped rows, and tree depth is navigated through a compact outline. Byte inspection may scroll inside its own labeled panel while the overall page remains within the viewport. Do not scale 14px labels to 7px just to retain the desktop drawing.

Controls must remain usable by keyboard and touch. Provide explicit previous/next step buttons; dragging cannot be the only interaction. The accessible text describes the learning result, not just the appearance of the drawing. Reduced-motion users get direct state changes. Ordinary reading and source inspection must work without diagram JavaScript.

## 5. Chapter blueprints and exactness requirements

### 5.1 BIP39: entropy becomes words

Start from a backup phrase that a reader has seen, without asking them to supply one. Explain the distinction between computer-generated entropy, a checksum-bearing mnemonic, a derived seed, and subsequent wallet keys. BIP39 specifies entropy-to-mnemonic and mnemonic-to-seed procedures; BIP32 handles a subsequent key-derivation structure. [R05, R06]

The hero is a ribbon of public fixture bits. It reveals the checksum region, partitions the combined data into 11-bit groups, and associates those groups with wordlist indices. For the 128-bit case, the teaching model computes 4 checksum bits, 132 total bits, and 12 words. The last word includes 7 entropy bits as well as the 4 checksum bits; do not label that entire word “the checksum.” The corresponding 256-bit case has 24 words. [R06]

The supporting pipeline shows mnemonic and optional passphrase leading to a seed. The exact details view must preserve NFKD normalization, the specified salt construction, PBKDF2-HMAC-SHA512, 2,048 iterations, and 64-byte output. A passphrase is not interchangeable with a wallet application's encryption password. The fixture UI uses a fixed public sample; it is not a seed-import tool. [R06]

Controls select public fixtures and reveal grouping. They do not request arbitrary recovery words, entropy supplied by a reader, or a real passphrase. The all-zero entropy example is deliberately public and insecure for actual use. A prominent label says never use displayed examples to hold funds.

Tests cover allowed lengths, word-count and checksum formulas, leading zeros, wordlist indices, published seed vectors, and Unicode normalization. The included starter checks bit grouping, not the full mnemonic-to-seed implementation. Do not report the unimplemented tests as passing.

### 5.2 BIP32: a tree with capability boundaries

The hero should make the public/private distinction visible before introducing a dense equation. One branch can show an extended public key and another an extended private key. A hardened edge is a clearly marked boundary: the public-only view cannot derive through it. Chain codes are explicit data, not invisible magic. [R05]

Allow a reader to expand a fixed public test tree and switch between capability views. Do not let a drag gesture arbitrarily change cryptographic relationships. The extended-key values, serialization, fingerprints, and child paths must come from a tested library or fixture data, never from prose generation.

Keep wallet path conventions separate from the general derivation mechanism. Discuss the relevant exposure caveat for parent extended public data combined with a non-hardened child private key, but do not suggest xpubs alone reveal private keys. Display public fixture material only. [R05]

Use BIP32's embedded vectors, including leading-zero and invalid extended-key cases. A visual snapshot does not validate these computations.

### 5.3 BIPs141/143: transaction anatomy, identifiers, and a signing view

This chapter has a broader core and a clearly labeled deeper subsection. The hero is the serialized transaction: version, marker/flag when applicable, inputs, outputs, witness, and locktime. A lens highlights bytes included in the txid preimage versus the wtxid preimage. A second lens reveals the different signing preimage for the supported BIP143 witness-v0 fixture. The exact byte order and hashes are calculated from the fixture. [R07, R11]

Do not describe SegWit as taking signatures off the blockchain. Do not say every witness item is a signature. Do not animate an arbitrary witness mutation as a valid alternative signature; a byte mutation can change a hash while making the transaction invalid. Label a mutation demonstration as serialization-only unless validity is separately checked. [R07]

The weight readout derives from `3 × base bytes + total bytes`; virtual bytes round weight divided by four upward. Use actual parsed fixture sizes when claiming a real transaction size. A separate arbitrary size slider must be labeled an arithmetic illustration and constrained to total size at least base size. It does not represent a valid transaction by itself. [R07]

The BIP143 details explain the digest of the input being signed, including its spent output's amount. Do not generalize this to every signature algorithm or claim it alone establishes all input amounts and the total fee of an arbitrary transaction. Support only named sighash fixture modes until the full implementation is tested. [R11]

### 5.4 BIPs173/350: the golden chapter

This should be the first fully polished implementation. Render an address as a technical specimen with its human-readable part, separator, version/data region, and checksum. Let the reader choose a public valid v0 fixture, a public valid v1 fixture, a wrong-checksum-family fixture, and a controlled typo. Show exactly which validation stage rejects a sample; do not claim the checksum always pinpoints the mistaken character. [R08, R09]

The fixed correct rule is witness v0 → Bech32, witness v1–v16 → Bech32m. Distinguish generic encoding validity, SegWit address validity, and actual spending rules. A syntactically valid higher-version address is not proof that a wallet supports its semantics or that sending funds there is safe. A v1 program is not automatically a Taproot output regardless of length; BIP341 defines the 32-byte case. [R09, R13]

The default UI allows fixture mutation without requiring an arbitrary address input. Never silently correct a destination or offer a “send” action. A valid checksum is not a claim of ownership, balance, safety, or recipient identity. [R09]

Test generic checksum vectors and witness-address vectors separately. Include wrong network, mixed case, invalid characters, bad padding, invalid lengths, out-of-range versions, and correct-checksum/wrong-family cases. The package includes a deliberately small decoder and selected vectors; it is not a full conformance suite or production wallet library.

### 5.5 BIP174: the envelope, not just signatures

Draw a PSBT as a document envelope containing a global map and per-input/per-output maps. A role trace shows information being added or transformed, using the proposal's roles rather than implying that every wallet must follow one fixed multi-device choreography. The specification defines the generic format and version 0; distinguish a teaching sequence from mandatory network behavior. [R10]

The reader can advance a reviewed fixture trace, inspect changed fields, and compare partial/final states. Signing occurs only in a controlled fixture-generation step, if required at all. A public site can replay a verified trace without embedding a signer. There is no transaction broadcast, arbitrary PSBT upload, or hardware-wallet connection in version one.

Unknown fields must not disappear from round-trip demonstrations. Duplicate keys and malformed records must be handled according to the selected specification. Do not label a version-2 or Taproot extension field as originating in BIP174. BIPs370 and 371 are supporting context only until their own scope is implemented. [R10, R15]

### 5.6 BIP340: a real verifier, a restrained illustration

Introduce a signature verifier as a function of a public key, message, and signature. Use valid and invalid public vectors to make “passes verification” concrete. The meaningful figure is the verification pipeline and its equation, not an animated graph pretending that real-number coordinates are Bitcoin's finite-field curve. [R12]

The exact details view includes x-only public keys, signature byte structure, tagged challenges, and the necessary verification checks. A purely conceptual geometric analogy must be conspicuously separated from actual computed data. Avoid teaching a naive signing scheme or allowing a user-controlled nonce.

Do not claim BIP340 alone supplies a safe complete multisignature protocol. Do not preserve an obsolete assumption that all BIP340 messages must be exactly 32 bytes; the inspected document includes arbitrary-sized messages and notes that change in its history. [R12]

Use the pinned official CSV vectors through a reviewed implementation. Its own reference implementation is explicitly demonstration-only and non-constant-time; do not adopt it as a production signing library simply because it is official reference code. [R12]

### 5.7 BIP341: commitment and selective disclosure

The hero joins an internal key, a script tree, and a tweaked output key. The reader switches between key-path and script-path spending and selects a leaf. In script-path mode, reveal the script, required witness/control information, and sibling hashes, while keeping unrelated scripts concealed. Labels must distinguish the internal and output keys. [R13]

The diagram must not imply that a proof contains only the chosen script, that Taproot always hides every policy, or that key aggregation is accomplished by carelessly adding public keys. State the actual observation the representation supports. If a balanced tree is chosen for visual clarity, disclose that it is one example rather than a mandatory structure.

Compute leaf hashes, branch ordering, tweaks, output keys, and control blocks using reviewed functions matched to BIP341 wallet vectors. Preserve byte order and parity. If this is not implemented, display verified static fixture traces instead of fake interactive cryptography. [R13]

### 5.8 BIP342: a trace player before a general interpreter

Build a trace player, not a general Bitcoin Script interpreter, for this release. A trace consists of the current opcode, stack before/after, signature-check result from the reference fixture, and any relevant explanatory note. A clear scope badge says “Recorded, verified example.” [R14]

The controls step forward and backward through reviewed scenarios. Do not allow arbitrary scripts. Do not silently apply legacy CHECKMULTISIG semantics, skip OP_SUCCESS behavior, or claim complete consensus verification because a simplified animation reaches TRUE. A later full interpreter would require a substantially broader test and review effort. [R14]

The article explains the distinction between Taproot's spending structure and Tapscript's execution rules. Link back to the existing commitment diagram instead of redrawing a conflicting tree.

## 6. A reusable component system rather than eight unrelated demos

The code-generation LLM may help build trusted recipe implementations during development. The content-generation LLM must only instantiate approved recipes during publication. Separate these permissions even if the same underlying model is used for both jobs.

Implement a small common primitive layer: labeled bit/byte ribbon, tree layout, staged pipeline, key/value envelope, state comparison, equation annotation, stack trace, and source-linked caption. Topic recipes compose these primitives with topic-specific typed data. A generic tree renderer does not itself know whether an edge is a derivation or a commitment; the recipe supplies the semantics and accessibility text.

Each recipe registers a versioned identifier, input schema, permitted fixture collections, allowed interaction states, geometry function, static renderer, interactive controller, accessible summary, mobile layout, and conformance-test adapter. It also declares which quantities are conceptual and which are computed.

Recipe data must not contain raw executable code, arbitrary HTML, unreviewed SVG markup, browser script URLs, or CSS overrides. Render formatted strings as text by default. Code examples are escaped content. In particular, never execute a model-generated MDX component or a script embedded in a source BIP.

The earlier `publication.schema.json` does not accept these new recipe types. This package does not silently modify that contract. During implementation, release a new explicitly versioned publication schema and migrate the generic figure registry. Treat `catalog.json` as a separate planning contract, not a schema-valid completed article.

## 7. Source and evidence contracts

### 7.1 Immutable source bundle

Every generation job starts with a source bundle containing repository name, exact commit, source-file path, file SHA-256, Git blob ID, original bytes, detected encoding, original preamble, heading/source spans, and included auxiliary files. Resolve Markdown and MediaWiki at the selected commit rather than hardcoding the extension forever.

Source acquisition must read Git objects at the pinned revision, not a possibly edited worktree. The starter script does this and records hashes. It copies auxiliary files only under explicitly selected BIP directories, with byte limits and symlink/submodule rejection. No source code is executed. External fixture repositories require their own independent revision and file hashes; “master” is not an acceptable fixture pin.

The included preamble parser preserves raw source and candidate headings. It is not a complete MediaWiki-to-AST implementation. Before automatic article generation, implement and test a fuller adapter for tables, lists, inline code, formulae, references, and source spans. A heading scanner alone must not be described as extracting all normative rules correctly.

### 7.2 Evidence ledger

Each substantive claim receives an ID and one or more source spans. Required fields include `claimText`, `scope`, `evidenceRefs`, `qualifiers`, `appliesTo`, `excludedCases`, and `verificationState`. Useful scopes are normative proposal rule, proposal rationale, historical statement, observed implementation behavior, editorial analogy, and computed fixture fact.

A claim can be source-supported without being independently verified. Preserve this distinction. A claim about network activation requires separate dated evidence; do not fill it from the BIP status. A claim about a current wallet's behavior requires a pinned implementation/release reference, not a decade-old motivation paragraph.

Source spans should identify file hashes and exact line or byte ranges. Store small excerpts where licensing permits, enough to verify context. Do not generate citations from guessed headings or attach an entire BIP to every paragraph regardless of what it supports.

### 7.3 Status, authorship, and freshness

Store `proposalStatusRaw`, `proposalTypeRaw`, `sourceRevision`, `sourceCheckedAt`, `generatedAt`, `reviewedAt`, and optional `activationEvidence` as independent fields. Optional values remain absent or null when unverified. Display “Not independently checked” rather than turning a missing datum into a confident badge.

Keep author's statements attributed. Preserve title, authors, copyright/license notices, and version metadata from the selected revision. Inspect content licensing separately from the bips.dev website code license. A missing License header triggers review of the original Copyright section rather than guessing the file is unlicensed or public domain. [R04]

Do not update a “verified today” badge merely because a webpage was rebuilt. Successful source refresh, successful model tests, and human review are three distinct timestamps.

## 8. The automated compiler

### Stage A: resolve and snapshot

Input is a catalog and an explicitly chosen commit. Validate the selected IDs, source paths, byte budget, and file hashes. Capture primary and relevant supporting material. Preserve all source notices. Reject unreadable or missing source files; do not let the LLM reconstruct them from memory.

### Stage B: normalize and inventory

Produce an AST with source mappings, a metadata record, defined terms, normative statements, equations, compatibility rules, and linked test assets. Mark deictic historical text such as “currently” and “will” for time-scope review. Unknown syntax becomes a visible extraction warning.

### Stage C: construct the fact pack

Build the evidence ledger and select relevant test fixtures. Resolve every intended exact output through a deterministic adapter. The model may request “a valid witness-v0 example”; the fixture catalog, not the model, supplies its bytes. Store model output separately from verified fixture data.

### Stage D: apply a chapter brief

Load the chapter's reviewed question, scope, prerequisite terms, misconception checklist, recipe choices, and desired narrative. The planner may adapt the explanation based on the evidence, but cannot change the source list, security policy, design tokens, or permitted renderers silently.

Require a section plan and a visual plan together. For each section identify the question answered, reader's likely misconception, supporting claims, figure purpose, and unavoidable caveat. Do not draft an essay first and sprinkle diagrams over it afterward.

### Stage E: write structured publication content

The writer outputs validated data for headings, paragraphs, callouts, source references, and approved figures. Its numeric outputs are references to fixture facts, not hand-entered replacements. Specify audience, source scope, desired word range, and banned misconceptions. The writer may explain a rule more gently but may not erase its conditions.

The figure planner chooses a recipe ID, fixture ID, initial state, allowed controls, static caption, dynamic caption template, learning objective, and mobile strategy. Controls must stay within the verified state space. A caption that states a specific count must derive that count from the same state as the drawing or explicitly say “in the initial example.”

### Stage F: mechanical checks

Run JSON Schema validation; verify all references resolve; enforce source/fixture hashes; reject unknown renderer names; assert numeric outputs; test keyboard state transitions; and check every announced standard-specific rule. Check that all private-data inputs and network-broadcast capabilities remain disabled.

Do not rely on a language model to confirm a checksum, count serialized bytes, or perform elliptic-curve arithmetic. If a fixture disagrees with the implementation, stop rather than “repairing” the expected fixture to match the code.

### Stage G: independent technical and editorial review

The technical critic reads the evidence and specification independently of the draft's self-description. It checks scope, omitted conditions, historical tense, wrong-standard attributions, and unsupported claims of privacy or security. The editor checks clarity, causal sequence, term introduction, repetitive prose, and whether every figure adds understanding.

A model review is one layer, not a certificate. First publications and substantive protocol/security changes require knowledgeable human review under the default policy. This is not a requirement to hand-write every essay; it is a release checkpoint for consequential mistakes.

### Stage H: visual review

Render actual HTML at 390px, 768px, and 1440px widths. Check title wrapping, long hashes, captions, label collision, byte alignment, source disclosures, focus order, and figure recomposition. A visual critic receives real screenshots, not only the source code. Human approval establishes the initial golden baseline.

The static page must be useful with JavaScript disabled. User-adjustable states must not change the surrounding prose into a false statement. Print should include expanded essential caveats and the source revision, with a meaningful static view for every interactive figure.

### Stage I: bounded repair and publication

Permit at most two automated repair attempts by default, limited to the failed artifact. Then report an explicit blocker with the affected source spans, fixture IDs, and tests. Do not run indefinitely, silently drop the difficult figure, or publish a blank placeholder.

A successful job produces a reviewable diff and preview. Publishing promotes one immutable artifact bundle. Keep the previous valid release available until the new one passes. Source polling and generation do not themselves grant write access to a production branch or hosting account.

## 9. Operating automation after launch

Maintain a dependency graph from source spans and fixture files to claims, sections, figures, and chapter artifacts. The graph must also identify shared recipe and design-token dependencies.

On an intentional scheduled refresh, resolve upstream master once, compare source and auxiliary-file hashes with the prior lock, and identify affected chapters. An unrelated BIP edit should not regenerate all eight chapters. A shared decoder change, however, must rerun every chapter using that decoder.

A stable cache key includes selected source hashes, supporting evidence hashes, fixture hashes, schema version, recipe version, prompt hash, model identifier/configuration, and relevant design version. Temperature zero does not promise a deterministic model output. Cache accepted content artifacts explicitly; deterministic rendering follows from those saved inputs.

Classify changes conservatively:

| Change | Default action |
|---|---|
| Unrelated upstream file | No chapter regeneration. |
| Source typography/wording that could change meaning | Technical diff review; do not assume cosmetic. |
| Exact unchanged source and fixtures | Reuse saved article data. |
| Test-vector change | Rerun adapter tests and review affected figures. |
| Proposal status/type/version change | Refresh metadata and review status-dependent prose. |
| Specification/security/privacy claim change | Regenerate affected material and require review. |
| Shared recipe or style change | Rebuild affected pages and review screenshots. |

The default catalog does not enable automatic public publishing even for mechanical changes. Once initial operations are trusted, a narrowly defined mechanical-only policy may be enabled explicitly. New semantic prose, cryptographic behavior, unsupported inputs, and source conflicts remain gated. Fully automatic draft generation is the normal operation; unconditional semantic autopublishing is not required to achieve automation.

Do not trust an upstream page's instructions as operational instructions. Retrieved sources are data, not permission to run commands, request credentials, reveal prompts, or extend network access. Source reading, model writing, deterministic checking, and publishing should have separate capabilities.

## 10. Implementation architecture

### 10.1 Recommended independent site

Use Astro for static article rendering with small React or equivalent islands only where interaction is needed. Astro's islands model explicitly supports mostly static pages with localized interactive components. An existing Next.js application can use a comparable static output strategy; do not migrate a healthy stack solely to follow this preference. [R16]

The generation tool can be Python or TypeScript. It runs locally or in CI, not in the reader's browser. Use JSON artifacts in Git plus a public static-assets directory. No database or job queue is needed for an eight-chapter batch pipeline unless operational constraints later justify one. Credentials belong only in the generation environment.

Suggested implementation structure:

```text
apps/site/                     static reader and index
packages/publication/          versioned schema and safe renderer
packages/figures/              primitive drawing system and recipes
packages/models/               tested computations and fixture adapters
content/catalog.json           chapter definitions
content/chapters/               accepted generated publication JSON
sources/locks/                 revisions, source hashes, notices
fixtures/                      reviewed public vectors and derived traces
pipeline/                      normalization, evidence, planning, writing
prompts/                       role instructions and prompt versions
tests/                         contract, vector, browser, and regression tests
```

A source snapshot may be stored outside the public repository or downloaded during CI, but its lock file must identify the exact bytes. Do not expose long private model logs in the published site. A compact methodology record is sufficient for readers.

### 10.2 Extending a bips.dev fork

Preserve the Rust/Zola path that renders original BIPs. Add a generation step producing explanatory content and a trusted fixture/figure bundle under a separate namespace. Connect the new templates and stylesheet deliberately; do not ask the compiler to rewrite the existing Rust parser or all source pages on each run. [R01, R02]

Static SVG and small JavaScript modules may fit this path without introducing a second web framework. Choose this option when maintaining a recognizable fork is an explicit product goal. Choose the independent-site path when the custom editorial reader is the primary product.

### 10.3 Proposed CLI contract

The finished compiler SHOULD expose equivalent commands, though their implementation is not provided here:

```text
atlas source refresh --catalog content/catalog.json
atlas generate --chapter addresses --source-lock <lock-file>
atlas verify --chapter addresses
atlas preview --chapter addresses
atlas generate --phase 1 --source-lock <lock-file>
atlas build --approved-only
```

These commands describe the target interface. They are not available commands in this starter package. The supplied runnable commands are listed separately in README.md.

### 10.4 Performance and privacy defaults

Keep article prose available without client rendering. Load crypto-heavy functionality only on pages and interactions that require it. A proposed initial budget is less than 60KB compressed JavaScript for the ordinary reader shell; set separate measured budgets for diagram chunks and do not hide font or fixture payloads when reporting page weight.

Never transmit interactive fixture state for analytics by default. Do not put secret-looking input values in URLs, telemetry, crash reports, or local storage. Version one has no recovery-phrase field, extended-private-key field, arbitrary PSBT uploader, signing flow, or broadcast endpoint. Fixtures are public test material and must be labeled as such at the point of use.

## 11. Quality and release acceptance

A release is complete only when the selected chapter's narrative, figure, sources, tests, and accessible fallback are complete. “Compiles” is not the definition of “correct.” “Looks like a blueprint” is not the definition of “explains something.”

For all eight chapters: source revision is visible; all factual claims resolve; all exact values come from fixtures/models; all figures have a clear takeaway; all supported states have consistent captions; every interactive lesson has a static equivalent; all source-status claims preserve scope; all first publications have recorded review.

For the golden address chapter: the v0 and v1 public samples match their expected scriptPubKeys; wrong-family vectors fail even when their generic checksum is valid; mixed-case and padding cases fail correctly; readable desktop/mobile compositions exist; no field encourages entering private data; no automatic destination correction is offered.

For BIP39: approved entropy lengths and grouping pass; leading zeros are preserved; actual seed generation, when added, is checked against pinned vectors rather than inferred from the layout tests. For BIP32: public/hardened boundaries and serialization match vectors. For SegWit: transaction parsing and hash display conventions are tested independently. For PSBT: preserved unknown fields and validated trace transitions are tested. For BIP340/341: reviewed crypto adapters pass their pinned vector suites. For BIP342: the trace player explicitly rejects unsupported arbitrary input and is not labeled a full consensus engine.

Maintain positive and negative vector coverage reports. A percentage score from a model is not sufficient evidence. Do not use vague badges such as “Bitcoin verified” or “secure by design.” Display exactly what was checked.

## 12. Build milestones

**Milestone 1 — the first page, by hand.** Build the address chapter shell with original sample prose, the address ribbon, a caption, the source disclosure, and mobile recomposition. Establish the reader design before integrating any model API. Accept actual screenshots, keyboard behavior, and static fallback.

**Milestone 2 — truthful interaction.** Connect the address fixture model, show valid and invalid states, and add vector tests. The drawing, validation labels, and displayed data share one state model. A hand-authored typed article can now demonstrate the full reader.

**Milestone 3 — automated first chapter.** Snapshot pinned sources, normalize them, build evidence, apply the address brief, generate structured prose, render, and produce a review diff. Fail closed on unsupported claims and unknown recipes. Generation from the same accepted artifact should reproduce the same site.

**Milestone 4 — phase-one curriculum.** Add the four other phase-one chapters. Reuse primitives, not prose. Measure how many manual corrections were needed and turn repeatable failures into tests and prompt constraints. The launch contains five chapters covering seven primary BIPs.

**Milestone 5 — Taproot group.** Add BIP340 verification, BIP341 commitment proofs, and BIP342 trace playback. Do not turn these into a new signing application. The result is eight chapters covering ten primary BIPs.

**Milestone 6 — maintenance.** Add source-diff polling, targeted regeneration, review states, artifact rollback, and a documented mechanical-only publishing policy if warranted. Do not make maintenance automation a prerequisite for proving the first reader works.

## 13. What this package does and does not deliver

Delivered: this specification, an eight-chapter catalog, compiler-role prompts, copied proposed design tokens from the prior brief, a local Git-object source-snapshot script, small deterministic teaching models, and an offline test suite. The suite passes 36 named tests in the included run.

The source-snapshot script was tested against a temporary local Git repository, including a dirty-worktree test demonstrating that committed bytes are used. It was not run against a downloaded full live Bitcoin BIPs checkout in this environment. Public web/GitHub research was available through tools; network access from the local execution environment was unavailable. No full current source bundle or all-vector conformance report is claimed.

Not delivered: a complete MediaWiki parser, LLM-provider integration, full publication schema migration, full cryptographic implementation, all BIP conformance suites, finished browser-rendered figures, screenshots, hosting, accessibility audit, or production deployment. The code is a runnable starter for precisely defined pieces, not an assertion that the entire application is built.

## References

[R01] bips.dev repository README: https://github.com/nickmonad/bips.dev/blob/master/README.md  
[R02] Inspected build file: https://github.com/nickmonad/bips.dev/blob/6def95041640fa7dd4721e18d700770b25f5e816/Justfile  
[R03] Observed BIPs commit: https://github.com/bitcoin/bips/commit/3a10b5b5f0a7586df8928d580a3009744ebb2079  
[R04] BIP3: https://bips.dev/3/  
[R05] BIP32: https://bips.dev/32/  
[R06] BIP39: https://bips.dev/39/  
[R07] BIP141: https://bips.dev/141/  
[R08] BIP173: https://bips.dev/173/  
[R09] BIP350: https://bips.dev/350/  
[R10] BIP174: https://bips.dev/174/  
[R11] BIP143: https://bips.dev/143/  
[R12] BIP340: https://bips.dev/340/  
[R13] BIP341: https://bips.dev/341/  
[R14] BIP342: https://bips.dev/342/  
[R15] Supporting extension sources: https://bips.dev/370/ and https://bips.dev/371/  
[R16] Astro islands: https://docs.astro.build/en/concepts/islands/

For production claims, resolve the corresponding BIP source at the release lock's exact commit. Reader links above are convenient mutable views, not replacements for immutable release evidence.
