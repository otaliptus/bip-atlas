import type { TaprootNodeView } from "../types";

export interface PlacedNode { hash: string; leaf: number | null; depth: number; x: number; y: number; parent: string | null }

/**
 * What a drawing shows of one tree node for a chosen spend. "absent" nodes
 * are not drawn at all: in the proof view, drawing them (even hatched) would
 * leak the tree's shape, which the spend does not reveal.
 */
export type Seen = "revealed" | "recomputed" | "sibling" | "known" | "absent";

export const leavesUnder = (n: TaprootNodeView): number[] => (n.leaf !== null ? [n.leaf] : n.children.flatMap(leavesUnder));

/** Leaves evenly spaced along x in tree order; each parent centred over its children; y = depth × levelH. */
export function layoutTree(root: TaprootNodeView, width: number, levelH: number): PlacedNode[] {
  const leafOrder = leavesUnder(root);
  const step = width / leafOrder.length;
  const out: PlacedNode[] = [];
  const walk = (n: TaprootNodeView, depth: number, parent: string | null): number => {
    const x = n.leaf !== null
      ? step * (leafOrder.indexOf(n.leaf) + 0.5)
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
