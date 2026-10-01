import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PsbtError,
  combinePsbts,
  extractTransaction,
  nonWitnessUtxoMatches,
  parsePsbt,
  parseTypeRegistry,
  serializePsbt,
} from "../src";

const root = new URL("../../../", import.meta.url);
const raw = (path: string) => readFileSync(new URL(`sources/research-2026-10-01/raw/${path}`, root), "utf8");
const lines = raw("bip-0174.mediawiki").split("\n");

/** Hex on a "Bytes in Hex: <pre>…</pre>" line. */
const hexAt = (line: number) => {
  const m = /Bytes in Hex: <pre>([0-9a-f]+)<\/pre>/.exec(lines[line - 1]);
  if (!m) throw new Error(`No hex on BIP174 line ${line}`);
  return m[1];
};

function casesBetween(from: number, to: number) {
  const out: Array<{ line: number; name: string; hex: string }> = [];
  for (let n = from; n <= to; n++) {
    const m = /^\* Case: (.+)$/.exec(lines[n - 1]);
    if (m) out.push({ line: n, name: m[1], hex: hexAt(n + 1) });
  }
  return out;
}

const invalid = casesBetween(616, 697);
const valid = casesBetween(698, 739);
const signerFailures = casesBetween(740, 757);

/** The published role trace (BIP174 lines 763–833). */
export const TRACE = [
  { role: "Creator", line: 774 },
  { role: "Updater", line: 797 },
  { role: "Updater (sighash type)", line: 802 },
  { role: "Signer A", line: 810 },
  { role: "Signer B", line: 818 },
  { role: "Combiner", line: 823 },
  { role: "Input Finalizer", line: 828 },
] as const;

describe("BIP174 test vectors", () => {
  it("finds every listed case", () => {
    expect([invalid.length, valid.length, signerFailures.length]).toEqual([20, 10, 4]);
  });

  for (const c of invalid) {
    it(`rejects line ${c.line}: ${c.name}`, () => {
      expect(() => parsePsbt(c.hex)).toThrow(PsbtError);
    });
  }

  for (const c of [...valid, ...signerFailures]) {
    it(`parses line ${c.line}: ${c.name}`, () => {
      const p = parsePsbt(c.hex);
      // Round trip through our serializer keeps every record, unknown ones included.
      const again = parsePsbt(serializePsbt(p));
      const keys = (q: typeof p) => [q.global, ...q.inputs, ...q.outputs].map((m) => m.map((r) => r.keyHex + r.valueHex).sort());
      expect(keys(again)).toEqual(keys(p));
    });
  }
});

describe("published role trace", () => {
  const states = TRACE.map((s) => ({ ...s, psbt: parsePsbt(hexAt(s.line)) }));

  it("parses every state", () => {
    expect(states).toHaveLength(7);
  });

  it("only adds data until the finalizer", () => {
    for (let i = 1; i < 6; i++) {
      const before = new Set([states[i - 1].psbt.global, ...states[i - 1].psbt.inputs, ...states[i - 1].psbt.outputs].flat().map((r) => r.keyHex + r.valueHex));
      const after = new Set([states[i].psbt.global, ...states[i].psbt.inputs, ...states[i].psbt.outputs].flat().map((r) => r.keyHex + r.valueHex));
      if (states[i].role === "Signer B") continue; // B signs the updated PSBT, not A's output
      for (const k of before) expect(after.has(k), `${states[i].role} kept ${k.slice(0, 20)}`).toBe(true);
    }
  });

  it("combines the two signers' PSBTs into the published combiner output, in either order", () => {
    const a = states[3].psbt;
    const b = states[4].psbt;
    expect(serializePsbt(combinePsbts([a, b]))).toBe(hexAt(823));
    expect(serializePsbt(combinePsbts([b, a]))).toBe(hexAt(823));
  });

  it("checks the non-witness UTXO against the prevout txid", () => {
    expect(nonWitnessUtxoMatches(states[1].psbt, 0)).toBe(true);
  });

  it("keeps only UTXOs, unknown fields and final scripts after finalizing", () => {
    for (const input of states[6].psbt.inputs) {
      expect(input.every((r) => [0x00, 0x01, 0x07, 0x08].includes(r.keyType))).toBe(true);
      expect(input.some((r) => r.keyType === 0x07 || r.keyType === 0x08)).toBe(true);
    }
  });

  it("extracts the published network transaction", () => {
    expect(extractTransaction(states[6].psbt)).toBe(hexAt(833));
  });

  it("refuses to extract before finalization", () => {
    expect(() => extractTransaction(states[5].psbt)).toThrow(/finalized/);
  });
});

describe("combining", () => {
  it("preserves unknown key-value pairs (lines 836–844)", () => {
    const combined = combinePsbts([parsePsbt(hexAt(836)), parsePsbt(hexAt(839))]);
    expect(serializePsbt(combined)).toBe(hexAt(844));
    const known = new Set([0x00, 0x01, 0xfb]);
    expect(combined.global.some((r) => !known.has(r.keyType))).toBe(true);
  });

  it("matches the second combiner vector (lines 849–857)", () => {
    expect(serializePsbt(combinePsbts([parsePsbt(hexAt(849)), parsePsbt(hexAt(852))]))).toBe(hexAt(857));
  });

  it("refuses to combine PSBTs for different transactions", () => {
    expect(() => combinePsbts([parsePsbt(hexAt(774)), parsePsbt(hexAt(836))])).toThrow(/different transactions/);
  });
});

describe("type registry", () => {
  const registry = parseTypeRegistry(raw("bip-0174/type-registry.mediawiki"));

  it("attributes every type listed in BIP174's own tables to BIP174", () => {
    const own = lines.flatMap((l) => {
      const m = /^\| <tt>(PSBT_[A-Z0-9_]+) = 0x([0-9A-Fa-f]+)<\/tt>/.exec(l);
      return m ? [m[1]] : [];
    });
    expect(own.length).toBeGreaterThanOrEqual(20);
    for (const constant of own) {
      const entry = registry.find((r) => r.constant === constant);
      expect(entry, constant).toBeDefined();
      expect(entry!.parentBip, constant).toBe(174);
    }
  });

  it("attributes Taproot and version 2 fields elsewhere", () => {
    const tap = registry.filter((r) => r.constant.includes("TAP"));
    expect(tap.length).toBeGreaterThan(0);
    expect(tap.every((r) => r.parentBip !== 174)).toBe(true);
    expect(registry.find((r) => r.constant === "PSBT_GLOBAL_TX_VERSION")!.parentBip).toBe(370);
  });
});

describe("psbt chapter fixtures", () => {
  const fixtures = JSON.parse(readFileSync(new URL("fixtures/psbt.json", root), "utf8")).fixtures;
  it("copy every PSBT and transaction from its cited line", () => {
    const trace = fixtures.find((f: { id: string }) => f.id === "bip174-trace");
    for (const s of trace.steps) expect(s.hex, s.role).toBe(hexAt(s.line));
    expect(trace.extracted.hex).toBe(hexAt(trace.extracted.line));
    expect(trace.steps.map((s: { line: number }) => s.line)).toEqual(TRACE.map((t) => t.line));
    const pair = fixtures.find((f: { id: string }) => f.id === "unknown-combine");
    for (const p of [...pair.parts, pair.combined]) expect(p.hex).toBe(hexAt(p.line));
  });
});

describe("format rules beyond the published vectors", () => {
  const creator = hexAt(774);
  it("rejects a non-minimally encoded key type", () => {
    // Global map: replace key "01 00" (unsigned tx) with "03 fd 00 00", which also encodes type 0.
    const bad = creator.replace(/^70736274ff0100/, "70736274ff03fd0000");
    expect(() => parsePsbt(bad)).toThrow(/minimally encoded/);
  });

  it("accepts a valid 0-input, 1-output unsigned transaction", () => {
    // version 2 | 0 inputs | 1 output: 0 sats, 1-byte script OP_TRUE | locktime 0
    const tx = "02000000" + "00" + "01" + "0000000000000000" + "0151" + "00000000";
    const len = (tx.length / 2).toString(16).padStart(2, "0");
    const p = parsePsbt(`70736274ff0100${len}${tx}00` + "00");
    expect(p.unsignedTx.outputs).toHaveLength(1);
  });

  it("reports unsigned-transaction errors as PsbtError", () => {
    expect(() => parsePsbt("70736274ff0100020200" + "00")).toThrow(PsbtError);
  });
});
