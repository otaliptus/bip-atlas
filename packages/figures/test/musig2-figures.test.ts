import { readFileSync } from "node:fs";
import { h as el, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes } from "@bip-atlas/models/hex";
import {
  InvalidContributionError, bip340Verify, getSecondKey, hasEvenYPoint, keyAgg, keyAggAndTweak, keyAggCoeff, musigHashKeys, naiveSumXonly,
  nonceAgg, partialSigAgg, partialSigVerify, pointHex, sessionValues, xonlyPk,
} from "@bip-atlas/models/musig2";
import { ChainView } from "../src/musig2/ChainView";
import { Coefficients } from "../src/musig2/Coefficients";
import { Musig2KeyAgg } from "../src/musig2/Musig2KeyAgg";
import { Musig2PsigChecks } from "../src/musig2/Musig2PsigChecks";
import { Musig2Rounds } from "../src/musig2/Musig2Rounds";
import { NonceOnce } from "../src/musig2/NonceOnce";
import { RoundStory } from "../src/musig2/RoundStory";
import { short } from "../src/musig2/scene";
import type { DerivedMusig2KeyaggFixture, DerivedMusig2PsigChecksFixture, DerivedMusig2SessionFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const vec = (name: string) => JSON.parse(readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/bip-0327/vectors/${name}.json`, root), "utf8"));
const fixtures = JSON.parse(readFileSync(new URL("fixtures/musig2.json", root), "utf8")).fixtures;
const chapter = JSON.parse(readFileSync(new URL("content/chapters/musig2.json", root), "utf8"));
const hx = (s: string) => hexToBytes(s.toLowerCase());
const HX = (b: Uint8Array) => bytesToHex(b);
const big = (n: bigint) => n.toString(16).padStart(64, "0");
const html = (n: VNode<any>) => render(n);

/** The same derivation as derive.ts deriveMusig2Session. */
function session(id: string): DerivedMusig2SessionFixture {
  const f = fixtures.find((x: any) => x.id === id);
  const d = vec("sig_agg_vectors");
  const c = d.valid_test_cases[f.caseIndex];
  const X = d.pubkeys.map(hx), P = d.pnonces.map(hx), T = d.tweaks.map(hx), S = d.psigs.map(hx), msg = hx(d.msg);
  const pubkeys: Uint8Array[] = c.key_indices.map((i: number) => X[i]);
  const pubnonces: Uint8Array[] = c.nonce_indices.map((i: number) => P[i]);
  const tweaks: Uint8Array[] = c.tweak_indices.map((i: number) => T[i]);
  const psigs: Uint8Array[] = c.psig_indices.map((i: number) => S[i]);
  const aggnonce = nonceAgg(pubnonces);
  expect(HX(aggnonce)).toBe(c.aggnonce.toLowerCase());
  const s = { aggnonce, pubkeys, tweaks, isXonly: c.is_xonly, msg };
  const v = sessionValues(s);
  const sig = partialSigAgg(psigs, s);
  expect(HX(sig)).toBe(c.expected.toLowerCase());
  const finalX = xonlyPk(keyAggAndTweak(pubkeys, tweaks, c.is_xonly));
  const base = keyAgg(pubkeys);
  const pk2 = getSecondKey(pubkeys);
  return {
    ...f,
    derived: {
      msg: HX(msg), keyListHash: HX(musigHashKeys(pubkeys)),
      signers: pubkeys.map((pk, i) => ({ pubkey: HX(pk), coefficient: big(keyAggCoeff(pubkeys, pk)), secondKey: HX(pk) === HX(pk2), pubnonce: [HX(pubnonces[i].slice(0, 33)), HX(pubnonces[i].slice(33))] as [string, string], psig: HX(psigs[i]), psigVerifies: partialSigVerify(psigs[i], pubnonces, pubkeys, tweaks, c.is_xonly, msg, i) })),
      aggPlain: pointHex(base.Q), aggXonly: HX(xonlyPk(base)),
      tweaks: tweaks.map((t, i) => ({ tweak: HX(t), xonly: c.is_xonly[i], resultXonly: HX(xonlyPk(keyAggAndTweak(pubkeys, tweaks.slice(0, i + 1), c.is_xonly.slice(0, i + 1)))) })),
      finalXonly: HX(finalX), aggnonce: [HX(aggnonce.slice(0, 33)), HX(aggnonce.slice(33))], b: big(v.b), R: pointHex(v.R), rEvenY: hasEvenYPoint(v.R), e: big(v.e), tacc: big(v.tacc),
      signature: HX(sig), signatureVerifies: bip340Verify(sig, msg, finalX),
    },
  };
}
function keyagg(): DerivedMusig2KeyaggFixture {
  const f = fixtures.find((x: any) => x.kind === "musig2-keyagg");
  const d = vec("key_agg_vectors");
  const X = d.pubkeys.map(hx);
  const orders = f.caseIndices.map((ci: number) => {
    const keys: Uint8Array[] = d.valid_test_cases[ci].key_indices.map((i: number) => X[i]);
    return { keys: keys.map(HX), coefficients: keys.map((k) => big(keyAggCoeff(keys, k))), aggXonly: HX(xonlyPk(keyAgg(keys))) };
  });
  return { ...f, derived: { orders, naiveSumXonly: HX(naiveSumXonly(d.valid_test_cases[f.caseIndices[0]].key_indices.map((i: number) => X[i]))) } };
}
function checks(): DerivedMusig2PsigChecksFixture {
  const f = fixtures.find((x: any) => x.kind === "musig2-psig-checks");
  const d = vec("sign_verify_vectors");
  const X = d.pubkeys.map(hx), P = d.pnonces.map(hx), M = d.msgs.map(hx);
  const run = (c: any, sig: string) => partialSigVerify(hx(sig), c.nonce_indices.map((i: number) => P[i]), c.key_indices.map((i: number) => X[i]), [], [], M[c.msg_index], c.signer_index);
  const v0 = d.valid_test_cases[0];
  const rows: any[] = [{ label: "Published valid partial signature", signer: v0.signer_index, psig: v0.expected.toLowerCase(), verdict: run(v0, v0.expected) ? "valid" : "invalid", detail: "holds" }];
  for (const c of d.verify_fail_test_cases) rows.push({ label: c.comment, signer: c.signer_index, psig: c.sig.toLowerCase(), verdict: run(c, c.sig) ? "valid" : "invalid", detail: "does not hold" });
  for (const c of d.verify_error_test_cases) {
    let caught: any = null;
    try { run(c, c.sig); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(InvalidContributionError);
    rows.push({ label: c.comment, signer: c.signer_index, psig: c.sig.toLowerCase(), verdict: "error", detail: `blames signer ${caught.signer + 1} for an invalid ${caught.contrib}` });
  }
  return { ...f, derived: { rows } };
}
const all = [chapter.opening.figure, ...chapter.sections.flatMap((s: any) => s.blocks.filter((b: any) => b.type === "figure"))];
const s0 = session("sig-agg-0");

describe("musig2 figures: placement", () => {
  it("numbers seven figures in reading order", () => {
    expect(all.map((f: any) => f.figure)).toEqual(["A14.1", "A14.2", "A14.3", "A14.4", "A14.5", "A14.6", "A14.7"]);
    expect(all.find((f: any) => f.recipe === "musig2-rounds.v1").figure).toBe("A14.4");
  });
});

describe("A14.1 chain view", () => {
  const s = html(el(ChainView, { fixture: s0 }));
  it("shows one key and one 64-byte signature, exactly disclosed, and no signer key", () => {
    expect(s).toContain(`>${s0.derived.finalXonly}</code>`);
    expect(s).toContain(`>${s0.derived.signature}</code>`);
    expect(s).toContain("ONE SIGNATURE · 64 B");
    for (const sg of s0.derived.signers) expect(s).not.toContain(sg.pubkey.slice(2, 10));
  });
});

describe("A14.2 key aggregation", () => {
  const k = keyagg();
  const s = html(el(Musig2KeyAgg, { fixture: k }));
  it("draws both orders, their differing aggregates and the plain sum", () => {
    expect(k.derived.orders[0].aggXonly).not.toBe(k.derived.orders[1].aggXonly);
    for (const o of k.derived.orders) expect(s).toContain(short(o.aggXonly));
    expect(s).toContain(short(k.derived.naiveSumXonly));
    expect(s).toContain("a = 1");
    expect(s).toContain("MATCHES NEITHER");
  });
});

describe("A14.3 coefficients", () => {
  it("hashes L and one coefficient and gives the second key 1", () => {
    const s = html(el(Coefficients, { fixture: s0 }));
    expect(s).toContain(`>${s0.derived.keyListHash}</code>`);
    expect(s).toContain("a2 = 1");
    expect(s.split('class="k-story__frame"').length - 1).toBe(4);
  });
});

describe("A14.4 hero (no-JS)", () => {
  const fx = ["sig-agg-0", "sig-agg-1", "sig-agg-2", "sig-agg-3"].map(session);
  it("renders the whole first session with every lamp lit and no secret", () => {
    const s = html(el(Musig2Rounds, { fixtures: fx, figureId: "fig-a14-4" }));
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain(short(s0.derived.signature.slice(0, 64)));
    expect(s).toContain(s0.derived.signature);
    expect(s).not.toContain("secret key, nonces");
    expect(s.split('data-state="on"').length - 1).toBe(2 * (s0.derived.signers.length + 1));
  });
  it("vector 3 carries three tweaks, all drawn", () => {
    const s = html(el(Musig2Rounds, { fixtures: [fx[3]], figureId: "x" }));
    for (const t of fx[3].derived.tweaks) expect(s).toContain(short(t.resultXonly));
  });
});

describe("A14.5 round storyboard", () => {
  it("has one frame per stage and draws secrets without values", () => {
    const s = html(el(RoundStory, { fixture: s0 }));
    expect(s.split('class="k-story__frame"').length - 1).toBe(5);
    expect(s).toContain("secret key, nonces");
  });
});

describe("A14.6 and A14.7", () => {
  it("draws the nonce ticket schematically", () => expect(html(el(NonceOnce, { fixture: s0 }))).toContain("SCHEMATIC · NO VALUES"));
  it("lights only the valid partial signature and names the blamed signers", () => {
    const c = checks();
    const s = html(el(Musig2PsigChecks, { fixture: c }));
    expect(s.split('data-verdict="valid"').length - 1).toBe(1);
    expect(s).toContain("BLAMED");
    for (const r of c.derived.rows) expect(s).toContain(`>${r.psig}</code>`);
  });
});
