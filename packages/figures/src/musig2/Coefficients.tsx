import { Arrow, IsoBox, KeyGlyph, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedMusig2SessionFixture } from "../types";
import { ONE, short } from "./scene";

function HashCube({ x, y, label, value }: { x: number; y: number; label: string; value: string }) {
  return (
    <g>
      <IsoBox at={[x, y + 10]} w={18} d={18} h={12} role="hash" />
      <Value at={[x + 20, y]} text={label} size={8.5} cls="k-value--label" />
      <Value at={[x + 20, y + 12]} text={value} size={9} />
    </g>
  );
}

/**
 * musig2-coefficients.v1 — static. Where a key aggregation coefficient comes
 * from, in a published session: the whole key list hashed to L, then L and
 * one key hashed to that key's coefficient, while the second distinct key
 * simply gets 1. Values from the tested model; exact ones in the disclosure.
 */
export function Coefficients({ fixture }: { fixture: DerivedMusig2SessionFixture }) {
  const d = fixture.derived;
  const hashed = d.signers.findIndex((s) => !s.secondKey);
  const second = d.signers.findIndex((s) => s.secondKey);
  if (hashed < 0 || second < 0 || d.signers[second].coefficient !== ONE) throw new Error(`${fixture.id}: needs one hashed coefficient and a second key with coefficient 1`);
  const n = d.signers.length;
  const keys = d.signers.map((_, i) => `P${i + 1}`).join(" ‖ ");
  const frames: Frame[] = [
    {
      note: `Hash the whole key list, ${keys}, with the tag KeyAgg list: that gives L. Change any key, or the order, and L changes.`,
      desc: `The ${n} public keys in order, ${d.signers.map((s) => s.pubkey).join(", ")}, hashed with the tag "KeyAgg list", give L = ${d.keyListHash}.`,
      draw: (ids) => (
        <>
          {d.signers.map((s, i) => (
            <g>
              <KeyGlyph at={[14, 26 + i * 30]} role="public" scale={0.7} />
              <Value at={[40, 35 + i * 30]} text={`P${i + 1} ${short(s.pubkey)}`} size={8.5} />
            </g>
          ))}
          <Arrow d="M128 50 H142" ids={ids} />
          <Machine at={[160, 62]} w={54} d={26} h={26} label="hash" role="hash" />
          <Value at={[140, 104]} text="tag: KeyAgg list" size={8} cls="k-value--muted" />
          <Arrow d="M212 50 H222" ids={ids} />
          <HashCube x={226} y={40} label="L" value={short(d.keyListHash)} />
        </>
      ),
    },
    {
      note: `Signer ${hashed + 1}'s coefficient: hash L and its own key with the tag KeyAgg coefficient, reduced mod n.`,
      desc: `L and P${hashed + 1} hashed with the tag "KeyAgg coefficient" give a${hashed + 1} = ${d.signers[hashed].coefficient}.`,
      draw: (ids) => (
        <>
          <Value at={[14, 40]} text={`L ${short(d.keyListHash)}`} size={8.5} />
          <Value at={[14, 60]} text={`P${hashed + 1} ${short(d.signers[hashed].pubkey)}`} size={8.5} />
          <Arrow d="M118 50 H142" ids={ids} />
          <Machine at={[160, 62]} w={54} d={26} h={26} label="hash" role="hash" />
          <Value at={[140, 104]} text="tag: KeyAgg coefficient" size={8} cls="k-value--muted" />
          <Arrow d="M212 50 H222" ids={ids} />
          <HashCube x={226} y={40} label={`a${hashed + 1}`} value={short(d.signers[hashed].coefficient)} />
        </>
      ),
    },
    {
      note: `Signer ${second + 1} holds the second distinct key in the list, so its coefficient is simply 1: one point multiplication fewer.`,
      desc: `P${second + 1} is the second distinct key, so a${second + 1} = 1 without any hash.`,
      draw: () => (
        <>
          <KeyGlyph at={[14, 40]} role="public" scale={0.7} />
          <Value at={[40, 49]} text={`P${second + 1} ${short(d.signers[second].pubkey)}`} size={8.5} />
          <path class="k-leader k-dashed" d="M130 46 H230" />
          <Value at={[150, 40]} text="NO HASH" size={8} cls="k-value--muted" />
          <Value at={[238, 50]} text={`a${second + 1} = 1`} size={11} />
        </>
      ),
    },
    {
      note: `Q is the sum of each key times its coefficient: an ordinary 32-byte BIP 340 key.`,
      desc: `Q = ${d.signers.map((_, i) => `a${i + 1}·P${i + 1}`).join(" + ")}, with x-only key ${d.aggXonly}.`,
      draw: (ids) => (
        <>
          <Value at={[14, 50]} text={d.signers.map((s, i) => `${s.coefficient === ONE ? "1" : `a${i + 1}`}·P${i + 1}`).join(" + ")} size={11} />
          <Arrow d="M150 46 H230" ids={ids} />
          <KeyGlyph at={[238, 30]} role="public" scale={0.8} />
          <Value at={[238, 60]} text="Q" size={9} cls="k-value--label" />
          <Value at={[238, 72]} text={short(d.aggXonly)} size={9} />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a14-coef" title="Where a coefficient comes from" width={300} height={110} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {d.signers.map((s, i) => (<><dt>P{i + 1}</dt><dd><code class="atlas-break">{s.pubkey}</code></dd><dt>a{i + 1}</dt><dd><code class="atlas-break">{s.coefficient}</code></dd></>))}
          <dt>L</dt><dd><code class="atlas-break">{d.keyListHash}</code></dd>
          <dt>Q (x-only)</dt><dd><code class="atlas-break">{d.aggXonly}</code></dd>
        </dl>
      </details>
    </>
  );
}
