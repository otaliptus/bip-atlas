import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactShortId, differentialIndexes, expandDifferentialIndexes, reconstructCompactBlock, type CompactFixture, type CompactResolvedTransaction } from "../src/compactBlock";
import { measureTransaction, parseTransaction } from "../src/tx";

const compact: { fixtures: Array<CompactFixture & { id: string }>; syntheticCoinbaseHex: string } = JSON.parse(readFileSync(new URL("../../../fixtures/compact-blocks.json", import.meta.url), "utf8"));
const segwit: { fixtures: Array<{ id: string; txHex: string }> } = JSON.parse(readFileSync(new URL("../../../fixtures/segwit.json", import.meta.url), "utf8"));
const references: Record<string, CompactResolvedTransaction> = { "synthetic-coinbase": resolveTx(compact.syntheticCoinbaseHex) };
for (const fixture of segwit.fixtures) references[fixture.id] = resolveTx(fixture.txHex);
function resolveTx(txHex: string): CompactResolvedTransaction {
  const measures = measureTransaction(parseTransaction(txHex));
  return { txHex, txidHex: measures.txidHex, wtxidHex: measures.wtxidHex };
}

describe("Compact Block short IDs and indexes", () => {
  it("derives independently pinned 48-bit short IDs", () => {
    const fixture = compact.fixtures[0];
    expect(compactShortId(fixture.headerHex, fixture.nonceHex, references["native-p2wpkh"].wtxidHex)).toBe("6b475495271e");
    expect(compactShortId(fixture.headerHex, fixture.nonceHex, references["p2sh-p2wpkh"].wtxidHex)).toBe("5ea0a7d66523");
    expect(compactShortId(fixture.headerHex, fixture.nonceHex, references["synthetic-coinbase"].wtxidHex)).toBe("a002e324bd3b");
    expect(compactShortId(fixture.headerHex, fixture.nonceHex, references["native-p2wpkh"].wtxidHex)).not.toBe(compactShortId(fixture.headerHex, fixture.nonceHex, references["native-p2wpkh"].txidHex));
  });

  it("round-trips differential indexes", () => {
    const indexes = [0, 1, 3, 10, 255];
    const differential = differentialIndexes(indexes);
    expect(differential).toEqual([0, 0, 1, 6, 244]);
    expect(expandDifferentialIndexes(differential)).toEqual(indexes);
    expect(() => differentialIndexes([2, 2])).toThrow("strictly increasing");
  });
});

describe("Synthetic Compact Block reconstruction", () => {
  it("reconstructs locally when every short ID has one match", () => {
    const result = reconstructCompactBlock(compact.fixtures.find((item) => item.id === "compact-all-local")!, references);
    expect(result.fallback).toBe(false);
    expect(result.missing).toEqual([]);
    expect(result.reconstructed).toEqual(["coinbase", "native", "nested"]);
    expect(result.prefilledBytes).toBe(61);
    expect(result.compactBlockBytes).toBeLessThan(result.fullBlockBytes);
  });

  it("requests a missing transaction by index and inserts it in block order", () => {
    const result = reconstructCompactBlock(compact.fixtures.find((item) => item.id === "compact-one-missing")!, references);
    expect(result.fallback).toBe(false);
    expect(result.missing).toEqual([{ index: 1, id: "native" }]);
    expect(result.differential).toEqual([1]);
    expect(result.reconstructed).toEqual(["coinbase", "native", "nested"]);
    expect(result.bestRtt).toContain("1.5*RTT");
  });

  it("falls back instead of guessing through a collision", () => {
    const result = reconstructCompactBlock(compact.fixtures.find((item) => item.id === "compact-collision")!, references);
    expect(result.fallback).toBe(true);
    expect(result.reconstructed).toBeNull();
    expect(result.localMatches).toEqual([
      { id: "native", match: null, ambiguous: true },
      { id: "nested", match: "nested", ambiguous: false },
    ]);
    expect(result.missing).toEqual([]);
    expect(result.differential).toEqual([]);
    expect(result.reason).toContain("injects");
    expect(result.reason).toContain("Do not guess");
  });

  it("changes short IDs between version 1 and version 2", () => {
    const fixture = compact.fixtures[0];
    const v1 = reconstructCompactBlock(fixture, references, 1);
    const v2 = reconstructCompactBlock(fixture, references, 2);
    expect(v1.shortIds[0].hex).not.toBe(v2.shortIds[0].hex);
  });
});
