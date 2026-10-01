# Reader features — review record

Date: 1 October 2026. Two features requested by the user after phase two. Status: implemented, independently reviewed, awaiting human sign-off of the visual direction.

## (a) Back-links from the evidence list

- Every citation marker has an anchor derived from its block's `walkBlocks` path (`citeAnchor` in `apps/site/src/lib/content.ts`). Each evidence entry lists ↩ links (↩ a, b, c… when cited more than once) back to every place that cites it, with an accessible name naming the section or figure.
- A small script opens any closed Details disclosure that contains a link target, so a back-link into a Details block lands on visible text.
- Fixture tables (Addresses chapter) now render their citation markers; before this they cited claims without showing a marker.
- Checked: on all eight chapters every back-link has a target and every marker is linked back (no orphans either way); a browser round trip from a marker to the evidence and back into a closed Details block lands in view with the block open.

## (b) Two-tab plates: Interactive / Worked example

- Every interactive figure is a tabbed plate in the text: **A · Interactive** (unchanged island) and **B · Worked example**, a static walk through one published case drawn as an exploded isometric stack (`packages/figures/src/worked/`), with a numbered legend carrying the exact values. Values come from the same build-time derived data as the interactive view; nothing new is computed in the browser and the client bundle did not grow (~28.5 KB gzipped).
- Each chapter has its own accent colour (`[data-chapter=…]` in `atlas.css`), used by the worked examples and tabs only.
- Tabs follow the ARIA tabs pattern (roving tabindex, Arrow/Home/End). Without JavaScript the tab bar stays hidden, the panels are plain sections and both views render one after the other under "A · Interactive" / "B · Worked example" headings; tab roles are added only once the tab bar works.
- A contract test requires a worked-example adapter for every interactive recipe.
- The design brief pointed at makingsoftware.com; the cloud container could not reach it (egress blocked), so the style was built from the user's description: same-style 2D plates, per-chapter colour themes, minimal 3D-ish exploded illustrations.

## Checks

- Desktop 1440 and mobile 375 screenshots of all eight worked-example tabs (`review/screenshots/worked-*`): no horizontal overflow, no page errors, no third-party requests.
- axe-core (WCAG 2.1 A/AA + best practice): no violations on any chapter with either tab open. Fixing heading levels in phase-one figures (`h4`/`h5` panel and map titles skipped levels) made phase one clean too.

## Independent review of the worked examples

A fresh subagent read every rendered worked example against the BIPs, the fixtures and the derived data, and recomputed the values (BIP 39 hash/checksum/seed, BIP 32 xpubs, SegWit sizes and wtxid, the address typo, PSBT record counts, BIP 340 challenge, BIP 341 hashes and tweak, the BIP 342 stack). No blocking findings; 5 should-fix and 6 nits, all applied:
1. Addresses: "It does not say which character is wrong" contradicted BIP 173 L179–182 → "Validation only rejects; BIP 173 lets software at most hint where an error might be, never suggest the correction."
2. PSBT: Signer B read as building on Signer A → note that it works on state 3 in parallel with Signer A.
3. PSBT: notes lost counts → "Adds 2 Partial Signature records", etc.; combiner note names which copy holds which records.
4. Tapscript: "budget now 654" had no starting value → step 1 shows 50 + 654 witness bytes = 704.
5. HD wallets: the fingerprint shown is the node's own, while an xpub stores its parent's → label "own key fingerprint".
Nits: hatching now carries a stated meaning in every chapter where it is used (or is not used); Schnorr "check r < p and s < n" and y(R) shown with the checks it passed; Taproot names leaf version and length in the leaf hash, the parity check, and "one of its deepest leaves"; BIP 39 NFKD for password and salt; "HMAC-SHA512, key “Bitcoin seed”"; "extended public key"; "HRP + separator"; program-length check mentioned; "bytes hashed" on both identifiers; Tapscript step 1 wording; tab panels focusable after enhancement, plain sections without JS.
