import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENTROPY_LENGTHS,
  bytesToHex,
  checkMnemonic,
  entropyToMnemonic,
  hexToBytes,
  mnemonicLayout,
  mnemonicToSeed,
  parseWordlist,
  validLastWords,
} from "../src";

const root = new URL("../../../", import.meta.url);
const snapshot = new URL("sources/research-2026-10-01/", root);
const lock = JSON.parse(readFileSync(new URL("sources.lock.json", snapshot), "utf8"));
const wordlistFile = (name: string) => {
  const path = `bip-0039/${name}.txt`;
  const bytes = readFileSync(new URL(`raw/${path}`, snapshot));
  const entry = lock.files.find((f: { path: string }) => f.path === path);
  expect(createHash("sha256").update(bytes).digest("hex"), path).toBe(entry.sha256);
  return parseWordlist(bytes.toString("utf8"));
};
const english = wordlistFile("english");
const trezor = JSON.parse(readFileSync(new URL("sources/external/trezor-python-mnemonic-vectors.json", root), "utf8"));
const japaneseVectors = JSON.parse(readFileSync(new URL("sources/external/bip32JP-test_JP_BIP39.json", root), "utf8"));

describe("BIP39 layout table (BIP39 lines 59–65)", () => {
  it("matches every row", () => {
    const rows = ENTROPY_LENGTHS.map((ent) => {
      const l = mnemonicLayout(ent);
      return [l.entropyBits, l.checksumBits, l.totalBits, l.wordCount];
    });
    expect(rows).toEqual([[128, 4, 132, 12], [160, 5, 165, 15], [192, 6, 198, 18], [224, 7, 231, 21], [256, 8, 264, 24]]);
  });

  it("rejects other lengths", () => {
    for (const bad of [0, 96, 127, 129, 288]) expect(() => mnemonicLayout(bad)).toThrow(RangeError);
  });

  it("puts entropy bits in the final word, not only checksum", () => {
    expect(mnemonicLayout(128).lastWordEntropyBits).toBe(7);
    expect(mnemonicLayout(256).lastWordEntropyBits).toBe(3);
  });
});

describe("pinned English wordlist", () => {
  it("is 2048 sorted, unique words", () => {
    expect(english.length).toBe(2048);
    expect([...english].sort()).toEqual(english);
    expect(new Set(english).size).toBe(2048);
  });

  it("identifies every word by its first four letters", () => {
    expect(new Set(english.map((w) => w.slice(0, 4))).size).toBe(2048);
  });
});

describe("trezor/python-mnemonic English vectors (passphrase TREZOR)", () => {
  for (const [i, [entropyHex, mnemonic, seedHex]] of (trezor.english as string[][]).entries()) {
    it(`vector ${i}: entropy → words → seed`, () => {
      const breakdown = entropyToMnemonic(hexToBytes(entropyHex), english);
      expect(breakdown.mnemonic).toBe(mnemonic);
      expect(checkMnemonic(mnemonic.split(" "), english)).toEqual({ valid: true, reason: null, entropyHex });
      expect(bytesToHex(mnemonicToSeed(mnemonic, "TREZOR"))).toBe(seedHex);
    });
  }
});

describe("bip32JP Japanese vectors (NFKD-heavy passphrases)", () => {
  const japanese = wordlistFile("japanese");
  for (const [i, v] of (japaneseVectors as Array<Record<string, string>>).entries()) {
    it(`vector ${i}: entropy → ideographic-space sentence → seed`, () => {
      // The pinned wordlist is stored in NFKD (BIP39 line 87); the vector file is composed, so compare in NFKD.
      const generated = entropyToMnemonic(hexToBytes(v.entropy), japanese, "　").mnemonic;
      expect(generated.normalize("NFKD")).toBe(v.mnemonic.normalize("NFKD"));
      expect(bytesToHex(mnemonicToSeed(v.mnemonic, v.passphrase))).toBe(v.seed);
    });
  }

  it("needs NFKD: an un-normalized salt gives a different seed", () => {
    const v = japaneseVectors[0];
    expect(v.passphrase.normalize("NFKD")).not.toBe(v.passphrase);
    expect("㍍".normalize("NFKD")).toBe("メートル");
  });
});

describe("teaching properties", () => {
  const zero128 = trezor.english[0];

  it("preserves leading zero bits in entropy", () => {
    const [entropyHex, mnemonic] = trezor.english[20];
    const b = entropyToMnemonic(hexToBytes(entropyHex), english);
    expect(b.entropyBits.startsWith("00000")).toBe(true);
    expect(b.groups[0].bits.startsWith("00000")).toBe(true);
    expect(b.mnemonic).toBe(mnemonic);
  });

  it("splits the 128-bit final word into 7 entropy bits and 4 checksum bits", () => {
    const b = entropyToMnemonic(hexToBytes(zero128[0]), english);
    const last = b.groups.at(-1)!;
    expect([last.entropyBitCount, last.checksumBitCount]).toEqual([7, 4]);
    expect(last.bits.slice(7)).toBe(b.checksumBits);
    expect(b.checksumBits).toBe(parseInt(b.hashHex[0], 16).toString(2).padStart(4, "0"));
  });

  it("lets exactly 1 in 16 final words pass a 12-word checksum, and 1 in 256 for 24 words", () => {
    for (const [vector, expectedValid] of [[trezor.english[12], 128], [trezor.english[20], 8]] as const) {
      const words = (vector[1] as string).split(" ");
      const valid = english.filter((w) => checkMnemonic([...words.slice(0, -1), w], english).valid).length;
      expect(valid).toBe(expectedValid);
    }
  });

  it("gives a different, equally valid seed for every passphrase", () => {
    const [, mnemonic, seedHex] = zero128;
    const empty = bytesToHex(mnemonicToSeed(mnemonic, ""));
    expect(empty).not.toBe(seedHex);
    expect(empty).toHaveLength(128);
  });

  it("reports a bad checksum or unknown word without correcting it", () => {
    const words = zero128[1].split(" ");
    expect(checkMnemonic([...words.slice(0, -1), "abandon"], english).reason).toMatch(/Checksum/);
    expect(checkMnemonic([...words.slice(0, -1), "bitcoin"], english).reason).toMatch(/not in the wordlist/);
    expect(checkMnemonic(words.slice(0, 11), english).valid).toBe(false);
  });
});

describe("mnemonics chapter fixtures", () => {
  const fixtures = JSON.parse(readFileSync(new URL("fixtures/mnemonics.json", root), "utf8")).fixtures;
  it("copy their pinned vectors exactly", () => {
    for (const f of fixtures) {
      const index = Number(f.source.pointer.match(/\d+/)![0]);
      expect([f.entropyHex, f.mnemonic, f.seedHex], f.id).toEqual(trezor.english[index].slice(0, 3));
      expect(f.passphrase).toBe("TREZOR");
    }
  });

  it("offer both 128-bit and 256-bit samples", () => {
    const sizes = new Set(fixtures.map((f: { entropyHex: string }) => f.entropyHex.length * 4));
    expect([...sizes].sort()).toEqual([128, 256]);
  });
});

describe("mnemonics chapter content", () => {
  const chapter = JSON.parse(readFileSync(new URL("content/chapters/mnemonics.json", root), "utf8"));
  it("states lengths in its table exactly as the model computes them", () => {
    const tables = chapter.sections.flatMap((s: any) => s.blocks).flatMap((b: any) => (b.type === "details" ? b.blocks : [b])).filter((b: any) => b.type === "table");
    expect(tables).toHaveLength(1);
    const rows = ENTROPY_LENGTHS.map((ent) => {
      const l = mnemonicLayout(ent);
      return [l.entropyBits, l.checksumBits, l.totalBits, l.wordCount, l.lastWordEntropyBits].map(String);
    });
    expect(tables[0].rows).toEqual(rows);
  });
});

describe("mnemonics worked example", () => {
  it("matches the prose: checksum 0011, eleven × abandon (0), then about (3)", () => {
    const b = entropyToMnemonic(hexToBytes(trezor.english[0][0]), english);
    expect(b.checksumBits).toBe("0011");
    expect(b.groups.slice(0, 11).every((g) => g.index === 0 && g.word === "abandon")).toBe(true);
    expect([b.groups[11].bits, b.groups[11].index, b.groups[11].word]).toEqual(["00000000011", 3, "about"]);
    const text = readFileSync(new URL("content/chapters/mnemonics.json", root), "utf8");
    expect(text).toContain("begin with the bits `0011`");
    expect(text).toContain("seven zeros followed by `0011`: index 3, the word *about*");
  });
});

describe("validLastWords", () => {
  it("12 words: exactly 2048 / 2^4 = 128 last words pass, including the published one", () => {
    const words = (trezor.english[12][1] as string).split(" ");
    const valid = validLastWords(words.slice(0, -1), english);
    expect(valid.length).toBe(128);
    expect(valid).toContain(english.indexOf(words.at(-1)!));
    expect([...valid].sort((a, b) => a - b)).toEqual(valid);
  });
  it("24 words: 2048 / 2^8 = 8 pass", () => {
    const words = (trezor.english[20][1] as string).split(" ");
    expect(words.length).toBe(24);
    expect(validLastWords(words.slice(0, -1), english).length).toBe(8);
  });
});
