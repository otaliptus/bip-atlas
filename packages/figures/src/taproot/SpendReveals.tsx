import { Drawing, KeyGlyph, Responsive, Value } from "../kit";
import type { DerivedTaprootTreeFixture } from "../types";
import { storyLeaf } from "./treeLayout";

/** Two spend receipts show disclosure, without drawing an unobserved tree. */
export function SpendReveals({ fixture }: { fixture: DerivedTaprootTreeFixture }) {
  const d = fixture.derived;
  const leaf = storyLeaf(d.leaves);
  if (!d.keySpend) throw new Error(`${fixture.id}: needs the published key-path spend`);
  const m = leaf.path.length;
  const desc = `The output key Q ${d.outputKeyHex} is already public. A key-path spend supplies a ${d.keySpend.signatureHex.length / 2}-byte signature and reveals no internal key or script tree. A script-path spend of leaf ${String.fromCharCode(65 + leaf.id)} supplies the script inputs, the chosen script and a control block containing the internal key, leaf version and parity, and ${m} sibling hashes. Its depth is ${m}; the other scripts are not revealed. Optional annexes are omitted from this illustration.`;
  const panel = (x: number, y: number, key: boolean) => <g transform={`translate(${x} ${y})`}>
    <Value at={[0, 14]} text={key ? "KEY PATH SPEND" : "SCRIPT PATH SPEND"} size={11} />
    <KeyGlyph at={[0, 31]} role="public" scale={0.75} />
    <Value at={[32, 39]} text={`Q ${d.outputKeyHex.slice(0, 12)}…`} size={10} />
    <Value at={[0, 58]} text="OUTPUT KEY: ALREADY PUBLIC" size={9} cls="k-value--muted" />
    <path class="k-outline k-fill--plain" d="M0 76 H290 V242 L280 238 L270 242 L260 238 L250 242 L240 238 L230 242 L220 238 L210 242 L200 238 L190 242 L180 238 L170 242 L160 238 L150 242 L140 238 L130 242 L120 238 L110 242 L100 238 L90 242 L80 238 L70 242 L60 238 L50 242 L40 238 L30 242 L20 238 L10 242 L0 238 Z" />
    <Value at={[14, 96]} text="ADDED WHEN SPENT" size={9} cls="k-value--muted" />
    {key ? <>
      <rect class="k-outline k-fill--sig" x="14" y="111" width="262" height="31" rx="3" />
      <Value at={[27, 131]} text={`signature · ${d.keySpend!.signatureHex.length / 2} B`} size={11} />
      <Value at={[14, 172]} text="No internal key." size={11} />
      <Value at={[14, 194]} text="No script." size={11} />
      <Value at={[14, 218]} text="No sign that a tree ever existed." size={10} />
    </> : <>
      <rect class="k-outline k-fill--sig" x="14" y="111" width="262" height="26" rx="3" />
      <Value at={[25, 128]} text="script inputs (here a signature)" size={9.5} />
      <rect class="k-outline k-fill--plain" x="14" y="145" width="262" height="30" rx="3" />
      <Value at={[25, 164]} text={leaf.scriptReading} size={9.5} />
      <rect class="k-outline k-fill--hash" x="14" y="183" width="262" height="42" rx="3" />
      <Value at={[25, 200]} text={`PROOF · internal key + ${m} sibling hashes`} size={9.5} />
      <Value at={[25, 216]} text="leaf version and parity included" size={9} />
    </>}
    <Value at={[0, 267]} text={key ? "SCRIPT TREE: UNKNOWN" : `DEPTH ${m} · OTHER SCRIPTS UNSEEN`} size={10} />
  </g>;
  return <>
    <Responsive
      wide={<Drawing id="a07-receipt-w" width={632} height={292} title="What reaches the blockchain" desc={desc}>{panel(12, 6, true)}{panel(330, 6, false)}</Drawing>}
      narrow={<Drawing id="a07-receipt-n" width={314} height={588} title="What reaches the blockchain" desc={desc}>{panel(12, 6, true)}{panel(12, 306, false)}</Drawing>}
    />
    <details class="atlas-disclosure">
      <summary>The output key and the revealed script proof</summary>
      <dl class="atlas-hexlist">
        <dt>Output key Q</dt><dd><code class="atlas-break">{d.outputKeyHex}</code></dd>
        <dt>Revealed script</dt><dd><code class="atlas-break">{leaf.scriptHex}</code></dd>
        <dt>Control block for this script</dt><dd><code class="atlas-break">{leaf.controlBlockHex}</code></dd>
      </dl>
    </details>
  </>;
}
