import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { popCallback, popRule, readBitcoinUri } from "../src/bip321";

const root = new URL("../../../", import.meta.url);
const snapshot = new URL("sources/research-2026-11-08-phase4/", root);
const lock = JSON.parse(readFileSync(new URL("sources.lock.json", snapshot), "utf8"));
const pinned = (path: string) => {
  const bytes = readFileSync(new URL(`raw/${path}`, snapshot));
  expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(lock.files.find((f: { path: string }) => f.path === path).sha256);
  return bytes.toString("utf8").split("\n");
};
const lines = pinned("bip-0321.mediawiki");
const at = (heading: string) => lines.findIndex((l) => l === heading);
const uriLines = (from: number, to: number) =>
  lines.slice(from, to).flatMap((l, i) => (/^ (bitcoin|BITCOIN):/.test(l) ? [{ uri: l.trim(), line: from + i + 1, note: lines[from + i - 1] }] : []));

const valid = uriLines(at("==== URIs ===="), at("==== Invalid URIs ===="));
const invalid = uriLines(at("==== Invalid URIs ===="), at("==== Proof of Payment ===="));

describe("BIP 321 examples", () => {
  it("finds the published examples", () => {
    expect(valid).toHaveLength(16);
    expect(invalid).toHaveLength(5);
  });
  it("reads every example as the BIP labels it", () => {
    for (const e of valid) {
      const expected = !/thus invalid/.test(e.note);
      expect(readBitcoinUri(e.uri).valid, `L${e.line} ${e.uri}`).toBe(expected);
    }
    for (const e of invalid) expect(readBitcoinUri(e.uri).valid, `L${e.line} ${e.uri}`).toBe(false);
  });
  it("gives the reason each invalid example states", () => {
    const reasons = invalid.map((e) => readBitcoinUri(e.uri).reason);
    expect(reasons[0]).toMatch(/label appears more than once/);
    expect(reasons[1]).toMatch(/amount appears more than once/);
    expect(reasons[2]).toMatch(/amount appears more than once/);
    expect(reasons[3]).toMatch(/pop appears more than once, counting req-pop/);
    expect(reasons[4]).toMatch(/A tb address is under the key bc/);
    expect(readBitcoinUri(valid.find((e) => /thus invalid/.test(e.note))!.uri).reason).toMatch(/req-somethingyoudontunderstand/);
  });
  it("percent-decodes values and treats keys and the scheme case-insensitively", () => {
    const m = readBitcoinUri(valid[3].uri);
    expect(m.params.map((p) => [p.key, p.value])).toEqual([["amount", "50"], ["label", "Luke-Jr"], ["message", "Donation for project xyz"]]);
    const upper = readBitcoinUri(valid.find((e) => e.uri.startsWith("BITCOIN:BC1Q"))!.uri);
    expect(upper.valid).toBe(true);
    expect(upper.params[0].key).toBe("bc");
    expect(upper.instructions.map((i) => i.key)).toEqual(["onchain", "bc"]);
  });
  it("allows an empty body only when a payment instruction is given", () => {
    expect(readBitcoinUri("bitcoin:?lightning=lnbc420bogusinvoice").instructions.map((i) => i.key)).toEqual(["lightning"]);
    expect(readBitcoinUri("bitcoin:?label=Luke-Jr").reason).toMatch(/empty and no payment instruction/);
    expect(readBitcoinUri("bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?amount=50,000.00").reason).toMatch(/decimal BTC/);
  });
});

describe("what a wallet that implements fewer keys does", () => {
  const onchainOnly = ["amount", "label", "message", "bc", "tb"];
  it("ignores unknown optional keys and pays the body address", () => {
    const r = readBitcoinUri(valid.find((e) => e.uri.includes("lightning=") && e.uri.includes("175t"))!.uri, onchainOnly);
    expect([r.valid, r.instructions.map((i) => i.key), r.ignored]).toEqual([true, ["onchain"], ["lightning=lnbc420bogusinvoice"]]);
  });
  it("has nothing to pay with when the only instruction is one it does not implement", () => {
    const r = readBitcoinUri("bitcoin:?sp=sp1qsilentpayment", onchainOnly);
    expect([r.valid, r.instructions]).toEqual([true, []]);
  });
  it("refuses a URI with a req- key it does not implement", () => {
    expect(readBitcoinUri("bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?req-pop=initiatingapp%3a", onchainOnly).valid).toBe(false);
  });
});

describe("proof of payment examples", () => {
  const start = at("==== Proof of Payment ====");
  const block = lines.slice(start);
  const uriAfter = (i: number) => block[i + 1].trim();
  it("builds each published callback", () => {
    const cases: Array<[string, string, string]> = [];
    for (const [i, l] of block.entries()) {
      if (l !== "If the original URI is") continue;
      const uri = uriAfter(i);
      for (let j = i + 2; j < block.length && block[j] !== "If the original URI is"; j++) {
        const cb = /^ ([a-z]+:\S*)=\$(\S+)$/.exec(block[j]);
        if (cb) cases.push([uri, block[j].trim(), block[j - 1]]);
      }
    }
    expect(cases).toHaveLength(4);
    for (const [uri, callback, how] of cases) {
      const r = readBitcoinUri(uri);
      const key = /lightning/.test(how) || callback.includes("lightning=") ? "lightning" : "onchain";
      const info = callback.slice(callback.lastIndexOf("$"));
      expect(popCallback(r, key, info), uri).toBe(callback);
    }
  });
  it("pays but opens nothing for an https pop, and refuses to pay for an https req-pop", () => {
    const soft = popRule(readBitcoinUri(block[block.findIndex((l) => l.includes("pop=https%3aiwantyouripaddress.com"))].trim()));
    expect([soft.mayOpen, soft.mayPay]).toEqual([false, true]);
    const hard = popRule(readBitcoinUri(block[block.findIndex((l) => l.includes("req-pop=https%3aevilwebsite.com"))].trim()));
    expect([hard.mayOpen, hard.mayPay]).toEqual([false, false]);
  });
});
