# BIP Atlas implementation kit

Start with **BIP_ATLAS_SPEC.md**, then **catalog.json**, then **prompts/BUILD_AND_COMPILER_PROMPTS.md**. The proposal is eight chapters covering ten primary BIPs, with a five-chapter first phase covering seven of them. Five additional BIPs are supporting context only.

## Included

- `BIP_ATLAS_SPEC.md`: approximately 6,500-word BIP-specific specification.
- `catalog.json`: chapter questions, scope, recipes, controls, misconceptions, and test families.
- `design-tokens.css`: proposed visual tokens retained from the earlier Field Guide specification; no font files.
- `prompts/BUILD_AND_COMPILER_PROMPTS.md`: coding kickoff and six generation/review roles.
- `scripts/snapshot_sources.py`: immutable source snapshots from a complete local Git checkout.
- `scripts/demo_models.py`: small deterministic teaching models for selected BIP39/141/173/350 behavior.
- `tests/test_starter.py`: 36 offline unit tests, including selected published encoding vectors and a local Git snapshot test.
- `tests/last-run.txt`: actual recorded test output.
- `examples/address-fixtures.json`: values computed by the included decoder from selected public BIP350 examples.

## Run the actual starter tests

Requires Python 3.10+ and Git. No Python third-party package is needed.

```sh
python -m unittest discover -s tests -v
```

These tests cover only the supplied starter. They are not a full BIP conformance suite or a website/accessibility/security audit. The generic publication schema from the previous kit is not silently extended by this package.

## Snapshot real sources on your machine

Obtain a complete local checkout. Do not use a partial clone for the snapshot tool.

```sh
git clone https://github.com/bitcoin/bips.git vendor/bitcoin-bips
```

The research observed commit `3a10b5b5f0a7586df8928d580a3009744ebb2079` on 1 October 2026. To reproduce that source choice:

```sh
python scripts/snapshot_sources.py \
  --repo vendor/bitcoin-bips \
  --revision 3a10b5b5f0a7586df8928d580a3009744ebb2079 \
  --catalog catalog.json \
  --out sources/research-2026-10-01
```

Use a fresh output directory. The script intentionally refuses an existing output path. For a future refresh, resolve and record a new full commit deliberately rather than replacing the revision with a mutable branch name.

The result includes original BIP files, their same-BIP auxiliary files, raw metadata, candidate headings, source hashes, Git blob IDs, and pinned canonical links. External fixture repositories are not automatically fetched. Raw source content retains its own licensing; inspect and preserve its notices before distribution.

The parser is a preamble/heading starter, not a full MediaWiki AST. Complete the source adapter before generating articles automatically.

## What to build first

Give the coding kickoff prompt to the coding model together with the spec and catalog. The first milestone is the **addresses** chapter, covering BIPs173 and 350, rendered from a manually prepared typed article. Connect the automated writer only after the first page's actual screenshots and correct fixture behavior are accepted.

The larger `atlas ...` CLI in the spec describes commands to implement; this kit does not supply them. No LLM API is connected, no website is generated, no hosting is configured, and no external repository is modified.

## Research and execution boundaries

Research used bips.dev plus the connected GitHub repository and official documentation. Local execution could not access the network, so source acquisition was tested against a temporary local Git repository, not a downloaded current full BIPs repository. The inspected upstream commit is recorded as a research observation, not represented as a fully distributed source lock.

The demonstration models do not sign, broadcast, accept wallet credentials, or establish that an address is safe to receive money. Only public examples are appropriate for the proposed reader. No real recovery phrases, private keys, or arbitrary PSBT uploads belong in the first release.
