import type { DerivedTaprootTreeFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 8)}…${hex.slice(-6)}`;

/**
 * taproot-tweak.v1 — static. From internal key to output key for published
 * BIP 341 vectors: with no script tree, and with one. Values from the tested model.
 */
export function TaprootTweak({ fixtures }: { fixtures: DerivedTaprootTreeFixture[] }) {
  return (
    <div class="atlas-tweak">
      {fixtures.map((f) => {
        const d = f.derived;
        return (
          <div class="atlas-tweak__row">
            <p class="atlas-tweak__head">
              <span class="atlas-tweak__name">{f.label}</span>
              <span>vector {f.vectorIndex} · {d.leaves.length ? `${d.leaves.length} scripts` : "key only"}</span>
            </p>
            <ol class="atlas-tweak__flow">
              <li data-part="internal">
                <span class="atlas-tweak__label">internal key P</span>
                <code title={d.internalKeyHex}>{short(d.internalKeyHex)}</code>
              </li>
              <li data-part="root">
                <span class="atlas-tweak__label">{d.merkleRootHex ? "Merkle root" : "no script tree"}</span>
                {d.merkleRootHex ? <code title={d.merkleRootHex}>{short(d.merkleRootHex)}</code> : <span>empty</span>}
              </li>
              <li data-part="tweak">
                <span class="atlas-tweak__label">t = hash<sub>TapTweak</sub>(P ‖ {d.merkleRootHex ? "root" : "nothing"})</span>
                <code title={d.tweakHex}>{short(d.tweakHex)}</code>
              </li>
              <li data-part="output">
                <span class="atlas-tweak__label">output key Q = P + t⋅G</span>
                <code title={d.outputKeyHex}>{short(d.outputKeyHex)}</code>
              </li>
              <li data-part="spk">
                <span class="atlas-tweak__label">scriptPubKey · address</span>
                <code class="atlas-break">5120{d.outputKeyHex}</code>
                <code class="atlas-break">{d.address}</code>
              </li>
            </ol>
          </div>
        );
      })}
      <details class="atlas-tap-exact">
        <summary>Exact values</summary>
        {fixtures.map((f) => (
          <dl>
            <div><dt>vector {f.vectorIndex} P</dt><dd><code class="atlas-break">{f.derived.internalKeyHex}</code></dd></div>
            <div><dt>root</dt><dd><code class="atlas-break">{f.derived.merkleRootHex ?? "none"}</code></dd></div>
            <div><dt>t</dt><dd><code class="atlas-break">{f.derived.tweakHex}</code></dd></div>
            <div><dt>Q</dt><dd><code class="atlas-break">{f.derived.outputKeyHex}</code></dd></div>
          </dl>
        ))}
      </details>
      <p class="atlas-lab__source">BIP 341 wallet-test-vectors.json, {fixtures.map((f) => f.source.pointer).join(" and ")}. Every value matched the published one at build time.</p>
    </div>
  );
}
