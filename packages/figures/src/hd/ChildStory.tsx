import { Arrow, Bracket, Cells, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedBip32Fixture } from "../types";
import { hdNode, hmacParts } from "./HmacInputs";

const short = (hex: string) => `${hex.slice(0, 8)}…`;
const bytes = (hex: string) => hex.match(/.{2}/g)!;

function bar(x: number, y: number, w: number, role: string, text: string, h = 20) {
  return (
    <g>
      <rect class={`k-cell k-fill--${role}`} x={x} y={y} width={w} height={h} />
      <text class="k-value" x={x + 6} y={y + h / 2 + 3.4} style="font-size:9.5px">{text}</text>
    </g>
  );
}

/**
 * hd-child-story.v1 — static storyboard (the old worked example). One normal
 * step, m/0H → m/0H/1: the parent's three values, the HMAC keyed by its chain
 * code, the 64 bytes cut in half, and the child, which matches the vector.
 */
export function ChildStory({ fixture }: { fixture: DerivedBip32Fixture }) {
  const child = hdNode(fixture, "m/0H/1");
  const parent = hdNode(fixture, child.parentPath!);
  const childLine = child.vectorLine, parentLine = parent.vectorLine;
  if (childLine === null || parentLine === null) throw new Error(`${fixture.id}: the storyboard follows a published chain`);
  const parts = hmacParts(child, parent);
  const I = child.hmacOutHex!;
  if (I.slice(64) !== child.chainCodeHex) throw new Error(`${child.path}: I_R is not the child chain code`);
  const iL = I.slice(0, 64);
  const ib = bytes(I);
  const frames: Frame[] = [
    {
      note: `Start from ${parent.path}: its private key k, public key K and chain code c.`,
      desc: `Node ${parent.path} of BIP 32 test vector 1: private key k ${parent.privateKeyHex}, public key K ${parent.publicKeyHex}, chain code c ${parent.chainCodeHex}.`,
      draw: () => (
        <>
          <Value at={[14, 18]} text={`PARENT ${parent.path}`} size={9} cls="k-value--label" />
          {bar(14, 28, 272, "secret", `k  ${short(parent.privateKeyHex)}   private key`)}
          {bar(14, 56, 272, "public", `K  ${short(parent.publicKeyHex)}   public key`)}
          {bar(14, 84, 272, "public", `c  ${short(parent.chainCodeHex)}   chain code`)}
          <Value at={[14, 128]} text={`IN THE XPUB AND XPRV ON BIP 32 LINES ${parentLine + 1}–${parentLine + 2}`} size={9} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `Index ${child.indexLabel} is normal, so HMAC-SHA512, keyed by c, hashes K followed by ${child.childNumberHex}.`,
      desc: `HMAC-SHA512 with key c (${parent.chainCodeHex}) over the ${child.hmacDataHex!.length / 2} bytes ${child.hmacDataHex}: the public key K followed by the index ${child.childNumberHex}.`,
      draw: (ids) => (
        <>
          {bar(14, 14, 186, "public", `K  ${short(parts[0].hex)}`)}
          {bar(200, 14, 70, "plain", child.childNumberHex)}
          <Value at={[14, 46]} text="DATA" size={9} cls="k-value--muted" />
          <Arrow d="M120 36 V64" ids={ids} />
          <Machine at={[92, 94]} w={88} d={30} h={24} label="HMAC-SHA512" />
          {bar(204, 88, 84, "public", `c ${parent.chainCodeHex.slice(0, 6)}…`, 18)}
          <Value at={[204, 120]} text="KEY" size={9} cls="k-value--muted" />
          <Arrow d="M204 97 H172" ids={ids} />
        </>
      ),
    },
    {
      note: `Out come 64 bytes, I. Cut them in half: I_L and I_R.`,
      desc: `The HMAC output I is ${I}. Its left 32 bytes are I_L, ${iL}; its right 32 bytes are I_R, ${I.slice(64)}.`,
      draw: () => (
        <>
          <Value at={[22, 14]} text={`I · ${ib.length} BYTES`} size={9} cls="k-value--label" />
          <Cells x={22} y={22} values={ib.slice(0, 32)} size={14} perRow={8} rowGap={0} roleOf={() => "hash"} />
          <Cells x={166} y={22} values={ib.slice(32)} size={14} perRow={8} rowGap={0} roleOf={() => "hash"} />
          <line class="k-cut" x1="150" y1="18" x2="150" y2="82" />
          <Bracket x1={22} x2={134} y={82} text="I_L" />
          <Bracket x1={166} x2={278} y={82} text="I_R" />
        </>
      ),
    },
    {
      note: `The child: k′ = I_L + k (mod n), c′ = I_R. That is ${child.path}, exactly as BIP 32 lists it.`,
      desc: `The child private key is I_L plus k modulo the curve order: ${child.privateKeyHex}. The child chain code is I_R: ${child.chainCodeHex}. Together they serialize to ${child.xprv}, listed on BIP 32 line ${childLine + 2}.`,
      draw: () => (
        <>
          {bar(14, 14, 128, "hash", `I_L ${iL.slice(0, 6)}…`)}
          <Value at={[150, 28]} text="+" anchor="middle" size={12} />
          {bar(158, 14, 128, "secret", `k ${parent.privateKeyHex.slice(0, 6)}…`)}
          <Value at={[14, 52]} text="= (mod n)" size={9} cls="k-value--muted" />
          {bar(14, 58, 272, "secret", `k′  ${short(child.privateKeyHex)}   ${child.path} private key`)}
          {bar(14, 92, 272, "public", `c′  ${short(child.chainCodeHex)}   = I_R, chain code`)}
          <Value at={[14, 132]} text={`MATCHES BIP 32 LINE ${childLine + 2}`} size={9} cls="k-value--muted" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a02-child" title={`One step: ${parent.path} to ${child.path}`} width={300} height={146} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values, step by step</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Parent {parent.path}: private key k</dt><dd><code class="atlas-break">{parent.privateKeyHex}</code></dd>
          <dt>Public key K</dt><dd><code class="atlas-break">{parent.publicKeyHex}</code></dd>
          <dt>Chain code c</dt><dd><code class="atlas-break">{parent.chainCodeHex}</code></dd>
          <dt>HMAC data K ‖ i</dt><dd><code class="atlas-break">{child.hmacDataHex}</code></dd>
          <dt>HMAC-SHA512 output I</dt><dd><code class="atlas-break">{I}</code></dd>
          <dt>Child {child.path}: private key k′</dt><dd><code class="atlas-break">{child.privateKeyHex}</code></dd>
          <dt>Chain code c′</dt><dd><code class="atlas-break">{child.chainCodeHex}</code></dd>
          <dt>xprv (BIP 32 line {childLine + 2})</dt><dd><code class="atlas-break">{child.xprv}</code></dd>
        </dl>
      </details>
    </>
  );
}
