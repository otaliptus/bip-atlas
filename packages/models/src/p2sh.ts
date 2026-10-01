/**
 * BIP16 teaching model: record how a pay-to-script-hash spend is checked, in
 * BIP16's stages, for a small reviewed set of published spends.
 *
 * Like the tapscript recorder, this is NOT a general Script interpreter. It
 * supports only the opcodes in P2SH_SUPPORTED and throws P2shScopeError otherwise.
 * Hashing comes from @noble/hashes and ECDSA verification from @noble/curves;
 * the legacy and BIP143 signature digests are computed here and proven by the
 * published signatures verifying against them.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "./hex";
import { bip143Digest, dsha256, parseTransaction, type Transaction } from "./tx";
import { hash160 } from "./bip32";

export class P2shScopeError extends Error {}


/* ---------- script decoding ---------- */

export interface ScriptOp {
  op: number;
  name: string;
  /** Pushed data for push opcodes (OP_0 pushes ""). */
  dataHex: string | null;
}

const NAMES: Record<number, string> = {
  0x00: "OP_0", 0x4c: "OP_PUSHDATA1", 0x4d: "OP_PUSHDATA2", 0x4e: "OP_PUSHDATA4", 0x87: "OP_EQUAL", 0xa9: "OP_HASH160",
  0xac: "OP_CHECKSIG", 0xae: "OP_CHECKMULTISIG",
};
/** Non-push opcodes this recorder evaluates. */
export const P2SH_SUPPORTED = new Set([0x87, 0xa9, 0xac, 0xae, ...Array.from({ length: 16 }, (_, i) => 0x51 + i)]);

export function legacyOpName(op: number): string {
  if (op >= 0x51 && op <= 0x60) return `OP_${op - 0x50}`;
  return NAMES[op] ?? `opcode 0x${op.toString(16).padStart(2, "0")}`;
}

export function decodeScript(hex: string): ScriptOp[] {
  const b = hexToBytes(hex);
  const out: ScriptOp[] = [];
  for (let i = 0; i < b.length; ) {
    const op = b[i++];
    let len = -1;
    if (op === 0x00) len = 0;
    else if (op <= 0x4b) len = op;
    else if (op === 0x4c) (len = b[i]), (i += 1);
    else if (op === 0x4d) (len = b[i] | (b[i + 1] << 8)), (i += 2);
    else if (op === 0x4e) (len = b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)), (i += 4);
    if (len >= 0) {
      if (i + len > b.length) throw new Error("push runs past the end of the script");
      out.push({ op, name: op === 0x00 ? "OP_0" : op <= 0x4b ? `push ${len}` : legacyOpName(op), dataHex: bytesToHex(b.slice(i, i + len)) });
      i += len;
    } else out.push({ op, name: legacyOpName(op), dataHex: null });
  }
  return out;
}

/** BIP16 rule 1: only push operations (OP_0…OP_16 and data pushes) are allowed in the scriptSig. */
export const isPushOnly = (ops: ScriptOp[]) => ops.every((o) => o.dataHex !== null || (o.op >= 0x51 && o.op <= 0x60) || o.op === 0x4f);

export function isP2shScript(spkHex: string): boolean {
  return /^a914[0-9a-f]{40}87$/.test(spkHex);
}

/** A version-0 witness program: OP_0 followed by one 20- or 32-byte push. */
export function witnessProgram(scriptHex: string): { version: 0; programHex: string } | null {
  const m = /^00(14|20)([0-9a-f]+)$/.exec(scriptHex);
  if (!m || m[2].length / 2 !== parseInt(m[1], 16)) return null;
  return { version: 0, programHex: m[2] };
}

/* ---------- signature digests ---------- */

const varint = (n: number) => (n < 0xfd ? n.toString(16).padStart(2, "0") : `fd${(n & 0xff).toString(16).padStart(2, "0")}${(n >> 8).toString(16).padStart(2, "0")}`);
const le32 = (n: number) => [0, 8, 16, 24].map((s) => ((n >>> s) & 0xff).toString(16).padStart(2, "0")).join("");
const le64 = (n: bigint) => Array.from({ length: 8 }, (_, i) => Number((n >> BigInt(8 * i)) & 0xffn).toString(16).padStart(2, "0")).join("");

/**
 * The original (pre-SegWit) signature digest for SIGHASH_ALL: every scriptSig
 * emptied, the input's scriptSig replaced by the script being run, the hash
 * type appended, double SHA-256. Only SIGHASH_ALL is in scope.
 */
export function legacySighash(tx: Transaction, index: number, scriptCodeHex: string, hashType: number): string {
  if (hashType !== 1) throw new P2shScopeError("only SIGHASH_ALL is in scope for legacy digests");
  if (!Number.isInteger(index) || index < 0 || index >= tx.inputs.length) throw new RangeError("no such input");
  const ins = tx.inputs
    .map((inp, i) => inp.prevoutHex + (i === index ? varint(scriptCodeHex.length / 2) + scriptCodeHex : "00") + inp.sequenceHex)
    .join("");
  const outs = tx.outputs.map((o) => le64(o.valueSats) + varint(o.scriptPubKeyHex.length / 2) + o.scriptPubKeyHex).join("");
  const ser = tx.versionHex + varint(tx.inputs.length) + ins + varint(tx.outputs.length) + outs + tx.locktimeHex + le32(hashType);
  return bytesToHex(dsha256(hexToBytes(ser)));
}

/** ECDSA check of a DER signature (hash-type byte stripped) against a 32-byte digest, via noble. */
export function ecdsaVerify(sigDerHex: string, digestHex: string, pubkeyHex: string): boolean {
  try {
    return secp256k1.verify(hexToBytes(sigDerHex), hexToBytes(digestHex), hexToBytes(pubkeyHex), { prehash: false, format: "der", lowS: false });
  } catch {
    return false;
  }
}

/* ---------- the recorded spend ---------- */

export type P2shStageId = "push-only" | "hash-match" | "redeem" | "witness";

export interface P2shStep {
  name: string;
  note: string;
  stackAfter: string[];
  /** For signature checks: which key each signature matched, and the digest used. */
  checks?: Array<{ sigIndex: number; keyIndex: number | null; ok: boolean }>;
  digestHex?: string;
  failed?: boolean;
}

export interface P2shStage {
  id: P2shStageId;
  title: string;
  ok: boolean;
  /** Script run in this stage (hex), when there is one. */
  scriptHex: string | null;
  stackBefore: string[];
  steps: P2shStep[];
  note: string;
}

export interface P2shTrace {
  valid: boolean;
  kind: "legacy" | "p2sh-p2wpkh" | "p2sh-p2wsh";
  scriptPubKeyHex: string;
  redeemScriptHex: string;
  stages: P2shStage[];
  /** BIP16 static sigop count of the redeem script (CHECKMULTISIG after OP_n counts n). */
  redeemSigops: number;
}

const truthy = (hex: string) => {
  const b = hexToBytes(hex);
  for (let i = 0; i < b.length; i++) if (b[i] !== 0) return !(i === b.length - 1 && b[i] === 0x80);
  return false;
};

/** BIP16 sigop counting for a serialized script. */
export function countSigops(scriptHex: string): number {
  const ops = decodeScript(scriptHex);
  let n = 0;
  ops.forEach((o, i) => {
    if (o.op === 0xac || o.op === 0xad) n += 1;
    if (o.op === 0xae || o.op === 0xaf) {
      const prev = ops[i - 1];
      n += prev && prev.op >= 0x51 && prev.op <= 0x60 ? prev.op - 0x50 : 20;
    }
  });
  return n;
}

/**
 * Run `scriptHex` on `stack` with the supported opcodes. `digestFor` gives the
 * signature digest for a hash type. Returns the steps and the final stack.
 */
function run(scriptHex: string, stack: string[], digestFor: (hashType: number) => string): { steps: P2shStep[]; ok: boolean } {
  const steps: P2shStep[] = [];
  for (const o of decodeScript(scriptHex)) {
    if (o.dataHex !== null) {
      if (o.dataHex.length / 2 > 520) return fail(steps, stack, o.name, "push larger than 520 bytes");
      stack.push(o.dataHex);
      steps.push({ name: o.dataHex.length ? `<${o.dataHex.length / 2}-byte push>` : "OP_0", note: o.dataHex.length ? `push ${o.dataHex.length / 2} bytes` : "push the empty vector", stackAfter: [...stack] });
      continue;
    }
    if (!P2SH_SUPPORTED.has(o.op)) throw new P2shScopeError(`${o.name} is outside this recorder's reviewed opcode set`);
    if (o.op >= 0x51 && o.op <= 0x60) {
      stack.push((o.op - 0x50).toString(16).padStart(2, "0"));
      steps.push({ name: o.name, note: `push the number ${o.op - 0x50}`, stackAfter: [...stack] });
    } else if (o.op === 0xa9) {
      if (!stack.length) return fail(steps, stack, o.name, "empty stack");
      const top = stack.pop()!;
      stack.push(bytesToHex(hash160(hexToBytes(top))));
      steps.push({ name: o.name, note: "replace the top item with RIPEMD-160(SHA-256(item))", stackAfter: [...stack] });
    } else if (o.op === 0x87) {
      if (stack.length < 2) return fail(steps, stack, o.name, "needs two items");
      const a = stack.pop()!, b = stack.pop()!;
      stack.push(a === b ? "01" : "");
      steps.push({ name: o.name, note: a === b ? "the two items are equal: push 1" : "the two items differ: push empty", stackAfter: [...stack] });
    } else if (o.op === 0xac) {
      if (stack.length < 2) return fail(steps, stack, o.name, "needs two items");
      const key = stack.pop()!, sig = stack.pop()!;
      const ht = sig.length ? parseInt(sig.slice(-2), 16) : 0;
      const digest = sig.length ? digestFor(ht) : "";
      const ok = sig.length > 0 && ecdsaVerify(sig.slice(0, -2), digest, key);
      stack.push(ok ? "01" : "");
      steps.push({ name: o.name, note: ok ? "signature valid for this key: push 1" : "signature does not verify: push empty", stackAfter: [...stack], checks: [{ sigIndex: 0, keyIndex: ok ? 0 : null, ok }], digestHex: digest });
    } else if (o.op === 0xae) {
      const nKeys = parseInt(stack.pop() ?? "", 16);
      if (!(nKeys >= 0 && nKeys <= 20) || stack.length < nKeys + 1) return fail(steps, stack, o.name, "bad key count");
      const keys = stack.splice(stack.length - nKeys, nKeys);
      const m = parseInt(stack.pop() ?? "", 16);
      if (!(m >= 0 && m <= nKeys) || stack.length < m + 1) return fail(steps, stack, o.name, "bad signature count");
      const sigs = stack.splice(stack.length - m, m);
      const dummy = stack.pop()!;
      // Signatures must match keys in order; each key is tried at most once.
      const checks: NonNullable<P2shStep["checks"]> = [];
      let k = 0;
      let digest = "";
      for (let s = 0; s < sigs.length; s++) {
        digest = digestFor(parseInt(sigs[s].slice(-2), 16));
        let matched: number | null = null;
        while (k < keys.length && matched === null) {
          if (ecdsaVerify(sigs[s].slice(0, -2), digest, keys[k])) matched = k;
          k++;
        }
        checks.push({ sigIndex: s, keyIndex: matched, ok: matched !== null });
        if (matched === null) break;
      }
      const ok = checks.length === sigs.length && checks.every((c) => c.ok);
      stack.push(ok ? "01" : "");
      steps.push({
        name: o.name,
        note: `${m}-of-${nKeys}: ${ok ? "every signature matches a key, in order" : "a signature found no matching key"}; also pops one extra item (${dummy === "" ? "here it is empty" : "here it is not empty"})`,
        stackAfter: [...stack],
        checks,
        digestHex: digest,
      });
    }
  }
  return { steps, ok: stack.length > 0 && truthy(stack[stack.length - 1]) };
}

function fail(steps: P2shStep[], stack: string[], name: string, why: string) {
  steps.push({ name, note: why, stackAfter: [...stack], failed: true });
  return { steps, ok: false };
}

/**
 * Record the check of input `index` of `txHex`, which spends a P2SH output
 * with script `scriptPubKeyHex` (and `amountSats`, needed only for wrapped SegWit).
 */
export function traceP2sh(txHex: string, index: number, scriptPubKeyHex: string, amountSats: bigint | null): P2shTrace {
  if (!isP2shScript(scriptPubKeyHex)) throw new P2shScopeError("not a P2SH scriptPubKey");
  const tx = parseTransaction(txHex);
  const input = tx.inputs[index];
  if (!input) throw new RangeError("no such input");
  const sigOps = decodeScript(input.scriptSigHex);
  const stages: P2shStage[] = [];
  const pushOnly = isPushOnly(sigOps);
  const pushed = sigOps.map((o) => o.dataHex ?? (o.op - 0x50).toString(16).padStart(2, "0"));
  stages.push({ id: "push-only", title: "The scriptSig only pushes data", ok: pushOnly, scriptHex: input.scriptSigHex, stackBefore: [], steps: [], note: pushOnly ? `${pushed.length} pushes; the last is the serialized redeem script` : "a non-push operation appears: validation fails" });
  const redeem = pushed[pushed.length - 1] ?? "";
  const base = { scriptPubKeyHex, redeemScriptHex: redeem, redeemSigops: redeem ? countSigops(redeem) : 0 };
  if (!pushOnly) return { valid: false, kind: "legacy", ...base, stages };

  // Stage 2: the scriptPubKey runs on a copy of the stack: HASH160 of the top item must equal the committed hash.
  const stack2 = [...pushed];
  const r2 = run(scriptPubKeyHex, stack2, () => "");
  stages.push({ id: "hash-match", title: "Its hash matches the output", ok: r2.ok, scriptHex: scriptPubKeyHex, stackBefore: [...pushed], steps: r2.steps, note: r2.ok ? "HASH160 of the serialized script equals the 20 bytes in the output" : "hash mismatch: validation fails immediately" });

  const program = witnessProgram(redeem);
  const kind: P2shTrace["kind"] = !program ? "legacy" : program.programHex.length === 40 ? "p2sh-p2wpkh" : "p2sh-p2wsh";
  if (!r2.ok) return { valid: false, kind, ...base, stages };

  const rest = pushed.slice(0, -1);
  if (!program) {
    // Stage 3: pop the script and run it on what is left, signing over the redeem script.
    const stack3 = [...rest];
    const r3 = run(redeem, stack3, (ht) => legacySighash(tx, index, redeem, ht));
    stages.push({ id: "redeem", title: "The redeem script runs on the remaining stack", ok: r3.ok, scriptHex: redeem, stackBefore: rest, steps: r3.steps, note: r3.ok ? "finishes with true on top: the spend is valid" : "does not finish with true: the spend fails" });
    return { valid: r3.ok, kind, ...base, stages };
  }

  // Wrapped SegWit: the redeem script is a witness program, so BIP141's rules take over.
  if (amountSats === null) throw new P2shScopeError("wrapped SegWit needs the spent amount");
  const witness = tx.witnesses[index] ?? [];
  const single = sigOps.length === 1;
  if (program.programHex.length === 40) {
    const [sig, key] = witness;
    const keyOk = witness.length === 2 && bytesToHex(hash160(hexToBytes(key))) === program.programHex;
    const scriptCode = `1976a914${program.programHex}88ac`;
    // With the key hash already matched, what remains of P2WPKH is <key> OP_CHECKSIG on the signature.
    const keyCheck = (key.length / 2).toString(16).padStart(2, "0") + key + "ac";
    const r = keyOk && single ? run(keyCheck, [sig], (ht) => bip143Digest(tx, index, scriptCode, amountSats, ht).sighashHex) : { steps: [], ok: false };
    stages.push({ id: "witness", title: "The redeem script is a P2WPKH program: the witness is checked instead", ok: keyOk && single && r.ok, scriptHex: null, stackBefore: witness, steps: r.steps, note: keyOk ? "HASH160 of the witness key equals the program; the signature is checked with the BIP 143 digest" : "witness key does not match the program" });
    return { valid: keyOk && single && r.ok, kind, ...base, stages };
  }
  const witnessScript = witness[witness.length - 1] ?? "";
  const scriptOk = single && bytesToHex(sha256(hexToBytes(witnessScript))) === program.programHex;
  const stack = witness.slice(0, -1);
  const scriptCode = varint(witnessScript.length / 2) + witnessScript;
  const r = scriptOk ? run(witnessScript, [...stack], (ht) => bip143Digest(tx, index, scriptCode, amountSats, ht).sighashHex) : { steps: [], ok: false };
  stages.push({ id: "witness", title: "The redeem script is a P2WSH program: the witness script runs", ok: scriptOk && r.ok, scriptHex: witnessScript, stackBefore: stack, steps: r.steps, note: scriptOk ? "SHA-256 of the witness script equals the program; signatures use the BIP 143 digest" : "witness script does not match the program" });
  return { valid: scriptOk && r.ok, kind, ...base, stages };
}
