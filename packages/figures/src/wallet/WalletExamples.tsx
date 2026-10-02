import { Bracket, Drawing, Value } from "../kit";
import type { DerivedWalletPathFixture } from "../types";

interface TNode { key: string; seg: string; depth: number; children: TNode[]; x: number }

const LEAF = 17, X0 = 66, ROW = 42, TOP = 26;

/**
 * wallet-path-examples.v1 — static. BIP 44's examples table, all of its
 * paths, drawn as the tree they form: two coins, two accounts each, two
 * chains each, two addresses each. The two paths the prose names are drawn
 * heavy. Paths and words are parsed from the pinned table at build time.
 */
export function WalletExamples({ fixture }: { fixture: DerivedWalletPathFixture }) {
  const t = fixture.derived.bip44;
  if (!t) throw new Error(`${fixture.id}: wallet-path-examples.v1 needs BIP 44's examples table`);
  const segs = (p: string) => p.split("/").slice(1).map((s) => s.replace("'", "′"));
  // Build the tree from the paths themselves.
  const root: TNode = { key: "", seg: "", depth: 0, children: [], x: 0 };
  for (const e of t.examples) {
    let at = root;
    segs(e.path).forEach((s, k) => {
      const key = `${at.key}/${s}`;
      let next = at.children.find((c) => c.key === key);
      if (!next) at.children.push((next = { key, seg: s, depth: k + 1, children: [], x: 0 }));
      at = next;
    });
  }
  const top = root.children;
  if (top.length !== 1) throw new Error("BIP 44's examples share one purpose");
  let leafNo = 0;
  const place = (n: TNode): number => (n.x = n.children.length ? n.children.map(place).reduce((a, b) => a + b, 0) / n.children.length : X0 + LEAF * (leafNo++ + 0.5));
  place(top[0]);
  const all: TNode[] = [];
  const walk = (n: TNode) => (all.push(n), n.children.forEach(walk));
  walk(top[0]);
  const named = [fixture.derived.addresses[0].path, fixture.derived.addresses.find((a) => a.change === 1)?.path].filter(Boolean).map((p) => `/${segs(p!).join("/")}`);
  const onNamed = (key: string) => named.some((p) => p === key || p.startsWith(`${key}/`));
  const y = (depth: number) => TOP + (depth - 1) * ROW;
  // Words for each level, read from the table's own columns.
  const word = (col: "coin" | "account" | "chain" | "address", seg: string, depth: number) =>
    t.examples.find((e) => segs(e.path)[depth - 1] === seg)![col];
  const leaves = all.filter((n) => !n.children.length);
  const chain = (s: string) => word("chain", s, 4);
  const addr = (s: string) => word("address", s, 5);
  const desc =
    `BIP 44's examples table lists ${t.examples.length} paths, drawn as a tree under purpose ${top[0].seg}: ` +
    `coin types ${top[0].children.map((c) => `${c.seg} (${word("coin", c.seg, 2)})`).join(" and ")}; under each, accounts 0′ and 1′; under each, chains 0 (${chain("0")}) and 1 (${chain("1")}); under each, addresses 0 (${addr("0")}) and 1 (${addr("1")}). ` +
    `Drawn heavy: ${named.map((p) => `m${p}`).join(" and ")}.`;
  return (
    <Drawing id="a12-examples" width={344} height={TOP + 4 * ROW + 96} title="BIP 44's examples, as a tree" desc={desc}>
      {all.map((n) => n.children.map((c) => (
        <line class={`k-line${onNamed(c.key) ? " k-wp-named" : ""}`} x1={n.x} y1={y(n.depth) + 4} x2={c.x} y2={y(c.depth) - 4} />
      )))}
      {all.filter((n) => n.children.length).map((n) => {
        const parent = all.find((p) => p.children.includes(n));
        const left = parent ? n.x < parent.x : false;
        return (
          <g>
            <circle class={`k-outline ${onNamed(n.key) ? "k-mark--plain" : "k-fill--plain"}`} cx={n.x} cy={y(n.depth)} r="3.5" />
            <Value at={n.depth === 4 ? [left ? n.x + 6 : n.x - 6, y(n.depth) - 2] : [left ? n.x - 6 : n.x + 6, y(n.depth) - 5]} text={n.seg} anchor={n.depth === 4 ? (left ? "start" : "end") : left ? "end" : "start"} size={9} />
          </g>
        );
      })}
      {["PURPOSE", "COIN", "ACCOUNT", "CHAIN", "ADDRESS"].map((r, k) => <Value at={[4, y(k + 1) + 3]} text={r} size={9} cls="k-value--label" />)}
      {leaves.map((n) => (
        <g>
          <rect class={`k-cell ${onNamed(n.key) ? "k-cell--em" : ""} k-fill--public`} x={n.x - 7} y={y(n.depth) - 4} width="14" height="14" />
          <Value at={[n.x, y(n.depth) + 7]} text={n.seg} anchor="middle" size={9} />
        </g>
      ))}
      <Bracket x1={X0} x2={X0 + leaves.length * LEAF} y={y(5) + 14} text={`${t.examples.length} paths in bip 44’s table`} />
      <Value at={[4, y(5) + 50]} text={`COIN 0′ = ${word("coin", "0′", 2).toUpperCase()}, 1′ = ${word("coin", "1′", 2).toUpperCase()}`} size={9} cls="k-value--muted" />
      <Value at={[4, y(5) + 62]} text={`ACCOUNT 0′ = ${word("account", "0′", 3).toUpperCase()}, 1′ = ${word("account", "1′", 3).toUpperCase()}`} size={9} cls="k-value--muted" />
      <Value at={[4, y(5) + 74]} text={`CHAIN 0 = ${chain("0").toUpperCase()}, 1 = ${chain("1").toUpperCase()}`} size={9} cls="k-value--muted" />
      <Value at={[4, y(5) + 86]} text={`ADDRESS 0 = ${addr("0").toUpperCase()}, 1 = ${addr("1").toUpperCase()}`} size={9} cls="k-value--muted" />
    </Drawing>
  );
}
