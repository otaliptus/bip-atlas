import type { DerivedMusig2KeyaggFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;

/** musig2-keyagg.v1 — static. Key aggregation with coefficients, in two orders, against the naive sum. */
export function Musig2KeyAgg({ fixture }: { fixture: DerivedMusig2KeyaggFixture }) {
  const d = fixture.derived;
  const label = (k: string) => `P${d.orders[0].keys.indexOf(k) + 1}`;
  return (
    <div class="atlas-mu-ka">
      {d.orders.map((o, n) => (
        <section class="atlas-mu-ka__col" aria-label={`Order ${n + 1}`}>
          <p class="atlas-mu-ka__head">Order {o.keys.map(label).join(", ")}</p>
          <ol class="atlas-mu-ka__terms">
            {o.keys.map((k, i) => (
              <li>
                <span class="atlas-mu-ka__a">{o.coefficients[i] === "1".padStart(64, "0") ? "1" : short(o.coefficients[i])}</span>
                <span class="atlas-mu-ka__dot">·</span>
                <span class="atlas-mu-ka__p">{label(k)}</span>
              </li>
            ))}
          </ol>
          <p class="atlas-mu-ka__q">Q = <code>{short(o.aggXonly)}</code></p>
        </section>
      ))}
      <section class="atlas-mu-ka__col" data-kind="naive" aria-label="Plain sum">
        <p class="atlas-mu-ka__head">Plain sum (not MuSig2)</p>
        <p class="atlas-mu-ka__terms-flat">P1 + P2 + P3</p>
        <p class="atlas-mu-ka__q">= <code>{short(d.naiveSumXonly)}</code></p>
      </section>
      <p class="atlas-lab__source">
        Keys and both aggregates from BIP 327 key_agg_vectors.json (cases {fixture.caseIndices.join(" and ")}), recomputed by the tested model. The second distinct key in each list gets coefficient 1. The plain sum, computed for contrast, matches neither.
      </p>
    </div>
  );
}
