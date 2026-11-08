/**
 * BIP 67 teaching model: deterministic P2SH multisig through key sorting.
 *
 * Compressed public keys are sorted by their bytes, left to right, before the
 * standard m-of-n script is built, so a key set and threshold always give one
 * redeem script and one P2SH address. HASH160 comes from ./bip32 (audited
 * @noble/hashes inside); Base58Check from @scure/base. Public test vectors
 * only: it builds scripts and addresses, it never signs.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { createBase58check } from "@scure/base";
import { hash160 } from "./bip32";
import { bytesToHex, hexToBytes } from "./hex";

const base58check = createBase58check(sha256);

export class Bip67Error extends Error {}

/** BIP 67 accepts only compressed keys, and must not compress an uncompressed one silently. */
export function checkCompressedKey(keyHex: string): void {
  if (/^04[0-9a-f]{128}$/.test(keyHex)) throw new Bip67Error("Uncompressed keys are incompatible with BIP 67.");
  if (!/^0[23][0-9a-f]{64}$/.test(keyHex)) throw new Bip67Error("Expected a 33-byte compressed public key in lowercase hex.");
}

/** Index of the first byte at which two equal-length keys differ, or -1 if they are equal. */
export function firstDifference(a: string, b: string): number {
  for (let i = 0; i < a.length; i += 2) if (a.slice(i, i + 2) !== b.slice(i, i + 2)) return i / 2;
  return -1;
}

/** Lexicographic order of the keys' binary form. For equal-length lowercase hex this is string order. */
export const compareKeys = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function sortKeys(keys: readonly string[]): string[] {
  keys.forEach(checkCompressedKey);
  return [...keys].sort(compareKeys);
}

/** The standard multisig script, OP_m <key>… OP_n OP_CHECKMULTISIG, keys in the order given. */
export function multisigScript(m: number, keys: readonly string[]): string {
  const n = keys.length;
  if (!Number.isInteger(m) || m < 1 || m > n || n > 16) throw new Bip67Error("Need 1 ≤ m ≤ n ≤ 16.");
  keys.forEach(checkCompressedKey);
  const small = (k: number) => (0x50 + k).toString(16);
  return small(m) + keys.map((k) => `21${k}`).join("") + small(n) + "ae";
}

/** BIP 16's address for a script: Base58Check of version 0x05 (testnet 0xc4) and HASH160(script). */
export function p2shAddress(scriptHex: string, network: "mainnet" | "testnet" = "mainnet"): { hash160Hex: string; address: string } {
  const h = hash160(hexToBytes(scriptHex));
  return { hash160Hex: bytesToHex(h), address: base58check.encode(Uint8Array.from([network === "mainnet" ? 0x05 : 0xc4, ...h])) };
}

export interface Bip67Multisig {
  sorted: string[];
  scriptHex: string;
  hash160Hex: string;
  address: string;
}

/** BIP 67: sort, build the m-of-n script, hash it to a P2SH address. */
export function bip67Multisig(m: number, keys: readonly string[]): Bip67Multisig {
  const sorted = sortKeys(keys);
  const scriptHex = multisigScript(m, sorted);
  return { sorted, scriptHex, ...p2shAddress(scriptHex) };
}

/** Every ordering of the items, in lexicographic order of their positions. */
export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]));
}
