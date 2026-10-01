/**
 * Output script descriptor teaching model (BIPs 380–386): parse a descriptor
 * into script and key expressions, apply each BIP's placement rules, and
 * expand it into output scripts.
 *
 * Supported: pk, pkh, sh, wpkh, wsh, multi, sortedmulti, combo, raw, addr and
 * tr with trees of pk() leaves. Miniscript and the later expressions (musig,
 * sp, multi_a) throw DescriptorScopeError. Hashing, curve and encodings come
 * from audited @noble and @scure libraries; BIP 32 derivation from ./bip32.
 */
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bech32, bech32m, createBase58check } from "@scure/base";
import { ckdPriv, ckdPub, hash160, HARDENED, parseExtendedKey, type ExtendedKey } from "./bip32";
import { descsumCheck } from "./descsum";
import { bytesToHex, hexToBytes } from "./hex";
import { taprootOutput, type ScriptTree } from "./taproot";

const base58check = createBase58check(sha256);

/** The descriptor breaks a rule of BIPs 380–386. */
export class DescriptorError extends Error {}
/** Valid or not, the descriptor uses something this model does not implement. */
export class DescriptorScopeError extends Error {}

export type Context = "top" | "sh" | "wsh" | "tr";

export interface PathStep {
  index: number;
  hardened: boolean;
}

export interface KeyExpr {
  type: "key";
  /** Offsets of the whole expression in the descriptor body. */
  start: number;
  end: number;
  text: string;
  origin: null | { fingerprint: string; path: PathStep[]; start: number; end: number };
  /** Where the key itself (after any origin) starts and ends. */
  keyStart: number;
  keyEnd: number;
  kind: "hex-compressed" | "hex-uncompressed" | "xonly" | "wif" | "xpub" | "xprv";
  /** Derivation after an extended key. */
  path: PathStep[];
  range: null | "unhardened" | "hardened";
  /** For extended keys: where the derivation suffix starts. */
  pathStart: number | null;
  isPrivate: boolean;
  compressed: boolean;
  /** Resolved material. */
  ext: ExtendedKey | null;
  priv: Uint8Array | null;
  pub: Uint8Array | null;
}

export interface ScriptExpr {
  type: "script";
  fn: string;
  start: number;
  end: number;
  /** Where the name ends (the opening parenthesis). */
  nameEnd: number;
  args: Array<ScriptExpr | KeyExpr | TreeExpr | { type: "num"; value: number; start: number; end: number } | { type: "text"; value: string; start: number; end: number }>;
}

export interface TreeExpr {
  type: "tree";
  start: number;
  end: number;
  left: ScriptExpr | TreeExpr;
  right: ScriptExpr | TreeExpr;
}

export interface Descriptor {
  text: string;
  body: string;
  checksum: ReturnType<typeof descsumCheck>;
  root: ScriptExpr;
  keys: KeyExpr[];
  ranged: boolean;
  hasPrivateKeys: boolean;
}

/* ---------- key expressions (BIP 380) ---------- */

const MAX_INDEX = HARDENED - 1;

function parseStep(s: string, where: string): PathStep {
  const m = /^(\d+)(h|')?$/.exec(s);
  if (!m) throw new DescriptorError(`invalid derivation step "${s}" in ${where}`);
  const index = Number(m[1]);
  if (!Number.isSafeInteger(index) || index > MAX_INDEX) throw new DescriptorError(`derivation index ${m[1]} out of range`);
  return { index, hardened: m[2] !== undefined };
}

function decodeWif(s: string): { priv: Uint8Array; compressed: boolean } | null {
  let raw: Uint8Array;
  try {
    raw = base58check.decode(s);
  } catch {
    return null;
  }
  if (raw[0] !== 0x80) return null;
  if (raw.length === 33) return { priv: raw.slice(1), compressed: false };
  if (raw.length === 34 && raw[33] === 1) return { priv: raw.slice(1, 33), compressed: true };
  return null;
}

/** Parse one key expression found at `offset` in the body. */
export function parseKey(text: string, offset = 0, ctx: Context = "top"): KeyExpr {
  let rest = text;
  let pos = 0;
  let origin: KeyExpr["origin"] = null;
  if (rest.startsWith("[")) {
    const close = rest.indexOf("]");
    if (close < 0) throw new DescriptorError("key origin is not closed");
    const inner = rest.slice(1, close);
    const parts = inner.split("/");
    if (!/^[0-9a-fA-F]{8}$/.test(parts[0])) throw new DescriptorError("key origin fingerprint must be exactly 8 hex characters");
    origin = { fingerprint: parts[0].toLowerCase(), path: parts.slice(1).map((p) => parseStep(p, "key origin")), start: offset, end: offset + close + 1 };
    pos = close + 1;
    rest = rest.slice(pos);
  }
  if (rest.includes("[") || rest.includes("]")) throw new DescriptorError("misplaced or repeated key origin");
  if (rest === "") throw new DescriptorError("key origin with no key");
  const keyStart = offset + pos;
  const base = rest.split("/")[0];
  const steps = rest.split("/").slice(1);
  const k: KeyExpr = {
    type: "key", start: offset, end: offset + text.length, text, origin, keyStart, keyEnd: keyStart + base.length,
    kind: "hex-compressed", path: [], range: null, pathStart: null, isPrivate: false, compressed: true, ext: null, priv: null, pub: null,
  };
  if (/^(xpub|xprv|tpub|tprv)/.test(base)) {
    let parsed;
    try {
      parsed = parseExtendedKey(base);
    } catch (e) {
      throw new DescriptorError(`invalid extended key: ${(e as Error).message}`);
    }
    k.kind = parsed.kind === "private" ? "xprv" : "xpub";
    k.isPrivate = parsed.kind === "private";
    k.ext = parsed.key;
    k.pathStart = steps.length ? k.keyEnd : null;
    steps.forEach((s, i) => {
      if (i === steps.length - 1 && /^\*(h|')?$/.test(s)) k.range = s.length > 1 ? "hardened" : "unhardened";
      else k.path.push(parseStep(s, "key derivation"));
    });
    // BIP 380 lists xpub…/3h/4h/5h/* among valid key expressions: the syntax is fine, but no key can be
    // derived from it (hardened steps need the private key), so keyAt() refuses it.
    return k;
  }
  if (steps.length) throw new DescriptorError("only extended keys can be followed by derivation steps");
  if (/^[0-9a-fA-F]+$/.test(base)) {
    if (base.length === 66 && /^0[23]/.test(base)) k.kind = "hex-compressed";
    else if (base.length === 130 && base.startsWith("04")) (k.kind = "hex-uncompressed"), (k.compressed = false);
    else if (base.length === 64 && ctx === "tr") k.kind = "xonly";
    else throw new DescriptorError("hex public key of the wrong length or prefix");
    k.pub = hexToBytes(base.toLowerCase());
    if (k.kind !== "xonly") {
      try {
        secp256k1.Point.fromHex(base.toLowerCase());
      } catch {
        throw new DescriptorError("public key is not on the curve");
      }
    }
    return k;
  }
  const wif = decodeWif(base);
  if (!wif) throw new DescriptorError(`not a key: ${base.slice(0, 12)}…`);
  k.kind = "wif";
  k.isPrivate = true;
  k.priv = wif.priv;
  k.compressed = wif.compressed;
  return k;
}

/** The public key a key expression yields at child `index` (ignored if not ranged). */
export function keyAt(k: KeyExpr, index: number): { pub: Uint8Array; derivedPath: PathStep[] } {
  if (k.ext) {
    const steps = [...k.path, ...(k.range ? [{ index, hardened: k.range === "hardened" }] : [])];
    let key = k.ext;
    if (!k.ext.privateKey && steps.some((s) => s.hardened)) throw new DescriptorError("hardened derivation needs a private extended key");
    for (const s of steps) {
      const i = s.index + (s.hardened ? HARDENED : 0);
      key = (key.privateKey ? ckdPriv(key, i) : ckdPub(key, i)).key;
    }
    return { pub: key.publicKey, derivedPath: steps };
  }
  if (k.priv) return { pub: secp256k1.getPublicKey(k.priv, k.compressed), derivedPath: [] };
  return { pub: k.pub!, derivedPath: [] };
}

/* ---------- script expressions ---------- */

/** Split `s` at top-level commas (outside (), {} and []), keeping offsets. */
function splitArgs(s: string, offset: number): Array<{ text: string; start: number }> {
  const out: Array<{ text: string; start: number }> = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push({ text: s.slice(from, i), start: offset + from });
      from = i + 1;
    }
  }
  out.push({ text: s.slice(from), start: offset + from });
  return out;
}

const KEY_FNS = new Set(["pk", "pkh", "wpkh", "combo"]);
const SCRIPT_FNS = new Set(["sh", "wsh"]);
const KNOWN = new Set(["pk", "pkh", "sh", "wpkh", "wsh", "multi", "sortedmulti", "combo", "raw", "addr", "tr"]);
/** Where each expression may appear (BIPs 381–386). */
const ALLOWED: Record<string, Context[]> = {
  pk: ["top", "sh", "wsh", "tr"],
  pkh: ["top", "sh", "wsh"],
  sh: ["top"],
  wpkh: ["top", "sh"],
  wsh: ["top", "sh"],
  multi: ["top", "sh", "wsh"],
  sortedmulti: ["top", "sh", "wsh"],
  combo: ["top"],
  raw: ["top"],
  addr: ["top"],
  tr: ["top"],
};

function parseScript(s: string, offset: number, ctx: Context, keys: KeyExpr[]): ScriptExpr {
  const m = /^([a-z_]+)\(/.exec(s);
  if (!m || !s.endsWith(")")) throw new DescriptorError(`expected a script expression, found "${s.slice(0, 16)}"`);
  const fn = m[1];
  if (!KNOWN.has(fn)) throw new DescriptorScopeError(`${fn}() is outside this model's scope`);
  if (ctx === "tr" && fn === "pkh") throw new DescriptorScopeError("pkh() inside tr() is a Miniscript fragment (BIP 379), outside this model's scope");
  if (!ALLOWED[fn].includes(ctx)) throw new DescriptorError(`${fn}() cannot be used ${ctx === "top" ? "at the top level" : `inside ${ctx}()`}`);
  const innerStart = offset + fn.length + 1;
  const inner = s.slice(fn.length + 1, -1);
  const args = splitArgs(inner, innerStart);
  const node: ScriptExpr = { type: "script", fn, start: offset, end: offset + s.length, nameEnd: offset + fn.length, args: [] };
  const keyCtx: Context = fn === "tr" ? "tr" : ctx;
  const looksScript = (t: string) => /^[a-z_]+\(/.test(t);
  if (KEY_FNS.has(fn)) {
    if (args.length !== 1) throw new DescriptorError(`${fn}() takes one key`);
    if (looksScript(args[0].text)) throw new DescriptorError(`${fn}() only accepts key expressions`);
    const k = parseKey(args[0].text, args[0].start, keyCtx);
    keys.push(k);
    node.args.push(k);
  } else if (SCRIPT_FNS.has(fn)) {
    if (args.length !== 1 || !looksScript(args[0].text)) throw new DescriptorError(`${fn}() only accepts script expressions`);
    node.args.push(parseScript(args[0].text, args[0].start, fn as Context, keys));
  } else if (fn === "multi" || fn === "sortedmulti") {
    if (!/^\d+$/.test(args[0].text)) throw new DescriptorError("invalid threshold");
    const k = Number(args[0].text);
    const n = args.length - 1;
    if (k < 1) throw new DescriptorError("threshold must be at least 1");
    if (k > n) throw new DescriptorError("threshold larger than the number of keys");
    node.args.push({ type: "num", value: k, start: args[0].start, end: args[0].start + args[0].text.length });
    for (const a of args.slice(1)) {
      const key = parseKey(a.text, a.start, ctx);
      keys.push(key);
      node.args.push(key);
    }
    const max = ctx === "top" ? 3 : ctx === "wsh" ? 20 : 20;
    if (n > max) throw new DescriptorError(`at most ${max} keys in ${fn}() ${ctx === "top" ? "at the top level" : `inside ${ctx}()`}`);
  } else if (fn === "raw" || fn === "addr") {
    if (args.length !== 1) throw new DescriptorError(`${fn}() takes one argument`);
    const t = args[0].text;
    if (fn === "raw" && !/^([0-9a-fA-F]{2})*$/.test(t)) throw new DescriptorError("raw() needs hex");
    node.args.push({ type: "text", value: t, start: args[0].start, end: args[0].start + t.length });
  } else if (fn === "tr") {
    if (args.length < 1 || args.length > 2) throw new DescriptorError("tr() takes a key and an optional tree");
    const key = parseKey(args[0].text, args[0].start, "tr");
    if (!key.compressed) throw new DescriptorError("tr() keys must be x-only; uncompressed keys are not allowed");
    keys.push(key);
    node.args.push(key);
    if (args.length === 2) node.args.push(parseTree(args[1].text, args[1].start, keys));
  }
  // Compressed-key rules that depend on context.
  if (ctx === "wsh" || fn === "wsh" || fn === "wpkh") {
    for (const k of collectKeys(node)) if (!k.compressed) throw new DescriptorError(`uncompressed public keys are not allowed ${fn === "wpkh" ? "in wpkh()" : "under wsh()"}`);
  }
  return node;
}

function parseTree(s: string, offset: number, keys: KeyExpr[]): ScriptExpr | TreeExpr {
  if (!s.startsWith("{")) return parseScript(s, offset, "tr", keys);
  if (!s.endsWith("}")) throw new DescriptorError("unbalanced tree braces");
  const parts = splitArgs(s.slice(1, -1), offset + 1);
  if (parts.length !== 2) throw new DescriptorError("a tree pair needs exactly two branches");
  return { type: "tree", start: offset, end: offset + s.length, left: parseTree(parts[0].text, parts[0].start, keys), right: parseTree(parts[1].text, parts[1].start, keys) };
}

function collectKeys(n: ScriptExpr | TreeExpr): KeyExpr[] {
  if (n.type === "tree") return [...collectKeys(n.left), ...collectKeys(n.right)];
  return n.args.flatMap((a) => (a.type === "key" ? [a] : a.type === "script" || a.type === "tree" ? collectKeys(a) : []));
}

/** Parse a whole descriptor, with or without "#checksum". */
export function parseDescriptor(text: string): Descriptor {
  const checksum = descsumCheck(text);
  if (checksum.verdict !== "valid" && checksum.verdict !== "no-checksum") throw new DescriptorError(`checksum ${checksum.verdict}`);
  const body = checksum.body;
  const keys: KeyExpr[] = [];
  const root = parseScript(body, 0, "top", keys);
  return { text, body, checksum, root, keys, ranged: keys.some((k) => k.range !== null), hasPrivateKeys: keys.some((k) => k.isPrivate) };
}

/* ---------- expansion ---------- */

const push = (b: Uint8Array) => {
  if (b.length > 75) throw new DescriptorScopeError("push longer than 75 bytes");
  return b.length.toString(16).padStart(2, "0") + bytesToHex(b);
};
/** k and n in multi(): OP_0..OP_16, else a minimal signed little-endian push. */
function scriptNum(n: number): string {
  if (n === 0) return "00";
  if (n <= 16) return (0x50 + n).toString(16);
  const bytes: number[] = [];
  for (let v = n; v > 0; v >>= 8) bytes.push(v & 0xff);
  if (bytes[bytes.length - 1] & 0x80) bytes.push(0);
  return push(Uint8Array.from(bytes));
}

function addrScript(a: string): string {
  try {
    const raw = base58check.decode(a);
    if (raw.length === 21 && raw[0] === 0x00) return `76a914${bytesToHex(raw.slice(1))}88ac`;
    if (raw.length === 21 && raw[0] === 0x05) return `a914${bytesToHex(raw.slice(1))}87`;
  } catch {
    /* not base58 */
  }
  for (const codec of [bech32, bech32m]) {
    try {
      const d = codec.decode(a as `${string}1${string}`);
      if (d.prefix !== "bc") continue;
      const v = d.words[0];
      if ((v === 0) !== (codec === bech32)) continue;
      const prog = codec.fromWords(d.words.slice(1));
      return (v === 0 ? "00" : (0x50 + v).toString(16)) + push(prog);
    } catch {
      /* try next */
    }
  }
  throw new DescriptorError("invalid address");
}

const xonly = (pub: Uint8Array) => (pub.length === 32 ? pub : pub.slice(1, 33));

function treeAt(n: ScriptExpr | TreeExpr, index: number, ids: { n: number }): ScriptTree {
  if (n.type === "tree") return [treeAt(n.left, index, ids), treeAt(n.right, index, ids)];
  if (n.fn !== "pk") throw new DescriptorScopeError(`${n.fn}() as a tapscript leaf is outside this model's scope`);
  const k = n.args[0] as KeyExpr;
  return { id: ids.n++, script: push(xonly(keyAt(k, index).pub)) + "ac", leafVersion: 0xc0 };
}

/** The output script(s) of an expression at child `index`. combo() yields several. */
export function scriptsAt(n: ScriptExpr, index: number): string[] {
  const key = (i = 0) => keyAt(n.args[i] as KeyExpr, index).pub;
  switch (n.fn) {
    case "pk":
      return [push(key()) + "ac"];
    case "pkh":
      return [`76a914${bytesToHex(hash160(key()))}88ac`];
    case "wpkh":
      return [`0014${bytesToHex(hash160(key()))}`];
    case "sh": {
      const inner = scriptsAt(n.args[0] as ScriptExpr, index)[0];
      if (inner.length / 2 > 520) throw new DescriptorError("redeem script larger than 520 bytes");
      return [`a914${bytesToHex(hash160(hexToBytes(inner)))}87`];
    }
    case "wsh":
      return [`0020${bytesToHex(sha256(hexToBytes(scriptsAt(n.args[0] as ScriptExpr, index)[0])))}`];
    case "multi":
    case "sortedmulti": {
      const k = (n.args[0] as { value: number }).value;
      let keys = n.args.slice(1).map((a) => bytesToHex(keyAt(a as KeyExpr, index).pub));
      if (n.fn === "sortedmulti") keys = [...keys].sort();
      return [scriptNum(k) + keys.map((h) => push(hexToBytes(h))).join("") + scriptNum(keys.length) + "ae"];
    }
    case "combo": {
      const pub = key();
      const out = [push(pub) + "ac", `76a914${bytesToHex(hash160(pub))}88ac`];
      if (pub.length === 33) {
        const w = `0014${bytesToHex(hash160(pub))}`;
        out.push(w, `a914${bytesToHex(hash160(hexToBytes(w)))}87`);
      }
      return out;
    }
    case "raw":
      return [(n.args[0] as { value: string }).value.toLowerCase()];
    case "addr":
      return [addrScript((n.args[0] as { value: string }).value)];
    case "tr": {
      const internal = bytesToHex(xonly(key()));
      const tree = n.args[1] ? treeAt(n.args[1] as ScriptExpr | TreeExpr, index, { n: 0 }) : null;
      return [taprootOutput(internal, tree).scriptPubKeyHex];
    }
  }
  throw new DescriptorScopeError(`${n.fn}() is outside this model's scope`);
}

/** Expand a descriptor (child `index` for ranged ones), checking script-size limits. */
export function expand(d: Descriptor, index = 0): string[] {
  if (d.root.fn === "sh") {
    const inner = d.root.args[0] as ScriptExpr;
    if ((inner.fn === "multi" || inner.fn === "sortedmulti") && scriptsAt(inner, index)[0].length / 2 > 520) throw new DescriptorError("more keys than fit a 520-byte P2SH redeem script");
  }
  return scriptsAt(d.root, index);
}
