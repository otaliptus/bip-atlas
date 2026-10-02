import { readFileSync } from "node:fs";
import { h, type VNode } from "preact";
import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { checkControlBlock, sigMsg, taprootOutput, taprootSighash } from "@bip-atlas/models/taproot";
import { parseTransaction } from "@bip-atlas/models/tx";
import { SigMsgLayout } from "../src/taproot/SigMsgLayout";
import { TaprootTweak } from "../src/taproot/TaprootTweak";
import { layoutTree, seenMap } from "../src/taproot/treeLayout";
import type { DerivedTaprootKeyspendFixture, DerivedTaprootTreeFixture, TaprootKeyspendFixture, TaprootTreeFixture } from "../src/types";

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

const vectors = JSON.parse(readFileSync(new URL("sources/research-2026-10-01/raw/bip-0341/wallet-test-vectors.json", root), "utf8"));
/** The values deriveTaprootKeyspend computes for the SigMsg figure. */
export function derivedKeyspend(id: string): DerivedTaprootKeyspendFixture {
  const f: TaprootKeyspendFixture = fixtures.find((x: { id: string }) => x.id === id);
  const k = vectors.keyPathSpending[0];
  const tx = parseTransaction(k.given.rawUnsignedTx);
  const spent = k.given.utxosSpent.map((u: { scriptPubKey: string; amountSats: number }) => ({ scriptPubKeyHex: u.scriptPubKey, amountSats: BigInt(u.amountSats) }));
  const g = f.inputSpending.given;
  const items = sigMsg(tx, spent, g.txinIndex, g.hashType);
  return {
    ...f,
    derived: {
      inputs: tx.inputs.length, outputs: tx.outputs.length, txinIndex: g.txinIndex, hashType: g.hashType,
      items: items.map((i) => ({ ...i, bytes: i.hex.length / 2, note: "" })),
      sigMsgBytes: items.reduce((n, i) => n + i.hex.length / 2, 0),
      sighashHex: taprootSighash(items),
      totalSpentSats: "0", totalOutSats: "0",
    },
  };
}

describe("TaprootTweak", () => {
  const fx = [derived("bip341-spk0"), derived("bip341-spk5")];
  const s = html(h(TaprootTweak, { fixtures: fx }));
  it("shows each vector's tweak and output key from the model, shortened with an ellipsis", () => {
    for (const f of fx) {
      expect(s).toContain(`${f.derived.outputKeyHex.slice(0, 8)}…`);
      expect(s).toContain(`${f.derived.tweakHex.slice(0, 8)}…`);
    }
  });
  it("gives the exact values in a disclosure", () => {
    const details = s.slice(s.indexOf("<details"));
    for (const f of fx) for (const v of [f.derived.internalKeyHex, f.derived.tweakHex, f.derived.outputKeyHex]) expect(details).toContain(v);
  });
  it("draws no curve", () => expect(s).not.toMatch(/<path[^>]*class="k-curve/));
});

describe("SigMsgLayout", () => {
  const d = derivedKeyspend("bip341-keyspend-input4");
  const s = html(h(SigMsgLayout, { fixture: d }));
  it("lays every item on a 32-byte ruler", () => {
    expect(count(s, "data-field=")).toBeGreaterThanOrEqual(d.derived.items.length);
    for (const it of d.derived.items) expect(s).toContain(`data-field="${it.id}"`);
  });
  it("marks the two all-inputs commitments", () => {
    expect(count(s, 'data-field="sha_amounts"')).toBeGreaterThanOrEqual(1);
    expect(count(s, "k-fill--sig")).toBeGreaterThanOrEqual(2);
  });
  it("prints the sighash from the model", () => {
    expect(s).toContain(d.derived.sighashHex.slice(0, 32));
    expect(s).toContain(d.derived.sighashHex.slice(32));
  });
});
