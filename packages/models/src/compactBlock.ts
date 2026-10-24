import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "./hex";
import { siphash24 } from "./blockfilter";

export class CompactBlockError extends Error {}

export interface CompactResolvedTransaction {
  txHex: string;
  txidHex: string;
  wtxidHex: string;
}

export interface CompactFixture {
  headerHex: string;
  nonceHex: string;
  transactions: Array<{ id: string; ref: string; prefilled: boolean }>;
  available: string[];
  collision?: { mode: "injected"; shortIdOf: string; alsoMatches: string };
}

const compactSize = (value: number): number[] => {
  if (!Number.isInteger(value) || value < 0) throw new CompactBlockError("CompactSize needs a non-negative integer.");
  if (value < 0xfd) return [value];
  if (value <= 0xffff) return [0xfd, value & 255, value >>> 8];
  if (value <= 0xffffffff) return [0xfe, value & 255, (value >>> 8) & 255, (value >>> 16) & 255, value >>> 24];
  throw new CompactBlockError("CompactSize above 2^32 is out of scope.");
};

const le48 = (value: bigint): string => {
  const bytes = Array.from({ length: 6 }, (_, index) => Number((value >> BigInt(index * 8)) & 0xffn));
  return bytesToHex(Uint8Array.from(bytes));
};

export function compactShortId(headerHex: string, nonceHex: string, transactionIdHex: string): string {
  const header = hexToBytes(headerHex);
  const nonce = hexToBytes(nonceHex);
  const transactionId = hexToBytes(transactionIdHex);
  if (header.length !== 80) throw new CompactBlockError("A block header must be 80 bytes.");
  if (nonce.length !== 8) throw new CompactBlockError("A compact-block nonce must be 8 bytes.");
  if (transactionId.length !== 32) throw new CompactBlockError("A transaction identifier must be 32 bytes.");
  const key = sha256(Uint8Array.from([...header, ...nonce])).slice(0, 16);
  return le48(siphash24(key, transactionId) & 0xffffffffffffn);
}

export function differentialIndexes(indexes: number[]): number[] {
  const out: number[] = [];
  let previous = -1;
  for (const index of indexes) {
    if (!Number.isInteger(index) || index <= previous) throw new CompactBlockError("Indexes must be strictly increasing and non-negative.");
    out.push(index - previous - 1);
    previous = index;
  }
  return out;
}

export function expandDifferentialIndexes(deltas: number[]): number[] {
  const out: number[] = [];
  let previous = -1;
  for (const delta of deltas) {
    if (!Number.isInteger(delta) || delta < 0) throw new CompactBlockError("Differential indexes must be non-negative integers.");
    const next = previous + delta + 1;
    out.push(next);
    previous = next;
  }
  return out;
}

export interface CompactTrace {
  version: 1 | 2;
  shortIds: Array<{ id: string; hex: string }>;
  localMatches: Array<{ id: string; match: string | null; ambiguous: boolean }>;
  missing: Array<{ index: number; id: string }>;
  differential: number[];
  reconstructed: string[] | null;
  fallback: boolean;
  reason: string;
  fullBlockBytes: number;
  compactBlockBytes: number;
  prefilledBytes: number;
  bestRtt: string;
  collision: boolean;
}

export function reconstructCompactBlock(fixture: CompactFixture, references: Record<string, CompactResolvedTransaction>, version: 1 | 2 = 2): CompactTrace {
  const byRef = new Map(fixture.transactions.map((item) => [item.ref, references[item.ref]]));
  if ([...byRef.values()].some((value) => !value)) throw new CompactBlockError("A referenced transaction is missing.");
  const byId = new Map(fixture.transactions.map((item) => [item.id, item]));
  if (byId.size !== fixture.transactions.length) throw new CompactBlockError("Teaching-block transaction IDs must be unique.");
  for (const id of fixture.available) if (!byId.has(id)) throw new CompactBlockError(`Available transaction ${id} is not in the teaching block.`);
  const idFor = (item: { ref: string }) => version === 1 ? byRef.get(item.ref)!.txidHex : byRef.get(item.ref)!.wtxidHex;
  const shortIds = fixture.transactions.filter((item) => !item.prefilled).map((item) => ({ id: item.id, hex: compactShortId(fixture.headerHex, fixture.nonceHex, idFor(item)) }));
  const available = fixture.available.map((id) => byId.get(id)!);
  const availableIds = available.map((item) => ({ id: item.id, hex: compactShortId(fixture.headerHex, fixture.nonceHex, idFor(item)) }));
  const shortIdOf = (id: string) => {
    if (fixture.collision?.shortIdOf === id) return shortIds.find((item) => item.id === id)?.hex ?? compactShortId(fixture.headerHex, fixture.nonceHex, idFor(byId.get(id)!));
    return availableIds.find((item) => item.id === id)?.hex ?? shortIds.find((item) => item.id === id)?.hex;
  };
  if (fixture.collision?.mode !== "injected" && fixture.collision) throw new CompactBlockError("Ambiguity must be explicitly labelled as injected.");
  if (fixture.collision && !shortIds.some((item) => item.id === fixture.collision!.shortIdOf)) throw new CompactBlockError("Collision target must be a non-prefilled transaction.");
  if (fixture.collision && (!byId.has(fixture.collision.alsoMatches) || byId.get(fixture.collision.alsoMatches)!.prefilled)) throw new CompactBlockError("Collision counterpart must be a non-prefilled transaction.");
  if (fixture.collision && ![fixture.collision.shortIdOf, fixture.collision.alsoMatches].every((id) => fixture.available.includes(id))) throw new CompactBlockError("Injected ambiguity requires both candidates to be available.");

  const localMatches = fixture.transactions.filter((item) => !item.prefilled).map((item) => {
    const expected = shortIds.find((entry) => entry.id === item.id)!.hex;
    const matches = available.filter((candidate) => {
      const actual = fixture.collision && item.id === fixture.collision.shortIdOf && candidate.id === fixture.collision.alsoMatches ? shortIdOf(fixture.collision.shortIdOf) : shortIdOf(candidate.id);
      return actual === expected;
    });
    return { id: item.id, match: matches.length === 1 ? matches[0].id : null, ambiguous: matches.length > 1 };
  });
  const collision = localMatches.some((match) => match.ambiguous);
  const missing = localMatches.flatMap((match) => match.match || match.ambiguous ? [] : [{ index: fixture.transactions.findIndex((item) => item.id === match.id), id: match.id }]);
  const differential = differentialIndexes(missing.map((item) => item.index));
  const fullBlockBytes = 80 + compactSize(fixture.transactions.length).length + fixture.transactions.reduce((sum, item) => sum + byRef.get(item.ref)!.txHex.length / 2, 0);
  const prefilledEntries = fixture.transactions.map((item, index) => ({ ...item, index })).filter((item) => item.prefilled);
  const prefilledDeltas = differentialIndexes(prefilledEntries.map((item) => item.index));
  const prefilledBytes = prefilledEntries.reduce((sum, item, index) => sum + compactSize(prefilledDeltas[index]).length + byRef.get(item.ref)!.txHex.length / 2, 0);
  const compactBlockBytes = 80 + 8 + compactSize(shortIds.length).length + shortIds.length * 6 + compactSize(prefilledEntries.length).length + prefilledBytes;
  if (collision) {
    return { version, shortIds, localMatches, missing, differential, reconstructed: null, fallback: true, reason: "The fixture injects an ambiguous short-ID match between available transactions. Do not guess; fall back to full-block relay.", fullBlockBytes, compactBlockBytes, prefilledBytes, bestRtt: "full relay", collision: true };
  }
  const reconstructed: string[] = [];
  for (const item of fixture.transactions) {
    if (item.prefilled) reconstructed.push(item.id);
    else {
      const match = localMatches.find((entry) => entry.id === item.id)!;
      reconstructed.push(match.match ?? item.id);
    }
  }
  const bestRtt = missing.length ? "1.5*RTT best case after a missing transaction" : "0.5*RTT best case with local reconstruction";
  return { version, shortIds, localMatches, missing, differential, reconstructed, fallback: false, reason: missing.length ? `${missing.length} full transaction${missing.length === 1 ? "" : "s"} requested by index and inserted in order.` : "Every short ID has one local match; no extra transaction round trip is needed.", fullBlockBytes, compactBlockBytes, prefilledBytes, bestRtt, collision: false };
}
