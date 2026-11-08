import { bytesToHex, parseDescriptor, expand, keyAt, descsumCheck, descsumCreate, descsumExpand, ALLOWED } from "@bip-atlas/models";
import type { DescriptorVectorFixture, DerivedDescriptorFixture, DescriptorIndexFixture, DerivedDescriptorIndexFixture, DescriptorTokenRole } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE3, pinnedText } from "./sources";

const fmtSteps = (steps: Array<{ index: number; hardened: boolean }>) => steps.map((p) => `/${p.index}${p.hardened ? "h" : ""}`).join("");

export function deriveDescriptor(f: DescriptorVectorFixture): DerivedDescriptorFixture {
  const lines = pinnedText(`bip-0${f.source.bip}.mediawiki`, SNAPSHOT_PHASE3).split("\n");
  const tt = (n: number) => [...lines[n - 1].matchAll(/<tt>(.*?)<\/tt>/g)].map((m) => m[1]).at(-1);
  if (tt(f.source.line!) !== f.descriptor) throw new Error(`${f.id}: descriptor is not on BIP ${f.source.bip} line ${f.source.line}`);
  const check = descsumCheck(f.descriptor);
  const body = check.body;
  const symbols = descsumExpand(body)!;
  // Character roles, filled in from the parse tree.
  const roles: DescriptorTokenRole[] = [...body].map((c) => (/[(),{}]/.test(c) ? "punct" : "text"));
  const keyOf: Array<number | null> = [...body].map(() => null);
  let error: string | null = null;
  let d: ReturnType<typeof parseDescriptor> | null = null;
  try {
    d = parseDescriptor(f.descriptor);
  } catch (e) {
    error = (e as Error).message;
  }
  const scripts: string[][] = [];
  let outline = "";
  const keys: DerivedDescriptorFixture["derived"]["keys"] = [];
  if (d) {
    const mark = (from: number, to: number, role: DescriptorTokenRole, key: number | null = null) => {
      for (let i = from; i < to; i++) (roles[i] = role), (keyOf[i] = key);
    };
    const walk = (n: any): string => {
      if (n.type === "tree") return `{${walk(n.left)}, ${walk(n.right)}}`;
      mark(n.start, n.nameEnd, "fn");
      return `${n.fn}(${n.args.map((a: any) => (a.type === "key" ? "KEY" : a.type === "num" ? (mark(a.start, a.end, "num"), String(a.value)) : a.type === "text" ? "…" : walk(a))).join(", ")})`;
    };
    outline = walk(d.root);
    d.keys.forEach((k, i) => {
      mark(k.start, k.end, "key", i);
      if (k.origin) mark(k.origin.start, k.origin.end, "origin", i);
      if (k.pathStart !== null) mark(k.pathStart, k.end, "path", i);
      if (k.range) mark(k.end - (k.range === "hardened" ? 3 : 2), k.end, "range", i);
      const n = k.range ? 3 : 1;
      keys.push({
        text: k.text,
        kind: k.kind,
        isPrivate: k.isPrivate,
        xonly: d!.root.fn === "tr",
        origin: k.origin ? `${k.origin.fingerprint}${fmtSteps(k.origin.path)}` : null,
        derivation: k.ext ? fmtSteps(k.path) + (k.range ? `/*${k.range === "hardened" ? "h" : ""}` : "") || null : null,
        range: k.range,
        // BIP 386: every key under tr() is serialized x-only.
        publicKeys: Array.from({ length: n }, (_, i) => { const pub = keyAt(k, i).pub; return bytesToHex(d!.root.fn === "tr" && pub.length === 33 ? pub.slice(1) : pub); }),
      });
    });
    const children = d.root.fn === "combo" ? (d.ranged ? 2 : 1) : d.ranged ? 3 : 1;
    for (let i = 0; i < children; i++) scripts.push(expand(d, i));
    const published = f.scriptLines.map((n) => tt(n));
    const got = d.root.fn === "combo" ? scripts.flat() : scripts.map((s) => s[0]);
    // BIP 380's checksum vectors list no scripts; every other fixture must match what its BIP lists.
    if (published.length && JSON.stringify(got) !== JSON.stringify(published)) throw new Error(`${f.id}: expansion differs from the published scripts`);
  }
  for (let i = 0; i < roles.length; i++) if (roles[i] === "text" && /[a-zA-Z0-9]/.test(body[i]) === false && body[i] !== "") roles[i] = "punct";
  // Merge characters into tokens.
  const tokens: DerivedDescriptorFixture["derived"]["tokens"] = [];
  [...body].forEach((c, i) => {
    const last = tokens[tokens.length - 1];
    if (last && last.role === roles[i] && last.key === keyOf[i] && roles[i] !== "punct") last.text += c;
    else tokens.push({ text: c, role: roles[i], key: keyOf[i] });
  });
  if (check.given !== null) tokens.push({ text: "#", role: "hash", key: null }, { text: check.given, role: "checksum", key: null });
  return {
    ...f,
    derived: {
      body,
      checksumGiven: check.given,
      checksumComputed: descsumCreate(body),
      checksumVerdict: check.verdict,
      symbolCount: symbols.length,
      symbols,
      tokens,
      error,
      outline,
      keys,
      ranged: d?.ranged ?? false,
      hasPrivateKeys: d?.hasPrivateKeys ?? false,
      scripts,
    },
  };
}

const TEMPLATES: Record<string, string> = {
  pk: "<KEY> OP_CHECKSIG",
  pkh: "OP_DUP OP_HASH160 <KEY_hash160> OP_EQUALVERIFY OP_CHECKSIG",
  sh: "OP_HASH160 <SCRIPT_hash160> OP_EQUAL",
  wpkh: "OP_0 <KEY_hash160>",
  wsh: "OP_0 <SCRIPT_sha256>",
  multi: "k KEY_1 … KEY_n n OP_CHECKMULTISIG",
  sortedmulti: "as multi(), keys sorted",
  combo: "P2PK, P2PKH (+ P2WPKH, P2SH-P2WPKH if compressed)",
  raw: "the script itself",
  addr: "the address's output script",
  tr: "OP_1 <32_byte_output_key>",
};

export function deriveDescriptorIndex(f: DescriptorIndexFixture): DerivedDescriptorIndexFixture {
  const lines = pinnedText("bip-0380.mediawiki", SNAPSHOT_PHASE3).split("\n").slice(f.tableFrom - 1, f.tableTo);
  const rows: DerivedDescriptorIndexFixture["derived"]["rows"] = [];
  for (let i = 0; i < lines.length; i++) {
    const exprs = [...lines[i].matchAll(/<tt>(.*?)<\/tt>/g)].map((m) => m[1]);
    if (!exprs.length) continue;
    const bip = Number(/\|(\d+)\]\]/.exec(lines[i + 1])?.[1]);
    for (const e of exprs) {
      const fn = /^([a-z_]+)\(/.exec(e)![1];
      rows.push({ expression: e, bip, contexts: ALLOWED[fn] ?? null, template: TEMPLATES[fn] ?? null });
    }
  }
  if (rows.length < 12) throw new Error(`${f.id}: index table moved`);
  return { ...f, derived: { rows } };
}
