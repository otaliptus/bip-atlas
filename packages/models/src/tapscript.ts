/**
 * BIP342 trace recorder for a small, reviewed set of tapscript spends.
 *
 * This is deliberately NOT a general Script interpreter. It supports only the
 * opcodes listed in SUPPORTED and throws TraceScopeError for anything else, so
 * an unsupported rule can never silently succeed. It runs at build time on
 * cases copied from Bitcoin Core's script_assets_test.json, and the build fails
 * unless its verdict matches Core's success/failure label for every witness.
 *
 * Signature checks use the BIP341 signature message with the BIP342 extension,
 * and BIP340 verification from @noble/curves.
 */
import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "./hex";
import { parseTransaction, type Transaction } from "./tx";
import { SigMsgError, checkControlBlock, compactSize, sigMsg, tapLeafHash, taprootSighash, type SpentOutput } from "./taproot";

export class TraceScopeError extends Error {}

/** BIP 342: each input's budget starts at 50 plus its serialized witness size; each non-empty signature checked costs 50. */
export const BUDGET_BASE = 50;
export const SIGOP_COST = 50;

const OP = {
  OP_0: 0x00, OP_PUSHDATA1: 0x4c, OP_PUSHDATA2: 0x4d, OP_PUSHDATA4: 0x4e, OP_1NEGATE: 0x4f,
  OP_NOP: 0x61, OP_IF: 0x63, OP_NOTIF: 0x64, OP_ELSE: 0x67, OP_ENDIF: 0x68, OP_VERIFY: 0x69, OP_RETURN: 0x6a,
  OP_DROP: 0x75, OP_SWAP: 0x7c, OP_EQUAL: 0x87, OP_EQUALVERIFY: 0x88, OP_NOT: 0x91,
  OP_NUMEQUAL: 0x9c, OP_NUMEQUALVERIFY: 0x9d, OP_CODESEPARATOR: 0xab,
  OP_CHECKSIG: 0xac, OP_CHECKSIGVERIFY: 0xad, OP_CHECKMULTISIG: 0xae, OP_CHECKMULTISIGVERIFY: 0xaf, OP_CHECKSIGADD: 0xba,
} as const;
const NAME = new Map<number, string>(Object.entries(OP).map(([k, v]) => [v, k]));

/** Opcodes this recorder implements. Everything else is out of scope. */
export const SUPPORTED: ReadonlySet<number> = new Set([
  OP.OP_0, OP.OP_1NEGATE, ...Array.from({ length: 16 }, (_, i) => 0x51 + i),
  OP.OP_NOP, OP.OP_IF, OP.OP_NOTIF, OP.OP_ELSE, OP.OP_ENDIF, OP.OP_VERIFY, OP.OP_RETURN,
  OP.OP_DROP, OP.OP_SWAP, OP.OP_EQUAL, OP.OP_EQUALVERIFY, OP.OP_NOT, OP.OP_NUMEQUAL, OP.OP_NUMEQUALVERIFY,
  OP.OP_CHECKSIG, OP.OP_CHECKSIGVERIFY, OP.OP_CHECKSIGADD, OP.OP_CHECKMULTISIG, OP.OP_CHECKMULTISIGVERIFY,
]);

/** BIP342: opcodes 80, 98, 126-129, 131-134, 137-138, 141-142, 149-153, 187-254 are OP_SUCCESSx. */
export function isOpSuccess(op: number): boolean {
  return op === 80 || op === 98 || (op >= 126 && op <= 129) || (op >= 131 && op <= 134) || op === 137 || op === 138 ||
    op === 141 || op === 142 || (op >= 149 && op <= 153) || (op >= 187 && op <= 254);
}

export function opName(op: number): string {
  if (op >= 0x51 && op <= 0x60) return `OP_${op - 0x50}`;
  if (isOpSuccess(op)) return `OP_SUCCESS${op}`;
  return NAME.get(op) ?? `opcode ${op}`;
}

export interface DecodedOp {
  /** Opcode position as BIP342 counts it (a push counts as one opcode). */
  position: number;
  op: number;
  name: string;
  /** Pushed data, for push opcodes. */
  dataHex: string | null;
}

export type DecodeResult = { kind: "ok"; ops: DecodedOp[] } | { kind: "op-success"; ops: DecodedOp[]; at: DecodedOp } | { kind: "bad-push"; ops: DecodedOp[] };

/** Decode one opcode at a time, as BIP342 step 2 describes: OP_SUCCESSx wins even over later undecodable bytes. */
export function decodeTapscript(hex: string): DecodeResult {
  const b = hexToBytes(hex);
  const ops: DecodedOp[] = [];
  for (let i = 0; i < b.length; ) {
    const op = b[i++];
    const position = ops.length;
    if (isOpSuccess(op)) {
      const at = { position, op, name: opName(op), dataHex: null };
      ops.push(at);
      return { kind: "op-success", ops, at };
    }
    let len = -1;
    if (op >= 0x01 && op <= 0x4b) len = op;
    else if (op === OP.OP_PUSHDATA1) (len = b[i] ?? -2), (i += 1);
    else if (op === OP.OP_PUSHDATA2) (len = i + 1 < b.length ? b[i] | (b[i + 1] << 8) : -2), (i += 2);
    else if (op === OP.OP_PUSHDATA4) (len = i + 3 < b.length ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 2 ** 24 : -2), (i += 4);
    if (len === -2 || (len >= 0 && i + len > b.length)) return { kind: "bad-push", ops };
    if (len >= 0) {
      ops.push({ position, op, name: op === OP.OP_PUSHDATA1 || op === OP.OP_PUSHDATA2 || op === OP.OP_PUSHDATA4 ? NAME.get(op)! : `push ${len}`, dataHex: bytesToHex(b.slice(i, i + len)) });
      i += len;
    } else {
      ops.push({ position, op, name: opName(op), dataHex: null });
    }
  }
  return { kind: "ok", ops };
}

/* ---------- script numbers and truth ---------- */

export function castToBool(hex: string): boolean {
  const b = hexToBytes(hex);
  for (let i = 0; i < b.length; i++) if (b[i] !== 0) return !(i === b.length - 1 && b[i] === 0x80);
  return false;
}

/** CScriptNum decode (little-endian sign-magnitude), at most `max` bytes; minimal encoding not required. */
export function decodeNum(hex: string, max = 4): bigint | null {
  const b = hexToBytes(hex);
  if (b.length > max) return null;
  if (b.length === 0) return 0n;
  let v = 0n;
  for (let i = b.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(i === b.length - 1 ? b[i] & 0x7f : b[i]);
  return b[b.length - 1] & 0x80 ? -v : v;
}

export function encodeNum(n: bigint): string {
  if (n === 0n) return "";
  const neg = n < 0n;
  let v = neg ? -n : n;
  const out: number[] = [];
  while (v > 0n) (out.push(Number(v & 0xffn)), (v >>= 8n));
  if (out[out.length - 1] & 0x80) out.push(neg ? 0x80 : 0);
  else if (neg) out[out.length - 1] |= 0x80;
  return bytesToHex(Uint8Array.from(out));
}

/* ---------- the trace ---------- */

export type SigCheck = "valid" | "invalid" | "empty" | "unknown-key-type";

export interface TraceStep {
  position: number;
  name: string;
  executed: boolean;
  stackBefore: string[];
  stackAfter: string[];
  note: string;
  sig?: { check: SigCheck; budgetAfter: number; keyBytes: number };
  failed?: boolean;
}

export type FailStage = "bip141" | "commitment" | "decode" | "initial-stack" | "execute" | "final-stack";

export interface Trace {
  scriptHex: string;
  leafVersion: number;
  ops: DecodedOp[];
  initialStack: string[];
  annexHex: string | null;
  witnessBytes: number;
  budgetStart: number;
  steps: TraceStep[];
  valid: boolean;
  failStage: FailStage | null;
  reason: string;
  /** Non-empty signatures checked (each costs 50 budget units). */
  sigOpsCounted: number;
  commitmentOk: boolean;
}

export interface ScriptAssetCase {
  tx: string;
  prevouts: string[];
  index: number;
  success?: { scriptSig: string; witness: string[] };
  failure?: { scriptSig: string; witness: string[] };
  flags: string;
  comment: string;
}

/** Read a serialized CTxOut (8-byte amount, compact-size script). */
export function parsePrevout(hex: string): SpentOutput {
  const b = hexToBytes(hex);
  let amount = 0n;
  for (let i = 7; i >= 0; i--) amount = (amount << 8n) | BigInt(b[i]);
  const first = b[8];
  const [len, off] = first < 0xfd ? [first, 9] : first === 0xfd ? [b[9] | (b[10] << 8), 11] : [-1, 0];
  if (len < 0 || off + len !== b.length) throw new Error("unsupported prevout encoding");
  return { amountSats: amount, scriptPubKeyHex: bytesToHex(b.slice(off)) };
}

const witnessSize = (w: string[]) => compactSize(w.length).length + w.reduce((n, e) => n + compactSize(e.length / 2).length + e.length / 2, 0);

/**
 * Record the tapscript execution of one witness for input `c.index`.
 * Throws TraceScopeError if the spend is not a tapscript spend this recorder covers.
 */
export function traceTapscript(c: ScriptAssetCase, which: "success" | "failure"): Trace {
  const w = c[which]?.witness;
  if (!w) throw new TraceScopeError(`case has no ${which} witness`);
  const tx: Transaction = parseTransaction(c.tx);
  const spent = c.prevouts.map(parsePrevout);
  const spk = spent[c.index].scriptPubKeyHex;
  if (!/^5120[0-9a-f]{64}$/.test(spk)) throw new TraceScopeError("not a taproot output");
  const stack0 = [...w];
  const annexHex = stack0.length >= 2 && stack0[stack0.length - 1].startsWith("50") ? stack0.pop()! : null;
  if (stack0.length < 2) throw new TraceScopeError("not a script path spend");
  const control = stack0.pop()!;
  const scriptHex = stack0.pop()!;
  const leafVersion = parseInt(control.slice(0, 2), 16) & 0xfe;
  if (leafVersion !== 0xc0) throw new TraceScopeError("leaf version is not 0xc0");
  const commitmentOk = checkControlBlock(spk.slice(4), scriptHex, control).ok;
  const scriptSigEmpty = (c[which]!.scriptSig ?? "") === "";
  const budgetStart = BUDGET_BASE + witnessSize(w);
  const base = { scriptHex, leafVersion, initialStack: stack0, annexHex, witnessBytes: witnessSize(w), budgetStart, commitmentOk };
  const steps: TraceStep[] = [];
  let sigOpsCounted = 0;
  const end = (ops: DecodedOp[], valid: boolean, failStage: FailStage | null, reason: string): Trace =>
    ({ ...base, ops, steps, valid, failStage, reason, sigOpsCounted });

  // Scope first: this is a property of the recorder, not a consensus step.
  const decoded = decodeTapscript(scriptHex);
  if (decoded.kind === "ok") {
    for (const o of decoded.ops) if (o.dataHex === null && !SUPPORTED.has(o.op)) throw new TraceScopeError(`${o.name} is outside this recorder's reviewed opcode set`);
  }
  if (!scriptSigEmpty) return end([], false, "bip141", "a native SegWit spend must have an empty scriptSig");
  if (!commitmentOk) return end([], false, "commitment", "the control block does not commit to this script");

  if (decoded.kind === "op-success") return end(decoded.ops, true, null, `${decoded.at.name} found while decoding: validation succeeds without executing anything`);
  if (decoded.kind === "bad-push") return end(decoded.ops, false, "decode", "a push runs past the end of the script");
  const ops = decoded.ops;

  if (stack0.length > 1000 || stack0.some((e) => e.length / 2 > 520)) return end(ops, false, "initial-stack", "initial stack exceeds a resource limit");

  const leafHash = tapLeafHash(leafVersion, scriptHex);
  const ext = leafHash + "00" + "ffffffff";
  const verifySig = (sigHex: string, keyHex: string): boolean => {
    const sig = hexToBytes(sigHex);
    if (sig.length !== 64 && sig.length !== 65) return false;
    if (sig.length === 65 && sig[64] === 0) return false;
    try {
      const items = sigMsg(tx, spent, c.index, sig.length === 65 ? sig[64] : 0, 1, annexHex);
      return schnorr.verify(sig.slice(0, 64), hexToBytes(taprootSighash(items, ext)), hexToBytes(keyHex));
    } catch (e) {
      if (e instanceof SigMsgError) return false;
      throw e;
    }
  };

  const stack = [...stack0];
  const exec: boolean[] = [];
  let budget = budgetStart;
  const running = () => exec.every(Boolean);
  for (const o of ops) {
    const before = [...stack];
    const executed = running() || o.op === OP.OP_IF || o.op === OP.OP_NOTIF || o.op === OP.OP_ELSE || o.op === OP.OP_ENDIF;
    const step: TraceStep = { position: o.position, name: o.dataHex !== null ? `<${o.dataHex.length / 2}-byte push>` : o.name, executed, stackBefore: before, stackAfter: before, note: "" };
    steps.push(step);
    const fail = (why: string): Trace => {
      step.failed = true;
      step.note = why;
      step.stackAfter = before;
      return end(ops, false, "execute", why);
    };
    // Core checks every push against the 520-byte limit, executed or not.
    if (o.dataHex !== null && o.dataHex.length / 2 > 520) return fail("push larger than 520 bytes");
    if (!executed) {
      step.note = "in an unexecuted branch: skipped";
      continue;
    }
    if (o.dataHex !== null) {
      stack.push(o.dataHex);
      step.note = o.dataHex.length ? `push ${o.dataHex.length / 2} byte${o.dataHex.length === 2 ? "" : "s"}` : "push the empty vector";
    } else if (o.op === OP.OP_0) {
      stack.push("");
      step.note = "push the empty vector";
    } else if (o.op === OP.OP_1NEGATE || (o.op >= 0x51 && o.op <= 0x60)) {
      const n = o.op === OP.OP_1NEGATE ? -1n : BigInt(o.op - 0x50);
      stack.push(encodeNum(n));
      step.note = `push the number ${n}`;
    } else if (o.op === OP.OP_NOP) {
      step.note = "does nothing";
    } else if (o.op === OP.OP_IF || o.op === OP.OP_NOTIF) {
      if (!running()) {
        exec.push(false);
        step.note = "nested in an unexecuted branch";
      } else {
        if (stack.length < 1) return fail(`${o.name} needs an argument`);
        const arg = stack.pop()!;
        if (arg !== "" && arg !== "01") return fail(`MINIMALIF: the argument must be empty or exactly 0x01, not a ${arg.length / 2}-byte value`);
        const take = (arg === "01") === (o.op === OP.OP_IF);
        exec.push(take);
        step.note = take ? "condition met: run the branch" : "condition not met: skip to ELSE";
      }
    } else if (o.op === OP.OP_ELSE) {
      if (!exec.length) return fail("OP_ELSE without OP_IF");
      exec[exec.length - 1] = !exec[exec.length - 1];
      step.note = "switch branch";
    } else if (o.op === OP.OP_ENDIF) {
      if (!exec.length) return fail("OP_ENDIF without OP_IF");
      exec.pop();
      step.note = "end of conditional";
    } else if (o.op === OP.OP_RETURN) {
      return fail("OP_RETURN: fail immediately");
    } else if (o.op === OP.OP_CHECKMULTISIG || o.op === OP.OP_CHECKMULTISIGVERIFY) {
      return fail(`${o.name} is disabled in tapscript: fail immediately`);
    } else if (o.op === OP.OP_VERIFY) {
      if (!stack.length) return fail("OP_VERIFY needs an argument");
      if (!castToBool(stack.pop()!)) return fail("OP_VERIFY: top of stack is false");
      step.note = "true: continue";
    } else if (o.op === OP.OP_DROP) {
      if (!stack.length) return fail("OP_DROP needs an argument");
      stack.pop();
      step.note = "drop the top element";
    } else if (o.op === OP.OP_SWAP) {
      if (stack.length < 2) return fail("OP_SWAP needs two elements");
      const a = stack.pop()!, b2 = stack.pop()!;
      stack.push(a, b2);
      step.note = "swap the top two elements";
    } else if (o.op === OP.OP_NOT) {
      if (!stack.length) return fail("OP_NOT needs an argument");
      const n = decodeNum(stack.pop()!);
      if (n === null) return fail("OP_NOT: number longer than 4 bytes");
      stack.push(encodeNum(n === 0n ? 1n : 0n));
      step.note = n === 0n ? "0 becomes 1" : "non-zero becomes 0";
    } else if (o.op === OP.OP_EQUAL || o.op === OP.OP_EQUALVERIFY) {
      if (stack.length < 2) return fail(`${o.name} needs two elements`);
      const eq = stack.pop()! === stack.pop()!;
      if (o.op === OP.OP_EQUALVERIFY) {
        if (!eq) return fail("OP_EQUALVERIFY: not equal");
        step.note = "equal: continue";
      } else {
        stack.push(eq ? "01" : "");
        step.note = eq ? "byte-for-byte equal: push 1" : "different: push empty";
      }
    } else if (o.op === OP.OP_NUMEQUAL || o.op === OP.OP_NUMEQUALVERIFY) {
      if (stack.length < 2) return fail(`${o.name} needs two elements`);
      const x = decodeNum(stack.pop()!), y = decodeNum(stack.pop()!);
      if (x === null || y === null) return fail(`${o.name}: number longer than 4 bytes`);
      if (o.op === OP.OP_NUMEQUALVERIFY) {
        if (x !== y) return fail("OP_NUMEQUALVERIFY: numbers differ");
        step.note = "equal: continue";
      } else {
        stack.push(x === y ? "01" : "");
        step.note = x === y ? "numbers equal: push 1" : "numbers differ: push empty";
      }
    } else if (o.op === OP.OP_CHECKSIG || o.op === OP.OP_CHECKSIGVERIFY || o.op === OP.OP_CHECKSIGADD) {
      const add = o.op === OP.OP_CHECKSIGADD;
      if (stack.length < (add ? 3 : 2)) return fail(`${o.name}: fewer than ${add ? 3 : 2} elements on the stack`);
      const key = stack.pop()!;
      let n = 0n;
      if (add) {
        const nHex = stack.pop()!;
        const dn = decodeNum(nHex);
        if (dn === null) return fail(`OP_CHECKSIGADD: n is ${nHex.length / 2} bytes, larger than 4`);
        n = dn;
      }
      const sig = stack.pop()!;
      // Order follows BIP 342's text. Core charges the budget before the empty-key and BIP 340
      // checks; verdicts agree, but a failing step's reason or budget display could differ.
      if (key.length === 0) return fail(`${o.name}: public key is empty`);
      let check: SigCheck = sig === "" ? "empty" : key.length === 64 ? (verifySig(sig, key) ? "valid" : "invalid") : "unknown-key-type";
      if (check === "invalid") {
        step.sig = { check, budgetAfter: budget, keyBytes: key.length / 2 };
        return fail(`${o.name}: signature fails BIP 340 verification against the 32-byte key`);
      }
      if (sig !== "") {
        budget -= SIGOP_COST;
        sigOpsCounted++;
        if (budget < 0) {
          step.sig = { check, budgetAfter: budget, keyBytes: key.length / 2 };
          return fail("sigops budget exhausted");
        }
      }
      step.sig = { check, budgetAfter: budget, keyBytes: key.length / 2 };
      const ok = sig !== "";
      if (o.op === OP.OP_CHECKSIGVERIFY) {
        if (!ok) return fail("OP_CHECKSIGVERIFY with an empty signature: fail");
        step.note = check === "valid" ? "signature valid: continue" : "unknown key type: counted as success";
      } else if (o.op === OP.OP_CHECKSIG) {
        stack.push(ok ? "01" : "");
        step.note = !ok ? "empty signature: push empty, no check" : check === "valid" ? "signature valid: push 1" : "unknown key type, no check: push 1";
      } else {
        stack.push(encodeNum(ok ? n + 1n : n));
        step.note = !ok ? `empty signature: push n = ${n}` : `${check === "valid" ? "signature valid" : "unknown key type, no check"}: push n + 1 = ${n + 1n}`;
      }
    } else {
      throw new TraceScopeError(`${o.name} is outside this recorder's reviewed opcode set`);
    }
    step.stackAfter = [...stack];
    if (stack.length > 1000) return fail("more than 1000 stack elements");
  }
  if (exec.length) return end(ops, false, "execute", "unbalanced conditional");
  if (stack.length !== 1) return end(ops, false, "final-stack", `execution ends with ${stack.length} elements; exactly one is required`);
  if (!castToBool(stack[0])) return end(ops, false, "final-stack", "the single remaining element is false");
  return end(ops, true, null, "exactly one true element remains");
}
