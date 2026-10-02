import { Arrow, Bracket, Cells, KeyGlyph, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedWalletPathFixture } from "../types";

const short = (s: string, n = 8) => `${s.slice(0, n)}…`;

function bar(x: number, y: number, w: number, role: string, text: string, h = 20) {
  return (
    <g>
      <rect class={`k-cell k-fill--${role}`} x={x} y={y} width={w} height={h} />
      <text class="k-value" x={x + 6} y={y + h / 2 + 3.4} style="font-size:9.5px">{text}</text>
    </g>
  );
}

/**
 * wallet-p2tr-story.v1 — static storyboard (the old worked example). BIP 86's
 * last step for its first receiving path: the derived key loses its first
 * byte to become the internal key, is tweaked with no script tree, and the
 * output key goes into a version 1 output. Every value was checked against
 * BIP 86's published vector at build time.
 */
export function WalletP2trStory({ fixture }: { fixture: DerivedWalletPathFixture }) {
  const a = fixture.derived.addresses[0];
  const o = a.output;
  if (!o || o.kind !== "p2tr") throw new Error(`${fixture.id}: wallet-p2tr-story.v1 needs a BIP 86 output`);
  if (a.publicKeyHex.slice(2) !== o.internalKeyHex || o.scriptPubKeyHex !== `5120${o.outputKeyHex}`) throw new Error(`${fixture.id}: P2TR output does not follow from the key`);
  const L = fixture.addresses[0].lines;
  const prefix = a.publicKeyHex.slice(0, 2);
  const keyBytes = a.publicKeyHex.match(/../g)!;
  const frames: Frame[] = [
    {
      note: `The walk ends at ${a.path.replace(/'/g, "′")}: a 33-byte compressed public key.`,
      desc: `The public key at ${a.path} is ${a.publicKeyHex}: a first byte ${prefix} that records the parity of y, then the 32-byte x coordinate.`,
      draw: () => (
        <>
          <KeyGlyph at={[14, 14]} role="public" />
          <Value at={[52, 24]} text={`KEY AT ${a.path.replace(/'/g, "′")}`} size={9} cls="k-value--label" />
          <Cells x={14} y={46} values={keyBytes.slice(0, 11)} size={16} roleOf={(i) => (i === 0 ? "plain" : "public")} />
          <Value at={[14 + 11 * 16 + 4, 58]} text="…" size={10} />
          <Bracket x1={14} x2={30} y={66} text="parity" align="start" />
          <Bracket x1={32} x2={290} y={66} text="x coordinate · 32 B" />
        </>
      ),
    },
    {
      note: "Drop the first byte: the x coordinate alone is the internal key P (lift_x takes the even-y point).",
      desc: `The internal key P is the x coordinate, ${o.internalKeyHex}. The first byte, ${prefix}, is dropped.`,
      draw: () => (
        <>
          <rect class="k-cell k-fill--plain k-dashed" x="14" y="20" width="16" height="16" />
          <line class="k-leader" x1="12" y1="38" x2="32" y2="18" />
          <Value at={[22, 52]} text={prefix} anchor="middle" size={9} cls="k-value--muted" />
          {bar(40, 18, 250, "public", `P  ${short(o.internalKeyHex, 16)}`)}
          <Value at={[40, 62]} text="INTERNAL KEY · 32 B · X-ONLY" size={9} cls="k-value--label" />
        </>
      ),
    },
    {
      note: "Tweak it with a hash of P alone, no script tree: t, then Q = P + t·G.",
      desc: `The TapTweak hash of P with no script tree gives t = ${o.tweakHex}. The output key is Q = P + t·G = ${o.outputKeyHex}.`,
      draw: (ids) => (
        <>
          {bar(14, 6, 120, "public", `P  ${short(o.internalKeyHex, 6)}`)}
          <Arrow d="M74 28 V40" ids={ids} />
          <Machine at={[60, 66]} w={70} d={30} h={22} label="TapTweak" role="hash" />
          <Arrow d="M112 92 H136" ids={ids} />
          <Value at={[140, 96]} text={`t ${short(o.tweakHex, 6)}`} size={9.5} cls="k-value--hash" />
          {bar(140, 106, 150, "public", `Q = P + t·G ${short(o.outputKeyHex, 6)}`)}
          <Value at={[14, 136]} text="NO SCRIPT TREE: P ONLY" size={9} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `The output script is 5120 followed by Q, written as a bech32m address. It matches BIP 86 (line ${L.address}).`,
      desc: `The scriptPubKey is ${o.scriptPubKeyHex}: OP_1, a 32-byte push, and Q. As a bech32m address: ${o.address}, as published on BIP 86 line ${L.address}.`,
      draw: () => (
        <>
          {bar(14, 14, 34, "plain", "51")}
          {bar(48, 14, 34, "plain", "20")}
          {bar(82, 14, 208, "public", `Q  ${short(o.outputKeyHex, 12)}`)}
          <Bracket x1={14} x2={48} y={36} text="op_1" align="start" />
          <Bracket x1={48} x2={82} y={36} text="32 b" align="start" />
          {bar(14, 82, 276, "plain", short(o.address, 26))}
          <Value at={[14, 122]} text={`BECH32M · MATCHES BIP 86 LINE ${L.address}`} size={9} cls="k-value--label" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a12-p2tr" title="From key to Taproot address" width={300} height={144} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values, step by step</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Public key at {a.path}</dt><dd><code class="atlas-break">{a.publicKeyHex}</code></dd>
          <dt>Internal key P</dt><dd><code class="atlas-break">{o.internalKeyHex}</code></dd>
          <dt>Tweak t</dt><dd><code class="atlas-break">{o.tweakHex}</code></dd>
          <dt>Output key Q</dt><dd><code class="atlas-break">{o.outputKeyHex}</code></dd>
          <dt>scriptPubKey</dt><dd><code class="atlas-break">{o.scriptPubKeyHex}</code></dd>
          <dt>Address (BIP 86 line {L.address})</dt><dd><code class="atlas-break">{o.address}</code></dd>
        </dl>
      </details>
    </>
  );
}
