/**
 * BIP32 teaching model: master key generation, child key derivation (private
 * and public), serialization, parsing with BIP32's validity rules, and the
 * exposure property of non-hardened derivation.
 *
 * Elliptic-curve arithmetic and hashes come from the audited @noble/curves and
 * @noble/hashes libraries; this file only arranges them as BIP32 specifies and
 * exposes intermediate values (HMAC input, I_L, I_R) for figures. Public test
 * vectors only: this is not a wallet.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hmac } from "@noble/hashes/hmac.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { createBase58check } from "@scure/base";
import { bytesToHex, hexToBytes } from "./hex";

const Point = secp256k1.Point;
const N = Point.CURVE().n;
const base58check = createBase58check(sha256);

export const HARDENED = 0x80000000;

export const VERSIONS = {
  mainnet: { public: 0x0488b21e, private: 0x0488ade4 },
  testnet: { public: 0x043587cf, private: 0x04358394 },
} as const;

export interface ExtendedKey {
  depth: number;
  parentFingerprint: number;
  childNumber: number;
  chainCode: Uint8Array;
  /** 32-byte private key, absent for a public-only (neutered) key. */
  privateKey: Uint8Array | null;
  /** 33-byte compressed public key. */
  publicKey: Uint8Array;
}

export class Bip32Error extends Error {}

const ser32 = (i: number) => Uint8Array.from([i >>> 24, (i >>> 16) & 0xff, (i >>> 8) & 0xff, i & 0xff]);
const parse256 = (b: Uint8Array) => BigInt(`0x${bytesToHex(b)}`);
const ser256 = (n: bigint) => hexToBytes(n.toString(16).padStart(64, "0"));
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};
const pointOf = (k: bigint) => Point.BASE.multiply(k).toBytes(true);

export function hash160(bytes: Uint8Array): Uint8Array {
  return ripemd160(sha256(bytes));
}

export function fingerprint(key: ExtendedKey): number {
  const id = hash160(key.publicKey);
  return ((id[0] << 24) | (id[1] << 16) | (id[2] << 8) | id[3]) >>> 0;
}

export const isHardened = (index: number) => index >= HARDENED;

export interface MasterDerivation {
  key: ExtendedKey;
  /** I = HMAC-SHA512(Key = "Bitcoin seed", Data = seed). */
  iHex: string;
}

export function masterFromSeed(seed: Uint8Array): MasterDerivation {
  if (seed.length < 16 || seed.length > 64) throw new Bip32Error("Seed must be 128 to 512 bits.");
  const I = hmac(sha512, new TextEncoder().encode("Bitcoin seed"), seed);
  const IL = I.slice(0, 32);
  const k = parse256(IL);
  if (k === 0n || k >= N) throw new Bip32Error("Invalid master key (probability below 1 in 2^127).");
  return {
    key: { depth: 0, parentFingerprint: 0, childNumber: 0, chainCode: I.slice(32), privateKey: IL, publicKey: pointOf(k) },
    iHex: bytesToHex(I),
  };
}

export interface ChildDerivation {
  key: ExtendedKey;
  hardened: boolean;
  /** HMAC data: 0x00 || ser256(k_par) || ser32(i) when hardened, serP(K_par) || ser32(i) otherwise. */
  dataHex: string;
  iHex: string;
}

/** CKDpriv: private parent → private child. */
export function ckdPriv(parent: ExtendedKey, index: number): ChildDerivation {
  if (!parent.privateKey) throw new Bip32Error("CKDpriv needs a private parent key.");
  const hardened = isHardened(index);
  const data = hardened
    ? concat(Uint8Array.of(0), parent.privateKey, ser32(index))
    : concat(parent.publicKey, ser32(index));
  const I = hmac(sha512, parent.chainCode, data);
  const tweak = parse256(I.slice(0, 32));
  const k = (tweak + parse256(parent.privateKey)) % N;
  if (tweak >= N || k === 0n) throw new Bip32Error("Invalid child; proceed with the next index.");
  return {
    key: {
      depth: parent.depth + 1,
      parentFingerprint: fingerprint(parent),
      childNumber: index,
      chainCode: I.slice(32),
      privateKey: ser256(k),
      publicKey: pointOf(k),
    },
    hardened,
    dataHex: bytesToHex(data),
    iHex: bytesToHex(I),
  };
}

export class HardenedFromPublicError extends Bip32Error {
  constructor(index: number) {
    super(`Index ${index - HARDENED}H is hardened: CKDpub is not defined for it, so no public-only derivation exists.`);
  }
}

/** CKDpub: public parent → public child. Fails for hardened indices, as BIP32 specifies. */
export function ckdPub(parent: ExtendedKey, index: number): ChildDerivation {
  if (isHardened(index)) throw new HardenedFromPublicError(index);
  const data = concat(parent.publicKey, ser32(index));
  const I = hmac(sha512, parent.chainCode, data);
  const tweak = parse256(I.slice(0, 32));
  if (tweak >= N) throw new Bip32Error("Invalid child; proceed with the next index.");
  const child = Point.BASE.multiply(tweak).add(Point.fromBytes(parent.publicKey));
  if (child.is0()) throw new Bip32Error("Invalid child; proceed with the next index.");
  return {
    key: {
      depth: parent.depth + 1,
      parentFingerprint: fingerprint(parent),
      childNumber: index,
      chainCode: I.slice(32),
      privateKey: null,
      publicKey: child.toBytes(true),
    },
    hardened: false,
    dataHex: bytesToHex(data),
    iHex: bytesToHex(I),
  };
}

/** N(): drop the private key, keep the chain code. */
export function neuter(key: ExtendedKey): ExtendedKey {
  return { ...key, privateKey: null };
}

/** Parse "m/0H/1/2'" into indices. Accepts H, h or ' for hardened. */
export function parsePath(path: string): number[] {
  const parts = path.split("/");
  if (parts[0] !== "m" && parts[0] !== "M") throw new Bip32Error("Paths start with m.");
  return parts.slice(1).map((p) => {
    const match = /^(\d+)([Hh']?)$/.exec(p);
    if (!match) throw new Bip32Error(`Bad path element ${p}.`);
    const n = Number(match[1]);
    if (n >= HARDENED) throw new Bip32Error(`Index ${n} is too large.`);
    return match[2] ? n + HARDENED : n;
  });
}

export function formatIndex(index: number): string {
  return isHardened(index) ? `${index - HARDENED}H` : String(index);
}

export function derivePath(master: ExtendedKey, path: string): ExtendedKey {
  return parsePath(path).reduce((key, index) => (key.privateKey ? ckdPriv(key, index) : ckdPub(key, index)).key, master);
}

export function serializeRaw(key: ExtendedKey, kind: "public" | "private", network: keyof typeof VERSIONS = "mainnet"): Uint8Array {
  if (kind === "private" && !key.privateKey) throw new Bip32Error("No private key to serialize.");
  return concat(
    ser32(VERSIONS[network][kind]),
    Uint8Array.of(key.depth),
    ser32(key.parentFingerprint),
    ser32(key.childNumber),
    key.chainCode,
    kind === "private" ? concat(Uint8Array.of(0), key.privateKey!) : key.publicKey,
  );
}

export function serialize(key: ExtendedKey, kind: "public" | "private", network: keyof typeof VERSIONS = "mainnet"): string {
  return base58check.encode(serializeRaw(key, kind, network));
}

export interface ParsedExtendedKey {
  key: ExtendedKey;
  kind: "public" | "private";
  network: keyof typeof VERSIONS;
}

/** Parse and validate per BIP32, including the invalid cases of test vector 5. */
export function parseExtendedKey(text: string): ParsedExtendedKey {
  let raw: Uint8Array;
  try {
    raw = base58check.decode(text);
  } catch {
    throw new Bip32Error("Invalid Base58Check checksum or encoding.");
  }
  if (raw.length !== 78) throw new Bip32Error("Payload is not 78 bytes.");
  const u32 = (o: number) => ((raw[o] << 24) | (raw[o + 1] << 16) | (raw[o + 2] << 8) | raw[o + 3]) >>> 0;
  const version = u32(0);
  let found: { network: keyof typeof VERSIONS; kind: "public" | "private" } | null = null;
  for (const network of Object.keys(VERSIONS) as Array<keyof typeof VERSIONS>) {
    for (const kind of ["public", "private"] as const) if (VERSIONS[network][kind] === version) found = { network, kind };
  }
  if (!found) throw new Bip32Error("Unknown extended key version.");
  const depth = raw[4];
  const parentFingerprint = u32(5);
  const childNumber = u32(9);
  if (depth === 0 && parentFingerprint !== 0) throw new Bip32Error("Zero depth with non-zero parent fingerprint.");
  if (depth === 0 && childNumber !== 0) throw new Bip32Error("Zero depth with non-zero index.");
  const chainCode = raw.slice(13, 45);
  const keyData = raw.slice(45);
  let privateKey: Uint8Array | null = null;
  let publicKey: Uint8Array;
  if (found.kind === "private") {
    if (keyData[0] !== 0) throw new Bip32Error(`Private key data must start with 00, not ${keyData[0].toString(16).padStart(2, "0")}.`);
    privateKey = keyData.slice(1);
    const k = parse256(privateKey);
    if (k === 0n || k >= N) throw new Bip32Error("Private key not in 1..n-1.");
    publicKey = pointOf(k);
  } else {
    if (keyData[0] === 0) throw new Bip32Error("Public version with private key data.");
    if (keyData[0] !== 2 && keyData[0] !== 3) throw new Bip32Error(`Invalid public key prefix ${keyData[0].toString(16).padStart(2, "0")}.`);
    try {
      Point.fromBytes(keyData).assertValidity();
    } catch {
      throw new Bip32Error("Public key is not a point on the curve.");
    }
    publicKey = keyData;
  }
  return { key: { depth, parentFingerprint, childNumber, chainCode, privateKey, publicKey }, ...found };
}

/**
 * BIP32's stated weakness: a parent extended public key plus any non-hardened
 * child private key gives the parent private key, k_par = k_i − I_L (mod n).
 */
export function recoverParentPrivateKey(parentPublic: ExtendedKey, childPrivate: Uint8Array, index: number): Uint8Array {
  if (isHardened(index)) throw new Bip32Error("Not possible for hardened children: I_L depends on the parent private key.");
  const I = hmac(sha512, parentPublic.chainCode, concat(parentPublic.publicKey, ser32(index)));
  const k = (((parse256(childPrivate) - parse256(I.slice(0, 32))) % N) + N) % N;
  return ser256(k);
}
