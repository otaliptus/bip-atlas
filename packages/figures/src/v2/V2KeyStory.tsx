import { MAINNET_MAGIC } from "@bip-atlas/models/v2constants";
import { Arrow, Cells, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedV2Fixture } from "../types";

const s8 = (hex: string) => `${hex.slice(0, 8)}…`;

/**
 * v2-key-story.v1 — static storyboard (was the worked example). One
 * published vector from two 64-byte keys to its first encrypted packet:
 * ECDH, the shared secret, HKDF's outputs and the packet that carries the
 * garbage as associated data. Every value was recomputed at build time and
 * equals the vector's; the ElligatorSwift decodings are the vector's own.
 */
export function V2KeyStory({ fixture }: { fixture: DerivedV2Fixture }) {
  const d = fixture.derived;
  const p = d.packet;
  const me = d.initiating ? "initiator" : "responder";
  const keys: Array<[string, string]> = [["INITIATOR L", d.keys.initiatorL], ["INITIATOR P", d.keys.initiatorP], ["RESPONDER L", d.keys.responderL], ["RESPONDER P", d.keys.responderP]];
  const box = (x: number, y: number, w: number, label: string, value: string, role: string) => (
    <g>
      <rect class={`k-cell k-fill--${role}`} x={x} y={y} width={w} height={24} />
      <text class="k-v2-b" x={x + 4} y={y + 9.5}>{label}</text>
      <text class="k-v2-hex" x={x + 4} y={y + 20}>{value}</text>
    </g>
  );
  const frames: Frame[] = [
    {
      note: `The two 64-byte keys cross the wire, the initiator's first. Each side decodes the other's to an x coordinate.`,
      desc: `Initiator's encoding ${d.initiating ? d.ellOurs : d.ellTheirs}; responder's ${d.initiating ? d.ellTheirs : d.ellOurs}. The x coordinate of the peer's key, ${d.xTheirs}, is the vector's decoding; this site does not decode ElligatorSwift.`,
      draw: () => (
        <>
          <Value at={[12, 18]} text="INITIATOR · 64 B" size={8.5} cls="k-value--label" />
          <Cells x={12} y={24} values={Array(32).fill("")} size={8.5} roleOf={() => "net"} text={false} />
          <Value at={[12, 58]} text="RESPONDER · 64 B" size={8.5} cls="k-value--label" />
          <Cells x={12} y={64} values={Array(32).fill("")} size={8.5} roleOf={() => "net"} text={false} />
          <Value at={[12, 98]} text={`PEER'S x ${s8(d.xTheirs)} · VECTOR'S DECODING`} size={8} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: "X-only ECDH, then a tagged hash of both encodings exactly as sent and the shared x: the shared secret.",
      desc: `X-only ECDH gives ${d.xShared}; hashed with both 64-byte encodings, initiator's first, it gives the shared secret ${d.sharedSecret}.`,
      draw: (ids) => (
        <>
          {box(12, 14, 110, "BOTH ENCODINGS", "initiator's first", "net")}
          {box(12, 46, 110, "THEN X-ONLY ECDH", s8(d.xShared), "secret")}
          <Arrow d="M126 42 H156" ids={ids} />
          <Machine at={[190, 40]} w={44} d={24} h={20} label="hash" role="hash" />
          <Value at={[150, 11]} text="TAG bip324_ellswift_xonly_ecdh" size={8} cls="k-value--muted" />
          <Arrow d="M212 64 V84" ids={ids} />
          {box(150, 88, 130, "SHARED SECRET", s8(d.sharedSecret), "secret")}
        </>
      ),
    },
    {
      note: `HKDF-SHA256, salted with "bitcoin_v2_shared_secret" and the network magic, gives four keys, two terminators and the session ID.`,
      desc: `HKDF-SHA256 with salt "bitcoin_v2_shared_secret" and magic ${MAINNET_MAGIC} expands the secret into ${keys.map(([n, v]) => `${n.toLowerCase()} ${v}`).join(", ")}; garbage terminators ${d.sendTerminator} (sent by the ${me}) and ${d.recvTerminator}; session ID ${d.sessionId}.`,
      draw: () => (
        <>
          {keys.map(([n, v], i) => box(12 + (i % 2) * 140, 8 + Math.floor(i / 2) * 28, 134, n, s8(v), "secret"))}
          {box(12, 66, 134, "TERMINATORS · SENT", `${s8(d.sendTerminator)} ${d.recvTerminator.slice(0, 4)}…`, "net")}
          {box(152, 66, 134, "SESSION ID", s8(d.sessionId), "hash")}
          <Value at={[12, 110]} text={`SALT "bitcoin_v2_shared_secret" ‖ ${MAINNET_MAGIC}`} size={8} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `Packet ${p.index} from the ${me}: ${p.aadLen ? `the ${p.aadLen.toLocaleString("en-US")} garbage bytes it sent are authenticated as associated data` : "no associated data"}, ${p.totalLen} bytes in all.`,
      desc: `Packet ${p.index}: encrypted length ${p.lengthEnc}, then ${p.contentsLen + 1} bytes of encrypted header and contents beginning ${p.ciphertextHead}, and the tag ${p.tag}; ${p.aadLen} bytes of associated data (the garbage), not sent again. Nonce ${p.nonce}.`,
      draw: () => {
        const unit = 268 / p.totalLen;
        const parts: Array<[number, string, string]> = [[3, "LEN", "net"], [p.contentsLen + 1, "HEADER + CONTENTS", "net"], [16, "TAG", "net"]];
        let x = 12;
        return (
          <>
            {p.aadLen ? (
              <>
                <rect class="k-cell k-fill--plain k-dashed" x="12" y="14" width="268" height="20" />
                <Value at={[18, 28]} text={`GARBAGE ${p.aadLen.toLocaleString("en-US")} B · ALREADY SENT · AAD`} size={8} cls="k-value--label" />
              </>
            ) : null}
            {parts.map(([n, l, r]) => {
              const sx = x;
              x += n * unit;
              return (
                <g>
                  <rect class={`k-cell k-fill--${r}`} x={sx} y={52} width={n * unit} height={24} />
                  {n * unit > l.length * 5.5 + 6 ? <text class="k-v2-b" x={sx + 4} y={67}>{l}</text> : null}
                </g>
              );
            })}
            <Value at={[12, 96]} text={`TAG ${s8(p.tag)} COVERS AAD, HEADER, CONTENTS`} size={8} cls="k-value--muted" />
          </>
        );
      },
    },
  ];
  return (
    <>
      <Storyboard id="a17-keys" title="From two keys to a packet" width={300} height={120} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values, step by step</summary>
        <dl class="atlas-hexlist">
          <dt>Initiator's / responder's 64 bytes</dt><dd><code class="atlas-break">{d.initiating ? d.ellOurs : d.ellTheirs}</code><br /><code class="atlas-break">{d.initiating ? d.ellTheirs : d.ellOurs}</code></dd>
          <dt>x(ECDH) and shared secret</dt><dd><code class="atlas-break">{d.xShared}</code><br /><code class="atlas-break">{d.sharedSecret}</code></dd>
          {keys.map(([n, v]) => <><dt>{n.toLowerCase()}</dt><dd><code class="atlas-break">{v}</code></dd></>)}
          <dt>Terminators (sent, received) and session ID</dt><dd><code class="atlas-break">{d.sendTerminator}</code><br /><code class="atlas-break">{d.recvTerminator}</code><br /><code class="atlas-break">{d.sessionId}</code></dd>
          <dt>Packet {p.index}: length, start of ciphertext, tag</dt><dd><code class="atlas-break">{p.lengthEnc}</code><br /><code class="atlas-break">{p.ciphertextHead}</code><br /><code class="atlas-break">{p.tag}</code></dd>
        </dl>
      </details>
    </>
  );
}
