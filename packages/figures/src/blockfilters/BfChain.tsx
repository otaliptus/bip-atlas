import type { DerivedBfChainFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;

/** filter-header-chain.v1 — static. Filter hashes and headers of published blocks, each committing to the previous header. */
export function BfChain({ fixture }: { fixture: DerivedBfChainFixture }) {
  const rows = fixture.derived.rows;
  return (
    <div class="atlas-bf-chain">
      <ol class="atlas-bf-chain__list">
        {rows.map((r, i) => (
          <>
            {i > 0 && r.height !== rows[i - 1].height + 1 ? (
              <li class="atlas-bf-chain__gap">blocks {rows[i - 1].height + 1}–{r.height - 1} are not in the vectors</li>
            ) : null}
            <li class="atlas-bf-chain__row">
              <p class="atlas-bf-chain__h">Block {r.height}</p>
              <dl>
                <div><dt>filter</dt><dd><code>{r.filterHex}</code></dd></div>
                <div><dt>filter hash = dSHA256(filter)</dt><dd><code>{short(r.filterHash)}</code></dd></div>
                <div><dt>previous header</dt><dd><code>{short(r.prevHeader)}</code>{r.linksToPrevious ? <small> {i === 0 ? "(32 zero bytes, for genesis)" : `(block ${rows[i - 1].height}’s header)`}</small> : null}</dd></div>
                <div><dt>header = dSHA256(hash ‖ previous)</dt><dd><code>{short(r.header)}</code></dd></div>
              </dl>
            </li>
          </>
        ))}
      </ol>
      <p class="atlas-lab__source">Blocks from BIP 158’s testnet-19.json; hashes and headers recomputed by the tested model and checked against the vectors.</p>
    </div>
  );
}
