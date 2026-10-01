import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { masterFromSeed, neuter, serialize } from "../src/bip32";
import { mnemonicToSeed } from "../src/bip39";
import { bytesToHex } from "../src/hex";
import {
  BIP84_VERSIONS,
  formatWalletPath,
  fromAccountXpub,
  p2trKeyPath,
  p2wpkh,
  parseWalletPath,
  serializeWithVersion,
  walkPath,
  WalletPathError,
} from "../src/walletpaths";

const root = new URL("../../../", import.meta.url);
const raw = (p: string) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/${p}`, root), "utf8").split("\n");
const b44 = raw("bip-0044.mediawiki");
const b84 = raw("bip-0084.mediawiki");
const b86 = raw("bip-0086.mediawiki");
/** Value after "name =" on a pinned line. */
const val = (lines: string[], n: number) => lines[n - 1].split("=").slice(1).join("=").trim();

const mnemonic = val(b84, 69);
const master = masterFromSeed(mnemonicToSeed(mnemonic)).key;

describe("path parsing and hardening", () => {
  it("reads BIP 44's five levels and their derivation types", () => {
    expect(b44[33]).toContain("m / purpose' / coin_type' / account' / change / address_index");
    expect(parseWalletPath("m/44'/0'/1'/1/0")).toEqual({ purpose: 44, coinType: 0, account: 1, change: 1, index: 0 });
    expect(formatWalletPath({ purpose: 84, coinType: 1, account: 0, change: 0, index: 5 })).toBe("m/84'/1'/0'/0/5");
  });

  it("rejects paths that break the convention", () => {
    expect(() => parseWalletPath("m/44'/0'/0'/0")).toThrow(WalletPathError);
    expect(() => parseWalletPath("m/44/0'/0'/0/0")).toThrow(/purpose must use hardened/);
    expect(() => parseWalletPath("m/44'/0'/0'/0'/0")).toThrow(/change must use public/);
    expect(() => parseWalletPath("m/44'/0'/0'/2/0")).toThrow(/change must be 0/);
  });

  it("parses every example path BIP 44 publishes", () => {
    const paths = b44.filter((l) => l.startsWith("|m / 44'")).map((l) => l.slice(1).replace(/ /g, ""));
    expect(paths.length).toBe(16);
    for (const p of paths) expect(formatWalletPath(parseWalletPath(p))).toBe(p);
  });
});

describe("BIP 84 published vectors", () => {
  it("root, account and addresses", () => {
    expect(serializeWithVersion(master, "private", BIP84_VERSIONS.mainnet.private)).toBe(val(b84, 70));
    expect(serializeWithVersion(master, "public", BIP84_VERSIONS.mainnet.public)).toBe(val(b84, 71));
    const walk = walkPath(master, "m/84'/0'/0'/0/0");
    const account = walk[3].key;
    expect(serializeWithVersion(account, "private", BIP84_VERSIONS.mainnet.private)).toBe(val(b84, 74));
    expect(serializeWithVersion(account, "public", BIP84_VERSIONS.mainnet.public)).toBe(val(b84, 75));
    const rows = [
      { path: "m/84'/0'/0'/0/0", pub: 79, addr: 80 },
      { path: "m/84'/0'/0'/0/1", pub: 84, addr: 85 },
      { path: "m/84'/0'/0'/1/0", pub: 89, addr: 90 },
    ];
    for (const r of rows) {
      const leaf = walkPath(master, r.path)[5].key;
      expect(bytesToHex(leaf.publicKey)).toBe(val(b84, r.pub));
      expect(p2wpkh(leaf.publicKey).address).toBe(val(b84, r.addr));
    }
  });
});

describe("BIP 86 published vectors", () => {
  it("root, account and addresses", () => {
    expect(val(b86, 86)).toBe(mnemonic);
    expect(serialize(master, "private")).toBe(val(b86, 87));
    expect(serialize(master, "public")).toBe(val(b86, 88));
    const account = walkPath(master, "m/86'/0'/0'/0/0")[3].key;
    expect(serialize(account, "private")).toBe(val(b86, 91));
    expect(serialize(account, "public")).toBe(val(b86, 92));
    for (const [path, first] of [["m/86'/0'/0'/0/0", 95], ["m/86'/0'/0'/0/1", 103], ["m/86'/0'/0'/1/0", 111]] as const) {
      const leaf = walkPath(master, path)[5].key;
      expect(serialize(leaf, "private")).toBe(val(b86, first));
      expect(serialize(leaf, "public")).toBe(val(b86, first + 1));
      const out = p2trKeyPath(leaf.publicKey);
      expect([out.internalKeyHex, out.outputKeyHex, out.scriptPubKeyHex, out.address]).toEqual([val(b86, first + 2), val(b86, first + 3), val(b86, first + 4), val(b86, first + 5)]);
    }
  });
});

describe("address derivation round trips", () => {
  it("the account xpub alone reproduces every published address below it", () => {
    for (const [scheme, lines, enc] of [["84", [80, 85, 90], p2wpkh], ["86", [100, 108, 116], p2trKeyPath]] as const) {
      const xpub = neuter(walkPath(master, `m/${scheme}'/0'/0'/0/0`)[3].key);
      expect(xpub.privateKey).toBeNull();
      const got = [[0, 0], [0, 1], [1, 0]].map(([c, i]) => enc(fromAccountXpub(xpub, c, i).publicKey).address);
      expect(got).toEqual(lines.map((n) => val(scheme === "84" ? b84 : b86, n)));
    }
  });

  it("the same path under another purpose gives unrelated keys: purpose separates the schemes", () => {
    const k84 = walkPath(master, "m/84'/0'/0'/0/0")[5].key.publicKey;
    const k86 = walkPath(master, "m/86'/0'/0'/0/0")[5].key.publicKey;
    const k44 = walkPath(master, "m/44'/0'/0'/0/0")[5].key.publicKey;
    expect(new Set([k84, k86, k44].map(bytesToHex)).size).toBe(3);
  });

  it("the same key could be encoded either way: the path does not choose the script", () => {
    const leaf = walkPath(master, "m/84'/0'/0'/0/0")[5].key;
    expect(p2wpkh(leaf.publicKey).address).toBe(val(b84, 80));
    expect(p2trKeyPath(leaf.publicKey).address.startsWith("bc1p")).toBe(true);
  });
});
