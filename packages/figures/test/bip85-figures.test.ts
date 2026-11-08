import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Bip85Applications, bip85HeroSpec } from "../src/bip85/Bip85Applications";
import { Bip85Path } from "../src/bip85/Bip85Path";
import { Bip85Story } from "../src/bip85/Bip85Story";
import { Bip85Uses } from "../src/bip85/Bip85Uses";
import type { DerivedBip85Fixture } from "../src/types";
import { deriveChapter } from "./derived";

const root = new URL("../../../", import.meta.url);
const html = (n: VNode<any>) => render(n);
const all = await deriveChapter<DerivedBip85Fixture>("derived-seeds.json");
const byId = (id: string) => all.find((f) => f.id === id)!;
const words12 = byId("bip85-bip39-12");

describe("derived-seeds fixtures", () => {
  it("derive every published application, each on its own path", () => {
    expect(all.map((f) => f.derived.outputKind)).toEqual(["words", "words", "wif", "xprv", "hex", "password", "rolls"]);
    expect(new Set(all.map((f) => f.path)).size).toBe(all.length);
    expect(new Set(all.map((f) => f.derived.entropyHex)).size).toBe(all.length);
  });
  it("name each path level as BIP 85's path formats do", () => {
    expect(words12.derived.levels.map((l) => l.meaning)).toEqual(["BIP 85", "BIP 39", "English", "12 words", "index 0"]);
    expect(byId("bip85-dice").derived.levels.map((l) => l.value)).toEqual(["83696968'", "89101'", "6'", "10'", "0'"]);
  });
  it("read the bytes BIP 85 says each application reads", () => {
    expect(words12.derived.uses).toEqual([{ from: 0, to: 16, as: "entropy for 12 words" }]);
    expect(byId("bip85-xprv").derived.uses.map((u) => [u.from, u.to])).toEqual([[0, 32], [32, 64]]);
    expect(byId("bip85-dice").derived.skipped).toBeGreaterThanOrEqual(0);
  });
});

describe("A19.1 hero", () => {
  const spec = bip85HeroSpec(all);
  const state = (i: number) => html(h(Bip85Applications, { fixtures: all, figureId: "fig-a19-1", initial: spec.states[i].state }));
  it("has one state per application and a leak toggle outside the key", () => {
    expect(spec.states).toHaveLength(all.length);
    expect(spec.controls.map((c) => c.kind)).toEqual(["strip", "toggle"]);
    expect(spec.noJsId).toBe("a0");
  });
  it("draws the path, k, the 64 bytes and the published output in every state", () => {
    for (const [i, f] of all.entries()) {
      const s = state(i);
      for (const l of f.derived.levels) expect(s, f.id).toContain(`>${l.value}<`);
      expect(s).toContain(f.derived.derivedKeyHex);
      expect(s).toContain(f.derived.entropyHex);
      expect(s).toContain(f.published.output ?? f.published.entropy);
      expect((s.split('data-used="true"').length - 1) / 2, f.id).toBe(f.derived.uses.reduce((n, u) => n + u.to - u.from, 0));
    }
  });
  it("puts the leak notes and the hatching in a layer the toggle shows", () => {
    const s = state(0);
    expect(s.split('class="k-leak"').length - 1).toBe(6);
    expect(s).toContain("THE ROOT STAYS UNKNOWN (HARDENED PATH)");
    expect(s).toContain("If this output leaks, k stays unknown");
  });
});

describe("A19.2 to A19.4", () => {
  it("A19.2 reads the purpose number as SEED", () => {
    const s = html(h(Bip85Path, { fixtures: [words12, byId("bip85-wif")] }));
    for (const c of ["S", "E", "D"]) expect(s).toContain(`>${c}<`);
    expect(s).toContain("spell SEED");
    expect(s).toContain("ITS PARAMETERS");
  });
  it("A19.3 keeps 16 of 64 bytes and shows the published twelve words", () => {
    const s = html(h(Bip85Story, { fixture: words12 }));
    expect(s.split('class="k-story__frame"').length - 1).toBe(5);
    expect(s).toContain("Keep the first 16 bytes, 128 bits, and drop the other 48.");
    for (const w of words12.derived.output.split(" ")) expect(s).toContain(w);
  });
  it("A19.4 fills exactly the bytes each application reads", () => {
    const s = html(h(Bip85Uses, { fixtures: all }));
    expect(s.split('data-used="true"').length - 1).toBe(16 + 32 + 32 + 64 + 64 + 64 + 64);
  });
  it("refuses a storyboard for an application that makes no words", () => {
    expect(() => html(h(Bip85Story, { fixture: byId("bip85-wif") }))).toThrow();
  });
});

describe("derived-seeds prose", () => {
  const text = readFileSync(new URL("content/chapters/derived-seeds.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("`1,0,0,2,0,1,5,5,2,4`");
    expect(byId("bip85-dice").derived.output).toBe("1,0,0,2,0,1,5,5,2,4");
    expect(text).toContain("Twelve words take the first 128 bits; twenty-four take the first 256.");
    expect([words12.derived.uses[0].to * 8, byId("bip85-bip39-24").derived.uses[0].to * 8]).toEqual([128, 256]);
    expect(text).toContain("83696968 itself spells SEED");
  });
});
