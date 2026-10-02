import { Arrow, Drawing, IsoBox, Value, idsFor } from "../kit";
import type { DerivedTransactionFixture } from "../types";
import { shortHex } from "./fields";

type Leaf = { name: string; value: string | null; zero?: boolean };

/** A four-leaf hash tree of cubes, root on top; returns the root's position. */
function Tree({ top, leaves }: { top: number; leaves: Leaf[] }) {
  const xs = [52, 132, 212, 292];
  const mid = [92, 252];
  const rootY = top, midY = top + 40, leafY = top + 80;
  const cube = (x: number, y: number, role: "hash" | "plain" = "hash") => <IsoBox at={[x, y - 7]} w={14} d={14} h={10} role={role} />;
  return (
    <g>
      {mid.map((mx, k) => (
        <>
          <line class="k-leader" x1={172} y1={rootY + 8} x2={mx} y2={midY - 16} />
          <line class="k-leader" x1={mx} y1={midY + 8} x2={xs[2 * k]} y2={leafY - 16} />
          <line class="k-leader" x1={mx} y1={midY + 8} x2={xs[2 * k + 1]} y2={leafY - 16} />
        </>
      ))}
      {cube(172, rootY)}
      {mid.map((mx) => cube(mx, midY))}
      {leaves.map((l, k) => (
        <g data-leaf={l.name}>
          {cube(xs[k], leafY, l.zero ? "plain" : "hash")}
          <Value at={[xs[k], leafY + 24]} text={l.name.toUpperCase()} size={8} anchor="middle" cls="k-value--label" />
          {l.value ? <Value at={[xs[k], leafY + 36]} text={l.value} size={8.5} anchor="middle" cls={l.zero ? "k-value--muted" : "k-value--hash"} /> : null}
        </g>
      ))}
    </g>
  );
}

/**
 * witness-commitment.v1 — static, schematic. A block of four transactions:
 * the txid tree feeds the header's merkle root as before; the wtxid tree,
 * with the coinbase's leaf taken as all zeros, feeds a commitment recorded in
 * a coinbase output. One leaf is the published example's own txid and wtxid;
 * the block itself is not real.
 */
export function WitnessCommitment({ fixture }: { fixture: DerivedTransactionFixture }) {
  const m = fixture.derived.measures;
  const ids = idsFor("a03-commit");
  return (
    <>
      <Drawing
        id="a03-commit"
        width={344}
        height={392}
        title="Two trees in one block"
        desc={`A schematic block of four transactions, one of them the published example. The txids, ${shortHex(m.txidHex)} among them, are hashed pairwise into the merkle root in the block header. The wtxids, ${shortHex(m.wtxidHex)} among them and with the coinbase's taken as 32 zero bytes, are hashed the same way into a witness root, and a commitment built from it is recorded in an output of the coinbase transaction, which is itself one of the txid leaves.`}
      >
        <rect class="k-outline k-fill--plain" x="96" y="8" width="152" height="40" />
        <Value at={[104, 22]} text="BLOCK HEADER" size={8.5} cls="k-value--label" />
        <rect class="k-cell k-fill--hash" x="104" y="28" width="136" height="14" />
        <Value at={[110, 38.5]} text="MERKLE ROOT" size={8} />
        <line class="k-leader" x1="172" y1="48" x2="172" y2="62" />
        <Value at={[14, 96]} text="TXIDS" size={8.5} cls="k-value--label" />
        <Tree top={78} leaves={[{ name: "coinbase", value: null }, { name: "example", value: shortHex(m.txidHex) }, { name: "other tx", value: null }, { name: "other tx", value: null }]} />
        {/* The coinbase transaction carries the commitment in one of its outputs. */}
        <rect class="k-outline k-fill--hash k-cell--em" x="14" y="214" width="112" height="22" />
        <Value at={[20, 228.5]} text="COINBASE OUTPUT" size={8} />
        <line class="k-leader k-dashed" x1="52" y1="196" x2="52" y2="214" />
        <Value at={[134, 222]} text="COMMITMENT, BUILT FROM" size={8} cls="k-value--muted" />
        <Value at={[134, 233]} text="THE WITNESS ROOT" size={8} cls="k-value--muted" />
        <Arrow d="M160 262 L120 240" ids={ids} />
        <Value at={[14, 276]} text="WTXIDS" size={8.5} cls="k-value--label" />
        <Tree top={258} leaves={[{ name: "coinbase", value: "00…00", zero: true }, { name: "example", value: shortHex(m.wtxidHex) }, { name: "other tx", value: null }, { name: "other tx", value: null }]} />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>The example's identifiers (byte order as computed)</summary>
        <dl class="atlas-hexlist">
          <dt>txid</dt><dd><code class="atlas-break">{m.txidHex}</code></dd>
          <dt>wtxid</dt><dd><code class="atlas-break">{m.wtxidHex}</code></dd>
          <dt>The coinbase's wtxid, as BIP 141 defines it</dt><dd><code class="atlas-break">{"00".repeat(32)}</code></dd>
        </dl>
      </details>
    </>
  );
}
