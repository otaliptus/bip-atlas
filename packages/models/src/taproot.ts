/**
 * BIP341 teaching model: script-tree hashing, the TapTweak, output keys,
 * control blocks (built and checked), and the common signature message.
 *
 * Point arithmetic, lift_x and tagged hashes come from the audited
 * @noble/curves `schnorr` helpers and @noble/hashes. The functions follow the
 * BIP's own Python (taproot_tree_helper, taproot_tweak_pubkey,
 * taproot_sign_script) and its script validation rules, and are tested against
 * the BIP's wallet-test-vectors.json. Nothing here signs.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "./hex";
import type { Transaction } from "./tx";
import { CURVE_N } from "./schnorr";

const { Point, utils } = schnorr;
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) (out.set(p, o), (o += p.length));
  return out;
};
const toInt = (b: Uint8Array) => (b.length ? BigInt(`0x${bytesToHex(b)}`) : 0n);
const hex32 = (n: bigint) => n.toString(16).padStart(64, "0");

export function compactSize(n: number): Uint8Array {
  if (n < 0xfd) return Uint8Array.of(n);
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8);
  if (n <= 0xffffffff) return Uint8Array.of(0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24);
  throw new RangeError("compact size too large for this model");
}

export const tagged = (tag: string, ...parts: Uint8Array[]) => utils.taggedHash(tag, ...parts);

/** hash_TapLeaf(v || compact_size(size of s) || s). */
export function tapLeafHash(leafVersion: number, scriptHex: string): string {
  const s = hexToBytes(scriptHex);
  return bytesToHex(tagged("TapLeaf", Uint8Array.of(leafVersion), compactSize(s.length), s));
}

/** hash_TapBranch of two child hashes, smaller (lexicographically) first. */
export function tapBranchHash(aHex: string, bHex: string): string {
  const [lo, hi] = aHex < bHex ? [aHex, bHex] : [bHex, aHex];
  return bytesToHex(tagged("TapBranch", hexToBytes(lo), hexToBytes(hi)));
}

/** The JSON tree encoding used by wallet-test-vectors.json. */
export type ScriptTree = null | { id: number; script: string; leafVersion: number } | [ScriptTree, ScriptTree];

export interface LeafInfo {
  id: number;
  leafVersion: number;
  scriptHex: string;
  leafHash: string;
  /** Sibling hashes from the leaf up to the root, as in taproot_tree_helper. */
  path: string[];
}

export interface TreeNode {
  hash: string;
  /** Leaf id, or null for an inner (TapBranch) node. */
  leaf: number | null;
  children: TreeNode[];
}

/** taproot_tree_helper: every leaf with its Merkle path, plus the root hash and node structure. */
export function treeHelper(tree: Exclude<ScriptTree, null>): { leaves: LeafInfo[]; hash: string; node: TreeNode } {
  if (!Array.isArray(tree)) {
    const h = tapLeafHash(tree.leafVersion, tree.script);
    return {
      leaves: [{ id: tree.id, leafVersion: tree.leafVersion, scriptHex: tree.script, leafHash: h, path: [] }],
      hash: h,
      node: { hash: h, leaf: tree.id, children: [] },
    };
  }
  if (tree[0] === null || tree[1] === null) throw new Error("inner node with an empty child");
  const left = treeHelper(tree[0]);
  const right = treeHelper(tree[1]);
  const leaves = [
    ...left.leaves.map((l) => ({ ...l, path: [...l.path, right.hash] })),
    ...right.leaves.map((l) => ({ ...l, path: [...l.path, left.hash] })),
  ];
  const hash = tapBranchHash(left.hash, right.hash);
  return { leaves, hash, node: { hash, leaf: null, children: [left.node, right.node] } };
}

export interface Tweak {
  tweakHex: string;
  outputKeyHex: string;
  /** 0 if the output key Q has even y, 1 if odd. */
  parity: 0 | 1;
}

/** taproot_tweak_pubkey(pubkey, h): t = hash_TapTweak(pubkey || h), Q = P + tG. */
export function tweakPubkey(internalKeyHex: string, merkleRootHex: string): Tweak {
  const t = tagged("TapTweak", hexToBytes(internalKeyHex), hexToBytes(merkleRootHex));
  const ti = toInt(t);
  if (ti >= CURVE_N) throw new Error("tweak not below the curve order");
  const P = utils.lift_x(toInt(hexToBytes(internalKeyHex)));
  const Q = P.add(Point.BASE.multiply(ti));
  const { x, y } = Q.toAffine();
  return { tweakHex: bytesToHex(t), outputKeyHex: hex32(x), parity: y % 2n === 0n ? 0 : 1 };
}

/** taproot_tweak_seckey: the secret key for the tweaked output key (used only to check published vectors). */
export function tweakSeckey(seckeyHex: string, merkleRootHex: string): string {
  let d = toInt(hexToBytes(seckeyHex));
  const P = Point.BASE.multiply(d).toAffine();
  if (P.y % 2n !== 0n) d = CURVE_N - d;
  const t = toInt(tagged("TapTweak", hexToBytes(hex32(P.x)), hexToBytes(merkleRootHex)));
  if (t >= CURVE_N) throw new Error("tweak not below the curve order");
  return hex32((d + t) % CURVE_N);
}

export interface TaprootOutput {
  internalKeyHex: string;
  merkleRootHex: string | null;
  leaves: LeafInfo[];
  node: TreeNode | null;
  tweak: Tweak;
  scriptPubKeyHex: string;
  /** Control block for each leaf, in `leaves` order. */
  controlBlocks: string[];
}

/** taproot_output_script plus the control blocks taproot_sign_script would use. */
export function taprootOutput(internalKeyHex: string, tree: ScriptTree): TaprootOutput {
  const helped = tree === null ? null : treeHelper(tree);
  const root = helped?.hash ?? null;
  const tweak = tweakPubkey(internalKeyHex, root ?? "");
  const leaves = helped?.leaves ?? [];
  return {
    internalKeyHex,
    merkleRootHex: root,
    leaves,
    node: helped?.node ?? null,
    tweak,
    scriptPubKeyHex: `5120${tweak.outputKeyHex}`,
    controlBlocks: leaves.map((l) => controlBlock(l, tweak.parity, internalKeyHex)),
  };
}

export function controlBlock(leaf: LeafInfo, parity: 0 | 1, internalKeyHex: string): string {
  return (leaf.leafVersion + parity).toString(16).padStart(2, "0") + internalKeyHex + leaf.path.join("");
}

export interface ControlCheckStep {
  id: "length" | "internal-key" | "leaf-version" | "leaf-hash" | "branch" | "tweak" | "output-key" | "compare";
  ok: boolean;
  values: Record<string, string>;
}

/**
 * The script-path commitment check from BIP341's script validation rules:
 * given the output key q, the revealed script s and control block c, recompute
 * Q and compare. Stops at the first failure. Script execution is out of scope.
 */
export function checkControlBlock(qHex: string, scriptHex: string, controlHex: string): { ok: boolean; steps: ControlCheckStep[] } {
  const c = hexToBytes(controlHex);
  const steps: ControlCheckStep[] = [];
  const done = () => ({ ok: steps.every((s) => s.ok), steps });
  const m = (c.length - 33) / 32;
  const lengthOk = c.length >= 33 && Number.isInteger(m) && m <= 128;
  steps.push({ id: "length", ok: lengthOk, values: { bytes: String(c.length), m: lengthOk ? String(m) : "—" } });
  if (!lengthOk) return done();
  const p = c.slice(1, 33);
  let P: InstanceType<typeof Point>;
  try {
    P = utils.lift_x(toInt(p));
  } catch {
    steps.push({ id: "internal-key", ok: false, values: { p: bytesToHex(p) } });
    return done();
  }
  steps.push({ id: "internal-key", ok: true, values: { p: bytesToHex(p) } });
  const v = c[0] & 0xfe;
  steps.push({ id: "leaf-version", ok: true, values: { v: `0x${v.toString(16)}`, parityBit: String(c[0] & 1) } });
  let k = tapLeafHash(v, scriptHex);
  steps.push({ id: "leaf-hash", ok: true, values: { k0: k } });
  for (let j = 0; j < m; j++) {
    const e = bytesToHex(c.slice(33 + 32 * j, 65 + 32 * j));
    const first = k < e ? "k" : "e";
    const next = tapBranchHash(k, e);
    steps.push({ id: "branch", ok: true, values: { j: String(j), k, e, first, next } });
    k = next;
  }
  const t = tagged("TapTweak", p, hexToBytes(k));
  const tOk = toInt(t) < CURVE_N;
  steps.push({ id: "tweak", ok: tOk, values: { root: k, t: bytesToHex(t) } });
  if (!tOk) return done();
  const Q = P.add(Point.BASE.multiply(toInt(t))).toAffine();
  steps.push({ id: "output-key", ok: true, values: { x: hex32(Q.x), parity: String(Number(Q.y % 2n)) } });
  const ok = hex32(Q.x) === qHex && (c[0] & 1) === Number(Q.y % 2n);
  steps.push({ id: "compare", ok, values: { q: qHex, xQ: hex32(Q.x) } });
  return done();
}

/* ---------- signature message (BIP341 "Common signature message") ---------- */

export interface SpentOutput {
  scriptPubKeyHex: string;
  amountSats: bigint;
}

export interface SigMsgItem {
  id: string;
  label: string;
  hex: string;
}

const le = (n: bigint | number, bytes: number) => {
  let v = BigInt(n);
  const out = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) (out[i] = Number(v & 0xffn), (v >>= 8n));
  return out;
};
const ser = (hex: string) => {
  const b = hexToBytes(hex);
  return cat(compactSize(b.length), b);
};
const txOut = (o: { valueSats: bigint; scriptPubKeyHex: string }) => cat(le(o.valueSats, 8), ser(o.scriptPubKeyHex));
const sha = (b: Uint8Array) => bytesToHex(sha256(b));

export const VALID_HASH_TYPES = [0x00, 0x01, 0x02, 0x03, 0x81, 0x82, 0x83] as const;

export class SigMsgError extends Error {}

/** The shared hashes a SigMsg may use, as named in the wallet vectors. */
export function precomputed(tx: Transaction, spent: SpentOutput[]) {
  return {
    hashPrevouts: sha(cat(...tx.inputs.map((i) => hexToBytes(i.prevoutHex)))),
    hashAmounts: sha(cat(...spent.map((s) => le(s.amountSats, 8)))),
    hashScriptPubkeys: sha(cat(...spent.map((s) => ser(s.scriptPubKeyHex)))),
    hashSequences: sha(cat(...tx.inputs.map((i) => hexToBytes(i.sequenceHex)))),
    hashOutputs: sha(cat(...tx.outputs.map(txOut))),
  };
}

/**
 * SigMsg(hash_type, ext_flag) for input `index`. `annexHex`, when given,
 * includes the mandatory 0x50 prefix. Throws for an undefined hash_type and
 * for SIGHASH_SINGLE without a corresponding output, as the BIP requires.
 */
export function sigMsg(tx: Transaction, spent: SpentOutput[], index: number, hashType: number, extFlag = 0, annexHex: string | null = null): SigMsgItem[] {
  if (!(VALID_HASH_TYPES as readonly number[]).includes(hashType)) throw new SigMsgError(`undefined hash_type 0x${hashType.toString(16)}`);
  if (spent.length !== tx.inputs.length) throw new SigMsgError("need one spent output per input");
  const anyoneCanPay = (hashType & 0x80) === 0x80;
  const base = hashType & 3;
  if (base === 3 && index >= tx.outputs.length) throw new SigMsgError("SIGHASH_SINGLE without a corresponding output");
  const pre = precomputed(tx, spent);
  const items: SigMsgItem[] = [
    { id: "hash_type", label: "hash_type", hex: hashType.toString(16).padStart(2, "0") },
    { id: "nVersion", label: "nVersion", hex: tx.versionHex },
    { id: "nLockTime", label: "nLockTime", hex: tx.locktimeHex },
  ];
  if (!anyoneCanPay) {
    items.push(
      { id: "sha_prevouts", label: "sha_prevouts", hex: pre.hashPrevouts },
      { id: "sha_amounts", label: "sha_amounts", hex: pre.hashAmounts },
      { id: "sha_scriptpubkeys", label: "sha_scriptpubkeys", hex: pre.hashScriptPubkeys },
      { id: "sha_sequences", label: "sha_sequences", hex: pre.hashSequences },
    );
  }
  if (base !== 2 && base !== 3) items.push({ id: "sha_outputs", label: "sha_outputs", hex: pre.hashOutputs });
  items.push({ id: "spend_type", label: "spend_type", hex: (extFlag * 2 + (annexHex ? 1 : 0)).toString(16).padStart(2, "0") });
  if (anyoneCanPay) {
    const i = tx.inputs[index];
    items.push(
      { id: "outpoint", label: "outpoint", hex: i.prevoutHex },
      { id: "amount", label: "amount", hex: bytesToHex(le(spent[index].amountSats, 8)) },
      { id: "scriptPubKey", label: "scriptPubKey", hex: bytesToHex(ser(spent[index].scriptPubKeyHex)) },
      { id: "nSequence", label: "nSequence", hex: i.sequenceHex },
    );
  } else {
    items.push({ id: "input_index", label: "input_index", hex: bytesToHex(le(index, 4)) });
  }
  if (annexHex) items.push({ id: "sha_annex", label: "sha_annex", hex: sha(ser(annexHex)) });
  if (base === 3) items.push({ id: "sha_single_output", label: "sha_single_output", hex: sha(txOut(tx.outputs[index])) });
  return items;
}

/** hash_TapSighash(0x00 || SigMsg || extension). */
export function taprootSighash(items: SigMsgItem[], extensionHex = ""): string {
  return bytesToHex(tagged("TapSighash", Uint8Array.of(0), hexToBytes(items.map((i) => i.hex).join("") + extensionHex)));
}

/** Key-path signature check (BIP341 "Taproot key path spending signature validation"). */
export function verifyKeyPath(qHex: string, sigHex: string, sighashFor: (hashType: number) => string): boolean {
  const sig = hexToBytes(sigHex);
  if (sig.length === 64) return schnorr.verify(sig, hexToBytes(sighashFor(0)), hexToBytes(qHex));
  if (sig.length === 65) {
    if (sig[64] === 0) return false;
    return schnorr.verify(sig.slice(0, 64), hexToBytes(sighashFor(sig[64])), hexToBytes(qHex));
  }
  return false;
}
