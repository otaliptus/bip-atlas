import { MAX_BIT, TOP_BITS, VERSION_MAX, VERSION_MIN } from "@bip-atlas/models/versionbits";
import { Drawing, Value } from "../kit";
import { hex32 } from "./parts";

/** What BIP 9 says about each top-bit pattern (claims top-bits, 29-bits). */
const meaning = (top: number): "signal" | "future" | "none" => (top === TOP_BITS ? "signal" : top === 2 * TOP_BITS || top === 3 * TOP_BITS ? "future" : "none");

/**
 * versionbits-top-bits.v1 — static. The 32-bit version space as a cabinet of
 * eight drawers, one per pattern of the top three bits. Drawer 001 is pulled
 * out: BIP 9's signalling range, with 29 free bits. Ranges come from the
 * model's TOP_BITS; the signalling range is checked against VERSION_MIN/MAX.
 */
export function VersionbitsTopBits() {
  const drawers = Array.from({ length: 8 }, (_, k) => {
    const lo = (k * TOP_BITS) >>> 0;
    const hi = (lo + TOP_BITS - 1) >>> 0;
    return { k, pattern: k.toString(2).padStart(3, "0"), lo, hi, kind: meaning(lo) };
  });
  const sig = drawers.find((d) => d.kind === "signal")!;
  if (sig.lo !== VERSION_MIN || sig.hi !== VERSION_MAX) throw new Error("version-bits: drawer 001 disagrees with VERSION_MIN/MAX");
  const x0 = 24, w = 96, rowH = 22, y0 = 30;
  const label = { signal: "BIP 9 SIGNALLING", future: "KEPT FOR A FUTURE MECHANISM", none: "COUNTS AS NO SIGNAL" } as const;
  const desc =
    `The 32-bit version space split into eight equal ranges by its top three bits. ` +
    drawers.map((d) => `${d.pattern}: ${hex32(d.lo)} to ${hex32(d.hi)}, ${label[d.kind].toLowerCase()}`).join("; ") +
    `. Only 001 signals; it leaves ${MAX_BIT + 1} bits for deployments.`;
  return (
    <Drawing id="a11-top" width={344} height={y0 + 8 * rowH + 44} title="Eight drawers, one for signalling" desc={desc}>
      <Value at={[x0, 16]} text="TOP 3 BITS" size={8.5} cls="k-value--label" />
      <Value at={[x0 + w + 44, 16]} text="RANGE OF NVERSION" size={8.5} cls="k-value--label" />
      {/* Cabinet body */}
      <rect class="k-outline k-fill--plain" x={x0 - 6} y={y0 - 6} width={w + 12} height={8 * rowH + 12} />
      {drawers.map((d) => {
        const y = y0 + d.k * rowH;
        const out = d.kind === "signal" ? 22 : 0;
        const x = x0 + out;
        return (
          <g data-pattern={d.pattern}>
            {out ? <rect class="k-outline k-vb-cavity" x={x0} y={y + 2} width={out} height={rowH - 4} /> : null}
            <rect class={`k-outline k-vb-drawer${d.kind === "signal" ? " k-cell--em" : d.kind === "future" ? " k-vb-drawer--future" : ""}`} x={x} y={y + 2} width={w} height={rowH - 4} />
            <rect class="k-outline k-fill--plain" x={x + w / 2 - 9} y={y + rowH / 2 - 2} width="18" height="4" />
            <text class="k-vb-pattern" x={x + 8} y={y + rowH / 2 + 3.4}>{d.pattern}</text>
            <line class="k-leader" x1={x + w + 4} y1={y + rowH / 2} x2={x0 + w + 40} y2={y + rowH / 2} />
            <text class="k-vb-lbl" x={x0 + w + 44} y={y + rowH / 2 - 1}>{label[d.kind]}</text>
            <text class="k-vb-range" x={x0 + w + 44} y={y + rowH / 2 + 8}>{`${hex32(d.lo)}–${hex32(d.hi)}`}</text>
          </g>
        );
      })}
      <Value at={[x0 - 6, y0 + 8 * rowH + 26]} text={`IN 001, BITS ${MAX_BIT} TO 0 ARE FREE: ${MAX_BIT + 1} DEPLOYMENT BITS`} size={8.5} cls="k-value--label" />
    </Drawing>
  );
}
