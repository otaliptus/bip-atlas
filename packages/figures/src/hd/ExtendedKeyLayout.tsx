import { Drawing, Packet, Value, packetAnchors, type PacketField } from "../kit";
import type { Role } from "../kit";
import type { DerivedBip32Fixture } from "../types";

/** BIP 32's serialization format, in order (bytes from the spec). */
export const XKEY_FIELDS = [
  { id: "version", name: "version", bytes: 4 },
  { id: "depth", name: "depth", bytes: 1 },
  { id: "fp", name: "parent fingerprint", bytes: 4 },
  { id: "child", name: "child number", bytes: 4 },
  { id: "chain", name: "chain code c", bytes: 32 },
  { id: "key", name: "key data", bytes: 33 },
  { id: "check", name: "checksum", bytes: 4 },
] as const;

/** Split payload + checksum into the fields above; throws unless the lengths agree. */
export function splitXkey(rawHex: string, checksumHex: string) {
  const all = rawHex + checksumHex;
  const total = XKEY_FIELDS.reduce((n, f) => n + f.bytes, 0);
  if (all.length !== total * 2) throw new Error(`extended key is ${all.length / 2} bytes, expected ${total}`);
  let at = 0;
  return XKEY_FIELDS.map((f) => {
    const hex = all.slice(at * 2, (at + f.bytes) * 2);
    at += f.bytes;
    return { ...f, hex };
  });
}

const UNIT = 8;
const PER = 41;
const X = 8;

/**
 * extended-key-layout.v1 — static. One node serialized both ways, as two
 * packets on the same 41-byte rows: identical fields line up, the three that
 * differ (version, key data and, as a consequence, the checksum) carry a
 * heavy outline. Values from the tested model; exact ones in the table below.
 */
export function ExtendedKeyLayout({ fixture }: { fixture: DerivedBip32Fixture }) {
  const { serialization } = fixture.derived;
  const rows = serialization.rows.map((r) => ({ ...r, fields: splitXkey(r.rawHex, r.checksumHex) }));
  const pub = rows.find((r) => r.kind === "public");
  const prv = rows.find((r) => r.kind === "private");
  if (!pub || !prv) throw new Error(`${fixture.id}: needs both serializations`);
  const differs = (i: number) => pub.fields[i].hex !== prv.fields[i].hex;
  const role = (id: string, kind: "public" | "private"): Role =>
    id === "fp" ? "hash" : id === "chain" ? "public" : id === "key" ? (kind === "public" ? "public" : "secret") : id === "check" ? "check" : "plain";
  const packet = (r: typeof pub): PacketField[] =>
    r.fields.map((f, i) => ({ id: f.id, label: f.id === "key" ? (r.kind === "public" ? "K" : "00 ‖ k") : f.id === "chain" ? "chain code c" : f.name, bytes: f.bytes, role: role(f.id, r.kind), em: differs(i) }));
  const anchors = packetAnchors(packet(pub), PER, X, 0, UNIT);
  const stagger = ["version", "depth", "fp", "child"];
  const Y1 = 98, Y2 = 186;
  const total = XKEY_FIELDS.reduce((n, f) => n + f.bytes, 0);
  const desc =
    `Node ${serialization.path} of BIP 32 test vector 1, serialized as ${total} bytes: ${XKEY_FIELDS.map((f) => `${f.name} ${f.bytes}`).join(", ")}. ` +
    `xpub: ${pub.fields.map((f) => `${f.name} ${f.hex}`).join("; ")}. xprv: the same except ${prv.fields.filter((_, i) => differs(i)).map((f) => `${f.name} ${f.hex}`).join("; ")}. ` +
    `Base58Check turns each into ${pub.base58.length} characters: ${pub.base58} and ${prv.base58}.`;
  return (
    <>
      <Drawing id="a02-xlayout" width={344} height={280} title="One node, two serializations" desc={desc}>
        {stagger.map((id, k) => {
          const a = anchors.get(id)!;
          const cx = a.x + a.w / 2;
          const ly = Y1 - 12 - (stagger.length - 1 - k) * 12 - 12;
          const f = XKEY_FIELDS.find((x) => x.id === id)!;
          return (
            <g class="k-label">
              <line class="k-leader" x1={cx} y1={Y1 - 2} x2={cx} y2={ly + 3} />
              <text x={cx + 3} y={ly} style="font-size:9px">{`${f.name.toUpperCase()} · ${f.bytes} B`}</text>
            </g>
          );
        })}
        <Value at={[X + PER * UNIT, Y1 - 6]} text="xpub" anchor="end" size={9.5} />
        <Packet x={X} y={Y1} fields={packet(pub)} perRow={PER} unit={UNIT} />
        <Value at={[X, 14]} text={`NODE ${serialization.path}`} size={9.5} cls="k-value--label" />
        <Value at={[X + PER * UNIT, Y2 - 6]} text="xprv" anchor="end" size={9.5} />
        <Packet x={X} y={Y2} fields={packet(prv)} perRow={PER} unit={UNIT} />
        <Value at={[X + PER * UNIT, Y2 + 58]} text="CHECKSUM · 4 B" anchor="end" size={9} cls="k-value--label" />
        <line class="k-leader" x1={X + PER * UNIT - 16} y1={Y2 + 44} x2={X + PER * UNIT - 16} y2={Y2 + 49} />
        <Value at={[X, Y2 + 58]} text="HEAVY OUTLINE: DIFFERS" size={9} cls="k-value--label" />
        <Value at={[X, Y2 + 76]} text={`BASE58CHECK → ${pub.base58.length} CHARACTERS EACH`} size={9} cls="k-value--muted" />
        <Value at={[X, Y2 + 90]} text={`${pub.base58.slice(0, 14)}…   ${prv.base58.slice(0, 14)}…`} size={9} />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values, field by field</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {pub.fields.map((f, i) => (
            <>
              <dt>{f.name} · {f.bytes} B{differs(i) ? "" : " · same in both"}</dt>
              <dd>{differs(i) ? <>xpub <code class="atlas-break">{f.hex}</code><br />xprv <code class="atlas-break">{prv.fields[i].hex}</code></> : <code class="atlas-break">{f.hex}</code>}</dd>
            </>
          ))}
          <dt>xpub · {pub.base58.length} characters</dt><dd><code class="atlas-break">{pub.base58}</code></dd>
          <dt>xprv · {prv.base58.length} characters</dt><dd><code class="atlas-break">{prv.base58}</code></dd>
        </dl>
      </details>
    </>
  );
}
