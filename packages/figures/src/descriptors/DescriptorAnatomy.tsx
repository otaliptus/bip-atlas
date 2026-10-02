import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import type { DerivedDescriptorFixture } from "../types";

interface Props {
  fixtures: DerivedDescriptorFixture[];
  figureId: string;
}

const short = (hex: string) => (hex.length > 24 ? `${hex.slice(0, 12)}…${hex.slice(-8)}` : hex);
const KIND: Record<string, string> = {
  "hex-compressed": "hex public key (compressed)",
  "hex-uncompressed": "hex public key (uncompressed)",
  xonly: "x-only public key",
  wif: "WIF private key",
  xpub: "extended public key (xpub)",
  xprv: "extended private key (xprv)",
};
const VERDICT: Record<string, string> = {
  valid: "✓ checksum matches",
  "no-checksum": "no checksum written (optional for parsing)",
  mismatch: "✕ checksum does not match",
  "bad-length": "✕ checksum is not 8 characters",
  "bad-charset": "✕ checksum has characters outside its set",
};

/**
 * descriptor-anatomy.v1 — the Descriptors chapter's hero figure.
 *
 * Published descriptors from BIPs 380–386, parsed and expanded at build time
 * by the tested descriptor model; every expansion was checked against the
 * scripts the BIP lists. The browser only highlights and reveals.
 */
export function DescriptorAnatomy({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const [keySel, setKeySel] = useState(0);
  const [checked, setChecked] = useState(false);
  const k = d.keys[Math.min(keySel, d.keys.length - 1)] ?? null;
  const showCheck = hydrated ? checked : true;
  const choose = (x: string) => (setId(x), setKeySel(0), setChecked(false));
  // Consecutive tokens of one key form one group (one button when there are several keys).
  const groups: Array<{ key: number | null; tokens: typeof d.tokens }> = [];
  for (const t of d.tokens) {
    const last = groups[groups.length - 1];
    if (last && last.key !== null && last.key === t.key) last.tokens.push(t);
    else groups.push({ key: t.key, tokens: [t] });
  }

  return (
    <div class="atlas-lab atlas-ds-lab" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-lab__samples">
            <legend>Published descriptor</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-desc`} checked={x.id === id} onChange={() => choose(x.id)} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">Static view: the first descriptor with its first key highlighted and its checksum (none is written) computed. With JavaScript you can pick any of {fixtures.length} published descriptors and highlight each key.</p>
      )}

      <p class="atlas-ds-flags">
        <span data-flag={d.hasPrivateKeys ? "secret" : "public"}>{d.hasPrivateKeys ? "Holds private keys: a secret" : d.keys.length ? "Public keys only: reveals scripts, cannot spend" : "No keys"}</span>
        {d.ranged ? <span data-flag="ranged">Ranged: one script per child index</span> : null}
      </p>

      <p class="atlas-ds-ribbon" role="group" aria-label="The descriptor, by part">
        {groups.map((g) =>
          g.key !== null && hydrated && d.keys.length > 1 ? (
            <button type="button" class="atlas-ds-keybtn" data-active={g.key === keySel ? "true" : undefined} aria-pressed={g.key === keySel} onClick={() => setKeySel(g.key!)} aria-label={`Key ${g.key + 1}`}>
              {g.tokens.map((t) => <span class="atlas-ds-tok" data-role={t.role}>{t.text}</span>)}
            </button>
          ) : (
            <span class="atlas-ds-keyspan" data-active={g.key !== null && g.key === keySel ? "true" : undefined}>
              {g.tokens.map((t) => <span class="atlas-ds-tok" data-role={t.role}>{t.text}</span>)}
            </span>
          ),
        )}
      </p>
      <p class="atlas-ds-legend">
        <span data-role="fn">script expression</span> <span data-role="num">number</span> <span data-role="origin">key origin</span> <span data-role="key">key</span> <span data-role="path">derivation</span>{" "}
        <span data-role="range">range</span> <span data-role="checksum">checksum</span>
        {d.keys.length > 1 && hydrated ? " · press a key to highlight it" : ""}
      </p>

      <div class="atlas-ds-body">
        <section class="atlas-panel atlas-ds-key" aria-live="polite" aria-label="Highlighted key">
          {k ? (
            <>
              <h3 class="atlas-panel__title">Key {Math.min(keySel, d.keys.length - 1) + 1} of {d.keys.length} · {KIND[k.kind]}</h3>
              <dl class="atlas-ds-dl">
                <div><dt>origin (normalized, h for hardened)</dt><dd>{k.origin ? <code>[{k.origin}]</code> : "none given"}</dd></div>
                <div><dt>derivation after the key</dt><dd>{k.derivation ? <code>{k.derivation}</code> : "none"}</dd></div>
                {k.publicKeys.map((p, i) => (
                  <div><dt>{k.range ? `public key, child ${i}` : "public key"}</dt><dd><code>{short(p)}</code></dd></div>
                ))}
              </dl>
              {k.isPrivate ? <p class="atlas-ds-warn">This key expression is private: anyone who has the descriptor can spend.</p> : null}
            </>
          ) : (
            <>
              <h3 class="atlas-panel__title">No key expressions</h3>
              <p>{d.error ? "This descriptor does not parse, so nothing is expanded." : "raw() carries a script directly."}</p>
            </>
          )}
        </section>

        <section class="atlas-panel atlas-ds-scripts" aria-label="Scripts produced">
          <h3 class="atlas-panel__title">Output scripts</h3>
          {d.error ? (
            <p class="atlas-ds-warn">Rejected: {d.error}.</p>
          ) : (
            <>
              <p class="atlas-ds-outline"><code>{d.outline}</code></p>
              <ol class="atlas-ds-list">
                {d.scripts.map((s, i) => (
                  <li>
                    <span class="atlas-ds-list__n">{d.ranged ? `child ${i}` : s.length > 1 ? "scripts" : "script"}</span>
                    {s.map((x) => <code class="atlas-break">{x}</code>)}
                  </li>
                ))}
              </ol>
              {d.ranged ? <p class="atlas-panel__scope">Children 0–2 shown, as the BIP lists them; the range continues.</p> : null}
            </>
          )}
        </section>
      </div>

      <section class="atlas-panel atlas-ds-check" aria-live="polite" aria-label="Checksum" tabIndex={-1} data-focus-home>
        <h3 class="atlas-panel__title">Checksum</h3>
        {hydrated && !checked ? (
          <button type="button" class="manual-plate-button" onClick={() => setChecked(true)}>Check the descriptor checksum</button>
        ) : null}
        {showCheck ? (
          <>
            <p class="atlas-ds-check__row">
              <span>{d.symbolCount} symbols from {d.body.length} characters</span>
              <span>computed: <code>#{d.checksumComputed}</code></span>
              <span>written: {d.checksumGiven === null ? "none" : <code>#{d.checksumGiven}</code>}</span>
            </p>
            <p class="atlas-ds-check__verdict" data-ok={d.checksumVerdict === "valid" ? "true" : d.checksumVerdict === "no-checksum" ? undefined : "false"}>{VERDICT[d.checksumVerdict]}</p>
            <p class="atlas-panel__scope">The checksum catches typos. It is not a signature: anyone can compute it for any descriptor, so a matching checksum says nothing about who wrote it.</p>
          </>
        ) : null}
      </section>

      <p class="atlas-lab__source">
        Source: BIP {f.source.bip}, line {f.source.line}. Parsed and expanded at build time by the tested descriptor model; {d.error ? "the BIP lists this case to show the checksum failing." : "the scripts match those the BIP lists."}
      </p>
    </div>
  );
}
