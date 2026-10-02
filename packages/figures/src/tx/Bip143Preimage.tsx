import { Drawing, Value, idsFor } from "../kit";
import type { DerivedTransactionFixture } from "../types";
import { BytePacket, bytesHeight, layoutBytes, type ByteField } from "./BytePacket";
import { preimageRole, sighashName } from "./fields";

/**
 * bip143-preimage.v1 — static. The ten-item BIP 143 preimage of one
 * published input as a packet diagram on a 32-byte ruler, items numbered;
 * the three summary hashes yellow, items supplied from outside the
 * transaction dashed, the amount outlined; then its double SHA-256.
 */
export function Bip143Preimage({ fixture }: { fixture: DerivedTransactionFixture }) {
  const d = fixture.derived;
  const items = d.digest.items;
  const total = items.reduce((n, it) => n + it.hex.length / 2, 0);
  const ids = idsFor("a03-pre");
  const perRow = 32, unit = 9.5, rowH = 22, gap = 3, x0 = 20, y0 = 44;
  const fields: ByteField[] = items.map((it, n) => ({ id: it.id, short: it.label, bytes: it.hex.length / 2, role: preimageRole(it.id), outside: it.from.length === 0, em: it.id === "amount", badges: [n + 1] }));
  const segs = layoutBytes(fields, perRow, x0, y0, unit, rowH, gap);
  const end = y0 + bytesHeight(total, perRow, rowH, gap);
  const keyY = end + 22;
  const half = Math.ceil(items.length / 2);
  const noteY = keyY + half * 13 + 30;
  const hashType = items.find((it) => it.id === "hashType");
  if (!hashType) throw new Error("bip143-preimage: no sighash type item");
  const type = sighashName(hashType.hex);
  return (
    <>
      <Drawing
        id="a03-pre"
        width={344}
        height={noteY + 70}
        title="What a SegWit signature signs"
        desc={`The BIP 143 preimage for input ${fixture.sighash.inputIndex} of the ${fixture.label} example, ${type}, ${total} bytes in ${items.length} items: ${items.map((it, n) => `${n + 1} ${it.label}, ${it.hex.length / 2} bytes, ${it.note}`).join("; ")}. The amount is ${d.amountBtc} BTC. The double SHA-256 of the preimage is the sighash ${d.digest.sighashHex}, the value BIP 143 publishes.`}
      >
        <Value at={[x0, 14]} text={`INPUT ${fixture.sighash.inputIndex} · ${type} · ${items.length} ITEMS · ${total} BYTES`} size={9} cls="k-value--label" />
        <BytePacket segs={segs} hatch={ids.hatch} ruler perRow={perRow} unit={unit} x={x0} y={y0} rowH={rowH} />
        {items.map((it, n) => {
          const col = n < half ? 0 : 1, row = n % half;
          const x = x0 + col * 160, y = keyY + row * 13;
          return (
            <g>
              <circle class="k-outline k-fill--plain" cx={x + 5} cy={y - 3} r="5" />
              <text class="k-badge__t" x={x + 5} y={y - 0.4} text-anchor="middle">{n + 1}</text>
              <text class="k-legend__t" x={x + 15} y={y}>{`${it.label} · ${it.hex.length / 2} B`}</text>
            </g>
          );
        })}
        <rect class="k-cell k-fill--plain k-dashed" x={x0} y={noteY - 24} width="10" height="10" />
        <Value at={[x0 + 16, noteY - 15]} text="DASHED: NOT A FIELD OF THE TRANSACTION" size={9} cls="k-value--label" />
        <rect class="k-cell k-fill--plain k-cell--em k-dashed" x={x0} y={noteY - 8} width="10" height="10" />
        <Value at={[x0 + 16, noteY + 1]} text={`OUTLINED: AMOUNT SPENT, ${d.amountBtc} BTC`} size={9} cls="k-value--label" />
        <Value at={[x0, noteY + 24]} text="double SHA-256 of the preimage =" size={9.5} />
        <Value at={[x0, noteY + 38]} text={d.digest.sighashHex.slice(0, 32)} size={9.5} cls="k-value--hash" />
        <Value at={[x0, noteY + 51]} text={d.digest.sighashHex.slice(32)} size={9.5} cls="k-value--hash" />
        <Value at={[x0, noteY + 64]} text={`THE SIGHASH PUBLISHED AT BIP 143 LINE ${fixture.sighash.sighashLine}`} size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact preimage items</summary>
        <dl class="atlas-hexlist">
          {items.map((it, n) => (
            <>
              <dt>{n + 1}. {it.label}: {it.note}</dt>
              <dd><code class="atlas-break">{it.hex}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
