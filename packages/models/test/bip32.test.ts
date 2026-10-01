import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HARDENED,
  bytesToHex,
  ckdPriv,
  ckdPub,
  derivePath,
  hexToBytes,
  masterFromSeed,
  mnemonicToSeed,
  neuter,
  parseExtendedKey,
  parsePath,
  recoverParentPrivateKey,
  serialize,
} from "../src";

const root = new URL("../../../", import.meta.url);
const lines = readFileSync(new URL("sources/research-2026-10-01/raw/bip-0032.mediawiki", root), "utf8").split("\n");

/** Extract BIP32's embedded vectors straight from the pinned text. */
interface Chain { line: number; path: string; xpub: string; xprv: string }
interface Vector { name: string; seedHex: string; chains: Chain[] }
function extractVectors(): { valid: Vector[]; invalid: Array<{ line: number; key: string; reason: string }> } {
  const valid: Vector[] = [];
  const invalid: Array<{ line: number; key: string; reason: string }> = [];
  let current: Vector | null = null;
  let chain: Chain | null = null;
  let inInvalid = false;
  lines.forEach((text, i) => {
    const line = i + 1;
    const heading = /^===(Test vector \d+)===$/.exec(text);
    if (heading) { current = null; inInvalid = heading[1] === "Test vector 5"; if (!inInvalid) { current = { name: heading[1], seedHex: "", chains: [] }; valid.push(current); } return; }
    if (inInvalid) { const m = /^\* (\S+) \((.+)\)$/.exec(text); if (m) invalid.push({ line, key: m[1], reason: m[2] }); return; }
    if (!current) return;
    const seed = /^Seed \(hex\): ([0-9a-f]+)$/.exec(text);
    if (seed) current.seedHex = seed[1];
    const c = /^\* Chain (m.*)$/.exec(text);
    if (c) { chain = { line, path: c[1].replace(/<sub>H<\/sub>/g, "H"), xpub: "", xprv: "" }; current.chains.push(chain); }
    const pub = /^\*\* ext pub: (\S+)$/.exec(text); if (pub && chain) chain.xpub = pub[1];
    const prv = /^\*\* ext prv: (\S+)$/.exec(text); if (prv && chain) chain.xprv = prv[1];
  });
  return { valid, invalid };
}
const { valid, invalid } = extractVectors();

describe("BIP32 embedded vectors", () => {
  it("extracts all of them from the pinned text", () => {
    expect(valid.map((v) => v.chains.length)).toEqual([6, 6, 2, 3]);
    expect(invalid).toHaveLength(16);
  });

  for (const v of valid) {
    for (const c of v.chains) {
      it(`${v.name} ${c.path} (line ${c.line})`, () => {
        const master = masterFromSeed(hexToBytes(v.seedHex)).key;
        const key = derivePath(master, c.path);
        expect(serialize(key, "private")).toBe(c.xprv);
        expect(serialize(key, "public")).toBe(c.xpub);
        // Round trip through the parser.
        expect(serialize(parseExtendedKey(c.xprv).key, "private")).toBe(c.xprv);
        expect(serialize(parseExtendedKey(c.xpub).key, "public")).toBe(c.xpub);
      });
    }
  }

  const expectedMessage: Record<string, RegExp> = {
    "pubkey version / prvkey mismatch": /Public version with private key data/,
    "prvkey version / pubkey mismatch": /Private key data must start with 00/,
    "invalid pubkey prefix 04": /Invalid public key prefix 04/,
    "invalid prvkey prefix 04": /must start with 00, not 04/,
    "invalid pubkey prefix 01": /Invalid public key prefix 01/,
    "invalid prvkey prefix 01": /must start with 00, not 01/,
    "zero depth with non-zero parent fingerprint": /non-zero parent fingerprint/,
    "zero depth with non-zero index": /non-zero index/,
    "unknown extended key version": /Unknown extended key version/,
    "private key 0 not in 1..n-1": /not in 1\.\.n-1/,
    "private key n not in 1..n-1": /not in 1\.\.n-1/,
    "invalid pubkey 020000000000000000000000000000000000000000000000000000000000000007": /not a point on the curve/,
    "invalid checksum": /checksum/,
  };
  for (const bad of invalid) {
    it(`rejects line ${bad.line}: ${bad.reason}`, () => {
      expect(() => parseExtendedKey(bad.key)).toThrow(expectedMessage[bad.reason]);
    });
  }
});

describe("public and hardened derivation", () => {
  const master = masterFromSeed(hexToBytes(valid[0].seedHex)).key;

  it("gives the same public child either way for normal indices (N(CKDpriv) = CKDpub(N))", () => {
    for (const i of [0, 1, 2, 1000000000]) {
      expect(bytesToHex(ckdPub(neuter(master), i).key.publicKey)).toBe(bytesToHex(ckdPriv(master, i).key.publicKey));
      expect(bytesToHex(ckdPub(neuter(master), i).key.chainCode)).toBe(bytesToHex(ckdPriv(master, i).key.chainCode));
    }
  });

  it("refuses hardened children from a public key", () => {
    expect(() => ckdPub(neuter(master), HARDENED)).toThrow(/hardened/);
    expect(() => derivePath(neuter(master), "m/0H")).toThrow(/hardened/);
  });

  it("derives normal children below a hardened node from that node's xpub", () => {
    const account = parseExtendedKey(valid[0].chains[1].xpub).key; // m/0H
    expect(serialize(ckdPub(account, 1).key, "public")).toBe(valid[0].chains[2].xpub); // m/0H/1
  });

  it("recovers a parent private key from its xpub plus a non-hardened child private key", () => {
    const parent = parseExtendedKey(valid[0].chains[1].xpub).key; // m/0H, public only
    const child = parseExtendedKey(valid[0].chains[2].xprv).key; // m/0H/1
    const recovered = recoverParentPrivateKey(parent, child.privateKey!, 1);
    expect(bytesToHex(recovered)).toBe(bytesToHex(parseExtendedKey(valid[0].chains[1].xprv).key.privateKey!));
  });

  it("cannot do the same through a hardened edge", () => {
    expect(() => recoverParentPrivateKey(neuter(master), new Uint8Array(32), HARDENED)).toThrow(/hardened/);
  });

  it("splits HMAC-SHA512(\"Bitcoin seed\", seed) into master key and chain code", () => {
    const { key, iHex } = masterFromSeed(hexToBytes(valid[0].seedHex));
    expect(iHex.slice(0, 64)).toBe(bytesToHex(key.privateKey!));
    expect(iHex.slice(64)).toBe(bytesToHex(key.chainCode));
  });

  it("keeps leading zeros in private keys (vectors 3 and 4 exercise this)", () => {
    const leading = valid.slice(2).flatMap((v) => v.chains.map((c) => parseExtendedKey(c.xprv).key.privateKey!));
    expect(leading.some((k) => k[0] === 0)).toBe(true);
  });

  it("parses paths with H, h or '", () => {
    expect(parsePath("m/0H/1/2'/3h")).toEqual([HARDENED, 1, HARDENED + 2, HARDENED + 3]);
  });
});

describe("BIP39 → BIP32 hand-off", () => {
  it("reproduces the root xprv of all 24 English trezor vectors", () => {
    const trezor = JSON.parse(readFileSync(new URL("sources/external/trezor-python-mnemonic-vectors.json", root), "utf8"));
    expect(trezor.english).toHaveLength(24);
    for (const [, mnemonic, seedHex, xprv] of trezor.english) {
      expect(bytesToHex(mnemonicToSeed(mnemonic, "TREZOR"))).toBe(seedHex);
      expect(serialize(masterFromSeed(hexToBytes(seedHex)).key, "private")).toBe(xprv);
    }
  });
});

describe("hd-wallets chapter fixtures", () => {
  const fixtures = JSON.parse(readFileSync(new URL("fixtures/hd-wallets.json", root), "utf8")).fixtures;
  it("copy their vector chains verbatim from the BIP text", () => {
    for (const f of fixtures) {
      expect(f.seedHex).toBe(valid[0].seedHex);
      for (const c of f.vectorChains) {
        const chain = valid[0].chains.find((x) => x.line === c.line)!;
        expect([c.path, c.xpub, c.xprv]).toEqual([chain.path, chain.xpub, chain.xprv]);
      }
    }
  });
});
