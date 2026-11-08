import { BIP85_PURPOSE } from "@bip-atlas/models/bip85";
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedBip85Fixture } from "../types";
import { PathRibbon, pathRibbonWidth } from "./parts";

/**
 * bip85-path.v1 — static. Two published paths read level by level: the
 * purpose 83696968' (the ASCII codes of S, E, E, D), the application number,
 * the application's own parameters, and an index; every level hardened.
 */
export function Bip85Path({ fixtures }: { fixtures: DerivedBip85Fixture[] }) {
  const [a, b] = fixtures;
  if (!a || !b) throw new Error("bip85-path: needs two vectors");
  const ascii = String(BIP85_PURPOSE).match(/../g)!.map((n) => ({ n, c: String.fromCharCode(Number(n)) }));
  const cellW = 56;
  const groups = (f: DerivedBip85Fixture) => {
    const n = f.derived.levels.length;
    return [
      { from: 0, to: 1, text: "purpose" },
      { from: 1, to: 2, text: "application" },
      ...(n > 3 ? [{ from: 2, to: n - 1, text: "its parameters" }] : []),
      { from: n - 1, to: n, text: "index" },
    ];
  };
  const x0 = 14;
  const at = (i: number) => x0 + 16 + i * (cellW + 4);
  const row = (f: DerivedBip85Fixture, y: number) => (
    <g>
      <Value at={[x0, y - 10]} text={`${f.label.toUpperCase()} · ${f.path}`} size={8} cls="k-value--label" />
      <PathRibbon x={x0} y={y} f={f} cellW={cellW} />
      {groups(f).map((g, i) => <Bracket x1={at(g.from)} x2={at(g.to) - 4} y={y + 40 + (i % 2) * 16} text={g.text} />)}
    </g>
  );
  const y2 = 212;
  const H = y2 + 88;
  if (pathRibbonWidth(a, cellW) > 330) throw new Error("bip85-path: the first path does not fit");
  return (
    <Drawing
      id="a19-path"
      width={344}
      height={H}
      title="Two BIP 85 paths, level by level"
      desc={`${a.path}: ${a.derived.levels.map((l) => `${l.value} selects ${l.meaning}`).join(", ")}. ${b.path}: ${b.derived.levels.map((l) => `${l.value} selects ${l.meaning}`).join(", ")}. Every level is hardened. The purpose number 83696968 is the ASCII codes ${ascii.map((x) => x.n).join(", ")}, which spell ${ascii.map((x) => x.c).join("")}.`}
    >
      {row(a, 30)}
      <Value at={[x0, 128]} text="THE PURPOSE NUMBER, TWO DIGITS AT A TIME, AS ASCII" size={8} cls="k-value--muted" />
      <Cells x={x0} y={136} values={ascii.map((x) => x.n)} size={30} roleOf={() => "plain"} />
      <Cells x={x0 + 150} y={136} values={ascii.map((x) => x.c)} size={30} roleOf={() => "secret"} />
      <Value at={[x0 + 135, 156]} text="→" size={12} anchor="middle" />
      {row(b, y2)}
    </Drawing>
  );
}
