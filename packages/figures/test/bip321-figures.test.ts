import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Bip321Anatomy } from "../src/bip321/Bip321Anatomy";
import { Bip321Case } from "../src/bip321/Bip321Case";
import { Bip321LinkReader, bip321HeroSpec } from "../src/bip321/Bip321LinkReader";
import { Bip321Pop } from "../src/bip321/Bip321Pop";
import { segmentsOf } from "../src/bip321/parts";
import type { DerivedBip321Fixture } from "../src/types";
import { deriveChapter } from "./derived";

const root = new URL("../../../", import.meta.url);
const html = (n: VNode<any>) => render(n);
const wideOnly = (s: string) => s.split("k-resp__narrow")[0];
const all = await deriveChapter<DerivedBip321Fixture>("payment-links.json");
const byId = (id: string) => all.find((f) => f.id === id)!;
const heroIds = ["bip321-address", "bip321-amount-message", "bip321-lightning-fallback", "bip321-lightning-only", "bip321-sp-only", "bip321-optional-unknown", "bip321-required-unknown", "bip321-label-twice"];
const hero = heroIds.map(byId);
const pays = (id: string) => byId(id).derived.wallets.map((w) => (w.valid ? w.pays.join("+") || "nothing" : "invalid"));

describe("payment-links fixtures", () => {
  it("read as BIP 321 labels them", () => {
    for (const f of all) expect(f.derived.reading.valid, f.id).toBe(f.expect === "valid");
  });
  it("differ by wallet only where a key is not implemented", () => {
    expect(pays("bip321-lightning-fallback")).toEqual(["onchain", "onchain+lightning", "onchain+lightning"]);
    expect(pays("bip321-lightning-only")).toEqual(["nothing", "lightning", "lightning"]);
    expect(pays("bip321-sp-only")).toEqual(["nothing", "nothing", "sp"]);
    expect(pays("bip321-required-unknown")).toEqual(["invalid", "invalid", "invalid"]);
    expect(pays("bip321-optional-unknown")).toEqual(["onchain", "onchain", "onchain"]);
  });
  it("build the published callbacks and follow the https rules", () => {
    expect(byId("bip321-pop-app").derived.pop!.opened).toBe("initiatingapp:onchain=$HEX_ENCODED_TRANSACTION");
    expect(byId("bip321-pop-lightning").derived.pop!.opened).toBe("callbackuri:body?pop=lightning=$HEX_ENCODED_PAYMENT_PREIMAGE");
    expect([byId("bip321-pop-https").derived.pop!.mayPay, byId("bip321-req-pop-https").derived.pop!.mayPay]).toEqual([true, false]);
  });
});

describe("A21.1 hero", () => {
  const spec = bip321HeroSpec(hero);
  const r = (i: number) => wideOnly(html(h(Bip321LinkReader, { fixtures: hero, figureId: "fig-a21-1", initial: spec.states[i].state })));
  it("has one state per example and draws every part of each link", () => {
    expect(spec.states).toHaveLength(8);
    hero.forEach((f, i) => {
      const s = r(i);
      for (const seg of segmentsOf(f)) if (seg.text.length < 30) expect(s, `${f.id} ${seg.text}`).toContain(`>${seg.text.replace(/&/g, "&amp;")}<`);
    });
  });
  it("decodes the message and names each wallet's outcome", () => {
    expect(r(1)).toContain("MESSAGE DECODES TO “Donation for project xyz”");
    expect(r(2)).toContain("PAYS: ON-CHAIN OR LIGHTNING");
    expect(r(4)).toContain("VALID, BUT NOTHING IT CAN PAY");
    // The verdict wraps inside its card; read the card's lines back as one sentence.
    const card = r(6).split('data-wallet="BIP 21 keys only"')[1].split('data-wallet="Adds Lightning"')[0];
    const words = [...card.matchAll(/k-value--fail"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ");
    expect(words).toContain("INVALID: a required key, req-somethingyoudontunderstand, is not implemented.");
  });
  it("says once what every wallet agrees on", () => {
    expect(html(h(Bip321LinkReader, { fixtures: hero, figureId: "x", initial: { id: "bip321-label-twice" } }))).toContain("for all three wallets.");
  });
});

describe("A21.2 to A21.4", () => {
  it("A21.2 shows each part and the decoded message", () => {
    const s = html(h(Bip321Anatomy, { fixture: byId("bip321-amount-message") }));
    expect(s).toContain("“DONATION FOR PROJECT XYZ”");
    expect(s).toContain("AMOUNT: DECIMAL BTC, A PERIOD, NO COMMAS");
  });
  it("A21.3 reads the uppercase link's keys as lowercase", () => {
    const s = html(h(Bip321Case, { fixtures: [byId("bip321-bc-pair"), byId("bip321-bc-pair-upper")] }));
    expect(s.split("KEY READ AS “bc”").length - 1).toBe(4);
    expect(s).toContain("SAME KEYS, SAME ADDRESSES: ONE MEANING");
  });
  it("A21.4 opens two callbacks, and refuses to pay for a required https one", () => {
    const s = html(h(Bip321Pop, { fixtures: ["bip321-pop-app", "bip321-pop-lightning", "bip321-pop-https", "bip321-req-pop-https"].map(byId) }));
    expect(s.split('class="k-story__frame"').length - 1).toBe(4);
    expect(s).toContain("DOES NOT PAY AT ALL");
    expect(s).toContain("PAYS, BUT OPENS NOTHING");
  });
});

describe("payment-links prose", () => {
  const text = readFileSync(new URL("content/chapters/payment-links.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("`amount=50.00` and `amount=50` both mean 50 BTC");
    expect(byId("bip321-amount-message").derived.reading.params[0]).toMatchObject({ key: "amount", value: "50" });
    expect(text).toContain("so a space becomes `%20`");
    expect(decodeURIComponent("%20")).toBe(" ");
  });
});
