import { REKEY_INTERVAL } from "@bip-atlas/models/v2transport";
import { Arrow, Cells, Drawing, KeyGlyph, Value, idsFor } from "../kit";
import type { DerivedV2RekeyFixture } from "../types";

const s8 = (hex: string) => `${hex.slice(0, 8)}…`;

/**
 * v2-rekey.v1 — static. The payload cipher of one side of a published
 * vector, run forward by the tested model: a ring of 224 packet slots per
 * epoch, the nonce (packet in epoch ‖ epoch) on both sides of a boundary,
 * and the chain of keys, each made from the one before.
 */
export function V2Rekey({ fixture }: { fixture: DerivedV2RekeyFixture }) {
  const rows = fixture.derived.rows;
  const epochs = [...new Map(rows.map((r) => [r.epoch, r])).values()];
  const last = rows.find((r) => r.packet === REKEY_INTERVAL - 1), first = rows.find((r) => r.packet === REKEY_INTERVAL);
  if (!last || !first || epochs.length < 2) throw new Error(`${fixture.id}: needs packets ${REKEY_INTERVAL - 1} and ${REKEY_INTERVAL}`);
  const ids = idsFor("a17-rekey");
  const cx = 72, cy = 80, r = 50;
  const tick = (k: number, len: number) => {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / REKEY_INTERVAL;
    return `M${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r} L${cx + Math.cos(a) * (r - len)} ${cy + Math.sin(a) * (r - len)}`;
  };
  const nonceRow = (y: number, row: typeof rows[number]) => (
    <g>
      <Value at={[150, y - 4]} text={`PACKET ${row.packet} · NONCE`} size={8} cls="k-value--label" />
      <Cells x={150} y={y} values={row.nonce.match(/.{2}/g)!} size={14} emphasis={(i) => i < 4} />
    </g>
  );
  const side = fixture.derived.initiating ? "initiator" : "responder";
  return (
    <>
      <Drawing
        id="a17-rekey"
        width={344}
        height={252}
        title="Nonces and keys across a rekey"
        desc={`The ${side}'s payload cipher in a published BIP 324 vector. Each epoch is ${REKEY_INTERVAL} packets. ${rows.map((x) => `Packet ${x.packet}: nonce ${x.nonce}, epoch ${x.epoch}, key ${x.key}`).join("; ")}. After every ${REKEY_INTERVAL}th packet the new key is the first 32 bytes of encrypting 32 zero bytes under the old key, with the nonce's packet field set to 0xffffffff.`}
      >
        <circle class="k-ring" cx={cx} cy={cy} r={r} />
        {Array.from({ length: REKEY_INTERVAL }, (_, k) => <path class="k-leader" d={tick(k, k % 32 === 0 ? 7 : 3)} />)}
        <path class="k-cut" d={tick(REKEY_INTERVAL - 1, 12)} />
        <Value at={[cx, cy - 2]} text={`${REKEY_INTERVAL}`} size={12} anchor="middle" />
        <Value at={[cx, cy + 10]} text="PACKETS PER KEY" size={8} anchor="middle" cls="k-value--muted" />
        <Value at={[cx - 6, 22]} text={`${last.packet} → ${first.packet}`} size={8.5} anchor="end" cls="k-value--label" />
        {nonceRow(36, last)}
        {nonceRow(80, first)}
        <Value at={[150, 112]} text="PACKET (4 B LE, HEAVY) ‖ EPOCH (8 B LE)" size={8} cls="k-value--muted" />
        <Value at={[14, 154]} text="EACH KEY MADE FROM THE ONE BEFORE" size={8.5} cls="k-value--label" />
        {epochs.slice(0, 3).map((e, i) => {
          const x = 14 + i * 112;
          return (
            <g>
              <KeyGlyph at={[x, 166]} role="secret" />
              <Value at={[x, 200]} text={`EPOCH ${e.epoch}`} size={8.5} cls="k-value--label" />
              <Value at={[x, 212]} text={s8(e.key)} size={9} />
              {i < Math.min(2, epochs.length - 1) ? <Arrow d={`M${x + 52} 172 H${x + 100}`} ids={ids} /> : null}
            </g>
          );
        })}
        <Value at={[14, 238]} text="NEW KEY = FIRST 32 B OF ENCRYPTING 32 ZERO BYTES" size={8.5} cls="k-value--muted" />
        <Value at={[14, 248]} text="UNDER THE OLD KEY, NONCE PACKET FIELD 0xffffffff" size={8.5} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact nonces and keys</summary>
        <dl class="atlas-hexlist">
          {rows.map((x) => <><dt>Packet {x.packet} (epoch {x.epoch})</dt><dd><code class="atlas-break">{x.nonce}</code><br /><code class="atlas-break">{x.key}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
