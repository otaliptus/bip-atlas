import { Arrow, Drawing, IsoBox, KeyGlyph, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedTaprootTreeFixture } from "../types";
import { storyLeaf } from "./treeLayout";

const short = (hex: string) => `${hex.slice(0, 8)}…`;

/** A small hash cube with its value beside it. */
function HashCube({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <g>
      <IsoBox at={[x, y + 10]} w={18} d={18} h={12} role="hash" />
      <Value at={[x + 20, y]} text={label} size={8} cls="k-value--label" />
      <Value at={[x + 20, y + 11]} text={short(value)} size={8.5} />
    </g>
  );
}

/**
 * taproot-verifier-story.v1 — static. The verifier's recomputation for one
 * leaf of a published vector, one frame per step of BIP 341's check:
 * control block length, leaf hash, each branch, the tweak, the output key.
 */
export function VerifierStory({ fixture }: { fixture: DerivedTaprootTreeFixture }) {
  const d = fixture.derived;
  const leaf = storyLeaf(d.leaves);
  const step = (id: string) => leaf.check.filter((s) => s.id === id);
  const [len] = step("length"), [lv] = step("leaf-version"), [lh] = step("leaf-hash"), [tw] = step("tweak"), [ok] = step("output-key"), [cmp] = step("compare");
  const branches = step("branch");
  const m = Number(len.values.m);
  const frames: Frame[] = [
    {
      note: `The control block is ${len.values.bytes} bytes: 33 + 32 × ${m}, so the leaf sits ${m} levels below the root.`,
      desc: `Control block of ${len.values.bytes} bytes: one byte of leaf version and parity, the 32-byte internal key, and ${m} 32-byte sibling hashes.`,
      draw: () => {
        const unit = 268 / Number(len.values.bytes);
        const parts = [{ w: 1, role: "plain", t: "" }, { w: 32, role: "public", t: "P" }, ...Array.from({ length: m }, (_, j) => ({ w: 32, role: "hash", t: `e${j}` }))];
        let x = 16;
        return (
          <>
            <Value at={[16, 40]} text={`CONTROL BLOCK · ${len.values.bytes} B`} size={8.5} cls="k-value--label" />
            {parts.map((p) => {
              const px = x;
              x += p.w * unit;
              return (
                <g>
                  <rect class={`k-cell k-fill--${p.role}`} x={px} y={50} width={p.w * unit} height="24" />
                  {p.t ? <Value at={[px + 5, 66]} text={p.t} size={9} /> : null}
                </g>
              );
            })}
            <Value at={[16, 96]} text={`LEAF VERSION ${lv.values.v} · PARITY BIT ${lv.values.parityBit}`} size={8.5} cls="k-value--muted" />
          </>
        );
      },
    },
    {
      note: `Hash the leaf version and script with TapLeaf: k0 = ${short(lh.values.k0)}`,
      desc: `TapLeaf hash of leaf version ${lv.values.v} and the script gives k0 = ${lh.values.k0}.`,
      draw: (ids) => (
        <>
          <rect class="k-outline k-fill--plain" x="12" y="38" width="96" height="42" />
          <Value at={[18, 52]} text="SCRIPT" size={8} cls="k-value--label" />
          <Value at={[18, 64]} text={leaf.scriptReading.split(" ").slice(0, 2).join(" ")} size={8} />
          <Value at={[18, 75]} text={leaf.scriptReading.split(" ").slice(2).join(" ")} size={8} />
          <Arrow d="M110 57 H126" ids={ids} />
          <Machine at={[152, 64]} w={52} d={28} h={22} label="TapLeaf" role="hash" />
          <Arrow d="M212 57 H222" ids={ids} />
          <HashCube x={232} y={46} label="k0" value={lh.values.k0} />
        </>
      ),
    },
    ...branches.map((b): Frame => ({
      note: `Branch ${Number(b.values.j) + 1}: join k with the sibling e, ${b.values.first === "k" ? "k" : "e"} first (sorted), with TapBranch.`,
      desc: `TapBranch of k = ${b.values.k} and sibling e = ${b.values.e}, the smaller first, gives ${b.values.next}.`,
      draw: (ids) => (
        <>
          <HashCube x={22} y={30} label={b.values.first === "k" ? "k (first)" : "k"} value={b.values.k} />
          <HashCube x={22} y={82} label={b.values.first === "e" ? `e${b.values.j} (first)` : `e${b.values.j}`} value={b.values.e} />
          <Arrow d="M118 52 H146" ids={ids} />
          <Arrow d="M118 100 H134 V74 H146" ids={ids} />
          <Machine at={[170, 70]} w={54} d={28} h={22} label="TapBranch" role="hash" />
          <Arrow d="M220 64 H226" ids={ids} />
          <HashCube x={232} y={52} label="next" value={b.values.next} />
        </>
      ),
    })),
    {
      note: `Hash P and the rebuilt root with TapTweak: t = ${short(tw.values.t)}`,
      desc: `TapTweak of the internal key P = ${d.internalKeyHex} and the rebuilt root ${tw.values.root} gives t = ${tw.values.t}.`,
      draw: (ids) => (
        <>
          <KeyGlyph at={[16, 38]} role="public" />
          <Value at={[16, 64]} text="P" size={9} cls="k-value--label" />
          <HashCube x={22} y={88} label="root" value={tw.values.root} />
          <Arrow d="M50 44 H140" ids={ids} />
          <Arrow d="M118 106 H134 V74 H146" ids={ids} />
          <Machine at={[170, 70]} w={54} d={28} h={22} label="TapTweak" role="hash" />
          <Value at={[150, 128]} text={`t = ${short(tw.values.t)}`} size={8.5} cls="k-value--hash" />
        </>
      ),
    },
    {
      note: `Q' = P + t·G has x = ${short(ok.values.x)}, the output key, and y ${ok.values.parity === "0" ? "even" : "odd"} (parity ${ok.values.parity}), matching the parity bit. ${cmp.ok ? "The spend's commitment holds." : ""}`,
      desc: `P + t·G has x coordinate ${ok.values.x}, equal to the output key ${cmp.values.q}, and y parity ${ok.values.parity}, equal to the control block's parity bit. The commitment check ${cmp.ok ? "passes" : "fails"}.`,
      draw: (ids) => (
        <>
          <KeyGlyph at={[16, 44]} role="public" />
          <Value at={[16, 70]} text="Q' = P + t·G" size={9} />
          <Value at={[16, 84]} text={short(ok.values.x)} size={8.5} />
          <Value at={[124, 56]} text="=" size={16} anchor="middle" />
          <Value at={[124, 70]} text="COMPARE" size={7} anchor="middle" cls="k-value--muted" />
          <KeyGlyph at={[150, 44]} role="public" />
          <Value at={[150, 70]} text="OUTPUT KEY Q" size={8.5} cls="k-value--label" />
          <Value at={[150, 84]} text={short(cmp.values.q)} size={8.5} />
          <Value at={[16, 120]} text={cmp.ok ? "✓ MATCH · PARITY " + ok.values.parity : "✗ NO MATCH"} size={9} cls={cmp.ok ? "k-value--ok" : "k-value--check"} />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a07-verify" title="Rebuilding the commitment" width={300} height={140} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values, step by step</summary>
        <dl class="atlas-hexlist">
          <dt>Control block ({len.values.bytes} bytes)</dt><dd><code class="atlas-break">{leaf.controlBlockHex}</code></dd>
          <dt>k0 = TapLeaf hash</dt><dd><code class="atlas-break">{lh.values.k0}</code></dd>
          {branches.map((b) => (
            <>
              <dt>Branch {Number(b.values.j) + 1}: k, e{b.values.j}, result</dt>
              <dd><code class="atlas-break">{b.values.k}</code><br /><code class="atlas-break">{b.values.e}</code><br /><code class="atlas-break">{b.values.next}</code></dd>
            </>
          ))}
          <dt>Internal key P</dt><dd><code class="atlas-break">{d.internalKeyHex}</code></dd>
          <dt>t = TapTweak hash</dt><dd><code class="atlas-break">{tw.values.t}</code></dd>
          <dt>x(Q') = output key</dt><dd><code class="atlas-break">{ok.values.x}</code></dd>
          <dt>Parity</dt><dd>{ok.values.parity} ({ok.values.parity === "0" ? "y even" : "y odd"})</dd>
        </dl>
      </details>
    </>
  );
}

export const VERIFIER_FRAME_IDS = ["length", "leaf-hash", "branch", "tweak", "output-key"];
