import { Bracket, Storyboard, Value, short, type Frame } from "../kit";
import type { DerivedDerFixture } from "../types";

/**
 * der-txid-flip.v1 — static storyboard. BIP 143's example transaction as
 * published, then with input 0's S flipped (in the scriptSig, inside what
 * the txid hashes), then with input 1's S flipped (in the witness, which
 * only the wtxid hashes). Both flipped transactions still verify; each
 * identifier is recomputed by the model.
 */
export function DerTxidFlip({ fixtures }: { fixtures: DerivedDerFixture[] }) {
  const scriptSig = fixtures.find((f) => f.where === "scriptSig");
  const witness = fixtures.find((f) => f.where === "witness");
  if (!scriptSig || !witness) throw new Error("der-txid-flip: needs a scriptSig and a witness signature");
  const pub = scriptSig.derived.published;
  const flip = (f: DerivedDerFixture) => f.derived.variants.find((v) => v.id === "s-flipped")!;
  // The transaction's parts, left to right; `sig` marks where a signature sits.
  const parts: Array<{ id: string; text: string; w: number; base: boolean; sig?: "scriptSig" | "witness" }> = [
    { id: "ver", text: "VER", w: 24, base: true },
    { id: "mf", text: "00 01", w: 26, base: false },
    { id: "in0", text: "IN 0 · SIG", w: 56, base: true, sig: "scriptSig" },
    { id: "in1", text: "IN 1", w: 28, base: true },
    { id: "outs", text: "OUTPUTS", w: 46, base: true },
    { id: "wit", text: "WITNESS · SIG", w: 68, base: false, sig: "witness" },
    { id: "lock", text: "LOCK", w: 26, base: true },
  ];
  const scene = (flipped: "scriptSig" | "witness" | null, ids: { txidHex: string; wtxidHex: string }) => {
    let x = 8;
    const laid = parts.map((p) => {
      const at = { ...p, x };
      x += p.w + 2;
      return at;
    });
    const sameTx = ids.txidHex === pub.txidHex, sameW = ids.wtxidHex === pub.wtxidHex;
    return (
      <>
        {laid.map((p) => (
          <g data-part={p.id}>
            <rect class={`k-cell k-fill--${p.sig ? "sig" : "plain"}${p.sig && p.sig === flipped ? " k-cell--em" : ""}`} x={p.x} y={34} width={p.w} height={22} />
            <Value at={[p.x + p.w / 2, 48]} text={p.sig && p.sig === flipped ? "n − S" : p.text} size={7} anchor="middle" />
          </g>
        ))}
        <Bracket x1={8} x2={laid.at(-1)!.x + laid.at(-1)!.w} y={30} text="wtxid hashes every byte" below={false} />
        {laid.filter((p) => p.base).map((p) => <rect class="k-mark--hash" x={p.x} y={58} width={p.w} height={3} />)}
        <Value at={[8, 72]} text="TXID HASHES THE MARKED PARTS ONLY" size={7} cls="k-value--muted" />
        <Value at={[8, 94]} text={`txid  ${short(ids.txidHex, 16)}`} size={8.5} />
        <Value at={[226, 94]} text={flipped ? (sameTx ? "SAME" : "CHANGED") : ""} size={8} cls={sameTx ? "k-value--ok" : "k-value--fail"} />
        <Value at={[8, 112]} text={`wtxid ${short(ids.wtxidHex, 16)}`} size={8.5} />
        <Value at={[226, 112]} text={flipped ? (sameW ? "SAME" : "CHANGED") : ""} size={8} cls={sameW ? "k-value--ok" : "k-value--fail"} />
      </>
    );
  };
  const a = flip(scriptSig), b = flip(witness);
  const frames: Frame[] = [
    {
      note: `As published: input 0 signs in its scriptSig, input 1 in its witness.`,
      desc: `BIP 143's example transaction: txid ${pub.txidHex}, wtxid ${pub.wtxidHex} (display order). Input 0's signature is in its scriptSig, which the txid hashes; input 1's is in the witness, which only the wtxid hashes.`,
      draw: () => scene(null, pub),
    },
    {
      note: `Input 0's S replaced by n − S: the txid and the wtxid both change.`,
      desc: `With input 0's S replaced by n − S the signature still verifies, and the transaction gets txid ${a.txidHex} and wtxid ${a.wtxidHex}: both differ from the published ones.`,
      draw: () => scene("scriptSig", a),
    },
    {
      note: `Input 1's S replaced instead: only the wtxid changes.`,
      desc: `With input 1's S replaced by n − S, the txid stays ${b.txidHex} and the wtxid becomes ${b.wtxidHex}.`,
      draw: () => scene("witness", b),
    },
  ];
  return (
    <>
      <Storyboard id="a23-flip" title="What a flipped S changes" width={300} height={122} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact identifiers (display order)</summary>
        <dl class="atlas-hexlist">
          <dt>Published txid</dt><dd><code class="atlas-break">{pub.txidHex}</code></dd>
          <dt>Published wtxid</dt><dd><code class="atlas-break">{pub.wtxidHex}</code></dd>
          <dt>Input 0 flipped: txid</dt><dd><code class="atlas-break">{a.txidHex}</code></dd>
          <dt>Input 0 flipped: wtxid</dt><dd><code class="atlas-break">{a.wtxidHex}</code></dd>
          <dt>Input 1 flipped: txid</dt><dd><code class="atlas-break">{b.txidHex}</code></dd>
          <dt>Input 1 flipped: wtxid</dt><dd><code class="atlas-break">{b.wtxidHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
