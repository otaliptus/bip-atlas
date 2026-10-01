/**
 * Generic signed message teaching model (BIP 322): the tagged message hash,
 * the two virtual transactions to_spend and to_sign, decoding of "simple"
 * and "full" signatures, and verification through this package's
 * reviewed-opcode interpreter (interpreter.ts), which applies BIP 322's
 * required rules in every script version.
 *
 * Verdicts follow the BIP's verification steps: decoding and structure
 * errors are invalid; a script the interpreter does not cover (an opcode
 * outside its reviewed set, OP_SUCCESSx, an annex, other leaf versions) is
 * inconclusive; a required-rule or script failure is invalid; then the
 * upgradeable rules (to_sign version 0 or 2, reserved NOPs, witness versions
 * above 1) give inconclusive; otherwise valid at time T and age S.
 * Proof-of-funds PSBTs are outside this model and report inconclusive.
 *
 * Verification only: it never signs. Hashing from @noble/hashes, base58 and
 * bech32 from @scure/base; curves and sighashes via the interpreter.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { base64, bech32, bech32m, createBase58check } from "@scure/base";
import { InterpreterScopeError, ScriptError, verifyInput, type InputResult } from "./interpreter";
import { bytesToHex, hexToBytes } from "./hex";
import { tagged } from "./taproot";
import { dsha256, legacySerialization, parseTransaction, type Transaction } from "./tx";

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

/** Verify a signature for (address, message). Returns the BIP's three states. */
export function verify(address: string, message: string, signature: string): Verdict & { toSpend: VirtualTx; toSign: VirtualTx; checked: string } {
  const { spk } = addressScript(address);
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
  const legacyHex = bytesToHex(legacySerialization(tx));
  const sign = { hex: legacyHex, txid: txid(legacyHex) };
  if (tx.inputs.length !== 1) return { state: "invalid", reason: "a full signature cannot carry the UTXOs of additional inputs", toSpend: spend, toSign: sign, checked: "structure" };

  // Steps 2 and 3: scope (inconclusive), then the required rules (invalid).
  let result: InputResult;
  try {
    result = verifyInput({ tx, index: 0, spent: [{ scriptPubKeyHex: spk, amountSats: 0n }] });
  } catch (e) {
    if (e instanceof InterpreterScopeError) return { state: "inconclusive", reason: e.message, toSpend: spend, toSign: sign, checked: "scope" };
    if (e instanceof ScriptError) return { state: "invalid", reason: `invalid signature: ${e.message}`, toSpend: spend, toSign: sign, checked: "script" };
    throw e;
  }
  // Step 4: the upgradeable rules (inconclusive).
  const version = parseInt(rev(tx.versionHex), 16);
  const upgradeable = [...(version === 0 || version === 2 ? [] : ["to_sign version must be 0 or 2"]), ...result.upgradeable.map((u) => `${u} is reserved for upgrades`)];
  if (upgradeable.length) return { state: "inconclusive", reason: upgradeable.join("; "), toSpend: spend, toSign: sign, checked: result.path };
  // Step 5.
  const T = parseInt(rev(tx.locktimeHex), 16), S = parseInt(rev(tx.inputs[0].sequenceHex), 16);
  return { state: "valid", time: T, age: S, toSpend: spend, toSign: sign, checked: result.path };
}
