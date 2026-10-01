import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes } from "../src/hex";
import {
  BASIC_M, BASIC_P, BitReader, BitWriter, blockHash, buildBasicFilter, decodeFilter, filterHeader, filterKey,
  golombBits, golombDecode, golombEncode, matchFilter, siphash24,
} from "../src/blockfilter";

const root = new URL("../../../", import.meta.url);
const raw = "sources/research-2026-10-01-phase3/raw/";
// [height, block hash, block, prev output scripts, previous basic header, basic filter, basic header, notes]
const rows: any[][] = JSON.parse(readFileSync(new URL(raw + "bip-0158/testnet-19.json", root), "utf8")).slice(1);
const b158 = readFileSync(new URL(raw + "bip-0158.mediawiki", root), "utf8").split("\n");
const scriptsOf = (s: string[]): string[] => s;

describe("BIP 158 basic filter vectors", () => {
  it("has ten blocks", () => expect(rows.length).toBe(10));
  for (const [height, hash, block, prev, prevHeader, filter, header, notes] of rows) {
    it(`block ${height}${notes ? ` (${notes})` : ""}`, () => {
      expect(blockHash(block)).toBe(hash);
      const f = buildBasicFilter(hash, block, scriptsOf(prev), prevHeader);
      expect(bytesToHex(f.filter)).toBe(filter);
      expect(f.header).toBe(header);
      expect(filterHeader(hexToBytes(filter), prevHeader).header).toBe(header);
      // every element matches its own filter
      for (const e of f.elements) expect(matchFilter(f.filter, hexToBytes(e), f.key).matched).toBe(true);
      expect(decodeFilter(f.filter)).toEqual(f.values);
    });
  }

  it("consecutive vectors chain their headers", () => {
    const byHeight = new Map(rows.map((r) => [r[0] as number, r]));
    expect(byHeight.get(3)![4]).toBe(byHeight.get(2)![6]);
    expect(rows[0][4]).toBe("0".repeat(64));
  });
});

describe("Golomb-Rice coding", () => {
  it("reproduces BIP 158's P = 2 table", () => {
    const table = b158.slice(139, 158).filter((l) => l.startsWith("| ")).map((l) => {
      const m = l.match(/^\| (\d+) \|\| \((\d+), (\d+)\) \|\| <code>([01]+) ([01]+)<\/code>/)!;
      return { n: BigInt(m[1]), q: BigInt(m[2]), r: BigInt(m[3]), unary: m[4], rem: m[5] };
    });
    expect(table.length).toBe(10);
    for (const t of table) {
      const g = golombBits(t.n, 2);
      expect([g.q, g.r, g.unary, g.remainder]).toEqual([t.q, t.r, t.unary, t.rem]);
    }
  });

  it("encodes and decodes round trip", () => {
    const xs = [0n, 1n, 524287n, 524288n, 1048577n, 3n * 524288n + 17n];
    const w = new BitWriter();
    for (const x of xs) golombEncode(w, x, BASIC_P);
    const r = new BitReader(w.bytes());
    expect(xs.map(() => golombDecode(r, BASIC_P))).toEqual(xs);
  });
});

describe("hashing and parameters", () => {
  it("SipHash-2-4 matches the reference test vector", () => {
    // Aumasson & Bernstein, SipHash paper Appendix A: key 00..0f, message 00..0e -> a129ca6149be45e5
    const key = Uint8Array.from({ length: 16 }, (_, i) => i);
    const msg = Uint8Array.from({ length: 15 }, (_, i) => i);
    expect(siphash24(key, msg).toString(16)).toBe("a129ca6149be45e5");
  });

  it("basic filter parameters P = 19, M = 784931 as the BIP states", () => {
    expect(b158[263]).toContain("M = 784931");
    expect(b158[264]).toContain("P = 19");
    expect([BASIC_P, BASIC_M]).toEqual([19, 784931n]);
  });

  it("the key is the first 16 bytes of the block hash in little-endian order", () => {
    const h = rows[0][1];
    expect(bytesToHex(filterKey(h))).toBe(h.match(/../g)!.reverse().join("").slice(0, 32));
  });

  it("an empty filter is one zero byte", () => {
    const empty = rows.find((r) => r[7] === "Empty data")!;
    expect(empty[5]).toBe("00");
  });

  it("a non-member is not found and the search stops early", () => {
    const [, hash, block, prev, prevHeader] = rows.find((r) => r[0] === 926485)!;
    const f = buildBasicFilter(hash, block, scriptsOf(prev), prevHeader);
    const other = buildBasicFilter(rows[8][1], rows[8][2], scriptsOf(rows[8][3]), rows[8][4]);
    const probe = other.elements.find((e) => !f.elements.includes(e))!;
    const m = matchFilter(f.filter, hexToBytes(probe), f.key);
    expect(m.matched).toBe(false);
    expect(m.steps.length).toBeLessThanOrEqual(f.N);
  });
});
