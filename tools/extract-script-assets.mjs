// Extract reviewed cases from Bitcoin Core's script_assets_test.json (linked
// from BIP 341's "Test vectors" section) into a small pinned excerpt.
//
//   curl -o /tmp/sat.json https://raw.githubusercontent.com/bitcoin-core/qa-assets/<COMMIT>/unit_test_data/script_assets_test.json
//   node tools/extract-script-assets.mjs /tmp/sat.json
//
// Refuses to run unless the full file matches the pinned commit's SHA-256.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const UPSTREAM = {
  repository: "https://github.com/bitcoin-core/qa-assets",
  commit: "0739b29cfb99e8de42298f550e9cdbf1a7659dcf",
  path: "unit_test_data/script_assets_test.json",
  sha256: "cd789a58ec45916e1721cdd14e82ca4c93100959f1cef4e229b22e3bf539f095",
};
/** Array indices of the cases this site traces, with the comment each must carry. */
const PICK = {
  804: "tapscript/disabled_checkmultisig",
  1135: "tapscript/emptysigs/checksigadd",
  1109: "tapscript/checksigaddresults",
  662: "tapscript/minimalif",
  824: "tapscript/oldpk/checksig",
  50: "opsuccess/bare",
};

const bytes = readFileSync(process.argv[2]);
const sha = createHash("sha256").update(bytes).digest("hex");
if (sha !== UPSTREAM.sha256) throw new Error(`sha256 ${sha} does not match the pinned file`);
const all = JSON.parse(bytes.toString("utf8"));
const cases = {};
for (const [i, comment] of Object.entries(PICK)) {
  if (all[i].comment !== comment) throw new Error(`case ${i} is ${all[i].comment}, expected ${comment}`);
  cases[i] = all[i];
}
const out = {
  schemaVersion: "bip-atlas.external-excerpt.v1",
  note: "Verbatim cases from Bitcoin Core's script assets file, keyed by their index in the upstream array. Produced by tools/extract-script-assets.mjs.",
  upstream: { ...UPSTREAM, bytes: bytes.length, cases: all.length },
  cases,
};
writeFileSync(new URL("../sources/external/core-script-assets-excerpt.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${Object.keys(cases).length} cases`);
