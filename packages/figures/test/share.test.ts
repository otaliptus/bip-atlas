import { describe, expect, it } from "vitest";
import { figureShareUrl, figureViewQuery, readFigureView } from "../src/share";
import { addressViewFromSearch } from "../src/AddressChecksumLab";
import { taprootViewFromSearch } from "../src/taproot/TaprootCommitment";
import type { AddressFixture, DerivedTaprootTreeFixture } from "../src/types";

const addressFixtures = [
  { id: "v0", kind: "address", address: "bc1qabc", network: "bc", lab: true, label: "V0", source: {} },
  { id: "upper", kind: "address", address: "BC1QABC", network: "bc", lab: true, label: "Upper", source: {} },
] as AddressFixture[];
const taprootFixture = { derived: { leaves: [{ id: 0 }, { id: 1 }] } } as DerivedTaprootTreeFixture;

describe("figure view URLs", () => {
  it("round-trips namespaced values and preserves unrelated state", () => {
    const href = figureShareUrl("https://example.test/learn/addresses/?theme=plain&a04-5.sample=old&a07-2.path=key#four-parts", "fig-a04-5", { sample: "v0", at: "4", char: "z" });
    const url = new URL(href);
    expect(url.searchParams.get("theme")).toBe("plain");
    expect(url.searchParams.get("a07-2.path")).toBe("key");
    expect(url.searchParams.get("a04-5.sample")).toBe("v0");
    expect(url.searchParams.get("a04-5.at")).toBe("4");
    expect(url.hash).toBe("#fig-a04-5");
    expect(readFigureView(url.search, "fig-a04-5")).toEqual({ sample: "v0", at: "4", char: "z" });
    expect(readFigureView(url.search, "fig-a07-2")).toEqual({ path: "key" });
  });

  it("encodes values and omits empty state", () => {
    const query = figureViewQuery("fig-a04-5", { char: "a b&", edit: null, empty: undefined });
    expect(query).toBe("a04-5.char=a+b%26");
    expect(readFigureView(`?${query}`, "fig-a04-5")).toEqual({ char: "a b&" });
  });

  it("rejects invalid figure ids", () => {
    expect(() => figureViewQuery("fig-bad.id", { sample: "v0" })).toThrow("Invalid figure id");
  });
});

describe("address view restoration", () => {
  const initial = { fixtureId: "v0", edit: null, cursor: 6 };

  it("restores a reviewed sample, position and edited character", () => {
    expect(addressViewFromSearch("?a04-5.sample=v0&a04-5.at=4&a04-5.char=z", "fig-a04-5", addressFixtures, initial)).toEqual({ fixtureId: "v0", cursor: 4, edit: { index: 4, char: "z" } });
  });

  it("keeps uppercase fixtures uppercase and ignores a no-op edit", () => {
    expect(addressViewFromSearch("?a04-5.sample=upper&a04-5.at=4&a04-5.char=z", "fig-a04-5", addressFixtures, initial).edit).toEqual({ index: 4, char: "Z" });
    expect(addressViewFromSearch("?a04-5.sample=v0&a04-5.at=4&a04-5.char=a", "fig-a04-5", addressFixtures, initial).edit).toBeNull();
  });

  it("falls back safely for unknown samples, positions and characters", () => {
    for (const search of ["?a04-5.sample=unknown", "?a04-5.at=999&a04-5.char=z", "?a04-5.at=4&a04-5.char=%3Cscript%3E"]) {
      expect(addressViewFromSearch(search, "fig-a04-5", addressFixtures, initial)).toEqual(initial);
    }
  });
});

describe("Taproot view restoration", () => {
  const initial = { path: "script" as const, leafId: 1, view: "wallet" as const };

  it("restores path, leaf and proof view", () => {
    expect(taprootViewFromSearch("?a07-2.path=key&a07-2.leaf=0&a07-2.view=proof", "fig-a07-2", taprootFixture, initial)).toEqual({ path: "key", leafId: 0, view: "proof" });
  });

  it("ignores unknown enum values and leaves", () => {
    expect(taprootViewFromSearch("?a07-2.path=other&a07-2.leaf=99&a07-2.view=other", "fig-a07-2", taprootFixture, initial)).toEqual(initial);
  });
});
