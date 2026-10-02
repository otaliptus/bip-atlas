import { Arrow, Drawing, IsoBox, KeyGlyph, Machine, Value, idsFor } from "../kit";
import type { DerivedTaprootTreeFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 8)}…`;
const ROW = 150;

/**
 * taproot-tweak.v1 — static. From internal key to output key for published
 * BIP 341 vectors, without and with a script tree. Keys are drawn as key
 * glyphs, never as points on a plotted curve. Values from the tested model;
 * the exact ones are in the disclosure below the drawing.
 */
export function TaprootTweak({ fixtures }: { fixtures: DerivedTaprootTreeFixture[] }) {
  const ids = idsFor("a07-tweak");
  const desc = fixtures
    .map((f) => {
      const d = f.derived;
      return `Vector ${f.vectorIndex}: internal key P ${d.internalKeyHex}${d.merkleRootHex ? ` and Merkle root ${d.merkleRootHex}` : " and no script tree"} go into the TapTweak hash, giving t = ${d.tweakHex}. The output key is Q = P + t·G = ${d.outputKeyHex}, the 32-byte program of the output script 5120….`;
    })
    .join(" ");
  return (
    <>
      <Drawing id="a07-tweak" width={352} height={ROW * fixtures.length + 4} title="Internal key in, output key out" desc={desc}>
        {fixtures.map((f, r) => {
          const d = f.derived;
          const y = r * ROW;
          return (
            <g>
              {r > 0 ? <line class="k-leader k-sep" x1="14" y1={y - 6} x2="338" y2={y - 6} /> : null}
              <Value at={[14, y + 14]} text={`VECTOR ${f.vectorIndex} · ${d.leaves.length ? `${d.leaves.length} SCRIPTS` : "KEY ONLY"}`} size={9} cls="k-value--label" />
              <KeyGlyph at={[14, y + 32]} role="public" />
              <Value at={[14, y + 60]} text="INTERNAL KEY P" size={8.5} cls="k-value--label" />
              <Value at={[14, y + 72]} text={short(d.internalKeyHex)} size={9.5} />
              {d.merkleRootHex ? (
                <>
                  <IsoBox at={[30, y + 108]} w={18} d={18} h={12} role="hash" />
                  <Value at={[54, y + 102]} text="MERKLE ROOT" size={8.5} cls="k-value--label" />
                  <Value at={[54, y + 114]} text={short(d.merkleRootHex)} size={9.5} />
                </>
              ) : (
                <>
                  <rect class="k-outline k-dashed" x="14" y={y + 90} width="26" height="18" fill="none" />
                  <Value at={[48, y + 103]} text="NO SCRIPT TREE" size={8.5} cls="k-value--label" />
                </>
              )}
              <Arrow d={`M46 ${y + 38} H118 V${y + 62} H140`} ids={ids} />
              {d.merkleRootHex ? <Arrow d={`M124 ${y + 106} H128 V${y + 80} H140`} ids={ids} /> : <Value at={[48, y + 117]} text="HASHED: P ONLY" size={8} cls="k-value--muted" />}
              <Machine at={[172, y + 66]} w={64} d={34} h={26} label="TapTweak" sub="hash" role="hash" />
              <Value at={[148, y + 134]} text={`t = ${short(d.tweakHex)}`} size={9.5} cls="k-value--hash" />
              <Arrow d={`M232 ${y + 56} H268`} ids={ids} />
              <Value at={[250, y + 50]} text="P + t·G" size={9} anchor="middle" />
              <KeyGlyph at={[276, y + 40]} role="public" />
              <Value at={[276, y + 68]} text="OUTPUT KEY Q" size={8.5} cls="k-value--label" />
              <Value at={[276, y + 80]} text={short(d.outputKeyHex)} size={9.5} />
              <Value at={[276, y + 102]} text={`${d.scriptPubKeyHex.slice(0, 2)} ${d.scriptPubKeyHex.slice(2, 4)} ‖ Q`} size={9} cls="k-value--muted" />
              <Value at={[276, y + 114]} text="OUTPUT SCRIPT" size={8} cls="k-value--muted" />
            </g>
          );
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {fixtures.map((f) => (
            <>
              <dt>Vector {f.vectorIndex}: internal key P</dt><dd><code class="atlas-break">{f.derived.internalKeyHex}</code></dd>
              <dt>Merkle root</dt><dd><code class="atlas-break">{f.derived.merkleRootHex ?? "none"}</code></dd>
              <dt>Tweak t</dt><dd><code class="atlas-break">{f.derived.tweakHex}</code></dd>
              <dt>Output key Q</dt><dd><code class="atlas-break">{f.derived.outputKeyHex}</code></dd>
              <dt>Address</dt><dd><code class="atlas-break">{f.derived.address}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
