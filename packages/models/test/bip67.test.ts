import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bip48Levels, bip48Path, type Bip48Params } from "../src/bip48";
import { Bip67Error, bip67Multisig, checkCompressedKey, firstDifference, multisigScript, p2shAddress, permutations, sortKeys } from "../src/bip67";

const root = new URL("../../../", import.meta.url);
const snapshot = new URL("sources/research-2026-11-08-phase4/", root);
const lock = JSON.parse(readFileSync(new URL("sources.lock.json", snapshot), "utf8"));
const pinned = (path: string) => {
  const bytes = readFileSync(new URL(`raw/${path}`, snapshot));
  expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(lock.files.find((f: { path: string }) => f.path === path).sha256);
  return bytes.toString("utf8").split("\n");
};

/** BIP 67's test vectors: List, Sorted, Script and Address under each "Vector N" heading. */
const b67 = pinned("bip-0067.mediawiki");
interface V67 { name: string; line: number; List: string[]; Sorted: string[]; Script: string[]; Address: string[] }
const vectors: V67[] = [];
{
  let field: keyof V67 | null = null;
  for (const [i, l] of b67.entries()) {
    if (/^==Acknowledgements==/.test(l)) break;
    if (/^Vector \d/.test(l)) vectors.push({ name: l.match(/^Vector \d+/)![0], line: i + 1, List: [], Sorted: [], Script: [], Address: [] });
    const f = /^\* (List|Sorted|Script|Address):?\s*$/.exec(l);
    if (f) field = f[1] as keyof V67;
    const v = /^\*\* (\S+)$/.exec(l);
    if (v && field && vectors.length) (vectors.at(-1)![field] as string[]).push(v[1]);
  }
}

describe("BIP 67 test vectors", () => {
  it("finds four vectors, each requiring two signatures", () => {
    expect(vectors.map((v) => v.name)).toEqual(["Vector 1", "Vector 2", "Vector 3", "Vector 4"]);
    expect(b67.join("\n")).toContain("Two signatures are required in each of these test vectors.");
  });
  for (const v of vectors) {
    it(`${v.name}: sorts the list, builds the script and derives the address`, () => {
      const r = bip67Multisig(2, v.List);
      expect(r.sorted).toEqual(v.Sorted);
      expect(r.scriptHex).toBe(v.Script[0]);
      expect(r.address).toBe(v.Address[0]);
    });
  }
  it("the specification's worked example is vector 4's key set", () => {
    const keys = b67.slice(34, 37).map((l) => l.trim());
    expect(keys).toEqual(vectors[3].List);
    expect(b67[50].trim()).toBe(vectors[3].Address[0]);
  });
});

describe("why sorting matters", () => {
  const v4 = vectors[3];
  it("the six orders of three keys give six different scripts and addresses", () => {
    const orders = permutations(v4.List);
    expect(orders).toHaveLength(6);
    const addresses = orders.map((o) => p2shAddress(multisigScript(2, o)).address);
    expect(new Set(addresses).size).toBe(6);
    expect(addresses).toContain(v4.Address[0]);
    // Sorting first makes every order agree.
    for (const o of orders) expect(bip67Multisig(2, o).address).toBe(v4.Address[0]);
  });
  it("compares bytes left to right: vector 3's keys differ first in their prefix or their last byte", () => {
    const s = vectors[2].Sorted;
    expect(s.slice(1).map((k, i) => firstDifference(s[i], k))).toEqual([32, 0, 32]);
  });
  it("refuses uncompressed keys rather than compressing them", () => {
    const uncompressed = "04" + "11".repeat(64);
    expect(() => checkCompressedKey(uncompressed)).toThrow(Bip67Error);
    expect(() => sortKeys([vectors[0].List[0], uncompressed])).toThrow(/Uncompressed/);
  });
  it("counts as many as 2(n!) scripts for n keys in either encoding", () => {
    const n = 3;
    expect(2 * permutations([1, 2, 3]).length).toBe(2 * [1, 2, 3].reduce((a, b) => a * b, 1));
    expect(2 * permutations(Array.from({ length: n }, (_, i) => i)).length).toBe(12);
  });
});

/** BIP 48's examples table: network, account, script, chain, address and path per row. */
const b48 = pinned("bip-0048.mediawiki");
const start = b48.findIndex((l) => l === "==Examples==");
const cells = b48.slice(start).slice(0, b48.slice(start).findIndex((l) => l === "|}")).filter((l) => l.startsWith("|") && l !== "|-" && l !== "{|").map((l) => l.slice(1).trim());
const rows = Array.from({ length: cells.length / 6 }, (_, i) => cells.slice(i * 6, i * 6 + 6)).slice(1);

describe("BIP 48 examples", () => {
  it("reproduces every published path", () => {
    expect(rows).toHaveLength(15);
    const ord = { first: 0, second: 1 } as const;
    for (const [network, account, script, chain, address, path] of rows) {
      const p: Bip48Params = { network: network as Bip48Params["network"], account: ord[account as keyof typeof ord], script: script as Bip48Params["script"], change: chain === "external" ? 0 : 1, index: ord[address as keyof typeof ord] };
      expect(bip48Path(p), path).toBe(path.replace(/\s/g, ""));
    }
  });
  it("hardens the first four levels and not the last two", () => {
    const levels = bip48Levels({ network: "mainnet", account: 0, script: "p2wsh", change: 0, index: 0 });
    expect(levels.map((l) => l.hardened)).toEqual([true, true, true, true, false, false]);
    expect(() => bip48Levels({ network: "mainnet", account: 0, script: "p2tr" as never, change: 0, index: 0 })).toThrow();
  });
});
