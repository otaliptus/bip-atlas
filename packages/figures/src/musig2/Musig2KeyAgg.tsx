import { Arrow, Drawing, KeyGlyph, Machine, Value, idsFor } from "../kit";
import type { DerivedMusig2KeyaggFixture } from "../types";
import { ONE, short } from "./scene";

/**
 * musig2-keyagg.v1 — static. Three published keys go into a KeyAgg machine
 * twice, in two orders, each key tagged with its coefficient; the two
 * aggregate keys differ. Below, the plain sum of the same keys, crossed
 * out: it matches neither. Values from the tested model; exact ones in the
 * disclosure.
 */
export function Musig2KeyAgg({ fixture }: { fixture: DerivedMusig2KeyaggFixture }) {
  const d = fixture.derived;
  const first = d.orders[0].keys;
  const name = (k: string) => {
    const i = first.indexOf(k);
    if (i < 0) throw new Error(`${fixture.id}: a key of the second order is not in the first`);
    return `P${i + 1}`;
  };
  if (d.orders.some((o) => o.aggXonly === d.naiveSumXonly)) throw new Error(`${fixture.id}: the plain sum equals an aggregate`);
  const ids = idsFor("a14-keyagg");
  const rowH = 112;
  const desc =
    d.orders.map((o, n) => `Order ${n + 1}: ${o.keys.map((k, i) => `${name(k)} with coefficient ${o.coefficients[i] === ONE ? "1" : o.coefficients[i]}`).join(", ")}; the aggregate key is ${o.aggXonly}.`).join(" ") +
    ` The plain sum ${first.map((_, i) => `P${i + 1}`).join(" + ")} has x coordinate ${d.naiveSumXonly}, which is neither aggregate.`;
  return (
    <>
      <Drawing id="a14-keyagg" width={344} height={rowH * d.orders.length + 96} title="Not a plain sum" desc={desc}>
        {d.orders.map((o, n) => {
          const y = 12 + n * rowH;
          return (
            <g data-order={n + 1}>
              <Value at={[14, y + 6]} text={`ORDER ${n + 1}: ${o.keys.map(name).join(", ")}`} size={8.5} cls="k-value--label" />
              {o.keys.map((k, i) => (
                <g>
                  <KeyGlyph at={[14, y + 16 + i * 28]} role="public" scale={0.7} />
                  <Value at={[40, y + 25 + i * 28]} text={name(k)} size={9} />
                  <rect class="k-outline k-fill--hash" x="62" y={y + 15 + i * 28} width="72" height="14" />
                  <Value at={[66, y + 25.5 + i * 28]} text={`a ${o.coefficients[i] === ONE ? "= 1" : short(o.coefficients[i])}`} size={8} />
                  <path class="k-leader" d={`M136 ${y + 22 + i * 28} H150 V${y + 50} H160`} />
                </g>
              ))}
              <Arrow d={`M150 ${y + 50} H164`} ids={ids} />
              <Machine at={[188, y + 62]} w={58} d={26} h={24} label="KeyAgg" sub="Σ a·P" />
              <Arrow d={`M244 ${y + 54} H262`} ids={ids} />
              <KeyGlyph at={[268, y + 40]} role="public" scale={0.8} />
              <Value at={[268, y + 66]} text={`Q${n + 1}`} size={9} cls="k-value--label" />
              <Value at={[268, y + 78]} text={short(o.aggXonly)} size={9} />
            </g>
          );
        })}
        <g data-naive="true">
          <Value at={[14, rowH * d.orders.length + 22]} text="THE PLAIN SUM, NOT MUSIG2" size={8.5} cls="k-value--label" />
          <Value at={[14, rowH * d.orders.length + 40]} text={first.map((_, i) => `P${i + 1}`).join(" + ")} size={10} />
          <Arrow d={`M100 ${rowH * d.orders.length + 36} H130`} ids={ids} />
          <Value at={[138, rowH * d.orders.length + 40]} text={`x = ${short(d.naiveSumXonly)}`} size={10} />
          <path class="k-ring" d={`M134 ${rowH * d.orders.length + 26} L250 ${rowH * d.orders.length + 46} M134 ${rowH * d.orders.length + 46} L250 ${rowH * d.orders.length + 26}`} />
          <Value at={[14, rowH * d.orders.length + 64]} text="MATCHES NEITHER Q1 NOR Q2" size={8.5} cls="k-value--muted" />
        </g>
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {first.map((k, i) => (<><dt>P{i + 1}</dt><dd><code class="atlas-break">{k}</code></dd></>))}
          {d.orders.map((o, n) => (
            <>
              {o.coefficients.map((c, i) => (<><dt>Order {n + 1}: coefficient of {name(o.keys[i])}</dt><dd><code class="atlas-break">{c}</code></dd></>))}
              <dt>Q{n + 1} (x-only)</dt><dd><code class="atlas-break">{o.aggXonly}</code></dd>
            </>
          ))}
          <dt>x of {first.map((_, i) => `P${i + 1}`).join(" + ")}</dt><dd><code class="atlas-break">{d.naiveSumXonly}</code></dd>
        </dl>
      </details>
    </>
  );
}
