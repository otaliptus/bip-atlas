// Extract Bitcoin Core's simple CHECKLOCKTIMEVERIFY / CHECKSEQUENCEVERIFY
// transaction tests (BIP 65 and BIP 112 reference behaviour) and the
// LOCKTIME_THRESHOLD definition into a small pinned excerpt.
//
//   C=f490f5562d4b20857ef8d042c050763795fd43da   # v29.0
//   for f in src/test/data/tx_valid.json src/test/data/tx_invalid.json src/script/script.h; do
//     curl -o /tmp/core/$(basename $f) https://raw.githubusercontent.com/bitcoin/bitcoin/$C/$f; done
//   node tools/extract-locktime-cases.mjs /tmp/core
//
// Refuses to run unless each upstream file matches its pinned SHA-256.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPOSITORY = "https://github.com/bitcoin/bitcoin";
const COMMIT = "f490f5562d4b20857ef8d042c050763795fd43da"; // tag v29.0
const FILES = {
  "tx_valid.json": { path: "src/test/data/tx_valid.json", sha256: "a85d479081d6fd93188377e27fdfa099fa1a6aefdae565d0f473003c855d1e90" },
  "tx_invalid.json": { path: "src/test/data/tx_invalid.json", sha256: "0c02ce44ff3a880458f9569a25589315a07f924fcaadac828613d4615776ca52" },
  "script.h": { path: "src/script/script.h", sha256: "7ee09e112e9675e9c4b2a585f033ae7a007abd3c43901bd8eda4b4cb3d8b4c7f" },
};
/** Only one-input cases whose prevout script is `<decimal> CHECKLOCKTIMEVERIFY|CHECKSEQUENCEVERIFY [1]`. */
const SIMPLE = /^-?\d+ (CHECKLOCKTIMEVERIFY|CHECKSEQUENCEVERIFY)( 1)?$/;

const dir = process.argv[2];
const read = (name) => {
  const bytes = readFileSync(join(dir, name));
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== FILES[name].sha256) throw new Error(`${name}: sha256 ${sha} does not match the pinned file`);
  return { text: bytes.toString("utf8"), bytes: bytes.length };
};

const upstream = {};
const cases = [];
for (const [name, expected] of [["tx_valid.json", "valid"], ["tx_invalid.json", "invalid"]]) {
  const { text, bytes } = read(name);
  upstream[name] = { ...FILES[name], bytes };
  let comment = null;
  JSON.parse(text).forEach((entry, index) => {
    if (entry.length === 1 && typeof entry[0] === "string") return void (comment = entry[0]);
    if (entry[0].length !== 1 || !SIMPLE.test(entry[0][0][2])) return;
    cases.push({ file: name, index, comment, expected, prevouts: entry[0], txHex: entry[1], flags: entry[2] });
  });
}
const header = read("script.h");
upstream["script.h"] = { ...FILES["script.h"], bytes: header.bytes };
const lines = header.text.split("\n");
const from = lines.findIndex((l) => l.startsWith("// Threshold for nLockTime"));
if (from < 0 || !lines[from + 2].includes("LOCKTIME_THRESHOLD = 500000000")) throw new Error("LOCKTIME_THRESHOLD lines moved");

const out = {
  schemaVersion: "bip-atlas.external-excerpt.v1",
  note: "Verbatim one-input CLTV/CSV cases from Bitcoin Core's transaction tests (array index kept), and the LOCKTIME_THRESHOLD lines of script.h. Produced by tools/extract-locktime-cases.mjs.",
  repository: REPOSITORY,
  commit: COMMIT,
  upstream,
  scriptH: { path: FILES["script.h"].path, firstLine: from + 1, lines: lines.slice(from, from + 3) },
  cases,
};
writeFileSync(new URL("../sources/external/core-locktime-cases-excerpt.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${cases.length} cases`);
