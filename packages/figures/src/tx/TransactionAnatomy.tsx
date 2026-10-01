import { useEffect, useState } from "preact/hooks";
import type { DerivedTransactionFixture } from "../types";

interface Props {
  fixtures: DerivedTransactionFixture[];
  figureId: string;
}

type Lens = "txid" | "wtxid" | "bip143";

const LENSES: Array<{ id: Lens; label: string; note: string }> = [
  { id: "txid", label: "txid preimage", note: "witness stripped" },
  { id: "wtxid", label: "wtxid preimage", note: "everything" },
  { id: "bip143", label: "BIP 143 signing preimage", note: "one input" },
];

const groupHex = (hex: string) => hex.match(/.{1,8}/g)?.join(" ") ?? "";
const short = (hex: string) => `${hex.slice(0, 16)}…${hex.slice(-8)}`;

/**
 * transaction-anatomy.v1 — the SegWit chapter's hero figure.
 *
 * Serialization only: every byte, hash and size comes from parsing a published
 * BIP 143 example with the tested model, and the signing digest was checked
 * against the published preimage at build time. Nothing here edits bytes or
 * claims a transaction is valid.
 */
export function TransactionAnatomy({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [fixtureId, setFixtureId] = useState(fixtures[0].id);
  const [lens, setLens] = useState<Lens>("txid");
  const [item, setItem] = useState<string | null>(null);
  const fixture = fixtures.find((f) => f.id === fixtureId)!;
  const { segments, measures, digest } = fixture.derived;
  const signed = fixture.sighash.inputIndex;

  // For the BIP 143 lens: which preimage item(s) each segment feeds.
  const feeds = new Map<string, number[]>();
  digest.items.forEach((it, n) => it.from.forEach((id) => feeds.set(id, [...(feeds.get(id) ?? []), n + 1])));
  const focus = item ? digest.items.find((it) => it.id === item) ?? null : null;

  const included = (part: string, id: string) => {
    if (lens === "wtxid") return true;
    if (lens === "txid") return part === "base";
    return feeds.has(id);
  };

  return (
    <div class="atlas-lab atlas-tx-lab" data-hydrated={hydrated ? "true" : "false"} data-lens={lens}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Public example from BIP 143</legend>
            {fixtures.map((f) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-tx`} checked={f.id === fixtureId} onChange={() => { setFixtureId(f.id); setItem(null); }} />
                <span>{f.label}<small>{f.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented atlas-tx-lab__lenses">
            <legend>Lens</legend>
            {LENSES.map((l) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-lens`} checked={lens === l.id} onChange={() => setLens(l.id)} />
                <span>{l.label}<small>{l.note}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view of the first example through the txid lens: bytes the txid does not cover are marked. With
          JavaScript you can switch to the wtxid and BIP 143 signing lenses and to the second example.
        </p>
      )}

      <div class="atlas-tx-lab__body">
        <ol class="atlas-bytes-map" aria-label={`Serialized transaction, ${measures.totalSize} bytes, by field`}>
          {segments.map((s) => {
            const on = included(s.part, s.id);
            const marks = lens === "bip143" ? feeds.get(s.id) ?? [] : [];
            const focused = focus ? focus.from.includes(s.id) : false;
            return (
              <li
                class="atlas-bytes-map__row"
                data-part={s.part}
                data-on={on ? "true" : "false"}
                data-focus={focused ? "true" : undefined}
                data-signed={lens === "bip143" && s.index === signed && s.id.startsWith("input") ? "true" : undefined}
              >
                <span class="atlas-bytes-map__label">
                  {s.label}
                  {s.part === "witness" ? <em> witness</em> : s.part === "marker" ? <em> segwit marker</em> : null}
                </span>
                <code class="atlas-bytes-map__hex">{groupHex(s.hex)}</code>
                <span class="atlas-bytes-map__size">{s.hex.length / 2} B</span>
                <span class="atlas-bytes-map__tag">
                  {lens === "bip143"
                    ? marks.length ? marks.map((n) => <span class="atlas-num">{n}</span>) : "not used"
                    : on ? "hashed" : "not in txid"}
                </span>
              </li>
            );
          })}
        </ol>

        <section class="atlas-panel atlas-tx-lab__panel" aria-live="polite" aria-label="Lens result">
          {lens !== "bip143" ? (
            <>
              <h4 class="atlas-panel__title">{lens === "txid" ? "txid" : "wtxid"} = double SHA-256 of the {lens === "txid" ? measures.baseSize : measures.totalSize} marked bytes</h4>
              <code class="atlas-tx-lab__hash">{lens === "txid" ? measures.txidHex : measures.wtxidHex}</code>
              <p class="atlas-tx-lab__other">
                {lens === "txid" ? "wtxid" : "txid"}: <code>{short(lens === "txid" ? measures.wtxidHex : measures.txidHex)}</code>
              </p>
              <dl class="atlas-tx-lab__sizes">
                <div><dt>Base size</dt><dd>{measures.baseSize} bytes</dd></div>
                <div><dt>Total size</dt><dd>{measures.totalSize} bytes</dd></div>
                <div><dt>Weight</dt><dd>3 × {measures.baseSize} + {measures.totalSize} = {measures.weight}</dd></div>
                <div><dt>Virtual size</dt><dd>⌈{measures.weight} ÷ 4⌉ = {measures.vsize} vbytes</dd></div>
              </dl>
              <p class="atlas-panel__scope">Hashes are shown in the byte order they are computed. Inputs: {fixture.inputKinds.join("; ")}.</p>
            </>
          ) : (
            <>
              <h4 class="atlas-panel__title">Signing input {signed} · SIGHASH_ALL · 10 items</h4>
              <ol class="atlas-preimage">
                {digest.items.map((it, n) => (
                  <li data-external={it.from.length === 0 ? "true" : undefined} data-focus={item === it.id ? "true" : undefined}>
                    <button type="button" class="atlas-preimage__item" onClick={() => setItem(item === it.id ? null : it.id)} aria-pressed={item === it.id} disabled={!hydrated}>
                      <span class="atlas-num">{n + 1}</span>
                      <span class="atlas-preimage__label">{it.label}</span>
                      <code>{it.hex.length > 24 ? short(it.hex) : it.hex}</code>
                      <span class="atlas-preimage__note">{it.note}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p class="atlas-tx-lab__sighash">
                <span>double SHA-256 → sighash</span>
                <code>{digest.sighashHex}</code>
                <small>matches BIP 143 line {fixture.sighash.sighashLine}</small>
              </p>
            </>
          )}
        </section>
      </div>
      <p class="atlas-lab__source">
        Transaction: BIP 143, line {fixture.source.line} ({fixture.source.section}). Serialization view only; this page does not
        check signatures or scripts.
      </p>
    </div>
  );
}
