/**
 * BIP 85 teaching model: application entropy from a BIP 32 root key.
 *
 * A fully hardened path below m/83696968' selects a child private key k.
 * HMAC-SHA512 with the key "bip-entropy-from-k" turns k into 64 bytes of
 * entropy, and each application truncates or encodes those bytes its own
 * way. Derivation comes from ./bip32 and ./bip39; HMAC, SHA-512 and SHAKE256
 * from the audited @noble/hashes; Base58Check and Base64 from @scure/base.
 *
 * Only the applications this chapter draws are modelled (BIP 39 English,
 * HD-seed WIF, XPRV, HEX, Base64 passwords and dice). Public test vectors
 * only: this is not a wallet.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { shake256 } from "@noble/hashes/sha3.js";
import { base64, createBase58check } from "@scure/base";
import { HARDENED, derivePath, parseExtendedKey, parsePath, serialize, type ExtendedKey } from "./bip32";
import { entropyToMnemonic } from "./bip39";
import { bytesToHex } from "./hex";

const N = secp256k1.Point.CURVE().n;
const base58check = createBase58check(sha256);

/** The purpose level of every BIP 85 path. */
export const BIP85_PURPOSE = 83696968;
/** The HMAC-SHA512 key; the message is the derived private key k. */
export const BIP85_HMAC_KEY = "bip-entropy-from-k";

export class Bip85Error extends Error {}

export interface Bip85Derivation {
  path: string;
  /** k: the 32-byte private key at the path. */
  derivedKeyHex: string;
  /** HMAC-SHA512(key = "bip-entropy-from-k", msg = k): 64 bytes. */
  entropyHex: string;
}

const rootKey = (root: ExtendedKey | string): ExtendedKey => {
  const key = typeof root === "string" ? parseExtendedKey(root).key : root;
  if (!key.privateKey || key.depth !== 0) throw new Bip85Error("BIP 85 starts from a BIP 32 master root private key.");
  return key;
};

/** The child key at a fully hardened path below m/83696968', and its 64 bytes of entropy. */
export function deriveEntropy(root: ExtendedKey | string, path: string): Bip85Derivation {
  const indices = parsePath(path);
  if (indices[0] !== BIP85_PURPOSE + HARDENED) throw new Bip85Error("BIP 85 paths start m/83696968'.");
  if (indices.some((i) => i < HARDENED)) throw new Bip85Error("Every level of a BIP 85 path is hardened.");
  const k = derivePath(rootKey(root), path).privateKey!;
  const entropy = hmac(sha512, new TextEncoder().encode(BIP85_HMAC_KEY), k);
  return { path, derivedKeyHex: bytesToHex(k), entropyHex: bytesToHex(entropy) };
}

const bytesOf = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));
const validScalar = (b: Uint8Array) => {
  const k = BigInt(`0x${bytesToHex(b)}`);
  if (k === 0n || k >= N) throw new Bip85Error("The derived bytes are not a valid private key; use the next index.");
};
const range = (name: string, v: number, lo: number, hi: number) => {
  if (!Number.isInteger(v) || v < lo || v > hi) throw new Bip85Error(`${name} must be between ${lo} and ${hi}.`);
};

/** Words BIP 85 offers for application 39, and the entropy bits each takes. */
export const BIP39_WORD_COUNTS = [12, 15, 18, 21, 24] as const;
export const bip39EntropyBits = (words: number) => (words * 32) / 3;

export interface Bip85Output extends Bip85Derivation {
  application: string;
  /** The part of the 64 bytes the application uses, before encoding. */
  usedHex: string;
  /** The application's output, as BIP 85's vectors print it. */
  output: string;
}

/** Application 39': the first words·32/3 bits of entropy become a BIP 39 mnemonic (English only here). */
export function bip39Application(root: ExtendedKey | string, words: number, englishWordlist: readonly string[], index = 0): Bip85Output {
  if (!BIP39_WORD_COUNTS.includes(words as (typeof BIP39_WORD_COUNTS)[number])) throw new Bip85Error("BIP 85 offers 12, 15, 18, 21 or 24 words.");
  const d = deriveEntropy(root, `m/${BIP85_PURPOSE}'/39'/0'/${words}'/${index}'`);
  const used = bytesOf(d.entropyHex).slice(0, bip39EntropyBits(words) / 8);
  return { ...d, application: `BIP 39, ${words} English words`, usedHex: bytesToHex(used), output: entropyToMnemonic(used, englishWordlist).mnemonic };
}

/** Application 2': the first 32 bytes as a private key, encoded as a compressed mainnet WIF. */
export function wifApplication(root: ExtendedKey | string, index = 0): Bip85Output {
  const d = deriveEntropy(root, `m/${BIP85_PURPOSE}'/2'/${index}'`);
  const key = bytesOf(d.entropyHex).slice(0, 32);
  validScalar(key);
  const wif = base58check.encode(Uint8Array.from([0x80, ...key, 0x01]));
  return { ...d, application: "HD-seed WIF", usedHex: bytesToHex(key), output: wif };
}

/** Application 32': first 32 bytes the chain code, last 32 bytes the key; depth, fingerprint and child number zero. */
export function xprvApplication(root: ExtendedKey | string, index = 0): Bip85Output & { chainCodeHex: string; privateKeyHex: string } {
  const d = deriveEntropy(root, `m/${BIP85_PURPOSE}'/32'/${index}'`);
  const e = bytesOf(d.entropyHex);
  const chainCode = e.slice(0, 32), privateKey = e.slice(32, 64);
  validScalar(privateKey);
  const publicKey = secp256k1.Point.BASE.multiply(BigInt(`0x${bytesToHex(privateKey)}`)).toBytes(true);
  const xprv = serialize({ depth: 0, parentFingerprint: 0, childNumber: 0, chainCode, privateKey, publicKey }, "private");
  return { ...d, application: "XPRV", usedHex: d.entropyHex, output: xprv, chainCodeHex: bytesToHex(chainCode), privateKeyHex: bytesToHex(privateKey) };
}

/** Application 128169': the first num_bytes bytes (16 to 64) as hex. */
export function hexApplication(root: ExtendedKey | string, numBytes: number, index = 0): Bip85Output {
  range("num_bytes", numBytes, 16, 64);
  const d = deriveEntropy(root, `m/${BIP85_PURPOSE}'/128169'/${numBytes}'/${index}'`);
  const used = d.entropyHex.slice(0, numBytes * 2);
  return { ...d, application: `HEX, ${numBytes} bytes`, usedHex: used, output: used };
}

/** Application 707764': all 64 bytes in Base64, cut to pwd_len characters (20 to 86). */
export function base64PasswordApplication(root: ExtendedKey | string, length: number, index = 0): Bip85Output {
  range("pwd_len", length, 20, 86);
  const d = deriveEntropy(root, `m/${BIP85_PURPOSE}'/707764'/${length}'/${index}'`);
  return { ...d, application: `Password, ${length} Base64 characters`, usedHex: d.entropyHex, output: base64.encode(bytesOf(d.entropyHex)).slice(0, length) };
}

/** BIP85-DRNG-SHAKE256: a SHAKE256 stream seeded with exactly the 64 entropy bytes. */
export function drng(entropyHex: string, bytes: number): string {
  if (entropyHex.length !== 128) throw new Bip85Error("The DRNG takes exactly 64 bytes of BIP 85 entropy.");
  return bytesToHex(shake256(bytesOf(entropyHex), { dkLen: bytes }));
}

/**
 * Application 89101': rolls of an N-sided die from the DRNG. Each trial reads
 * ceil(bits/8) bytes, keeps the top ceil(log2 N) bits and is skipped if it is
 * N or more. Returns the rolls and how many trials were skipped.
 */
export function diceApplication(root: ExtendedKey | string, sides: number, rolls: number, index = 0): Bip85Output & { rolls: number[]; skipped: number } {
  range("sides", sides, 2, 2 ** 32 - 1);
  range("rolls", rolls, 1, 2 ** 32 - 1);
  const d = deriveEntropy(root, `m/${BIP85_PURPOSE}'/89101'/${sides}'/${rolls}'/${index}'`);
  // ceil(log2(sides)) without floating point: the bit length of sides - 1.
  const bits = (sides - 1).toString(2).length;
  const width = Math.ceil(bits / 8);
  const out: number[] = [];
  let skipped = 0;
  let stream = bytesOf(drng(d.entropyHex, width * rolls * 2));
  for (let at = 0; out.length < rolls; at += width) {
    if (at + width > stream.length) stream = bytesOf(drng(d.entropyHex, stream.length * 2));
    const trial = stream.slice(at, at + width).reduce((n, b) => n * 256 + b, 0) >>> 0;
    const value = Math.floor(trial / 2 ** (width * 8 - bits));
    if (value >= sides) skipped++;
    else out.push(value);
  }
  return { ...d, application: `Dice, ${rolls} rolls of a ${sides}-sided die`, usedHex: d.entropyHex, output: out.join(","), rolls: out, skipped };
}
