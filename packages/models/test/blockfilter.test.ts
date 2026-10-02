import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes } from "../src/hex";
import {
  BASIC_M, BASIC_P, BitReader, BitWriter, blockHash, buildBasicFilter, decodeFilter, filterHeader, filterKey,
  expectedFalsePositives, golombBits, golombDecode, golombEncode, matchFilter, siphash24,
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

  it("block 926,485 needs duplicates collapsed: 9 elements, not 17", () => {
    const r = rows.find((x) => x[0] === 926485)!;
    const f = buildBasicFilter(r[1], r[2], r[3], r[4]);
    expect(f.N).toBe(9);
    const raw = f.views.filter((v) => v.included || v.reason?.startsWith("duplicate")).length;
    expect(raw).toBe(17);
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

describe("block-filters chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/block-filters.json", root), "utf8");
  const b157 = readFileSync(new URL(raw + "bip-0157.mediawiki", root), "utf8").split("\n");
  const build = (h: number) => { const r = rows.find((x) => x[0] === h)!; return buildBasicFilter(r[1], r[2], r[3], r[4]); };

  it("dates and protocol constants", () => {
    expect(b157[9]).toContain("Assigned: 2017-05-24");
    expect(b158[8]).toContain("Assigned: 2017-05-24");
    expect(text).toContain("both assigned in 2017 and recorded as Deployed");
    expect(b157[43]).toContain("80-bytes");
    expect(text).toContain("the block headers, 80 bytes each");
    expect(text).toContain("P MUST be 19 and M MUST be 784931");
    expect(b158[292]).toContain("M=1.497137 * 2^P");
    expect(text).toContain("M ≈ 1.497137·2^P");
    expect(b157[169]).toContain("strictly less than 1000");
    expect(b157[233]).toContain("strictly less than 2,000");
    expect(text).toContain("at most 1,000 blocks of filters, or 2,000 filter headers");
    expect(b157[377]).toContain("intervals of 1,000");
    expect(text).toContain("the filter header at every 1,000th block");
    expect(text).toContain("the first 16 bytes of the block’s hash");
  });

  it("false-positive arithmetic", () => {
    const p = 1 / Number(BASIC_M);
    expect(Math.round(p * 1e7) / 10).toBe(1.3);
    expect(text).toContain("probability 1/784931, about 1.3 in a million");
    expect(Math.round(expectedFalsePositives(100 * 10_000) * 10) / 10).toBe(1.3);
    expect(text).toContain("100 scripts checked against 10,000 blocks give an expected 1.3 false matches");
  });

  it("sizes from the vectors", () => {
    expect(BASIC_P + 1).toBe(20);
    expect(text).toContain("20 per item for the basic filter");
    const a = build(180480), b = build(926485);
    expect([a.N, a.filter.length, b.N, b.filter.length]).toEqual([13, 35, 9, 25]);
    expect(text).toContain("block 180,480’s filter holds 13 scripts in 35 bytes and block 926,485’s holds 9 in 25");
    expect(Math.round(((a.filter.length - 1) * 8) / a.N)).toBe(21);
    expect(Math.round(((b.filter.length - 1) * 8) / b.N)).toBe(21);
    expect(text).toContain("about 21 bits per item, close to that floor, against 24 and 23 bits");
    expect(Math.ceil(Math.log2(13 * 784931))).toBe(24);
    expect(Math.ceil(Math.log2(9 * 784931))).toBe(23);
    expect(rows.find((r) => r[7] === "Empty data")![5]).toBe("00");
    expect(text).toContain("whose filter is the single byte 00");
  });

  it("figure facts", () => {
    const fx = JSON.parse(readFileSync(new URL("fixtures/block-filters.json", root), "utf8")).fixtures;
    expect(fx.filter((f: { kind: string }) => f.kind === "bf-block").length).toBe(6);
    expect(text).toContain("Six of BIP 158’s testnet blocks");
    expect(build(0).header).toBe(rows[0][6]);
  });
});
