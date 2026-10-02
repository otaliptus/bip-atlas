import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { base64 } from "@scure/base";
import { schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { createBase58check } from "@scure/base";
import { bytesToHex, hexToBytes } from "../src/hex";
import { sigMsg, taprootSighash, tweakSeckey } from "../src/taproot";
import { parseTransaction } from "../src/tx";
import { addressScript, decodeSignature, messageHash, toSign, toSpend, verify } from "../src/bip322";

const root = new URL("../../../", import.meta.url);
const raw = "sources/research-2026-10-01-phase3/raw/";
const basic = JSON.parse(readFileSync(new URL(raw + "bip-0322/basic-test-vectors.json", root), "utf8"));
const gen = JSON.parse(readFileSync(new URL(raw + "bip-0322/generated-test-vectors.json", root), "utf8"));
const CHECKED = ["p2pkh", "p2wpkh", "p2tr", "p2tr-time-lock", "p2sh-p2wpkh", "p2wsh-time-lock", "p2wsh-multisig-2of2", "p2wsh-multisig-3of3", "p2sh-p2wsh-multisig-2of2", "p2sh-multisig-2of2"];

describe("BIP 322 message hash and virtual transactions", () => {
  for (const v of basic.tx_hashes) {
    it(`"${v.message}"`, () => {
      expect(messageHash(v.message)).toBe(v.message_hash);
      const s = toSpend(v.message_hash, addressScript(v.address).spk);
      expect(s.txid).toBe(v.to_spend_tx_hash);
      expect(toSign(s.txid).txid).toBe(v.to_sign_tx_hash);
    });
  }
});

describe("simple signatures", () => {
  for (const v of [...basic.simple, ...gen.simple]) {
    it(`${v.type}: "${v.message.slice(0, 30)}"`, () => {
      for (const sig of v.bip322_signatures) {
        const r = verify(v.address, v.message, sig);
        expect(r.state, (r as { reason?: string }).reason).toBe("valid");
        if (r.state === "valid") expect([r.time, r.age]).toEqual([0, 0]);
      }
    });
  }
  it("a signature without a prefix is read as simple", () => {
    const v = basic.simple.find((x: { message: string }) => x.message === "No prefix fallback");
    expect(decodeSignature(v.bip322_signatures[0])).toMatchObject({ variant: "smp", prefixed: false });
  });
});

describe("full signatures", () => {
  for (const v of gen.full) {
    it(`${v.type}`, () => {
      const r = verify(v.address, v.message, v.bip322_signatures[0]);
      expect(CHECKED).toContain(v.type);
      expect(r.state, (r as { reason?: string }).reason).toBe("valid");
      if (r.state === "valid") expect([r.time, r.age]).toEqual([Number(v.lock_time), Number(v.sequence)]);
      const d = decodeSignature(v.bip322_signatures[0]);
      expect(parseInt(d.tx!.versionHex.slice(0, 2), 16)).toBe(Number(v.tx_version));
    });
  }
});

describe("error vectors", () => {
  for (const v of [...basic.error, ...gen.error]) {
    it(v.description, () => {
      const r = verify(v.address, v.message, v.signature);
      expect(r.state).toBe("invalid");
      if (r.state === "invalid" && !/invalid signature/.test(v.error_substr)) expect(r.reason).toContain(v.error_substr);
    });
  }
});

describe("required rules", () => {
  it("rejects a signature whose sighash byte is not SIGHASH_ALL", () => {
    const v = basic.simple[1];
    const w = decodeSignature(v.bip322_signatures[0]).witness;
    const sig = w[0].slice(0, -2) + "03";
    const ser = (items: string[]) => [items.length, ...items.flatMap((h) => [h.length / 2, ...hexToBytes(h)])];
    const forged = "smp" + base64.encode(Uint8Array.from(ser([sig, w[1]])));
    expect(verify(v.address, v.message, v.bip322_signatures[0]).state).toBe("valid");
    expect(verify(v.address, v.message, forged).state).toBe("invalid");
  });
});

describe("message-signing chapter prose numbers", () => {
  const text = readFileSync(new URL("content/chapters/message-signing.json", root), "utf8");
  const b322 = readFileSync(new URL(raw + "bip-0322.mediawiki", root), "utf8").split("\n");
  const has = (s: string) => expect(text).toContain(s);

  it("history and constants", () => {
    expect(b322[8]).toContain("Assigned: 2018-09-10");
    expect(b322[17]).toContain("Version: 2.0.0");
    has("BIP 322, assigned in 2018 and recorded as Complete at version 2.0.0");
    expect(["smp", "ful", "pof"].every((p) => p.length === 3)).toBe(true);
    has("each new format marked by a three-letter prefix");
    expect(b322[140]).toContain("vin[0].prevout.n = 0xFFFFFFFF");
    has("spends output 0xFFFFFFFF of a transaction whose ID is all zeros");
    expect(b322[331]).toContain("PSBT_GLOBAL_GENERIC_SIGNED_MESSAGE = 0x09");
    has("one global PSBT field, number 0x09");
    expect(addressScript("13vU5PUSuArDXJdCWZvUFEbgJ2wcmtSJWn").kind).toBe("p2pkh");
    has("P2PKH addresses, the ones starting with 1");
  });

  it("vector facts", () => {
    const ms = basic.simple.find((v: { type: string }) => v.type === "p2wsh-multisig-3of3");
    const w = decodeSignature(ms.bip322_signatures[0]).witness;
    expect(w.length).toBe(5);
    expect(w[0]).toBe("");
    expect(w[w.length - 1]).toBe(ms.witness_script);
    has("a 3-of-3 multisig address, whose “signature” is three ECDSA signatures, an empty dummy item and the witness script");
    expect(basic.simple.some((v: { bip322_signatures: string[] }) => v.bip322_signatures.some((s) => !/^(smp|ful|pof)/.test(s)))).toBe(true);
    has("one of the published vectors tests exactly that");
    const chapter = JSON.parse(text);
    const hero = chapter.sections.flatMap((s: { blocks: { figure?: string; fixtures?: string[] }[] }) => s.blocks).find((b: { recipe?: string }) => b.recipe === "bip322-virtual-tx.v1");
    expect(hero.fixtures.length).toBe(6);
    has("Six of BIP 322’s published vectors");
  });
});

describe("review regressions", () => {
  // Test-only: re-sign the published P2TR vector's message with the vector's own (public) key and other sighash types.
  const v = gen.simple[1];
  const wif = createBase58check(sha256).decode(v.private_keys[0]);
  const sk = bytesToHex(wif.slice(1, 33));
  const dk = tweakSeckey(sk, "");
  const spk = addressScript(v.address).spk;
  const signWith = (ht: number) => {
    const spend = toSpend(messageHash(v.message), spk);
    const tx = parseTransaction(toSign(spend.txid, { witness: ["00".repeat(65)] }).witnessHex);
    const digest = taprootSighash(sigMsg(tx, [{ scriptPubKeyHex: spk, amountSats: 0n }], 0, ht));
    const sig = bytesToHex(schnorr.sign(hexToBytes(digest), hexToBytes(dk), new Uint8Array(32))) + ht.toString(16).padStart(2, "0");
    return "smp" + base64.encode(Uint8Array.from([1, 65, ...hexToBytes(sig)]));
  };

  it("P2TR: SIGHASH_ALL is accepted, other hash types are invalid", () => {
    expect(verify(v.address, v.message, signWith(0x01)).state).toBe("valid");
    for (const ht of [0x02, 0x03, 0x81]) expect(verify(v.address, v.message, signWith(ht)).state).toBe("invalid");
  });

  it("P2TR: an empty witness is invalid", () => {
    expect(verify(v.address, v.message, "smpAA==").state).toBe("invalid");
  });

  it("full P2WPKH with a non-empty scriptSig is invalid", () => {
    const f = gen.full[1];
    const hex = bytesToHex(base64.decode(f.bip322_signatures[0].slice(3)));
    // version (8) + marker/flag (4) + input count (2) + outpoint (72), then the scriptSig length byte "00"
    const at = 8 + 4 + 2 + 72;
    expect(hex.slice(at, at + 2)).toBe("00");
    const bad = hex.slice(0, at) + "020151" + hex.slice(at + 2);
    expect(verify(f.address, f.message, f.bip322_signatures[0]).state).toBe("valid");
    expect(verify(f.address, f.message, "ful" + base64.encode(hexToBytes(bad))).state).toBe("invalid");
  });

  it("required rules come before the version rule", () => {
    const f = gen.full[1];
    const hex = bytesToHex(base64.decode(f.bip322_signatures[0].slice(3)));
    const v1 = "01000000" + hex.slice(8);
    expect(verify(f.address, f.message, "ful" + base64.encode(hexToBytes(v1))).state).toBe("invalid");
  });
});
