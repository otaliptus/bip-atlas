import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import type { DerivedSchnorrFixture, SchnorrStageId, SchnorrTraceView } from "../types";

interface Props {
  fixtures: DerivedSchnorrFixture[];
  figureId: string;
}

/** The eight steps of Verify(pk, m, sig), in the order BIP 340 lists them. */
export const SCHNORR_STAGES: ReadonlyArray<{ id: SchnorrStageId; label: string; question: string }> = [
  { id: "lift-x", label: "Lift the key", question: "Is pk a valid x coordinate (below p, with a curve point)? Take the point P with even y." },
  { id: "r-range", label: "Read r", question: "r = first 32 bytes of the signature. Is r below the field size p?" },
  { id: "s-range", label: "Read s", question: "s = last 32 bytes. Is s below the group order n?" },
  { id: "challenge", label: "Hash the challenge", question: "e = hash tagged “BIP0340/challenge” of r ‖ P ‖ m, reduced mod n." },
  { id: "compute-r", label: "Compute R", question: "R = s⋅G − e⋅P, using secp256k1 point arithmetic." },
  { id: "infinity", label: "R is not infinity", question: "Fail if R is the point at infinity." },
  { id: "even-y", label: "R has even y", question: "Fail if the y coordinate of R is odd." },
  { id: "x-match", label: "x(R) equals r", question: "Fail unless the x coordinate of R equals r." },
];

type Status = "pass" | "fail" | "not-reached" | "pending";

function stageNote(id: SchnorrStageId, values: Record<string, string>, ok: boolean): string | null {
  switch (id) {
    case "lift-x": return ok ? `P has even y. x(P) = pk.` : `Stops here: ${values.reason}.`;
    case "r-range": return ok ? "r < p" : "r is not below p.";
    case "s-range": return ok ? "s < n" : "s is not below n.";
    case "challenge": return values.hash === values.e ? "The hash is already below n, so e equals it." : "The hash was reduced mod n.";
    case "compute-r": return values.R ? "R is the point at infinity." : `y(R) is ${BigInt(`0x${values.y}`) % 2n === 0n ? "even" : "odd"}.`;
    case "infinity": return ok ? "R is an ordinary point." : "Stops here: no coordinates to compare.";
    case "even-y": return ok ? "y(R) is even." : "Stops here: y(R) is odd.";
    case "x-match": return ok ? "x(R) = r: the signature verifies." : "Stops here: x(R) differs from r.";
  }
}

const hexValueLabels: Record<string, string> = { x: "x", y: "y", r: "r", s: "s", hash: "challenge hash", e: "e", xR: "x(R)" };

/**
 * schnorr-verification.v1 — the Schnorr chapter's hero figure.
 *
 * Every value comes from the tested model run at build time on published
 * BIP 340 CSV vectors (cross-checked against noble's verifier). The reader
 * chooses a vector and one of the figure's fixture messages; nothing here
 * accepts a key, message or signature typed by the reader, and nothing signs.
 */
export function SchnorrVerifier({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const [messageKey, setMessageKey] = useState(fixture.derived.ownMessage);
  const [revealed, setRevealed] = useState(SCHNORR_STAGES.length);
  const shown = hydrated ? revealed : SCHNORR_STAGES.length;

  const chooseFixture = (id: string) => {
    const next = fixtures.find((f) => f.id === id)!;
    setFixtureId(id);
    setMessageKey(next.derived.ownMessage);
  };

  const message = fixture.derived.messages.find((m) => m.key === messageKey)!;
  const own = messageKey === fixture.derived.ownMessage;
  const trace: SchnorrTraceView = fixture.derived.traces[messageKey];
  const r = fixture.signatureHex.slice(0, 64);
  const s = fixture.signatureHex.slice(64);
  const lastRun = trace.steps.length;

  const statusOf = (i: number): Status => {
    if (i >= shown) return "pending";
    if (i >= lastRun) return "not-reached";
    return trace.steps[i].ok ? "pass" : "fail";
  };
  const allShown = shown >= SCHNORR_STAGES.length;
  const failedAt = trace.failedStage ? SCHNORR_STAGES.findIndex((st) => st.id === trace.failedStage) : -1;

  return (
    <div class="atlas-lab atlas-sig-lab" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-lab__controls atlas-sig-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Public BIP 340 vector</legend>
            {fixtures.map((f) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-vector`} checked={f.id === fixtureId} onChange={() => chooseFixture(f.id)} />
                <span>
                  {f.expected ? "✓ " : "✕ "}
                  {f.label}
                  <small>{f.shortLabel}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-lab__samples">
            <legend>Message (from the figure’s fixtures)</legend>
            {fixture.derived.messages.map((m) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-message`} checked={m.key === messageKey} onChange={() => setMessageKey(m.key)} />
                <span>
                  {m.key === fixture.derived.ownMessage ? "Signed message" : `Message of vector ${m.fromVector}`}
                  <small>{m.bytes} {m.bytes === 1 ? "byte" : "bytes"}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view: the first vector checked against its own message, every stage shown. With JavaScript you can
          choose any of the {fixtures.length} published vectors, swap in another fixture’s message, and reveal the
          verifier’s stages one at a time.
        </p>
      )}

      <dl class="atlas-sig-lab__inputs" aria-label="Verifier inputs">
        <div>
          <dt>pk <small>32 bytes</small></dt>
          <dd><code class="atlas-break">{fixture.publicKeyHex}</code></dd>
        </div>
        <div>
          <dt>m <small>{message.bytes} {message.bytes === 1 ? "byte" : "bytes"}{own ? "" : `, from vector ${message.fromVector}`}</small></dt>
          <dd>{message.bytes ? <code class="atlas-break">{message.hex}</code> : <em>empty message</em>}</dd>
        </div>
        <div>
          <dt>sig <small>64 bytes = r ‖ s</small></dt>
          <dd class="atlas-sig-lab__sig">
            <code class="atlas-break" data-part="r">{r}</code>
            <code class="atlas-break" data-part="s">{s}</code>
          </dd>
        </div>
      </dl>

      {hydrated ? (
        <div class="atlas-lab__buttons" role="group" aria-label="Reveal verifier stages">
          <button type="button" class="manual-plate-button" onClick={() => setRevealed((n) => Math.max(1, n - 1))} disabled={revealed <= 1}>← Previous stage</button>
          <button type="button" class="manual-plate-button" onClick={() => setRevealed((n) => Math.min(SCHNORR_STAGES.length, n + 1))} disabled={allShown}>Next stage →</button>
          <button type="button" class="manual-plate-button" onClick={() => setRevealed(allShown ? 1 : SCHNORR_STAGES.length)}>{allShown ? "Start over" : "Show all stages"}</button>
        </div>
      ) : null}

      <ol class="atlas-pipeline atlas-sig-lab__stages" aria-label="Verify(pk, m, sig), step by step">
        {SCHNORR_STAGES.map((stage, i) => {
          const status = statusOf(i);
          const step = trace.steps[i];
          const values = status === "pass" || status === "fail" ? step.values : null;
          const note = values ? stageNote(stage.id, values, step.ok) : null;
          return (
            <li class="atlas-stage" data-status={status}>
              <span class="atlas-stage__head">
                <span class="atlas-stage__number">{String(i + 1).padStart(2, "0")}</span>
                <span class="atlas-stage__label">{stage.label}</span>
                <span class="atlas-stage__mark" aria-hidden="true">{status === "pass" ? "✓" : status === "fail" ? "✕" : ""}</span>
              </span>
              <span class="atlas-stage__status">
                {status === "pass" ? "passes" : status === "fail" ? "fails" : status === "not-reached" ? "not reached" : "not revealed"}
              </span>
              <span class="atlas-stage__question">{stage.question}</span>
              {values ? (
                <span class="atlas-sig-lab__values">
                  {Object.entries(values)
                    .filter(([k]) => k in hexValueLabels && !(stage.id === "lift-x" && k === "x"))
                    .map(([k, v]) => (
                      <span class="atlas-sig-lab__value">
                        <span>{hexValueLabels[k]}</span>
                        <code class="atlas-break">{v}</code>
                      </span>
                    ))}
                </span>
              ) : null}
              {note ? <span class="atlas-stage__note">{note}</span> : null}
            </li>
          );
        })}
      </ol>

      <p class="atlas-lab__status" aria-live="polite">
        {allShown ? (
          <>
            <span class="atlas-lab__verdict" data-valid={trace.valid ? "true" : "false"}>{trace.valid ? "✓ success" : "✕ failure"}</span>{" "}
            {trace.valid
              ? "Every check passed."
              : `Verification stops at stage ${failedAt + 1} (“${SCHNORR_STAGES[failedAt].label}”); later stages never run.`}{" "}
            {own
              ? <>Published result for vector {fixture.vectorIndex}: <strong>{fixture.expected ? "TRUE" : "FALSE"}</strong>{fixture.comment ? <> (“{fixture.comment}”)</> : null}.</>
              : <>This pairing of vector {fixture.vectorIndex}’s key and signature with vector {message.fromVector}’s message is not itself a published vector; the result is computed by the tested model.</>}
          </>
        ) : (
          <>Stage {shown} of {SCHNORR_STAGES.length} revealed: {SCHNORR_STAGES[shown - 1].label}, {{ pass: "passes", fail: "fails", "not-reached": "not reached", pending: "not revealed" }[statusOf(shown - 1)]}.</>
        )}
      </p>
      <p class="atlas-lab__source">
        Source: BIP 340 test-vectors.csv line {fixture.source.line}. Arithmetic: @noble/curves; every result shown is cross-checked against noble’s own verifier. Hex is shown most significant byte first.
      </p>
    </div>
  );
}
