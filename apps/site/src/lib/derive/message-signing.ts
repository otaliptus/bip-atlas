import { readFileSync } from "node:fs";
import { ROOT } from "../root";
import { parseTransaction, verify as bip322Verify, decodeSignature as bip322Decode, messageHash as bip322MessageHash, addressScript as bip322AddressScript } from "@bip-atlas/models";
import type { Bip322VectorFixture, DerivedBip322Fixture, Bip322FormatsFixture, DerivedBip322FormatsFixture, Bip322VerdictsFixture, DerivedBip322VerdictsFixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE3, checkSourceQuote, pinnedText } from "./sources";

const b322Sets: Record<string, any> = {};
const b322Set = (set: "basic" | "gen") => (b322Sets[set] ??= JSON.parse(pinnedText(`bip-0322/${set === "basic" ? "basic" : "generated"}-test-vectors.json`, SNAPSHOT_PHASE3)));
const b322Cache = new Map<string, DerivedBip322Fixture>();

export function deriveBip322(f: Bip322VectorFixture): DerivedBip322Fixture {
  if (b322Cache.has(f.id)) return b322Cache.get(f.id)!;
  checkSourceQuote(f);
  const v = b322Set(f.set)[f.group][f.index];
  if (!v) throw new Error(`${f.id}: no such vector`);
  const sig: string = f.group === "error" ? v.signature : v.bip322_signatures[0];
  if (f.group === "error" ? v.description !== f.source.quote : !sig.startsWith(f.source.quote!)) throw new Error(`${f.id}: vector is not the cited one`);
  const r = bip322Verify(v.address, v.message, sig);
  if (r.state !== f.expect) throw new Error(`${f.id}: model says ${r.state}, fixture expects ${f.expect}`);
  if (f.group === "full" && r.state === "valid" && (r.time !== Number(v.lock_time) || r.age !== Number(v.sequence))) throw new Error(`${f.id}: T and S differ from the vector`);
  const dec = bip322Decode(sig);
  const tx = parseTransaction(r.toSign.hex);
  const le = (h: string) => parseInt(h.match(/../g)!.reverse().join(""), 16);
  const hash = bip322MessageHash(v.message);
  const { spk, kind } = bip322AddressScript(v.address);
  // Error vectors name the failure they expect; published hashes, where given, must match.
  if (f.group === "error" && (r.state !== "invalid" || !r.reason.includes(v.error_substr))) throw new Error(`${f.id}: model's reason does not contain "${v.error_substr}"`);
  const pub = (b322Set(f.set).tx_hashes ?? []).find((x: any) => x.message === v.message && x.address === v.address);
  if (pub && (pub.message_hash !== hash || pub.to_spend_tx_hash !== r.toSpend.txid || pub.to_sign_tx_hash !== r.toSign.txid)) throw new Error(`${f.id}: hashes differ from the published tx_hashes`);
  const out: DerivedBip322Fixture = {
    ...f,
    derived: {
      message: v.message, messageHash: hash, address: v.address, spk, scriptKind: kind, variant: dec.variant, prefixed: dec.prefixed,
      signatureHead: sig.slice(0, 24), signatureChars: sig.length,
      toSpend: { txid: r.toSpend.txid, scriptSig: "0020" + hash, challenge: spk },
      toSign: { txid: r.toSign.txid, version: le(tx.versionHex), lockTime: le(tx.locktimeHex), sequence: le(tx.inputs[0].sequenceHex), scriptSig: tx.inputs[0].scriptSigHex, witness: dec.witness },
      verdict: r.state === "valid" ? { state: "valid", time: r.time, age: r.age } : { state: r.state, reason: r.reason },
      checked: r.checked,
    },
  };
  b322Cache.set(f.id, out);
  return out;
}

export function deriveBip322Formats(f: Bip322FormatsFixture): DerivedBip322FormatsFixture {
  checkSourceQuote(f);
  const lines = pinnedText("bip-0322.mediawiki", SNAPSHOT_PHASE3).split("\n");
  const start = lines.findIndex((l) => l.startsWith("{| class=\"wikitable\""));
  const rows: DerivedBip322FormatsFixture["derived"]["rows"] = [];
  const strip = (s: string) => s.replace(/<sup>1<\/sup>/g, "¹").replace(/<sup>2<\/sup>/g, "²").replace(/<br\/>/g, "").replace(/<\/?code>/g, "").replace(/^\|\s*/, "").trim();
  for (let i = start; i < lines.length && !lines[i].startsWith("|}"); i++) {
    if (lines[i] === "|-" && lines[i + 1]?.startsWith("| ") && !lines[i + 1].includes("style")) {
      const [name, scripts, prefix, format] = lines.slice(i + 1, i + 5).map(strip);
      rows.push({ name, scripts, prefix, format });
    }
  }
  if (rows.length !== 4 || rows[1].prefix !== "smp" || rows[2].prefix !== "ful" || rows[3].prefix !== "pof") throw new Error(`${f.id}: could not read BIP 322's format table`);
  return { ...f, derived: { rows } };
}

export function deriveBip322Verdicts(f: Bip322VerdictsFixture): DerivedBip322VerdictsFixture {
  checkSourceQuote(f);
  const all = JSON.parse(readFileSync(`${ROOT}fixtures/message-signing.json`, "utf8")).fixtures as Bip322VectorFixture[];
  const rows = f.cases.map((id) => {
    const vector = all.find((x) => x.id === id)!;
    const d = deriveBip322(vector).derived;
    const detail = d.verdict.state === "valid" ? `valid at time T = ${d.verdict.time} and age S = ${d.verdict.age}` : d.verdict.reason!;
    return { label: vector.label, message: d.message, address: d.address, state: d.verdict.state, detail };
  });
  return { ...f, derived: { rows } };
}
