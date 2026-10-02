import { Arrow, KeyGlyph, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedBip32Fixture } from "../types";
import { hdNode } from "./HmacInputs";

const short = (hex: string) => `${hex.slice(0, 8)}…`;

function bar(x: number, y: number, w: number, role: string, text: string, h = 20) {
  return (
    <g>
      <rect class={`k-cell k-fill--${role}`} x={x} y={y} width={w} height={h} />
      <text class="k-value" x={x + 6} y={y + h / 2 + 3.4} style="font-size:9.5px">{text}</text>
    </g>
  );
}

/**
 * hd-weakness-story.v1 — static storyboard. BIP 32's stated weakness,
 * recomputed on test vector 1: the parent's extended public key plus one
 * leaked normal child's private key give back the parent's private key. The
 * build throws unless the recovered key equals the real one (derive.ts).
 */
export function WeaknessStory({ fixture }: { fixture: DerivedBip32Fixture }) {
  const r = fixture.derived.recovery;
  const parent = hdNode(fixture, r.parentPath);
  const child = hdNode(fixture, r.childPath);
  if (r.recoveredHex !== parent.privateKeyHex) throw new Error(`${fixture.id}: recovery does not match ${parent.path}`);
  if (!parent.hardened || !parent.parentPath) throw new Error(`${fixture.id}: the storyboard needs a hardened parent to show where the climb stops`);
  const grand = parent.parentPath;
  const frames: Frame[] = [
    {
      note: `Someone holds ${parent.path}’s extended public key, and the private key of its normal child ${child.path} has leaked.`,
      desc: `Known: the extended public key of ${parent.path}, public key ${parent.publicKeyHex} and chain code ${parent.chainCodeHex}. Leaked: the private key of ${child.path}, ${child.privateKeyHex}.`,
      draw: () => (
        <>
          <Value at={[14, 16]} text={`XPUB OF ${parent.path}`} size={9} cls="k-value--label" />
          {bar(14, 24, 200, "public", `K  ${short(parent.publicKeyHex)}`)}
          {bar(14, 48, 200, "public", `c  ${short(parent.chainCodeHex)}`)}
          <Value at={[14, 92]} text={`LEAKED · ${child.path}`} size={9} cls="k-value--label" />
          {bar(14, 100, 200, "secret", `k₁  ${short(child.privateKeyHex)}`)}
          <KeyGlyph at={[236, 104]} role="secret" />
        </>
      ),
    },
    {
      note: `The xpub alone is enough to recompute I_L for child ${child.indexLabel}: the HMAC input is public.`,
      desc: `HMAC-SHA512 keyed by the chain code over the public key and index ${child.childNumberHex} gives I_L = ${r.iLHex}. No private key is needed.`,
      draw: (ids) => (
        <>
          {bar(14, 8, 132, "public", `K ‖ ${child.childNumberHex}`)}
          {bar(166, 8, 120, "public", "c (HMAC key)")}
          <Arrow d="M80 30 V44 H110" ids={ids} />
          <Arrow d="M226 30 V44 H196" ids={ids} />
          <Machine at={[124, 72]} w={88} d={30} h={24} label="HMAC-SHA512" />
          <Arrow d="M190 112 H210" ids={ids} />
          {bar(212, 102, 80, "hash", `I_L ${r.iLHex.slice(0, 5)}…`)}
        </>
      ),
    },
    {
      note: "Subtract: k = k₁ − I_L (mod n).",
      desc: `${child.privateKeyHex} minus ${r.iLHex}, modulo the curve order, is ${r.recoveredHex}.`,
      draw: () => (
        <>
          {bar(14, 20, 128, "secret", `k₁ ${child.privateKeyHex.slice(0, 6)}…`)}
          <Value at={[150, 34]} text="−" anchor="middle" size={12} />
          {bar(158, 20, 128, "hash", `I_L ${r.iLHex.slice(0, 6)}…`)}
          <Value at={[14, 66]} text="= (mod n)" size={9} cls="k-value--muted" />
          {bar(14, 74, 272, "secret", `k  ${short(r.recoveredHex)}`)}
          <Value at={[14, 118]} text={`= THE PRIVATE KEY OF ${parent.path}`} size={9} cls="k-value--label" />
        </>
      ),
    },
    {
      note: `That is ${parent.path}’s private key, and with c every key below it. The hardened edge above ${parent.path} stops the climb.`,
      desc: `The recovered key equals the private key of ${parent.path}, so everything below ${parent.path} is exposed. ${grand}'s key cannot be recovered the same way: ${parent.path} is a hardened child, and its HMAC input contains ${grand}'s private key.`,
      draw: (ids) => (
        <>
          <rect class="k-outline" x="135" y="8" width="30" height="14" style={`fill:${ids.hatch}`} />
          <Value at={[172, 19]} text={`${grand} · SAFE`} size={9} />
          <line class="k-line" x1="148.4" y1="24" x2="148.4" y2="56" />
          <line class="k-line" x1="151.6" y1="24" x2="151.6" y2="56" />
          <rect class="k-outline k-mark--plain" x="142" y="36" width="16" height="8" />
          <Value at={[166, 44]} text="HARDENED: STOPS HERE" size={8} cls="k-value--label" />
          <KeyGlyph at={[135, 58]} role="secret" />
          <Value at={[172, 68]} text={`${parent.path} · RECOVERED`} size={9} />
          <line class="k-line" x1="150" y1="74" x2="96" y2="104" />
          <line class="k-line" x1="150" y1="74" x2="204" y2="104" />
          <KeyGlyph at={[81, 106]} role="secret" />
          <KeyGlyph at={[189, 106]} role="secret" />
          <Value at={[150, 140]} text="AND EVERYTHING BELOW IT" anchor="middle" size={8.5} cls="k-value--label" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a02-weak" title="An xpub plus one leaked child key" width={300} height={146} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>xpub of {parent.path} (BIP 32 line {parent.vectorLine! + 1})</dt><dd><code class="atlas-break">{parent.xpub}</code></dd>
          <dt>Leaked private key of {child.path}</dt><dd><code class="atlas-break">{child.privateKeyHex}</code></dd>
          <dt>I_L, from the xpub alone</dt><dd><code class="atlas-break">{r.iLHex}</code></dd>
          <dt>Recovered private key of {parent.path}</dt><dd><code class="atlas-break">{r.recoveredHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
