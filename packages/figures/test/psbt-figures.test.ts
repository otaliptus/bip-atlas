import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it } from "vitest";
import { PsbtEnvelope } from "../src/psbt/PsbtEnvelope";
import { PsbtLayout, psbtBytes } from "../src/psbt/PsbtLayout";
import { PsbtCombine, PsbtFinalize, UnknownFields } from "../src/psbt/PsbtMerge";
import { PsbtRecords } from "../src/psbt/PsbtRecords";
import { PsbtRoleStory } from "../src/psbt/PsbtRoleStory";
import { SignerDisplay, UtxoCheck } from "../src/psbt/PsbtSigner";
import type { DerivedPsbtCombineFixture, DerivedPsbtTraceFixture } from "../src/types";
import { deriveChapter } from "./derived";

const html = (n: VNode<any>) => render(n);
const wideOnly = (s: string) => s.split("k-resp__narrow")[0];
let trace: DerivedPsbtTraceFixture;
let pair: DerivedPsbtCombineFixture;
beforeAll(async () => {
  [trace, pair] = await deriveChapter<any>("psbt.json", ["bip174-trace", "unknown-combine"]);
});

describe("PSBT bytes", () => {
  it("every published state's maps add up to its size, byte for byte", () => {
    for (const s of trace.derived.states) expect(psbtBytes(s).reduce((n, f) => n + f.bytes, 0)).toBe(s.bytes);
  });
  it("the Creator's PSBT: magic, one global record and five separators, 167 bytes", () => {
    const f = psbtBytes(trace.derived.states[0]);
    expect(trace.derived.states[0].bytes).toBe(167);
    expect(f.filter((x) => x.id.endsWith(".sep"))).toHaveLength(5);
    const s = html(h(PsbtLayout, { fixture: trace }));
    expect(s).toContain("167 BYTES");
    expect(s).toContain("INPUT 0 MAP · EMPTY");
  });
});

describe("PsbtEnvelope (hero, static renders)", () => {
  const r = (initial?: { step: number; compare: "step" | "creator" }) => html(h(PsbtEnvelope, { fixture: trace, figureId: "fig-a05-3", initial }));
  it("no-JS default shows the Combiner's PSBT with all its fields", () => {
    const s = r();
    expect(s).toContain('data-hydrated="false"');
    const comb = trace.derived.states.find((x) => x.basedOn.length > 1)!;
    expect(s).toContain(`THIS PSBT: ${comb.bytes} B`);
    expect((wideOnly(s).match(/data-record="Partial Signature"/g) ?? []).length).toBe(4);
  });
  it("the Updater step marks its additions; the finalizer step hatches what it cleared", () => {
    const upd = r({ step: 1, compare: "step" });
    const added = trace.derived.states[1].maps.flatMap((m) => m.records).filter((x) => x.status === "added").length;
    expect((wideOnly(upd).match(/data-mark="new"/g) ?? []).length).toBe(added);
    const fi = trace.derived.states.findIndex((x) => x.role === "Input Finalizer");
    const fin = r({ step: fi, compare: "step" });
    const removed = trace.derived.states[fi].maps.reduce((n, m) => n + m.removed.length, 0);
    expect((wideOnly(fin).match(/data-mark="removed"/g) ?? []).length).toBe(removed);
  });
  it("Signer B is said to start from the second Updater's PSBT", () => {
    const b = trace.derived.states.findIndex((x) => x.id === "signer-b");
    expect(r({ step: b, compare: "step" })).toContain("It starts from the PSBT of updater 2, not of signer A");
  });
  it("the extractor step gives the network transaction and its exact txid", () => {
    const s = r({ step: trace.derived.states.length, compare: "step" });
    expect(s).toContain(`NETWORK TRANSACTION · ${trace.derived.extracted.bytes} B`);
    expect(s).toContain(trace.derived.extracted.txidHex);
  });
});

describe("Static PSBT drawings", () => {
  it("A05.2: two partial signatures from the two signers, keys differ", () => {
    const s = html(h(PsbtRecords, { fixture: trace }));
    expect(s).toContain("FROM SIGNER A");
    expect(s).toContain("FROM SIGNER B");
    expect(s).toContain("TYPE + KEY DATA");
  });
  it("A05.4 storyboard: one frame per state plus the extractor", () => {
    const s = html(h(PsbtRoleStory, { fixture: trace }));
    expect(s.split('class="k-story__frame"').length - 1).toBe(trace.derived.states.length + 1);
    expect(s).toContain(trace.derived.extracted.txidDisplayHex);
    expect(trace.derived.extracted.txidDisplayHex).toBe(trace.derived.extracted.txidHex.match(/../g)!.reverse().join(""));
  });
  it("A05.5: amounts and fee from the model", () => {
    const a = trace.derived.amounts;
    expect(a.inputs.map((x) => x.btc)).toEqual(["0.50000000", "2.00000000"]);
    expect(a.outputsBtc).toEqual(["1.49990000", "1.00000000"]);
    expect(a.feeBtc).toBe("0.00010000");
    const s = html(h(SignerDisplay, { fixture: trace }));
    for (const v of [...a.inputs.map((x) => x.btc), ...a.outputsBtc, a.feeBtc]) expect(s).toContain(`${v} BTC`);
  });
  it("A05.6: the non-witness UTXO hashes to the prevout txid", () => {
    const c = trace.derived.utxoCheck;
    expect(c.computedTxidHex).toBe(c.prevoutTxidHex);
    const s = html(h(UtxoCheck, { fixture: trace }));
    expect(s).toContain(`${c.computedTxidHex.slice(0, 12)}…`);
    expect(s.slice(s.indexOf("<details"))).toContain(c.computedTxidHex);
  });
  it("A05.7: the merge keeps one signature found only in each copy", () => {
    const s = html(h(PsbtCombine, { fixture: trace }));
    expect(s).toContain("only here");

    expect(s).toContain("from signer A");
  });
  it("A05.8: the finalizer keeps the UTXOs and clears the rest", () => {
    const s = html(h(PsbtFinalize, { fixture: trace }));
    expect((s.match(/data-mark="removed"/g) ?? []).length).toBe(13);
    expect(s).toContain("final witness");
  });
  it("A05.9: all six unknown records survive", () => {
    const s = html(h(UnknownFields, { fixture: pair }));
    expect(pair.derived.combined.records.filter((r) => !r.constant)).toHaveLength(6);
    for (const r of pair.derived.combined.records.filter((x) => !x.constant)) expect(s).toContain(r.valueHex);
  });
});
