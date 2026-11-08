import { buildBasicFilter, blockHash as bfBlockHash, blockOutputScripts, golombBits, matchFilter, BitReader, BASIC_P } from "@bip-atlas/models";
import type { BfBlockFixture, DerivedBfBlockFixture, BfCode } from "@bip-atlas/figures";
import { HX, SNAPSHOT_PHASE3, checkSourceQuote, hx, pinnedText } from "./sources";

let bfRowsCache: any[][] | null = null;
/** testnet-19.json rows: [height, block hash, block, prev output scripts, previous basic header, basic filter, basic header, notes]. */
const bfRows = (): any[][] => (bfRowsCache ??= JSON.parse(pinnedText("bip-0158/testnet-19.json", SNAPSHOT_PHASE3)).slice(1));
const bfRow = (height: number) => {
  const r = bfRows().find((x) => x[0] === height);
  if (!r) throw new Error(`no BIP 158 vector for block ${height}`);
  return r;
};
/** Build a vector's filter with the model; throw unless filter, block hash and header equal the published ones. */
function bfBuild(height: number) {
  const [, hash, block, prev, prevHeader, filter, header, notes] = bfRow(height);
  if (bfBlockHash(block) !== hash) throw new Error(`block ${height}: block hash differs from the vector`);
  const f = buildBasicFilter(hash, block, prev, prevHeader);
  if (HX(f.filter) !== filter) throw new Error(`block ${height}: filter differs from the vector`);
  if (f.header !== header) throw new Error(`block ${height}: filter header differs from the vector`);
  return { f, hash, block, prevHeader, notes: notes as string };
}
const bfCode = (delta: bigint): BfCode => {
  const g = golombBits(delta, BASIC_P);
  return { delta: delta.toString(), q: Number(g.q), r: g.r.toString(), unary: g.unary, remainder: g.remainder };
};

export function deriveBfBlock(f: BfBlockFixture): DerivedBfBlockFixture {
  checkSourceQuote(f);
  const { f: b, hash, block, prevHeader, notes } = bfBuild(f.height);
  // The drawn codes must be the filter's own leading bits.
  const shown = b.deltas.slice(0, 6).map(bfCode);
  const bits = shown.map((c) => c.unary + c.remainder).join("");
  const r = new BitReader(b.compressed);
  const lead = Array.from({ length: bits.length }, () => r.read()).join("");
  if (lead !== bits) throw new Error(`${f.id}: drawn Golomb-Rice codes differ from the filter's bits`);
  const bitsTotal = b.deltas.reduce((n, d) => n + Number(d >> BigInt(BASIC_P)) + 1 + BASIC_P, 0);
  const own = b.elements.slice(0, 3).map((s) => ({ script: s, from: "this block" }));
  // One script from each of the three largest other vector blocks.
  const others = bfRows()
    .filter((x) => x[0] !== f.height)
    .map((x) => ({ height: x[0] as number, elements: buildBasicFilter(x[1], x[2], x[3], x[4]).elements }))
    .sort((a, b) => b.elements.length - a.elements.length)
    .map((x) => ({ script: x.elements.find((e: string) => !b.elements.includes(e)), from: `block ${x.height}` }))
    .filter((p): p is { script: string; from: string } => !!p.script)
    .slice(0, 3);
  const probes = [...own, ...others].map((p) => {
    const m = matchFilter(b.filter, hx(p.script), b.key);
    if (p.from === "this block" && !m.matched) throw new Error(`${f.id}: an element does not match its own filter`);
    // The chapter says none of the foreign test scripts match; fail if a false positive ever appears.
    if (p.from !== "this block" && m.matched) throw new Error(`${f.id}: a script from ${p.from} matches (false positive); update the prose`);
    return { ...p, matched: m.matched, target: m.target.toString(), steps: m.steps.map((s) => ({ value: s.value.toString(), outcome: s.outcome })) };
  });
  return {
    ...f,
    derived: {
      height: f.height, hash, notes, txCount: blockOutputScripts(block).txCount, N: b.N, F: b.F.toString(),
      filterHex: HX(b.filter), filterBytes: b.filter.length, elements: b.views,
      values: b.values.map(String), codes: shown, bitsTotal, paddingBits: b.compressed.length * 8 - bitsTotal,
      probes, filterHash: b.filterHash, prevHeader, header: b.header,
    },
  };
}
