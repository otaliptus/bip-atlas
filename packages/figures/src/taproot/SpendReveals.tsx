import { Boundary, Computer, Drawing, KeyGlyph, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedTaprootTreeFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 8)}…`;
const leafName = (id: number) => `Leaf ${String.fromCharCode(65 + id)}`;

/**
 * taproot-reveals.v1 — static. What an observer of the chain sees of each
 * kind of spend of the same output. Nothing the spend does not publish is
 * drawn, so the drawing cannot leak the tree.
 */
export function SpendReveals({ fixture }: { fixture: DerivedTaprootTreeFixture }) {
  const d = fixture.derived;
  const leaf = d.leaves.find((l) => l.id === 1) ?? d.leaves[0];
  const m = leaf.path.length;
  const sigBytes = (d.keySpend?.signatureHex.length ?? 128) / 2;
  const desc =
    `Key path spend: the chain shows the output key Q (${d.outputKeyHex}) and a ${sigBytes}-byte signature; an observer cannot tell whether a script tree exists. ` +
    `Script path spend of ${leafName(leaf.id)}: the chain shows Q, that one script, the internal key and ${m} sibling hashes in the control block, which reveal the leaf's depth (${m}) but not what the siblings are.`;
  const panel = (ids: DrawingIds, x: number, y: number, key: boolean) => (
    <g>
      <Value at={[x, y]} text={key ? "KEY PATH SPEND" : `SCRIPT PATH SPEND · ${leafName(leaf.id).toUpperCase()}`} size={9} cls="k-value--label" />
      <Boundary x={x + 196} y1={y + 12} y2={y + 150} label="chain" />
      <KeyGlyph at={[x, y + 24]} role="public" />
      <Value at={[x + 36, y + 34]} text={`Q ${short(d.outputKeyHex)}`} size={8.5} />
      {key ? (
        <>
          <rect class="k-outline k-mark--sig" x={x} y={y + 52} width="150" height="22" />
          <Value at={[x + 6, y + 67]} text={`signature · ${sigBytes} B`} size={8.5} cls="k-value--on" />
        </>
      ) : (
        <>
          <rect class="k-outline k-fill--plain" x={x} y={y + 50} width="150" height="22" />
          <Value at={[x + 6, y + 65]} text={leaf.scriptReading} size={7.5} />
          <KeyGlyph at={[x, y + 84]} role="public" scale={0.7} />
          <Value at={[x + 28, y + 92]} text="internal key P" size={8} />
          {Array.from({ length: m }, (_, j) => (
            <g>
              <rect class="k-outline k-fill--hash" x={x + j * 76} y={y + 104} width="70" height="20" />
              <Value at={[x + j * 76 + 5, y + 118]} text={`e${j} · 32 B`} size={8} />
            </g>
          ))}
          <Value at={[x, y + 142]} text="LEAF OR SUBTREE? THE SPEND DOES NOT SAY" size={7.5} cls="k-value--muted" />
        </>
      )}
      <Computer at={[x + 214, y + 40]} label="observer" />
      <Value at={[x + 214, y + 100]} text={key ? "NO SIGN OF" : `DEPTH ${m}`} size={8} cls="k-value--label" />
      <Value at={[x + 214, y + 112]} text={key ? "A SCRIPT TREE" : "OTHER SCRIPTS"} size={8} cls="k-value--label" />
      <Value at={[x + 214, y + 124]} text={key ? "" : "UNSEEN"} size={8} cls="k-value--label" />
    </g>
  );
  return (
    <Responsive
      wide={<Drawing id="a07-rev-w" width={620} height={170} title="What a spend gives away" desc={desc}>{panel(idsFor("a07-rev-w"), 14, 14, true)}{panel(idsFor("a07-rev-w"), 326, 14, false)}</Drawing>}
      narrow={<Drawing id="a07-rev-n" width={300} height={340} title="What a spend gives away" desc={desc}>{panel(idsFor("a07-rev-n"), 14, 14, true)}{panel(idsFor("a07-rev-n"), 14, 184, false)}</Drawing>}
    />
  );
}
