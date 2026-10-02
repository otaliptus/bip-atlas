import { V1_HEADER, V2_OVERHEAD } from "@bip-atlas/models/v2constants";
import { Drawing, Value } from "../kit";
import type { DerivedV2FramingFixture } from "../types";

const LABEL: Record<string, string> = { "network magic": "MAGIC", "payload length": "LENGTH", checksum: "CHECKSUM", "encrypted length": "LEN", "header (ignore bit)": "HDR", "Poly1305 tag": "TAG" };
const name = (f: string) => LABEL[f] ?? (f.startsWith("command") ? "COMMAND" : f.startsWith("message type ID") ? "ID" : f.toUpperCase());

/**
 * v1-v2-framing.v1 — static. The bytes each transport adds to one message,
 * as two packet diagrams on the same byte scale: v1's cleartext 24-byte
 * header, and v2's encrypted length, header byte, short type ID and tag.
 * Field sizes from derive; the totals must equal the model's constants.
 */
export function V2Framing({ fixture }: { fixture: DerivedV2FramingFixture }) {
  const d = fixture.derived;
  const sum = (xs: { bytes: number }[]) => xs.reduce((n, x) => n + x.bytes, 0);
  if (sum(d.v1) !== V1_HEADER || sum(d.v2) !== V2_OVERHEAD + 1) throw new Error(`${fixture.id}: framing sizes differ from the model`);
  const unit = 11, x0 = 14, pay = 44;
  const row = (y: number, fields: { field: string; bytes: number }[], v2: boolean) => {
    // v2: the payload sits between the type ID and the tag.
    const before = v2 ? fields.slice(0, 3) : fields;
    const after = v2 ? fields.slice(3) : [];
    let x = x0;
    let deep = false;
    const seg = (f: { field: string; bytes: number }) => {
      const sx = x, w = f.bytes * unit;
      x += w;
      const n = name(f.field);
      const fits = n.length * 5.6 + 6 < w;
      const dy = fits ? 0 : (deep = !deep) ? 0 : 13;
      return (
        <g>
          <rect class={`k-cell ${v2 ? "k-fill--net" : "k-fill--plain"}`} x={sx} y={y} width={w} height={22} />
          {fits ? <text class="k-v2-t" x={sx + 4} y={y + 14.5}>{n}</text> : <><line class="k-leader" x1={sx + w / 2} y1={y + 22} x2={sx + w / 2} y2={y + 30 + dy} /><text class="k-v2-t" x={sx + w / 2} y={y + 39 + dy} text-anchor="middle">{n}</text></>}
          <text class="k-v2-b" x={sx + w / 2} y={y - 4} text-anchor="middle">{f.bytes}</text>
        </g>
      );
    };
    const segs = before.map(seg);
    const px = x;
    x += pay;
    return (
      <g>
        {segs}
        <rect class={`k-cell ${v2 ? "k-fill--net" : "k-fill--plain"} k-dashed`} x={px} y={y} width={pay} height={22} />
        <text class="k-v2-b" x={px + 4} y={y + 14.5}>PAYLOAD</text>
        {after.map(seg)}
      </g>
    );
  };
  const desc = `Per message, v1 sends a ${sum(d.v1)}-byte header in the clear: ${d.v1.map((f) => `${f.field}, ${f.bytes} bytes`).join("; ")}, then the payload. v2 sends ${sum(d.v2)} bytes besides the payload for a ${d.messageType} message: ${d.v2.map((f) => `${f.field}, ${f.bytes} bytes`).join("; ")}; none of it in the clear. A type without a short ID takes 13 bytes instead of 1.`;
  return (
    <Drawing id="a17-framing" width={344} height={186} title="Framing, v1 and v2" desc={desc}>
      <Value at={[x0, 14]} text={`V1 · ${sum(d.v1)} B IN THE CLEAR`} size={9} cls="k-value--label" />
      {row(30, d.v1, false)}
      <Value at={[x0, 98]} text={`V2 · ${d.messageType.toUpperCase()} · ${sum(d.v2)} B, NONE IN THE CLEAR`} size={9} cls="k-value--label" />
      {row(114, d.v2, true)}
      <Value at={[x0, 180]} text={`ID ${d.shortId} = ${d.messageType.toUpperCase()} · NUMBERS ARE BYTES`} size={8.5} cls="k-value--muted" />
    </Drawing>
  );
}
