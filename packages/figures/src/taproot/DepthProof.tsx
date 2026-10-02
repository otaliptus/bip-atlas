import { Drawing, IsoBox, Value } from "../kit";
import type { DerivedTaprootTreeFixture } from "../types";
import { layoutTree } from "./treeLayout";

const leafName = (id: number) => `Leaf ${String.fromCharCode(65 + id)}`;

/**
 * taproot-depth.v1 — static. The published tree with, under each leaf, its
 * control block drawn to scale: each level adds one 32-byte hash.
 */
export function DepthProof({ fixture }: { fixture: DerivedTaprootTreeFixture }) {
  const d = fixture.derived;
  const W = 344, top = 24, levelH = 62, cardW = 92;
  const placed = d.root ? layoutTree(d.root, W - 40, levelH) : [];
  const maxDepth = Math.max(0, ...placed.map((p) => p.depth));
  const byHash = new Map(placed.map((p) => [p.hash, p]));
  const at = (h: string) => ({ x: byHash.get(h)!.x + 20, y: top + byHash.get(h)!.y });
  const cardTop = (depth: number) => top + depth * levelH;
  const H = top + maxDepth * levelH + 110;
  const unit = (cardW - 4) / Math.max(...d.leaves.map((l) => l.controlBlockHex.length / 2));
  return (
    <Drawing
      id="a07-depth"
      width={W}
      height={H}
      title="Depth is proof size"
      desc={`In this published tree, ${d.leaves.map((l) => `${leafName(l.id)} sits at depth ${l.path.length} and needs a ${l.controlBlockHex.length / 2}-byte control block (33 + 32 × ${l.path.length})`).join("; ")}. Each level adds one 32-byte hash. The tree's shape is one example, not a required layout.`}
    >
      {placed.map((n) => (n.parent ? <line class="k-leader" x1={at(n.parent).x} y1={at(n.parent).y + 12} x2={at(n.hash).x} y2={at(n.hash).y - 10} /> : null))}
      {placed.map((n) => {
        const { x, y } = at(n.hash);
        if (n.leaf === null) return <IsoBox at={[x, y + 8]} w={16} d={16} h={10} role="hash" />;
        const l = d.leaves.find((v) => v.id === n.leaf)!;
        const bytes = l.controlBlockHex.length / 2;
        return (
          <g>
            <rect class="k-outline k-fill--plain" x={x - cardW / 2} y={cardTop(n.depth) - 10} width={cardW} height="24" />
            <Value at={[x - cardW / 2 + 6, cardTop(n.depth) + 6]} text={leafName(l.id).toUpperCase()} size={8.5} cls="k-value--label" />
            <rect class="k-cell k-fill--public" x={x - cardW / 2} y={cardTop(maxDepth) + 34} width={33 * unit} height="14" />
            {Array.from({ length: l.path.length }, (_, j) => (
              <rect class="k-cell k-fill--hash" x={x - cardW / 2 + (33 + 32 * j) * unit} y={cardTop(maxDepth) + 34} width={32 * unit} height="14" />
            ))}
            <line class="k-leader k-dashed" x1={x} y1={cardTop(n.depth) + 14} x2={x} y2={cardTop(maxDepth) + 34} />
            <Value at={[x - cardW / 2, cardTop(maxDepth) + 62]} text={`${bytes} B`} size={9} />
            <Value at={[x - cardW / 2, cardTop(maxDepth) + 74]} text={`33 + 32 × ${l.path.length}`} size={8} cls="k-value--muted" />
          </g>
        );
      })}
      <Value at={[4, cardTop(maxDepth) + 100]} text="CONTROL BLOCK UNDER EACH LEAF, TO SCALE" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
