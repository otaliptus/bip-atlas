import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { descsumCheck, descsumCreate, descsumExpand } from "@bip-atlas/models/descsum";
import { ALLOWED, expand, keyAt, parseDescriptor } from "@bip-atlas/models/descriptors";
import { bytesToHex } from "@bip-atlas/models/hex";
import { DescriptorAnatomy } from "../src/descriptors/DescriptorAnatomy";
import { DescriptorChecksum } from "../src/descriptors/DescriptorChecksum";
import { DescriptorIndex } from "../src/descriptors/DescriptorIndex";
import { DescriptorNesting } from "../src/descriptors/DescriptorNesting";
import { DescriptorReadStory } from "../src/descriptors/DescriptorReadStory";
import { DescriptorSentence } from "../src/descriptors/DescriptorSentence";
import { DescriptorSpellings } from "../src/descriptors/DescriptorSpellings";
import { DescriptorTemplate } from "../src/descriptors/DescriptorTemplate";
import { DescriptorTypo } from "../src/descriptors/DescriptorTypo";
import { descTree } from "../src/descriptors/descTree";
import type { DerivedDescriptorFixture, DerivedDescriptorIndexFixture, DescriptorIndexFixture, DescriptorTokenRole, DescriptorVectorFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/descriptors.json", root), "utf8")).fixtures;
const bip = (n: number) => readFileSync(new URL(`sources/research-2026-10-01-phase3/raw/bip-0${n}.mediawiki`, root), "utf8").split("\n");
const fmtSteps = (steps: Array<{ index: number; hardened: boolean }>) => steps.map((p) => `/${p.index}${p.hardened ? "h" : ""}`).join("");

/** The values deriveDescriptor computes (derive.ts also checks each expansion against the BIP's listed scripts). */
export function derived(id: string): DerivedDescriptorFixture {
  const f: DescriptorVectorFixture = fixtures.find((x: { id: string }) => x.id === id);
  const lines = bip(f.source.bip!);
  const tt = (n: number) => [...lines[n - 1].matchAll(/<tt>(.*?)<\/tt>/g)].map((m) => m[1]).at(-1);
  const check = descsumCheck(f.descriptor);
  const body = check.body;
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
        text: k.text, kind: k.kind, isPrivate: k.isPrivate,
        origin: k.origin ? `${k.origin.fingerprint}${fmtSteps(k.origin.path)}` : null,
        derivation: k.ext ? fmtSteps(k.path) + (k.range ? `/*${k.range === "hardened" ? "h" : ""}` : "") || null : null,
        range: k.range,
        publicKeys: Array.from({ length: n }, (_, i) => bytesToHex(keyAt(k, i).pub)),
      });
    });
    const children = d.root.fn === "combo" ? (d.ranged ? 2 : 1) : d.ranged ? 3 : 1;
    for (let i = 0; i < children; i++) scripts.push(expand(d, i));
    const published = f.scriptLines.map((n) => tt(n));
    const got = d.root.fn === "combo" ? scripts.flat() : scripts.map((s) => s[0]);
    if (published.length) expect(got).toEqual(published);
  }
  for (let i = 0; i < roles.length; i++) if (roles[i] === "text" && /[a-zA-Z0-9]/.test(body[i]) === false && body[i] !== "") roles[i] = "punct";
  const tokens: DerivedDescriptorFixture["derived"]["tokens"] = [];
  [...body].forEach((c, i) => {
    const last = tokens[tokens.length - 1];
    if (last && last.role === roles[i] && last.key === keyOf[i] && roles[i] !== "punct") last.text += c;
    else tokens.push({ text: c, role: roles[i], key: keyOf[i] });
  });
  if (check.given !== null) tokens.push({ text: "#", role: "hash", key: null }, { text: check.given, role: "checksum", key: null });
  const symbols = descsumExpand(body)!;
  return {
    ...f,
    derived: {
      body, checksumGiven: check.given, checksumComputed: descsumCreate(body), checksumVerdict: check.verdict, symbolCount: symbols.length, symbols, tokens, error, outline, keys,
      ranged: d?.ranged ?? false, hasPrivateKeys: d?.hasPrivateKeys ?? false, scripts,
    },
  };
}

const html = (n: VNode<any>) => render(n);
const disclosure = (s: string) => s.slice(s.indexOf("<details"));
const heroIds = ["bip382-wpkh-ranged", "bip380-raw-valid", "bip380-raw-typo", "bip381-pkh-origin", "bip382-sh-wpkh-xprv", "bip383-sortedmulti", "bip384-combo", "bip386-tr-tree"];

describe("descTree", () => {
  it("rebuilds the nesting of every parsed hero descriptor", () => {
    const shape = (id: string) => {
      const t = descTree(derived(id).derived.tokens);
      const s = (n: ReturnType<typeof descTree>): string => (n.kind === "fn" ? `${n.name}(${n.children.map(s).join(",")})` : n.kind === "tree" ? `{${n.children.map(s).join(",")}}` : n.kind === "key" ? "K" : n.kind === "num" ? n.text : "T");
      return s(t);
    };
    expect(shape("bip382-sh-wpkh-xprv")).toBe("sh(wpkh(K))");
    expect(shape("bip383-sortedmulti")).toBe("sortedmulti(2,K,K)");
    expect(shape("bip386-tr-tree")).toBe("tr(K,{pk(K),{{pk(K),pk(K)},pk(K)}})");
    expect(shape("bip380-raw-valid")).toBe("raw(T)");
  });
});

describe("DescriptorSentence", () => {
  const d = derived("bip382-wpkh-ranged");
  const s = html(h(DescriptorSentence, { fixture: d }));
  it("names each part and gives the descriptor in full", () => {
    for (const label of ["SCRIPT EXPRESSION", "KEY ORIGIN", "PUBLIC KEY", "DERIVATION", "RANGE"]) expect(s).toContain(label);
    expect(s).toContain(">[ffffffff/13′]<");
    expect(disclosure(s)).toContain(d.descriptor);
  });
});

describe("DescriptorNesting", () => {
  const d = derived("bip382-sh-wpkh-xprv");
  const s = html(h(DescriptorNesting, { fixture: d }));
  it("draws sh around wpkh around an xprv, and the published child-0 script", () => {
    expect(s).toContain(">sh( )<");
    expect(s).toContain(">wpkh( )<");
    expect(s).toContain("HOLDS AN XPRV: A SPENDING SECRET");
    expect(disclosure(s)).toContain(d.derived.scripts[0][0]);
    expect(d.derived.scripts[0][0]).toBe([...bip(382)[71].matchAll(/<tt>(.*?)<\/tt>/g)][0][1]);
  });
});

describe("DescriptorTemplate", () => {
  const d = derived("bip381-pkh-origin");
  const s = html(h(DescriptorTemplate, { fixture: d }));
  it("splits BIP 381's published script into the pkh template", () => {
    const script = d.derived.scripts[0][0];
    expect(script).toBe("76a9149a1c78a507689f6f54b847ad1cef1e614ee23f1e88ac");
    for (const part of ["OP_DUP", "OP_HASH160", "&lt;KEY_hash160>", "OP_EQUALVERIFY", "OP_CHECKSIG"]) expect(s).toContain(part);
    expect(disclosure(s)).toContain(script.slice(6, 46));
  });
});

describe("DescriptorSpellings", () => {
  const ds = ["bip381-pkh-origin-wif", "bip381-pkh-origin", "bip381-pkh-origin-h"].map(derived);
  it("gives one script for three spellings, as written", () => {
    expect(new Set(ds.map((d) => d.derived.scripts[0][0])).size).toBe(1);
    const s = html(h(DescriptorSpellings, { fixtures: ds }));
    expect(s).toContain(">[deadbeef/1/2'/3/4']<");
    expect(s).toContain(">[deadbeef/1/2h/3/4h]<");
    expect(s).toContain("WIF PRIVATE KEY");
  });
  it("refuses spellings that give different scripts", () => {
    expect(() => html(h(DescriptorSpellings, { fixtures: [ds[0], derived("bip382-wpkh-ranged")] }))).toThrow();
  });
});

describe("DescriptorAnatomy (hero)", () => {
  const all = heroIds.map(derived);
  const at = (initial?: { fixtureId: string; key: number; checked: boolean }) => html(h(DescriptorAnatomy, { fixtures: all, figureId: "fig-a13-5", initial }));
  it("no-JS default: the ranged wpkh(), checksum checked, three scripts", () => {
    const s = at();
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain("PUBLIC KEYS ONLY");
    for (const sc of all[0].derived.scripts) expect(disclosure(s)).toContain(sc[0]);
    expect(s).toContain(`#${all[0].derived.checksumComputed}`);
  });
  it("flags descriptors with private keys and draws every tr() leaf", () => {
    const s = at({ fixtureId: "bip386-tr-tree", key: 1, checked: false });
    expect(s).toContain("HOLDS A PRIVATE KEY: A SPENDING SECRET");
    expect(s.split(">pk( )<").length - 1).toBe(4 * 2);
    expect(s).toContain("KEY 2 OF 5 · EXTENDED PRIVATE KEY");
  });
  it("shows a payload typo as rejected, with no scripts", () => {
    const s = at({ fixtureId: "bip380-raw-typo", key: 0, checked: true });
    expect(s).toContain("DOES NOT MATCH: REJECTED");
    expect(s).toContain("NONE: THE DESCRIPTOR IS REJECTED");
  });
});

describe("DescriptorReadStory", () => {
  const d = derived("bip382-wpkh-ranged");
  const s = html(h(DescriptorReadStory, { fixture: d }));
  it("expands three children to the scripts BIP 382 lists", () => {
    expect(s.split('class="k-story__frame"').length - 1).toBe(4);
    for (const k of d.derived.keys[0].publicKeys) expect(disclosure(s)).toContain(k);
    for (const [i, line] of d.scriptLines.entries()) expect(d.derived.scripts[i][0]).toBe([...bip(382)[line - 1].matchAll(/<tt>(.*?)<\/tt>/g)][0][1]);
  });
});

describe("DescriptorChecksum", () => {
  const d = derived("bip380-raw-valid");
  const s = html(h(DescriptorChecksum, { fixture: d }));
  it("draws every symbol and the published checksum", () => {
    expect(d.derived.symbols.length).toBe(18);
    expect(d.derived.checksumComputed).toBe("89f8spxm");
    expect(s).toContain("#89f8spxm");
    expect(s.split("k-cell--em").length - 1).toBe(d.derived.symbols.filter((x) => x.char === null).length);
  });
});

describe("DescriptorTypo", () => {
  const a = derived("bip380-raw-valid"), b = derived("bip380-raw-typo");
  const s = html(h(DescriptorTypo, { fixtures: [a, b] }));
  it("catches the typo and shows that anyone can recompute a valid checksum", () => {
    expect(b.derived.checksumVerdict).toBe("mismatch");
    expect(descsumCheck(`${b.derived.body}#${b.derived.checksumComputed}`).verdict).toBe("valid");
    expect(s).toContain("TYPO CAUGHT");
    expect(s).toContain(`COMPUTED #${b.derived.checksumComputed}`);
  });
});

describe("DescriptorIndex", () => {
  const f: DescriptorIndexFixture = fixtures.find((x: { id: string }) => x.id === "bip380-index");
  it("marks every allowed context from the model", () => {
    const rows = [
      { expression: "pk(KEY)", bip: 381, contexts: ALLOWED.pk, template: null },
      { expression: "sp(KEY)", bip: 392, contexts: null, template: null },
    ];
    const d: DerivedDescriptorIndexFixture = { ...f, derived: { rows } };
    const s = html(h(DescriptorIndex, { fixture: d }));
    expect(s.split('class="k-mark--plain"').length - 1).toBe(ALLOWED.pk.length + 1);
    expect(s).toContain("url(#a13-index-hatch)");
  });
});
