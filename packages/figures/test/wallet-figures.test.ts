import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { masterFromSeed, serialize } from "@bip-atlas/models/bip32";
import { mnemonicToSeed } from "@bip-atlas/models/bip39";
import { bytesToHex } from "@bip-atlas/models/hex";
import { BIP84_VERSIONS, fromAccountXpub, p2trKeyPath, p2wpkh, parseWalletPath, serializeWithVersion, walkPath } from "@bip-atlas/models/walletpaths";
import { WalletDiscovery } from "../src/wallet/WalletDiscovery";
import { WalletExamples } from "../src/wallet/WalletExamples";
import { WalletP2trStory } from "../src/wallet/WalletP2trStory";
import { WalletPathLevels } from "../src/wallet/WalletPathLevels";
import { WalletPathSchemes } from "../src/wallet/WalletPathSchemes";
import { WalletPathWalk } from "../src/wallet/WalletPathWalk";
import { WalletSpendLayouts } from "../src/wallet/WalletSpendLayouts";
import { WalletXpubReach } from "../src/wallet/WalletXpubReach";
import type { DerivedWalletPathFixture, WalletAddressView, WalletPathVectorFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const raw = (p: string) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/${p}`, root), "utf8").split("\n");
const fixtures: WalletPathVectorFixture[] = JSON.parse(readFileSync(new URL("fixtures/wallet-paths.json", root), "utf8")).fixtures;
const b84 = raw("bip-0084.mediawiki");
const master = masterFromSeed(mnemonicToSeed(b84[68].split("=")[1].trim())).key;

/** The values deriveWalletPath computes (derive.ts also checks every published line and throws). */
export function derived(id: string): DerivedWalletPathFixture {
  const f = fixtures.find((x) => x.id === id)!;
  const lines = raw(`bip-${String(f.source.bip).padStart(4, "0")}.mediawiki`);
  const ver = f.scheme === 84 ? BIP84_VERSIONS.mainnet : null;
  const addresses: WalletAddressView[] = f.addresses.map((a) => {
    const w = parseWalletPath(a.path);
    const walk = walkPath(master, a.path);
    const leaf = walk[5].key;
    const output = f.scheme === 84 ? { kind: "p2wpkh" as const, ...p2wpkh(leaf.publicKey) } : f.scheme === 86 ? { kind: "p2tr" as const, ...p2trKeyPath(leaf.publicKey) } : null;
    return {
      path: a.path, label: a.label, change: w.change, index: w.index,
      nodes: walk.map((n) => ({ level: n.level, segment: n.index === null ? "m" : `${n.index}${n.hardened ? "'" : ""}`, index: n.index, hardened: n.hardened, depth: n.depth, parentFingerprintHex: n.key.parentFingerprint.toString(16).padStart(8, "0"), publicKeyHex: bytesToHex(n.key.publicKey) })),
      publicKeyHex: bytesToHex(leaf.publicKey),
      output,
      fromXpubMatches: bytesToHex(fromAccountXpub(walk[3].key, w.change, w.index).publicKey) === bytesToHex(leaf.publicKey),
      checkedLines: Object.values(a.lines),
    };
  });
  const account = walkPath(master, `${f.account.path}/0/0`)[3].key;
  let bip44: DerivedWalletPathFixture["derived"]["bip44"] = null;
  if (f.scheme === 44) {
    const start = lines.indexOf("==Examples==");
    const examples = [];
    for (let i = start; !lines[i].startsWith("|}"); i++) {
      if (!lines[i].startsWith("|m / 44'")) continue;
      const [coin, acc, chain, address] = lines.slice(i - 4, i).map((l) => l.slice(1).trim());
      examples.push({ coin, account: acc, chain, address, path: lines[i].slice(1).replace(/ /g, ""), line: i + 1 });
    }
    const gapAt = lines.findIndex((l) => l.startsWith("Address gap limit is currently set to "));
    bip44 = { examples, gapLimit: Number(/set to (\d+)\./.exec(lines[gapAt])![1]), gapLine: gapAt + 1 };
  }
  return {
    ...f,
    derived: {
      scheme: f.scheme, accountPath: f.account.path,
      accountXpub: ver ? serializeWithVersion(account, "public", ver.public) : serialize(account, "public"),
      accountXpubPublished: f.account.pubLine !== null, addresses, bip44,
    },
  };
}

const html = (n: VNode<any>) => render(n);
const d84 = derived("bip84-vectors"), d86 = derived("bip86-vectors"), d44 = derived("bip44-paths");
const val = (lines: string[], n: number) => lines[n - 1].split("=").slice(1).join("=").trim();
const disclosure = (s: string) => s.slice(s.indexOf("<details"));

describe("derived wallet paths (mirror derive.ts)", () => {
  it("reproduce the published account keys and addresses", () => {
    expect(d84.derived.accountXpub).toBe(val(b84, 75));
    for (const a of d84.derived.addresses) expect(a.output!.address).toBe(val(b84, (a.checkedLines as number[])[1]));
    const b86 = raw("bip-0086.mediawiki");
    expect(d86.derived.accountXpub).toBe(val(b86, 92));
    for (const a of d86.derived.addresses) expect(a.output!.address).toBe(val(b86, (a.checkedLines as number[]).at(-1)!));
  });
  it("read BIP 44's sixteen example paths and its gap limit", () => {
    const t = d44.derived.bip44!;
    expect(t.examples.length).toBe(16);
    expect(t.examples[0]).toMatchObject({ coin: "Bitcoin", account: "first", chain: "external", address: "first", path: "m/44'/0'/0'/0/0", line: 174 });
    expect(t.gapLimit).toBe(20);
    expect(t.gapLine).toBe(124);
  });
});

describe("WalletPathLevels", () => {
  const s = html(h(WalletPathLevels, { fixture: d44 }));
  it("draws the six segments of BIP 44's first example and reads it from the table", () => {
    for (const seg of ["m", "44′", "0′", "0"]) expect(s).toContain(`>${seg}<`);
    expect(s).toContain("BIP 44 LINE 174: BITCOIN, FIRST ACCOUNT,");
    expect(s).toContain("ADDRESS INDEX");
    expect(s.split("k-mark--plain").length - 1).toBe(4);
  });
});

describe("WalletDiscovery", () => {
  const s = html(h(WalletDiscovery, { fixture: d44 }));
  it("uses the gap limit read from BIP 44 and says the history is illustrative", () => {
    expect(s).toContain("20 UNUSED IN A ROW");
    expect(s).toContain("GAP LIMIT 20, AS BIP 44 GAVE IT · LINE 124");
    expect(s).toContain("ILLUSTRATIVE");
    expect(s.split('class="k-story__frame"').length - 1).toBe(3);
  });
});

describe("WalletExamples", () => {
  const s = html(h(WalletExamples, { fixture: d44 }));
  it("draws one leaf per example path and names both coins from the table", () => {
    expect(s.split('class="k-cell ').length - 1).toBe(16);
    expect(s).toContain("16 PATHS IN BIP 44’S TABLE");
    expect(s).toContain("COIN 0′ = BITCOIN, 1′ = BITCOIN TESTNET");
    expect(s.split("k-cell--em").length - 1).toBe(2);
  });
});

describe("WalletPathWalk (hero)", () => {
  const all = [d84, d86, d44];
  const at = (initial?: { fixtureId: string; address: number; step: number }) => html(h(WalletPathWalk, { fixtures: all, figureId: "fig-a12-4", initial }));
  it("no-JS default: BIP 84's first receiving path, every level walked, address from the model", () => {
    const s = at();
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain(d84.derived.addresses[0].output!.address);
    expect(s).toContain("P2WPKH · BIP 84");
    expect(disclosure(s)).toContain(d84.derived.accountXpub);
  });
  it("the account step names the published account key", () => {
    const s = at({ fixtureId: "bip86-vectors", address: 0, step: 3 });
    expect(s).toContain(`account xpub ${d86.derived.accountXpub.slice(0, 12)}…`);
    expect(s).toContain("PUBLISHED IN BIP 86 (LINE 92)");
    expect(s).toContain("HARDENED: NEEDS THE PARENT’S PRIVATE KEY");
  });
  it("the change step is public derivation", () => {
    const s = at({ fixtureId: "bip84-vectors", address: 2, step: 4 });
    expect(s).toContain("PUBLIC: THE PARENT’S XPUB IS ENOUGH");
    expect(s).toContain(`public key ${d84.derived.addresses[2].nodes[4].publicKeyHex.slice(0, 8)}…`);
  });
  it("BIP 44 ends at a key and draws no address", () => {
    const s = at({ fixtureId: "bip44-paths", address: 0, step: 6 });
    expect(s).toContain("BIP 44 NAMES NO SCRIPT TYPE");
    expect(s).not.toMatch(/bc1[qp]/);
    expect(s).toContain("BIP 44 publishes none");
  });
  it("BIP 86 builds the tweak chain to the published address", () => {
    const s = at({ fixtureId: "bip86-vectors", address: 0, step: 6 });
    const o = d86.derived.addresses[0].output!;
    if (o.kind !== "p2tr") throw new Error("expected p2tr");
    expect(disclosure(s)).toContain(o.outputKeyHex);
    expect(s).toContain("P2TR KEY PATH · BIP 86");
  });
});

describe("WalletXpubReach", () => {
  const s = html(h(WalletXpubReach, { fixture: d84 }));
  it("lists every published address, re-derived from the account xpub", () => {
    for (const a of d84.derived.addresses) {
      expect(a.fromXpubMatches).toBe(true);
      expect(disclosure(s)).toContain(a.output!.address);
    }
    expect(s).toContain("= LINE 80");
    expect(s).toContain("= LINE 90");
  });
});

describe("WalletP2trStory", () => {
  const s = html(h(WalletP2trStory, { fixture: d86 }));
  it("drops the parity byte and ends at the published address", () => {
    const a = d86.derived.addresses[0];
    const o = a.output!;
    if (o.kind !== "p2tr") throw new Error("expected p2tr");
    expect(a.publicKeyHex.slice(2)).toBe(o.internalKeyHex);
    expect(disclosure(s)).toContain(o.address);
    expect(s).toContain("MATCHES BIP 86 LINE 100");
    expect(s.split('class="k-story__frame"').length - 1).toBe(4);
  });
});

describe("WalletSpendLayouts", () => {
  it("is schematic: a signature (and a key) in the witness, no values", () => {
    const s = html(h(WalletSpendLayouts, {}));
    expect(s).toContain("scriptSig: empty");
    expect(s).not.toMatch(/[0-9a-f]{8}/);
  });
});

describe("WalletPathSchemes", () => {
  const s = html(h(WalletPathSchemes, { fixtures: [d44, d84, d86] }));
  it("shows three different first receiving keys and the two published addresses", () => {
    for (const f of [d44, d84, d86]) expect(s).toContain(`key ${f.derived.addresses[0].publicKeyHex.slice(0, 6)}…`);
    expect(disclosure(s)).toContain(d84.derived.addresses[0].output!.address);
    expect(disclosure(s)).toContain(d86.derived.addresses[0].output!.address);
    expect(s).toContain("zpub / zprv");
  });
});
