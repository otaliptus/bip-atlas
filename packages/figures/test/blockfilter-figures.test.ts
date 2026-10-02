import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { BASIC_M, BASIC_P, BitReader, blockOutputScripts, buildBasicFilter, filterKey, golombBits, golombDecode, matchFilter } from "@bip-atlas/models/blockfilter";
import { bytesToHex, hexToBytes } from "@bip-atlas/models/hex";
import { BfBuildStory } from "../src/blockfilters/BfBuildStory";
import { BfChain } from "../src/blockfilters/BfChain";
import { BfDirections } from "../src/blockfilters/BfDirections";
import { BfGolomb } from "../src/blockfilters/BfGolomb";
import { BfPeerStory } from "../src/blockfilters/BfPeerStory";
import { BfQueryStory } from "../src/blockfilters/BfQueryStory";
import { BfSieve } from "../src/blockfilters/BfSieve";
import { BfSize } from "../src/blockfilters/BfSize";
import { GcsFilter } from "../src/blockfilters/GcsFilter";
import { group } from "../src/blockfilters/parts";
import type { BfCode, DerivedBfBlockFixture, DerivedBfChainFixture, DerivedBfGolombFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/block-filters.json", root), "utf8")).fixtures;
const rows: any[][] = JSON.parse(readFileSync(new URL("sources/research-2026-10-01-phase3/raw/bip-0158/testnet-19.json", root), "utf8")).slice(1);
const row = (height: number) => rows.find((r) => r[0] === height)!;
const code = (delta: bigint): BfCode => {
  const g = golombBits(delta, BASIC_P);
  return { delta: delta.toString(), q: Number(g.q), r: g.r.toString(), unary: g.unary, remainder: g.remainder };
};

/** The values deriveBfBlock computes (the build also checks filter, block hash and header against the vector). */
function block(id: string): DerivedBfBlockFixture {
  const f = fixtures.find((x: { id: string }) => x.id === id);
  const [, hash, blk, prev, prevHeader, filter, header, notes] = row(f.height);
  const b = buildBasicFilter(hash, blk, prev, prevHeader);
  expect(bytesToHex(b.filter)).toBe(filter);
  expect(b.header).toBe(header);
  const bitsTotal = b.deltas.reduce((n, d) => n + Number(d >> BigInt(BASIC_P)) + 1 + BASIC_P, 0);
  const own = b.elements.slice(0, 3).map((s) => ({ script: s, from: "this block" }));
  const others = rows
    .filter((x) => x[0] !== f.height)
    .map((x) => ({ height: x[0] as number, elements: buildBasicFilter(x[1], x[2], x[3], x[4]).elements }))
    .sort((a, c) => c.elements.length - a.elements.length)
    .map((x) => ({ script: x.elements.find((e: string) => !b.elements.includes(e)), from: `block ${x.height}` }))
    .filter((p): p is { script: string; from: string } => !!p.script)
    .slice(0, 3);
  const probes = [...own, ...others].map((p) => {
    const m = matchFilter(b.filter, hexToBytes(p.script), b.key);
    return { ...p, matched: m.matched, target: m.target.toString(), steps: m.steps.map((s) => ({ value: s.value.toString(), outcome: s.outcome })) };
  });
  return {
    ...f,
    derived: {
      height: f.height, hash, notes, txCount: blockOutputScripts(blk).txCount, N: b.N, F: b.F.toString(),
      filterHex: bytesToHex(b.filter), filterBytes: b.filter.length, elements: b.views,
      values: b.values.map(String), codes: b.deltas.slice(0, 6).map(code), bitsTotal, paddingBits: b.compressed.length * 8 - bitsTotal,
      probes, filterHash: b.filterHash, prevHeader, header: b.header,
    },
  };
}
function golomb(): DerivedBfGolombFixture {
  const f = fixtures.find((x: { id: string }) => x.id === "bf-golomb");
  const table = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
    const g = golombBits(BigInt(n), 2);
    return { n, q: Number(g.q), r: Number(g.r), code: `${g.unary} ${g.remainder}` };
  });
  const [, hash, blk, prev, prevHeader] = row(f.exampleHeight);
  const b = buildBasicFilter(hash, blk, prev, prevHeader);
  expect(golombDecode(new BitReader(b.compressed), BASIC_P)).toBe(b.deltas[0]);
  return { ...f, derived: { table, example: { height: f.exampleHeight, value: b.values[0].toString(), F: b.F.toString(), code: code(b.deltas[0]) } } };
}
function chain(): DerivedBfChainFixture {
  const f = fixtures.find((x: { id: string }) => x.id === "bf-chain");
  return {
    ...f,
    derived: {
      rows: f.heights.map((ht: number, i: number) => {
        const [, hash, blk, prev, prevHeader] = row(ht);
        const b = buildBasicFilter(hash, blk, prev, prevHeader);
        return { height: ht, hash, filterHex: bytesToHex(b.filter), filterHash: b.filterHash, prevHeader, header: b.header, linksToPrevious: i === 0 ? true : null };
      }),
    },
  };
}
const html = (n: VNode<any>) => render(n);
const b926 = block("bf-block-926485"), b1263 = block("bf-block-1263442"), b180 = block("bf-block-180480");

describe("block-filter figures", () => {
  it("A16.1 draws the published filter of block 926,485 byte by byte", () => {
    const s = html(h(BfDirections, { fixture: b926 }));
    expect(b926.derived.filterBytes).toBe(25);
    expect(s).toContain("FILTER OF BLOCK 926,485 · 25 B");
    expect(s.split("k-cell k-fill--net").length - 1).toBe(25);
  });

  it("A16.2 sieves 18 scripts into 9 and gives every script in full", () => {
    const s = html(h(BfSieve, { fixture: b926 }));
    expect(b926.derived.elements.length).toBe(18);
    expect(b926.derived.N).toBe(9);
    expect(s.split('data-included="false"').length - 1).toBe(9);
    expect(s).toContain("OP_RETURN");
    expect(s.split(">REPEAT<").length - 1).toBe(8);
    const details = s.slice(s.indexOf("<details"));
    for (const e of b926.derived.elements) if (e.script) expect(details).toContain(e.script);
  });

  it("A16.3 draws BIP 158's P = 2 table and the first P = 19 code from the model", () => {
    const g = golomb();
    const s = html(h(BfGolomb, { fixture: g }));
    expect(g.derived.example.code.delta).toBe("570774");
    expect(s).toContain("q = 1, r = 46,486");
    expect(s).toContain("21 BITS · FIXED WIDTH BELOW F = 2,354,793 TAKES 22");
    expect(s).toContain("9 is 110 01");
  });

  it("A16.4 builds block 1,263,442's filter step by step, with exact values disclosed", () => {
    const s = html(h(BfBuildStory, { fixture: b1263 }));
    const d = b1263.derived;
    expect(d.N).toBe(3);
    expect(s).toContain(`F = N · M = 3 × ${group(BASIC_M.toString())}`);
    for (const v of d.values) expect(s).toContain(group(v));
    for (const c of d.codes) expect(s).toContain(`GAP ${group(c.delta)}`);
    expect(s).toContain(`${d.bitsTotal} CODE BITS + ${d.paddingBits} PADDING`);
    const details = s.slice(s.indexOf("<details"));
    expect(details).toContain(bytesToHex(filterKey(d.hash)));
    expect(details).toContain(d.filterHex);
  });

  it("A16.5 compares the floor, the filter and fixed width for two blocks", () => {
    const s = html(h(BfSize, { fixtures: [b180, b926] }));
    expect(s).toContain("FLOOR 260");
    expect(s).toContain("CODED 272 · 20.9/EL");
    expect(s).toContain("FIXED 312 · 24/EL");
    expect(s).toContain("FLOOR 180");
    expect(s).toContain("CODED 192 · 21.3/EL");
    expect(s).toContain("FIXED 207 · 23/EL");
  });

  it("A16.7 shows a match, a miss, and the model's false-positive arithmetic", () => {
    const s = html(h(BfQueryStory, { fixture: b926 }));
    expect(s).toContain("1/784,931");
    expect(s).toContain("≈ 1.3 FALSE MATCHES");
    expect(s).toContain("FETCH BLOCK");
    expect(s).toContain("SKIP BLOCK");
  });

  it("A16.8 links the headers and discloses every hash", () => {
    const c = chain();
    const s = html(h(BfChain, { fixture: c }));
    expect(s).toContain("BLOCK 1 IS NOT IN THE VECTORS");
    for (const r of c.derived.rows) {
      expect(s).toContain(`${r.header.slice(0, 8)}…`);
      expect(s.slice(s.indexOf("<details"))).toContain(r.header);
    }
  });

  it("A16.9 is schematic", () => {
    const s = html(h(BfPeerStory, {}));
    expect(s).toContain("Schematic");
    expect(s).not.toMatch(/[0-9a-f]{32}/);
  });
});

describe("block-filter hero", () => {
  const fx = ["bf-block-926485", "bf-block-1263442", "bf-block-180480", "bf-block-49291", "bf-block-987876", "bf-block-1414221"].map(block);
  it("renders the no-JS state: first block, first script, its bits", () => {
    const s = html(h(GcsFilter, { fixtures: fx, figureId: "fig-a16-6" }));
    const d = fx[0].derived, p = d.probes[0];
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain(`A script from this block hashes to ${group(p.target)}`);
    expect(s).toContain("a match, so the block may concern this script");
    expect(s).toContain(`THE FILTER'S FIRST BITS · ${d.filterBytes} BYTES IN ALL`);
    expect(s.slice(s.indexOf("<details"))).toContain(d.filterHex);
  });
  it("hatches the values the client never decodes", () => {
    const s = html(h(GcsFilter, { fixtures: fx, figureId: "fig-a16-6" }));
    const read = fx[0].derived.probes[0].steps.length;
    // two compositions
    expect(s.split('data-decoded="true"').length - 1).toBe(2 * read);
    expect(s.split('data-decoded="false"').length - 1).toBe(2 * (fx[0].derived.N - read));
  });
  it("says 'all values are below it' when decoding runs out, not 'passes it'", () => {
    const f987 = fx.find((f) => f.derived.height === 987876)!;
    const p = f987.derived.probes.find((q) => q.from !== "this block" && q.steps.at(-1)?.outcome === "less");
    expect(p).toBeDefined();
    const s = html(h(GcsFilter, { fixtures: [f987, ...fx.filter((f) => f !== f987)], figureId: "x" }));
    expect(s).not.toContain("passes it");
    const empty = html(h(GcsFilter, { fixtures: [fx.find((f) => f.derived.N === 0)!], figureId: "y" }));
    expect(empty).toContain("N = 0: nothing can match");
    expect(empty).not.toContain("hashes to");
  });
  it("every foreign script misses and every own script matches", () => {
    for (const f of fx) for (const p of f.derived.probes) expect(p.matched).toBe(p.from === "this block");
  });
});

describe("block-filter captions", () => {
  const text = readFileSync(new URL("content/chapters/block-filters.json", root), "utf8");
  it("states only model numbers", () => {
    expect(text).toContain("here the 25-byte filter of testnet block 926,485");
    expect(text).toContain("Testnet block 926,485 touches 18 scripts");
    expect(text).toContain("9 distinct scripts remain");
    expect(text).toContain("built from its three scripts");
    expect([b926.derived.filterBytes, b926.derived.elements.length, b926.derived.N, b1263.derived.N]).toEqual([25, 18, 9, 3]);
  });
});
