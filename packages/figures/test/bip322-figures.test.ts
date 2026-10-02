import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { MESSAGE_TAG, addressScript, decodeSignature, messageHash, verify } from "@bip-atlas/models/bip322";
import { REVIEWED, reviewedOpName } from "@bip-atlas/models/interpreter";
import { parseTransaction } from "@bip-atlas/models/tx";
import { Bip322Choice } from "../src/bip322/Bip322Choice";
import { Bip322Formats, wrap } from "../src/bip322/Bip322Formats";
import { Bip322Hash, TAG } from "../src/bip322/Bip322Hash";
import { Bip322Limits } from "../src/bip322/Bip322Limits";
import { Bip322Rack } from "../src/bip322/Bip322Rack";
import { Bip322Verdicts } from "../src/bip322/Bip322Verdicts";
import { Bip322VerifyStory } from "../src/bip322/Bip322VerifyStory";
import { Bip322VirtualTx } from "../src/bip322/Bip322VirtualTx";
import { Bip322Witness } from "../src/bip322/Bip322Witness";
import type { DerivedBip322Fixture, DerivedBip322VerdictsFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const raw = (p: string) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/bip-0322/${p}`, root), "utf8");
const sets: Record<string, any> = { basic: JSON.parse(raw("basic-test-vectors.json")), gen: JSON.parse(raw("generated-test-vectors.json")) };
const fixtures = JSON.parse(readFileSync(new URL("fixtures/message-signing.json", root), "utf8")).fixtures;

/** The values deriveBip322 computes (the build also checks the verdict against the fixture's expectation). */
function vec(id: string): DerivedBip322Fixture {
  const f = fixtures.find((x: { id: string }) => x.id === id);
  const v = sets[f.set][f.group][f.index];
  const sig: string = f.group === "error" ? v.signature : v.bip322_signatures[0];
  const r = verify(v.address, v.message, sig);
  expect(r.state).toBe(f.expect);
  const dec = decodeSignature(sig);
  const tx = parseTransaction(r.toSign.hex);
  const le = (x: string) => parseInt(x.match(/../g)!.reverse().join(""), 16);
  const hash = messageHash(v.message);
  const { spk, kind } = addressScript(v.address);
  return {
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
}
function verdicts(): DerivedBip322VerdictsFixture {
  const f = fixtures.find((x: { id: string }) => x.id === "b322-verdicts");
  const rows = f.cases.map((id: string) => {
    const d = vec(id).derived;
    return { label: fixtures.find((x: { id: string }) => x.id === id).label, message: d.message, address: d.address, state: d.verdict.state, detail: d.verdict.state === "valid" ? `valid at time T = ${d.verdict.time} and age S = ${d.verdict.age}` : d.verdict.reason! };
  });
  const reviewed = Object.entries(REVIEWED).map(([version, set]) => ({ version, ops: [...set].sort((a, b) => a - b).map((op) => reviewedOpName(op).slice(3)) }));
  return { ...f, derived: { rows, reviewed } };
}
const html = (n: VNode<any>) => render(n);

describe("message-signing figures", () => {
  it("A18.1 stamps each envelope with its prefix and wraps text without dropping words", () => {
    const rows = [
      { name: "Legacy", scripts: "P2PKH", prefix: "n/a", format: "compact signature" },
      { name: "Simple", scripts: "P2WPKH", prefix: "smp", format: "witness stack, consensus-encoded and base64-encoded" },
    ];
    const s = html(h(Bip322Formats, { fixture: { ...fixtures.find((x: { id: string }) => x.id === "b322-formats"), derived: { rows } } }));
    expect(s).toContain(">smp<");
    expect(s).toContain(">—<");
    const long = "full finalized PSBT of the to_sign transaction, consensus-encoded and base64-encoded";
    expect(wrap(long, 50).join(" ")).toBe(long);
  });
  it("A18.2 draws two unrelated hashes for one address, with the model's tag", () => {
    const a = vec("b322-p2wpkh-hello"), b = vec("b322-wrong-message");
    expect(TAG).toBe(MESSAGE_TAG);
    const s = html(h(Bip322Hash, { fixtures: [a, b] }));
    for (const f of [a, b]) {
      expect(s).toContain(`>${f.derived.messageHash.slice(0, 2)}<`);
      expect(s.slice(s.indexOf("<details"))).toContain(f.derived.toSpend.txid);
    }
    expect(a.derived.messageHash).not.toBe(b.derived.messageHash);
  });
  it("A18.4 shows the 3-of-3 witness: dummy, three signatures, the script", () => {
    const w = vec("b322-p2wsh-3of3");
    const s = html(h(Bip322Witness, { fixture: w }));
    expect(w.derived.toSign.witness.length).toBe(5);
    expect(s.split("ECDSA SIGNATURE").length - 1).toBe(3);
    expect(s).toContain("EMPTY ITEM");
    expect(s).toContain("THE 3-OF-3 SCRIPT");
  });
  it("A18.5 and A18.9 are schematic", () => {
    for (const s of [html(h(Bip322Choice, {})), html(h(Bip322Limits, {}))]) expect(s).not.toMatch(/[0-9a-f]{16}/);
    expect(html(h(Bip322Choice, {}))).toContain("must · PSBT");
  });
  it("A18.6 follows a valid full vector to T and S", () => {
    const f = vec("b322-p2wpkh-full");
    const s = html(h(Bip322VerifyStory, { fixture: f }));
    expect(s).toContain("VALID · T 2016 · S 2016");
    expect(s.slice(s.indexOf("<details"))).toContain(f.derived.toSign.txid);
  });
  it("A18.7 stamps the three verdicts from the model", () => {
    const s = html(h(Bip322Verdicts, { fixture: verdicts() }));
    for (const st of ["VALID", "INVALID", "INCONCLUSIVE"]) expect(s).toContain(`>${st}<`);
    expect(s).toContain("NULLFAIL");
  });
  it("A18.8 hangs the model's reviewed opcodes, tapscript adding CHECKSIGADD", () => {
    const v = verdicts();
    const s = html(h(Bip322Rack, { fixture: v }));
    expect(s).toContain(">CHECKSIG<");
    expect(s).toContain(">CHECKMULTISIG<");
    expect(s).toContain("TAPSCRIPT ALSO: CHECKSIGADD");
    expect(s).toContain(">NOP1, NOP4–10<");
    expect(s).toContain(">CODESEPARATOR → INVALID<");
  });
});

describe("message-signing hero", () => {
  const fx = ["b322-p2wpkh-hello", "b322-p2tr-simple", "b322-p2wsh-3of3", "b322-p2wpkh-full", "b322-p2pkh-full", "b322-wrong-message"].map(vec);
  it("renders the no-JS state: both tickets, the hash and the verdict", () => {
    const s = html(h(Bip322VirtualTx, { fixtures: fx, figureId: "fig-a18-3" }));
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain(`${fx[0].derived.messageHash.slice(0, 8)}…`);
    expect(s).toContain("VALID · T 0 · S 0");
    expect(s.split('data-ticket="').length - 1).toBe(4);
    expect(s).not.toContain("k-faded");
  });
});

describe("message-signing captions", () => {
  const text = readFileSync(new URL("content/chapters/message-signing.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("an empty dummy, three ECDSA signatures and the witness script");
    expect(vec("b322-p2wsh-3of3").derived.toSign.witness.length - 2).toBe(3);
  });
});
