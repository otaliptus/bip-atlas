import { Arrow, Drawing, KeyGlyph, Value, idsFor } from "../kit";
import type { DerivedBip32Fixture } from "../types";
import { hdNode } from "./HmacInputs";

const short = (hex: string) => `${hex.slice(0, 8)}…`;

function bar(x: number, y: number, w: number, role: string, text: string) {
  return (
    <g>
      <rect class={`k-cell k-fill--${role}`} x={x} y={y} width={w} height={20} />
      <text class="k-value" x={x + 6} y={y + 13.4} style="font-size:9.5px">{text}</text>
    </g>
  );
}

/**
 * hd-two-routes.v1 — static. A normal child's public key by two routes:
 * CKDpriv adds I_L to the private key and takes its point; CKDpub adds the
 * point of I_L to the public key. The build checks that both routes give the
 * same key (derive.ts throws otherwise).
 */
export function TwoRoutes({ fixture }: { fixture: DerivedBip32Fixture }) {
  const child = hdNode(fixture, "m/0H/1");
  const parent = hdNode(fixture, child.parentPath!);
  if (child.hardened || !child.hmacOutHex) throw new Error(`${child.path}: two routes exist only for a normal child`);
  const iL = child.hmacOutHex.slice(0, 64);
  const ids = idsFor("a02-routes");
  const desc =
    `Both routes start from the same HMAC output for child ${child.path}: I_L = ${iL}. ` +
    `With the private key of ${parent.path} (${parent.privateKeyHex}): k′ = I_L + k mod n = ${child.privateKeyHex}, and its point is the public key. ` +
    `With only the extended public key of ${parent.path} (K = ${parent.publicKeyHex}): K′ = point(I_L) + K. ` +
    `Both give the same public key, ${child.publicKeyHex}.`;
  return (
    <>
      <Drawing id="a02-routes" width={344} height={268} title="Two routes, one child" desc={desc}>
        <Value at={[14, 14]} text={`ONE HMAC, ONE I_L · ${parent.path} → ${child.path}`} size={9} cls="k-value--label" />
        {bar(14, 22, 316, "hash", `I_L  ${short(iL)}   from HMAC-SHA512(c, K ‖ i)`)}
        <Arrow d="M89 44 V62" ids={ids} />
        <Arrow d="M255 44 V62" ids={ids} />
        <Value at={[14, 78]} text="CKDpriv · HOLDS k" size={9} cls="k-value--label" />
        <Value at={[180, 78]} text="CKDpub · HOLDS ONLY K, c" size={9} cls="k-value--label" />
        {bar(14, 86, 150, "secret", `+ k  ${short(parent.privateKeyHex)}`)}
        {bar(14, 114, 150, "secret", `= k′ ${short(child.privateKeyHex)}`)}
        <Arrow d="M89 134 V144" ids={ids} />
        <rect class="k-outline k-fill--plain" x="44" y="146" width="90" height="18" />
        <Value at={[89, 158.5]} text="point( )" anchor="middle" size={9} />
        {bar(180, 86, 150, "public", "point(I_L)")}
        {bar(180, 114, 150, "public", `+ K  ${short(parent.publicKeyHex)}`)}
        <Arrow d="M89 164 V192 H150" ids={ids} />
        <Arrow d="M255 134 V192 H194" ids={ids} />
        <KeyGlyph at={[157, 186]} role="public" />
        <Value at={[172, 220]} text={`K′  ${short(child.publicKeyHex)}`} anchor="middle" size={10} />
        <Value at={[172, 236]} text="THE SAME PUBLIC KEY BOTH WAYS" anchor="middle" size={9} cls="k-value--label" />
        <Value at={[172, 252]} text="THE BUILD CHECKS EVERY NORMAL CHILD IN THE TREE" anchor="middle" size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>I_L</dt><dd><code class="atlas-break">{iL}</code></dd>
          <dt>k of {parent.path}</dt><dd><code class="atlas-break">{parent.privateKeyHex}</code></dd>
          <dt>K of {parent.path}</dt><dd><code class="atlas-break">{parent.publicKeyHex}</code></dd>
          <dt>k′ of {child.path}</dt><dd><code class="atlas-break">{child.privateKeyHex}</code></dd>
          <dt>K′ of {child.path}, by both routes</dt><dd><code class="atlas-break">{child.publicKeyHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
