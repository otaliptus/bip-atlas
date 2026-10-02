import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Arrow, Drawing, IsoBox, KeyGlyph, Machine, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedTaprootTreeFixture, TaprootLeafView } from "../types";
import { layoutTree, seenMap, type Seen } from "./treeLayout";

type Path = "key" | "script";
type View = "wallet" | "proof";

interface Props {
  fixture: DerivedTaprootTreeFixture;
  figureId: string;
  /** Starting state; the no-JS render uses it too. Defaults to the script path for leaf B, everything shown. */
  initial?: { path: Path; leafId: number; view: View };
}

const short = (hex: string) => `${hex.slice(0, 8)}…`;
const leafName = (id: number) => `Leaf ${String.fromCharCode(65 + id)}`;

/**
 * taproot-commitment.v1 — the Taproot chapter's hero (drawing-first).
 *
 * One published BIP 341 tree, recomputed and checked at build time. The
 * drawing shows the output key Q, the tweak, the script tree and the witness.
 * "Only the proof" draws only what a spend reveals: for the key path just Q
 * and a signature; for the script path the chosen leaf, the hashes the
 * verifier recomputes and each sibling as one opaque hash. Anything else is
 * not drawn at all, so the drawing cannot leak the tree's shape.
 */
export function TaprootCommitment({ fixture, figureId, initial }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const d = fixture.derived;
  const start = initial ?? { path: "script" as Path, leafId: d.leaves[d.leaves.length > 1 ? 1 : 0]?.id ?? 0, view: "wallet" as View };
  const [path, setPath] = useState<Path>(start.path);
  const [leafId, setLeafId] = useState(start.leafId);
  const [view, setView] = useState<View>(start.view);
  const leaf: TaprootLeafView = d.leaves.find((l) => l.id === leafId) ?? d.leaves[0];
  const proof = view === "proof";
  const seen = d.root ? seenMap(d.root, path, leaf.id, proof) : new Map<string, Seen>();
  const keyOnlyView = path === "key" && proof;
  const sig = d.keySpend?.signatureHex ?? "";
  const scriptBytes = leaf.scriptHex.length / 2;
  const cbBytes = leaf.controlBlockHex.length / 2;
  const m = leaf.path.length;

  const status =
    path === "key"
      ? `Key path: the witness is one ${sig.length / 2}-byte signature for Q. ${proof ? "Nothing about the internal key or the tree is revealed." : "The wallet knows the whole tree; the spend shows none of it."}`
      : `${leafName(leaf.id)}: the witness carries its script (${scriptBytes} bytes) and a ${cbBytes}-byte control block with ${m} sibling hash${m === 1 ? "" : "es"}; the verifier recomputes ${m} hash${m === 1 ? "" : "es"} up to the root, then the tweak, and checks Q.`;

  const describe = () => {
    if (keyOnlyView) return `What a key-path spend shows: the output key Q, ${d.outputKeyHex}, and a ${sig.length / 2}-byte signature. No internal key and no tree.`;
    const drawn = [...seen.entries()].filter(([, s]) => s !== "absent").length;
    return `Output key Q ${d.outputKeyHex}, made from internal key P ${d.internalKeyHex} tweaked by the Merkle root. ${proof ? `Only the proof is drawn: ${drawn} tree nodes.` : `The whole tree is drawn: ${d.leaves.map((l) => `${leafName(l.id)}, ${l.scriptReading}`).join("; ")}.`} ${status}`;
  };

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const W = wide ? 640 : 330;
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const cx = W / 2;
    const cardW = wide ? 134 : 80;
    const treeTop = 196, levelH = 72;
    const placed = d.root ? layoutTree(d.root, W - (wide ? 80 : 50), levelH) : [];
    const rootX = placed.find((n) => n.parent === null)?.x ?? 0;
    const off = cx - rootX;
    const at = (hash: string) => {
      const n = placed.find((p) => p.hash === hash)!;
      return { x: n.x + off, y: treeTop + n.y, n };
    };
    const maxDepth = Math.max(0, ...placed.map((p) => p.depth));
    const stripY = keyOnlyView ? 150 : treeTop + maxDepth * levelH + 82;
    const H = stripY + 74;
    return (
      <Drawing id={id} width={W} height={H} title="One output, several ways to spend" desc={describe()}>
        {/* Output key Q */}
        <KeyGlyph at={[cx - 15, 8]} role="public" />
        <Value at={[cx + 24, 16]} text="OUTPUT KEY Q" size={8.5} cls="k-value--label" />
        <Value at={[cx + 24, 28]} text={short(d.outputKeyHex)} size={9.5} />
        {keyOnlyView ? (
          <>
            <rect class="k-outline k-mark--sig" x={cx - 60} y={60} width="120" height="26" />
            <Value at={[cx, 77]} text={`SIGNATURE · ${sig.length / 2} B`} size={9} anchor="middle" cls="k-value--on" />
            <Arrow d={`M${cx} 58 V32`} ids={ids} />
            <Value at={[cx, 118]} text="THE SPEND SHOWS NO TREE AND NO INTERNAL KEY" size={wide ? 9 : 8} anchor="middle" cls="k-value--muted" />
          </>
        ) : (
          <>
            <Arrow d={`M${cx} 66 V34`} ids={ids} />
            <Value at={[cx + 8, 54]} text="P + t·G" size={9} />
            <Machine at={[cx - 28, 102]} w={64} d={34} h={26} label="TapTweak" sub="hash" role="hash" />
            <KeyGlyph at={[wide ? cx - 190 : 14, 88]} role="public" />
            <Value at={[wide ? cx - 190 : 14, 116]} text="INTERNAL KEY P" size={8.5} cls="k-value--label" />
            <Value at={[wide ? cx - 190 : 14, 128]} text={short(d.internalKeyHex)} size={9.5} />
            <Arrow d={`M${wide ? cx - 156 : 48} 94 H${cx - 62}`} ids={ids} />
            {d.root ? <Arrow d={`M${cx} ${treeTop - 16} V${150}`} ids={ids} /> : null}
          </>
        )}
        {/* Edges, drawn only between drawn nodes */}
        {placed.map((n) => {
          if (!n.parent) return null;
          const s = seen.get(n.hash)!, ps = seen.get(n.parent)!;
          if (s === "absent" || ps === "absent") return null;
          const a = at(n.parent), b = at(n.hash);
          return <line class={`k-leader${s === "sibling" ? " k-dashed" : ""}`} x1={a.x} y1={a.y + 24} x2={b.x} y2={b.y - 14} />;
        })}
        {/* Nodes */}
        {placed.map((n) => {
          const s = seen.get(n.hash)!;
          if (s === "absent") return null;
          const { x, y } = at(n.hash);
          const l = n.leaf !== null ? d.leaves.find((v) => v.id === n.leaf)! : null;
          const isRoot = n.parent === null;
          if (l && !(proof && s === "sibling")) {
            // A leaf drawn as a script card.
            return (
              <g class="k-leafcard" data-seen={s}>
                <rect class={`k-outline k-fill--plain${s === "revealed" ? " k-cell--em" : ""}`} x={x - cardW / 2} y={y - 14} width={cardW} height={42} />
                <Value at={[x - cardW / 2 + 6, y]} text={leafName(l.id).toUpperCase()} size={8.5} cls="k-value--label" />
                <Value at={[x - cardW / 2 + 6, y + 12]} text={wide ? l.scriptReading : l.scriptReading.split(" ")[0]} size={wide ? 8 : 7.5} />
                {wide ? null : <Value at={[x - cardW / 2 + 6, y + 22]} text={l.scriptReading.split(" ").slice(1).join(" ")} size={7.5} />}
                {s === "revealed" ? (
                  <>
                    <rect class="k-outline k-mark--sig" x={x - cardW / 2} y={y + 28} width={cardW} height="12" />
                    <Value at={[x, y + 37]} text="IN THE WITNESS" size={7.5} anchor="middle" cls="k-value--on" />
                  </>
                ) : s === "sibling" ? (
                  <Value at={[x - cardW / 2, y + 40]} text={wide ? `HASH IN PROOF · ${short(l.leafHash)}` : `HASH ${short(l.leafHash)}`} size={7.5} cls="k-value--hash" />
                ) : null}
              </g>
            );
          }
          // A hash drawn as a cube: root, branch, or an opaque sibling in the proof view.
          const role = s === "known" ? "plain" : "hash";
          const label = s === "sibling" ? (proof ? "LEAF OR SUBTREE?" : "SIBLING") : s === "recomputed" ? (isRoot ? "ROOT · RECOMPUTED" : "RECOMPUTED") : isRoot ? "MERKLE ROOT" : "TAPBRANCH";
          return (
            <g class="k-hashnode" data-seen={s}>
              <IsoBox at={[x, y + 10]} w={22} d={22} h={14} role={role} cls={s === "recomputed" ? "k-iso--dashed" : ""} />
              <Value at={[x + 24, y + 4]} text={label} size={7.5} cls="k-value--label" />
              {s === "sibling" ? <Value at={[x + 24, y + 15]} text={short(n.hash)} size={8} cls="k-value--hash" /> : null}
            </g>
          );
        })}
        {/* Witness strip */}
        <Value at={[24, stripY - 8]} text={path === "key" ? "WITNESS · KEY PATH · 1 ITEM" : `WITNESS · SCRIPT PATH · ${leafName(leaf.id).toUpperCase()}`} size={8.5} cls="k-value--label" />
        {path === "key" ? (
          <>
            <rect class="k-cell k-mark--sig" x="24" y={stripY} width={W - 48} height="22" />
            <Value at={[30, stripY + 15]} text={`signature · ${sig.length / 2} B`} size={9} cls="k-value--on" />
          </>
        ) : (
          witnessStrip(ids, 24, stripY, W - 48, scriptBytes, cbBytes, m, wide)
        )}
      </Drawing>
    );
  };

  const strip = (label: string, name: string, options: Array<{ value: string; text: string; disabled?: boolean }>, current: string, set: (v: string) => void) => (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label class="atlas-strip__opt" data-disabled={o.disabled ? "true" : undefined}>
          <input type="radio" name={`${figureId}-${name}`} checked={current === o.value} disabled={o.disabled} onChange={() => set(o.value)} />
          <span>{o.text}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          {strip("Spending path", "path", [{ value: "key", text: "Key path" }, { value: "script", text: "Script path" }], path, (v) => setPath(v as Path))}
          {strip("Leaf", "leaf", d.leaves.map((l) => ({ value: String(l.id), text: leafName(l.id), disabled: path === "key" })), String(leafId), (v) => setLeafId(Number(v)))}
          {strip("Show", "view", [{ value: "wallet", text: "Everything" }, { value: "proof", text: "Only the proof" }], view, (v) => setView(v as View))}
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the script path for {leafName(start.leafId)}, with the whole tree shown. With JavaScript you can switch to the key path, pick another leaf, and show only what the spend reveals.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this view</summary>
        <dl class="atlas-hexlist">
          <dt>Output key Q</dt><dd><code class="atlas-break">{d.outputKeyHex}</code></dd>
          {path === "key" ? (
            <>
              <dt>Signature (published key-path witness)</dt><dd><code class="atlas-break">{sig}</code></dd>
              {proof ? null : <><dt>Internal key P</dt><dd><code class="atlas-break">{d.internalKeyHex}</code></dd><dt>Merkle root</dt><dd><code class="atlas-break">{d.merkleRootHex}</code></dd></>}
            </>
          ) : (
            <>
              <dt>{leafName(leaf.id)} script</dt><dd><code class="atlas-break">{leaf.scriptHex}</code></dd>
              <dt>Control block</dt><dd><code class="atlas-break">{leaf.controlBlockHex}</code></dd>
              <dt>Internal key P (bytes 1–32 of the control block)</dt><dd><code class="atlas-break">{d.internalKeyHex}</code></dd>
            </>
          )}
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 341 wallet-test-vectors.json, {fixture.source.pointer}. Every hash, tweak and control block was recomputed and checked at build time.</p>
    </div>
  );
}

/** Script-path witness: inputs (not shown), the script, and the control block split into its parts. */
function witnessStrip(ids: DrawingIds, x: number, y: number, width: number, scriptBytes: number, cbBytes: number, m: number, wide: boolean) {
  const inputsW = wide ? 90 : 56;
  const rest = width - inputsW;
  const unit = rest / (scriptBytes + cbBytes);
  const parts: Array<{ w: number; role: string; label: string; style?: string }> = [
    { w: inputsW, role: "hidden", label: wide ? "script inputs" : "inputs", style: `fill:${ids.hatch}` },
    { w: scriptBytes * unit, role: "plain", label: `script ${scriptBytes} B` },
    { w: unit, role: "plain", label: "" },
    { w: 32 * unit, role: "public", label: "P 32 B" },
    ...Array.from({ length: m }, (_, j) => ({ w: 32 * unit, role: "hash", label: `e${j} 32 B` })),
  ];
  let cx = x;
  const cbStart = x + inputsW + scriptBytes * unit;
  return (
    <g class="k-witness">
      {parts.map((p) => {
        const px = cx;
        cx += p.w;
        return (
          <g>
            <rect class={`k-cell k-fill--${p.role}`} x={px} y={y} width={p.w} height="22" style={p.style} />
            {p.label && p.label.length * 5 + 6 < p.w ? <text class="k-value" x={px + 4} y={y + 14.5} style="font-size:8px">{p.label}</text> : null}
          </g>
        );
      })}
      <path class="k-leader" d={`M${cbStart} ${y + 26} V${y + 31} H${x + width} V${y + 26}`} />
      <text class="k-value k-value--label" x={(cbStart + x + width) / 2} y={y + 44} text-anchor="middle" style="font-size:8.5px">{`CONTROL BLOCK · 33 + 32 × ${m} = ${cbBytes} B`}</text>
    </g>
  );
}
