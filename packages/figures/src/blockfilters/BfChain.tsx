import { Drawing, Value, idsFor } from "../kit";
import type { DerivedBfChainFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 8)}…`;

/**
 * filter-header-chain.v1 — static. Each vector block's filter header as a
 * link: the double SHA-256 of the filter hash and the previous header. Rows
 * that follow each other are chained; a block missing from the vectors is
 * drawn as a dashed gap. Every hash was recomputed at build time.
 */
export function BfChain({ fixture }: { fixture: DerivedBfChainFixture }) {
  const rows = fixture.derived.rows;
  const ids = idsFor("a16-chain");
  const rowH = 84, x0 = 14;
  let y = 40;
  const placed = rows.map((r, i) => {
    const gap = i > 0 && r.height !== rows[i - 1].height + 1;
    if (gap) y += 18;
    const at = y;
    y += rowH;
    return { r, at, gap };
  });
  const box = (x: number, yy: number, w: number, label: string, value: string, cls = "k-fill--hash", dashed = false) => (
    <g>
      <rect class={`k-cell ${cls}${dashed ? " k-dashed" : ""}`} x={x} y={yy} width={w} height={26} />
      <text class="k-bf-gap" x={x + 5} y={yy + 10}>{label}</text>
      <text class="k-bf-hex" x={x + 5} y={yy + 21}>{value}</text>
    </g>
  );
  const desc = rows
    .map((r, i) => `Block ${r.height}: filter ${r.filterHex}, filter hash ${r.filterHash}; previous header ${r.prevHeader}${i === 0 && r.linksToPrevious ? " (32 zero bytes, for the genesis block)" : r.linksToPrevious ? ` (block ${rows[i - 1].height}'s header)` : ` (block ${r.height - 1}'s header, not in the vectors)`}; header ${r.header}.`)
    .join(" ");
  return (
    <>
      <Drawing id="a16-chain" width={344} height={y + 4} title="Filter headers, linked" desc={desc}>
        <Value at={[x0, 14]} text="FILTER HASH = DSHA256(FILTER)" size={8.5} cls="k-value--label" />
        <Value at={[x0, 28]} text="HEADER = DSHA256(FILTER HASH ‖ PREVIOUS HEADER)" size={8.5} cls="k-value--label" />
        {placed.map(({ r, at, gap }, i) => {
          const prevLabel = i === 0 ? "32 ZERO BYTES" : gap ? `BLOCK ${r.height - 1}'S HEADER` : `BLOCK ${rows[i - 1].height}'S HEADER`;
          return (
            <g data-height={r.height}>
              {gap ? <Value at={[x0, at - 8]} text={`BLOCK ${r.height - 1} IS NOT IN THE VECTORS`} size={8} cls="k-value--muted" /> : null}
              <Value at={[x0, at + 10]} text={`BLOCK ${r.height}${i === 0 && r.linksToPrevious ? " (GENESIS)" : ""} · FILTER ${r.filterHex}`} size={8.5} cls="k-value--label" />
              {box(x0, at + 18, 100, prevLabel, short(r.prevHeader), i === 0 ? "k-fill--plain" : "k-fill--hash", gap)}
              <text class="k-bf-big" x={x0 + 107} y={at + 36}>+</text>
              {box(x0 + 114, at + 18, 92, "FILTER HASH", short(r.filterHash))}
              <path class="k-line" d={`M${x0 + 210} ${at + 31} H${x0 + 232}`} marker-end={ids.arrow} />
              <rect class="k-cell k-fill--hash k-cell--em" x={x0 + 236} y={at + 18} width={94} height={26} />
              <text class="k-bf-gap" x={x0 + 241} y={at + 28}>{`HEADER ${r.height}`}</text>
              <text class="k-bf-hex" x={x0 + 241} y={at + 39}>{short(r.header)}</text>
              {i + 1 < placed.length && !placed[i + 1].gap ? (
                <path class="k-line" d={`M${x0 + 283} ${at + 44} V${at + 60} H${x0 + 50} V${at + rowH + 16}`} marker-end={ids.arrow} />
              ) : null}
            </g>
          );
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact hashes, display byte order</summary>
        <dl class="atlas-hexlist">
          {rows.map((r) => (
            <>
              <dt>Block {r.height}: filter hash, previous header, header</dt>
              <dd><code class="atlas-break">{r.filterHash}</code><br /><code class="atlas-break">{r.prevHeader}</code><br /><code class="atlas-break">{r.header}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
