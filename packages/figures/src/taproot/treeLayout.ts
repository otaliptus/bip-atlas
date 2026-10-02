import type { TaprootNodeView } from "../types";

export interface PlacedNode { hash: string; leaf: number | null; depth: number; x: number; y: number; parent: string | null }

/**
 * What a drawing shows of one tree node for a chosen spend. "absent" nodes
 * are not drawn at all: in the proof view, drawing them (even hatched) would
 * leak the tree's shape, which the spend does not reveal.
 */
export type Seen = "revealed" | "recomputed" | "sibling" | "known" | "absent";

export const leavesUnder = (n: TaprootNodeView): number[] => (n.leaf !== null ? [n.leaf] : n.children.flatMap(leavesUnder));

/** Tips (nodes drawn without children) in tree order. */
const tipsUnder = (n: TaprootNodeView): TaprootNodeView[] => (n.children.length === 0 ? [n] : n.children.flatMap(tipsUnder));

/** Tips evenly spaced along x in tree order; each parent centred over its children; y = depth × levelH. */
export function layoutTree(root: TaprootNodeView, width: number, levelH: number): PlacedNode[] {
  const tips = tipsUnder(root);
  const step = width / tips.length;
  const out: PlacedNode[] = [];
  const walk = (n: TaprootNodeView, depth: number, parent: string | null): number => {
    const x = n.children.length === 0
      ? step * (tips.indexOf(n) + 0.5)
      : n.children.map((c) => walk(c, depth + 1, n.hash)).reduce((a, b) => a + b, 0) / n.children.length;
    out.push({ hash: n.hash, leaf: n.leaf, depth, x, y: depth * levelH, parent });
    return x;
  };
  walk(root, 0, null);
  return out;
}

/**
 * Wallet view: the chosen leaf is revealed, its ancestors recomputed, the
 * hashes on its path are siblings, everything else known. Proof view: the
 * same, except everything else is absent, including whatever lies under a
 * sibling. Key path: known (wallet view) or absent (proof view) throughout.
 */
export function seenMap(root: TaprootNodeView, path: "key" | "script", leafId: number, proof: boolean): Map<string, Seen> {
  const m = new Map<string, Seen>();
  const visit = (n: TaprootNodeView, insideSibling: boolean) => {
    let s: Seen;
    if (path === "key" || insideSibling) s = proof ? "absent" : "known";
    else if (n.leaf === leafId) s = "revealed";
    else if (leavesUnder(n).includes(leafId)) s = "recomputed";
    else s = "sibling";
    m.set(n.hash, s);
    for (const c of n.children) visit(c, insideSibling || s === "sibling");
  };
  visit(root, false);
  return m;
}

/**
 * The tree as the proof view may lay it out: absent nodes removed and each
 * sibling made a tip, so neither the positions nor the depth of the drawing
 * depend on anything the spend does not reveal. Returns null if nothing is drawn.
 */
export function pruneForView(root: TaprootNodeView, seen: Map<string, Seen>): TaprootNodeView | null {
  const s = seen.get(root.hash);
  if (!s || s === "absent") return null;
  if (s === "sibling") return { ...root, children: [] };
  return { ...root, children: root.children.map((c) => pruneForView(c, seen)).filter((c): c is TaprootNodeView => c !== null) };
}

/** The leaf the chapter's figures follow (leaf B of vector 5). Throws rather than silently drawing another leaf. */
export function storyLeaf<T extends { id: number }>(leaves: T[], id = 1): T {
  const leaf = leaves.find((l) => l.id === id);
  if (!leaf) throw new Error(`taproot figures: the published tree has no leaf ${id}`);
  return leaf;
}
