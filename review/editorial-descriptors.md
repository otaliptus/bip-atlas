# Descriptors editorial revision

2 October 2026. The user requested the same prose and figure treatment as the preceding four-chapter revision.

The chapter now begins with the recovery problem: knowing the keys does not identify the output scripts or derivation paths. Main prose is 795 words, down from 1,132. Detailed placement rules, equivalent key encodings, checksum guarantees, multisig limits and source history remain in disclosures. All 31 evidence claims remain cited and all numeric prose checks pass without changing their assertions.

There are six figures, down from nine. A new `descriptor-outputs.v1` opening uses BIP 384's published, public-key-only `combo()` example to contrast P2PK, P2PKH, P2WPKH and P2SH-P2WPKH for the same key. Exact scripts are available below it; abbreviations are identified as such. The implementation consumes existing derived values. Tests independently expand each of the four labeled expressions with the same public key and compare them with the published scripts. The diagram refuses a ranged fixture that would imply different keys.

The template, annotated sentence, interactive explorer, checksum comparison and expression index each remain once. The nesting, equivalent-spellings, four-panel reading story and checksum-symbol expansion figures were removed from this chapter's reading path; their recipe implementations remain available and tested. The chapter's figure numbers are consecutive A13.1–A13.6.

The shorter 750–1,200 word target is recorded in `content/reading-policy.json`. Original catalogs, models, fixtures, source snapshots and evidence ledgers were not changed. As in the previous editorial pass, this chapter is `draft-unreviewed`: this author check and the automated checks do not constitute a fresh independent technical review.

Validation:

- `pnpm check` passed.
- `pnpm test`: 1,109 Vitest tests passed, one pre-existing skip, and all 36 Python tests passed.
- `pnpm build`: all 53 pages built. After the final highlighting adjustment, type checking, all 16 descriptor figure tests and the production build passed again.
- `git diff --check` passed.
- Browser checks at 1440 and 375 pixels: no page horizontal overflow; all six figures fit. Opening the exact scripts also preserves the mobile width. The interactive example switches to the published payload-error vector and shows rejection with no output scripts. No browser warnings or errors were reported.
- Screenshots in [editorial-descriptors](editorial-descriptors/) include desktop and mobile openings, remaining mobile figures, and the interactive rejection state. Existing tests cover server-rendered/no-JavaScript states; a separate JavaScript-disabled browser session was not run.

No deployment, commit or push was performed. Earlier chapter revisions and unrelated untracked files were preserved.
