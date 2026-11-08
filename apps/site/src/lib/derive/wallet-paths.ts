import { bytesToHex, masterFromSeed, mnemonicToSeed, serialize, walkPath, p2wpkh, p2trKeyPath, fromAccountXpub, serializeWithVersion, parseWalletPath, BIP84_VERSIONS } from "@bip-atlas/models";
import type { WalletPathVectorFixture, DerivedWalletPathFixture, WalletAddressView } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE3, pinnedText } from "./sources";

let abandonMaster: ReturnType<typeof masterFromSeed>["key"] | null = null;
function walletMaster() {
  if (abandonMaster) return abandonMaster;
  const line = pinnedText("bip-0084.mediawiki", SNAPSHOT_PHASE3).split("\n")[68];
  const mnemonic = line.split("=")[1].trim();
  if (!mnemonic.startsWith("abandon") || !mnemonic.endsWith("about")) throw new Error("BIP 84 mnemonic line moved");
  abandonMaster = masterFromSeed(mnemonicToSeed(mnemonic)).key;
  return abandonMaster;
}

/** BIP 44's examples table (coin, account, chain, address, path per row) and its gap limit, from the pinned text. */
function bip44Tables(lines: string[]) {
  const start = lines.indexOf("==Examples==");
  if (start < 0) throw new Error("BIP 44 examples table moved");
  const examples: Array<{ coin: string; account: string; chain: string; address: string; path: string; line: number }> = [];
  for (let i = start; i < lines.length && !lines[i].startsWith("|}"); i++) {
    if (!lines[i].startsWith("|m / 44'")) continue;
    const [coin, account, chain, address] = lines.slice(i - 4, i).map((l) => l.slice(1).trim());
    const path = lines[i].slice(1).replace(/ /g, "");
    parseWalletPath(path);
    examples.push({ coin, account, chain, address, path, line: i + 1 });
  }
  if (examples.length !== 16) throw new Error(`BIP 44 examples table has ${examples.length} paths, expected 16`);
  const gapAt = lines.findIndex((l) => l.startsWith("Address gap limit is currently set to "));
  const gap = gapAt >= 0 ? /set to (\d+)\./.exec(lines[gapAt]) : null;
  if (!gap) throw new Error("BIP 44 gap limit line moved");
  return { examples, gapLimit: Number(gap[1]), gapLine: gapAt + 1 };
}

export function deriveWalletPath(f: WalletPathVectorFixture): DerivedWalletPathFixture {
  const lines = pinnedText(`bip-${String(f.source.bip).padStart(4, "0")}.mediawiki`, SNAPSHOT_PHASE3).split("\n");
  const value = (n: number) => lines[n - 1].split("=").slice(1).join("=").trim();
  const must = (n: number, got: string, what: string) => {
    if (value(n) !== got) throw new Error(`${f.id}: ${what} ${got} differs from BIP ${f.source.bip} line ${n}`);
  };
  const master = walletMaster();
  const ver = f.scheme === 84 ? BIP84_VERSIONS.mainnet : null;
  const ser = (k: Parameters<typeof serialize>[0], kind: "public" | "private") => (ver ? serializeWithVersion(k, kind, ver[kind]) : serialize(k, kind));
  if (f.root) {
    must(f.root.privLine, ser(master, "private"), "root private key");
    must(f.root.pubLine, ser(master, "public"), "root public key");
  }
  const addresses: WalletAddressView[] = f.addresses.map((a) => {
    const w = parseWalletPath(a.path);
    const walk = walkPath(master, a.path);
    const account = walk[3].key;
    if (a.path.startsWith(f.account.path) && f.account.privLine) {
      must(f.account.privLine, ser(account, "private"), "account private key");
      must(f.account.pubLine!, ser(account, "public"), "account public key");
    }
    const leaf = walk[5].key;
    const L = a.lines;
    let output: WalletAddressView["output"] = null;
    if (f.scheme === 84) {
      must(L.pubkey, bytesToHex(leaf.publicKey), "public key");
      const o = p2wpkh(leaf.publicKey);
      must(L.address, o.address, "address");
      output = { kind: "p2wpkh", ...o };
    } else if (f.scheme === 86) {
      must(L.xprv, serialize(leaf, "private"), "xprv");
      must(L.xpub, serialize(leaf, "public"), "xpub");
      const o = p2trKeyPath(leaf.publicKey);
      must(L.internal, o.internalKeyHex, "internal key");
      must(L.output, o.outputKeyHex, "output key");
      must(L.spk, o.scriptPubKeyHex, "scriptPubKey");
      must(L.address, o.address, "address");
      output = { kind: "p2tr", ...o };
    } else {
      if (!lines[L.path - 1].replace(/[ |]/g, "").includes(a.path)) throw new Error(`${f.id}: ${a.path} is not on BIP 44 line ${L.path}`);
    }
    const viaXpub = fromAccountXpub(account, w.change, w.index);
    return {
      path: a.path,
      label: a.label,
      change: w.change,
      index: w.index,
      nodes: walk.map((n) => ({
        level: n.level,
        segment: n.index === null ? "m" : `${n.index}${n.hardened ? "'" : ""}`,
        index: n.index,
        hardened: n.hardened,
        depth: n.depth,
        parentFingerprintHex: n.key.parentFingerprint.toString(16).padStart(8, "0"),
        publicKeyHex: bytesToHex(n.key.publicKey),
      })),
      publicKeyHex: bytesToHex(leaf.publicKey),
      output,
      fromXpubMatches: bytesToHex(viaXpub.publicKey) === bytesToHex(leaf.publicKey),
      checkedLines: Object.values(L),
    };
  });
  if (!addresses.every((a) => a.fromXpubMatches)) throw new Error(`${f.id}: account xpub does not reproduce the leaves`);
  const account = walkPath(master, `${f.account.path}/0/0`)[3].key;
  return {
    ...f,
    derived: { scheme: f.scheme, accountPath: f.account.path, accountXpub: ser(account, "public"), accountXpubPublished: f.account.pubLine !== null, addresses, bip44: f.scheme === 44 ? bip44Tables(lines) : null },
  };
}
