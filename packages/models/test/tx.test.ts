import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bip143Digest, bytesToHex, legacySerialization, measureTransaction, parseTransaction, weightFor } from "../src";

const root = new URL("../../../", import.meta.url);
const lines = readFileSync(new URL("sources/research-2026-10-01/raw/bip-0143.mediawiki", root), "utf8").split("\n");
const after = (line: number, label: string) => {
  const text = lines[line - 1];
  const at = text.indexOf(label);
  expect(at, `line ${line} should contain ${label}`).toBeGreaterThanOrEqual(0);
  return text.slice(at + label.length).trim();
};

/** The two SIGHASH_ALL witness v0 examples, read straight from the pinned BIP143 text. */
const examples = [
  {
    name: "Native P2WPKH",
    unsigned: after(142, ""),
    signed: after(190, "The serialized signed transaction is:"),
    inputIndex: 1,
    scriptCode: after(180, "scriptCode:"),
    amount: 600000000n, // line 156: "value: 6"
    amountLine: [156, "value: 6"] as const,
    preimage: after(174, "hash preimage:"),
    sighash: after(187, "sigHash:"),
  },
  {
    name: "P2SH-P2WPKH",
    unsigned: after(206, "The following is an unsigned transaction:"),
    signed: after(250, "The serialized signed transaction is:"),
    inputIndex: 0,
    scriptCode: after(240, "scriptCode:"),
    amount: 1000000000n, // line 215: "value: 10"
    amountLine: [215, "value: 10"] as const,
    preimage: after(234, "hash preimage:"),
    sighash: after(247, "sigHash:"),
  },
];

describe("BIP143 SIGHASH_ALL examples", () => {
  for (const ex of examples) {
    describe(ex.name, () => {
      const tx = parseTransaction(ex.signed);

      it("parses and re-serializes the signed transaction byte for byte", () => {
        expect(tx.hasWitness).toBe(true);
        expect(tx.segments.map((s) => s.hex).join("")).toBe(ex.signed);
      });

      it("matches the published unsigned transaction once scriptSigs are emptied", () => {
        const unsigned = tx.segments
          .filter((s) => s.part === "base")
          .map((s) => (s.id.endsWith(".scriptsig") ? "00" : s.hex))
          .join("");
        expect(unsigned).toBe(ex.unsigned);
      });

      it("reads the spent amount from the BIP text, not from the transaction", () => {
        expect(lines[ex.amountLine[0] - 1]).toContain(ex.amountLine[1]);
      });

      it("reproduces the published preimage and sighash", () => {
        const d = bip143Digest(tx, ex.inputIndex, ex.scriptCode, ex.amount);
        expect(d.preimageHex).toBe(ex.preimage);
        expect(d.sighashHex).toBe(ex.sighash);
      });

      it("gives different txid and wtxid, with weight = 3 × base + total", () => {
        const m = measureTransaction(tx);
        expect(m.txidHex).not.toBe(m.wtxidHex);
        expect(m.baseSize).toBe(legacySerialization(tx).length);
        expect(m.totalSize).toBe(ex.signed.length / 2);
        expect(m.weight).toBe(3 * m.baseSize + m.totalSize);
        expect(m.vsize).toBe(Math.ceil(m.weight / 4));
      });
    });
  }

  it("refuses sighash types it does not implement", () => {
    const tx = parseTransaction(examples[0].signed);
    expect(() => bip143Digest(tx, 1, examples[0].scriptCode, examples[0].amount, 3)).toThrow(/SIGHASH_ALL/);
  });

  it("gives an empty (0x00) witness to the non-witness input of the mixed transaction", () => {
    const tx = parseTransaction(examples[0].signed);
    expect(tx.witnesses[0]).toEqual([]);
    expect(tx.segments.find((s) => s.id === "witness.0")!.hex).toBe("00");
    expect(tx.witnesses[1]).toHaveLength(2);
  });

  it("makes txid equal wtxid for a transaction without witness serialization", () => {
    const legacy = bytesToHex(legacySerialization(parseTransaction(examples[0].signed)));
    const m = measureTransaction(parseTransaction(legacy));
    expect(m.txidHex).toBe(m.wtxidHex);
    expect(m.weight).toBe(4 * m.baseSize);
  });
});

describe("weight arithmetic", () => {
  it("rounds virtual size up and rejects impossible sizes", () => {
    expect(weightFor(100, 101)).toEqual({ weight: 401, vsize: 101 });
    expect(() => weightFor(10, 9)).toThrow(RangeError);
  });

  it("counts a witness byte as 1 weight unit and a base byte as 4", () => {
    const a = weightFor(200, 300).weight;
    expect(weightFor(200, 301).weight - a).toBe(1);
    expect(weightFor(201, 301).weight - weightFor(200, 300).weight).toBe(4);
  });
});

describe("segwit chapter fixtures", () => {
  const fixtures = JSON.parse(readFileSync(new URL("fixtures/segwit.json", root), "utf8")).fixtures;
  it("copy transaction, scriptCode, amount, preimage and sighash from the cited lines", () => {
    for (const f of fixtures) {
      const s = f.sighash;
      expect(lines[f.source.line - 1]).toContain(f.txHex);
      expect(lines[s.scriptCodeLine - 1]).toContain(s.scriptCodeHex);
      expect(lines[s.amountLine - 1]).toContain(s.amountQuote);
      expect(BigInt(s.amountSats)).toBe(BigInt(s.amountQuote.replace("value: ", "")) * 100000000n);
      expect(lines[s.preimageLine - 1]).toContain(s.preimageHex);
      expect(lines[s.sighashLine - 1]).toContain(s.sighashHex);
      const d = bip143Digest(parseTransaction(f.txHex), s.inputIndex, s.scriptCodeHex, BigInt(s.amountSats));
      expect([d.preimageHex, d.sighashHex]).toEqual([s.preimageHex, s.sighashHex]);
    }
  });
});

describe("segwit chapter prose numbers", () => {
  it("matches the parsed mixed example", () => {
    const m = measureTransaction(parseTransaction(examples[0].signed));
    expect([m.baseSize, m.totalSize, m.weight, m.vsize]).toEqual([233, 343, 1042, 261]);
    const text = readFileSync(new URL("content/chapters/segwit.json", root), "utf8");
    expect(text).toContain("233 base bytes and 343 bytes in total: 3 × 233 + 343 = 1,042 weight units, or 261 virtual bytes");
  });
});
