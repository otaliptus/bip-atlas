import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Drawing, Responsive, Scrub, Strip, Value, idsFor } from "../kit";
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
          <Strip label="Choose a published vector" name={`${figureId}-case`} options={fixtures.map((x) => ({ value: x.id, text: x.label }))} current={id} onPick={(v) => (setId(v), setAt(0))} />
          <Strip label="Reveal aggregated values" name={`${figureId}-reveal`} options={[{ value: "no", text: "Each signer only" }, { value: "yes", text: "With aggregated values" }]} current={reveal ? "yes" : "no"} onPick={(v) => setReveal(v === "yes")} />
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the first vector with every stage and the aggregated values shown. With JavaScript you can choose among {fixtures.length} published vectors, step through the rounds and hide the aggregated values.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <Scrub label="Step through signing rounds" value={step} max={stages.length - 1} unit="stage" valueText={`stage ${step + 1} of ${stages.length}: ${stage.title}`} onSet={setAt} />
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
