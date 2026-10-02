import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { base64, bech32, bech32m, createBase58check } from "@scure/base";
import { schnorr, secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hash160 } from "../src/bip32";
import { addressScript, decodeSignature, messageHash, toSign, toSpend, verify } from "../src/bip322";
import { bytesToHex, hexToBytes } from "../src/hex";
import { strictDer } from "../src/interpreter";
import { decodeScript } from "../src/p2sh";
import { compactSize, sigMsg, taprootOutput, taprootSighash } from "../src/taproot";
import { bip143Digest, parseTransaction, type Transaction } from "../src/tx";

const root = new URL("../../../", import.meta.url);
const gen = JSON.parse(readFileSync(new URL("sources/research-2026-10-01-phase3/raw/bip-0322/generated-test-vectors.json", root), "utf8"));
const full = (type: string) => gen.full.find((v: { type: string }) => v.type === type);

const cs = (n: number) => bytesToHex(compactSize(n));
const push = (h: string) => {
  const n = h.length / 2;
  return (n === 0 ? "00" : n <= 75 ? cs(n) : "4c" + cs(n)) + h;
};
const le32 = (n: number) => bytesToHex(Uint8Array.of(n, n >>> 8, n >>> 16, n >>> 24));
const le64 = (n: bigint) => bytesToHex(Uint8Array.from({ length: 8 }, (_, i) => Number((n >> BigInt(8 * i)) & 0xffn)));
/** Re-serialize a parsed transaction, optionally with edited fields. */
function serialize(tx: Transaction): string {
  const w = tx.witnesses.some((x) => x.length);
  const ins = cs(tx.inputs.length) + tx.inputs.map((i) => i.prevoutHex + cs(i.scriptSigHex.length / 2) + i.scriptSigHex + i.sequenceHex).join("");
  const outs = cs(tx.outputs.length) + tx.outputs.map((o) => le64(o.valueSats) + cs(o.scriptPubKeyHex.length / 2) + o.scriptPubKeyHex).join("");
  const wit = w ? tx.inputs.map((_, k) => cs((tx.witnesses[k] ?? []).length) + (tx.witnesses[k] ?? []).map((e) => cs(e.length / 2) + e).join("")).join("") : "";
  return tx.versionHex + (w ? "0001" : "") + ins + outs + wit + tx.locktimeHex;
}
const ful = (hex: string) => "ful" + base64.encode(hexToBytes(hex));
const smp = (items: string[]) => "smp" + base64.encode(hexToBytes(cs(items.length) + items.map((e) => cs(e.length / 2) + e).join("")));
/** Parse a published full vector, apply an edit, and verify the result. */
function edited(type: string, edit: (tx: Transaction) => void) {
  const v = full(type);
  const tx = structuredClone(decodeSignature(v.bip322_signatures[0]).tx!);
  edit(tx);
  return verify(v.address, v.message, ful(serialize(tx)));
}
const flip = (h: string, at: number) => h.slice(0, 2 * at) + (parseInt(h.slice(2 * at, 2 * at + 2), 16) ^ 1).toString(16).padStart(2, "0") + h.slice(2 * at + 2);

describe("every published full vector runs through the interpreter", () => {
  const paths: Record<string, string> = {
    p2pkh: "p2pkh", p2wpkh: "p2wpkh", p2tr: "p2tr key path", "p2tr-time-lock": "p2tr script path", "p2sh-p2wpkh": "p2sh → p2wpkh",
    "p2wsh-time-lock": "p2wsh", "p2wsh-multisig-2of2": "p2wsh", "p2wsh-multisig-3of3": "p2wsh", "p2sh-p2wsh-multisig-2of2": "p2sh → p2wsh", "p2sh-multisig-2of2": "p2sh",
  };
  for (const v of gen.full) {
    it(`${v.type}: valid at T = ${v.lock_time}, S = ${v.sequence} via ${paths[v.type]}`, () => {
      const r = verify(v.address, v.message, v.bip322_signatures[0]);
      expect(r).toMatchObject({ state: "valid", time: v.lock_time, age: v.sequence, checked: paths[v.type] });
    });
  }
});

describe("edits to published vectors (no re-signing)", () => {
  it("a flipped byte in any signature is invalid", () => {
    for (const v of gen.full) {
      const r = edited(v.type, (tx) => {
        const w = tx.witnesses[0] ?? [];
        const k = w.findIndex((e) => [64, 65, 71, 72, 73].includes(e.length / 2));
        if (k >= 0) w[k] = flip(w[k], 10);
        else {
          const ops = decodeScript(tx.inputs[0].scriptSigHex);
          const s = ops.findIndex((o) => o.dataHex && o.dataHex.length / 2 >= 70 && o.dataHex.length / 2 <= 73);
          tx.inputs[0].scriptSigHex = ops.map((o, j) => push(j === s ? flip(o.dataHex!, 10) : o.dataHex!)).join("");
        }
      });
      expect(r.state, v.type).toBe("invalid");
      expect((r as { reason: string }).reason, v.type).toMatch(/^invalid signature: (NULLFAIL|Schnorr signature does not verify|signature is not strict DER|LOW_S)/);
    }
  });

  it("CSV: nSequence one block short is invalid", () => {
    for (const t of ["p2wsh-time-lock", "p2tr-time-lock"]) {
      const r = edited(t, (tx) => { tx.inputs[0].sequenceHex = le32(2015); });
      expect(r.state, t).toBe("invalid");
      expect((r as { reason: string }).reason).toContain("CHECKSEQUENCEVERIFY failed: masked argument is not greater than masked nsequence");
    }
  });

  it("CSV: version 1 is invalid (a consensus failure, BIP 322 step 1, so it beats the upgradeable version rule)", () => {
    const r = edited("p2wsh-time-lock", (tx) => { tx.versionHex = le32(1); });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: CHECKSEQUENCEVERIFY failed: transaction version is at least 2" });
  });

  it("MINIMALIF: a branch selector of 0x00 instead of empty is invalid", () => {
    const r = edited("p2wsh-time-lock", (tx) => { expect(tx.witnesses[0][1]).toBe(""); tx.witnesses[0][1] = "00"; });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: MINIMALIF: the argument must be empty or exactly 0x01" });
  });

  it("NULLDUMMY: a non-empty CHECKMULTISIG dummy is invalid", () => {
    const r = edited("p2sh-multisig-2of2", (tx) => {
      expect(tx.inputs[0].scriptSigHex.startsWith("00")).toBe(true);
      tx.inputs[0].scriptSigHex = "51" + tx.inputs[0].scriptSigHex.slice(2);
    });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: NULLDUMMY: the dummy item must be empty" });
  });

  it("CHECKMULTISIG: signatures out of key order are invalid", () => {
    const r = edited("p2sh-multisig-2of2", (tx) => {
      const [d, s1, s2, redeem] = decodeScript(tx.inputs[0].scriptSigHex).map((o) => o.dataHex!);
      tx.inputs[0].scriptSigHex = [d, s2, s1, redeem].map(push).join("");
    });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: NULLFAIL: a failed signature must be empty" });
  });

  it("MINIMALDATA: the P2PKH public key pushed with OP_PUSHDATA1 is invalid", () => {
    const r = edited("p2pkh", (tx) => {
      const [sig, key] = decodeScript(tx.inputs[0].scriptSigHex).map((o) => o.dataHex!);
      tx.inputs[0].scriptSigHex = push(sig) + "4c21" + key;
    });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: MINIMALDATA: push is not minimally encoded" });
  });

  it("LOW_S: the same P2PKH signature with S replaced by n − S is invalid", () => {
    const r = edited("p2pkh", (tx) => {
      const [sig, key] = decodeScript(tx.inputs[0].scriptSigHex).map((o) => o.dataHex!);
      const s = secp256k1.Signature.fromBytes(hexToBytes(sig.slice(0, -2)), "der");
      const high = new secp256k1.Signature(s.r, secp256k1.Point.CURVE().n - s.s);
      tx.inputs[0].scriptSigHex = push(bytesToHex(high.toBytes("der")) + "01") + push(key);
    });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: LOW_S: signature S value is not low" });
  });

  it("a witness on a P2PKH spend is invalid", () => {
    const r = edited("p2pkh", (tx) => { tx.witnesses[0] = ["01"]; });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: witness supplied for a non-witness spend" });
  });

  it("taproot script path: a corrupted control block is invalid", () => {
    const r = edited("p2tr-time-lock", (tx) => { const w = tx.witnesses[0]; w[w.length - 1] = flip(w[w.length - 1], 20); });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: control block does not commit to this script" });
  });

  it("P2SH-P2WPKH: the redeem script pushed with OP_PUSHDATA1 is invalid", () => {
    const r = edited("p2sh-p2wpkh", (tx) => { tx.inputs[0].scriptSigHex = "4c" + tx.inputs[0].scriptSigHex; });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: MINIMALDATA: push is not minimally encoded" });
  });

  it("P2SH-P2WPKH: an extra push before the redeem script is invalid", () => {
    const r = edited("p2sh-p2wpkh", (tx) => { tx.inputs[0].scriptSigHex = "00" + tx.inputs[0].scriptSigHex; });
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: P2SH-wrapped SegWit: scriptSig must be exactly one push of the redeem script" });
  });

  it("a non-push scriptSig: invalid for P2SH (consensus), inconclusive for P2PKH (outside the model)", () => {
    expect(edited("p2sh-multisig-2of2", (tx) => { tx.inputs[0].scriptSigHex += "61"; })).toMatchObject({ state: "invalid", reason: "invalid signature: P2SH: the scriptSig must be push-only" });
    expect(edited("p2pkh", (tx) => { tx.inputs[0].scriptSigHex += "61"; })).toMatchObject({ state: "inconclusive", reason: "scriptSigs with non-push opcodes are outside this model" });
  });
});

/* Test-only signing with a published vector's own (public) key, to reach rules no vector exercises. */
const wif = createBase58check(sha256);
const SK = wif.decode(gen.simple[0].private_keys[0]).slice(1, 33);
const SK2 = wif.decode(gen.full[0].private_keys[0]).slice(1, 33);
const PK = bytesToHex(secp256k1.getPublicKey(SK, true));
const MSG = "BIP Atlas interpreter test";
const p2wshAddress = (ws: string) => bech32.encode("bc", [0, ...bech32.toWords(sha256(hexToBytes(ws)))]);

/** Sign a P2WSH witness script with SK and return a simple signature built by `stack(sig)`. */
function signP2wsh(ws: string, stack: (sig: string) => string[]): { address: string; signature: string } {
  const address = p2wshAddress(ws);
  const spend = toSpend(messageHash(MSG), addressScript(address).spk);
  const tx = parseTransaction(toSign(spend.txid, { witness: ["00"] }).witnessHex);
  // BIP 143 scriptCode: the witness script with a compact-size length prefix (not a push opcode).
  const digest = bip143Digest(tx, 0, cs(ws.length / 2) + ws, 0n).sighashHex;
  const sig = bytesToHex(secp256k1.sign(hexToBytes(digest), SK, { prehash: false, lowS: true, format: "der" })) + "01";
  return { address, signature: smp(stack(sig)) };
}
const CHECKSIG = push(PK) + "ac";

describe("required and upgradeable rules on test-only scripts", () => {
  it("sanity: <pk> OP_CHECKSIG is valid", () => {
    const { address, signature } = signP2wsh(CHECKSIG, (s) => [s, CHECKSIG]);
    expect(verify(address, MSG, signature)).toMatchObject({ state: "valid", checked: "p2wsh" });
  });

  it("a reserved NOP that runs makes a valid script inconclusive", () => {
    const ws = CHECKSIG + "b9"; // OP_NOP10
    const { address, signature } = signP2wsh(ws, (s) => [s, ws]);
    expect(verify(address, MSG, signature)).toMatchObject({ state: "inconclusive", reason: "reserved OP_NOP10 is reserved for upgrades" });
  });

  it("a required-rule failure beats a reserved NOP", () => {
    const ws = "b9" + CHECKSIG;
    const { address, signature } = signP2wsh(ws, (s) => [flip(s, 10), ws]);
    expect(verify(address, MSG, signature).state).toBe("invalid");
  });

  it("NULLFAIL: an empty signature may fail, a wrong one may not", () => {
    const ws = CHECKSIG + "0087"; // <pk> OP_CHECKSIG OP_0 OP_EQUAL: true only if the check fails
    const ok = signP2wsh(ws, () => ["", ws]);
    expect(verify(ok.address, MSG, ok.signature).state).toBe("valid");
    const bad = signP2wsh(ws, (s) => [flip(s, 10), ws]);
    expect(verify(bad.address, MSG, bad.signature)).toMatchObject({ state: "invalid", reason: "invalid signature: NULLFAIL: a failed signature must be empty" });
  });

  it("OP_CODESEPARATOR is forbidden", () => {
    const ws = "ab" + CHECKSIG;
    const { address, signature } = signP2wsh(ws, (s) => [s, ws]);
    expect(verify(address, MSG, signature)).toMatchObject({ state: "invalid", reason: "invalid signature: BIP 322 forbids OP_CODESEPARATOR" });
  });

  it("CLEANSTACK: an extra witness item is invalid", () => {
    const { address, signature } = signP2wsh(CHECKSIG, (s) => ["01", s, CHECKSIG]);
    expect(verify(address, MSG, signature)).toMatchObject({ state: "invalid", reason: "invalid signature: witness script must leave exactly one true item" });
  });

  it("an opcode outside the reviewed set is inconclusive, even in a branch that never runs", () => {
    const ws = "6300a86768" + CHECKSIG; // OP_IF OP_0 OP_SHA256 OP_ELSE OP_ENDIF <pk> OP_CHECKSIG
    const { address, signature } = signP2wsh(ws, (s) => [flip(s, 10), "", ws]);
    expect(verify(address, MSG, signature)).toMatchObject({ state: "inconclusive", reason: "opcode 0xa8 is outside this interpreter's reviewed set" });
  });

  it("FindAndDelete: an empty signature in a legacy script containing OP_0 is invalid", () => {
    const redeem = "0075" + CHECKSIG + "0087"; // OP_0 OP_DROP <pk> OP_CHECKSIG OP_0 OP_EQUAL
    const address = createBase58check(sha256).encode(Uint8Array.of(0x05, ...hash160(hexToBytes(redeem))));
    const spend = toSpend(messageHash(MSG), addressScript(address).spk);
    const r = verify(address, MSG, ful(toSign(spend.txid, { scriptSig: "00" + push(redeem) }).hex));
    expect(r).toMatchObject({ state: "invalid", reason: "invalid signature: BIP 322 forbids FindAndDelete: the signature appears in the scriptCode" });
  });

  it("a witness version above 1 is inconclusive", () => {
    const address = bech32m.encode("bc", [2, ...bech32m.toWords(new Uint8Array(32).fill(7))]);
    expect(verify(address, MSG, "smpAA==")).toMatchObject({ state: "inconclusive", reason: "witness version 2 is reserved for upgrades" });
  });
});

describe("tapscript OP_CHECKSIGADD (test-only 2-of-2)", () => {
  const x1 = bytesToHex(schnorr.getPublicKey(SK)), x2 = bytesToHex(schnorr.getPublicKey(SK2));
  const leaf = "20" + x1 + "ac" + "20" + x2 + "ba" + "52" + "9c"; // <x1> CHECKSIG <x2> CHECKSIGADD 2 NUMEQUAL
  const out = taprootOutput(x1, { id: 0, script: leaf, leafVersion: 0xc0 });
  const address = bech32m.encode("bc", [1, ...bech32m.toWords(hexToBytes(out.tweak.outputKeyHex))]);
  const spend = toSpend(messageHash(MSG), out.scriptPubKeyHex);
  const tx = parseTransaction(toSign(spend.txid, { witness: ["00"] }).witnessHex);
  const ext = out.leaves[0].leafHash + "00" + "ffffffff";
  const digest = hexToBytes(taprootSighash(sigMsg(tx, [{ scriptPubKeyHex: out.scriptPubKeyHex, amountSats: 0n }], 0, 0, 1), ext));
  const s1 = bytesToHex(schnorr.sign(digest, SK, new Uint8Array(32))), s2 = bytesToHex(schnorr.sign(digest, SK2, new Uint8Array(32)));

  it("both signatures: valid", () => {
    expect(verify(address, MSG, smp([s2, s1, leaf, out.controlBlocks[0]]))).toMatchObject({ state: "valid", checked: "p2tr script path" });
  });
  it("second signature empty: the count is 1, so invalid", () => {
    expect(verify(address, MSG, smp(["", s1, leaf, out.controlBlocks[0]]))).toMatchObject({ state: "invalid", reason: "invalid signature: tapscript must leave exactly one true item" });
  });
  it("SIGHASH_NONE is rejected by BIP 322's required rule", () => {
    expect(verify(address, MSG, smp([s2, s1 + "02", leaf, out.controlBlocks[0]]))).toMatchObject({ state: "invalid", reason: "invalid signature: BIP 322 requires SIGHASH_ALL or SIGHASH_DEFAULT" });
  });
});

describe("strict DER (BIP 66)", () => {
  const v = full("p2pkh");
  const sig = decodeScript(decodeSignature(v.bip322_signatures[0]).tx!.inputs[0].scriptSigHex)[0].dataHex!;
  it("accepts a published signature", () => expect(strictDer(hexToBytes(sig))).toBe(true));
  it("rejects a padded R and a wrong total length", () => {
    const b = hexToBytes(sig);
    const lenR = b[3];
    const padded = Uint8Array.from([0x30, b[1] + 1, 0x02, lenR + 1, 0x00, ...b.slice(4)]);
    expect(strictDer(padded)).toBe(false);
    expect(strictDer(Uint8Array.from([b[0], b[1] + 1, ...b.slice(2)]))).toBe(false);
  });
});

/* Review follow-ups: scope after commitment, every scope route, and the consensus limits. */
const x1 = bytesToHex(schnorr.getPublicKey(SK));
/** A one-leaf taproot output for `leaf`, and a signer over that leaf's BIP 342 sighash with SK. */
function tapLeaf(leaf: string, leafVersion = 0xc0) {
  const out = taprootOutput(x1, { id: 0, script: leaf, leafVersion });
  const address = bech32m.encode("bc", [1, ...bech32m.toWords(hexToBytes(out.tweak.outputKeyHex))]);
  const spend = toSpend(messageHash(MSG), out.scriptPubKeyHex);
  const tx = parseTransaction(toSign(spend.txid, { witness: ["00"] }).witnessHex);
  const ext = out.leaves[0].leafHash + "00" + "ffffffff";
  const sig = bytesToHex(schnorr.sign(hexToBytes(taprootSighash(sigMsg(tx, [{ scriptPubKeyHex: out.scriptPubKeyHex, amountSats: 0n }], 0, 0, 1), ext)), SK, new Uint8Array(32)));
  return { address, cb: out.controlBlocks[0], sig };
}

describe("tapscript details", () => {
  it("OP_0 inside a tapscript is an ordinary push, not out of scope", () => {
    const leaf = "00" + "75" + "20" + x1 + "ac"; // OP_0 OP_DROP <x1> OP_CHECKSIG
    const t = tapLeaf(leaf);
    expect(verify(t.address, MSG, smp([t.sig, leaf, t.cb]))).toMatchObject({ state: "valid", checked: "p2tr script path" });
  });
  it("the signature-operation budget runs out", () => {
    const leaf = ("76" + "20" + x1 + "ad").repeat(12) + "51"; // (DUP <x1> CHECKSIGVERIFY) × 12, OP_1
    const t = tapLeaf(leaf);
    expect(verify(t.address, MSG, smp([t.sig, leaf, t.cb]))).toMatchObject({ state: "invalid", reason: "invalid signature: tapscript signature-operation budget exceeded" });
  });
});

describe("scope routes (inconclusive)", () => {
  it("an annex", () => {
    const v = gen.simple.find((x: { type: string }) => x.type === "p2tr");
    const w = decodeSignature(v.bip322_signatures[0]).witness;
    expect(verify(v.address, v.message, smp([...w, "50aa"]))).toMatchObject({ state: "inconclusive", reason: "an annex is outside this model" });
  });
  it("a committed leaf with a leaf version other than 0xc0", () => {
    const leaf = "20" + x1 + "ac";
    const t = tapLeaf(leaf, 0xc2);
    expect(verify(t.address, MSG, smp([t.sig, leaf, t.cb]))).toMatchObject({ state: "inconclusive", reason: "taproot leaf versions other than 0xc0 are outside this model" });
  });
  it("OP_SUCCESSx in a committed leaf", () => {
    const leaf = "50";
    const t = tapLeaf(leaf);
    expect(verify(t.address, MSG, smp([leaf, t.cb])).state).toBe("inconclusive");
  });
  it("a tapscript public key that is not 32 bytes", () => {
    const leaf = push(PK) + "ac"; // 33-byte key
    const t = tapLeaf(leaf);
    expect(verify(t.address, MSG, smp([t.sig, leaf, t.cb]))).toMatchObject({ state: "inconclusive", reason: "tapscript public keys other than 32 bytes are outside this model" });
  });
  it("P2SH-wrapped witness version 1", () => {
    const redeem = "5120" + x1;
    const address = createBase58check(sha256).encode(Uint8Array.of(0x05, ...hash160(hexToBytes(redeem))));
    const spend = toSpend(messageHash(MSG), addressScript(address).spk);
    expect(verify(address, MSG, ful(toSign(spend.txid, { scriptSig: push(redeem) }).hex))).toMatchObject({ state: "inconclusive", reason: "P2SH-wrapped witness version 1 or higher is outside this model" });
  });
  it("a witness v1 program that is not 32 bytes", () => {
    const address = bech32m.encode("bc", [1, ...bech32m.toWords(new Uint8Array(20).fill(9))]);
    expect(verify(address, MSG, "smpAA==")).toMatchObject({ state: "inconclusive", reason: "this witness program shape is outside this model" });
  });
});

describe("scope is decided after the commitment", () => {
  it("an uncommitted witness script with an unknown opcode is invalid, not inconclusive", () => {
    const address = p2wshAddress("51");
    expect(verify(address, MSG, smp(["00", "a8"]))).toMatchObject({ state: "invalid", reason: "invalid signature: witness script does not match the program" });
  });
  it("an uncommitted tapleaf with OP_SUCCESS is invalid", () => {
    const t = tapLeaf("20" + x1 + "ac");
    expect(verify(t.address, MSG, smp(["50", t.cb])).state).toBe("invalid");
  });
  it("native SegWit with a scriptSig is invalid before any scope check", () => {
    const ws = "a851"; // OP_SHA256 OP_1: committed, but outside the reviewed set
    const address = p2wshAddress(ws);
    const spend = toSpend(messageHash(MSG), addressScript(address).spk);
    expect(verify(address, MSG, ful(toSign(spend.txid, { scriptSig: "51", witness: [ws] }).witnessHex))).toMatchObject({ state: "invalid", reason: "invalid signature: native SegWit requires an empty scriptSig" });
  });
  it("a truncated OP_PUSHDATA1 is invalid (undecodable), not out of scope", () => {
    const ws = "514c";
    expect(verify(p2wshAddress(ws), MSG, smp([ws]))).toMatchObject({ state: "invalid", reason: "invalid signature: a push runs past the end of the script" });
  });
  it("a redeem script pushed as a small integer is checked, then run", () => {
    const redeem = "81"; // pushed by OP_1NEGATE; 0x81 is OP_RIGHT, a disabled opcode outside the reviewed set
    const address = createBase58check(sha256).encode(Uint8Array.of(0x05, ...hash160(hexToBytes(redeem))));
    const spend = toSpend(messageHash(MSG), addressScript(address).spk);
    expect(verify(address, MSG, ful(toSign(spend.txid, { scriptSig: "4f" }).hex))).toMatchObject({ state: "inconclusive", reason: "opcode 0x81 is outside this interpreter's reviewed set" });
  });
});

describe("consensus limits", () => {
  it("more than 201 counted opcodes", () => {
    const ws = "61".repeat(202) + CHECKSIG;
    const { address, signature } = signP2wsh(ws, (s) => [s, ws]);
    expect(verify(address, MSG, signature)).toMatchObject({ state: "invalid", reason: "invalid signature: more than 201 opcodes" });
  });
  it("a witness element larger than 520 bytes", () => {
    const ws = "7551"; // OP_DROP OP_1
    expect(verify(p2wshAddress(ws), MSG, smp(["00".repeat(521), ws]))).toMatchObject({ state: "invalid", reason: "invalid signature: witness element larger than 520 bytes" });
  });
  it("a hybrid public key fails STRICTENC", () => {
    const u = bytesToHex(secp256k1.getPublicKey(SK, false));
    const hybrid = (parseInt(u.slice(-2), 16) % 2 ? "07" : "06") + u.slice(2);
    const ws = push(hybrid) + "ac";
    const { address, signature } = signP2wsh(ws, (s) => [s, ws]);
    expect(verify(address, MSG, signature)).toMatchObject({ state: "invalid", reason: "invalid signature: public key is not strictly encoded" });
  });
});
