import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { entropyToMnemonic, mnemonicToSeed, parseWordlist, validLastWords } from "@bip-atlas/models/bip39";
import { bytesToHex, hexToBytes } from "@bip-atlas/models/hex";
import { ChecksumStory } from "../src/mnemonic/ChecksumStory";
import { EntropyBits } from "../src/mnemonic/EntropyBits";
import { LastWordOdds } from "../src/mnemonic/LastWordOdds";
import { MnemonicCard } from "../src/mnemonic/MnemonicCard";
import { MnemonicChain } from "../src/mnemonic/MnemonicChain";
import { PassphraseSeeds } from "../src/mnemonic/PassphraseSeeds";
import { SeedDerivation } from "../src/mnemonic/SeedDerivation";
import { WordlistIndex } from "../src/mnemonic/WordlistIndex";
import type { DerivedMnemonicFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/mnemonics.json", root), "utf8")).fixtures;
const list = parseWordlist(readFileSync(new URL("sources/research-2026-10-01/raw/bip-0039/english.txt", root), "utf8"));

/** The same derivation the site's build performs (derive.ts), so figures see real values. */
export function derived(id: string): DerivedMnemonicFixture {
  const f = fixtures.find((x: { id: string }) => x.id === id);
  const b = entropyToMnemonic(hexToBytes(f.entropyHex), list);
  const words: string[] = f.mnemonic.split(" ");
  return {
    ...f,
    derived: {
      layout: b.layout,
      entropyBits: b.entropyBits,
      hashHex: b.hashHex,
      checksumBits: b.checksumBits,
      groups: b.groups,
      seeds: [
        { passphrase: f.passphrase, seedHex: bytesToHex(mnemonicToSeed(f.mnemonic, f.passphrase)), origin: "vector" },
        { passphrase: "", seedHex: bytesToHex(mnemonicToSeed(f.mnemonic, "")), origin: "computed" },
      ],
      lastWord: { prefixWords: words.length - 1, validIndices: validLastWords(words.slice(0, -1), list), actualIndex: list.indexOf(words.at(-1)!) },
      wordlistSample: [0, 1, 2].map((index) => ({ index, word: list[index] })),
    },
  };
}
// Render any vnode to a string.
const html = (n: VNode<any>) => render(n);
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("MnemonicCard", () => {
  const d = derived("ozone-128");
  const s = html(h(MnemonicCard, { fixture: d }));
  it("engraves all 12 words of the published phrase", () => {
    for (const w of d.mnemonic.split(" ")) expect(s).toContain(`>${w}<`);
  });
  it("labels the first word's index from the model", () => {
    expect(s).toContain(`INDEX ${d.derived.groups[0].index}`);
  });
  it("marks itself public test material", () => expect(s).toContain("PUBLIC TEST VECTOR"));
});

describe("EntropyBits", () => {
  const d = derived("ozone-128");
  const s = html(h(EntropyBits, { fixture: d }));
  it("draws 128 bit cells, ones saturated", () => {
    expect(count(s, 'class="k-cell ')).toBe(128);
    expect(count(s, "k-mark--secret")).toBe([...d.derived.entropyBits].filter((b) => b === "1").length);
  });
  it("shows the same entropy as 32 hex characters", () => {
    expect(s.replace(/<[^>]+>/g, "")).toContain(d.entropyHex.slice(0, 8));
  });
});

describe("ChecksumStory", () => {
  const d = derived("zero-128");
  const s = html(h(ChecksumStory, { fixture: d }));
  it("has four frames", () => expect(count(s, '<li class="k-story__frame">')).toBe(4));
  it("draws the hash's first byte and the checksum bits from the model", () => {
    expect(s).toContain(`>${d.derived.hashHex.slice(0, 2)}<`);
    expect(s).toContain(`>${d.derived.checksumBits}<`);
  });
  it("ends at 132 = 12 × 11", () => expect(s).toContain("132 BITS = 12 × 11"));
});

describe("WordlistIndex", () => {
  const d = derived("ozone-128");
  const s = html(h(WordlistIndex, { fixture: d }));
  it("turns the first group's 11 bits into its index and word", () => {
    expect(s).toContain(`>${d.derived.groups[0].index}<`);
    expect(s).toContain(`>${d.derived.groups[0].word}<`);
    expect(count(s, 'class="k-cell ')).toBeGreaterThanOrEqual(11);
  });
  it("shows the first wordlist entries", () => {
    for (const w of d.derived.wordlistSample) expect(s).toContain(w.word.slice(0, 4));
  });
});

describe("LastWordOdds", () => {
  const d = derived("ozone-128");
  const s = html(h(LastWordOdds, { fixture: d }));
  it("draws all 2048 candidates and fills exactly the valid ones", () => {
    expect(count(s, 'class="k-dot ')).toBe(2048);
    expect(count(s, "k-mark--check")).toBe(d.derived.lastWord.validIndices.length);
  });
  it("states the computed odds", () => expect(s).toContain("128 OF 2,048 PASS · 1 IN 16"));
});

describe("SeedDerivation", () => {
  const d = derived("ozone-128");
  const s = html(h(SeedDerivation, { fixture: d }));
  it("shows all 64 seed bytes of the published vector", () => {
    for (const b of d.seedHex.match(/.{2}/g)!) expect(s).toContain(`>${b}<`);
  });
  it("names the iteration count from the model", () => expect(s).toContain("× 2,048"));
});

describe("PassphraseSeeds", () => {
  const d = derived("ozone-128");
  const s = html(h(PassphraseSeeds, { fixture: d }));
  it("draws both seeds in full", () => {
    for (const seed of d.derived.seeds) expect(s).toContain(`>${seed.seedHex.slice(0, 2)}<`);
    expect(count(s, 'class="k-cell ')).toBe(128);
  });
  it("names both passphrases", () => {
    expect(s).toContain("&quot;TREZOR&quot;");
    expect(s).toContain("EMPTY");
  });
});

describe("MnemonicChain", () => {
  const s = html(h(MnemonicChain, { fixture: derived("ozone-128") }));
  it("names the three steps", () => {
    for (const w of ["ENCODE", "STRETCH", "DERIVE"]) expect(s).toContain(w);
  });
  it("renders a wide and a narrow composition", () => expect(count(s, "<svg")).toBe(2));
});
