import type { DerivedBfGolombFixture } from "../types";

const group = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** golomb-rice-code.v1 — static. BIP 158's P = 2 table, recomputed, and one real P = 19 code. */
export function BfGolomb({ fixture }: { fixture: DerivedBfGolombFixture }) {
  const d = fixture.derived;
  const e = d.example.code;
  return (
    <div class="atlas-bf-gr">
      <table class="atlas-table atlas-bf-gr__table">
        <caption>P = 2: q = n ÷ 4 in unary, r = n mod 4 in two bits</caption>
        <thead><tr><th scope="col">n</th><th scope="col">(q, r)</th><th scope="col">code</th></tr></thead>
        <tbody>
          {d.table.map((t) => {
            const [u, r] = t.code.split(" ");
            return <tr><td>{t.n}</td><td>({t.q}, {t.r})</td><td><code><span data-part="unary">{u}</span> <span data-part="rem">{r}</span></code></td></tr>;
          })}
        </tbody>
      </table>
      <div class="atlas-bf-gr__example">
        <p class="atlas-bf-gr__head">Same rule, P = 19</p>
        <p>The smallest hashed value in block {group(String(d.example.height))}’s filter is {group(e.delta)}. As a gap from zero: q = {e.q}, r = {group(e.r)}.</p>
        <p class="atlas-bf-gr__bits"><code><span data-part="unary">{e.unary}</span> <span data-part="rem">{e.remainder}</span></code></p>
        <p class="atlas-panel__scope">{e.unary.length + e.remainder.length} bits. Writing a value below F = {group(d.example.F)} at fixed width would take {Math.ceil(Math.log2(Number(d.example.F)))}; the gain comes from small gaps being common.</p>
      </div>
      <p class="atlas-lab__source">Table from BIP 158 (line {fixture.source.line}), each row recomputed by the tested model; the P = 19 code is the first code of a published filter.</p>
    </div>
  );
}
