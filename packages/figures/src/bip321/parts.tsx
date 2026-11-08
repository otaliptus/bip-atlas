import { Value } from "../kit";
import type { Bip321Param, DerivedBip321Fixture } from "../types";

/** Approximate width of a monospace string at a Value size (SVG units). */
export const textW = (s: string, size = 9) => s.length * size * 0.6;

export interface Segment { text: string; role: "scheme" | "address" | "sep" | Bip321Param["kind"] | "required" ; param?: Bip321Param }

/** The URI as written, cut into scheme, body and parameters (with their separators). */
export function segmentsOf(f: DerivedBip321Fixture): Segment[] {
  const r = f.derived.reading;
  const out: Segment[] = [{ text: `${r.scheme}:`, role: "scheme" }];
  if (r.address) out.push({ text: r.address, role: "address" });
  r.params.forEach((p, i) => {
    out.push({ text: i === 0 ? "?" : "&", role: "sep" });
    out.push({ text: p.raw, role: p.required && p.kind === "unknown" ? "required" : p.kind, param: p });
  });
  return out;
}

const FILL: Record<Segment["role"], string> = {
  scheme: "k-fill--plain",
  address: "k-fill--public",
  sep: "k-fill--plain",
  amount: "k-fill--plain",
  label: "k-fill--plain",
  message: "k-fill--plain",
  pop: "k-fill--plain",
  instruction: "k-fill--net",
  unknown: "k-fill--plain k-dashed",
  required: "k-fill--plain k-cell--em",
};

/** What each part is, as a short tag. */
export const TAG: Record<Segment["role"], string> = {
  scheme: "scheme",
  address: "address",
  sep: "",
  amount: "amount, BTC",
  label: "label",
  message: "message",
  pop: "proof of payment",
  instruction: "payment instruction",
  unknown: "unknown: ignored",
  required: "req-, unknown",
};

/**
 * The segments laid out left to right, wrapping at `width`. Long single
 * segments are cut into pieces that each fit. Returns the drawing and its height.
 */
export function UriRibbon({ x, y, width, segs, size = 9 }: { x: number; y: number; width: number; segs: Segment[]; size?: number }) {
  const rowH = 38;
  const pieces: Array<Segment & { px: number; row: number; w: number; first: boolean }> = [];
  const perRow = Math.floor((width - 8) / (size * 0.6));
  let px = 0, row = 0;
  for (const s of segs) {
    const w = textW(s.text, size) + 8;
    // A part that does not fit moves whole to the next row; only a part longer than a row is cut.
    if (px > 0 && px + w > width) { row++; px = 0; }
    const parts = w <= width ? [s.text] : (s.text.match(new RegExp(`.{1,${perRow}}`, "g")) ?? [s.text]);
    parts.forEach((text, i) => {
      if (i > 0) { row++; px = 0; }
      const pw = textW(text, size) + 8;
      pieces.push({ ...s, text, px, row, w: pw, first: i === 0 });
      px += pw + 1;
    });
  }
  const height = (row + 1) * rowH;
  return {
    height,
    el: (
      <g class="k-uri">
        {pieces.map((p) => (
          <g data-role={p.role}>
            <rect class={`k-cell ${FILL[p.role]}`} x={x + p.px} y={y + p.row * rowH} width={p.w} height={20} />
            <Value at={[x + p.px + 4, y + p.row * rowH + 14]} text={p.text} size={size} />
            {p.first && TAG[p.role] ? <Value at={[x + p.px + 2, y + p.row * rowH + 31]} text={TAG[p.role].toUpperCase()} size={7} cls="k-value--muted" /> : null}
          </g>
        ))}
      </g>
    ),
  };
}

/** One wallet's reading as a sentence, for status lines and text equivalents. */
export function walletSentence(w: DerivedBip321Fixture["derived"]["wallets"][number]): string {
  if (!w.valid) return `${w.name}: invalid, because ${w.reason!.charAt(0).toLowerCase()}${w.reason!.slice(1, -1)}`;
  if (!w.pays.length) return `${w.name}: valid, but nothing it can pay with`;
  return `${w.name}: pays ${w.pays.map((k) => (k === "onchain" ? "on-chain" : k === "lightning" ? "with Lightning" : `with ${k}`)).join(" or ")}`;
}

/** One wallet's reading in words. */
export function walletVerdict(w: DerivedBip321Fixture["derived"]["wallets"][number]): string {
  if (!w.valid) return `INVALID: ${w.reason!.charAt(0).toLowerCase()}${w.reason!.slice(1)}`;
  if (!w.pays.length) return "VALID, BUT NOTHING IT CAN PAY";
  return `PAYS: ${w.pays.map((k) => (k === "onchain" ? "ON-CHAIN" : k.toUpperCase())).join(" OR ")}`;
}
