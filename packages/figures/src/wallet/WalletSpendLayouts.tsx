import { Drawing, IsoBox, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { Role } from "../kit";

/**
 * wallet-spend-layouts.v1 — static, schematic (no values). What spending each
 * output takes, as BIPs 84 and 86 state it: an empty scriptSig, and a witness
 * of a signature and the public key (P2WPKH) or a signature alone (P2TR key
 * path). Drawn as stacks of plates, first witness item on top.
 */
export function WalletSpendLayouts() {
  const desc =
    "Spending a BIP 84 output: the scriptSig is empty, and the witness holds two items, a signature and then the public key. " +
    "Spending a BIP 86 output: the scriptSig is empty, and the witness holds one item, a signature.";
  const stack = (ids: DrawingIds, x: number, y: number, title: string, plates: Array<{ role: Role; label: string }>) => (
    <g>
      <Value at={[x, y]} text={title} size={9} cls="k-value--label" />
      <rect class="k-outline k-dashed" x={x} y={y + 12} width="92" height="16" fill="none" />
      <Value at={[x + 100, y + 24]} text="scriptSig: empty" size={9} />
      <Value at={[x, y + 46]} text="WITNESS" size={9} cls="k-value--muted" />
      {plates.map((p, i) => {
        const py = y + 70 + i * 38;
        return (
          <g>
            <IsoBox at={[x + 26, py]} w={66} d={30} h={6} role={p.role} hatch={ids.hatch} />
            <Value at={[x + 104, py + 14]} text={p.label} size={9} />
          </g>
        );
      })}
    </g>
  );
  const parts = (ids: DrawingIds, wide: boolean) => (
    <>
      {stack(ids, 14, 16, "BIP 84 · P2WPKH", [{ role: "sig", label: "signature" }, { role: "public", label: "public key" }])}
      {stack(ids, wide ? 320 : 14, wide ? 16 : 176, "BIP 86 · P2TR KEY PATH", [{ role: "sig", label: "signature" }])}
    </>
  );
  return (
    <Responsive
      wide={<Drawing id="a12-spend-w" width={600} height={160} title="What a spend carries" desc={desc}>{parts(idsFor("a12-spend-w"), true)}</Drawing>}
      narrow={<Drawing id="a12-spend-n" width={300} height={290} title="What a spend carries" desc={desc}>{parts(idsFor("a12-spend-n"), false)}</Drawing>}
    />
  );
}
