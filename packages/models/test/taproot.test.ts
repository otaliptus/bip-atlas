import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SigMsgError,
  checkControlBlock,
  precomputed,
  sigMsg,
  taprootOutput,
  taprootSighash,
  tapBranchHash,
  tweakSeckey,
  tweakPubkey,
  verifyKeyPath,
  type ScriptTree,
} from "../src/taproot";
import { parseTransaction } from "../src/tx";
import { analyzeSegwitAddress } from "../src/bech32";
import { publicKeyOf } from "../src/schnorr";
import { signForVector } from "./sign-for-vectors";

const root = new URL("../../../", import.meta.url);
const raw = (path: string) => readFileSync(new URL(`sources/research-2026-10-01/raw/${path}`, root), "utf8");
const vectors = JSON.parse(raw("bip-0341/wallet-test-vectors.json"));
const spk = vectors.scriptPubKey as Array<any>;
const kps = vectors.keyPathSpending[0];

describe("BIP341 scriptPubKey vectors", () => {
  it("has seven trees", () => expect(spk).toHaveLength(7));

  spk.forEach((v, i) => {
    it(`vector ${i}: leaf hashes, root, tweak, output key, scriptPubKey, address, control blocks`, () => {
      const out = taprootOutput(v.given.internalPubkey, v.given.scriptTree as ScriptTree);
      const byId = [...out.leaves].sort((a, b) => a.id - b.id);
      expect(byId.map((l) => l.leafHash)).toEqual(v.intermediary.leafHashes ?? []);
      expect(out.merkleRootHex).toBe(v.intermediary.merkleRoot);
      expect(out.tweak.tweakHex).toBe(v.intermediary.tweak);
      expect(out.tweak.outputKeyHex).toBe(v.intermediary.tweakedPubkey);
      expect(out.scriptPubKeyHex).toBe(v.expected.scriptPubKey);
      const addr = analyzeSegwitAddress(v.expected.bip350Address, "bc");
      expect([addr.valid, addr.witnessVersion, addr.programHex]).toEqual([true, 1, out.tweak.outputKeyHex]);
      const cbById = byId.map((l) => out.controlBlocks[out.leaves.indexOf(l)]);
      expect(cbById).toEqual(v.expected.scriptPathControlBlocks ?? []);
    });
  });

  it("differs internal key from output key in every vector", () => {
    for (const v of spk) expect(v.intermediary.tweakedPubkey).not.toBe(v.given.internalPubkey);
  });

  it("verifies every published control block against its output key and leaf, and only that leaf", () => {
    for (const v of spk.filter((x) => x.given.scriptTree)) {
      const out = taprootOutput(v.given.internalPubkey, v.given.scriptTree);
      for (const [n, leaf] of out.leaves.entries()) {
        expect(checkControlBlock(out.tweak.outputKeyHex, leaf.scriptHex, out.controlBlocks[n]).ok).toBe(true);
        for (const other of out.leaves.filter((l) => l.scriptHex !== leaf.scriptHex)) {
          expect(checkControlBlock(out.tweak.outputKeyHex, other.scriptHex, out.controlBlocks[n]).ok).toBe(false);
        }
      }
    }
  });

  it("rejects a control block with the parity bit flipped, a bad length, or a wrong output key", () => {
    const v = spk[5];
    const out = taprootOutput(v.given.internalPubkey, v.given.scriptTree);
    const cb = out.controlBlocks[0];
    const flipped = (parseInt(cb.slice(0, 2), 16) ^ 1).toString(16).padStart(2, "0") + cb.slice(2);
    const r1 = checkControlBlock(out.tweak.outputKeyHex, out.leaves[0].scriptHex, flipped);
    expect(r1.ok).toBe(false);
    expect(r1.steps.at(-1)!.id).toBe("compare");
    expect(checkControlBlock(out.tweak.outputKeyHex, out.leaves[0].scriptHex, cb + "00").steps[0].ok).toBe(false);
    expect(checkControlBlock(spk[6].intermediary.tweakedPubkey, out.leaves[0].scriptHex, cb).ok).toBe(false);
  });

  it("sorts branch children, so the order of siblings in the tree does not change the root", () => {
    const [a, b] = spk[3].intermediary.leafHashes;
    expect(tapBranchHash(a, b)).toBe(tapBranchHash(b, a));
    expect(tapBranchHash(a, b)).toBe(spk[3].intermediary.merkleRoot);
  });

  it("encodes leaf version and parity in the control byte (vector 3 has a 0xfa leaf)", () => {
    const cbs = spk[3].expected.scriptPathControlBlocks;
    expect(cbs.map((c: string) => c.slice(0, 2))).toEqual(["c0", "fa"]);
  });

  it("keeps control blocks at 33 + 32m bytes", () => {
    for (const v of spk) for (const cb of v.expected.scriptPathControlBlocks ?? []) expect((cb.length / 2 - 33) % 32).toBe(0);
    expect(spk[5].expected.scriptPathControlBlocks.map((c: string) => c.length / 2)).toEqual([65, 97, 97]);
  });
});

describe("BIP341 keyPathSpending vector", () => {
  const tx = parseTransaction(kps.given.rawUnsignedTx);
  const spent = kps.given.utxosSpent.map((u: any) => ({ scriptPubKeyHex: u.scriptPubKey, amountSats: BigInt(u.amountSats) }));

  it("reproduces the shared intermediary hashes", () => {
    const p = precomputed(tx, spent);
    for (const k of ["hashAmounts", "hashOutputs", "hashPrevouts", "hashScriptPubkeys", "hashSequences"] as const) {
      expect(p[k], k).toBe(kps.intermediary[k]);
    }
  });

  for (const input of kps.inputSpending) {
    const g = input.given;
    it(`input ${g.txinIndex}: keys, tweak, SigMsg, sighash and witness (hash_type 0x${g.hashType.toString(16)})`, () => {
      expect(publicKeyOf(g.internalPrivkey)).toBe(input.intermediary.internalPubkey);
      const out = taprootOutput(input.intermediary.internalPubkey, null);
      const tweakedKey = tweakSeckey(g.internalPrivkey, g.merkleRoot ?? "");
      expect(tweakedKey).toBe(input.intermediary.tweakedPrivkey);
      const q = spent[g.txinIndex].scriptPubKeyHex.slice(4);
      expect(publicKeyOf(tweakedKey)).toBe(q);
      if (g.merkleRoot === null) expect(out.tweak.outputKeyHex).toBe(q);
      const tw = tweakPubkey(input.intermediary.internalPubkey, g.merkleRoot ?? "");
      expect(tw.tweakHex).toBe(input.intermediary.tweak);
      expect(tw.outputKeyHex).toBe(q);
      const items = sigMsg(tx, spent, g.txinIndex, g.hashType);
      // The vectors list the epoch byte 0x00 together with SigMsg.
      expect("00" + items.map((i) => i.hex).join("")).toBe(input.intermediary.sigMsg);
      const sighash = taprootSighash(items);
      expect(sighash).toBe(input.intermediary.sigHash);
      const sig = signForVector(tweakedKey, sighash, "00".repeat(32)) + (g.hashType ? g.hashType.toString(16).padStart(2, "0") : "");
      expect([sig]).toEqual(input.expected.witness);
      expect(verifyKeyPath(q, sig, (ht) => taprootSighash(sigMsg(tx, spent, g.txinIndex, ht)))).toBe(true);
    });
  }

  it("rejects an explicit 0x00 sighash byte, undefined hash types and SINGLE without an output", () => {
    const g = kps.inputSpending[3].given; // hash_type 0, 64-byte signature
    const sig = kps.inputSpending[3].expected.witness[0];
    const q = spent[g.txinIndex].scriptPubKeyHex.slice(4);
    const sighashFor = (ht: number) => taprootSighash(sigMsg(tx, spent, g.txinIndex, ht));
    expect(sig.length / 2).toBe(64);
    expect(verifyKeyPath(q, sig + "00", sighashFor)).toBe(false);
    expect(verifyKeyPath(q, sig.slice(0, -2), sighashFor)).toBe(false);
    expect(() => sigMsg(tx, spent, 0, 0x04)).toThrow(SigMsgError);
    expect(() => sigMsg(tx, spent, 8, 0x03)).toThrow(SigMsgError);
    expect(() => sigMsg(tx, spent, 0, 0, 128)).toThrow(SigMsgError);
    for (const bad of [-1, 1.5, tx.inputs.length]) {
      expect(() => sigMsg(tx, spent, bad, 0x00)).toThrow(SigMsgError);
      expect(() => sigMsg(tx, spent, bad, 0x81)).toThrow(SigMsgError);
    }
    // A 65-byte signature with an undefined hash_type is simply invalid.
    expect(verifyKeyPath(q, sig + "04", sighashFor)).toBe(false);
  });

  it("commits to every spent amount and scriptPubKey unless ANYONECANPAY", () => {
    const ids = (ht: number) => sigMsg(tx, spent, 0, ht).map((i) => i.id);
    expect(ids(0)).toContain("sha_amounts");
    expect(ids(0)).toContain("sha_scriptpubkeys");
    expect(ids(0x81)).not.toContain("sha_amounts");
    expect(ids(0x81)).toContain("amount");
  });

  it("keeps SigMsg within the stated length formula", () => {
    for (const ht of [0, 1, 2, 3, 0x81, 0x82, 0x83]) {
      const len = sigMsg(tx, spent, 0, ht).reduce((n, i) => n + i.hex.length / 2, 0);
      const acp = ht & 0x80 ? 1 : 0;
      const none = (ht & 3) === 2 ? 1 : 0;
      expect(len, `0x${ht.toString(16)}`).toBe(174 - acp * 49 - none * 32);
    }
  });
});

describe("taproot chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/taproot.json", root), "utf8");
  const bip = raw("bip-0341.mediawiki").split("\n");
  const tx = parseTransaction(kps.given.rawUnsignedTx);
  const spent = kps.given.utxosSpent.map((u: any) => ({ scriptPubKeyHex: u.scriptPubKey, amountSats: BigInt(u.amountSats) }));

  it("matches the vectors and the BIP", () => {
    expect(text).toContain("65 bytes for leaf A and 97 for B and C");
    const len = sigMsg(tx, spent, 4, 0).reduce((n, i) => n + i.hex.length / 2, 0);
    expect(len).toBe(174);
    expect(text).toContain("illustrated input’s message is 174 bytes");
    expect(bip[127]).toContain("at most ''206'' bytes");
    expect(text).toContain("at most 206 bytes");
    expect(bip[346]).toContain("height 709632 on Bitcoin mainnet");
    expect(text).toContain("block 709632");
    expect(text).toContain("33 + 32m bytes, where m runs from 0 to 128");
    expect(text).toContain("for all 7 trees");
    expect(spk).toHaveLength(7);
    expect(kps.inputSpending).toHaveLength(7);
    // Vector 5: leaf A at depth 1, B and C at depth 2; input 4 spends it with a 64-byte signature.
    const out = taprootOutput(spk[5].given.internalPubkey, spk[5].given.scriptTree);
    expect([...out.leaves].sort((a, b) => a.id - b.id).map((l) => l.path.length)).toEqual([1, 2, 2]);
    expect(kps.given.utxosSpent[4].scriptPubKey).toBe(spk[5].expected.scriptPubKey);
    expect(kps.inputSpending[3].given.txinIndex).toBe(4);
    expect(kps.inputSpending[3].expected.witness[0].length / 2).toBe(64);
  });
});
