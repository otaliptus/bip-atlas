import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { ckdPriv, ckdPub, derivePath, fingerprint, formatIndex, hash160, masterFromSeed, neuter, parsePath, recoverParentPrivateKey, serialize, serializeRaw } from "@bip-atlas/models/bip32";
import { bytesToHex, hexToBytes } from "@bip-atlas/models/hex";
import { ChildStory } from "../src/hd/ChildStory";
import { DerivationTree, layoutHdTree, visibleNodes } from "../src/hd/DerivationTree";
import { ExtendedKeyLayout, splitXkey } from "../src/hd/ExtendedKeyLayout";
import { ExtendedKeyPlates } from "../src/hd/ExtendedKeyPlates";
import { Fingerprint } from "../src/hd/Fingerprint";
import { HdSharing } from "../src/hd/HdSharing";
import { HmacInputs, hmacParts } from "../src/hd/HmacInputs";
import { MasterKeySplit } from "../src/hd/MasterKeySplit";
import { TwoRoutes } from "../src/hd/TwoRoutes";
import { WeaknessStory } from "../src/hd/WeaknessStory";
import type { Bip32SeedFixture, DerivedBip32Fixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixture: Bip32SeedFixture = JSON.parse(readFileSync(new URL("fixtures/hd-wallets.json", root), "utf8")).fixtures[0];
const hex32 = (n: number) => n.toString(16).padStart(8, "0");
const sha256 = (b: Uint8Array) => new Uint8Array(createHash("sha256").update(b).digest());

/** The values deriveBip32 computes (derive.ts also checks them against the vectors and throws). */
export function derived(f: Bip32SeedFixture = fixture): DerivedBip32Fixture {
  const master = masterFromSeed(hexToBytes(f.seedHex));
  const nodes = f.tree.paths.map((path) => {
    const indices = parsePath(path);
    const key = derivePath(master.key, path);
    const parentPath = indices.length ? path.slice(0, path.lastIndexOf("/")) : null;
    const step = parentPath ? ckdPriv(derivePath(master.key, parentPath), indices.at(-1)!) : null;
    const hardenedAt = indices.findIndex((i) => i >= 0x80000000);
    return {
      path, parentPath, depth: key.depth,
      indexLabel: indices.length ? formatIndex(indices.at(-1)!) : "m",
      hardened: indices.length > 0 && indices.at(-1)! >= 0x80000000,
      xprv: serialize(key, "private"), xpub: serialize(key, "public"),
      fingerprintHex: hex32(fingerprint(key)), parentFingerprintHex: hex32(key.parentFingerprint), childNumberHex: hex32(key.childNumber),
      chainCodeHex: bytesToHex(key.chainCode), publicKeyHex: bytesToHex(key.publicKey), privateKeyHex: bytesToHex(key.privateKey!),
      hmacDataHex: step ? step.dataHex : null, hmacOutHex: step ? step.iHex : null, identifierHex: bytesToHex(hash160(key.publicKey)),
      vectorLine: f.vectorChains.find((c) => c.path === path)?.line ?? null,
      hardenedAncestor: hardenedAt >= 0 ? `m/${indices.slice(0, hardenedAt + 1).map(formatIndex).join("/")}` : null,
    };
  });
  const child = nodes.find((n) => n.path === f.recoveryPath)!;
  const parent = nodes.find((n) => n.path === child.parentPath)!;
  const index = parsePath(child.path).at(-1)!;
  const recovery = {
    parentPath: parent.path, childPath: child.path, index, iLHex: child.hmacOutHex!.slice(0, 64), childPrivateKeyHex: child.privateKeyHex,
    recoveredHex: bytesToHex(recoverParentPrivateKey(neuter(derivePath(master.key, parent.path)), hexToBytes(child.privateKeyHex), index)),
  };
  const serialKey = derivePath(master.key, f.serializePath);
  const rows = (["public", "private"] as const).map((kind) => {
    const raw = serializeRaw(serialKey, kind);
    return { kind, rawHex: bytesToHex(raw), checksumHex: bytesToHex(sha256(sha256(raw)).slice(0, 4)), base58: serialize(serialKey, kind) };
  });
  return { ...f, derived: { masterIHex: master.iHex, nodes, recovery, serialization: { path: f.serializePath, rows } } };
}

const html = (n: VNode<any>) => render(n);
const d = derived();
const node = (p: string) => d.derived.nodes.find((n) => n.path === p)!;
const short = (hex: string) => `${hex.slice(0, 8)}…`;
const disclosure = (s: string) => s.slice(s.indexOf("<details"));

describe("the derived tree (mirrors derive.ts)", () => {
  it("reproduces every published chain of test vector 1", () => {
    for (const c of fixture.vectorChains) {
      expect(node(c.path).xpub).toBe(c.xpub);
      expect(node(c.path).xprv).toBe(c.xprv);
    }
  });
  it("gives the same public key and I by CKDpub for every normal child", () => {
    const master = masterFromSeed(hexToBytes(fixture.seedHex)).key;
    const normal = d.derived.nodes.filter((n) => n.parentPath && !n.hardened);
    expect(normal.length).toBeGreaterThanOrEqual(4);
    for (const n of normal) {
      const pub = ckdPub(neuter(derivePath(master, n.parentPath!)), parsePath(n.path).at(-1)!);
      expect(bytesToHex(pub.key.publicKey)).toBe(n.publicKeyHex);
      expect(pub.iHex).toBe(n.hmacOutHex);
    }
  });
  it("recovers m/0H's private key from its xpub and m/0H/1's private key", () => {
    expect(d.derived.recovery.recoveredHex).toBe(node("m/0H").privateKeyHex);
    expect(d.derived.recovery.childPath).toBe("m/0H/1");
  });
});

describe("MasterKeySplit", () => {
  const s = html(h(MasterKeySplit, { fixture: d }));
  it("draws every seed byte and all 64 bytes of I, cut into key and chain code", () => {
    for (const b of fixture.seedHex.match(/../g)!) expect(s).toContain(`>${b}<`);
    for (const b of d.derived.masterIHex.match(/../g)!) expect(s).toContain(`>${b}<`);
    expect(d.derived.masterIHex).toBe(node("m").privateKeyHex + node("m").chainCodeHex);
    expect(s).toContain("I_L → MASTER PRIVATE KEY");
  });
  it("gives the published master xprv in full in a disclosure", () => {
    expect(disclosure(s)).toContain(fixture.vectorChains[0].xprv);
    expect(s).toContain("MATCHES BIP 32 LINE 223");
  });
});

describe("ExtendedKeyPlates", () => {
  const s = html(h(ExtendedKeyPlates, { fixture: d }));
  it("engraves shortened k, K and c from the model, exact values below", () => {
    const m = node("m");
    for (const v of [m.privateKeyHex, m.publicKeyHex, m.chainCodeHex]) {
      expect(s).toContain(short(v));
      expect(disclosure(s)).toContain(v);
    }
    expect(s).toContain("private key k · 32 B");
    expect(s).toContain("public key K · 33 B");
  });
});

describe("HmacInputs", () => {
  const s = html(h(HmacInputs, { fixture: d }));
  it("splits both HMAC inputs as BIP 32 says, and shows them in full", () => {
    const parts = hmacParts(node("m/0H"), node("m"));
    expect(parts.map((p) => p.hex).join("")).toBe(node("m/0H").hmacDataHex);
    expect(parts[0].hex).toBe("00");
    expect(hmacParts(node("m/0H/1"), node("m/0H"))[0].hex).toBe(node("m/0H").publicKeyHex);
    expect(disclosure(s)).toContain(node("m/0H").hmacDataHex!);
    expect(disclosure(s)).toContain(node("m/0H/1").hmacDataHex!);
    expect(s).toContain("i = 80000000");
    expect(s).toContain("0x80 = 10000000");
  });
  it("throws if a step's data does not split as BIP 32 says", () => {
    expect(() => hmacParts({ ...node("m/0H"), hmacDataHex: "00" + "11".repeat(36) }, node("m"))).toThrow();
  });
});

describe("ChildStory", () => {
  const s = html(h(ChildStory, { fixture: d }));
  it("has four frames, the 64 HMAC bytes and the published child", () => {
    expect(s.split('class="k-story__frame"').length - 1).toBe(4);
    for (const b of node("m/0H/1").hmacOutHex!.match(/../g)!) expect(s).toContain(`>${b}<`);
    expect(disclosure(s)).toContain(fixture.vectorChains.find((c) => c.path === "m/0H/1")!.xprv);
    expect(s).toContain("MATCHES BIP 32 LINE 229");
  });
});

describe("TwoRoutes", () => {
  const s = html(h(TwoRoutes, { fixture: d }));
  it("meets at the child's public key", () => {
    expect(s).toContain(`K′  ${short(node("m/0H/1").publicKeyHex)}`);
    expect(disclosure(s)).toContain(node("m/0H/1").publicKeyHex);
    expect(s).toContain(short(node("m/0H/1").hmacOutHex!.slice(0, 64)));
  });
});

describe("WeaknessStory", () => {
  const s = html(h(WeaknessStory, { fixture: d }));
  it("recovers the parent key and says where the climb stops", () => {
    expect(disclosure(s)).toContain(node("m/0H").privateKeyHex);
    expect(disclosure(s)).toContain(fixture.vectorChains.find((c) => c.path === "m/0H")!.xpub);
    expect(s).toContain("HARDENED: STOPS HERE");
  });
  it("refuses a recovery that does not match", () => {
    const bad = { ...d, derived: { ...d.derived, recovery: { ...d.derived.recovery, recoveredHex: "00".repeat(32) } } };
    expect(() => html(h(WeaknessStory, { fixture: bad }))).toThrow();
  });
});

describe("ExtendedKeyLayout", () => {
  const s = html(h(ExtendedKeyLayout, { fixture: d }));
  const [pub, prv] = d.derived.serialization.rows;
  it("splits 82 bytes into the seven fields; only version, key and checksum differ", () => {
    const a = splitXkey(pub.rawHex, pub.checksumHex), b = splitXkey(prv.rawHex, prv.checksumHex);
    expect(a.map((f) => f.id).filter((_, i) => a[i].hex !== b[i].hex)).toEqual(["version", "key", "check"]);
    expect(a.find((f) => f.id === "chain")!.hex).toBe(node("m/0H").chainCodeHex);
    expect(a.find((f) => f.id === "child")!.hex).toBe("80000000");
    expect(s.split("k-cell--em").length - 1).toBe(6);
  });
  it("gives every field and both strings exactly", () => {
    for (const f of splitXkey(prv.rawHex, prv.checksumHex)) expect(disclosure(s)).toContain(f.hex);
    expect(disclosure(s)).toContain(pub.base58);
    expect(pub.base58.length).toBe(111);
  });
});

describe("Fingerprint", () => {
  const s = html(h(Fingerprint, { fixture: d }));
  it("shows the identifier and the fingerprint m/0H carries", () => {
    for (const b of node("m").identifierHex.match(/../g)!) expect(s).toContain(`>${b}<`);
    expect(node("m/0H").parentFingerprintHex).toBe(node("m").identifierHex.slice(0, 8));
  });
});

describe("HdSharing", () => {
  it("is schematic: no key material at all", () => {
    const s = html(h(HdSharing, {}));
    expect(s).not.toMatch(/[0-9a-f]{8}/);
    expect(s).toContain("NONE OF THEM HOLDS A KEY THAT CAN SPEND");
  });
});

describe("DerivationTree (hero)", () => {
  const renderAt = (initial?: { view: "private" | "public"; hardenedBranch: boolean; branch: string }) => html(h(DerivationTree, { fixture: d, figureId: "fig-a02-5", initial }));
  const privates = d.derived.nodes.flatMap((n) => [n.privateKeyHex, n.xprv]);
  const valuesOf = (p: string) => { const n = node(p); return [n.publicKeyHex, n.chainCodeHex, n.xpub, n.privateKeyHex, n.xprv, n.hmacOutHex ?? "", n.hmacDataHex ?? ""].filter(Boolean); };
  const leaks = (s: string, values: string[]) => values.filter((v) => s.includes(v.slice(0, 8)));

  it("lays the visible tree out with leaves in slots and parents centred", () => {
    const spots = layoutHdTree(visibleNodes(d, false), 300, 60, 0);
    expect(spots.length).toBe(7);
    const x = (p: string) => spots.find((s) => s.node.path === p)!.x;
    expect(x("m/0H")).toBeCloseTo((x("m/0H/0") + x("m/0H/1")) / 2);
    expect(visibleNodes(d, true).map((n) => n.path)).toContain("m/1H");
  });
  it("no-JS default: held as m, branch m/0H/1 opened, values from the model", () => {
    const s = renderAt();
    expect(s).toContain('data-hydrated="false"');
    expect(s).toContain("Branch m/0H/1 is normal.");
    expect(s).toContain(short(node("m/0H").chainCodeHex));
    expect(disclosure(s)).toContain(node("m/0H/1").xprv);
  });
  it("public view, hardened branch from M: shows the closed gate and leaks nothing behind it", () => {
    const s = renderAt({ view: "public", hardenedBranch: false, branch: "m/0H" });
    expect(s).toContain("CKDPUB STOPS");
    expect(s).toContain("CANNOT DERIVE");
    expect(leaks(s, privates)).toEqual([]);
    for (const p of ["m/0H", "m/0H/0", "m/0H/1", "m/0H/1/2H"]) expect(leaks(s, valuesOf(p)), p).toEqual([]);
    expect(s).toContain(short(node("m").chainCodeHex));
  });
  it("public view, below a hardened edge: not even the parent's public values", () => {
    const s = renderAt({ view: "public", hardenedBranch: false, branch: "m/0H/1" });
    expect(s).toContain("out of reach");
    expect(leaks(s, privates)).toEqual([]);
    for (const p of ["m/0H", "m/0H/1"]) expect(leaks(s, valuesOf(p)), p).toEqual([]);
  });
  it("public view, normal branch: derives M/1/0 by CKDpub, with no private value", () => {
    const s = renderAt({ view: "public", hardenedBranch: false, branch: "m/1/0" });
    expect(s).toContain("K′ = point(I_L) + K");
    expect(disclosure(s)).toContain(node("m/1/0").xpub);
    expect(leaks(s, privates)).toEqual([]);
    expect(s).toContain(">M/1/0<");
  });
  it("public view with branch 1 hardened: m/1H is out of reach too", () => {
    const s = renderAt({ view: "public", hardenedBranch: true, branch: "m/1H" });
    expect(leaks(s, privates)).toEqual([]);
    for (const p of ["m/1H", "m/1H/0"]) expect(leaks(s, valuesOf(p)), p).toEqual([]);
    expect(s).not.toContain(">M/1<");
  });
  it("throws for a branch that is not drawn", () => {
    expect(() => renderAt({ view: "private", hardenedBranch: false, branch: "m/1H" })).toThrow();
  });
});
