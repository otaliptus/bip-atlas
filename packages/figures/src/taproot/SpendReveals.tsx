import { Boundary, Computer, Drawing, KeyGlyph, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedTaprootTreeFixture } from "../types";
import { storyLeaf } from "./treeLayout";

const short = (hex: string) => `${hex.slice(0, 8)}…`;
const leafName = (id: number) => `Leaf ${String.fromCharCode(65 + id)}`;

/**
 * taproot-reveals.v1 — static. What an observer of the chain sees of each
 * kind of spend of the same output. Nothing the spend does not publish is
 * drawn, so the drawing cannot leak the tree.
 */
export function SpendReveals({ fixture }: { fixture: DerivedTaprootTreeFixture }) {
  const d = fixture.derived;
  const leaf = storyLeaf(d.leaves);
  const m = leaf.path.length;
  if (!d.keySpend) throw new Error(`${fixture.id}: needs the published key-path spend`);
  const sigBytes = d.keySpend.signatureHex.length / 2;
  const desc =
    `Key path spend: the chain shows the output key Q (${d.outputKeyHex}) and a ${sigBytes}-byte signature; an observer cannot tell whether a script tree exists. ` +
    `Script path spend of ${leafName(leaf.id)}: the chain shows Q, the inputs the script consumes (for this script, a signature), the script itself, and the control block: a leaf version and parity byte, the internal key and ${m} sibling hashes, which reveal the leaf's depth (${m}) but not what the siblings are.`;
  const panel = (ids: DrawingIds, x: number, y: number, key: boolean) => (
    <g>
      <Value at={[x, y]} text={key ? "KEY PATH SPEND" : `SCRIPT PATH SPEND · ${leafName(leaf.id).toUpperCase()}`} size={9} cls="k-value--label" />
      <Boundary x={x + 196} y1={y + 12} y2={y + 156} label="chain" />
      <KeyGlyph at={[x, y + 24]} role="public" />
      <Value at={[x + 36, y + 34]} text={`Q ${short(d.outputKeyHex)}`} size={8.5} />
      {key ? (
        <>
          <rect class="k-outline k-mark--sig" x={x} y={y + 52} width="150" height="22" />
          <Value at={[x + 6, y + 67]} text={`signature · ${sigBytes} B`} size={8.5} cls="k-value--on" />
        </>
      ) : (
        <>
          <rect class="k-outline k-fill--plain k-dashed" x={x} y={y + 46} width="150" height="18" />
          <Value at={[x + 6, y + 59]} text="inputs (here a signature)" size={7.5} />
          <rect class="k-outline k-fill--plain" x={x} y={y + 68} width="150" height="18" />
          <Value at={[x + 6, y + 81]} text={leaf.scriptReading} size={7.5} />
          <rect class="k-outline k-fill--plain" x={x} y={y + 92} width="14" height="18" />
          <KeyGlyph at={[x + 20, y + 95]} role="public" scale={0.6} />
          <Value at={[x + 44, y + 105]} text="version · P" size={8} />
          {Array.from({ length: m }, (_, j) => (
            <g>
              <rect class="k-outline k-fill--hash" x={x + j * 76} y={y + 116} width="70" height="18" />
              <Value at={[x + j * 76 + 5, y + 129]} text={`e${j} · 32 B`} size={8} />
            </g>
          ))}
          <Value at={[x, y + 150]} text="LEAF OR SUBTREE? THE SPEND DOES NOT SAY" size={7.5} cls="k-value--muted" />
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
      wide={<Drawing id="a07-rev-w" width={620} height={178} title="What a spend gives away" desc={desc}>{panel(idsFor("a07-rev-w"), 14, 14, true)}{panel(idsFor("a07-rev-w"), 326, 14, false)}</Drawing>}
      narrow={<Drawing id="a07-rev-n" width={300} height={356} title="What a spend gives away" desc={desc}>{panel(idsFor("a07-rev-n"), 14, 14, true)}{panel(idsFor("a07-rev-n"), 14, 192, false)}</Drawing>}
    />
  );
}
