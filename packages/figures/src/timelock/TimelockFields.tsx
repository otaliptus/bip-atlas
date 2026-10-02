import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import {
  checkLockTimeVerify,
  checkSequenceVerify,
  LOCKTIME_THRESHOLD,
  SEQUENCE_FINAL,
  SEQUENCE_LOCKTIME_DISABLE_FLAG,
  SEQUENCE_LOCKTIME_MASK,
  SEQUENCE_LOCKTIME_TYPE_FLAG,
} from "@bip-atlas/models/timelock";
import type { DerivedTimelockCaseFixture, TimelockCheckView } from "../types";

interface Props {
  fixtures: DerivedTimelockCaseFixture[];
  figureId: string;
}

type Mode = "absolute" | "relative";
interface Edits {
  version: number;
  nLockTime: number;
  nSequence: number;
}

const hex32 = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;
const num = (n: number | bigint) => n.toLocaleString("en-US");
const utc = (s: number) => new Date(s * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");

/** A rough duration, for comparing units only. */
function span(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86_400 * 2) return `${(seconds / 3600).toFixed(1)} h`;
  const YEAR = 86_400 * 365.25;
  if (seconds < YEAR) return `${(seconds / 86_400).toFixed(1)} days`;
  return `${(seconds / YEAR).toFixed(2)} years`;
}

/** What each bit of nSequence means under BIP 68 (when bit 31 is clear). */
function bitRole(b: number, disabled: boolean): "disable" | "type" | "value" | "unused" {
  if (b === 31) return "disable";
  if (disabled) return "unused"; // with bit 31 set, BIP 68 gives the other 31 bits no meaning
  if (b === 22) return "type";
  if (b <= 15) return "value";
  return "unused";
}
const ROLE_TEXT = { disable: "disable flag", type: "type flag (set: 512-second units)", value: "lock-time value", unused: "no meaning under BIP 68" };

function Checks({ checks, valid }: { checks: TimelockCheckView[]; valid: boolean }) {
  return (
    <ol class="atlas-tl-checks">
      {checks.map((c) => (
        <li data-ok={c.ok ? "true" : "false"} data-stop={c.stopsHere ? "true" : undefined}>
          <span class="atlas-tl-checks__mark" aria-hidden="true">{c.ok ? "✓" : "✕"}</span>
          <span class="atlas-tl-checks__label">{c.label}</span>
          <span class="atlas-tl-checks__detail">{c.detail}</span>
        </li>
      ))}
      <li class="atlas-tl-checks__result" data-ok={valid ? "true" : "false"}>
        <span class="atlas-tl-checks__mark" aria-hidden="true">{valid ? "✓" : "✕"}</span>
        <span class="atlas-tl-checks__label">{valid ? "Script continues: the spend is valid" : "Script fails: the spend is invalid"}</span>
      </li>
    </ol>
  );
}

/**
 * timelock-fields.v1 — the Timelocks chapter's hero figure.
 *
 * Bitcoin Core's own CLTV/CSV test transactions, with the checks BIP 65 and
 * BIP 112 make. The pinned cases are evaluated at build time (and the build
 * fails unless every verdict matches Core's label); edited fields are
 * re-evaluated in the browser by the same tested model and marked as edits.
 */
export function TimelockFields({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const byMode = (m: Mode) => fixtures.filter((f) => f.lock === m);
  const [mode, setMode] = useState<Mode>(fixtures[0].lock);
  const [id, setId] = useState(fixtures[0].id);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const original: Edits = { version: d.version, nLockTime: d.nLockTime, nSequence: d.nSequence };
  const [edits, setEdits] = useState<Edits>(original);
  const [compare, setCompare] = useState(false);

  const choose = (x: DerivedTimelockCaseFixture) => {
    setId(x.id);
    setEdits({ version: x.derived.version, nLockTime: x.derived.nLockTime, nSequence: x.derived.nSequence });
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    choose(byMode(m)[0]);
  };

  const e = hydrated ? edits : original;
  const modified = e.version !== d.version || e.nLockTime !== d.nLockTime || e.nSequence !== d.nSequence;
  const fields = { version: e.version, nLockTime: e.nLockTime, sequences: [e.nSequence] };
  const live = modified
    ? (() => {
        const arg = BigInt(d.argument);
        const r = d.opcode === "CHECKLOCKTIMEVERIFY" ? checkLockTimeVerify(arg, fields, 0) : checkSequenceVerify(arg, fields, 0);
        return { checks: r.checks as TimelockCheckView[], valid: r.ok && (d.trailingOne || arg !== 0n) };
      })()
    : { checks: d.checks, valid: d.valid };

  const set = (patch: Partial<Edits>) => setEdits({ ...e, ...patch });
  const isTime = d.opcode === "CHECKLOCKTIMEVERIFY" ? e.nLockTime >= LOCKTIME_THRESHOLD : (e.nSequence & SEQUENCE_LOCKTIME_TYPE_FLAG) !== 0;
  const value16 = e.nSequence & SEQUENCE_LOCKTIME_MASK;
  const relActive = e.version >= 2 && (e.nSequence & SEQUENCE_LOCKTIME_DISABLE_FLAG) === 0;

  return (
    <div class="atlas-lab atlas-tl-lab" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-segmented">
            <legend>Lock</legend>
            {(["absolute", "relative"] as const).map((m) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-mode`} checked={mode === m} onChange={() => switchMode(m)} />
                <span>{m === "absolute" ? "Absolute" : "Relative"}<small>{m === "absolute" ? "nLockTime · CHECKLOCKTIMEVERIFY" : "nSequence · CHECKSEQUENCEVERIFY"}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-lab__samples">
            <legend>Bitcoin Core test case</legend>
            {byMode(mode).map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-case`} checked={x.id === id} onChange={() => choose(x)} />
                <span>{x.label}<small>{x.shortLabel} · Core: {x.expected}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view: the first absolute-lock case, with the checks it passes or fails. With JavaScript you can switch to relative locks, pick any of the
          {" "}{fixtures.length} cases, change the transaction’s fields and compare height and time units.
        </p>
      )}

      <div class="atlas-tl-script">
        <span class="atlas-tl-script__tag">Locking script (the spent output)</span>
        <code>{d.asm.replace(/(CHECKLOCKTIMEVERIFY|CHECKSEQUENCEVERIFY)/, "OP_$1")}</code>
        <span class="atlas-tl-script__note">
          Argument {num(BigInt(d.argument))}
          {d.opcode === "CHECKSEQUENCEVERIFY" && BigInt(d.argument) >= 0n ? ` = ${hex32(Number(BigInt(d.argument) & 0xffffffffn))}` : ""}
        </span>
      </div>

      <section class="atlas-panel atlas-tl-fields" aria-label="The spending transaction's fields">
        <h3 class="atlas-panel__title">Spending transaction{modified ? " · edited" : ""}</h3>
        <dl class="atlas-tl-fields__list">
          <div data-focus={d.opcode === "CHECKSEQUENCEVERIFY" ? "true" : undefined}>
            <dt>nVersion</dt>
            <dd>
              {e.version}
              {hydrated && d.opcode === "CHECKSEQUENCEVERIFY" ? (
                <button type="button" class="manual-plate-button atlas-tl-btn" onClick={() => set({ version: e.version >= 2 ? 1 : 2 })}>Set to {e.version >= 2 ? 1 : 2}</button>
              ) : null}
            </dd>
          </div>
          <div data-focus={d.opcode === "CHECKLOCKTIMEVERIFY" ? "true" : undefined}>
            <dt>nLockTime</dt>
            <dd>
              {num(e.nLockTime)} <small>({e.nLockTime >= LOCKTIME_THRESHOLD ? "a time" : "a height"})</small>
              {hydrated && d.opcode === "CHECKLOCKTIMEVERIFY" ? (
                <span class="atlas-tl-btns">
                  <button type="button" class="manual-plate-button atlas-tl-btn" disabled={e.nLockTime === 0} onClick={() => set({ nLockTime: e.nLockTime - 1 })}>− 1</button>
                  <button type="button" class="manual-plate-button atlas-tl-btn" disabled={e.nLockTime === 0xffffffff} onClick={() => set({ nLockTime: e.nLockTime + 1 })}>+ 1</button>
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>input 0 nSequence</dt>
            <dd>
              <code>{hex32(e.nSequence)}</code> <small>{e.nSequence === SEQUENCE_FINAL ? "(final)" : ""}</small>
              {hydrated && d.opcode === "CHECKLOCKTIMEVERIFY" ? (
                <button type="button" class="manual-plate-button atlas-tl-btn" onClick={() => set({ nSequence: e.nSequence === SEQUENCE_FINAL ? (d.nSequence === SEQUENCE_FINAL ? 0xfffffffe : d.nSequence) : SEQUENCE_FINAL })}>
                  {e.nSequence === SEQUENCE_FINAL ? "Make non-final" : "Make final"}
                </button>
              ) : null}
            </dd>
          </div>
        </dl>

        {d.opcode === "CHECKSEQUENCEVERIFY" ? (
          <div class="atlas-tl-bits" role="group" aria-label={`nSequence bits, 31 down to 0${hydrated ? "; press a bit to flip it" : ""}`}>
            {Array.from({ length: 32 }, (_, k) => 31 - k).map((b) => {
              const on = ((e.nSequence >>> b) & 1) === 1;
              const role = bitRole(b, (e.nSequence & SEQUENCE_LOCKTIME_DISABLE_FLAG) !== 0);
              const label = `bit ${b}, ${ROLE_TEXT[role]}, ${on ? "set" : "clear"}`;
              return hydrated ? (
                <button type="button" class="atlas-tl-bit" data-role={role} data-on={on ? "true" : "false"} aria-pressed={on} aria-label={label} title={label} onClick={() => set({ nSequence: (e.nSequence ^ (2 ** b)) >>> 0 })}>
                  {on ? "1" : "0"}
                </button>
              ) : (
                <span class="atlas-tl-bit" data-role={role} data-on={on ? "true" : "false"} title={label}>{on ? "1" : "0"}</span>
              );
            })}
          </div>
        ) : null}
        {d.opcode === "CHECKSEQUENCEVERIFY" ? (
          <p class="atlas-tl-bits__key">
            <span data-role="disable">bit 31 disable</span> <span data-role="type">bit 22 type</span> <span data-role="value">bits 0–15 value</span> <span data-role="unused">no meaning</span>
          </p>
        ) : null}
        {hydrated && modified ? (
          <button type="button" class="manual-plate-button" onClick={() => setEdits(original)}>Reset to the Core case</button>
        ) : null}
      </section>

      <section class="atlas-panel atlas-tl-result" aria-live="polite" aria-label="Checks">
        <h3 class="atlas-panel__title">{d.opcode === "CHECKLOCKTIMEVERIFY" ? "BIP 65’s checks, in order" : "BIP 112’s checks, in order"}</h3>
        <Checks checks={live.checks} valid={live.valid} />
        <p class="atlas-tl-result__label">
          {modified
            ? "Edited fields: not a Core test case. Result from this site’s tested model."
            : `Bitcoin Core labels this case ${f.expected}; the model agrees.`}
        </p>
      </section>

      {hydrated ? (
        <label class="atlas-tl-compare">
          <input type="checkbox" checked={compare} onChange={(ev) => setCompare((ev.target as HTMLInputElement).checked)} />
          Compare height and time units
        </label>
      ) : null}
      {hydrated && compare ? (
        <section class="atlas-panel atlas-tl-units" aria-label="Height and time readings">
          {d.opcode === "CHECKLOCKTIMEVERIFY" ? (
            <>
              <h3 class="atlas-panel__title">nLockTime {num(e.nLockTime)}, read both ways</h3>
              <ul class="atlas-tl-units__rows">
                <li data-chosen={!isTime ? "true" : undefined}>
                  <strong>As a block height</strong> {num(e.nLockTime)}: the first block that could include it would be {num(e.nLockTime + 1)}.
                </li>
                <li data-chosen={isTime ? "true" : undefined}>
                  <strong>As a Unix time</strong> {utc(e.nLockTime)}: a block could include it once the median time past of the block before it is later.
                </li>
              </ul>
              <p class="atlas-panel__scope">
                Consensus picks one reading: below {num(LOCKTIME_THRESHOLD)} ({utc(LOCKTIME_THRESHOLD)}) it is a height, otherwise a time. Here: {isTime ? "time" : "height"}.
                {e.nSequence === SEQUENCE_FINAL ? " But this transaction’s only input is final, so nLockTime is not enforced at all." : ""}
              </p>
            </>
          ) : (
            <>
              <h3 class="atlas-panel__title">Value {num(value16)} (the low 16 bits), read both ways</h3>
              <ul class="atlas-tl-units__rows">
                {[
                  { chosen: !isTime, title: "As blocks", seconds: value16 * 600, text: `${num(value16)} blocks after the coin’s block, about ${span(value16 * 600)} at the 600-second average` },
                  { chosen: isTime, title: "As 512-second units", seconds: value16 * 512, text: `${num(value16)} × 512 = ${num(value16 * 512)} s, about ${span(value16 * 512)}, counted in median time past` },
                ].map((r, _i, all) => (
                  <li data-chosen={r.chosen ? "true" : undefined}>
                    <strong>{r.title}</strong> {r.text}
                    <span class="atlas-tl-units__bar" style={`inline-size: ${Math.max(all[0].seconds, all[1].seconds) ? (r.seconds / Math.max(all[0].seconds, all[1].seconds)) * 100 : 0}%`} aria-hidden="true" />
                  </li>
                ))}
              </ul>
              <p class="atlas-panel__scope">
                Bit 22 picks the reading: here {isTime ? "set, so 512-second units" : "clear, so blocks"}.
                {relActive ? "" : e.version < 2 ? " But the version is below 2, so BIP 68 reads no relative lock here." : " But bit 31 is set, so BIP 68 reads no relative lock here."}
              </p>
            </>
          )}
        </section>
      ) : null}

      <p class="atlas-lab__source">
        Source: Bitcoin Core {f.coreFile}, entry {f.coreIndex} (“{f.comment}”), tag v29.0, pinned by commit and hash. One-input transactions with no signatures:
        only the lock fields matter here.
      </p>
    </div>
  );
}
