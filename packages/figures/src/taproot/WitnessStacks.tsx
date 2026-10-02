import { Drawing, IsoBox, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedTaprootTreeFixture } from "../types";

const leafName = (id: number) => `Leaf ${String.fromCharCode(65 + id)}`;

/**
 * taproot-witness-stacks.v1 — static. The two witnesses side by side as
 * stacks of plates, first item on top: a key path spend is one signature; a
 * script path spend ends with the script and its control block.
 */
export function WitnessStacks({ fixture }: { fixture: DerivedTaprootTreeFixture }) {
  const d = fixture.derived;
  const leaf = d.leaves.find((l) => l.id === 1) ?? d.leaves[0];
  const sigBytes = (d.keySpend?.signatureHex.length ?? 128) / 2;
  const scriptBytes = leaf.scriptHex.length / 2;
  const cbBytes = leaf.controlBlockHex.length / 2;
  const desc =
    `Key path: the witness has one item, a ${sigBytes}-byte signature (the published key-path spend of this output). ` +
    `Script path for ${leafName(leaf.id)}: the script's own inputs (not published by the vector), then the ${scriptBytes}-byte script, then the ${cbBytes}-byte control block. ` +
    `A verifier tells them apart by counting items; an annex, if present, would be a last item starting with the byte 0x50.`;
  const stack = (ids: DrawingIds, x: number, y: number, title: string, plates: Array<{ role: "sig" | "plain" | "hash" | "hidden"; label: string }>) => (
    <g>
      <Value at={[x, y]} text={title} size={9} cls="k-value--label" />
      {plates.map((p, i) => {
        const py = y + 30 + i * 44;
        return (
          <g>
            <IsoBox at={[x + 26, py]} w={70} d={30} h={6} role={p.role} hatch={ids.hatch} />
            <Value at={[x + 112, py + 14]} text={p.label} size={9} />
          </g>
        );
      })}
    </g>
  );
  const parts = (ids: DrawingIds, wide: boolean) => {
    const keyAt: [number, number] = [14, 14];
    const scriptAt: [number, number] = wide ? [318, 14] : [14, 110];
    return (
      <>
        {stack(ids, keyAt[0], keyAt[1], "KEY PATH · 1 ITEM", [{ role: "sig", label: `signature · ${sigBytes} B` }])}
        {stack(ids, scriptAt[0], scriptAt[1], "SCRIPT PATH · " + leafName(leaf.id).toUpperCase(), [
          { role: "hidden", label: "script inputs (not shown)" },
          { role: "plain", label: `script · ${scriptBytes} B` },
          { role: "hash", label: `control block · ${cbBytes} B` },
        ])}
        <Value at={[wide ? 318 : 14, wide ? 196 : 300]} text="AN ANNEX (FIRST BYTE 0x50) WOULD COME LAST" size={8} cls="k-value--muted" />
      </>
    );
  };
  return (
    <Responsive
      wide={<Drawing id="a07-wit-w" width={620} height={206} title="Two witnesses" desc={desc}>{parts(idsFor("a07-wit-w"), true)}</Drawing>}
      narrow={<Drawing id="a07-wit-n" width={330} height={310} title="Two witnesses" desc={desc}>{parts(idsFor("a07-wit-n"), false)}</Drawing>}
    />
  );
}
