# First-read editorial pass

17 October 2026. The user wants a clear, engaging illustrated explainer and explicitly wants to keep it simple. This pass changes the reading experience around the existing demonstrations.

## Changes

- Every chapter gives the reader a specific action and something to notice in its existing main demonstration. No interactive figures, controls, scenarios, animations or illustrations were added. Existing figure definitions, IDs, recipes, fixtures, captions and figure citations compare equal to the previous commit across all eighteen chapters.
- Openings in Mnemonics, HD Wallets, Addresses, Timelocks and Schnorr introduce the mechanism before source history or technical qualifications. Message Signing begins with the reader's need to answer a challenge. Several endings now finish with the central relationship. Existing source history, signature algorithms and compatibility notes remain available in disclosures.
- Schnorr keeps the message comparison visible and moves the signature-example picker into a disclosure. MuSig2 keeps the signing-session stepper and makes other sessions and aggregate visibility optional. Silent Payments keeps sender/receiver/observer switching visible, starts with the result, and makes intermediate calculations and other payments optional. All existing controls still work. Static views remain available without JavaScript.
- The editorial reading order lives in `content/reading-policy.json`; the original catalogs stay intact. Wallet Paths follows HD Wallets, P2SH precedes SegWit, and Timelocks precedes the Taproot chapters. Contents and previous/next navigation share that order. A contract checks that every chapter occurs exactly once. Figure identifiers remain stable.
- Wallet Paths has a 750–1,200-word target for its shorter explanation. Its main path is 899 words; prose was not padded to retain the earlier 900-word minimum.

The separate BIP 322 decoder fix uses the shared SegWit address checks and checks Base58Check payload lengths. Its regression tests reproduce the previous failures.

## Verification

- `pnpm check` passed.
- `pnpm test` passed: 1,124 Vitest tests and 36 Python tests; one pre-existing optional full-Core-fixture sweep was skipped. This includes source quotes, citation presence, chapter structure, reading ranges, figure contracts and the address-validation regressions.
- `pnpm build` generated all 53 pages. The existing third-party Rollup annotation warning remains.
- Browser checks visited all eighteen chapters at 1440, 768 and 375 pixels: all heroes hydrated, citation fragments resolved and previous/next links followed the editorial order. There were no page errors, failed requests, external requests or horizontal document overflow.
- All eighteen chapters retained a visible static demonstration at 375 pixels with JavaScript disabled and no horizontal document overflow.
- Six interaction flows passed: desktop and mobile for Schnorr, MuSig2 and Silent Payments. Checks cover changed-message failure, an invalid public key, completion of a signing session, another session with tweaks, aggregate visibility, receiver/observer switching, and revealing intermediate calculations for another payment. Sliders were exercised with keyboard Home/End.
- Visually inspected representative desktop and mobile openings, default demonstrations, changed states and the Silent Payments no-JavaScript view. Accepted screenshots and the machine-readable results are in [first-read screenshots](screenshots/first-read/).
- `git diff --check` passed. The original kit, pinned sources and public fixtures are unchanged.

These are author checks and automated verification. No fresh independent technical review, live screen-reader session or new axe audit was performed. All eighteen chapters remain `draft-unreviewed`; publication and indexing settings have not changed.

## Representative captures

- [HD Wallets opening, desktop](screenshots/first-read/hd-wallets-1440-top.png)
- [Schnorr, desktop default](screenshots/first-read/schnorr-1440-hero.png) and [mobile changed message](screenshots/first-read/schnorr-375-changed-message.png)
- [MuSig2, desktop default](screenshots/first-read/musig2-1440-hero.png) and [mobile completed session](screenshots/first-read/musig2-375-finished-session.png)
- [Silent Payments, desktop default](screenshots/first-read/silent-payments-1440-hero.png), [mobile observer](screenshots/first-read/silent-payments-375-observer.png), [optional calculation](screenshots/first-read/silent-payments-375-calculation.png), and [without JavaScript](screenshots/first-read/silent-payments-375-nojs.png)
- [Mnemonics opening, mobile](screenshots/first-read/mnemonics-375-top.png)

The complete capture set and the check script remain in `/home/taliwork/.cache/bip-atlas-first-read-20261017/`.
