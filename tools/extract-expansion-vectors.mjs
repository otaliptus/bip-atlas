import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const snapshot = resolve(root, "sources/research-2026-10-01-expansion/raw");
const source = (bip, line, quote) => ({ bip, line, quote });
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
const linesOf = (file) => readFileSync(resolve(snapshot, file), "utf8").split(/\r?\n/);
const write = (chapter, data) => {
  writeFileSync(resolve(root, `fixtures/${chapter}.json`), JSON.stringify(data, null, 2) + "\n");
  console.log(`${chapter}: ${data.fixtures.length} published fixtures${data.callbacks ? ` + ${data.callbacks.length} callback cases` : ""}`);
};

function paymentInstructions() {
  const bip = 321;
  const lines = linesOf("bip-0321.mediawiki");
  const fixtures = [];
  let invalid = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "==== Invalid URIs ====") invalid = true;
    if (line === "==== Proof of Payment ====") invalid = false;
    if (!/^bitcoin:/i.test(line) || line.includes("$")) continue;
    let label = "";
    for (let j = i - 1; j >= 0 && !label; j--) {
      const candidate = lines[j].trim();
      if (!candidate) break;
      if (!candidate.startsWith("=") && !candidate.startsWith("Note:") && !candidate.startsWith("Characters")) label = candidate;
    }
    if (!label) label = "Published URI example";
    const id = `uri-${String(fixtures.length + 1).padStart(2, "0")}-${slug(label)}`;
    fixtures.push({
      id,
      kind: "payment-instruction",
      label,
      uri: line,
      expected: invalid || /thus invalid/.test(label) ? "invalid" : "valid",
      origin: "published",
      source: source(bip, i + 1, line),
    });
  }
  const sourceFor = (uri) => {
    const at = lines.findIndex((line) => line.trim() === uri);
    if (at < 0) throw new Error(`Callback source URI not found: ${uri}`);
    return source(bip, at + 1, uri);
  };
  const callback = (id, uri, paymentMethod, expectedCallback, paymentAllowed, opensCallback) => ({
    id, uri, paymentMethod, expectedCallback, paymentAllowed, opensCallback,
    origin: "published", source: sourceFor(uri),
  });
  const callbacks = [
    callback("pop-onchain", "bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?pop=initiatingapp%3a", "onchain", "initiatingapp:onchain=$HEX_ENCODED_TRANSACTION", true, true),
    callback("pop-lightning", "bitcoin:?lightning=lnbc420bogusinvoice&pop=callbackuri%3abody%3fpop=", "lightning", "callbackuri:body?pop=lightning=$HEX_ENCODED_PAYMENT_PREIMAGE", true, true),
    callback("pop-choice-onchain", "bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?lightning=lnbc420bogusinvoice&pop=app%3a%3f", "onchain", "app:?onchain=$HEX_ENCODED_TRANSACTION", true, true),
    callback("pop-choice-lightning", "bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?lightning=lnbc420bogusinvoice&pop=app%3a%3f", "lightning", "app:?lightning=$HEX_ENCODED_PAYMENT_PREIMAGE", true, true),
    callback("pop-web", "bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?pop=https%3aiwantyouripaddress.com", "onchain", null, true, false),
    callback("req-pop-web", "bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?req-pop=https%3aevilwebsite.com", "onchain", null, false, false),
  ];
  write("payment-instructions", { fixtures, callbacks });
}

function psbtExtensions(bip) {
  const lines = linesOf(`bip-${String(bip).padStart(4, "0")}.mediawiki`);
  const fixtures = [];
  const seen = new Map();
  let expected = "invalid";
  let caseNumber = 0;
  const pre = (line) => {
    const start = line.indexOf("<pre>");
    if (start < 0) throw new Error(`Missing <pre> block in BIP ${bip}`);
    return line.slice(start + 5, line.indexOf("</pre>", start) < 0 ? undefined : line.indexOf("</pre>", start));
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("The following are valid PSBTs") || line.includes("should be computed")) expected = "valid";
    else if (line.startsWith("The following are invalid PSBTs") || line.startsWith("The following PSBTs cannot") || line.includes("cannot be computed")) expected = "invalid";
    const match = /^\* Case: (.+)$/.exec(line);
    if (!match) continue;
    caseNumber += 1;
    let end = i + 1;
    while (end < lines.length && !/^\* Case: /.test(lines[end].trim())) end += 1;
    const vectors = [];
    let stage = null;
    for (let j = i + 1; j < end; j++) {
      const stageMatch = /^\*\* With (.+)$/.exec(lines[j].trim());
      if (stageMatch) stage = stageMatch[1];
      if (!/^\*{2,3} Bytes in Hex:/i.test(lines[j].trim())) continue;
      const rawHex = pre(lines[j]).trim();
      let base64 = null;
      let base64Line = null;
      for (let k = j + 1; k < end && !/^\*{2,3} (?:With|Bytes in Hex)/i.test(lines[k].trim()); k++) {
        if (/^\*{2,3} Base64 String:/i.test(lines[k].trim())) {
          base64 = pre(lines[k]).trim();
          base64Line = k + 1;
          break;
        }
      }
      vectors.push({ line: j + 1, rawHex, base64, base64Line, stage });
    }
    if (!vectors.length) throw new Error(`No hex vector found for BIP ${bip} case on line ${i + 1}`);
    const label = match[1];
    for (const [index, vector] of vectors.entries()) {
      let hex = vector.rawHex;
      const provenance = source(bip, vector.line, vector.rawHex);
      if (vector.base64) {
        provenance.base64 = vector.base64;
        provenance.base64Line = vector.base64Line;
      }
      if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) {
        if (hex.startsWith("<") && vector.base64 && Buffer.from(vector.base64, "base64").toString("hex") === hex.slice(1).toLowerCase()) {
          hex = hex.slice(1);
          provenance.normalization = "Removed one stray leading '<' from the pinned hex; the decoded bytes match the adjacent Base64 twin.";
        } else throw new Error(`Invalid hex in BIP ${bip} case on line ${i + 1}`);
      }
      if (vector.base64 && Buffer.from(vector.base64, "base64").toString("hex") !== hex.toLowerCase()) throw new Error(`Hex/Base64 mismatch in BIP ${bip} case on line ${i + 1}`);
      if (seen.has(hex)) provenance.duplicateOf = seen.get(hex);
      else seen.set(hex, `bip${bip}-${String(caseNumber).padStart(2, "0")}-${slug(label)}`);
      const suffix = vector.stage && vector.stage !== "participant pubkeys only" ? `-${slug(vector.stage)}` : index > 0 ? `-${index + 1}` : "";
      const id = `bip${bip}-${String(caseNumber).padStart(2, "0")}-${slug(label)}${suffix}`;
      if (fixtures.some((item) => item.id === id)) throw new Error(`Duplicate fixture ID ${id}`);
      fixtures.push({
        id,
        kind: "psbt-extension",
        label,
        ...(vector.stage ? { stage: vector.stage } : {}),
        hex,
        expected,
        origin: "published",
        source: provenance,
      });
    }
  }
  return fixtures;
}

paymentInstructions();
write("psbt-extensions", { fixtures: [370, 371, 373].flatMap(psbtExtensions) });
