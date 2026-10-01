import { useEffect, useState } from "preact/hooks";
import type { DerivedMusig2SessionFixture } from "../types";

interface Props {
  fixtures: DerivedMusig2SessionFixture[];
  figureId: string;
}

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;
const STAGES = [
  { id: "keys", title: "Key aggregation", note: "Each signer’s key is multiplied by its own coefficient, then summed. No interaction: anyone with the key list can do it." },
  { id: "tweaks", title: "Tweaks", note: "The aggregate key can be tweaked, plain (as in BIP 32 derivation) or x-only (as in a Taproot commitment)." },
  { id: "round1", title: "Round 1: nonces", note: "Each signer sends a public nonce of two points. They are summed point by point into one aggregate nonce." },
  { id: "session", title: "Session values", note: "From the aggregate nonce, key and message: the nonce coefficient b, the final nonce R = R₁ + b·R₂, and the BIP 340 challenge e." },
  { id: "round2", title: "Round 2: partial signatures", note: "Each signer sends one 32-byte number. Each is checked against that signer’s key and nonce before use." },
  { id: "aggregate", title: "Aggregate signature", note: "The partial signatures are summed, plus a term for the tweaks. The result is a 64-byte signature checked by plain BIP 340 verification." },
] as const;

/**
 * musig2-rounds.v1 — the MuSig2 chapter's hero figure.
 *
 * Published BIP 327 sig_agg vectors, recomputed at build time by the tested
 * MuSig2 model: every aggregate value, every partial-signature check, and
 * the final signature (verified with noble's BIP 340 verifier). No secret
 * keys or secret nonces are involved; the browser only steps and reveals.
 */
export function Musig2Rounds({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const stages = STAGES.filter((s) => s.id !== "tweaks" || d.tweaks.length > 0);
  const [at, setAt] = useState(0);
  const [reveal, setReveal] = useState(true);
  const step = hydrated ? Math.min(at, stages.length - 1) : stages.length - 1;
  const show = hydrated ? reveal : true;
  const stage = stages[step];
  const reached = (sid: string) => stages.findIndex((s) => s.id === sid) <= step;

  return (
    <div class="atlas-lab atlas-mu-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Published vector</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-case`} checked={x.id === id} onChange={() => (setId(x.id), setAt(0))} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <label class="atlas-mu-reveal">
            <input type="checkbox" checked={reveal} onChange={(e) => setReveal((e.target as HTMLInputElement).checked)} />
            Reveal aggregated values
          </label>
        </div>
      ) : (
        <p class="atlas-lab__static-note">Static view: the first vector with every stage shown. With JavaScript you can choose among {fixtures.length} published vectors and step through the rounds.</p>
      )}

      <ol class="atlas-mu-stages" aria-label="Stages">
        {stages.map((s, i) => (
          <li data-state={i === step ? "current" : i < step ? "done" : "ahead"}>
            {hydrated ? (
              <button type="button" onClick={() => setAt(i)} aria-current={i === step ? "step" : undefined}>
                <span class="atlas-mu-stages__n">{i + 1}</span> {s.title}
              </button>
            ) : (
              <span><span class="atlas-mu-stages__n">{i + 1}</span> {s.title}</span>
            )}
          </li>
        ))}
      </ol>
      {hydrated ? (
        <div class="atlas-lab__buttons" role="group" aria-label="Step through the rounds">
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.max(0, step - 1))} disabled={step === 0}>← Previous</button>
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.min(stages.length - 1, step + 1))} disabled={step === stages.length - 1}>Next →</button>
        </div>
      ) : null}
      <p class="atlas-mu-note" aria-live="polite">{stage.note}</p>

      <div class="atlas-mu-lanes" role="table" aria-label="Signers and what each contributes">
        <div class="atlas-mu-lanes__head" role="row">
          <span role="columnheader">Signer</span>
          <span role="columnheader">Public key · coefficient</span>
          <span role="columnheader">Public nonce (R₁, R₂)</span>
          <span role="columnheader">Partial signature</span>
        </div>
        {d.signers.map((s, i) => (
          <div class="atlas-mu-lanes__row" role="row">
            <span role="cell" class="atlas-mu-lanes__who">{i + 1}</span>
            <span role="cell">
              <code>{short(s.pubkey)}</code>
              <small>a = {s.secondKey ? "1 (second distinct key)" : short(s.coefficient)}</small>
            </span>
            <span role="cell" data-reached={reached("round1") ? "true" : "false"}>
              {reached("round1") ? <><code>{short(s.pubnonce[0])}</code><code>{short(s.pubnonce[1])}</code></> : <em>not sent yet</em>}
            </span>
            <span role="cell" data-reached={reached("round2") ? "true" : "false"}>
              {reached("round2") ? <><code>{short(s.psig)}</code><small data-ok={s.psigVerifies ? "true" : "false"}>{s.psigVerifies ? "✓ verifies for this signer" : "✕ fails"}</small></> : <em>not sent yet</em>}
            </span>
          </div>
        ))}
      </div>

      <section class="atlas-panel atlas-mu-agg" aria-label="Aggregated values">
        <h3 class="atlas-panel__title">Aggregated values</h3>
        {!show ? (
          <p class="atlas-panel__empty">Hidden. Each signer’s own contributions are above; tick “Reveal aggregated values” to see what they combine into.</p>
        ) : (
          <dl class="atlas-mu-dl">
            <div><dt>key-list hash L</dt><dd><code>{short(d.keyListHash)}</code></dd></div>
            <div><dt>aggregate key Q</dt><dd><code class="atlas-break">{d.aggXonly}</code><small>x-only; the {d.aggPlain.startsWith("02") ? "even" : "odd"}-y point</small></dd></div>
            {reached("tweaks") && d.tweaks.length
              ? d.tweaks.map((t, i) => (
                  <div><dt>after tweak {i + 1} ({t.xonly ? "x-only" : "plain"} tweak), x</dt><dd><code class="atlas-break">{t.resultXonly}</code></dd></div>
                ))
              : null}
            {reached("round1") ? <div><dt>aggregate nonce</dt><dd><code>{short(d.aggnonce[0])}</code> <code>{short(d.aggnonce[1])}</code></dd></div> : null}
            {reached("session") ? (
              <>
                <div><dt>nonce coefficient b</dt><dd><code>{short(d.b)}</code></dd></div>
                <div><dt>final nonce R</dt><dd><code>{short(d.R)}</code><small>{d.rEvenY ? "even y: nonces used as is" : "odd y: every signer negates its nonces"}</small></dd></div>
                <div><dt>challenge e</dt><dd><code>{short(d.e)}</code></dd></div>
              </>
            ) : null}
            {reached("aggregate") ? (
              <>
                <div><dt>signature (R, s)</dt><dd><code class="atlas-break">{d.signature}</code></dd></div>
                <div><dt>BIP 340 verify</dt><dd data-ok={d.signatureVerifies ? "true" : "false"}>{d.signatureVerifies ? "✓ valid for key " : "✕ invalid for key "}<code>{short(d.finalXonly)}</code> and message <code>{short(d.msg)}</code></dd></div>
              </>
            ) : null}
          </dl>
        )}
      </section>
      <p class="atlas-lab__source">
        Source: BIP 327 sig_agg_vectors.json, case {f.caseIndex} (line {f.source.line}). Recomputed at build time by the tested MuSig2 model; the aggregate nonce and signature equal the vector’s, and noble’s BIP 340 verifier accepts the signature.
      </p>
    </div>
  );
}
