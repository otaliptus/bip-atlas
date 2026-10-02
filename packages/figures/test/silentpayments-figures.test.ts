import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { hexToBytes } from "@bip-atlas/models/hex";
import { createOutputs, decodeAddress, parseWitness, readInput, receiverAddresses, scan } from "@bip-atlas/models/silentpayments";
import { DeriveStory } from "../src/silentpayments/DeriveStory";
import { EcdhStory } from "../src/silentpayments/EcdhStory";
import { ScanLoop } from "../src/silentpayments/ScanLoop";
import { SpAddress } from "../src/silentpayments/SpAddress";
import { SpDerivation, describeView, spPanels } from "../src/silentpayments/SpDerivation";
import { SpEligibility } from "../src/silentpayments/SpEligibility";
import { SpLabels } from "../src/silentpayments/SpLabels";
import type { DerivedSpEligibilityFixture, DerivedSpFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const vectors = JSON.parse(readFileSync(new URL("sources/research-2026-10-01-phase3/raw/bip-0352/send_and_receive_test_vectors.json", root), "utf8"));
const fixtures = JSON.parse(readFileSync(new URL("fixtures/silent-payments.json", root), "utf8")).fixtures;
const chapter = JSON.parse(readFileSync(new URL("content/chapters/silent-payments.json", root), "utf8"));
const html = (n: VNode<any>) => render(n);
const vin = (v: any) => ({ txid: v.txid, vout: v.vout, scriptSigHex: v.scriptSig, witness: parseWitness(v.txinwitness), prevoutSpkHex: v.prevout.scriptPubKey.hex });
const inputs = (vins: any[]) => vins.map((v) => { const r = readInput(vin(v)); return { outpoint: `${v.txid.slice(0, 8)}…:${v.vout}`, kind: r.kind, pubkey: r.pubkey, skipped: r.skipped }; });

/** The same derivation as derive.ts deriveSp. */
function sp(id: string): DerivedSpFixture {
  const f = fixtures.find((x: any) => x.id === id);
  const c = vectors[f.caseIndex];
  expect(c.comment).toBe(f.source.quote);
  const s = c.sending[0], r = c.receiving[0], g = r.given;
  const send = createOutputs(s.given.vin.map((v: any) => ({ ...vin(v), privateKey: v.private_key })), s.given.recipients.flatMap((x: any) => Array(x.count ?? 1).fill(x.address)));
  const bScan = hexToBytes(g.key_material.scan_priv_key), bSpend = hexToBytes(g.key_material.spend_priv_key);
  const addrs = receiverAddresses(bScan, bSpend, g.labels);
  expect(addrs).toEqual(r.expected.addresses);
  const res = scan(g.vin.map(vin), [...g.outputs], bScan, bSpend, g.labels);
  expect(res.sharedSecret).toBe(r.expected.shared_secret);
  const dec = decodeAddress(addrs[0]);
  const paidScan = decodeAddress(s.given.recipients[0].address).Bscan;
  const paidSecret = send.sharedSecrets.find((x) => x.Bscan === paidScan)!.secret;
  return {
    ...f,
    derived: {
      comment: c.comment, inputs: inputs(g.vin), smallestOutpoint: res.smallestOutpoint!, A: res.A!, inputHash: res.inputHash!, tweak: res.tweak!, sharedSecret: res.sharedSecret!,
      secretsAgree: send.sharedSecrets.find((x) => x.Bscan === dec.Bscan)?.secret === res.sharedSecret, senderSecret: paidSecret,
      receiver: { address: addrs[0], Bscan: dec.Bscan, Bspend: dec.Bm, labels: g.labels, labeledAddresses: addrs.slice(1) },
      paidTo: [...new Set<string>(s.given.recipients.map((x: any) => x.address))].map((a) => { const i = addrs.indexOf(a); const k = decodeAddress(a); return { address: a, Bscan: k.Bscan, Bm: k.Bm, ours: i >= 0, label: i > 0 ? g.labels[i - 1] : null }; }),
      senderOutputs: send.outputs,
      txOutputs: g.outputs.map((o: string) => { const hit = res.found.find((x) => x.pubKey === o); const st = res.steps.find((x) => x.match?.output === o); return { key: o, mine: !!hit, label: hit?.label ?? null, k: st?.k ?? null }; }),
      steps: res.steps.map((st) => ({ k: st.k, tk: st.tk, Pk: st.Pk, matched: !!st.match, via: st.match?.via ?? null })),
    },
  };
}
const all = [chapter.opening.figure, ...chapter.sections.flatMap((s: any) => s.blocks.filter((b: any) => b.type === "figure"))];
const figure = (recipe: string) => all.find((f: any) => f.recipe === recipe);
const s0 = sp("sp-case-0");

describe("silent payments figures: placement", () => {
  it("numbers seven figures in reading order", () => {
    expect(all.map((f: any) => f.figure)).toEqual(["A15.1", "A15.2", "A15.3", "A15.4", "A15.5", "A15.6", "A15.7"]);
    expect(figure("silent-payment-derivation.v1").figure).toBe("A15.4");
  });
});

describe("A15.1 address", () => {
  it("draws all 116 characters and decodes to the two keys", () => {
    const s = html(h(SpAddress, { fixture: s0 }));
    expect(s0.derived.receiver.address).toHaveLength(116);
    for (const ch of new Set(s0.derived.receiver.address)) expect(s).toContain(`>${ch}</text>`);
    expect(s).toContain(">106 CHARACTERS: B_SCAN ‖ B_M, 66 BYTES<");
    expect(s).toContain(`>${s0.derived.receiver.Bscan}</code>`);
  });
});

describe("A15.2 ECDH storyboard", () => {
  it("is symbolic: five frames, no hex", () => {
    const s = html(h(EcdhStory, {}));
    expect(s.split('class="k-story__frame"').length - 1).toBe(5);
    expect(s).not.toMatch(/[0-9a-f]{16}/);
  });
});

describe("A15.3 derive storyboard", () => {
  it("shows the same shared secret from both sides and the scan stopping", () => {
    const s = html(h(DeriveStory, { fixture: s0 }));
    expect(s0.derived.senderSecret).toBe(s0.derived.sharedSecret);
    expect(s).toContain(`>${s0.derived.sharedSecret}</code>`);
    expect(s).toContain("NOT FOUND: STOP");
    expect(s.split('class="k-story__frame"').length - 1).toBe(6);
  });
});

describe("A15.4 hero: who knows what", () => {
  const fx = figure("silent-payment-derivation.v1").fixtures.map(sp);
  it("never gives the observer a shared secret, a tweak, ownership or the address", () => {
    for (const f of fx) {
      for (const steps of [true, false]) {
        const p = spPanels(f.derived, "observer", steps);
        expect(p.sender).toBeNull();
        expect(p.receiver).toBeNull();
        const text = JSON.stringify(p) + describeView(f.derived, "observer", steps);
        for (const secret of [f.derived.sharedSecret, f.derived.senderSecret, f.derived.receiver.address]) {
          expect(text).not.toContain(secret);
          expect(text).not.toContain(secret.slice(0, 8));
        }
        expect(text).not.toMatch(/mine, k|label \d|labels \d/);
      }
    }
  });
  it("keeps the receiver's computations out of the sender's view and vice versa", () => {
    const f23 = fx.find((f: DerivedSpFixture) => f.caseIndex === 23)!;
    const snd = spPanels(f23.derived, "sender", true);
    expect(snd.receiver).toBeNull();
    expect(JSON.stringify(snd)).not.toContain(f23.derived.sharedSecret.slice(0, 8));
    const rcv = spPanels(f23.derived, "receiver", true);
    expect(rcv.sender).toBeNull();
    expect(JSON.stringify(rcv) + describeView(f23.derived, "receiver", true)).not.toContain(f23.derived.paidTo[0].address);
  });
  it("does not give the sender a label number it could not know", () => {
    const f12 = fx.find((f: DerivedSpFixture) => f.caseIndex === 12)!;
    expect(JSON.stringify(spPanels(f12.derived, "sender", true)) + describeView(f12.derived, "sender", true)).not.toMatch(/label \d/);
    expect(JSON.stringify(spPanels(f12.derived, "receiver", true))).toContain("via a label");
  });
  it("renders the sender's side of the first vector without JavaScript", () => {
    const s = html(h(SpDerivation, { fixtures: fx, figureId: "fig-a15-4" }));
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain("secret, no value");
    expect(s).toContain("HIDDEN: NOT KNOWN TO THE SENDER");
  });
});

describe("A15.5–A15.7", () => {
  it("sorts each published input into counts or skipped, with reasons", () => {
    const f = fixtures.find((x: any) => x.kind === "sp-eligibility");
    const d: DerivedSpEligibilityFixture = { ...f, derived: { rows: f.caseIndices.map((i: number) => ({ comment: vectors[i].comment, inputs: inputs(vectors[i].receiving[0].given.vin) })) } };
    const s = html(h(SpEligibility, { fixture: d }));
    expect(s).toContain("script-path spend with the NUMS internal key H");
    expect(s).toContain("✕ P2SH · reason");
  });
  it("vector 10: P0 and P1 found, P2 not, then stop", () => {
    const d = sp("sp-case-10");
    expect(d.derived.steps.map((s) => s.matched)).toEqual([true, true, false]);
    const s = html(h(ScanLoop, { fixture: d }));
    expect(s).toContain('data-k="2" data-found="false"');
    expect(s).toContain("SCHEMATIC");
  });
  it("vector 12: labeled addresses share their B_scan characters", () => {
    const d = sp("sp-case-12");
    const s = html(h(SpLabels, { fixture: d }));
    expect(d.derived.receiver.labels).toEqual([2, 3, 1001337]);
    expect(s).toContain("LABEL m = 1001337");
    expect(s).toMatch(/THE FIRST \d+ ARE THE SAME/);
  });
});
