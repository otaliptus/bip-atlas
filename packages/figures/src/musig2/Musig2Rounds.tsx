import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Drawing, Responsive, Value, idsFor } from "../kit";
import type { DerivedMusig2SessionFixture, Musig2SessionDerived } from "../types";
import { ONE, Scene, sceneHeight, stagesFor } from "./scene";

interface Props {
  fixtures: DerivedMusig2SessionFixture[];
  figureId: string;
}

/** A full text equivalent of one stage of a session, every value exact. */
export function describeSession(d: Musig2SessionDerived, upto: number, reveal: boolean): string {
  const stages = stagesFor(d);
  const at = (id: string) => stages.findIndex((s) => s.id === id) <= upto && stages.some((s) => s.id === id);
  const parts: string[] = [`${d.signers.length} signers. Stage ${upto + 1} of ${stages.length}: ${stages[upto].title}.`];
  d.signers.forEach((s, i) => {
    const bits = [`public key ${s.pubkey}`, `coefficient ${s.coefficient === ONE ? "1 (the second distinct key)" : s.coefficient}`];
    if (at("round1")) bits.push(`public nonce ${s.pubnonce[0]} and ${s.pubnonce[1]}`);
    if (at("round2")) bits.push(`partial signature ${s.psig}, which ${s.psigVerifies ? "passes" : "fails"} PartialSigVerify`);
    parts.push(`Signer ${i + 1}: ${bits.join("; ")}.`);
  });
  if (!reveal) parts.push("The aggregated values are hidden in this view.");
  else {
    parts.push(`Aggregate key Q ${d.aggXonly}.`);
    if (at("tweaks")) d.tweaks.forEach((t, i) => parts.push(`After ${t.xonly ? "x-only" : "plain"} tweak ${i + 1}: ${t.resultXonly}.`));
    if (at("round1")) parts.push(`Aggregate nonce ${d.aggnonce[0]} ${d.aggnonce[1]}.`);
    if (at("session")) parts.push(`b ${d.b}; R ${d.R}${d.rEvenY ? "" : ", odd y, so every signer negates its secret nonces"}; e ${d.e}.`);
    if (at("aggregate")) parts.push(`Signature ${d.signature}; BIP 340 verification ${d.signatureVerifies ? "accepts" : "rejects"} it for key ${d.finalXonly} and message ${d.msg}.`);
  }
  return parts.join(" ");
}

/**
 * musig2-rounds.v1 — the MuSig2 chapter's hero (drawing-first).
 *
 * The signers sit as computers above a table. Step through the stages and
 * each one adds what it sends (key, two-point nonce, partial signature with a
 * PartialSigVerify lamp) while the table gathers the aggregated values. The
 * published sig_agg vectors are recomputed at build time by the tested
 * model; they carry no secret keys or nonces, and nothing here signs.
 */
export function Musig2Rounds({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const stages = stagesFor(d);
  const [at, setAt] = useState(0);
  const [reveal, setReveal] = useState(true);
  // Without JavaScript: the whole session, aggregated values shown.
  const step = hydrated ? Math.min(at, stages.length - 1) : stages.length - 1;
  const show = hydrated ? reveal : true;
  const stage = stages[step];
  const status = `Stage ${step + 1} of ${stages.length}, ${stage.title}. ${stage.note}${stage.id === "session" && !d.rEvenY ? " Here R has odd y, so each signer negates its secret nonces." : ""}${stage.id === "aggregate" ? (d.signatureVerifies ? " BIP 340 verification accepts it." : " BIP 340 verification rejects it.") : ""}`;

  const draw = (w: "wide" | "narrow") => {
    const W = w === "wide" ? 640 : 330;
    const did = `${figureId}-${w}`;
    const H = sceneHeight(d, W, step, 22);
    return (
      <Drawing id={did} width={W} height={H} title="A signing session, round by round" desc={describeSession(d, step, show)}>
        <Value at={[10, 12]} text={`STAGE ${step + 1} OF ${stages.length} · ${stage.title.toUpperCase()}`} size={8.5} cls="k-value--label" />
        <Scene d={d} upto={step} reveal={show} ids={idsFor(did)} W={W} y0={22} />
      </Drawing>
    );
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Choose a published vector">
            {fixtures.map((x) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-case`} checked={x.id === id} onChange={() => (setId(x.id), setAt(0))} />
                <span>{x.label}</span>
              </label>
            ))}
          </div>
          <div class="atlas-strip" role="radiogroup" aria-label="Reveal aggregated values">
            {[{ v: false, t: "Each signer only" }, { v: true, t: "With aggregated values" }].map((o) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-reveal`} checked={reveal === o.v} onChange={() => setReveal(o.v)} />
                <span>{o.t}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the first vector with every stage and the aggregated values shown. With JavaScript you can choose among {fixtures.length} published vectors, step through the rounds and hide the aggregated values.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Step through signing rounds">
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous stage">←</button>
          <input
            type="range"
            min={0}
            max={stages.length - 1}
            value={step}
            aria-label="Stage"
            aria-valuetext={`stage ${step + 1} of ${stages.length}: ${stage.title}`}
            onInput={(e) => setAt(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.min(stages.length - 1, step + 1))} disabled={step === stages.length - 1} aria-label="Next stage">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this stage</summary>
        <p class="atlas-hexlist" style="overflow-wrap:anywhere">{describeSession(d, step, show)}</p>
      </details>
      <p class="atlas-hero__source">BIP 327 sig_agg_vectors.json, case {f.caseIndex} (line {f.source.line}). Recomputed at build time by the tested MuSig2 model; the aggregate nonce and signature equal the vector’s, every partial signature passes PartialSigVerify, and noble’s BIP 340 verifier accepts the signature.</p>
    </div>
  );
}
