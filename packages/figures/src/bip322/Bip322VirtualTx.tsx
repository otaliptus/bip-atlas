import { useEffect, useState } from "preact/hooks";
import type { DerivedBip322Fixture } from "../types";

interface Props {
  fixtures: DerivedBip322Fixture[];
  figureId: string;
}

const short = (hex: string) => (hex.length > 28 ? `${hex.slice(0, 14)}…${hex.slice(-8)}` : hex === "" ? "(empty)" : hex);
const STATE: Record<string, string> = { valid: "Valid", invalid: "Invalid", inconclusive: "Inconclusive" };

/**
 * bip322-virtual-tx.v1 — the Message signing chapter's hero figure.
 *
 * Published BIP 322 vectors. At build time the tested model rebuilds
 * to_spend and to_sign, decodes the signature and verifies it with the
 * reviewed-opcode interpreter; the build fails unless its verdict is the one
 * recorded for the vector. Nothing here signs.
 */
export function Bip322VirtualTx({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [view, setView] = useState<"to_spend" | "to_sign">("to_spend");
  const [reveal, setReveal] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const showHash = hydrated ? reveal : true;
  const views = hydrated ? [view] : (["to_spend", "to_sign"] as const);
  const hashText = showHash ? d.messageHash : "message_hash (hidden)";

  return (
    <div class="atlas-lab atlas-b322-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Published vector</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-vec`} checked={x.id === id} onChange={() => setId(x.id)} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented">
            <legend>Virtual transaction</legend>
            {(["to_spend", "to_sign"] as const).map((w) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-view`} checked={view === w} onChange={() => setView(w)} />
                <span>{w}<small>{w === "to_spend" ? "commits to message and address" : "carries the signature"}</small></span>
              </label>
            ))}
          </fieldset>
          <label class="atlas-b322-reveal">
            <input type="checkbox" checked={reveal} onChange={(e) => setReveal((e.target as HTMLInputElement).checked)} />
            Reveal the message hash
          </label>
        </div>
      ) : (
        <p class="atlas-lab__static-note">Static view: the first vector, both virtual transactions and the message hash. With JavaScript you can switch vectors and views.</p>
      )}

      <section class="atlas-panel atlas-b322-head" aria-label="Message and address">
        <dl class="atlas-b322-dl">
          <div><dt>message</dt><dd>{d.message === "" ? <em>(empty)</em> : <q>{d.message}</q>}</dd></div>
          <div><dt>address</dt><dd><code class="atlas-break">{d.address}</code> <small>{d.scriptKind.toUpperCase()}</small></dd></div>
          <div><dt>signature</dt><dd><code>{d.signatureHead}…</code> <small>{d.signatureChars} characters, {d.prefixed ? `prefix “${d.variant}”` : "no prefix: read as simple"}</small></dd></div>
          <div><dt>message hash</dt><dd><code class="atlas-break">{hashText}</code>{showHash ? <small> tagged hash “BIP0322-signed-message” of the UTF-8 message</small> : null}</dd></div>
        </dl>
      </section>

      <div class="atlas-b322-txs" aria-live="polite">
        {views.includes("to_spend") ? (
          <section class="atlas-panel" aria-label="to_spend">
            <h3 class="atlas-panel__title">to_spend <small>not meant to be broadcast</small></h3>
            <table class="atlas-b322-tx">
              <tbody>
                <tr><th scope="row">nVersion</th><td>0</td></tr>
                <tr><th scope="row">input</th><td>spends <code>000…000:FFFFFFFF</code>, an output that does not exist</td></tr>
                <tr><th scope="row">scriptSig</th><td>OP_0 PUSH32 <code>{showHash ? short(d.messageHash) : "[message_hash]"}</code></td></tr>
                <tr><th scope="row">nSequence · nLockTime</th><td>0 · 0</td></tr>
                <tr><th scope="row">output</th><td>0 sats to <code>{short(d.toSpend.challenge)}</code>, the address’s script</td></tr>
                <tr><th scope="row">txid</th><td><code class="atlas-break">{d.toSpend.txid}</code></td></tr>
              </tbody>
            </table>
          </section>
        ) : null}
        {views.includes("to_sign") ? (
          <section class="atlas-panel" aria-label="to_sign">
            <h3 class="atlas-panel__title">to_sign <small>not meant to be broadcast</small></h3>
            <table class="atlas-b322-tx">
              <tbody>
                <tr><th scope="row">nVersion</th><td>{d.toSign.version}</td></tr>
                <tr><th scope="row">input</th><td>spends <code>{short(d.toSpend.txid)}:0</code>, to_spend’s output</td></tr>
                <tr><th scope="row">scriptSig</th><td><code>{short(d.toSign.scriptSig)}</code></td></tr>
                <tr><th scope="row">witness</th><td>{d.toSign.witness.length === 0 ? "(empty)" : <ol class="atlas-b322-wit">{d.toSign.witness.map((w) => <li><code>{short(w)}</code></li>)}</ol>}</td></tr>
                <tr><th scope="row">nSequence · nLockTime</th><td>{d.toSign.sequence} · {d.toSign.lockTime}</td></tr>
                <tr><th scope="row">output</th><td>0 sats to <code>OP_RETURN</code></td></tr>
                <tr><th scope="row">txid</th><td><code class="atlas-break">{d.toSign.txid}</code></td></tr>
              </tbody>
            </table>
          </section>
        ) : null}
      </div>

      <p class="atlas-b322-verdict" data-state={d.verdict.state}>
        <strong>{STATE[d.verdict.state]}</strong>
        {d.verdict.state === "valid" ? ` at time T = ${d.verdict.time} and age S = ${d.verdict.age}. The signature satisfies the address’s script for this message.` : `: ${d.verdict.reason}.`}
        {" "}<small>Checked by the model: {d.checked}.</small>
      </p>
      <p class="atlas-lab__source">
        Source: BIP 322 {f.source.file?.replace("bip-0322/", "")}, line {f.source.line}. Rebuilt and verified at build time by the tested model; the build fails if its verdict differs from the one recorded for this vector.
      </p>
    </div>
  );
}
