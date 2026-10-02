import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { checkControlBlock, taprootOutput } from "@bip-atlas/models/taproot";
import { layoutTree, seenMap } from "../src/taproot/treeLayout";
import type { DerivedTaprootTreeFixture, TaprootTreeFixture } from "../src/types";

const root = new URL("../../../", import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL("fixtures/taproot.json", root), "utf8")).fixtures;

/** Same reading as derive.ts readScript: pushes and OP_CHECKSIG, else size only. */
function readScript(hex: string): string {
  const parts: string[] = [];
  for (let i = 0; i < hex.length; ) {
    const op = parseInt(hex.slice(i, i + 2), 16);
    i += 2;
    if (op >= 1 && op <= 75) {
      i += op * 2;
      parts.push(op === 32 ? "<32-byte key>" : `<${op}-byte push>`);
    } else if (op === 0xac) parts.push("OP_CHECKSIG");
    else return `${hex.length / 2}-byte script`;
  }
  return parts.join(" ");
}

/** The values deriveTaprootTree computes (the site build also checks them against the vectors). */
export function derived(id: string): DerivedTaprootTreeFixture {
  const f: TaprootTreeFixture = fixtures.find((x: { id: string }) => x.id === id);
  const out = taprootOutput(f.given.internalPubkey, f.given.scriptTree as never);
  const byId = [...out.leaves].sort((a, b) => a.id - b.id);
  const leaves = byId.map((l) => {
    const cb = out.controlBlocks[out.leaves.indexOf(l)];
    return { id: l.id, leafVersion: l.leafVersion, scriptHex: l.scriptHex, scriptReading: readScript(l.scriptHex), leafHash: l.leafHash, path: l.path, controlBlockHex: cb, check: checkControlBlock(out.tweak.outputKeyHex, l.scriptHex, cb).steps };
  });
  return {
    ...f,
    derived: {
      internalKeyHex: out.internalKeyHex,
      merkleRootHex: out.merkleRootHex,
      tweakHex: out.tweak.tweakHex,
      outputKeyHex: out.tweak.outputKeyHex,
      parity: out.tweak.parity,
      scriptPubKeyHex: out.scriptPubKeyHex,
      address: f.expected.bip350Address,
      root: out.node,
      leaves,
      keySpend: f.keySpend ? { signatureHex: f.keySpend.witness[0], hashType: f.keySpend.hashType, sighashHex: f.keySpend.sigHash, verified: true } : null,
    },
  };
}
export const html = (n: VNode<any>) => render(n);
export const count = (s: string, needle: string) => s.split(needle).length - 1;
const tally = (m: Map<string, string>) => [...m.values()].reduce((a, s) => ((a[s] = (a[s] ?? 0) + 1), a), {} as Record<string, number>);

describe("treeLayout", () => {
  const d = derived("bip341-spk5").derived;
  it("places 5 nodes for vector 5, leaves at the bottom", () => {
    const nodes = layoutTree(d.root!, 300, 60);
    expect(nodes.length).toBe(5);
    expect(nodes.filter((n) => n.leaf !== null).map((n) => n.leaf).sort()).toEqual([0, 1, 2]);
    expect(Math.max(...nodes.map((n) => n.depth))).toBe(2);
  });
  it("proof view of leaf B shows B, its two ancestors and two opaque siblings, nothing else", () => {
    expect(tally(seenMap(d.root!, "script", 1, true))).toEqual({ revealed: 1, recomputed: 2, sibling: 2 });
  });
  it("proof view of leaf A hides the B–C subtree behind one sibling hash", () => {
    expect(tally(seenMap(d.root!, "script", 0, true))).toEqual({ revealed: 1, recomputed: 1, sibling: 1, absent: 2 });
  });
  it("key path in proof view shows no tree at all", () => {
    expect([...seenMap(d.root!, "key", 0, true).values()].every((s) => s === "absent")).toBe(true);
  });
  it("wallet view of leaf A keeps the subtree drawn as known", () => {
    expect(tally(seenMap(d.root!, "script", 0, false))).toEqual({ revealed: 1, recomputed: 1, sibling: 1, known: 2 });
  });
});
