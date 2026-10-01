# Validation record

Research/specification date: 1 October 2026.

## Executed successfully

`python -m unittest discover -s tests -v` ran **36 tests**, all passing. The actual output is in `tests/last-run.txt`.

The tested behavior includes catalog counts and ordering; BIP39 allowed bit lengths, word counts, and selected public zero-entropy grouping; BIP141 weight arithmetic and ceiling; selected generic Bech32/Bech32m and SegWit-address examples; wrong-family, network, case, checksum, version, length, and padding rejection; preservation of raw preamble and historical metadata; strict commit/path input; and source-snapshot behavior in a temporary local Git repository.

The Git integration test verifies that a dirty worktree does not change committed source bytes, included files have the expected SHA-256, an existing output is not overwritten, and a partial/promisor clone configuration is rejected.

`python -m py_compile scripts/*.py tests/*.py` also completed successfully. The distributed JSON files were parsed successfully during packaging. The ZIP excludes bytecode caches and contains no font files or upstream source dump.

## Not established by these checks

The entire Bitcoin BIPs repository was not downloaded into the local execution environment. Source acquisition against that live checkout was not executed. The upstream commit recorded in the catalog was observed with the GitHub connector during research.

There is no full MediaWiki AST, LLM pipeline, publication-schema migration, completed web application, browser screenshot review, full vector/conformance suite, secp256k1 signing implementation, accessibility audit, hosting, or security audit in this starter.

The decoder checks selected address syntax/encoding behavior, not recipient safety, balance, ownership, or spendability. The arithmetic sample is not a valid serialized transaction by itself. Test fixtures are public examples and must never be used for funds.
