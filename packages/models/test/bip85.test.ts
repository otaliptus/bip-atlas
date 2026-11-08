import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BIP39_WORD_COUNTS,
  BIP85_PURPOSE,
  base64PasswordApplication,
  bip39Application,
  bip39EntropyBits,
  deriveEntropy,
  diceApplication,
  drng,
  hexApplication,
  wifApplication,
  xprvApplication,
} from "../src/bip85";
import { parseWordlist } from "../src/bip39";

const root = new URL("../../../", import.meta.url);
const snapshot = new URL("sources/research-2026-11-08-phase4/", root);
const lock = JSON.parse(readFileSync(new URL("sources.lock.json", snapshot), "utf8"));
const pinned = (path: string) => {
  const bytes = readFileSync(new URL(`raw/${path}`, snapshot));
  expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(lock.files.find((f: { path: string }) => f.path === path).sha256);
  return bytes.toString("utf8");
};
const text = pinned("bip-0085.mediawiki");
const lines = text.split("\n");
const english = parseWordlist(pinned("bip-0039/english.txt"));

/** Every INPUT … OUTPUT block in BIP 85: its path, line and DERIVED fields. */
interface Vector { path: string; line: number; out: Record<string, string> }
const vectors: Vector[] = [];
for (const [i, l] of lines.entries()) {
  const m = /^\*\s*PATH: (m\/\S+)$/.exec(l.trim());
  if (!m) continue;
  const out: Record<string, string> = {};
  for (let j = i + 1; j < lines.length && !/^INPUT:/.test(lines[j]); j++) {
    const d = /^\* DERIVED ([A-Z0-9 ]+)=(.*)$/.exec(lines[j].trim());
    if (d) out[d[1]] = d[2];
    if (/^=/.test(lines[j])) break;
  }
  vectors.push({ path: m[1], line: i + 1, out });
}
const rootKey = /MASTER BIP32 ROOT KEY: (xprv\S+)/.exec(text)![1];
const vector = (path: string) => {
  const v = vectors.find((x) => x.path === path);
  if (!v) throw new Error(`no vector for ${path}`);
  return v.out;
};

describe("BIP 85 test vectors", () => {
  it("finds every published path vector, all from the same root key", () => {
    expect(vectors.length).toBeGreaterThanOrEqual(13);
    expect(new Set([...text.matchAll(/MASTER BIP32 ROOT KEY: (xprv\S+)/g)].map((m) => m[1]))).toEqual(new Set([rootKey]));
  });

  it("test cases 1 and 2: the derived key and its 64 bytes of entropy", () => {
    for (const path of ["m/83696968'/0'/0'", "m/83696968'/0'/1'"]) {
      const v = vector(path);
      const d = deriveEntropy(rootKey, path);
      expect(d.derivedKeyHex, path).toBe(v["KEY"]);
      expect(d.entropyHex, path).toBe(v["ENTROPY"]);
    }
  });

  it("BIP85-DRNG: 80 bytes from test case 1's entropy", () => {
    const published = /DRNG\(80 bytes\)=([0-9a-f]+)/.exec(text)![1];
    expect(drng(deriveEntropy(rootKey, "m/83696968'/0'/0'").entropyHex, 80)).toBe(published);
  });

  it("BIP 39: 12, 18 and 24 English words from the first words·32/3 bits", () => {
    for (const words of [12, 18, 24]) {
      const o = bip39Application(rootKey, words, english);
      const v = vector(o.path);
      expect(o.usedHex, o.path).toBe(v["ENTROPY"]);
      expect(o.output, o.path).toBe(v["BIP39 MNEMONIC"]);
      expect(o.usedHex.length * 4).toBe(bip39EntropyBits(words));
    }
  });

  it("HD-seed WIF, XPRV, HEX, Base64 password and dice outputs", () => {
    const wif = wifApplication(rootKey);
    expect([wif.usedHex, wif.output]).toEqual([vector(wif.path)["ENTROPY"], vector(wif.path)["WIF"]]);
    const xprv = xprvApplication(rootKey);
    expect(xprv.output).toBe(vector(xprv.path)["XPRV"]);
    // The vector prints the 32 bytes that become the key: the second half, because BIP 85 puts the chain code first.
    expect(xprv.privateKeyHex).toBe(vector(xprv.path)["ENTROPY"]);
    expect(xprv.chainCodeHex + xprv.privateKeyHex).toBe(xprv.entropyHex);
    const hex = hexApplication(rootKey, 64);
    expect(hex.output).toBe(vector(hex.path)["ENTROPY"]);
    const pwd = base64PasswordApplication(rootKey, 21);
    expect([pwd.entropyHex, pwd.output]).toEqual([vector(pwd.path)["ENTROPY"], vector(pwd.path)["PWD"]]);
    const dice = diceApplication(rootKey, 6, 10);
    expect([dice.entropyHex, dice.output]).toEqual([vector(dice.path)["ENTROPY"], vector(dice.path)["ROLLS"]]);
  });

  it("every application's path starts with the purpose 83696968', the ASCII codes of SEED", () => {
    expect(String.fromCharCode(83, 69, 69, 68)).toBe("SEED");
    expect(String(BIP85_PURPOSE)).toBe("83696968");
    for (const v of vectors) expect(v.path.startsWith("m/83696968'/"), v.path).toBe(true);
  });
});

describe("BIP 85 rules", () => {
  it("requires a root private key and a fully hardened path under the BIP 85 purpose", () => {
    expect(() => deriveEntropy(rootKey, "m/83696968'/0'/0")).toThrow(/hardened/);
    expect(() => deriveEntropy(rootKey, "m/44'/0'/0'")).toThrow(/83696968/);
  });

  it("enforces each application's ranges", () => {
    expect(() => hexApplication(rootKey, 15)).toThrow();
    expect(() => hexApplication(rootKey, 65)).toThrow();
    expect(() => base64PasswordApplication(rootKey, 19)).toThrow();
    expect(() => bip39Application(rootKey, 13, english)).toThrow();
    expect(() => diceApplication(rootKey, 1, 10)).toThrow();
  });

  it("gives different outputs for different indexes and applications from one root", () => {
    const a = bip39Application(rootKey, 12, english, 0), b = bip39Application(rootKey, 12, english, 1);
    expect(a.output).not.toBe(b.output);
    expect(new Set(BIP39_WORD_COUNTS.map((w) => bip39Application(rootKey, w, english).entropyHex)).size).toBe(5);
  });
});

describe("ranges the chapter states", () => {
  it("HEX takes 16 to 64 bytes and the Base64 password 20 to 86 characters", () => {
    expect(() => hexApplication(rootKey, 15)).toThrow();
    expect(() => hexApplication(rootKey, 65)).toThrow();
    expect(hexApplication(rootKey, 16).output).toHaveLength(32);
    expect(hexApplication(rootKey, 64).output).toHaveLength(128);
    expect(() => base64PasswordApplication(rootKey, 19)).toThrow();
    expect(() => base64PasswordApplication(rootKey, 87)).toThrow();
    expect(base64PasswordApplication(rootKey, 20).output).toHaveLength(20);
    expect(base64PasswordApplication(rootKey, 86).output).toHaveLength(86);
  });
});
