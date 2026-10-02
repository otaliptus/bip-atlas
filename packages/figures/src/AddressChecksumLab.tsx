import { useEffect, useMemo, useState } from "preact/hooks";
import { holdFocus } from "./focus";
import { BECH32M_CONST, BECH32_CONST, CHARSET, STAGES, analyzeSegwitAddress, formatResidue, type CharacterRole } from "@bip-atlas/models/bech32";
import { Drawing, Machine, Responsive, Value, idsFor } from "./kit";
import type { Role } from "./kit";
import { ROLE_LABELS, familyName, stageLabel, summarize } from "./describe";
import type { AddressFixture } from "./types";

interface Props {
  fixtures: AddressFixture[];
  /** Used to build unique element IDs. */
  figureId: string;
  /** Starting state; the no-JS render uses it too. */
  initial?: { fixtureId: string; edit: { index: number; char: string } | null; cursor?: number };
}

/** Fill for each part of an address (the label is the second cue). */
export const ROLE_FILL: Record<CharacterRole, Role> = { hrp: "net", separator: "plain", version: "plain", program: "plain", checksum: "check", unparsed: "plain" };

/**
 * address-checksum-lab.v1 — the Addresses chapter's hero (drawing-first).
 *
 * The address as a ribbon of character cells coloured by part, the decoder's
 * six checks as a row of gates, the polymod residue held against the two
 * constants, and the script a valid address becomes. A sample strip, a
 * position slider and next/previous-letter buttons change one character at a
 * time; the tested bech32 model re-runs every check. There is no free-text
 * field and no correction.
 */
export function AddressChecksumLab({ fixtures, figureId, initial }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const start = initial ?? { fixtureId: fixtures[0].id, edit: null };
  const [fixtureId, setFixtureId] = useState(start.fixtureId);
  const fixture = fixtures.find((f) => f.id === fixtureId);
  if (!fixture) throw new Error(`address-checksum-lab.v1: no fixture ${fixtureId}`);
  const original = fixture.address;
  const dataStart = original.lastIndexOf("1") + 1;
  const [edit, setEdit] = useState(start.edit);
  const [cursor, setCursor] = useState(start.cursor ?? original.length - 1);
  const text = edit ? original.slice(0, edit.index) + edit.char + original.slice(edit.index + 1) : original;
  const analysis = useMemo(() => analyzeSegwitAddress(text, fixture.network), [text, fixture.network]);
  const roles = useMemo(() => analyzeSegwitAddress(original, fixture.network).roles, [original, fixture.network]);

  const choose = (id: string) => {
    const next = fixtures.find((f) => f.id === id)!;
    setFixtureId(id);
    setEdit(null);
    setCursor(next.address.length - 1);
  };
  const step = (delta: number) => {
    const upper = original === original.toUpperCase();
    const current = (edit && edit.index === cursor ? edit.char : original[cursor]).toLowerCase();
    const v = (CHARSET.indexOf(current) + delta + CHARSET.length) % CHARSET.length;
    const char = upper ? CHARSET[v].toUpperCase() : CHARSET[v];
    setEdit(char === original[cursor] ? null : { index: cursor, char });
  };
  const moveTo = (i: number) => {
    setCursor(i);
    if (edit && edit.index !== i) setEdit(null);
  };

  const editSentence = edit ? `You changed position ${edit.index + 1} (${ROLE_LABELS[roles[edit.index]].toLowerCase()}) from “${original[edit.index]}” to “${edit.char}”. ` : "";
  const status = `${editSentence}${summarize(analysis)}`;
  const chars = [...text];

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const W = wide ? 640 : 330;
    const perRow = wide ? (chars.length <= 42 ? chars.length : Math.ceil(chars.length / 2)) : 24;
    const cell = Math.min(15, (W - 24) / perRow);
    const x0 = (W - perRow * cell) / 2;
    const rows = Math.ceil(chars.length / perRow);
    const rib = 26;
    const at = (i: number): [number, number] => [x0 + (i % perRow) * cell, rib + Math.floor(i / perRow) * (cell + 10)];
    const legendY = rib + rows * (cell + 10) + 6;
    const gatesY = legendY + (wide ? 38 : 54);
    const perGate = wide ? 6 : 3;
    const gw = (W - 24) / perGate;
    const gatesH = Math.ceil(STAGES.length / perGate) * 44;
    const cmpY = gatesY + gatesH + 24;
    const resY = cmpY + (wide ? 92 : 104);
    const H = resY + 46;
    const parts: Array<{ role: CharacterRole; label: string }> = [
      { role: "hrp", label: "PREFIX" },
      { role: "separator", label: "SEPARATOR" },
      { role: "version", label: "VERSION" },
      { role: "program", label: "PROGRAM" },
      { role: "checksum", label: "CHECKSUM" },
    ];
    const residue = analysis.residue;
    const slots = [
      { name: "BECH32", value: BECH32_CONST },
      { name: "BECH32M", value: BECH32M_CONST },
    ];
    return (
      <Drawing id={id} width={W} height={H} title="Checksum lab" desc={`The string ${text}. ${status}`}>
        <Value at={[x0, 14]} text={`${fixture.label.toUpperCase()} · ${chars.length} CHARACTERS`} size={9} cls="k-value--label" />
        {chars.map((c, i) => {
          const [x, y] = at(i);
          const edited = edit?.index === i;
          const role = roles[i] ?? "unparsed";
          return (
            <g>
              <rect class={`k-cell ${edited ? "k-mark--plain" : `k-fill--${ROLE_FILL[role]}`}${role === "version" ? " k-cell--em" : ""}`} x={x} y={y} width={cell} height={cell} />
              <text class={`k-cell__t${edited ? " k-cell__t--on" : ""}`} x={x + cell / 2} y={y + cell / 2 + 3.4} text-anchor="middle">{c}</text>
              {hydrated && i === cursor ? <path class="k-ad-caret" d={`M${x + cell / 2 - 4} ${y + cell + 7} L${x + cell / 2} ${y + cell + 2} L${x + cell / 2 + 4} ${y + cell + 7} Z`} /> : null}
            </g>
          );
        })}
        {parts.map((p, k) => {
          const lx = x0 + (wide ? k * 100 : (k % 3) * 104);
          const ly = legendY + (wide ? 0 : Math.floor(k / 3) * 16);
          return (
            <g>
              <rect class={`k-cell k-fill--${ROLE_FILL[p.role]}${p.role === "version" ? " k-cell--em" : ""}`} x={lx} y={ly} width="9" height="9" />
              <Value at={[lx + 13, ly + 8]} text={p.label} size={9} cls="k-value--label" />
            </g>
          );
        })}
        {/* The decoder's checks, in order. */}
        <Value at={[12, gatesY - 6]} text="THE DECODER’S CHECKS, IN ORDER" size={9} cls="k-value--label" />
        {analysis.stages.map((s, k) => {
          const x = 12 + (k % perGate) * gw;
          const y = gatesY + Math.floor(k / perGate) * 44;
          const fail = s.status === "fail";
          const hidden = s.status === "not-reached";
          return (
            <g data-stage={s.id} data-status={s.status}>
              <rect class={`k-cell ${fail ? "k-mark--plain" : "k-fill--plain"}`} x={x + 2} y={y} width={gw - 6} height="34" style={hidden ? `fill:${ids.hatch}` : undefined} />
              {hidden ? <rect class="k-hd-chip" x={x + 5} y={y + 4} width={gw - 14} height="27" /> : null}
              <Value at={[x + 8, y + 14]} text={`${String(k + 1).padStart(2, "0")} ${stageLabel(s.id).toUpperCase()}`} size={9} cls={fail ? "k-value--on" : ""} />
              <Value at={[x + 8, y + 27]} text={s.status === "pass" ? "✓ PASSED" : fail ? "✕ STOPPED HERE" : "NOT REACHED"} size={9} cls={fail ? "k-value--on" : hidden ? "k-value--muted" : "k-value--label"} />
            </g>
          );
        })}
        {/* The residue against the two constants. */}
        <Value at={[12, cmpY - 6]} text="COMPARE CHECKSUM FAMILIES" size={9} cls="k-value--label" />
        <Machine at={[44, cmpY + 26]} w={74} d={26} h={20} label="POLYMOD" role="check" />
        {residue === null ? (
          <Value at={[142, cmpY + 30]} text={`NOT COMPUTED: STOPPED AT ${stageLabel(analysis.failedStage!).toUpperCase()}`} size={9} cls="k-value--muted" />
        ) : (
          <>
            <Value at={[142, cmpY + 14]} text="RESIDUE" size={9} cls="k-value--label" />
            <Value at={[142, cmpY + 30]} text={formatResidue(residue)} size={11} />
            {residue !== BECH32_CONST && residue !== BECH32M_CONST ? <Value at={[226, cmpY + 30]} text="✕ NEITHER" size={9} cls="k-value--label" /> : null}
            {slots.map((sl, k) => {
              const match = residue === sl.value;
              const sx = wide ? 300 + k * 160 : 142 + k * 92;
              const sy = wide ? cmpY + 4 : cmpY + 42;
              return (
                <g>
                  <rect class={`k-cell k-fill--check${match ? " k-cell--em" : ""}`} x={sx} y={sy} width={wide ? 150 : 86} height="34" />
                  <Value at={[sx + 6, sy + 13]} text={`${sl.name}${match ? " ✓" : ""}`} size={9} cls="k-value--label" />
                  <Value at={[sx + 6, sy + 27]} text={formatResidue(sl.value)} size={9.5} />
                </g>
              );
            })}
          </>
        )}
        {/* What the decoder returns. */}
        <Value at={[12, resY]} text={analysis.valid ? "DECODER RESULT · scriptPubKey" : "DECODER RESULT"} size={9} cls="k-value--label" />
        {analysis.valid ? (
          (() => {
            const spk = analysis.scriptPubKeyHex!;
            const prog = analysis.programHex!;
            const opW = 70, pushW = 70;
            return (
              <>
                <rect class="k-cell k-fill--plain" x="12" y={resY + 8} width={opW} height="26" />
                <Value at={[18, resY + 20]} text={spk.slice(0, 2)} size={9.5} />
                <Value at={[18, resY + 31]} text={`OP_${analysis.witnessVersion}`} size={9} cls="k-value--label" />
                <rect class="k-cell k-fill--plain" x={12 + opW} y={resY + 8} width={pushW} height="26" />
                <Value at={[18 + opW, resY + 20]} text={spk.slice(2, 4)} size={9.5} />
                <Value at={[18 + opW, resY + 31]} text={`PUSH ${prog.length / 2}`} size={9} cls="k-value--label" />
                <rect class="k-cell k-fill--plain" x={12 + opW + pushW} y={resY + 8} width={W - 24 - opW - pushW} height="26" />
                <Value at={[18 + opW + pushW, resY + 20]} text={`${prog.slice(0, wide ? 24 : 10)}…`} size={9.5} />
                <Value at={[18 + opW + pushW, resY + 31]} text={`PROGRAM · ${familyName(analysis.encoding!).toUpperCase()} CHECKED`} size={9} cls="k-value--label" />
              </>
            );
          })()
        ) : (
          <>
            <rect class="k-cell k-mark--plain" x="12" y={resY + 8} width={W - 24} height="26" />
            <Value at={[20, resY + 25]} text="REFUSED · NO CORRECTED VERSION OFFERED" size={9} cls="k-value--on" />
          </>
        )}
      </Drawing>
    );
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Public sample">
            {fixtures.map((f) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-sample`} checked={f.id === fixtureId} onChange={() => choose(f.id)} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          <div class="atlas-strip-row" role="group" aria-label="Change one character">
            <button type="button" class="atlas-scrub__btn atlas-ad-btn" onClick={() => step(-1)}>Previous letter</button>
            <button type="button" class="atlas-scrub__btn atlas-ad-btn" onClick={() => step(1)}>Next letter</button>
            <button type="button" class="atlas-scrub__btn atlas-ad-btn" onClick={() => setEdit(null)} disabled={!edit}>Restore</button>
          </div>
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: {fixture.label}{edit ? `, with position ${edit.index + 1} changed` : ""}. With JavaScript you can switch samples and change any one character after the separator; the table after this figure lists every sample’s result either way.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Position to change">
          <button type="button" class="atlas-scrub__btn" onClick={() => moveTo(Math.max(dataStart, cursor - 1))} disabled={cursor <= dataStart} aria-label="Previous position">←</button>
          <input
            type="range"
            min={dataStart}
            max={original.length - 1}
            value={cursor}
            aria-label="Position"
            aria-valuetext={`position ${cursor + 1} of ${original.length}, ${ROLE_LABELS[roles[cursor]].toLowerCase()}: “${chars[cursor]}”`}
            onInput={(e) => moveTo(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => moveTo(Math.min(original.length - 1, cursor + 1))} disabled={cursor >= original.length - 1} aria-label="Next position">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">
        <span class="atlas-lab__verdict" data-valid={analysis.valid ? "true" : "false"}>{analysis.valid ? "✓ Accepted" : "✕ Rejected"}</span> {status}
      </p>
      <details class="atlas-disclosure">
        <summary>Exact values for this string</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>String</dt><dd><code class="atlas-break">{text}</code></dd>
          {analysis.residue !== null ? <><dt>Polymod residue</dt><dd><code>{formatResidue(analysis.residue)}</code></dd></> : null}
          {analysis.valid ? <><dt>Witness program</dt><dd><code class="atlas-break">{analysis.programHex}</code></dd><dt>scriptPubKey</dt><dd><code class="atlas-break">{analysis.scriptPubKeyHex}</code></dd></> : null}
        </dl>
      </details>
      <p class="atlas-hero__source">Sample: BIP {fixture.source.bip}, line {fixture.source.line} ({fixture.source.section}). Public test material; never send funds to it.</p>
    </div>
  );
}

