import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { Bip48Paths } from "../src/bip67/Bip48Paths";
import { Bip67ByteOrder } from "../src/bip67/Bip67ByteOrder";
import { Bip67KeyOrder, bip67HeroSpec } from "../src/bip67/Bip67KeyOrder";
import { Bip67ScriptStory } from "../src/bip67/Bip67ScriptStory";
import type { DerivedBip48Fixture, DerivedBip67Fixture } from "../src/types";
import { deriveChapter } from "./derived";

const root = new URL("../../../", import.meta.url);
const html = (n: VNode<any>) => render(n);
const wideOnly = (s: string) => s.split("k-resp__narrow")[0];
const [v1, v2, v3, v4] = await deriveChapter<DerivedBip67Fixture>("sorted-multisig.json", ["bip67-v1", "bip67-v2", "bip67-v3", "bip67-v4"]);
const paths = await deriveChapter<DerivedBip48Fixture>("sorted-multisig.json", ["bip48-p2wsh-external-first", "bip48-p2sh-p2wsh-external-first", "bip48-p2wsh-change-first"]);

describe("sorted-multisig fixtures", () => {
  it("letter the keys in the vector's order and record six orders for three keys", () => {
    expect(Object.values(v4.derived.letterOf)).toEqual(["A", "B", "C"]);
    expect(v4.derived.orders.map((o) => o.letters)).toEqual(["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"]);
    expect(v3.derived.orders).toEqual([]);
    expect(v2.derived.sorted).toEqual(v2.list);
  });
  it("find where neighbouring sorted keys first differ", () => {
    expect(v1.derived.firstDifferences).toEqual([1]);
    expect(v3.derived.firstDifferences).toEqual([32, 0, 32]);
  });
});

describe("A20.1 hero", () => {
  const spec = bip67HeroSpec([v4]);
  const r = (order: number, sorted: boolean) => wideOnly(html(h(Bip67KeyOrder, { fixtures: [v4], figureId: "fig-a20-1", initial: { order, sorted } })));
  it("has twelve states and a sorted no-JS state", () => {
    expect(spec.states).toHaveLength(12);
    expect(spec.states.find((s) => s.id === spec.noJsId)!.state).toEqual({ order: 0, sorted: true });
  });
  it("as received: each order its own address; only the sorted order matches BIP 67", () => {
    const addrs = v4.derived.orders.map((o, i) => {
      const s = r(i, false);
      expect(s).toContain(o.address);
      expect(s).toContain(o.address === v4.address ? "= BIP 67's ADDRESS ✓" : "≠ BIP 67's ADDRESS");
      expect(s).toContain("6 ORDERS → 6 ADDRESSES");
      return o.address;
    });
    expect(addrs.filter((a) => a === v4.address)).toHaveLength(1);
    expect(v4.derived.orders.find((o) => o.address === v4.address)!.letters).toBe(v4.derived.sorted.map((k) => v4.derived.letterOf[k]).join(""));
  });
  it("sorted first: every order gives the published address", () => {
    for (let i = 0; i < 6; i++) {
      const s = r(i, true);
      expect(s).toContain(`>${v4.address}<`);
      expect(s).toContain("6 ORDERS → 1 ADDRESS");
      expect(s).toContain("SORT BYTES");
    }
  });
});

describe("A20.2 to A20.4", () => {
  it("A20.2 outlines the deciding bytes", () => {
    const s = html(h(Bip67ByteOrder, { fixtures: [v1, v3] }));
    expect(s).toContain("1 &lt; 2: BYTE 2");
    expect(s.split("BYTE 33").length - 1).toBe(2);
    expect(s).toContain("2 &lt; 3: BYTE 1");
  });
  it("A20.3 lists the script item by item, 105 bytes, and the address", () => {
    const s = html(h(Bip67ScriptStory, { fixture: v4 }));
    expect(s).toContain("105 BYTES");
    expect(s).toContain(v4.derived.hash160Hex);
    expect(s).toContain(v4.address);
    expect(s.split("push the next 33 bytes").length - 1).toBe(3);
  });
  it("A20.4 marks hardened levels and what changes between the examples", () => {
    const s = html(h(Bip48Paths, { fixtures: paths }));
    expect(paths.map((p) => p.derived.path)).toEqual(["m/48'/0'/0'/2'/0/0", "m/48'/0'/0'/1'/0/0", "m/48'/0'/0'/2'/1/0"]);
    expect(s.split("k-fill--public").length - 1).toBe(12);
    expect(s.split("k-cell--em").length - 1).toBe(2);
  });
});

describe("sorted-multisig prose", () => {
  const text = readFileSync(new URL("content/chapters/sorted-multisig.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("For vector 4 that is 105 bytes.");
    expect(v4.derived.scriptHex.length / 2).toBe(105);
    expect(text).toContain("first differ at byte 33, then at byte 1, then at byte 33 again");
    expect(v3.derived.firstDifferences.map((b) => b + 1)).toEqual([33, 1, 33]);
    expect(text).toContain("`3Q4sF6tv9wsdqu2NtARzNCpQgwifm2rAba`");
    expect(v4.derived.address).toBe("3Q4sF6tv9wsdqu2NtARzNCpQgwifm2rAba");
  });
});
