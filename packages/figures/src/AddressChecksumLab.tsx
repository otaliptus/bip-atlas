import { useEffect, useMemo, useState } from "preact/hooks";
import { holdFocus } from "./focus";
import {
  BECH32M_CONST,
  BECH32_CONST,
  CHARSET,
  STAGES,
  analyzeSegwitAddress,
  formatResidue,
  type AddressAnalysis,
} from "@bip-atlas/models/bech32";
import { ROLE_LABELS, familyName, roleRuns, stageLabel, summarize } from "./describe";
import type { AddressFixture } from "./types";

interface Props {
  fixtures: AddressFixture[];
  /** Used to build unique element IDs. */
  figureId: string;
}

/**
 * address-checksum-lab.v1 — the chapter's hero figure.
 *
 * One state model drives the ribbon, the stage pipeline, the residue
 * comparison, the script view and the announced caption. Inputs are limited
 * to reviewed public fixtures and single substitutions from the Bech32
 * alphabet; there is no free-text address field and no correction.
 */
export function AddressChecksumLab({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const original = fixture.address;
  const dataStart = original.lastIndexOf("1") + 1;
  const [edit, setEdit] = useState<{ index: number; char: string } | null>(null);
  const [cursor, setCursor] = useState(original.length - 1);

  const text = edit ? original.slice(0, edit.index) + edit.char + original.slice(edit.index + 1) : original;
  const analysis = useMemo(() => analyzeSegwitAddress(text, fixture.network), [text, fixture.network]);
  const roles = useMemo(() => analyzeSegwitAddress(original, fixture.network).roles, [original, fixture.network]);

  const chooseFixture = (id: string) => {
    const next = fixtures.find((f) => f.id === id)!;
    setFixtureId(id);
    setEdit(null);
    setCursor(next.address.length - 1);
  };

  const moveCursor = (delta: number) =>
    setCursor((c) => Math.min(original.length - 1, Math.max(dataStart, c + delta)));

  /** Step the character at the cursor through the alphabet; only one edit exists at a time. */
  const stepCharacter = (delta: number) => {
    const upper = original === original.toUpperCase();
    const current = (edit && edit.index === cursor ? edit.char : original[cursor]).toLowerCase();
    let value = CHARSET.indexOf(current);
    value = (value + delta + CHARSET.length) % CHARSET.length;
    const char = upper ? CHARSET[value].toUpperCase() : CHARSET[value];
    setEdit(char === original[cursor] ? null : { index: cursor, char });
  };

  const onRibbonKey = (event: KeyboardEvent) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => moveCursor(-1),
      ArrowRight: () => moveCursor(1),
      ArrowUp: () => stepCharacter(1),
      ArrowDown: () => stepCharacter(-1),
      Home: () => setCursor(dataStart),
      End: () => setCursor(original.length - 1),
      Escape: () => setEdit(null),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  const editSentence = edit
    ? `You changed position ${edit.index + 1} (${ROLE_LABELS[roles[edit.index]].toLowerCase()}) from “${original[edit.index]}” to “${edit.char}”.`
    : "";
  const ids = {
    status: `${figureId}-status`,
    ribbonHelp: `${figureId}-ribbon-help`,
  };
  const chars = [...text];
  const cursorRole = ROLE_LABELS[roles[cursor]].toLowerCase();

  return (
    <div class="atlas-lab" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <fieldset class="atlas-lab__samples">
          <legend>Public sample</legend>
          {fixtures.map((f) => (
            <label class="atlas-choice">
              <input
                type="radio"
                name={`${figureId}-sample`}
                value={f.id}
                checked={f.id === fixtureId}
                onChange={() => chooseFixture(f.id)}
              />
              <span>
                {f.label}
                {f.shortLabel ? <small>{f.shortLabel}</small> : null}
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p class="atlas-lab__static-note">
          Static view of the first sample, <strong>{fixture.label}</strong>. With JavaScript you can switch samples and
          change characters; the table after this figure lists every sample’s result either way.
        </p>
      )}

      <div class="atlas-lab__ribbon-wrap">
        <div
          class="atlas-ribbon"
          role={hydrated ? "group" : undefined}
          tabIndex={hydrated ? 0 : undefined}
          aria-label={hydrated ? "Address characters, one editable at a time" : undefined}
          aria-describedby={hydrated ? ids.ribbonHelp : undefined}
          onKeyDown={hydrated ? onRibbonKey : undefined}
        >
          {roleRuns(roles).map((run) => (
            <span class="atlas-ribbon__run" data-role={run.role}>
              <span class="atlas-ribbon__cells">
                {chars.slice(run.start, run.end).map((c, offset) => {
                  const i = run.start + offset;
                  const editable = hydrated && i >= dataStart;
                  return (
                    <span
                      class="atlas-cell"
                      data-role={run.role}
                      data-cursor={hydrated && i === cursor ? "true" : undefined}
                      data-edited={edit?.index === i ? "true" : undefined}
                      onClick={editable ? () => setCursor(i) : undefined}
                      aria-hidden="true"
                    >
                      {c}
                    </span>
                  );
                })}
              </span>
              <span class="atlas-ribbon__label" aria-hidden="true">{ROLE_LABELS[run.role]}</span>
            </span>
          ))}
        </div>
        <p class="manual-sr-only">Current string: {text}</p>
        {/* The cells are hidden from assistive technology, so the cursor's position and character are announced here. */}
        {hydrated ? <p class="manual-sr-only" aria-live="polite">Position {cursor + 1} of {original.length}, {cursorRole}: “{chars[cursor]}”.</p> : null}
      </div>

      {hydrated ? (
        <div class="atlas-lab__edit">
          <p id={ids.ribbonHelp} class="atlas-lab__position">
            Position <strong>{cursor + 1}</strong> of {original.length} · {cursorRole}
            <span class="atlas-lab__keys"> · Arrow keys on the address move and change; Esc restores</span>
          </p>
          <div class="atlas-lab__buttons" role="group" aria-label="Change one character">
            <button type="button" class="manual-plate-button" onClick={() => moveCursor(-1)} disabled={cursor <= dataStart}>
              ← Previous position
            </button>
            <button type="button" class="manual-plate-button" onClick={() => moveCursor(1)} disabled={cursor >= original.length - 1}>
              Next position →
            </button>
            <button type="button" class="manual-plate-button" onClick={() => stepCharacter(1)}>
              Change character ↑
            </button>
            <button type="button" class="manual-plate-button" onClick={() => stepCharacter(-1)}>
              Change character ↓
            </button>
            <button type="button" class="manual-plate-button" onClick={() => setEdit(null)} disabled={!edit}>
              Restore original
            </button>
          </div>
        </div>
      ) : null}

      <StagePipeline analysis={analysis} />

      <div class="atlas-lab__panels">
        <ResiduePanel analysis={analysis} />
        <ResultPanel analysis={analysis} />
      </div>

      <p class="atlas-lab__status" id={ids.status} aria-live="polite">
        <span class="atlas-lab__verdict" data-valid={analysis.valid ? "true" : "false"}>
          {analysis.valid ? "✓ Accepted" : "✕ Rejected"}
        </span>{" "}
        {editSentence} {summarize(analysis)}
      </p>
      <p class="atlas-lab__source">
        Sample source: BIP {fixture.source.bip}, line {fixture.source.line} ({fixture.source.section}).
        Public test material; never send funds to it.
      </p>
    </div>
  );
}

function StagePipeline({ analysis }: { analysis: AddressAnalysis }) {
  return (
    <ol class="atlas-pipeline" aria-label="Validation stages, in order">
      {analysis.stages.map((stage, i) => {
        const definition = STAGES[i];
        const statusText = { pass: "passed", fail: "stopped here", "not-reached": "not reached" }[stage.status];
        return (
          <li class="atlas-stage" data-status={stage.status}>
            <span class="atlas-stage__head">
              <span class="atlas-stage__number">{String(i + 1).padStart(2, "0")}</span>
              <span class="atlas-stage__label">{definition.label}</span>
              <span class="atlas-stage__mark" aria-hidden="true">
                {stage.status === "pass" ? "✓" : stage.status === "fail" ? "✕" : "–"}
              </span>
            </span>
            <span class="atlas-stage__status">{statusText}</span>
            <span class="atlas-stage__question">{definition.question}</span>
            {stage.note ? <span class="atlas-stage__note">{stage.note}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function ResiduePanel({ analysis }: { analysis: AddressAnalysis }) {
  const rows = [
    { name: "Bech32", constant: BECH32_CONST },
    { name: "Bech32m", constant: BECH32M_CONST },
  ];
  return (
    <section class="atlas-panel" aria-label="Checksum comparison">
      <h3 class="atlas-panel__title">Compare checksum families</h3>
      {analysis.residue === null ? (
        <p class="atlas-panel__empty">
          Not computed: the string was stopped at the {stageLabel(analysis.failedStage!).toLowerCase()} stage,
          before any checksum arithmetic.
        </p>
      ) : (
        <>
          <p class="atlas-residue">
            <span class="atlas-residue__label">polymod result</span>
            <code class="atlas-residue__value">{formatResidue(analysis.residue)}</code>
          </p>
          <table class="atlas-residue__table">
            <thead>
              <tr>
                <th scope="col">Family</th>
                <th scope="col">Requires</th>
                <th scope="col">Match</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const match = analysis.residue === row.constant;
                return (
                  <tr data-match={match ? "true" : "false"}>
                    <th scope="row">{row.name}</th>
                    <td><code>{formatResidue(row.constant)}</code></td>
                    <td>{match ? "✓ yes" : "✕ no"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function ResultPanel({ analysis }: { analysis: AddressAnalysis }) {
  if (!analysis.valid) {
    return (
      <section class="atlas-panel" aria-label="Decoder result">
        <h3 class="atlas-panel__title">Decoder result</h3>
        <p class="atlas-panel__refusal">
          <strong>Refused.</strong> A decoder must reject this string. This one offers no corrected version: BIP 173
          advises leaving correction to the user, who can check the original.
        </p>
      </section>
    );
  }
  const script = analysis.scriptPubKeyHex!;
  const version = analysis.witnessVersion!;
  const program = analysis.programHex!;
  return (
    <section class="atlas-panel" aria-label="Decoder result">
      <h3 class="atlas-panel__title">Decoder result: scriptPubKey</h3>
      <p class="atlas-script">
        <span class="atlas-script__part" data-part="opcode">
          <code>{script.slice(0, 2)}</code>
          <span>OP_{version}</span>
        </span>
        <span class="atlas-script__part" data-part="length">
          <code>{script.slice(2, 4)}</code>
          <span>push {program.length / 2} bytes</span>
        </span>
        <span class="atlas-script__part" data-part="program">
          <code>{program.match(/.{1,8}/g)!.join(" ")}</code>
          <span>witness program, {familyName(analysis.encoding!)} checked</span>
        </span>
      </p>
      <p class="atlas-panel__scope">Checks encoding only: not ownership, balance, or whether sending is safe.</p>
    </section>
  );
}
