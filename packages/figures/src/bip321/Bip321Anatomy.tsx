import { Drawing, Value } from "../kit";
import type { DerivedBip321Fixture } from "../types";
import { TAG, segmentsOf, textW } from "./parts";

const MEANING: Record<string, string> = {
  scheme: "the scheme: which app opens the link",
  address: "the body: an address to pay on-chain",
  amount: "amount: decimal BTC, a period, no commas",
  label: "label: a name for the recipient",
  message: "message: describes the payment",
};

/**
 * bip321-anatomy.v1 — static. One published link, part by part, one part to
 * a row: what each part is, and the message percent-decoded.
 */
export function Bip321Anatomy({ fixture: f }: { fixture: DerivedBip321Fixture }) {
  const segs = segmentsOf(f).filter((s) => s.role !== "sep");
  const x0 = 14, rowH = 40, y0 = 30;
  const H = y0 + segs.length * rowH + 4;
  return (
    <Drawing
      id="a21-anatomy"
      width={344}
      height={H}
      title="A payment link, part by part"
      desc={`${f.uri}: ${segs.map((s) => `${s.text}, ${MEANING[s.role] ?? TAG[s.role]}${s.param && s.param.value !== null && s.param.raw.slice(s.param.raw.indexOf("=") + 1) !== s.param.value ? `, decoded "${s.param.value}"` : ""}`).join("; ")}.`}
    >
      <Value at={[x0, 14]} text={`BIP 321 · ${f.note.toUpperCase()}`} size={8} cls="k-value--label" />
      {segs.map((s, i) => {
        const y = y0 + i * rowH;
        const p = s.param;
        const decoded = p && p.value !== null && p.raw.slice(p.raw.indexOf("=") + 1) !== p.value ? p.value : null;
        const size = textW(s.text, 9) > 316 ? 7.5 : 9;
        return (
          <g data-part={s.role}>
            <rect class={`k-cell ${s.role === "address" ? "k-fill--public" : "k-fill--plain"}`} x={x0} y={y} width={Math.min(316, textW(s.text, size) + 8)} height={20} />
            <Value at={[x0 + 4, y + 14]} text={s.text} size={size} />
            <Value at={[x0, y + 32]} text={(decoded ? `${MEANING[s.role] ?? TAG[s.role]} → “${decoded}”` : MEANING[s.role] ?? TAG[s.role]).toUpperCase()} size={7.5} cls="k-value--muted" />
          </g>
        );
      })}
    </Drawing>
  );
}
