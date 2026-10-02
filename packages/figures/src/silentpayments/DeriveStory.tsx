import { Arrow, IsoBox, KeyGlyph, Lamp, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedSpFixture } from "../types";
import { Chip, kindOf, short } from "./common";

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
 * sp-derive-story.v1 — static. BIP 352's full derivation for one published
 * vector, frame by frame (the chapter's former worked example): the
 * address's two keys, the sum of the input keys, the input hash, the shared
 * secret reached from both sides, the first output, and the receiver's scan.
 * Secret keys are never drawn. Values from the tested model; exact ones in
 * the disclosure.
 */
export function DeriveStory({ fixture }: { fixture: DerivedSpFixture }) {
  const d = fixture.derived;
  if (!d.secretsAgree) throw new Error(`${fixture.id}: the storyboard needs a vector in which the receiver is paid`);
  const keys = d.inputs.filter((i) => i.pubkey);
  const s0 = d.steps.find((s) => s.k === 0);
  if (!s0 || !s0.matched) throw new Error(`${fixture.id}: the receiver must find P_0`);
  const stop = d.steps.find((s) => !s.matched);
  if (!stop) throw new Error(`${fixture.id}: the scan must stop`);
  const frames: Frame[] = [
    {
      note: `Bob's address carries two public keys: B_scan for finding payments and B_spend for spending them.`,
      desc: `The address ${d.receiver.address} decodes to B_scan ${d.receiver.Bscan} and B_spend ${d.receiver.Bspend}.`,
      draw: () => (
        <>
          <Value at={[14, 26]} text={`${d.receiver.address.slice(0, 14)}…`} size={9} />
          <KeyGlyph at={[14, 46]} role="public" scale={0.7} />
          <Value at={[40, 55]} text={`B_scan ${short(d.receiver.Bscan)}`} size={9} />
          <KeyGlyph at={[14, 72]} role="public" scale={0.7} />
          <Value at={[40, 81]} text={`B_spend ${short(d.receiver.Bspend)}`} size={9} />
        </>
      ),
    },
    {
      note: `Alice's eligible inputs each reveal a public key. Their sum is A; her secret a is the sum of their private keys.`,
      desc: `Input keys ${keys.map((i) => i.pubkey).join(" and ")} sum to A = ${d.A}.`,
      draw: (ids) => (
        <>
          {keys.map((i, k) => <Chip x={14} y={20 + k * 18} w={128} role="public" text={`${kindOf(i)} ${short(i.pubkey!)}`} />)}
          <Arrow d={`M146 ${28 + (keys.length - 1) * 9} H176`} ids={ids} />
          <Value at={[182, 25 + (keys.length - 1) * 9]} text="SUM" size={8.5} cls="k-value--label" />
          <Value at={[182, 38 + (keys.length - 1) * 9]} text={`A ${short(d.A)}`} size={9} />
          <Chip x={14} y={20 + keys.length * 18 + 8} w={128} role="secret" text="a = Σ aᵢ · no value" dashed />
        </>
      ),
    },
    {
      note: `The input hash: a tagged hash of the smallest outpoint and A, so a second payment from the same keys lands elsewhere.`,
      desc: `Smallest outpoint ${d.smallestOutpoint}; input_hash = ${d.inputHash}.`,
      draw: (ids) => (
        <>
          <Value at={[14, 34]} text={`outpoint ${short(d.smallestOutpoint)}`} size={8.5} />
          <Value at={[14, 52]} text={`A ${short(d.A)}`} size={8.5} />
          <Arrow d="M124 44 H138" ids={ids} />
          <Machine at={[160, 56]} w={52} d={26} h={24} label="hash" role="hash" />
          <Arrow d="M210 44 H220" ids={ids} />
          <HashCube x={226} y={34} label="input_hash" value={short(d.inputHash)} />
        </>
      ),
    },
    {
      note: `Alice computes input_hash·a·B_scan; Bob computes input_hash·b_scan·A. Both reach the same shared secret.`,
      desc: `The sender's shared secret ${d.senderSecret} equals the receiver's ${d.sharedSecret}.`,
      draw: () => (
        <>
          <Value at={[14, 26]} text="ALICE" size={8.5} cls="k-value--label" />
          <Value at={[14, 40]} text="input_hash·a·B_scan" size={8.5} />
          <Value at={[170, 26]} text="BOB" size={8.5} cls="k-value--label" />
          <Value at={[170, 40]} text="input_hash·b_scan·A" size={8.5} />
          <Chip x={14} y={56} w={126} role="secret" text={short(d.senderSecret)} />
          <Value at={[150, 67]} text="=" size={12} anchor="middle" />
          <Chip x={160} y={56} w={126} role="secret" text={short(d.sharedSecret)} />
          <Value at={[14, 92]} text="THE SHARED SECRET · KNOWN TO THESE TWO ONLY" size={8} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `t₀ is a tagged hash of the shared secret and k = 0; the output key is P₀ = B_spend + t₀·G, a taproot key.`,
      desc: `t_0 = ${s0.tk}; P_0 = ${s0.Pk}.`,
      draw: (ids) => (
        <>
          <HashCube x={32} y={30} label="t₀" value={short(s0.tk)} />
          <Arrow d="M128 46 H176" ids={ids} />
          <Value at={[152, 36]} text="B_spend + t₀·G" size={8} anchor="middle" cls="k-value--muted" />
          <KeyGlyph at={[184, 38]} role="public" scale={0.8} />
          <Value at={[214, 44]} text="P₀" size={9} cls="k-value--label" />
          <Value at={[214, 56]} text={short(s0.Pk)} size={9} />
        </>
      ),
    },
    {
      note: `Bob scans the transaction's taproot outputs: P₀ is there. He checks k = ${stop.k} next, finds nothing and stops.`,
      desc: `The transaction's outputs are ${d.txOutputs.map((o) => o.key).join(", ")}. P_0 matches; P_${stop.k} = ${stop.Pk} does not, so the scan stops.`,
      draw: () => (
        <>
          {d.txOutputs.map((o, k) => (
            <g>
              <Chip x={14} y={20 + k * 18} w={126} role="public" text={`output ${short(o.key)}`} />
            </g>
          ))}
          <Value at={[150, 31]} text={`k = 0 · P₀ ${short(s0.Pk)}`} size={8.5} />
          <Lamp at={[290, 27]} state="on" r={5} />
          <Value at={[150, 61]} text={`k = ${stop.k} · P${stop.k === 1 ? "₁" : `_${stop.k}`} ${short(stop.Pk)}`} size={8.5} />
          <Lamp at={[290, 57]} state="off" r={5} />
          <Value at={[150, 84]} text="NOT FOUND: STOP" size={8} cls="k-value--muted" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a15-derive" title={`One payment, vector “${d.comment}”`} width={300} height={110} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Address</dt><dd><code class="atlas-break">{d.receiver.address}</code></dd>
          <dt>B_scan</dt><dd><code class="atlas-break">{d.receiver.Bscan}</code></dd>
          <dt>B_spend</dt><dd><code class="atlas-break">{d.receiver.Bspend}</code></dd>
          {keys.map((i, k) => (<><dt>Input {k + 1} key ({kindOf(i)})</dt><dd><code class="atlas-break">{i.pubkey}</code></dd></>))}
          <dt>A</dt><dd><code class="atlas-break">{d.A}</code></dd>
          <dt>Smallest outpoint</dt><dd><code class="atlas-break">{d.smallestOutpoint}</code></dd>
          <dt>input_hash</dt><dd><code class="atlas-break">{d.inputHash}</code></dd>
          <dt>Shared secret</dt><dd><code class="atlas-break">{d.sharedSecret}</code></dd>
          <dt>t₀</dt><dd><code class="atlas-break">{s0.tk}</code></dd>
          <dt>P₀</dt><dd><code class="atlas-break">{s0.Pk}</code></dd>
          <dt>P{stop.k} (not found)</dt><dd><code class="atlas-break">{stop.Pk}</code></dd>
        </dl>
      </details>
    </>
  );
}
