import { useEffect, useState } from "preact/hooks";
import type { DerivedP2shFixture } from "../types";

const short = (hex: string) => (hex === "" ? "(empty)" : hex.length > 18 ? `${hex.slice(0, 8)}…${hex.slice(-6)}` : hex);
const KIND: Record<string, string> = { legacy: "legacy P2SH", "p2sh-p2wpkh": "P2SH-wrapped P2WPKH", "p2sh-p2wsh": "P2SH-wrapped P2WSH" };

/**
 * p2sh-two-stage.v1 — the P2SH chapter's hero figure.
 *
 * Replays BIP 16's checks on published spends, recorded at build time by the
 * tested model (signatures verified with noble against the computed digests).
 * Nothing here accepts a script or signs.
 */
export function P2shTwoStage({ fixtures, figureId }: { fixtures: DerivedP2shFixture[]; figureId: string }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [revealed, setRevealed] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const [stage, setStage] = useState(0);
  const shownReveal = hydrated ? revealed : true;
  const current = hydrated ? Math.min(stage, d.stages.length - 1) : d.stages.length - 1;

  return (
    <div class="atlas-lab atlas-p2sh-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Pinned spend</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-spend`} checked={x.id === id} onChange={() => (setId(x.id), setStage(0), setRevealed(false))} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented">
            <legend>Redeem script</legend>
            {[false, true].map((v) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-reveal`} checked={revealed === v} onChange={() => setRevealed(v)} />
                <span>{v ? "Revealed" : "Hidden"}<small>{v ? "as the spend shows it" : "as the output shows it"}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">Static view: the first spend with every stage shown. With JavaScript you can switch spends, hide the redeem script and step through the stages.</p>
      )}

      <div class="atlas-p2sh-lab__scripts">
        <div class="atlas-p2sh-lab__box" data-part="output">
          <span class="atlas-p2sh-lab__tag">Output · {d.scriptPubKeyHex.length / 2} bytes</span>
          <code>OP_HASH160 &lt;{short(d.committedHashHex)}&gt; OP_EQUAL</code>
        </div>
        <div class="atlas-p2sh-lab__box" data-part="redeem" data-revealed={shownReveal ? "true" : "false"}>
          <span class="atlas-p2sh-lab__tag">{shownReveal ? `Redeem script · ${d.redeemScriptHex.length / 2} bytes · ${KIND[d.kind]}` : "Redeem script · unknown"}</span>
          {shownReveal ? <code class="atlas-break">{d.redeemAsm}</code> : <span class="atlas-p2sh-lab__hidden">Not visible until the coin is spent. The output holds only its 20-byte hash.</span>}
        </div>
      </div>

      {hydrated ? (
        <div class="atlas-lab__buttons" role="group" aria-label="Step through the evaluations">
          <button type="button" class="manual-plate-button" onClick={() => setStage((n) => Math.max(0, n - 1))} disabled={current === 0}>← Previous stage</button>
          <button type="button" class="manual-plate-button" onClick={() => (setStage((n) => Math.min(d.stages.length - 1, n + 1)), setRevealed(true))} disabled={current >= d.stages.length - 1}>Next stage →</button>
        </div>
      ) : null}

      {!shownReveal ? (
        <p class="atlas-p2sh-lab__before" aria-live="polite">
          Before the spend, the output is all anyone can see: nothing below it can be checked yet. Choose Revealed, or press Next stage, to replay the spend.
        </p>
      ) : (
      <ol class="atlas-p2sh-lab__stages" aria-live="polite">
        {d.stages.map((s, i) => (
          <li class="atlas-stage" data-status={i > current ? "pending" : s.ok ? "pass" : "fail"}>
            <span class="atlas-stage__head">
              <span class="atlas-stage__number">{String(i + 1).padStart(2, "0")}</span>
              <span class="atlas-stage__label">{s.title}</span>
              <span class="atlas-stage__mark" aria-hidden="true">{i > current ? "" : s.ok ? "✓" : "✕"}</span>
            </span>
            {i <= current ? (
              <>
                {s.scriptAsm ? <code class="atlas-p2sh-lab__asm atlas-break">{s.id === "push-only" ? "scriptSig: " : s.id === "hash-match" ? "scriptPubKey: " : "runs: "}{s.scriptAsm}</code> : null}
                {s.stackBefore.length ? (
                  <span class="atlas-p2sh-lab__stack">stack: {s.stackBefore.map((e) => <code>{short(e)}</code>)}</span>
                ) : null}
                {s.steps.length ? (
                  <ol class="atlas-p2sh-lab__steps">
                    {s.steps.map((st) => (
                      <li data-failed={st.failed ? "true" : undefined}>
                        <code>{st.name}</code> {st.note}
                        {st.checks ? <span> · {st.checks.map((c) => `sig ${c.sigIndex + 1} → ${c.keyIndex === null ? "no key" : `key ${c.keyIndex + 1}`}`).join(", ")}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
                <span class="atlas-stage__note">{s.note}</span>
              </>
            ) : (
              <span class="atlas-stage__status">not reached yet</span>
            )}
          </li>
        ))}
      </ol>
      )}
      <p class="atlas-lab__source">
        Source: BIP {f.source.bip} line {f.source.line}. Recorded at build time; signatures verified against digests computed by the tested model.
        {shownReveal && d.kind === "legacy" ? ` BIP 16 sigops counted for this redeem script: ${d.redeemSigops}.` : ""}
      </p>
    </div>
  );
}
