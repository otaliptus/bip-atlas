import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Arrow, Cells, Computer, Drawing, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedPsbtTraceFixture, PsbtRecordView, PsbtStateView } from "../types";
import { MapCard, cardHeight, hex2, mapTitle, shortName, shortRole, type CardRow } from "./cards";

interface Props {
  fixture: DerivedPsbtTraceFixture;
  figureId: string;
  /** Starting step (index into the trace, the extractor last); the no-JS render uses `noJsStep`. */
  initial?: { step: number; compare: Compare };
}

type Compare = "step" | "creator";

const sig = (r: PsbtRecordView) => `${r.scope}/${r.index}/${r.keyType}/${r.keyDataHex}/${r.valueHex}`;

/**
 * psbt-envelope.v1 — the PSBT chapter's hero (drawing-first).
 *
 * The roles of BIP 174's published trace drawn as computers in a row (the
 * two signers both start from the second Updater's PSBT), and below them the
 * envelope itself: the magic bytes and one card per key-value map. A stepper
 * moves the envelope from hand to hand; records a role added get a black
 * type chip, records the finalizer cleared are struck through. A strip compares
 * with the previous state or with the Creator's. Every state is a published
 * PSBT parsed by the tested model; nothing is signed or broadcast.
 */
export function PsbtEnvelope({ fixture, figureId, initial }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { states, extracted } = fixture.derived;
  const steps = [...states.map((s) => ({ id: s.id, role: s.role })), { id: "extractor", role: "Transaction Extractor" }];
  const combinerAt = states.findIndex((s) => s.basedOn.length > 1);
  if (combinerAt < 0) throw new Error(`${fixture.id}: the trace has no combiner step`);
  const [step, setStep] = useState(initial?.step ?? 0);
  const [compare, setCompare] = useState<Compare>(initial?.compare ?? "step");
  // Without JavaScript: the combiner's state, where every field is present at once.
  const at = hydrated || initial ? step : combinerAt;
  const isExtract = steps[at].id === "extractor";
  const state: PsbtStateView = isExtract ? states[states.length - 1] : states[at];
  const creator = new Set(states[0].maps.flatMap((m) => m.records).map(sig));
  const markOf = (r: PsbtRecordView & { status: string }): CardRow["mark"] =>
    isExtract ? undefined : compare === "creator" ? (creator.has(sig(r)) ? undefined : "new") : r.status === "added" && at > 0 ? "new" : undefined;
  const rowsOf = (m: PsbtStateView["maps"][number]): CardRow[] => [
    ...m.records.map((r) => ({ r, mark: markOf(r) })),
    ...(compare === "step" && !isExtract ? m.removed.map((r) => ({ r, mark: "removed" as const })) : []),
  ];
  const all = state.maps.flatMap((m) => m.records);
  const added = all.filter((r) => markOf(r) === "new");
  const removed = state.maps.reduce((n, m) => n + m.removed.length, 0);
  const roleOf = (id: string) => steps.find((x) => x.id === id)!.role;

  const status = isExtract
    ? `Transaction Extractor: every input has final scripts, so it builds the ${extracted.bytes}-byte network transaction. That is no longer a PSBT.`
    : state.basedOn.length === 0
      ? `Creator: the envelope holds the unsigned transaction and one empty map per input and output, ${state.bytes} bytes.`
      : state.uniqueFrom && compare === "step"
        ? `${state.role}: adds nothing of its own. It merges ${state.uniqueFrom.map((n, i) => `${n} field${n === 1 ? "" : "s"} only ${roleOf(state.basedOn[i])} had`).join(" and ")}; ${state.bytes} bytes.`
        : `${state.role}: ${added.length} field${added.length === 1 ? "" : "s"} new${compare === "creator" ? " since the Creator" : ""}${compare === "step" && removed ? `, ${removed} cleared` : ""}; ${state.bytes} bytes.${state.basedOn.length === 1 && at > 0 && state.basedOn[0] !== steps[at - 1].id ? ` It starts from the PSBT of ${shortRole(state.basedOn[0], roleOf(state.basedOn[0]))}, not of ${shortRole(steps[at - 1].id, steps[at - 1].role)}.` : ""}`;

  const describe = () =>
    `${status} ` +
    (isExtract
      ? `Network transaction: ${extracted.inputs} inputs, ${extracted.outputs} outputs, txid ${extracted.txidDisplayHex} (display order).`
      : `Maps: ${state.maps.map((m) => `${mapTitle(m.scope, m.index)}: ${rowsOf(m).map(({ r, mark }) => `${shortName(r)}${mark === "new" ? " (new)" : mark === "removed" ? " (cleared)" : ""}`).join(", ") || "empty"}`).join("; ")}.`);

  /** Every step the current state descends from (itself included): the others are drawn faded. */
  const ancestors = (() => {
    const out = new Set<string>();
    const walk = (id: string) => {
      if (out.has(id)) return;
      out.add(id);
      const st = states.find((x) => x.id === id);
      const from = st ? st.basedOn : id === "extractor" ? [states[states.length - 1].id] : [];
      from.forEach(walk);
    };
    walk(steps[at].id);
    return out;
  })();

  /** The role track: computers left to right; the signers' fork drawn as one arc above and one below. */
  const track = (ids: DrawingIds, wide: boolean) => {
    const per = wide ? steps.length : 4;
    const dx = wide ? 76 : 80;
    const x0 = wide ? 20 : 18;
    const pos = (i: number) => ({ x: x0 + (i % per) * dx, y: (wide ? 22 : 8) + Math.floor(i / per) * 80 });
    const idx = (id: string) => steps.findIndex((s) => s.id === id);
    const edges = steps.slice(1).flatMap((_, j) => {
      const k = j + 1;
      const st = states[k];
      return (st ? st.basedOn.map(idx) : [k - 1]).map((f) => ({ f, k }));
    });
    let skip = 0;
    return (
      <g class="k-track">
        {steps.map((s, i) => {
          const p = pos(i);
          const cur = i === at;
          return (
            <g data-step={s.id} data-current={cur ? "true" : undefined} class={ancestors.has(s.id) ? undefined : "k-faded"}>
              {cur ? <rect class="k-outline k-cell--em" x={p.x - 14} y={p.y - 5} width="54" height="52" style="fill:none" /> : null}
              <Computer at={[p.x, p.y]} label={shortRole(s.id, s.role)} />
            </g>
          );
        })}
        {edges.map(({ f, k }) => {
          const a = pos(f), b = pos(k);
          const on = ancestors.has(steps[f].id) && ancestors.has(steps[k].id);
          let d: string;
          if (a.y === b.y && b.x - a.x === dx) d = `M${a.x + 30} ${a.y + 10} H${b.x - 4}`;
          else if (a.y === b.y) {
            // A skip along the row: the first arcs over the computers, the next under their labels, so they never cross.
            const up = skip++ % 2 === 0;
            d = up
              ? `M${a.x + 13} ${a.y - 2} C${a.x + 13} ${a.y - 16}, ${b.x + 13} ${b.y - 16}, ${b.x + 13} ${b.y - 4}`
              : `M${a.x + 13} ${a.y + 44} C${a.x + 13} ${a.y + 58}, ${b.x + 13} ${b.y + 58}, ${b.x + 13} ${b.y + 46}`;
          } else d = `M${a.x + 13} ${a.y + 44} L${b.x + 13} ${b.y - 4}`;
          return <g class={on ? undefined : "k-faded"}><Arrow d={d} ids={ids} /></g>;
        })}
      </g>
    );
  };

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const W = wide ? 640 : 330;
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const top = wide ? 96 : 144;
    const x0 = wide ? 20 : 15;
    const maps = state.maps;
    // Card placement: wide, one row of five; narrow, global on top, then inputs, then outputs in pairs.
    const place = wide
      ? maps.map((_, k) => ({ x: x0 + k * 124, y: top + 26, w: 120 }))
      : (() => {
          const out: Array<{ x: number; y: number; w: number }> = [];
          let y = top + 26;
          const groups = [maps.filter((m) => m.scope === "global"), maps.filter((m) => m.scope === "input"), maps.filter((m) => m.scope === "output")];
          for (const g of groups) {
            const h = Math.max(...g.map((m) => cardHeight(rowsOf(m).length)));
            g.forEach((_, k) => out.push({ x: x0 + k * 152, y, w: g.length === 1 ? 300 : 148 }));
            y += h + 8;
          }
          return out;
        })();
    const bottom = Math.max(...maps.map((m, k) => place[k].y + cardHeight(rowsOf(m).length)));
    const footY = bottom + 22;
    const H = footY + (isExtract ? 52 : wide ? 28 : 44);
    return (
      <Drawing id={id} width={W} height={H} title="One envelope, many hands" desc={describe()}>
        {track(ids, wide)}
        <g class={isExtract ? "k-faded" : undefined}>
          <Cells x={x0} y={top} values={fixture.derived.magicHex.match(/../g)!} size={16} />
          <Value at={[x0 + 86, top + 12]} text={wide ? `MAGIC “psbt” + 0xff · THIS PSBT: ${state.bytes} B` : `MAGIC · THIS PSBT: ${state.bytes} B`} size={9} cls="k-value--label" />
          {maps.map((m, k) => <MapCard x={place[k].x} y={place[k].y} w={place[k].w} title={mapTitle(m.scope, m.index)} rows={rowsOf(m)} hatch={ids.hatch} />)}
        </g>
        {isExtract ? (
          <>
            <rect class="k-cell k-fill--plain k-cell--em" x={x0} y={footY - 14} width={wide ? 600 : 300} height="20" />
            <Value at={[x0 + 6, footY]} text={`NETWORK TRANSACTION · ${extracted.bytes} B · ${extracted.inputs} IN · ${extracted.outputs} OUT`} size={9} cls="k-value--label" />
            <Value at={[x0, footY + 24]} text={`txid ${extracted.txidDisplayHex.slice(0, 16)}… (display order)`} size={9.5} cls="k-value--hash" />
          </>
        ) : (
          <g>
            <rect class="k-cell k-mark--plain" x={x0} y={footY - 9} width="10" height="10" />
            <Value at={[x0 + 16, footY]} text={compare === "creator" ? "NEW SINCE THE CREATOR" : "NEW IN THIS STEP"} size={9} cls="k-value--label" />
            {compare === "step" ? (
              <>
                <line class="k-strike" x1={x0 + (wide ? 168 : 150)} y1={footY - 4} x2={x0 + (wide ? 182 : 164)} y2={footY - 4} />
                <Value at={[x0 + (wide ? 188 : 170), footY]} text="CLEARED" size={9} cls="k-value--label" />
              </>
            ) : null}
            <rect class="k-cell k-fill--sig" x={x0 + (wide ? 270 : 0)} y={footY - 9 + (wide ? 0 : 16)} width="10" height="10" />
            <Value at={[x0 + (wide ? 286 : 16), footY + (wide ? 0 : 16)]} text="PARTIAL SIGNATURE" size={9} cls="k-value--label" />
            <rect class="k-cell k-fill--public" x={x0 + (wide ? 420 : 150)} y={footY - 9 + (wide ? 0 : 16)} width="10" height="10" />
            <Value at={[x0 + (wide ? 436 : 166), footY + (wide ? 0 : 16)]} text="BIP 32 PATH" size={9} cls="k-value--label" />
          </g>
        )}
      </Drawing>
    );
  };

  const go = (i: number) => setStep(Math.max(0, Math.min(steps.length - 1, i)));
  const newRecs = isExtract ? [] : all.filter((r) => markOf(r) === "new");

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Mark as new">
            {([["step", "Added by this role"], ["creator", "Added since the Creator"]] as const).map(([v, t]) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-compare`} checked={compare === v} onChange={() => setCompare(v)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the Combiner’s PSBT, which holds every update and both signers’ signatures. With JavaScript you can pass the envelope from role to role. Fig. A05.4 shows every step without it.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Advance through the published trace">
          <button type="button" class="atlas-scrub__btn" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous role">←</button>
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={step}
            aria-label="Role in the trace"
            aria-valuetext={`${step + 1} of ${steps.length}: ${steps[step].role}`}
            onInput={(e) => go(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => go(step + 1)} disabled={step === steps.length - 1} aria-label="Next role">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>{isExtract ? "Exact identifiers" : newRecs.length ? `Exact fields marked new (${newRecs.length})` : `Exact fields of this PSBT (${all.length})`}</summary>
        <dl class="atlas-hexlist">
          {isExtract ? (
            <>
              <dt>txid (display order, as BIP 174 and explorers print it)</dt><dd><code class="atlas-break">{extracted.txidDisplayHex}</code></dd>
              <dt>txid (byte order as computed)</dt><dd><code class="atlas-break">{extracted.txidHex}</code></dd>
              <dt>wtxid (byte order as computed)</dt><dd><code class="atlas-break">{extracted.wtxidHex}</code></dd>
            </>
          ) : (
            (newRecs.length ? newRecs : all).map((r) => (
              <>
                <dt>{mapTitle(r.scope, r.index)} · {hex2(r.keyType)} {r.name}{r.parentBip ? ` (BIP ${r.parentBip})` : ""}{r.reading ? `: ${r.reading}` : ""}</dt>
                <dd>key data <code class="atlas-break">{r.keyDataHex || "none"}</code><br />value <code class="atlas-break">{r.valueHex}</code></dd>
              </>
            ))
          )}
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 174 test vectors, lines {states[0].line}–{fixture.extracted.line}: published test material on testnet keys. Parsed, combined and extracted by the tested model.</p>
    </div>
  );
}
