import { Arrow, Drawing, Machine, Value, idsFor } from "../kit";
import type { DerivedPsbtTraceFixture } from "../types";

/**
 * psbt-signer-display.v1 — static. What a signer can show before signing,
 * read from the updated PSBT: each input's amount (from a full previous
 * transaction, or from a witness UTXO that only claims it), the outputs and
 * the fee.
 */
export function SignerDisplay({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const a = fixture.derived.amounts;
  const rows = [
    ...a.inputs.map((x) => ({ k: `IN ${x.index}`, v: x.btc, tag: x.from === "non-witness-utxo" ? "FROM THE FULL PREVIOUS TX" : "FROM A WITNESS UTXO: CLAIMED", dashed: x.from === "witness-utxo", em: false })),
    ...a.outputsBtc.map((v, i) => ({ k: `OUT ${i}`, v, tag: "", dashed: false, em: false })),
    { k: "FEE", v: a.feeBtc, tag: "INPUTS − OUTPUTS", dashed: false, em: true },
  ];
  const rowY = (i: number) => 48 + i * 24;
  const H = rowY(rows.length) + 40;
  return (
    <Drawing
      id="a05-display"
      width={344}
      height={H}
      title="What the signer can show"
      desc={`Read from the updated PSBT of BIP 174's trace: ${a.inputs.map((x) => `input ${x.index} spends ${x.btc} BTC, ${x.from === "non-witness-utxo" ? "taken from the full previous transaction" : "taken from a witness UTXO record, which only states it"}`).join("; ")}. The outputs pay ${a.outputsBtc.join(" and ")} BTC, so the fee is ${a.feeBtc} BTC.`}
    >
      <rect class="k-outline k-fill--plain" x="14" y="10" width="316" height={H - 20} rx="10" />
      <rect class="k-outline k-fill--net" x="26" y="22" width="292" height={H - 56} rx="3" />
      <Value at={[36, 38]} text="CONFIRM SPEND" size={9} cls="k-value--label" />
      {rows.map((r, i) => (
        <g>
          <rect class={`k-cell k-fill--plain${r.dashed ? " k-dashed" : ""}${r.em ? " k-cell--em" : ""}`} x="34" y={rowY(i) - 2} width="276" height="20" />
          <Value at={[40, rowY(i) + 11.5]} text={r.k} size={9} cls="k-value--label" />
          <Value at={[84, rowY(i) + 11.5]} text={`${r.v} BTC`} size={9.5} />
          {r.tag ? <Value at={[304, rowY(i) + 11.5]} text={r.tag} size={7.5} anchor="end" cls="k-value--muted" /> : null}
        </g>
      ))}
      <circle class="k-outline k-fill--plain" cx="150" cy={H - 21} r="6" />
      <circle class="k-outline k-fill--plain" cx="194" cy={H - 21} r="6" />
    </Drawing>
  );
}

/**
 * psbt-utxo-check.v1 — static. The signer's check before signing an input
 * that spends a pre-SegWit output: the full previous transaction in the PSBT
 * hashes to the txid the unsigned transaction names.
 */
export function UtxoCheck({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const c = fixture.derived.utxoCheck;
  const ids = idsFor("a05-utxo");
  const short = (h: string) => `${h.slice(0, 12)}…`;
  return (
    <>
      <Drawing
        id="a05-utxo"
        width={344}
        height={184}
        title="Checking the previous transaction"
        desc={`Input ${c.inputIndex} of the PSBT carries a ${c.utxoBytes}-byte non-witness UTXO: the whole previous transaction. Its double SHA-256 is ${c.computedTxidHex}. The unsigned transaction's input ${c.inputIndex} names previous txid ${c.prevoutTxidHex}, output ${c.vout}. They are equal, so the signer is looking at the transaction this input really spends.`}
      >
        <rect class="k-cell k-fill--plain" x="14" y="22" width="120" height="22" />
        <Value at={[20, 37]} text={`PREVIOUS TX · ${c.utxoBytes} B`} size={8.5} cls="k-value--label" />
        <Value at={[14, 14]} text={`INPUT ${c.inputIndex} · NON-WITNESS UTXO`} size={8.5} cls="k-value--muted" />
        <Arrow d="M138 33 H196" ids={ids} />
        <Machine at={[230, 50]} w={56} d={26} h={22} label="SHA-256" sub="twice" role="hash" />
        <rect class="k-cell k-fill--hash" x="190" y="108" width="140" height="22" />
        <Value at={[196, 123]} text={short(c.computedTxidHex)} size={9.5} />
        <Value at={[270, 100]} text="COMPUTED" size={8.5} cls="k-value--label" />
        <Arrow d="M254 94 V105" ids={ids} />
        <rect class="k-cell k-fill--hash" x="14" y="108" width="140" height="22" />
        <Value at={[20, 123]} text={short(c.prevoutTxidHex)} size={9.5} />
        <Value at={[14, 100]} text={`UNSIGNED TX · INPUT ${c.inputIndex} PREVOUT`} size={8.5} cls="k-value--label" />
        <Value at={[172, 124]} text="=" size={16} anchor="middle" />
        <Value at={[14, 156]} text={c.computedTxidHex === c.prevoutTxidHex ? "✓ THE SAME TXID" : "✗ DIFFERENT: DO NOT SIGN"} size={9} cls={c.computedTxidHex === c.prevoutTxidHex ? "k-value--ok" : "k-value--fail"} />
        <Value at={[14, 172]} text={`IT SPENDS OUTPUT ${c.vout} OF THAT TRANSACTION`} size={8.5} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact txids (byte order as computed)</summary>
        <dl class="atlas-hexlist">
          <dt>Double SHA-256 of the non-witness UTXO</dt><dd><code class="atlas-break">{c.computedTxidHex}</code></dd>
          <dt>Previous txid named by input {c.inputIndex}</dt><dd><code class="atlas-break">{c.prevoutTxidHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
