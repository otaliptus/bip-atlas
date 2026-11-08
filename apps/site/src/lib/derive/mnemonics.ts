import { bytesToHex, entropyToMnemonic, hexToBytes, mnemonicToSeed, parseWordlist, validLastWords } from "@bip-atlas/models";
import type { DerivedMnemonicFixture, MnemonicFixture } from "@bip-atlas/figures";
import { pinnedText } from "./sources";

let english: string[] | null = null;
const englishWordlist = () => (english ??= parseWordlist(pinnedText("bip-0039/english.txt")));

export function deriveMnemonic(f: MnemonicFixture): DerivedMnemonicFixture {
  const b = entropyToMnemonic(hexToBytes(f.entropyHex), englishWordlist());
  if (b.mnemonic !== f.mnemonic) throw new Error(`${f.id}: model mnemonic differs from the fixture`);
  const vectorSeed = bytesToHex(mnemonicToSeed(f.mnemonic, f.passphrase));
  if (vectorSeed !== f.seedHex) throw new Error(`${f.id}: model seed differs from the published vector`);
  const list = englishWordlist();
  const words = f.mnemonic.split(" ");
  const validIndices = validLastWords(words.slice(0, -1), list);
  const actualIndex = list.indexOf(words.at(-1)!);
  if (validIndices.length !== 2048 >> b.layout.checksumBits) throw new Error(`${f.id}: ${validIndices.length} valid last words, expected 2048 / 2^${b.layout.checksumBits}`);
  if (!validIndices.includes(actualIndex)) throw new Error(`${f.id}: the published last word does not pass its own checksum`);
  return {
    ...f,
    derived: {
      layout: b.layout,
      entropyBits: b.entropyBits,
      hashHex: b.hashHex,
      checksumBits: b.checksumBits,
      groups: b.groups,
      seeds: [
        { passphrase: f.passphrase, seedHex: vectorSeed, origin: "vector" },
        { passphrase: "", seedHex: bytesToHex(mnemonicToSeed(f.mnemonic, "")), origin: "computed" },
      ],
      lastWord: { prefixWords: words.length - 1, validIndices, actualIndex },
      wordlistSample: [0, 1, 2].map((index) => ({ index, word: list[index] })),
      wordlistSize: list.length,
    },
  };
}
