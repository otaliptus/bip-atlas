import { Arrow, Cells, Computer, Machine, Storyboard, Value, type DrawingIds, type Frame } from "../kit";
import type { DerivedTransactionFixture } from "../types";
import { preimageRole, shortHex, txFields } from "./fields";

/**
 * amount-storyboard.v1 — static storyboard. Why BIP 143 signs the amount: an
 * offline signer sees only a reference to the output it spends; given the
 * amount, it puts it into item 6 of the preimage; a different amount would
 * give a different digest, and nodes, using the real amount, would reject
 * the signature.
 */
export function AmountStory({ fixture }: { fixture: DerivedTransactionFixture }) {
  const d = fixture.derived;
  const i = fixture.sighash.inputIndex;
  const items = d.digest.items;
  const amountAt = items.findIndex((it) => it.id === "amount");
  if (amountAt < 0) throw new Error(`amount-storyboard: ${fixture.id} has no amount item`);
  const inputFields = txFields(d).filter((f) => f.seg.startsWith(`input.${i}.`));
  const txid = inputFields.find((f) => f.id.endsWith(".txid"));
  if (!txid) throw new Error(`amount-storyboard: input ${i} has no outpoint`);
  const slots = (y: number, hatched: boolean, ids: DrawingIds) => (
    <>
      <Cells x={96} y={y} values={items.map((_, n) => String(n + 1))} size={15} roleOf={(n) => (n === amountAt && hatched ? "hidden" : preimageRole(items[n].id))} emphasis={(n) => n === amountAt} hatch={ids.hatch} />
      <Value at={[96, y - 6]} text="PREIMAGE ITEMS" size={8} cls="k-value--muted" />
    </>
  );
  const frames: Frame[] = [
    {
      note: `The offline signer sees input ${i}’s outpoint, a reference to an earlier output. The amount it spends is not in the transaction.`,
      desc: `An offline signer holds the unsigned transaction. Input ${i} names the output it spends by previous txid ${txid.hex} and index; nothing in the transaction says how much that output holds.`,
      draw: (ids) => (
        <>
          <Computer at={[30, 30]} label="offline signer" />
          <rect class="k-cell k-fill--hash" x="96" y="34" width="120" height="20" />
          <Value at={[101, 47.5]} text={`prev txid ${shortHex(txid.hex, 8)}`} size={8.5} />
          <rect class="k-cell k-fill--plain" x="216" y="34" width="28" height="20" />
          <Value at={[221, 47.5]} text="idx" size={8.5} />
          <rect class="k-cell" x="96" y="78" width="72" height="20" style={`fill:${ids.hatch}`} />
          <Value at={[176, 92]} text="AMOUNT: NOT GIVEN" size={8.5} cls="k-value--label" />
          <Value at={[96, 120]} text={`INPUT ${i} · OUTPOINT ONLY`} size={8.5} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `Told the amount, ${d.amountBtc} BTC as published with the example, the signer puts it into item ${amountAt + 1} and hashes the preimage.`,
      desc: `The amount ${d.amountBtc} BTC is supplied with the transaction and becomes item ${amountAt + 1} of the BIP 143 preimage. The double SHA-256 of the preimage is ${d.digest.sighashHex}.`,
      draw: (ids) => (
        <>
          <Computer at={[30, 30]} label="offline signer" />
          <rect class="k-outline k-fill--plain k-cell--em" x="96" y="16" width="112" height="20" />
          <Value at={[102, 29.5]} text={`${d.amountBtc} BTC`} size={9} />
          <Arrow d={`M${96 + amountAt * 15 + 7} 38 V58`} ids={ids} />
          {slots(64, false, ids)}
          <Arrow d="M170 84 V96" ids={ids} />
          <Machine at={[160, 126]} w={44} d={24} h={18} label="" role="hash" />
          <Value at={[214, 112]} text="SIGHASH" size={8.5} cls="k-value--label" />
          <Value at={[214, 125]} text={shortHex(d.digest.sighashHex, 10)} size={9} cls="k-value--hash" />
        </>
      ),
    },
    {
      note: "Told any other amount, it would hash a different preimage. Nodes rebuild the preimage with the real amount, so that signature would fail.",
      desc: `With a wrong amount in item ${amountAt + 1} the preimage differs, so its digest differs from ${d.digest.sighashHex}, the digest nodes compute from the real amount; a signature over the wrong digest is invalid.`,
      draw: (ids) => (
        <>
          <Computer at={[30, 30]} label="offline signer" />
          <rect class="k-outline k-fill--plain k-cell--em k-dashed" x="96" y="16" width="112" height="20" />
          <Value at={[102, 29.5]} text="ANY OTHER AMOUNT" size={8.5} cls="k-value--label" />
          <Arrow d={`M${96 + amountAt * 15 + 7} 38 V58`} ids={ids} />
          {slots(64, false, ids)}
          <Arrow d="M170 84 V96" ids={ids} />
          <Machine at={[160, 126]} w={44} d={24} h={18} label="" role="hash" />
          <Value at={[214, 112]} text="DIGEST" size={8.5} cls="k-value--label" />
          <Value at={[214, 125]} text={`≠ ${shortHex(d.digest.sighashHex, 8)}`} size={9} cls="k-value--fail" />
          <Value at={[214, 138]} text="✗ SIGNATURE" size={8.5} cls="k-value--fail" /><Value at={[214, 150]} text="FAILS" size={8.5} cls="k-value--fail" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a03-amount" title="Why the signature covers the amount" width={300} height={152} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Input {i}: previous txid</dt><dd><code class="atlas-break">{txid.hex}</code></dd>
          <dt>Item {amountAt + 1}: amount, 8 bytes little-endian ({d.amountBtc} BTC)</dt><dd><code class="atlas-break">{items[amountAt].hex}</code></dd>
          <dt>Sighash with the published amount</dt><dd><code class="atlas-break">{d.digest.sighashHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
