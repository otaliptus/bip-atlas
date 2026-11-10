# Home page cards, review-state wording and shorter sentences

10 November 2026. Requested by the user: too many things said "draft", sentences were too long, and the home page did not read as a contents page.

## What changed

- **Home page.** The two-column list became a grid of cards (drawing, BIP label, question), four across on desktop and one row per card on phones. Cards sit in six sections taken from `parts` in `content/reading-policy.json`: Keys and backups, Addresses and payments, Transactions, Taproot, Wallet tools, Network. The per-card state line ("Draft · source … · not yet reviewed") and the "early draft" sentence are gone.
- **Review state.** The chapter header still shows the review state, as the spec requires, without the word "draft": "Awaiting review", "Technical review applied, awaiting sign-off" or "Reviewed". The labels live in `REVIEW_STATE_LABEL` (`packages/publication`). The stored `reviewState` values are unchanged, and no chapter's state changed.
- **Sentences.** 81 long sentences across all 23 chapters were split (those of about 30 words or more in the default path, about 36 or more in disclosures). Chapter chrome, the footer and the methodology page were shortened the same way. The splits change sentence structure only: no claim, figure, fixture or number changed. Two long sentences were left alone because each is one list of steps (payment links' callback, v2 transport's attacker options).
- **Contract.** `validateReadingPolicy` checks `chapterOrder` and `parts` in one place; the build and the contract test both call it.

## Checks

- `pnpm test` (1,299 passed, 1 skipped; kit suite OK), `pnpm check` and `pnpm build` are clean.
- Three test-pinned phrases would have changed; the prose keeps them instead (block filters "whose filter is the single byte 00", v2 transport "after the 224th packet", version bits' deployment windows, left as one sentence).
- Home page at 1440, 1024, 768 and 375: no horizontal overflow. No built page contains the word "draft".
- Four cleanup reviews of the code diff (reuse, simplification, efficiency, altitude). Applied: one shared policy validator, one shared label table, the home page reads the catalog directly, leaner card CSS. Not applied: `Map.groupBy` (needs Node 21; the project allows 20), a CSS counter for card numbers, and reusing `.atlas-specimen` (its margin is tied to the chapter header).

## Independent check of the split sentences

One fresh reviewer compared every old and new sentence against the ledger and the pinned BIP text. It found eight places where a split weakened a link or blurred a subject, and none that changed a MUST, SHOULD or MAY. All eight were applied:

| Chapter | Finding | Fix |
|---|---|---|
| `derived-seeds` | The HMAC sentence lost its "so" (BIP 85 L58) | Consequence restored |
| `derived-seeds` | "as long as the user knows…" had become a "must" | Back to a condition ("provided") |
| `schnorr` | The x-only cost read as the site's own fact | "In their argument, …" |
| `segwit` | The invalid signature lost its cause | "therefore" |
| `psbt-v2` | "It must also…" could mean every Creator (BIP 370 L238) | "Such a Creator must also…" |
| `payment-links` | "It" could mean the tests | "The model follows…" |
| `silent-payments` | The contrast before the MUST was lost; the NUMS exception was awkward | "MUST, however, …"; exception names the script-path spend |
| `block-filters` | "The last" implied a complete list of vectors | "One more is a block…" |

## Not done

- The eighteen older chapters still await their fresh technical review; this pass does not replace it.
- Homepage thumbnails were not recaptured; the drawings did not change.
