/**
 * Generic signed message teaching model (BIP 322): the tagged message hash,
 * the two virtual transactions to_spend and to_sign, decoding of "simple"
 * and "full" signatures, and verification of the script types this model
 * can check without a script interpreter: P2WPKH, P2TR key path, and P2WSH
 * m-of-n CHECKMULTISIG. Everything else is reported as not checked.
 *
 * Verification only: it never signs. Hashing from @noble/hashes, curves
 * from @noble/curves (ECDSA and BIP 340 verification), base58 and bech32
 * from @scure/base; sighashes from this package's tested BIP 143 and BIP 341
 * models.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base64, bech32, bech32m, createBase58check } from "@scure/base";
import { hash160 } from "./bip32";
import { bytesToHex, hexToBytes } from "./hex";
import { tagged, sigMsg, taprootSighash, verifyKeyPath } from "./taproot";
import { bip143Digest, dsha256, parseTransaction, type Transaction } from "./tx";

const base58check = createBase58check(sha256);
const enc = (s: string) => new TextEncoder().encode(s);
const rev = (hex: string) => hex.match(/../g)!.reverse().join("");
const varint = (n: number) => (n < 0xfd ? n.toString(16).padStart(2, "0") : "fd" + rev(n.toString(16).padStart(4, "0")));
const push = (hex: string) => varint(hex.length / 2) + hex;

export const MESSAGE_TAG = "BIP0322-signed-message";
export class Bip322Error extends Error {}

/** sha256_tag("BIP0322-signed-message", m), m as UTF-8 bytes without prefix or terminator. */
export const messageHash = (message: string) => bytesToHex(tagged(MESSAGE_TAG, enc(message)));

/** scriptPubKey for a mainnet address (P2PKH, P2SH, segwit v0, v1). */
export function addressScript(address: string): { spk: string; kind: "p2pkh" | "p2sh" | "p2wpkh" | "p2wsh" | "p2tr" | "witness" } {
  if (/^bc1/i.test(address)) {
    const lower = address.toLowerCase();
    let d: { words: number[] };
    try { d = bech32.decode(lower as `${string}1${string}`); if (d.words[0] !== 0) throw 0; }
    catch { d = bech32m.decode(lower as `${string}1${string}`); if (d.words[0] === 0) throw new Bip322Error("v0 address with a bech32m checksum"); }
    const v = d.words[0];
    const prog = bytesToHex(Uint8Array.from((v === 0 ? bech32 : bech32m).fromWords(d.words.slice(1))));
    const spk = (v === 0 ? "00" : (0x50 + v).toString(16)) + push(prog);
    const kind = v === 0 ? (prog.length === 40 ? "p2wpkh" : "p2wsh") : v === 1 && prog.length === 64 ? "p2tr" : "witness";
    return { spk, kind };
  }
  const raw = base58check.decode(address);
  const h = bytesToHex(raw.slice(1));
  if (raw[0] === 0x00) return { spk: `76a914${h}88ac`, kind: "p2pkh" };
  if (raw[0] === 0x05) return { spk: `a914${h}87`, kind: "p2sh" };
  throw new Bip322Error("not a mainnet address");
}

const txid = (hexNoWitness: string) => rev(bytesToHex(dsha256(hexToBytes(hexNoWitness))));

export interface VirtualTx { hex: string; txid: string }

/** to_spend: version 0, one input spending 000…000:FFFFFFFF with scriptSig OP_0 PUSH32[message_hash], one 0-value output paying message_challenge. */
export function toSpend(messageHashHex: string, challengeSpk: string): VirtualTx {
  const hex = "00000000" + "01" + "00".repeat(32) + "ffffffff" + push("0020" + messageHashHex) + "00000000" + "01" + "0000000000000000" + push(challengeSpk) + "00000000";
  return { hex, txid: txid(hex) };
}

export interface ToSignParams { version?: number; lockTime?: number; sequence?: number; scriptSig?: string; witness?: string[] }
/** to_sign: one input spending to_spend:0, one 0-value OP_RETURN output. */
export function toSign(toSpendTxid: string, p: ToSignParams = {}): VirtualTx & { witnessHex: string } {
  const le4 = (n: number) => rev((n >>> 0).toString(16).padStart(8, "0"));
  const ins = "01" + rev(toSpendTxid) + "00000000" + push(p.scriptSig ?? "") + le4(p.sequence ?? 0);
  const outs = "01" + "0000000000000000" + "016a";
  const legacy = le4(p.version ?? 0) + ins + outs + le4(p.lockTime ?? 0);
  const w = p.witness ?? [];
  const witnessHex = w.length ? le4(p.version ?? 0) + "0001" + ins + outs + varint(w.length) + w.map(push).join("") + le4(p.lockTime ?? 0) : legacy;
  return { hex: legacy, txid: txid(legacy), witnessHex };
}

export type Variant = "smp" | "ful" | "pof";

export interface DecodedSignature { variant: Variant; prefixed: boolean; witness: string[]; tx: Transaction | null }

/** Decode a witness stack serialized as a vector of vectors. */
export function decodeWitnessStack(b: Uint8Array): string[] {
  let o = 0;
  const cs = () => { const f = b[o++]; if (f === undefined) throw new Bip322Error("signature too short"); if (f < 0xfd) return f; if (f === 0xfd) { const v = b[o] | (b[o + 1] << 8); o += 2; return v; } throw new Bip322Error("witness item too large"); };
  const n = cs();
  const out: string[] = [];
  for (let i = 0; i < n; i++) { const len = cs(); if (o + len > b.length) throw new Bip322Error("signature too short"); out.push(bytesToHex(b.slice(o, o + len))); o += len; }
  if (o !== b.length) throw new Bip322Error("trailing bytes after the witness stack");
  return out;
}

/** Decode a BIP 322 signature string. A missing prefix is read as "simple", as the BIP allows for backward compatibility. */
export function decodeSignature(sig: string): DecodedSignature {
  if (sig.length === 0) throw new Bip322Error("signature too short");
  const pre = sig.slice(0, 3);
  const variant = (["smp", "ful", "pof"] as const).find((v) => v === pre);
  let bytes: Uint8Array;
  try { bytes = base64.decode(variant ? sig.slice(3) : sig); } catch { throw new Bip322Error("error decoding signature as base64"); }
  if (variant === "pof") return { variant, prefixed: true, witness: [], tx: null };
  if (variant === "ful") {
    try { const tx = parseTransaction(bytesToHex(bytes)); return { variant, prefixed: true, witness: tx.witnesses[0] ?? [], tx }; }
    catch { throw new Bip322Error("error parsing signature as full variant"); }
  }
  return { variant: "smp", prefixed: !!variant, witness: decodeWitnessStack(bytes), tx: null };
}

export type Verdict = { state: "valid"; time: number; age: number } | { state: "invalid"; reason: string } | { state: "inconclusive"; reason: string };

const parseMultisig = (ws: string): { m: number; keys: string[] } | null => {
  const b = hexToBytes(ws);
  if (b.length < 3 || b[b.length - 1] !== 0xae) return null;
  const m = b[0] - 0x50, n = b[b.length - 2] - 0x50;
  const keys: string[] = [];
  let o = 1;
  while (o < b.length - 2) { if (b[o] !== 33) return null; keys.push(bytesToHex(b.slice(o + 1, o + 34))); o += 34; }
  return keys.length === n && m >= 1 && m <= n ? { m, keys } : null;
};

function ecdsaOk(sigHex: string, pubHex: string, digestHex: string): boolean {
  const sig = hexToBytes(sigHex);
  if (sig.length < 2 || sig[sig.length - 1] !== 0x01) return false; // SIGHASH_ALL required
  try { return secp256k1.verify(sig.slice(0, -1), hexToBytes(digestHex), hexToBytes(pubHex), { prehash: false, format: "der", lowS: true }); } catch { return false; }
}

/** Verify a signature for (address, message). Returns the BIP's three states. */
export function verify(address: string, message: string, signature: string): Verdict & { toSpend: VirtualTx; toSign: VirtualTx; checked: string } {
  const { spk, kind } = addressScript(address);
  const spend = toSpend(messageHash(message), spk);
  let dec: DecodedSignature;
  try { dec = decodeSignature(signature); } catch (e) { return { state: "invalid", reason: (e as Error).message, toSpend: spend, toSign: toSign(spend.txid), checked: "decoding" }; }
  if (dec.variant === "pof") return { state: "inconclusive", reason: "proof-of-funds PSBTs are outside this model", toSpend: spend, toSign: toSign(spend.txid), checked: "none" };
  let tx: Transaction;
  if (dec.tx) {
    tx = dec.tx;
    const i0 = tx.inputs[0];
    if (!i0 || i0.prevoutHex !== rev(spend.txid) + "00000000") return { state: "invalid", reason: "to_sign does not spend to_spend:0", toSpend: spend, toSign: toSign(spend.txid), checked: "structure" };
    if (tx.outputs.length !== 1 || tx.outputs[0].valueSats !== 0n || tx.outputs[0].scriptPubKeyHex !== "6a") return { state: "invalid", reason: "to_sign must have exactly one 0-value OP_RETURN output", toSpend: spend, toSign: toSign(spend.txid), checked: "structure" };
  } else {
    tx = parseTransaction(toSign(spend.txid, { witness: dec.witness }).witnessHex);
  }
  const sign = { hex: "", txid: "" };
  const legacyHex = (() => { const v = tx.versionHex, lt = tx.locktimeHex; const ins = "01" + tx.inputs.map((i) => i.prevoutHex + push(i.scriptSigHex) + i.sequenceHex).join(""); return v + ins.replace(/^01/, varint(tx.inputs.length)) + varint(tx.outputs.length) + tx.outputs.map((o) => rev(o.valueSats.toString(16).padStart(16, "0")) + push(o.scriptPubKeyHex)).join("") + lt; })();
  sign.hex = legacyHex; sign.txid = txid(legacyHex);
  const version = parseInt(rev(tx.versionHex), 16);
  if (version !== 0 && version !== 2) return { state: "inconclusive", reason: "to_sign version must be 0 or 2", toSpend: spend, toSign: sign, checked: "structure" };
  const w = tx.witnesses[0] ?? [];
  const T = parseInt(rev(tx.locktimeHex), 16), S = parseInt(rev(tx.inputs[0].sequenceHex), 16);
  const valid = { state: "valid" as const, time: T, age: S };
  const bad = (reason: string) => ({ state: "invalid" as const, reason, toSpend: spend, toSign: sign });
  if (tx.inputs.length !== 1) return { state: "inconclusive", reason: "additional inputs are outside this model", toSpend: spend, toSign: sign, checked: "structure" };
  if (kind === "p2wpkh") {
    const h = spk.slice(4);
    if (w.length !== 2 || bytesToHex(hash160(hexToBytes(w[1]))) !== h) return { ...bad("invalid signature: witness does not match the key hash"), checked: "p2wpkh" };
    const d = bip143Digest(tx, 0, `1976a914${h}88ac`, 0n).sighashHex;
    return ecdsaOk(w[0], w[1], d) ? { ...valid, toSpend: spend, toSign: sign, checked: "p2wpkh" } : { ...bad("invalid signature"), checked: "p2wpkh" };
  }
  if (kind === "p2tr") {
    if (w.length !== 1) return { state: "inconclusive", reason: "script-path spends are outside this model", toSpend: spend, toSign: sign, checked: "p2tr" };
    const ok = verifyKeyPath(spk.slice(4), w[0], (ht) => taprootSighash(sigMsg(tx, [{ scriptPubKeyHex: spk, amountSats: 0n }], 0, ht)));
    return ok ? { ...valid, toSpend: spend, toSign: sign, checked: "p2tr key path" } : { ...bad("invalid signature"), checked: "p2tr key path" };
  }
  if (kind === "p2wsh") {
    const ws = w[w.length - 1] ?? "";
    if (bytesToHex(sha256(hexToBytes(ws))) !== spk.slice(4)) return { ...bad("invalid signature: witness script does not match"), checked: "p2wsh" };
    const ms = parseMultisig(ws);
    if (!ms) return { state: "inconclusive", reason: "witness scripts other than m-of-n CHECKMULTISIG are outside this model", toSpend: spend, toSign: sign, checked: "p2wsh" };
    if (w[0] !== "" || w.length !== ms.m + 2) return { ...bad("invalid signature: wrong witness shape for CHECKMULTISIG"), checked: "p2wsh multisig" };
    const d = bip143Digest(tx, 0, push(ws), 0n).sighashHex;
    let k = 0;
    for (const s of w.slice(1, -1)) { while (k < ms.keys.length && !ecdsaOk(s, ms.keys[k], d)) k++; if (k === ms.keys.length) return { ...bad("invalid signature"), checked: "p2wsh multisig" }; k++; }
    return { ...valid, toSpend: spend, toSign: sign, checked: "p2wsh multisig" };
  }
  return { state: "inconclusive", reason: `${kind} needs a script interpreter`, toSpend: spend, toSign: sign, checked: "structure" };
}
