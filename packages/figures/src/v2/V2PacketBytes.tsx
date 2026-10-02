import { HEADER_LEN, LENGTH_FIELD_LEN, TAG_LEN } from "@bip-atlas/models/v2transport";
import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedV2Fixture } from "../types";

/**
 * v2-packet-bytes.v1 — static. Every byte of a short published packet on a
 * byte ruler, with what protects each part: the length by its own cipher
 * stream and not by the tag; header and contents by ChaCha20-Poly1305; the
 * tag. Beneath, what the two endpoints recover. Needs a vector that
 * publishes the whole packet.
 */
export function V2PacketBytes({ fixture }: { fixture: DerivedV2Fixture }) {
  const p = fixture.derived.packet;
  const wire = (p.lengthEnc + p.ciphertextHead).match(/.{2}/g)!;
  if (p.checkedBytes !== p.totalLen || wire.length !== p.totalLen) throw new Error(`${fixture.id}: needs a short packet the vector publishes in full`);
  const body = HEADER_LEN + p.contentsLen;
  if (LENGTH_FIELD_LEN + body + TAG_LEN !== p.totalLen) throw new Error(`${fixture.id}: packet length differs from 3 + 1 + contents + 16`);
  const cs = Math.min(15, 312 / p.totalLen), x0 = 16;
  const plain = [...p.lengthPlain.match(/.{2}/g)!, p.ignore ? "80" : "00", ...p.contentsHead.slice(0, p.contentsLen * 2).match(/.{2}/g)!];
  const at = (i: number) => x0 + i * cs;
  return (
    <>
      <Drawing
        id="a17-bytes"
        width={344}
        height={184}
        title="One packet, byte by byte"
        desc={`Packet ${p.index} of vector ${fixture.label}, all ${p.totalLen} bytes: ${wire.join("")}. Bytes 0 to 2 are the length, encrypted with its own ChaCha20 stream and not covered by the tag; the next ${body} are the header and contents, encrypted with ChaCha20-Poly1305; the last ${TAG_LEN} are the Poly1305 tag. The endpoints recover the length ${p.lengthPlain} (${p.contentsLen}, little-endian), the header ${plain[LENGTH_FIELD_LEN]} and the contents ${p.contentsHead.slice(0, p.contentsLen * 2)}.`}
      >
        <Value at={[x0, 14]} text={`ON THE WIRE · PACKET ${p.index} · ${p.totalLen} B`} size={8.5} cls="k-value--label" />
        {[0, LENGTH_FIELD_LEN, LENGTH_FIELD_LEN + body, p.totalLen].map((i) => <text class="k-v2-b" x={at(i)} y={30} text-anchor="middle">{i}</text>)}
        <Cells x={x0} y={36} values={wire} size={cs} roleOf={() => "net"} />
        <Bracket x1={at(0)} x2={at(LENGTH_FIELD_LEN)} y={36 + cs + 3} text="length" align="start" />
        <Bracket x1={at(LENGTH_FIELD_LEN)} x2={at(LENGTH_FIELD_LEN + body)} y={36 + cs + 3} text="" />
        <Bracket x1={at(LENGTH_FIELD_LEN + body)} x2={at(p.totalLen)} y={36 + cs + 3} text={`tag · ${TAG_LEN} B`} />
        <Value at={[x0, 92]} text="LENGTH: OWN CHACHA20 STREAM, NOT IN THE TAG" size={8} cls="k-value--muted" />
        <Value at={[x0, 103]} text={`HEADER + CONTENTS (${body} B): CHACHA20-POLY1305`} size={8} cls="k-value--muted" />
        <Value at={[x0, 128]} text="WHAT THE ENDPOINTS RECOVER" size={8.5} cls="k-value--label" />
        <Cells x={x0} y={136} values={plain} size={cs} />
        <Value at={[x0, 136 + cs + 14]} text={`LENGTH ${p.contentsLen} (LE) · HEADER ${p.ignore ? "IGNORE BIT SET" : "00"} · CONTENTS`} size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact bytes</summary>
        <dl class="atlas-hexlist">
          <dt>Packet</dt><dd><code class="atlas-break">{wire.join("")}</code></dd>
          <dt>Nonce</dt><dd><code class="atlas-break">{p.nonce}</code></dd>
        </dl>
      </details>
    </>
  );
}
