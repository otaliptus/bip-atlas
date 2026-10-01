import { useEffect, useState } from "preact/hooks";
import type { DerivedSpFixture } from "../types";

interface Props {
  fixtures: DerivedSpFixture[];
  figureId: string;
}

const short = (hex: string) => (hex.length > 20 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex);
const KIND: Record<string, string> = { p2pkh: "P2PKH", "p2sh-p2wpkh": "P2SH-P2WPKH", p2wpkh: "P2WPKH", p2tr: "P2TR", other: "other" };

/**
 * silent-payment-derivation.v1 — the Silent payments chapter's hero figure.
 *
 * Published BIP 352 send-and-receive vectors, recomputed at build time by the
 * tested model: input keys, input hash, ECDH secret, outputs, and the
 * receiver's scan. The build fails unless the sender's outputs, the
 * receiver's shared secret and the outputs it finds all match the vector.
 * The browser only switches views.
 */
export function SpDerivation({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [view, setView] = useState<"sender" | "receiver">("sender");
  const [steps, setSteps] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const showSteps = hydrated ? steps : true;
  const v = hydrated ? view : "sender";

  return (
    <div class="atlas-lab atlas-sp-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Published vector</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-case`} checked={x.id === id} onChange={() => setId(x.id)} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented">
            <legend>View</legend>
            {(["sender", "receiver"] as const).map((w) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-view`} checked={view === w} onChange={() => setView(w)} />
                <span>{w === "sender" ? "Sender" : "Receiver"}<small>{w === "sender" ? "knows the input keys’ secrets" : "knows b_scan, sees only the transaction"}</small></span>
              </label>
            ))}
          </fieldset>
          <label class="atlas-sp-steps">
            <input type="checkbox" checked={steps} onChange={(e) => setSteps((e.target as HTMLInputElement).checked)} />
            Reveal shared-secret steps
          </label>
        </div>
      ) : (
        <p class="atlas-lab__static-note">Static view: the sender’s side of the first vector, with every step shown. With JavaScript you can switch to the receiver, pick other vectors and hide the intermediate steps.</p>
      )}

      <section class="atlas-panel atlas-sp-inputs" aria-label="Transaction inputs">
        <h3 class="atlas-panel__title">Inputs: which keys count</h3>
        <ol class="atlas-sp-list">
          {d.inputs.map((i) => (
            <li data-counts={i.pubkey ? "true" : "false"}>
              <span class="atlas-sp-list__kind">{KIND[i.kind]}</span>
              <code>{i.outpoint}</code>
              <span>{i.pubkey ? <>key <code>{short(i.pubkey)}</code></> : <em>skipped: {i.skipped}</em>}</span>
            </li>
          ))}
        </ol>
      </section>

      <div class="atlas-sp-flow" data-view={v}>
        <section class="atlas-panel" aria-live="polite" aria-label={v === "sender" ? "Sender's computation" : "Receiver's computation"}>
          <h3 class="atlas-panel__title">{v === "sender" ? "Sender: a = Σ aᵢ, secret = input_hash · a · B_scan" : "Receiver: A = Σ Aᵢ, secret = input_hash · b_scan · A"}</h3>
          <dl class="atlas-sp-dl">
            {v === "sender"
              ? d.paidTo.map((p) => (
                  <div><dt>{p.ours ? "address paid" : "address paid (a different receiver)"}{p.label !== null ? `, label m = ${p.label}` : ""}</dt><dd><code class="atlas-break">{p.address}</code></dd></div>
                ))
              : <div><dt>receiver’s own address</dt><dd><code class="atlas-break">{d.receiver.address}</code>{d.receiver.labels.length ? <small class="atlas-sp-differ"> (this vector also scans for labels {d.receiver.labels.join(", ")})</small> : null}</dd></div>}
            <div><dt>receiver’s B_scan · B_spend</dt><dd><code>{short(d.receiver.Bscan)}</code> · <code>{short(d.receiver.Bspend)}</code>{v === "sender" && d.paidTo.some((p) => p.label !== null) ? <small class="atlas-sp-differ"> (unlabeled spend key; the labeled address carries B_m instead)</small> : null}</dd></div>
            {showSteps ? (
              <>
                <div><dt>{v === "sender" ? "A = a·G (sum of input keys)" : "A (sum of input keys)"}</dt><dd><code>{short(d.A)}</code></dd></div>
                <div><dt>smallest outpoint</dt><dd><code>{short(d.smallestOutpoint)}</code></dd></div>
                <div><dt>input_hash</dt><dd><code>{short(d.inputHash)}</code></dd></div>
                {v === "receiver" ? <div><dt>tweak = input_hash · A</dt><dd><code>{short(d.tweak)}</code></dd></div> : null}
              </>
            ) : null}
            <div><dt>shared secret</dt><dd><code>{short(v === "sender" ? d.senderSecret : d.sharedSecret)}</code>{d.secretsAgree ? <small> (sender and receiver compute the same point)</small> : <small class="atlas-sp-differ"> ({v === "sender" ? "with the other receiver’s scan key" : "not the sender’s secret: this payment was not to us"})</small>}</dd></div>
          </dl>
        </section>

        {v === "sender" ? (
          <section class="atlas-panel" aria-label="Outputs the sender creates">
            <h3 class="atlas-panel__title">Outputs created: P_k = B_m + t_k·G</h3>
            <ol class="atlas-sp-outs">
              {d.senderOutputs.map((o) => <li><span>taproot key</span> <code class="atlas-break">{o}</code></li>)}
            </ol>
            <p class="atlas-panel__scope">t_k is a tagged hash of the shared secret and k. Each output is an ordinary taproot output; nothing in it mentions the address.</p>
          </section>
        ) : (
          <section class="atlas-panel" aria-label="Receiver's scan">
            <h3 class="atlas-panel__title">Scan: compute P_k and look for it</h3>
            {showSteps ? (
              <ol class="atlas-sp-scan">
                {d.steps.map((s) => (
                  <li data-matched={s.matched ? "true" : "false"}>
                    k = {s.k}: P_k = <code>{short(s.Pk)}</code> {s.matched ? <strong>found{s.via && s.via !== "direct" ? " (via a label)" : ""}</strong> : <em>not found, stop</em>}
                  </li>
                ))}
              </ol>
            ) : null}
            <ol class="atlas-sp-outs">
              {d.txOutputs.map((o) => (
                <li data-mine={o.mine ? "true" : "false"}>
                  <span>{o.mine ? `mine${o.label !== null ? `, label ${o.label}` : ""}` : "not mine"}</span> <code class="atlas-break">{o.key}</code>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      <p class="atlas-lab__source">
        Source: BIP 352 send_and_receive_test_vectors.json, “{d.comment}” (line {f.source.line}). Recomputed at build time by the tested model and checked against the vector’s outputs, shared secret and found outputs.
      </p>
    </div>
  );
}
