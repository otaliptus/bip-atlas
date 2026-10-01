import { useEffect, useState } from "preact/hooks";
import type { DerivedPsbtTraceFixture, PsbtRecordView } from "../types";

interface Props {
  fixture: DerivedPsbtTraceFixture;
  figureId: string;
}

type Compare = "step" | "creator";

const title = (scope: string, index: number) => (scope === "global" ? "Global" : `${scope === "input" ? "Input" : "Output"} ${index}`);
const short = (hex: string) => (hex.length > 40 ? `${hex.slice(0, 24)}…${hex.slice(-8)}` : hex || "—");
const sig = (r: PsbtRecordView) => `${r.scope}/${r.index}/${r.keyType}/${r.keyDataHex}/${r.valueHex}`;

/**
 * psbt-envelope.v1 — the PSBT chapter's hero figure.
 *
 * Replays the role trace published in BIP 174's test vectors. Every state is a
 * published PSBT, parsed by the tested model; the combiner step and the final
 * extraction were checked against the published bytes at build time. Nothing is
 * signed, uploaded, or broadcast here.
 */
export function PsbtEnvelope({ fixture, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { states, extracted } = fixture.derived;
  const steps = [...states.map((s) => ({ id: s.id, role: s.role })), { id: "extractor", role: "Transaction Extractor" }];
  const [at, setAt] = useState(0);
  const [compare, setCompare] = useState<Compare>("step");
  const [picked, setPicked] = useState<string | null>(null);

  const isExtract = steps[at].id === "extractor";
  const state = isExtract ? null : states[at];
  const creator = new Set(states[0].maps.flatMap((m) => m.records).map(sig));
  const statusOf = (r: PsbtRecordView & { status: string }) => (compare === "creator" ? (creator.has(sig(r)) ? "kept" : "added") : r.status);
  const allRecords = state ? state.maps.flatMap((m) => m.records) : [];
  const detail = picked ? allRecords.find((r) => sig(r) === picked) ?? null : null;
  const added = allRecords.filter((r) => statusOf(r) === "added").length;
  const removed = state ? state.maps.reduce((n, m) => n + m.removed.length, 0) : 0;

  const go = (i: number) => {
    setAt(Math.max(0, Math.min(steps.length - 1, i)));
    setPicked(null);
  };

  if (!hydrated) {
    // Static equivalent: every step with what it added or removed.
    return (
      <div class="atlas-lab atlas-psbt-lab" data-hydrated="false">
        <p class="atlas-lab__static-note">
          Static view: what each role in BIP 174’s published trace adds or removes. With JavaScript you can step through
          the envelope and inspect each field.
        </p>
        <ol class="atlas-trace-static">
          {states.map((s) => {
            const recs = s.maps.flatMap((m) => m.records.filter((r) => r.status === "added").map((r) => `${title(m.scope, m.index)}: ${r.name}`));
            const gone = s.maps.flatMap((m) => m.removed.map((r) => `${title(m.scope, m.index)}: ${r.name}`));
            return (
              <li>
                <strong>{s.role}</strong> <span class="atlas-trace-static__line">line {s.line}, {s.bytes} bytes</span>
                {s.basedOn.length === 0 ? <p>Creates the envelope with the unsigned transaction and empty maps.</p> : null}
                {recs.length ? <p>Adds: {recs.join("; ")}.</p> : null}
                {gone.length ? <p>Removes: {gone.join("; ")}.</p> : null}
              </li>
            );
          })}
          <li><strong>Transaction Extractor</strong> <span class="atlas-trace-static__line">line {fixture.extracted.line}</span><p>Produces the {extracted.bytes}-byte network transaction.</p></li>
        </ol>
      </div>
    );
  }

  return (
    <div class="atlas-lab atlas-psbt-lab" data-hydrated="true">
      <ol class="atlas-roles" aria-label="Roles in the published trace">
        {steps.map((s, i) => (
          <li>
            <button type="button" class="atlas-roles__step" aria-current={i === at ? "step" : undefined} onClick={() => go(i)}>
              <span class="atlas-num">{i + 1}</span>
              {s.role}
            </button>
          </li>
        ))}
      </ol>
      <div class="atlas-lab__controls">
        <div class="atlas-lab__buttons" role="group" aria-label="Advance through the trace">
          <button type="button" class="manual-plate-button" onClick={() => go(at - 1)} disabled={at === 0}>← Previous role</button>
          <button type="button" class="manual-plate-button" onClick={() => go(at + 1)} disabled={at === steps.length - 1}>Next role →</button>
        </div>
        {!isExtract ? (
          <fieldset class="atlas-segmented">
            <legend>Mark as new</legend>
            <label class="atlas-choice">
              <input type="radio" name={`${figureId}-compare`} checked={compare === "step"} onChange={() => setCompare("step")} />
              <span>added by this role</span>
            </label>
            <label class="atlas-choice">
              <input type="radio" name={`${figureId}-compare`} checked={compare === "creator"} onChange={() => setCompare("creator")} />
              <span>added since the Creator</span>
            </label>
          </fieldset>
        ) : null}
      </div>

      <p class="atlas-lab__status" aria-live="polite">
        <strong>{steps[at].role}.</strong>{" "}
        {isExtract
          ? `Every input now has final scripts, so the extractor builds the ${extracted.bytes}-byte network transaction. It is no longer a PSBT.`
          : state!.basedOn.length === 0
            ? `Creates the envelope: the unsigned transaction and one empty map per input and output (${state!.bytes} bytes).`
            : state!.uniqueFrom && compare === "step"
              ? `Adds nothing of its own. It merges ${state!.uniqueFrom.map((n, i) => `${n} field${n === 1 ? "" : "s"} only ${steps.find((x) => x.id === state!.basedOn[i])!.role} had`).join(" and ")} · ${state!.bytes} bytes.`
              : `${added} field${added === 1 ? "" : "s"} marked new${compare === "creator" ? " since the Creator" : removed ? `, ${removed} removed by this role` : ""} · ${state!.bytes} bytes${state!.id === "signer-b" ? " · starts from the updated PSBT, not from Signer A’s" : ""}.`}
      </p>

      {isExtract ? (
        <section class="atlas-panel atlas-psbt-lab__final">
          <h3 class="atlas-panel__title">Network transaction · BIP 174 line {fixture.extracted.line}</h3>
          <dl class="atlas-tx-lab__sizes">
            <div><dt>Size</dt><dd>{extracted.bytes} bytes</dd></div>
            <div><dt>Inputs · outputs</dt><dd>{extracted.inputs} · {extracted.outputs}</dd></div>
            <div><dt>txid</dt><dd><code>{short(extracted.txidHex)}</code></dd></div>
            <div><dt>wtxid</dt><dd><code>{short(extracted.wtxidHex)}</code></dd></div>
          </dl>
          <p class="atlas-panel__scope">This page only replays the published bytes. It does not broadcast anything.</p>
        </section>
      ) : (
        <div class="atlas-psbt-lab__body">
          <div class="atlas-env">
            <p class="atlas-env__magic"><code>70 73 62 74 ff</code> <span>“psbt” + 0xff</span></p>
            {state!.maps.map((m) => (
              <section class="atlas-env__map" data-scope={m.scope} aria-label={`${title(m.scope, m.index)} map`}>
                <h3 class="atlas-env__title">{title(m.scope, m.index)} map</h3>
                <ul class="atlas-env__records">
                  {m.records.map((r) => (
                    <li>
                      <button
                        type="button"
                        class="atlas-env__record"
                        data-status={statusOf(r)}
                        aria-pressed={picked === sig(r)}
                        onClick={() => setPicked(picked === sig(r) ? null : sig(r))}
                      >
                        <span class="atlas-env__type">0x{r.keyType.toString(16).padStart(2, "0")}</span>
                        <span class="atlas-env__name">{r.name}</span>
                        {statusOf(r) === "added" ? <span class="atlas-env__new">new</span> : null}
                        <span class="atlas-env__reading">{r.reading}</span>
                      </button>
                    </li>
                  ))}
                  {(compare === "step" ? m.removed : []).map((r) => (
                    <li class="atlas-env__record" data-status="removed">
                      <span class="atlas-env__type">0x{r.keyType.toString(16).padStart(2, "0")}</span>
                      <span class="atlas-env__name">{r.name}</span>
                      <span class="atlas-env__new">removed</span>
                    </li>
                  ))}
                  {m.records.length === 0 && m.removed.length === 0 ? <li class="atlas-env__empty">empty</li> : null}
                </ul>
              </section>
            ))}
          </div>
          <section class="atlas-panel atlas-psbt-lab__detail" aria-live="polite" aria-label="Field detail">
            {detail ? (
              <>
                <h3 class="atlas-panel__title">{detail.name}</h3>
                <dl class="atlas-node__fields">
                  <div><dt>Map</dt><dd>{title(detail.scope, detail.index)}</dd></div>
                  <div><dt>Key type</dt><dd><code>0x{detail.keyType.toString(16).padStart(2, "0")}</code> {detail.constant ? <code>{detail.constant}</code> : null}</dd></div>
                  <div><dt>Defined in</dt><dd>{detail.parentBip ? `BIP ${detail.parentBip}` : "no registered type"}</dd></div>
                  <div><dt>Key data</dt><dd><code title={detail.keyDataHex}>{short(detail.keyDataHex)}</code></dd></div>
                  <div><dt>Value</dt><dd><code title={detail.valueHex}>{short(detail.valueHex)}</code> ({detail.valueHex.length / 2} bytes)</dd></div>
                  {detail.reading ? <div><dt>Reads as</dt><dd>{detail.reading}</dd></div> : null}
                </dl>
              </>
            ) : (
              <p class="atlas-panel__empty">Select a field to inspect its key, value and the BIP that defines it.</p>
            )}
          </section>
        </div>
      )}
      <p class="atlas-lab__source">
        Trace: BIP 174 test vectors, lines {states[0].line}–{fixture.extracted.line}. Published test material on testnet keys; never use it for funds.
      </p>
    </div>
  );
}
