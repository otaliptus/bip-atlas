import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { base64 } from "@scure/base";
import { hexToBytes } from "../src/hex";
import { addressScript, decodeSignature, messageHash, toSign, toSpend, verify } from "../src/bip322";

const root = new URL("../../../", import.meta.url);
const raw = "sources/research-2026-10-01-phase3/raw/";
const basic = JSON.parse(readFileSync(new URL(raw + "bip-0322/basic-test-vectors.json", root), "utf8"));
const gen = JSON.parse(readFileSync(new URL(raw + "bip-0322/generated-test-vectors.json", root), "utf8"));
const CHECKED = ["p2wpkh", "p2tr", "p2wsh-multisig-2of2", "p2wsh-multisig-3of3"];

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
      if (CHECKED.includes(v.type)) {
        expect(r.state, (r as { reason?: string }).reason).toBe("valid");
        if (r.state === "valid") expect([r.time, r.age]).toEqual([Number(v.lock_time), Number(v.sequence)]);
      } else {
        expect(r.state).toBe("inconclusive");
      }
      const d = decodeSignature(v.bip322_signatures[0]);
      expect(parseInt(d.tx!.versionHex.slice(0, 2), 16)).toBe(Number(v.tx_version));
    });
  }
});

describe("error vectors", () => {
  for (const v of [...basic.error, ...gen.error]) {
    it(v.description, () => {
      const type = (gen.full.concat(gen.simple, basic.simple) as { address: string; type: string; bip322_signatures: string[] }[]).find((x) => x.bip322_signatures.includes(v.signature))?.type;
      const r = verify(v.address, v.message, v.signature);
      if (!type || CHECKED.includes(type) || /base64|short|prefix|full variant/.test(v.error_substr)) {
        expect(r.state).toBe("invalid");
        if (r.state === "invalid" && !/invalid signature/.test(v.error_substr)) expect(r.reason).toContain(v.error_substr);
      } else {
        // Not verifiable here, but a wrong message or address changes to_spend, so the structural check already fails.
        expect(r).toMatchObject({ state: "invalid", reason: "to_sign does not spend to_spend:0" });
      }
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
