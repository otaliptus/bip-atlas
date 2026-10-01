/**
 * Wallet-path teaching model for BIPs 44, 84 and 86: the five-level path
 * convention layered on BIP 32, and the address each scheme builds from the
 * key at the end of it.
 *
 * Derivation is BIP 32 (./bip32, tested against BIP 32's vectors); hashing and
 * curve arithmetic come from audited @noble libraries; bech32/bech32m and
 * base58check encodings from @scure/base. Build-time only: it imports crypto.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bech32, bech32m, createBase58check } from "@scure/base";
import { ckdPriv, ckdPub, hash160, HARDENED, neuter, parsePath, serializeRaw, type ExtendedKey } from "./bip32";
import { bytesToHex } from "./hex";
import { tweakPubkey } from "./taproot";

const base58check = createBase58check(sha256);

export class WalletPathError extends Error {}

/** The five levels BIP 44 defines, in order, with the derivation each uses. */
export const LEVELS = [
  { name: "purpose", hardened: true },
  { name: "coin_type", hardened: true },
  { name: "account", hardened: true },
  { name: "change", hardened: false },
  { name: "address_index", hardened: false },
] as const;
export type LevelName = (typeof LEVELS)[number]["name"];

/** What each purpose value commits a wallet to, as its BIP states it. */
export const SCHEMES = {
  44: { purpose: 44, script: null, note: "BIP 44 fixes the path; it does not name a script type or address format." },
  84: { purpose: 84, script: "p2wpkh", note: "P2WPKH: scriptPubKey 0x0014{20-byte key hash}, bech32 address." },
  86: { purpose: 86, script: "p2tr", note: "P2TR key path: output key = internal key tweaked with no script tree, bech32m address." },
} as const;
export type SchemeId = keyof typeof SCHEMES;

/** BIP 84's alternate extended-key version bytes ("zpub"/"zprv", testnet "vpub"/"vprv"). */
export const BIP84_VERSIONS = {
  mainnet: { public: 0x04b24746, private: 0x04b2430c },
  testnet: { public: 0x045f1cf6, private: 0x045f18bc },
} as const;

export interface WalletPath {
  purpose: number;
  coinType: number;
  account: number;
  change: number;
  index: number;
}

/** Parse `m/purpose'/coin_type'/account'/change/address_index` and check BIP 44's shape. */
export function parseWalletPath(path: string): WalletPath {
  const idx = parsePath(path);
  if (idx.length !== 5) throw new WalletPathError(`a BIP 44 path has 5 levels below m, this one has ${idx.length}`);
  idx.forEach((i, k) => {
    const want = LEVELS[k].hardened;
    if ((i >= HARDENED) !== want) throw new WalletPathError(`${LEVELS[k].name} must use ${want ? "hardened" : "public (non-hardened)"} derivation`);
  });
  const [p, c, a, ch, ix] = idx.map((i) => (i >= HARDENED ? i - HARDENED : i));
  if (ch !== 0 && ch !== 1) throw new WalletPathError("change must be 0 (external) or 1 (internal)");
  return { purpose: p, coinType: c, account: a, change: ch, index: ix };
}

export function formatWalletPath(w: WalletPath): string {
  return `m/${w.purpose}'/${w.coinType}'/${w.account}'/${w.change}/${w.index}`;
}

/** Serialize an extended key with explicit version bytes (BIP 32 layout; e.g. BIP 84's zpub). */
export function serializeWithVersion(key: ExtendedKey, kind: "public" | "private", version: number): string {
  const raw = serializeRaw(key, kind, "mainnet");
  const out = Uint8Array.from(raw);
  new DataView(out.buffer).setUint32(0, version >>> 0, false);
  return base58check.encode(out);
}

export interface P2wpkhOutput {
  keyHashHex: string;
  scriptPubKeyHex: string;
  address: string;
}

/** BIP 84's address step: P2WPKH from a compressed public key. */
export function p2wpkh(publicKey: Uint8Array, hrp: "bc" | "tb" = "bc"): P2wpkhOutput {
  if (publicKey.length !== 33) throw new WalletPathError("P2WPKH needs a 33-byte compressed public key");
  const h = hash160(publicKey);
  return { keyHashHex: bytesToHex(h), scriptPubKeyHex: `0014${bytesToHex(h)}`, address: bech32.encode(hrp, [0, ...bech32.toWords(h)]) };
}

export interface P2trOutput {
  internalKeyHex: string;
  tweakHex: string;
  outputKeyHex: string;
  scriptPubKeyHex: string;
  address: string;
}

/** BIP 86's address step: internal key = lift_x(derived key), tweaked with no script tree. */
export function p2trKeyPath(publicKey: Uint8Array, hrp: "bc" | "tb" = "bc"): P2trOutput {
  if (publicKey.length !== 33) throw new WalletPathError("needs a 33-byte compressed public key");
  // lift_x of the x coordinate: the parity byte is dropped, the even-y point is used.
  const internalKeyHex = bytesToHex(publicKey.slice(1));
  const t = tweakPubkey(internalKeyHex, "");
  const program = Uint8Array.from(t.outputKeyHex.match(/../g)!.map((b) => parseInt(b, 16)));
  return { internalKeyHex, tweakHex: t.tweakHex, outputKeyHex: t.outputKeyHex, scriptPubKeyHex: `5120${t.outputKeyHex}`, address: bech32m.encode(hrp, [1, ...bech32m.toWords(program)]) };
}

export interface WalkNode {
  level: LevelName | "m";
  /** Child index without the hardened offset. */
  index: number | null;
  hardened: boolean;
  depth: number;
  key: ExtendedKey;
}

/** Derive a BIP 44-shaped path from a master private key, keeping every node on the way. */
export function walkPath(master: ExtendedKey, path: string): WalkNode[] {
  if (!master.privateKey || master.depth !== 0) throw new WalletPathError("walk from a master private key");
  parseWalletPath(path);
  const nodes: WalkNode[] = [{ level: "m", index: null, hardened: false, depth: 0, key: master }];
  parsePath(path).forEach((i, k) => {
    const prev = nodes[nodes.length - 1].key;
    const key = ckdPriv(prev, i).key; // a private parent derives hardened and normal children alike
    nodes.push({ level: LEVELS[k].name, index: i >= HARDENED ? i - HARDENED : i, hardened: i >= HARDENED, depth: k + 1, key });
  });
  return nodes;
}

/** What an account extended public key alone yields: every change/index child, by public derivation. */
export function fromAccountXpub(account: ExtendedKey, change: number, index: number): ExtendedKey {
  if (account.depth !== 3) throw new WalletPathError("expected an account-level key (depth 3)");
  const pub = account.privateKey ? neuter(account) : account;
  return ckdPub(ckdPub(pub, change).key, index).key;
}
