import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { hash160 } from "@bip-atlas/models/bip32";
import { bytesToHex, hexToBytes } from "@bip-atlas/models/hex";
import { AmountStory } from "../src/tx/AmountStory";
import { Bip143Preimage } from "../src/tx/Bip143Preimage";
import { NestedInput } from "../src/tx/NestedInput";
import { SighashReuse } from "../src/tx/SighashReuse";
import { TransactionAnatomy } from "../src/tx/TransactionAnatomy";
import { TwoSerializations } from "../src/tx/TwoSerializations";
import { WeightMeter } from "../src/tx/WeightMeter";
import { WitnessCommitment } from "../src/tx/WitnessCommitment";
import { WitnessField } from "../src/tx/WitnessField";
import { txFields, txGroups } from "../src/tx/fields";
import type { DerivedTransactionFixture } from "../src/types";
import { deriveChapter } from "./derived";

const html = (n: VNode<any>) => render(n);
// The site's own deriveTransaction, with its fail-closed structural checks.
const [native, nested] = await deriveChapter<DerivedTransactionFixture>("segwit.json", ["native-p2wpkh", "p2sh-p2wpkh"]);
const wideOnly = (s: string) => s.split("k-resp__narrow")[0];

describe("deriveTransaction input views", () => {
  it("classifies each input and ties every P2WPKH key to its program", () => {
    expect(native.derived.inputs.map((i) => [i.scriptSig, i.witnessKind])).toEqual([["signature-push", "empty"], ["empty", "p2wpkh"]]);
    expect(nested.derived.inputs.map((i) => [i.scriptSig, i.witnessKind])).toEqual([["program-push", "p2wpkh"]]);
    for (const f of [native, nested]) for (const i of f.derived.inputs.filter((x) => x.witnessKind === "p2wpkh")) expect(bytesToHex(hash160(hexToBytes(i.witness[1])))).toBe(i.programHex);
  });
});
describe("SegWit fields", () => {
  it("reassemble each transaction exactly and colour by role", () => {
    for (const f of [native, nested]) {
      const fields = txFields(f.derived);
      expect(fields.map((x) => x.hex).join("")).toBe(f.txHex);
      expect(fields.filter((x) => x.role === "time").map((x) => x.short)).toEqual([...f.derived.inputs.map(() => "nSequence"), "nLockTime"]);
      expect(fields.filter((x) => x.role === "public")).toHaveLength(f.derived.inputs.filter((i) => i.witnessKind === "p2wpkh").length);
    }
    // The P2PK input's scriptSig is its signature push; the nested one pushes a program, not a signature.
    expect(txFields(native.derived).find((x) => x.id === "input.0.scriptsig.body")!.role).toBe("sig");
    expect(txFields(nested.derived).find((x) => x.id === "input.0.scriptsig.body")!.role).toBe("hash");
  });
  it("groups add up to the measured sizes", () => {
    for (const f of [native, nested]) {
      const g = txGroups(f.derived);
      const m = f.derived.measures;
      expect(g.reduce((n, x) => n + x.bytes, 0)).toBe(m.totalSize);
      expect(g.filter((x) => x.part === "base").reduce((n, x) => n + x.bytes, 0)).toBe(m.baseSize);
    }
  });
});

describe("TwoSerializations (A03.1 storyboard)", () => {
  const s = html(h(TwoSerializations, { fixture: native }));
  const m = native.derived.measures;
  it("has four frames, sizes from the model and both hashes shortened with exact values", () => {
    expect(s.split('class="k-story__frame"').length - 1).toBe(4);
    expect(s).toContain(`${m.totalSize} bytes`);
    expect(s).toContain(`${m.baseSize} bytes`);
    for (const hx of [m.txidHex, m.wtxidHex]) {
      expect(s).toContain(`${hx.slice(0, 12)}…`);
      expect(s.slice(s.indexOf("<details"))).toContain(hx);
    }
  });
});

describe("TransactionAnatomy (hero, static renders)", () => {
  const fx = [native, nested];
  const r = (initial?: { fixtureId: string; lens: "txid" | "wtxid" | "bip143" }) => html(h(TransactionAnatomy, { fixtures: fx, figureId: "fig-a03-4", initial }));
  it("no-JS default: first example through the txid lens, marker, flag and witness hatched", () => {
    const s = r();
    expect(s).toContain('data-hydrated="false"');
    const wide = wideOnly(s);
    const hatched = [...new Set(wide.match(/data-field="([^"]+)" data-hatched="true"/g)!.map((x) => x.split('"')[1]))];
    const expected = txFields(native.derived).filter((f) => f.part !== "base").map((f) => f.id);
    expect(hatched).toEqual(expected);
    expect(s).toContain(`${native.derived.measures.baseSize} OF ${native.derived.measures.totalSize} BYTES`);
    expect(s).toContain(native.derived.measures.txidHex);
  });
  it("wtxid lens hatches nothing and gives the wtxid", () => {
    const s = r({ fixtureId: "native-p2wpkh", lens: "wtxid" });
    expect(s).not.toContain('data-hatched="true"');
    expect(s).toContain(native.derived.measures.wtxidHex);
  });
  it("BIP 143 lens: ten numbered items, the outside ones dashed, the published sighash", () => {
    const s = r({ fixtureId: "native-p2wpkh", lens: "bip143" });
    const wide = wideOnly(s);
    expect(wide.match(/data-field="pre-/g)!.length).toBeGreaterThanOrEqual(10);
    expect(s).toContain(`= BIP 143 LINE ${native.sighash.sighashLine}`);
    expect(s).toContain(native.derived.digest.sighashHex);
    // Amount and sighash type are not in the transaction; for native P2WPKH the scriptCode is not either.
    expect(native.derived.digest.items.filter((i) => i.from.length === 0).map((i) => i.id)).toEqual(["scriptCode", "amount", "hashType"]);
    expect((wide.match(/k-dashed/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("draws the second example", () => {
    const s = r({ fixtureId: "p2sh-p2wpkh", lens: "txid" });
    expect(s).toContain(nested.derived.measures.txidHex);
    expect(s).toContain(`${nested.derived.measures.baseSize} OF ${nested.derived.measures.totalSize} BYTES`);
  });
});

describe("Static SegWit drawings", () => {
  it("A03.2 witness field: empty field, item sizes and the key hash", () => {
    const s = html(h(WitnessField, { fixture: native }));
    expect(s).toContain(">EMPTY<");
    expect(s).toContain("signature · 71 B");
    expect(s).toContain("key 33 B");
    expect(s).toContain(`${native.derived.inputs[1].programHex!.slice(0, 16)}…`);
    for (const w of native.derived.inputs[1].witness) expect(s).toContain(w);
  });
  it("A03.3 commitment: the example's txid and wtxid leaves, the zero coinbase leaf, exact values", () => {
    const s = html(h(WitnessCommitment, { fixture: native }));
    const m = native.derived.measures;
    expect(s).toContain(`${m.txidHex.slice(0, 8)}…`);
    expect(s).toContain(`${m.wtxidHex.slice(0, 8)}…`);
    expect(s).toContain("00".repeat(32));
    expect(s).toContain("schematic block");
  });
  it("A03.5 nested input: the 22-byte program push and the matching key", () => {
    const s = html(h(NestedInput, { fixture: nested }));
    expect(nested.derived.inputs[0].scriptSigHex).toBe(`160014${nested.derived.inputs[0].programHex}`);
    expect(s).toContain("REDEEM SCRIPT · 22 B");
    expect(s).not.toContain("WITNESS PROGRAM · 22");
    expect(s).toContain(nested.derived.inputs[0].scriptSigHex);
  });
  it("A03.6 weight: 3 × base + total and the virtual size for each example", () => {
    const s = html(h(WeightMeter, { fixtures: [native, nested] }));
    for (const f of [native, nested]) {
      const m = f.derived.measures;
      expect(s).toContain(`3 × ${m.baseSize} + ${m.totalSize} = ${m.weight.toLocaleString("en-US")} WU`);
      expect(s).toContain(`= ${m.vsize} vB`);
      expect(m.weight).toBe(m.baseSize * 3 + m.totalSize);
    }
    expect(s).toContain("1,042");
  });
  it("A03.7 reuse is schematic: no hex at all", () => {
    const s = html(h(SighashReuse, {}));
    expect(s.replace(/<[^>]*>/g, " ")).not.toMatch(/[0-9a-f]{8}/);
    for (const n of ["hashPrevouts", "hashSequence", "hashOutputs"]) expect(s).toContain(n);
  });
  it("A03.8 preimage: ten items, 182 bytes, the amount and the published sighash", () => {
    const s = html(h(Bip143Preimage, { fixture: native }));
    const total = native.derived.digest.items.reduce((n, i) => n + i.hex.length / 2, 0);
    expect(total).toBe(182);
    expect(s).toContain(`${total} BYTES`);
    expect(s).toContain(`AMOUNT SPENT, ${native.derived.amountBtc} BTC`);
    expect(native.derived.amountBtc).toBe("6.00000000");
    expect(s).toContain(native.derived.digest.sighashHex.slice(0, 32));
    expect(s).toContain(native.derived.digest.sighashHex.slice(32));
    for (const it of native.derived.digest.items) expect(s.slice(s.indexOf("<details"))).toContain(it.hex);
  });
  it("A03.9 amount storyboard: the outpoint only, then the amount into item 6, no invented digest", () => {
    const s = html(h(AmountStory, { fixture: native }));
    expect(s.split('class="k-story__frame"').length - 1).toBe(3);
    expect(s).toContain("item 6");
    expect(s).toContain(`${native.derived.digest.sighashHex.slice(0, 10)}…`);
    // Only the published sighash appears as a digest value.
    const hexes = [...s.matchAll(/[0-9a-f]{64}/g)].map((x) => x[0]);
    const allowed = new Set([native.derived.digest.sighashHex, native.derived.digest.items.find((i) => i.id === "outpoint")!.hex.slice(0, 64)]);
    for (const x of hexes) expect(allowed.has(x), x).toBe(true);
  });
});
