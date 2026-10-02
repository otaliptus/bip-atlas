import { Drawing, Packet, Value, packetAnchors, packetSize, type PacketField } from "../kit";
import type { DerivedTaprootKeyspendFixture } from "../types";

const ALL_INPUTS = new Set(["sha_amounts", "sha_scriptpubkeys"]);

/**
 * taproot-sigmsg.v1 — static. The BIP 341 signature message for one
 * published key-path spend as a packet diagram on a 32-byte ruler. The two
 * outlined fields commit to every spent output's amount and scriptPubKey.
 */
export function SigMsgLayout({ fixture }: { fixture: DerivedTaprootKeyspendFixture }) {
  const d = fixture.derived;
  const perRow = 32, unit = 9.5, rowH = 22, x0 = 20, y0 = 86;
  const fields: PacketField[] = d.items.map((it) => ({
    id: it.id,
    label: it.label,
    bytes: it.bytes,
    role: it.id.startsWith("sha_") ? "hash" : "plain",
    em: ALL_INPUTS.has(it.id),
  }));
  const size = packetSize(fields, perRow, unit, rowH);
  const anchors = packetAnchors(fields, perRow, x0, y0, unit, rowH);
  const small = fields.filter((f) => f.label.length * 5.4 + 8 >= Math.min(f.bytes, perRow) * unit);
  const top = small.filter((f) => anchors.get(f.id)!.y === y0);
  const bottom = small.filter((f) => anchors.get(f.id)!.y !== y0);
  const below = y0 + size.height;
  const legendY = below + 22 + 12 * bottom.length;
  return (
    <>
      <Drawing
        id="a07-sigmsg"
        width={344}
        height={legendY + 62}
        title="What a key-path signature signs"
        desc={`The signature message for input ${d.txinIndex} of ${d.inputs}, hash_type 0x${d.hashType.toString(16).padStart(2, "0")}, ${d.sigMsgBytes} bytes: ${d.items.map((i) => `${i.label} (${i.bytes} bytes)`).join(", ")}. sha_amounts and sha_scriptpubkeys commit to the amount and scriptPubKey of every output being spent. Its tagged hash, the sighash, is ${d.sighashHex}.`}
      >
        <Value at={[x0, 14]} text={`INPUT ${d.txinIndex} OF ${d.inputs} · HASH_TYPE 0x${d.hashType.toString(16).padStart(2, "0")} · ${d.sigMsgBytes} BYTES`} size={9} cls="k-value--label" />
        <Packet x={x0} y={y0} fields={fields} perRow={perRow} unit={unit} rowH={rowH} ruler />
        {top.map((f, i) => {
          // Elbow leaders: the leftmost field gets the highest label, so no leader crosses another.
          const a = anchors.get(f.id)!;
          const cx = a.x + a.w / 2, ly = y0 - 24 - 12 * (top.length - 1 - i), tx = x0 + 10 * unit + 10;
          return (
            <g class="k-label">
              <path class="k-leader" d={`M${cx} ${y0} V${ly} H${tx - 4}`} />
              <text class="k-value" x={tx} y={ly + 3.3}>{f.label}</text>
            </g>
          );
        })}
        {bottom.map((f, i) => {
          const a = anchors.get(f.id)!;
          const cx = a.x + a.w / 2, ly = a.y + rowH + 12 * (bottom.length - i), tx = x0 + 17 * unit + 10;
          return (
            <g class="k-label">
              <path class="k-leader" d={`M${cx} ${a.y + rowH} V${ly} H${tx - 4}`} />
              <text class="k-value" x={tx} y={ly + 3.3}>{f.label}</text>
            </g>
          );
        })}
        <rect class="k-cell k-fill--hash k-cell--em" x={x0} y={legendY - 8} width="10" height="10" />
        <Value at={[x0 + 16, legendY + 1]} text="AMOUNT AND SCRIPTPUBKEY OF EVERY SPENT OUTPUT" size={8.5} cls="k-value--label" />
        <Value at={[x0, legendY + 24]} text="hash_TapSighash(0x00 ‖ SigMsg) =" size={9.5} />
        <Value at={[x0, legendY + 38]} text={d.sighashHex.slice(0, 32)} size={9.5} />
        <Value at={[x0, legendY + 51]} text={d.sighashHex.slice(32)} size={9.5} />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {d.items.map((it) => (
            <>
              <dt>{it.label}</dt>
              <dd><code class="atlas-break">{it.hex}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
