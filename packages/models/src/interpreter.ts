/**
 * A reviewed-opcode Script interpreter for BIP 322 verification.
 *
 * Like the P2SH and tapscript recorders, this is NOT a general Script
 * interpreter. It runs one input's spend (scriptSig, scriptPubKey, P2SH redeem
 * script, witness program) through Bitcoin Core's VerifyScript flow, but only
 * executes the opcodes in REVIEWED. Before anything runs, every script the
 * spend would execute is decoded and checked against that set; a script with
 * any other opcode throws InterpreterScopeError, which BIP 322 maps to
 * "inconclusive" (its step 2: a validator without a full interpreter checks
 * that it understands every script being satisfied).
 *
 * Rules applied, beyond consensus:
 * - BIP 322's required rules: SIGHASH_ALL (or SIGHASH_DEFAULT in tapscript and
 *   the taproot key path); no OP_CODESEPARATOR, and no signature that
 *   FindAndDelete would remove from a legacy scriptCode; strict DER, low S and
 *   strict public-key encoding (STRICTENC); NULLFAIL; MINIMALDATA; CLEANSTACK;
 *   MINIMALIF. These apply in every script version. A failure is a script error.
 * - BIP 322's upgradeable rules: reserved NOPs and witness versions above 1 do
 *   not fail the script; they are reported in `upgradeable` so the caller can
 *   output "inconclusive" after the required rules have passed, as the BIP
 *   orders them.
 *
 * Consensus limits enforced: 520-byte elements, 1,000 stack items, 10,000-byte
 * legacy and v0 scripts, 201 counted opcodes, NULLDUMMY, the witness v0 and
 * tapscript clean stack, and the tapscript signature-operation budget.
 *
 * Out of scope (InterpreterScopeError): any opcode not in REVIEWED, OP_SUCCESSx,
 * taproot leaf versions other than 0xc0, annexes, tapscript public keys that are
 * not 32 bytes, non-push scriptSigs, and P2SH-wrapped witness version 1 or higher.
 *
 * Hashing from @noble/hashes, ECDSA and BIP 340 from @noble/curves; signature
 * digests from this package's tested legacy, BIP 143 and BIP 341 models.
 */
import { secp256k1, schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hash160 } from "./bip32";
import { bytesToHex, hexToBytes } from "./hex";
import { decodeScript, legacySighash, witnessProgram } from "./p2sh";
import { SigMsgError, checkControlBlock, compactSize, sigMsg, tapLeafHash, taprootSighash, type SpentOutput } from "./taproot";
import { castToBool, decodeTapscript, encodeNum, isOpSuccess } from "./tapscript";
import { checkLockTimeVerify, checkSequenceVerify, lockFieldsOf } from "./timelock";
import { bip143Digest, type Transaction } from "./tx";

export class InterpreterScopeError extends Error {}
/** A script error: the spend is invalid. */
export class ScriptError extends Error {}

export type SigVersion = "base" | "witness_v0" | "tapscript";

const OP = {
  OP_0: 0x00, OP_PUSHDATA1: 0x4c, OP_PUSHDATA2: 0x4d, OP_PUSHDATA4: 0x4e, OP_1NEGATE: 0x4f, OP_1: 0x51, OP_16: 0x60,
  OP_NOP: 0x61, OP_IF: 0x63, OP_NOTIF: 0x64, OP_ELSE: 0x67, OP_ENDIF: 0x68, OP_VERIFY: 0x69, OP_RETURN: 0x6a,
  OP_DROP: 0x75, OP_DUP: 0x76, OP_EQUAL: 0x87, OP_EQUALVERIFY: 0x88, OP_NUMEQUAL: 0x9c, OP_NUMEQUALVERIFY: 0x9d,
  OP_HASH160: 0xa9, OP_CODESEPARATOR: 0xab, OP_CHECKSIG: 0xac, OP_CHECKSIGVERIFY: 0xad, OP_CHECKMULTISIG: 0xae,
  OP_CHECKMULTISIGVERIFY: 0xaf, OP_NOP1: 0xb0, OP_CHECKLOCKTIMEVERIFY: 0xb1, OP_CHECKSEQUENCEVERIFY: 0xb2,
  OP_NOP4: 0xb3, OP_NOP10: 0xb9, OP_CHECKSIGADD: 0xba,
} as const;

const OP_NAME = new Map<number, string>(Object.entries(OP).map(([k, v]) => [v, k]));
/** Name of an opcode in REVIEWED (OP_NOP4…OP_NOP10 by number); throws for any other opcode. */
export function reviewedOpName(op: number): string {
  const n = OP_NAME.get(op) ?? (op >= OP.OP_NOP1 && op <= OP.OP_NOP10 ? `OP_NOP${op - OP.OP_NOP1 + 1}` : undefined);
  if (!n) throw new RangeError(`no name for opcode ${op}`);
  return n;
}

const RESERVED_NOPS = new Set([OP.OP_NOP1, ...Array.from({ length: OP.OP_NOP10 - OP.OP_NOP4 + 1 }, (_, i) => OP.OP_NOP4 + i)]);
const SMALL_INTS = Array.from({ length: 16 }, (_, i) => OP.OP_1 + i);

/** Non-push opcodes this interpreter executes, per script version. Pushes, OP_0, OP_1NEGATE and OP_1…OP_16 are always in scope. */
export const REVIEWED: Record<SigVersion, ReadonlySet<number>> = (() => {
  const common = [
    OP.OP_NOP, OP.OP_IF, OP.OP_NOTIF, OP.OP_ELSE, OP.OP_ENDIF, OP.OP_VERIFY, OP.OP_RETURN, OP.OP_DROP, OP.OP_DUP,
    OP.OP_EQUAL, OP.OP_EQUALVERIFY, OP.OP_NUMEQUAL, OP.OP_NUMEQUALVERIFY, OP.OP_HASH160, OP.OP_CODESEPARATOR,
    OP.OP_CHECKSIG, OP.OP_CHECKSIGVERIFY, OP.OP_CHECKLOCKTIMEVERIFY, OP.OP_CHECKSEQUENCEVERIFY, ...RESERVED_NOPS,
  ];
  const ecdsa = new Set([...common, OP.OP_CHECKMULTISIG, OP.OP_CHECKMULTISIGVERIFY]);
  return { base: ecdsa, witness_v0: ecdsa, tapscript: new Set([...common, OP.OP_CHECKMULTISIG, OP.OP_CHECKMULTISIGVERIFY, OP.OP_CHECKSIGADD]) };
})();

const MAX_ELEMENT = 520, MAX_STACK = 1000, MAX_SCRIPT = 10_000, MAX_OPS = 201, MAX_PUBKEYS = 20;

interface Op { op: number; dataHex: string | null }

/** Decode a script for `sv`. Returns null if a push runs past the end (a script error when executed). */
function decode(scriptHex: string, sv: SigVersion): Op[] | null {
  if (sv === "tapscript") {
    const d = decodeTapscript(scriptHex);
    if (d.kind === "op-success") throw new InterpreterScopeError(`${d.at.name} makes tapscript succeed unconditionally; this model does not judge it`);
    return d.kind === "ok" ? d.ops : null;
  }
  try { return decodeScript(scriptHex); } catch { return null; }
}

const isPush = (o: Op) => o.dataHex !== null || o.op === OP.OP_1NEGATE || (o.op >= OP.OP_1 && o.op <= OP.OP_16);

/** Throw InterpreterScopeError unless every opcode in the script is in the reviewed set for `sv`. */
export function assertInScope(scriptHex: string, sv: SigVersion): void {
  const ops = decode(scriptHex, sv);
  if (!ops) return; // undecodable: execution fails it
  for (const o of ops) if (!isPush(o) && !REVIEWED[sv].has(o.op)) throw new InterpreterScopeError(`opcode 0x${o.op.toString(16).padStart(2, "0")} is outside this interpreter's reviewed set`);
}

/* ---------- encodings ---------- */

/** Core's CheckMinimalPush: the push must use the shortest opcode for its data. */
function minimalPush(o: Op): boolean {
  const d = o.dataHex!, n = d.length / 2;
  if (n === 0) return o.op === OP.OP_0;
  if (n === 1 && parseInt(d, 16) >= 1 && parseInt(d, 16) <= 16) return false; // should be OP_1…OP_16
  if (n === 1 && d === "81") return false; // should be OP_1NEGATE
  if (n <= 75) return o.op === n;
  if (n <= 255) return o.op === OP.OP_PUSHDATA1;
  if (n <= 65535) return o.op === OP.OP_PUSHDATA2;
  return true;
}

/** CScriptNum with MINIMALDATA: at most `max` bytes, minimally encoded. */
function scriptNum(hex: string, max = 4): bigint {
  const b = hexToBytes(hex);
  if (b.length > max) throw new ScriptError("script number overflow");
  if (b.length && (b[b.length - 1] & 0x7f) === 0 && (b.length === 1 || (b[b.length - 2] & 0x80) === 0)) throw new ScriptError("non-minimally encoded script number");
  let v = 0n;
  for (let i = b.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(i === b.length - 1 ? b[i] & 0x7f : b[i]);
  return b.length && b[b.length - 1] & 0x80 ? -v : v;
}

/** STRICTENC public key: 33 bytes starting 02/03, or 65 bytes starting 04. */
const strictPubkey = (hex: string) => (hex.length === 66 && /^0[23]/.test(hex)) || (hex.length === 130 && hex.startsWith("04"));

/** BIP 66 strict DER (with the hash-type byte appended). */
export function strictDer(sig: Uint8Array): boolean {
  if (sig.length < 9 || sig.length > 73 || sig[0] !== 0x30 || sig[1] !== sig.length - 3) return false;
  const lenR = sig[3];
  if (5 + lenR >= sig.length) return false;
  const lenS = sig[5 + lenR];
  if (lenR + lenS + 7 !== sig.length) return false;
  if (sig[2] !== 0x02 || lenR === 0 || sig[4] & 0x80 || (lenR > 1 && sig[4] === 0 && !(sig[5] & 0x80))) return false;
  if (sig[lenR + 4] !== 0x02 || lenS === 0 || sig[lenR + 6] & 0x80 || (lenS > 1 && sig[lenR + 6] === 0 && !(sig[lenR + 7] & 0x80))) return false;
  return true;
}

/* ---------- the spend ---------- */

export interface InputContext {
  tx: Transaction;
  index: number;
  /** Every output the transaction spends, in input order (BIP 341 needs them all). */
  spent: SpentOutput[];
}

export interface InputResult {
  /** The script path this input took, for display: e.g. "p2sh → p2wsh". */
  path: string;
  /** Upgradeable-rule hits (reserved NOPs, witness version > 1); empty if none. */
  upgradeable: string[];
}

interface Exec { ctx: InputContext; upgradeable: string[]; sv: SigVersion; scriptHex: string; budget: number; tapleafHash: string; annexHex: string | null }

/** CONST_SCRIPTCODE: in a legacy script, a push equal to the signature (OP_0 for an empty one) is what FindAndDelete would remove. */
function assertNoFindAndDelete(e: Exec, sigHex: string) {
  if (e.sv === "base" && decode(e.scriptHex, "base")?.some((o) => o.dataHex === sigHex)) throw new ScriptError("BIP 322 forbids FindAndDelete: the signature appears in the scriptCode");
}

/** Core's CheckSignatureEncoding with BIP 322's rules: empty, or strict DER with low S and SIGHASH_ALL. */
function assertSigEncoding(sigHex: string) {
  const sig = hexToBytes(sigHex);
  if (!sig.length) return;
  if (!strictDer(sig)) throw new ScriptError("signature is not strict DER");
  let highS: boolean;
  try { highS = secp256k1.Signature.fromBytes(sig.slice(0, -1), "der").hasHighS(); } catch { throw new ScriptError("signature is not strict DER"); }
  if (highS) throw new ScriptError("LOW_S: signature S value is not low");
  if (sig[sig.length - 1] !== 0x01) throw new ScriptError("BIP 322 requires SIGHASH_ALL");
}

/** ECDSA check after the encoding checks; returns false for an empty or failing signature. */
function checkEcdsa(e: Exec, sigHex: string, keyHex: string): boolean {
  assertSigEncoding(sigHex);
  if (!strictPubkey(keyHex)) throw new ScriptError("public key is not strictly encoded");
  if (!sigHex) return false;
  const { tx, index, spent } = e.ctx;
  const digest = e.sv === "base"
    ? legacySighash(tx, index, e.scriptHex, 1)
    : bip143Digest(tx, index, bytesToHex(compactSize(e.scriptHex.length / 2)) + e.scriptHex, spent[index].amountSats).sighashHex;
  try { return secp256k1.verify(hexToBytes(sigHex).slice(0, -1), hexToBytes(digest), hexToBytes(keyHex), { prehash: false, format: "der", lowS: true }); } catch { return false; }
}

/** BIP 340 check for the key path (ext = "") or a tapscript (ext = leaf extension). Throws on a non-empty invalid signature. */
function checkSchnorr(e: Exec, sigHex: string, keyHex: string, extHex: string): void {
  const sig = hexToBytes(sigHex);
  if (sig.length !== 64 && sig.length !== 65) throw new ScriptError("Schnorr signature has the wrong size");
  if (sig.length === 65 && sig[64] !== 0x01) throw new ScriptError("BIP 322 requires SIGHASH_ALL or SIGHASH_DEFAULT");
  const { tx, index, spent } = e.ctx;
  let digest: string;
  try { digest = taprootSighash(sigMsg(tx, spent, index, sig.length === 65 ? sig[64] : 0, extHex ? 1 : 0, e.annexHex), extHex); }
  catch (err) { if (err instanceof SigMsgError) throw new ScriptError(err.message); throw err; }
  if (!schnorr.verify(sig.slice(0, 64), hexToBytes(digest), hexToBytes(keyHex))) throw new ScriptError("Schnorr signature does not verify");
}

/** EvalScript for the reviewed opcodes. Mutates and returns `stack`. */
function evalScript(stack: string[], e: Exec): string[] {
  const { sv, scriptHex } = e;
  if (sv !== "tapscript" && scriptHex.length / 2 > MAX_SCRIPT) throw new ScriptError("script is larger than 10,000 bytes");
  const ops = decode(scriptHex, sv);
  if (!ops) throw new ScriptError("a push runs past the end of the script");
  if (stack.length > MAX_STACK) throw new ScriptError("stack larger than 1,000 items");
  const exec: boolean[] = [];
  let opCount = 0;
  const pop = (what: string) => { if (!stack.length) throw new ScriptError(`${what}: stack is empty`); return stack.pop()!; };
  const ext = sv === "tapscript" ? e.tapleafHash + "00" + "ffffffff" : "";
  for (const o of ops) {
    const running = exec.every(Boolean);
    if (o.dataHex !== null && o.dataHex.length / 2 > MAX_ELEMENT) throw new ScriptError("push larger than 520 bytes");
    if (sv !== "tapscript" && o.op > OP.OP_16 && ++opCount > MAX_OPS) throw new ScriptError("more than 201 opcodes");
    if (o.op === OP.OP_CODESEPARATOR) throw new ScriptError("BIP 322 forbids OP_CODESEPARATOR");
    if (running && o.dataHex !== null) {
      if (!minimalPush(o)) throw new ScriptError("MINIMALDATA: push is not minimally encoded");
      stack.push(o.dataHex);
    } else if (!running && ![OP.OP_IF, OP.OP_NOTIF, OP.OP_ELSE, OP.OP_ENDIF].includes(o.op as never)) {
      continue;
    } else if (o.op === OP.OP_1NEGATE || SMALL_INTS.includes(o.op)) {
      stack.push(encodeNum(o.op === OP.OP_1NEGATE ? -1n : BigInt(o.op - 0x50)));
    } else if (o.op === OP.OP_NOP) {
      // nothing
    } else if (RESERVED_NOPS.has(o.op)) {
      e.upgradeable.push(`reserved OP_NOP${o.op === OP.OP_NOP1 ? 1 : o.op - OP.OP_NOP4 + 4}`);
    } else if (o.op === OP.OP_IF || o.op === OP.OP_NOTIF) {
      if (!running) { exec.push(false); continue; }
      const arg = pop("OP_IF");
      if (arg !== "" && arg !== "01") throw new ScriptError("MINIMALIF: the argument must be empty or exactly 0x01");
      exec.push((arg === "01") === (o.op === OP.OP_IF));
    } else if (o.op === OP.OP_ELSE) {
      if (!exec.length) throw new ScriptError("OP_ELSE without OP_IF");
      exec[exec.length - 1] = !exec[exec.length - 1];
    } else if (o.op === OP.OP_ENDIF) {
      if (!exec.length) throw new ScriptError("OP_ENDIF without OP_IF");
      exec.pop();
    } else if (o.op === OP.OP_VERIFY) {
      if (!castToBool(pop("OP_VERIFY"))) throw new ScriptError("OP_VERIFY failed");
    } else if (o.op === OP.OP_RETURN) {
      throw new ScriptError("OP_RETURN");
    } else if (o.op === OP.OP_DROP) {
      pop("OP_DROP");
    } else if (o.op === OP.OP_DUP) {
      const a = pop("OP_DUP");
      stack.push(a, a);
    } else if (o.op === OP.OP_HASH160) {
      stack.push(bytesToHex(hash160(hexToBytes(pop("OP_HASH160")))));
    } else if (o.op === OP.OP_EQUAL || o.op === OP.OP_EQUALVERIFY) {
      const eq = pop("OP_EQUAL") === pop("OP_EQUAL");
      if (o.op === OP.OP_EQUALVERIFY) { if (!eq) throw new ScriptError("OP_EQUALVERIFY failed"); }
      else stack.push(eq ? "01" : "");
    } else if (o.op === OP.OP_NUMEQUAL || o.op === OP.OP_NUMEQUALVERIFY) {
      const eq = scriptNum(pop("OP_NUMEQUAL")) === scriptNum(pop("OP_NUMEQUAL"));
      if (o.op === OP.OP_NUMEQUALVERIFY) { if (!eq) throw new ScriptError("OP_NUMEQUALVERIFY failed"); }
      else stack.push(eq ? "01" : "");
    } else if (o.op === OP.OP_CHECKLOCKTIMEVERIFY || o.op === OP.OP_CHECKSEQUENCEVERIFY) {
      if (!stack.length) throw new ScriptError("lock-time opcode: stack is empty");
      const arg = scriptNum(stack[stack.length - 1], 5);
      const f = lockFieldsOf(e.ctx.tx);
      const r = o.op === OP.OP_CHECKLOCKTIMEVERIFY ? checkLockTimeVerify(arg, f, e.ctx.index) : checkSequenceVerify(arg, f, e.ctx.index);
      if (!r.ok) throw new ScriptError(`${r.opcode} failed: ${r.checks.find((c) => !c.ok)!.label.toLowerCase()}`);
    } else if (o.op === OP.OP_CHECKSIG || o.op === OP.OP_CHECKSIGVERIFY || o.op === OP.OP_CHECKSIGADD) {
      const add = o.op === OP.OP_CHECKSIGADD;
      if (add && sv !== "tapscript") throw new ScriptError("OP_CHECKSIGADD outside tapscript");
      if (stack.length < (add ? 3 : 2)) throw new ScriptError("signature check: too few stack items");
      // Stack: … sig [n] key, key on top.
      const key = stack.pop()!;
      const n = add ? scriptNum(stack.pop()!) : 0n;
      const sig = stack.pop()!;
      let ok: boolean;
      if (sv === "base") assertNoFindAndDelete(e, sig);
      if (sv === "tapscript") {
        if (sig) { e.budget -= 50; if (e.budget < 0) throw new ScriptError("tapscript signature-operation budget exceeded"); }
        if (!key) throw new ScriptError("empty public key in tapscript");
        if (key.length !== 64) throw new InterpreterScopeError("tapscript public keys other than 32 bytes are outside this model");
        if (sig) checkSchnorr(e, sig, key, ext);
        ok = sig !== "";
      } else {
        ok = checkEcdsa(e, sig, key);
        if (!ok && sig) throw new ScriptError("NULLFAIL: a failed signature must be empty");
      }
      if (add) stack.push(encodeNum(n + (ok ? 1n : 0n)));
      else if (o.op === OP.OP_CHECKSIGVERIFY) { if (!ok) throw new ScriptError("OP_CHECKSIGVERIFY failed"); }
      else stack.push(ok ? "01" : "");
    } else if (o.op === OP.OP_CHECKMULTISIG || o.op === OP.OP_CHECKMULTISIGVERIFY) {
      if (sv === "tapscript") throw new ScriptError("OP_CHECKMULTISIG is disabled in tapscript");
      // Mirrors Core's index arithmetic: keys and signatures are both matched from the top of the stack down.
      const top = (k: number) => { if (stack.length < k) throw new ScriptError("OP_CHECKMULTISIG: too few stack items"); return stack[stack.length - k]; };
      let i = 1;
      let nKeys = Number(scriptNum(top(i)));
      if (nKeys < 0 || nKeys > MAX_PUBKEYS) throw new ScriptError("OP_CHECKMULTISIG: bad key count");
      opCount += nKeys;
      if (opCount > MAX_OPS) throw new ScriptError("more than 201 opcodes");
      let ikey = ++i;
      let ikey2 = nKeys + 2;
      i += nKeys;
      let nSigs = Number(scriptNum(top(i)));
      if (nSigs < 0 || nSigs > nKeys) throw new ScriptError("OP_CHECKMULTISIG: bad signature count");
      let isig = ++i;
      i += nSigs;
      if (stack.length < i) throw new ScriptError("OP_CHECKMULTISIG: too few stack items");
      for (let k = 0; k < nSigs; k++) if (sv === "base") assertNoFindAndDelete(e, top(isig + k));
      let success = true;
      while (success && nSigs > 0) {
        if (checkEcdsa(e, top(isig), top(ikey))) { isig++; nSigs--; }
        ikey++; nKeys--;
        if (nSigs > nKeys) success = false;
      }
      while (i-- > 1) {
        if (!success && !ikey2 && stack[stack.length - 1]) throw new ScriptError("NULLFAIL: a failed signature must be empty");
        if (ikey2 > 0) ikey2--;
        stack.pop();
      }
      if (!stack.length) throw new ScriptError("OP_CHECKMULTISIG: missing dummy item");
      if (stack.pop() !== "") throw new ScriptError("NULLDUMMY: the dummy item must be empty");
      if (o.op === OP.OP_CHECKMULTISIGVERIFY) { if (!success) throw new ScriptError("OP_CHECKMULTISIGVERIFY failed"); }
      else stack.push(success ? "01" : "");
    } else {
      throw new InterpreterScopeError(`opcode 0x${o.op.toString(16)} is outside this interpreter's reviewed set`);
    }
    if (stack.length > MAX_STACK) throw new ScriptError("stack larger than 1,000 items");
  }
  if (exec.length) throw new ScriptError("unbalanced conditional");
  return stack;
}

const witnessSize = (w: string[]) => compactSize(w.length).length + w.reduce((n, x) => n + compactSize(x.length / 2).length + x.length / 2, 0);

interface Plan { scripts: { hex: string; sv: SigVersion }[] }

/** Scripts the spend will execute, found before anything runs, so scope is decided first. */
function plan(scriptSigHex: string, spkHex: string, witness: string[]): Plan {
  const scripts: Plan["scripts"] = [{ hex: scriptSigHex, sv: "base" }, { hex: spkHex, sv: "base" }];
  const sigOps = decode(scriptSigHex, "base");
  const p2sh = /^a914[0-9a-f]{40}87$/.test(spkHex);
  if (sigOps && !sigOps.every(isPush)) {
    if (p2sh) throw new ScriptError("P2SH: the scriptSig must be push-only");
    throw new InterpreterScopeError("scriptSigs with non-push opcodes are outside this model");
  }
  let program = witnessProgram(spkHex);
  if (p2sh && sigOps?.length) {
    const redeem = sigOps[sigOps.length - 1].dataHex;
    if (redeem !== null) {
      scripts.push({ hex: redeem, sv: "base" });
      program = witnessProgram(redeem);
      if (program && program.version >= 1) throw new InterpreterScopeError("P2SH-wrapped witness version 1 or higher is outside this model");
    }
  }
  if (program?.version === 0 && program.programHex.length === 64 && witness.length) scripts.push({ hex: witness[witness.length - 1], sv: "witness_v0" });
  if (program?.version === 1 && program.programHex.length === 64) {
    const w = [...witness];
    if (w.length >= 2 && w[w.length - 1].startsWith("50")) throw new InterpreterScopeError("an annex is outside this model");
    if (w.length >= 2) {
      if ((parseInt(w[w.length - 1].slice(0, 2), 16) & 0xfe) !== 0xc0) throw new InterpreterScopeError("taproot leaf versions other than 0xc0 are outside this model");
      scripts.push({ hex: w[w.length - 2], sv: "tapscript" });
    }
  }
  for (const s of scripts) assertInScope(s.hex, s.sv);
  return { scripts };
}

/**
 * Verify input `ctx.index` against its spent output, following Core's
 * VerifyScript with BIP 322's required rules. Returns the path taken and any
 * upgradeable-rule hits; throws ScriptError (invalid) or InterpreterScopeError
 * (inconclusive).
 */
export function verifyInput(ctx: InputContext): InputResult {
  const input = ctx.tx.inputs[ctx.index];
  const spk = ctx.spent[ctx.index].scriptPubKeyHex;
  const witness = ctx.tx.witnesses[ctx.index] ?? [];
  plan(input.scriptSigHex, spk, witness);
  const upgradeable: string[] = [];
  const run = (stack: string[], hex: string, sv: SigVersion, extra: Partial<Exec> = {}) =>
    evalScript(stack, { ctx, upgradeable, sv, scriptHex: hex, budget: 0, tapleafHash: "", annexHex: null, ...extra });

  const stack = run([], input.scriptSigHex, "base");
  const copy = [...stack];
  run(stack, spk, "base");
  if (!stack.length || !castToBool(stack[stack.length - 1])) throw new ScriptError("scriptPubKey left false on the stack");

  let path = "";
  let usedWitness = false;
  const witnessRun = (program: { version: number; programHex: string }, wrapped: boolean) => {
    usedWitness = true;
    path += program.version === 0 ? (program.programHex.length === 40 ? "p2wpkh" : "p2wsh") : program.version === 1 && program.programHex.length === 64 ? "p2tr" : `witness v${program.version}`;
    verifyWitnessProgram(program, witness, wrapped);
    stack.length = 0;
    stack.push("01");
  };
  const verifyWitnessProgram = (program: { version: number; programHex: string }, w: string[], wrapped: boolean) => {
    if (program.version === 0) {
      if (program.programHex.length === 64) {
        if (!w.length) throw new ScriptError("witness program: empty witness");
        const ws = w[w.length - 1];
        if (bytesToHex(sha256(hexToBytes(ws))) !== program.programHex) throw new ScriptError("witness script does not match the program");
        execWitness(w.slice(0, -1), ws, "witness_v0");
      } else if (program.programHex.length === 40) {
        if (w.length !== 2) throw new ScriptError("P2WPKH witness must have exactly two items");
        execWitness(w, `76a914${program.programHex}88ac`, "witness_v0");
      } else throw new ScriptError("witness v0 program has the wrong length");
      return;
    }
    if (program.version === 1 && program.programHex.length === 64 && !wrapped) {
      if (!w.length) throw new ScriptError("taproot: empty witness");
      if (w.length === 1) {
        path += " key path";
        checkSchnorr({ ctx, upgradeable, sv: "tapscript", scriptHex: "", budget: 0, tapleafHash: "", annexHex: null }, w[0], program.programHex, "");
        return;
      }
      path += " script path";
      const control = w[w.length - 1], leaf = w[w.length - 2];
      if (!checkControlBlock(program.programHex, leaf, control).ok) throw new ScriptError("control block does not commit to this script");
      const initial = w.slice(0, -2);
      if (initial.some((x) => x.length / 2 > MAX_ELEMENT)) throw new ScriptError("witness element larger than 520 bytes");
      const out = run(initial, leaf, "tapscript", { budget: 50 + witnessSize(w), tapleafHash: tapLeafHash(0xc0, leaf) });
      if (out.length !== 1 || !castToBool(out[0])) throw new ScriptError("tapscript must leave exactly one true item");
      return;
    }
    // Witness version 2 and above (and other v1 lengths) are unencumbered today: BIP 322's upgradeable rule.
    if (program.version >= 2) { upgradeable.push(`witness version ${program.version}`); return; }
    throw new InterpreterScopeError("this witness program shape is outside this model");
  };
  const execWitness = (items: string[], scriptHex: string, sv: SigVersion) => {
    if (items.some((x) => x.length / 2 > MAX_ELEMENT)) throw new ScriptError("witness element larger than 520 bytes");
    const out = run([...items], scriptHex, sv);
    if (out.length !== 1 || !castToBool(out[0])) throw new ScriptError("witness script must leave exactly one true item");
  };

  const native = witnessProgram(spk);
  if (native) {
    if (input.scriptSigHex !== "") throw new ScriptError("native SegWit requires an empty scriptSig");
    witnessRun(native, false);
  } else if (/^a914[0-9a-f]{40}87$/.test(spk)) {
    path = "p2sh";
    if (!copy.length) throw new ScriptError("P2SH: empty scriptSig");
    stack.length = 0;
    stack.push(...copy);
    const redeem = stack.pop()!;
    run(stack, redeem, "base");
    if (!stack.length || !castToBool(stack[stack.length - 1])) throw new ScriptError("redeem script left false on the stack");
    const wrapped = witnessProgram(redeem);
    if (wrapped) {
      if (input.scriptSigHex !== bytesToHex(compactSize(redeem.length / 2)) + redeem || redeem.length / 2 > 75) throw new ScriptError("P2SH-wrapped SegWit: scriptSig must be exactly one push of the redeem script");
      path += " → ";
      witnessRun(wrapped, true);
    }
  } else {
    path = /^76a914[0-9a-f]{40}88ac$/.test(spk) ? "p2pkh" : "bare script";
  }
  if (stack.length !== 1) throw new ScriptError("CLEANSTACK: exactly one item must remain");
  if (witness.length && !usedWitness) throw new ScriptError("witness supplied for a non-witness spend");
  return { path, upgradeable };
}
