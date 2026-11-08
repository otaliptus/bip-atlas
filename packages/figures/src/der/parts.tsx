import { Value, short } from "../kit";
import type { DerFieldView, DerVariantView } from "../types";

/** Field widths in a signature ribbon: one-byte fields are narrow cells, R and S wide boxes. */
export function ribbonLayout(fields: DerFieldView[], width: number, cell = 20) {
  const small = fields.filter((f) => f.hex.length === 2).length;
  const big = (width - small * (cell + 2)) / 2 - 2;
  let x = 0;
  return fields.map((f) => {
    const w = f.hex.length === 2 ? cell : big;
    const at = { f, x, w };
    x += w + 2;
    return at;
  });
}

/**
 * A signature as a ribbon of its DER fields, changed fields outlined and
 * labelled. Long fields show their first bytes; the disclosure lists them in full.
 */
export function SigRibbon({ x, y, v, width }: { x: number; y: number; v: { fields: DerFieldView[]; changed: string[] }; width: number }) {
  const lay = ribbonLayout(v.fields, width);
  return (
    <g class="k-sig-ribbon">
      {lay.map(({ f, x: dx, w }) => {
        const changed = v.changed.includes(f.id);
        const role = f.id === "r" || f.id === "s" ? "sig" : "plain";
        const text = f.hex.length === 2 ? f.hex : `${f.hex.startsWith("00") ? "00 " : ""}${short(f.hex.startsWith("00") ? f.hex.slice(2) : f.hex, w > 120 ? 12 : 6)}`;
        return (
          <g data-field={f.id} data-changed={changed ? "yes" : undefined}>
            <rect class={`k-cell k-fill--${role}${changed ? " k-cell--em" : ""}`} x={x + dx} y={y} width={w} height={22} />
            <Value at={[x + dx + w / 2, y + 14.5]} text={text} size={8.5} anchor="middle" />
            {f.hex.length > 2 ? <Value at={[x + dx + w / 2, y + 34]} text={`${f.label} · ${f.hex.length / 2} B`} size={7.5} anchor="middle" cls="k-value--muted" /> : null}
            {changed ? <Value at={[x + dx + w / 2, y - 5]} text="▼" size={7} anchor="middle" cls="k-value--label" /> : null}
          </g>
        );
      })}
    </g>
  );
}

/** One-line verdict on a changed signature. */
export function verdict(v: DerVariantView): string {
  if (!v.encoding.valid) return `BIP 66 rejects it at line ${v.encoding.failed!.line} (${v.encoding.failed!.label}): the script fails at once, before any ECDSA check`;
  if (v.ecdsa && v.lowS) return "strict DER, a valid signature, and S in the lower half: accepted";
  if (v.ecdsa && !v.lowS) return "strict DER and still a valid ECDSA signature, but S is in the upper half, so BIP 146's proposed LOW_S rule would reject it";
  return "strict DER but not a valid signature";
}
