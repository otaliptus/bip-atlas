import { base64PasswordApplication, bip39Application, deriveEntropy, diceApplication, hexApplication, parseWordlist, wifApplication, xprvApplication } from "@bip-atlas/models";
import type { Bip85Derived, Bip85VectorFixture, DerivedBip85Fixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE4, checkSourceQuote, pinnedText } from "./sources";

let english: string[] | null = null;
const englishWordlist = () => (english ??= parseWordlist(pinnedText("bip-0039/english.txt", SNAPSHOT_PHASE4)));

const APP_NAME: Record<Bip85VectorFixture["app"], string> = {
  "test-case": "test case",
  bip39: "BIP 39",
  wif: "WIF",
  xprv: "XPRV",
  hex: "HEX",
  "pwd-base64": "password",
  dice: "dice",
};

/** What each level of the path selects, as BIP 85's path formats name them. */
function levelsOf(f: Bip85VectorFixture): Bip85Derived["levels"] {
  const parts = f.path.split("/").slice(1);
  const p = f.params;
  const middle = { bip39: ["English", `${p.words} words`], hex: [`${p.numBytes} bytes`], "pwd-base64": [`${p.length} characters`], dice: [`${p.sides} sides`, `${p.rolls} rolls`] }[f.app as string] ?? [];
  const meanings = ["BIP 85", APP_NAME[f.app], ...middle, `index ${parts.at(-1)!.replace("'", "")}`];
  if (meanings.length !== parts.length) throw new Error(`${f.id}: the path ${f.path} has ${parts.length} levels, expected ${meanings.length}`);
  return parts.map((value, i) => ({ value, meaning: meanings[i] }));
}

/**
 * A BIP 85 vector recomputed by the model: the root key and path must be the
 * cited lines, and the derived key, entropy and output must equal what the
 * vector prints. BIP 85 prints the bytes BIP 39 and WIF keep, the key half of
 * an XPRV, and all 64 bytes otherwise.
 */
export function deriveBip85(f: Bip85VectorFixture): DerivedBip85Fixture {
  checkSourceQuote(f, SNAPSHOT_PHASE4);
  const lines = pinnedText("bip-0085.mediawiki", SNAPSHOT_PHASE4).split("\n");
  if (!lines[f.source.line! - 2]?.includes(`MASTER BIP32 ROOT KEY: ${f.rootXprv}`)) throw new Error(`${f.id}: the root key is not on the line before the path`);
  for (const [field, line] of Object.entries(f.published.lines)) {
    const value = (f.published as Record<string, unknown>)[field];
    if (typeof value !== "string" || !lines[line - 1]?.includes(`=${value}`)) throw new Error(`${f.id}: published ${field} not on BIP 85 line ${line}`);
  }
  const p = f.params;
  const o =
    f.app === "bip39" ? bip39Application(f.rootXprv, p.words!, englishWordlist())
    : f.app === "wif" ? wifApplication(f.rootXprv)
    : f.app === "xprv" ? xprvApplication(f.rootXprv)
    : f.app === "hex" ? hexApplication(f.rootXprv, p.numBytes!)
    : f.app === "pwd-base64" ? base64PasswordApplication(f.rootXprv, p.length!)
    : f.app === "dice" ? diceApplication(f.rootXprv, p.sides!, p.rolls!)
    : (() => { const d = deriveEntropy(f.rootXprv, f.path); return { ...d, application: "Test case", usedHex: d.entropyHex, output: d.entropyHex }; })();
  if (o.path !== f.path) throw new Error(`${f.id}: the model used ${o.path}, not ${f.path}`);
  const printed = f.app === "bip39" || f.app === "wif" ? o.usedHex : f.app === "xprv" ? o.entropyHex.slice(64) : o.entropyHex;
  if (printed !== f.published.entropy) throw new Error(`${f.id}: entropy differs from BIP 85 line ${f.published.lines.entropy}`);
  if (f.published.derivedKey !== undefined && o.derivedKeyHex !== f.published.derivedKey) throw new Error(`${f.id}: derived key differs from the vector`);
  if (f.published.output !== undefined && o.output !== f.published.output) throw new Error(`${f.id}: output differs from the vector`);
  const uses: Bip85Derived["uses"] =
    f.app === "bip39" ? [{ from: 0, to: o.usedHex.length / 2, as: `entropy for ${p.words} words` }]
    : f.app === "wif" ? [{ from: 0, to: 32, as: "private key" }]
    : f.app === "xprv" ? [{ from: 0, to: 32, as: "chain code" }, { from: 32, to: 64, as: "private key" }]
    : f.app === "hex" ? [{ from: 0, to: p.numBytes!, as: "the hex output" }]
    : f.app === "pwd-base64" ? [{ from: 0, to: 64, as: `Base64, cut to ${p.length} characters` }]
    : f.app === "dice" ? [{ from: 0, to: 64, as: "seed of the DRNG" }]
    : [{ from: 0, to: 64, as: "all 64 bytes" }];
  const outputKind = ({ "test-case": "entropy", bip39: "words", wif: "wif", xprv: "xprv", hex: "hex", "pwd-base64": "password", dice: "rolls" } as const)[f.app];
  return {
    ...f,
    derived: {
      levels: levelsOf(f), derivedKeyHex: o.derivedKeyHex, entropyHex: o.entropyHex, uses, application: o.application, output: o.output, outputKind,
      ...("skipped" in o ? { skipped: o.skipped as number } : {}),
    },
  };
}
