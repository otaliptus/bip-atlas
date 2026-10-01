/**
 * BIP39 teaching model: entropy → checksum → 11-bit groups → words, and
 * mnemonic sentence (+ passphrase) → 64-byte seed.
 *
 * Hashing comes from the audited @noble/hashes library. The wordlist is passed
 * in by the caller (read from the pinned BIP39 snapshot), so this module never
 * touches the file system or the network. It is meant for public test vectors
 * only: it is not a wallet and must never receive a real recovery phrase.
 */
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "./hex";

export const ENTROPY_LENGTHS = [128, 160, 192, 224, 256] as const;
export const PBKDF2_ITERATIONS = 2048;
export const SEED_BYTES = 64;

export interface MnemonicLayout {
  entropyBits: number;
  checksumBits: number;
  totalBits: number;
  wordCount: number;
  /** How many of the final word's 11 bits are entropy (the rest are checksum). */
  lastWordEntropyBits: number;
}

export function mnemonicLayout(entropyBits: number): MnemonicLayout {
  if (!(ENTROPY_LENGTHS as readonly number[]).includes(entropyBits)) {
    throw new RangeError("Entropy length must be 128, 160, 192, 224, or 256 bits.");
  }
  const checksumBits = entropyBits / 32;
  return {
    entropyBits,
    checksumBits,
    totalBits: entropyBits + checksumBits,
    wordCount: (entropyBits + checksumBits) / 11,
    lastWordEntropyBits: 11 - checksumBits,
  };
}

export function parseWordlist(text: string): string[] {
  const words = text.split("\n").map((w) => w.trim()).filter(Boolean);
  if (words.length !== 2048) throw new RangeError(`A BIP39 wordlist has 2048 words, not ${words.length}.`);
  return words;
}

export interface WordGroup {
  /** 0-based position of the word in the sentence. */
  position: number;
  /** The 11 bits, most significant first. */
  bits: string;
  /** Wordlist index, 0–2047. */
  index: number;
  word: string;
  /** Bits of this group that come from entropy; the rest are checksum bits. */
  entropyBitCount: number;
  checksumBitCount: number;
}

export interface MnemonicBreakdown {
  layout: MnemonicLayout;
  entropyHex: string;
  entropyBits: string;
  /** SHA-256 of the entropy bytes (the checksum is its first `checksumBits` bits). */
  hashHex: string;
  checksumBits: string;
  groups: WordGroup[];
  mnemonic: string;
}

const toBits = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(2).padStart(8, "0")).join("");

export function entropyToMnemonic(entropy: Uint8Array, wordlist: readonly string[], separator = " "): MnemonicBreakdown {
  const layout = mnemonicLayout(entropy.length * 8);
  if (wordlist.length !== 2048) throw new RangeError("Wordlist must have 2048 words.");
  const hash = sha256(entropy);
  const entropyBits = toBits(entropy);
  const checksumBits = toBits(hash).slice(0, layout.checksumBits);
  const all = entropyBits + checksumBits;
  const groups: WordGroup[] = [];
  for (let position = 0; position < layout.wordCount; position++) {
    const start = position * 11;
    const bits = all.slice(start, start + 11);
    const index = parseInt(bits, 2);
    const entropyBitCount = Math.max(0, Math.min(11, layout.entropyBits - start));
    groups.push({ position, bits, index, word: wordlist[index], entropyBitCount, checksumBitCount: 11 - entropyBitCount });
  }
  return {
    layout,
    entropyHex: bytesToHex(entropy),
    entropyBits,
    hashHex: bytesToHex(hash),
    checksumBits,
    groups,
    mnemonic: groups.map((g) => g.word).join(separator),
  };
}

export interface MnemonicCheck {
  valid: boolean;
  reason: string | null;
  entropyHex: string | null;
}

/** Recover entropy from words and check the checksum. Never corrects anything. */
export function checkMnemonic(words: readonly string[], wordlist: readonly string[]): MnemonicCheck {
  const fail = (reason: string): MnemonicCheck => ({ valid: false, reason, entropyHex: null });
  const totalBits = words.length * 11;
  const entropyBits = (totalBits * 32) / 33;
  if (!Number.isInteger(entropyBits) || !(ENTROPY_LENGTHS as readonly number[]).includes(entropyBits)) {
    return fail(`${words.length} words is not a BIP39 sentence length.`);
  }
  let bits = "";
  for (const word of words) {
    const index = wordlist.indexOf(word);
    if (index < 0) return fail(`“${word}” is not in the wordlist.`);
    bits += index.toString(2).padStart(11, "0");
  }
  const entropy = Uint8Array.from(bits.slice(0, entropyBits).match(/.{8}/g)!, (b) => parseInt(b, 2));
  const expected = toBits(sha256(entropy)).slice(0, totalBits - entropyBits);
  if (bits.slice(entropyBits) !== expected) return fail("Checksum bits do not match the SHA-256 of the entropy.");
  return { valid: true, reason: null, entropyHex: bytesToHex(entropy) };
}

const encoder = new TextEncoder();

/** BIP39 seed: PBKDF2-HMAC-SHA512(NFKD(mnemonic), "mnemonic" + NFKD(passphrase), 2048, 64 bytes). */
export function mnemonicToSeed(mnemonic: string, passphrase = ""): Uint8Array {
  const password = encoder.encode(mnemonic.normalize("NFKD"));
  const salt = encoder.encode(("mnemonic" + passphrase).normalize("NFKD"));
  return pbkdf2(sha512, password, salt, { c: PBKDF2_ITERATIONS, dkLen: SEED_BYTES });
}
