import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countSigops, decodeScript, isP2shScript, legacySighash, P2shScopeError, traceP2sh } from "../src/p2sh";
import { parsePsbt } from "../src/psbt";
import { parseTransaction } from "../src/tx";
import { hash160 } from "../src/bip32";
import { bytesToHex, hexToBytes } from "../src/hex";

const root = new URL("../../../", import.meta.url);
const raw = (p: string) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/${p}`, root), "utf8");
const b16 = raw("bip-0016.mediawiki").split("\n");
const b143 = raw("bip-0143.mediawiki").split("\n");
const b174 = raw("bip-0174.mediawiki").split("\n");
const pre = (line: number) => /<pre>([0-9a-f]+)<\/pre>/.exec(b174[line - 1])![1];

/** BIP 174's published trace: the final transaction (L833) and the updater's UTXO records (L797). */
const extracted = pre(833);
const updater = parsePsbt(pre(797));
const nonWitnessPrev = parseTransaction(updater.inputs[0].find((r) => r.keyType === 0x00)!.valueHex);
const legacySpk = nonWitnessPrev.outputs[0].scriptPubKeyHex;
const witnessUtxo = updater.inputs[1].find((r) => r.keyType === 0x01)!.valueHex;
const wrappedAmount = BigInt(`0x${witnessUtxo.slice(0, 16).match(/../g)!.reverse().join("")}`);
const wrappedSpk = witnessUtxo.slice(18);

/** BIP 143's P2SH-P2WPKH example: signed transaction (L250) spending a9144733…87 worth 10 BTC (L215). */
const p2wpkhTx = /The serialized signed transaction is: ([0-9a-f]+)/.exec(b143[249])![1];
const p2wpkhSpk = /scriptPubKey : ([0-9a-f]+), value: 10/.exec(b143[214])![1];

describe("pinned P2SH spends", () => {
  it("finds three P2SH outputs in the pinned material", () => {
    expect([legacySpk, wrappedSpk, p2wpkhSpk].every(isP2shScript)).toBe(true);
    expect(wrappedAmount).toBe(200_000_000n);
  });

  it("legacy 2-of-2 (BIP 174 input 0): push-only, hash matches, both signatures match their keys in order", () => {
    const t = traceP2sh(extracted, 0, legacySpk, null);
    expect(t.kind).toBe("legacy");
    expect(t.stages.map((s) => [s.id, s.ok])).toEqual([["push-only", true], ["hash-match", true], ["redeem", true]]);
    const ms = t.stages[2].steps.find((s) => s.name === "OP_CHECKMULTISIG")!;
    expect(ms.checks).toEqual([{ sigIndex: 0, keyIndex: 0, ok: true }, { sigIndex: 1, keyIndex: 1, ok: true }]);
    expect(t.redeemSigops).toBe(2);
    expect(t.valid).toBe(true);
  });

  it("P2SH-P2WSH 2-of-2 (BIP 174 input 1): the redeem script is a 32-byte program and the witness script runs", () => {
    const t = traceP2sh(extracted, 1, wrappedSpk, wrappedAmount);
    expect(t.kind).toBe("p2sh-p2wsh");
    expect(t.stages.map((s) => [s.id, s.ok])).toEqual([["push-only", true], ["hash-match", true], ["witness", true]]);
    expect(t.valid).toBe(true);
  });

  it("P2SH-P2WPKH (BIP 143 example): the witness key hashes to the program and its signature verifies", () => {
    const t = traceP2sh(p2wpkhTx, 0, p2wpkhSpk, 1_000_000_000n);
    expect(t.kind).toBe("p2sh-p2wpkh");
    expect(t.redeemScriptHex).toBe("001479091972186c449eb1ded22b78e40d009bdf0089");
    expect(b143[215]).toContain(t.redeemScriptHex);
    expect(t.valid).toBe(true);
  });
});

describe("what makes a P2SH spend fail", () => {
  const tx = parseTransaction(extracted);
  /** The transaction with input 0's scriptSig (and its length prefix) replaced. */
  const withScriptSig = (scriptSigHex: string) => {
    const n = scriptSigHex.length / 2;
    const len = n < 0xfd ? n.toString(16).padStart(2, "0") : `fd${(n & 0xff).toString(16).padStart(2, "0")}${(n >> 8).toString(16).padStart(2, "0")}`;
    return tx.segments.map((g) => (g.id === "input.0.scriptsig" ? len + scriptSigHex : g.hex)).join("");
  };
  const ops = decodeScript(tx.inputs[0].scriptSigHex);
  const redeem = ops.at(-1)!.dataHex!;

  it("one changed byte in the redeem script fails the hash check", () => {
    const altered = redeem.slice(0, -2) + "af"; // CHECKMULTISIG → CHECKMULTISIGVERIFY
    const sig = tx.inputs[0].scriptSigHex.replace(redeem, altered);
    const t = traceP2sh(withScriptSig(sig), 0, legacySpk, null);
    expect(t.stages.map((s) => [s.id, s.ok])).toEqual([["push-only", true], ["hash-match", false]]);
    expect(t.valid).toBe(false);
  });

  it("a non-push operation in the scriptSig fails BIP16 rule 1", () => {
    const sig = "76" + tx.inputs[0].scriptSigHex; // OP_DUP in front
    const t = traceP2sh(withScriptSig(sig), 0, legacySpk, null);
    expect([t.stages[0].ok, t.stages.length, t.valid]).toEqual([false, 1, false]);
  });

  it("signatures in the wrong order fail, because CHECKMULTISIG walks the keys in order", () => {
    const [dummy, s1, s2] = ops.map((o) => o.dataHex!);
    const push = (h: string) => (h.length / 2).toString(16).padStart(2, "0") + h;
    const swapped = "00" + push(s2) + push(s1) + "47" + redeem;
    expect(dummy).toBe("");
    const t = traceP2sh(withScriptSig(swapped), 0, legacySpk, null);
    expect(t.stages.map((s) => s.ok)).toEqual([true, true, false]);
  });

  it("a changed output invalidates the signatures (the legacy digest covers it)", () => {
    const out0 = tx.outputs[0];
    const bumped = extracted.replace(out0.scriptPubKeyHex, out0.scriptPubKeyHex.slice(0, -2) + (out0.scriptPubKeyHex.endsWith("00") ? "01" : "00"));
    expect(traceP2sh(bumped, 0, legacySpk, null).valid).toBe(false);
  });

  it("refuses opcodes outside the reviewed set and non-P2SH outputs", () => {
    const opDup = tx.inputs[0].scriptSigHex.replace("47" + redeem, "02" + "5176"); // redeem script OP_1 OP_DUP
    const spk = `a914${bytesToHex(hash160(hexToBytes("5176")))}87`;
    expect(() => traceP2sh(withScriptSig(opDup), 0, spk, null)).toThrow(P2shScopeError);
    expect(() => traceP2sh(extracted, 0, "0014" + "00".repeat(20), null)).toThrow(P2shScopeError);
  });

  it("only SIGHASH_ALL legacy digests are in scope", () => {
    expect(() => legacySighash(tx, 0, redeem, 2)).toThrow(P2shScopeError);
  });
});

describe("BIP16 sigop counting and the 520-byte limit", () => {
  it("matches the BIP's two examples", () => {
    expect(b16[55]).toContain("+3 signature operations");
    const k = "21" + "02" + "11".repeat(32);
    expect(countSigops("52" + k + k + k + "53ae")).toBe(3);
    expect(b16[58]).toContain("+22 signature operations");
    expect(countSigops("ac63ad67af68")).toBe(22);
  });

  it("15 compressed keys fit in 520 bytes, 16 do not", () => {
    expect(b16[101]).toContain("3 bytes + 15 pubkeys * 34 bytes/pubkey = 513 bytes");
    expect(3 + 15 * 34).toBe(513);
    expect(3 + 16 * 34).toBeGreaterThan(520);
  });
});

describe("p2sh chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/p2sh.json", root), "utf8");
  const tx = parseTransaction(extracted);
  const w = (t: ReturnType<typeof parseTransaction>, i: number) => (t.witnesses[i] ?? []).reduce((n, e) => n + e.length / 2, 0);

  it("matches the pinned spends", () => {
    expect(legacySpk.length / 2).toBe(23);
    expect(text).toContain("That is 23 bytes whether");
    const ser = (t: ReturnType<typeof parseTransaction>, i: number) => {
      const g = t.segments.find((x) => x.id === `witness.${i}`)!;
      return (t.witnesses[i] ?? []).length ? g.hex.length / 2 : 0; // count + length prefixes + items
    };
    expect([tx.inputs[0].scriptSigHex.length / 2, w(tx, 0), ser(tx, 0)]).toEqual([218, 0, 0]);
    expect([tx.inputs[1].scriptSigHex.length / 2, w(tx, 1), ser(tx, 1)]).toEqual([35, 213, 218]);
    const p = parseTransaction(p2wpkhTx);
    expect([p.inputs[0].scriptSigHex.length / 2, ser(p, 0)]).toEqual([23, 107]);
    expect([4 * 218 + 0, 4 * 35 + 218]).toEqual([872, 358]);
    expect(text).toContain("The legacy 2-of-2 puts 218 bytes in its scriptSig. The wrapped 2-of-2 needs a 35-byte scriptSig, and its witness serializes to 218 bytes.");
    expect(text).toContain("those bytes come to 872 weight units against 358");
    expect(traceP2sh(p2wpkhTx, 0, p2wpkhSpk, 1_000_000_000n).redeemScriptHex.length / 2).toBe(22);
    expect(traceP2sh(extracted, 1, wrappedSpk, wrappedAmount).redeemScriptHex.length / 2).toBe(34);
    expect(text).toContain("the redeem script is a 22-byte program");
    expect(text).toContain("the redeem script is a 34-byte program");
  });

  it("restates the BIP's limits correctly", () => {
    expect(text).toContain("allows at most 15 keys, 513 bytes in all");
    expect(text).toContain("The BIP’s examples come to 3 and 22.");
    expect(b16[95]).toContain("If 550 or more");
    expect(text).toContain("with 550 or more of roughly 1,000");
  });
});

describe("BIP141 rules on the P2SH witness path (review follow-ups)", () => {
  const tx = parseTransaction(extracted);
  const segs = (f: (id: string, hex: string) => string) => tx.segments.map((g) => f(g.id, g.hex)).join("");

  it("a P2WPKH-shaped spend with an empty witness fails instead of crashing", () => {
    const p = parseTransaction(p2wpkhTx);
    const stripped = p.segments.filter((g) => g.part === "base").map((g) => g.hex).join("");
    const t = traceP2sh(stripped, 0, p2wpkhSpk, 1_000_000_000n);
    expect(t.valid).toBe(false);
  });

  it("an extra witness item breaks the clean-stack rule for P2WSH", () => {
    // Prepend an extra "01" item to input 1's witness.
    const hex = segs((id, h) => (id === "witness.1" ? "05" + "0101" + h.slice(2) : h));
    expect(parseTransaction(hex).witnesses[1].length).toBe(5);
    expect(traceP2sh(hex, 1, wrappedSpk, wrappedAmount).valid).toBe(false);
  });

  it("refuses witness programs other than v0 20/32 bytes, and requires an empty witness on the legacy path", () => {
    const v1 = "5120" + "11".repeat(32);
    const spk = `a914${bytesToHex(hash160(hexToBytes(v1)))}87`;
    const hex = segs((id, h) => (id === "input.1.scriptsig" ? "23" + "22" + v1 : h));
    expect(() => traceP2sh(hex, 1, spk, wrappedAmount)).toThrow(P2shScopeError);
    // Input 1 again, but with its scriptSig claiming the legacy path: its witness must then be empty.
    const legacyWithWitness = segs((id, h) => (id === "input.1.scriptsig" ? tx.segments.find((g) => g.id === "input.0.scriptsig")!.hex : h));
    const t = traceP2sh(legacyWithWitness, 1, legacySpk, null);
    expect(t.valid).toBe(false);
    expect(t.stages.at(-1)!.note).toContain("witness data");
  });
});
