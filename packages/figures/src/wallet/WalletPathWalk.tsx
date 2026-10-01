import { useEffect, useState } from "preact/hooks";
import type { DerivedWalletPathFixture, WalletAddressView } from "../types";

interface Props {
  fixtures: DerivedWalletPathFixture[];
  figureId: string;
}

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;
const LEVEL_TEXT: Record<string, { title: string; meaning: string }> = {
  m: { title: "Master key", meaning: "From the seed. Everything below is derived from it." },
  purpose: { title: "purpose", meaning: "Which convention the subtree follows (BIP 43). 44′, 84′ and 86′ name the three BIPs here." },
  coin_type: { title: "coin_type", meaning: "One subtree per coin: 0′ is Bitcoin, 1′ is Bitcoin testnet." },
  account: { title: "account", meaning: "Independent user identities, like separate bank accounts. Numbered from 0." },
  change: { title: "change", meaning: "0 for the external (receiving) chain, 1 for the internal (change) chain." },
  address_index: { title: "address_index", meaning: "Addresses numbered from 0 along the chain." },
};

/**
 * wallet-path-walk.v1 — the Wallet paths chapter's hero figure.
 *
 * Steps down a published path one level at a time. Every key and address was
 * derived at build time by the tested BIP 32 / wallet-path model and checked
 * against BIP 84's and BIP 86's published vectors; the browser only draws.
 */
export function WalletPathWalk({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const [which, setWhich] = useState(0);
  const a: WalletAddressView = d.addresses[Math.min(which, d.addresses.length - 1)];
  const last = a.nodes.length; // index `last` = the address step
  const [at, setAt] = useState(0);
  const step = hydrated ? Math.min(at, last) : last;
  const node = step < last ? a.nodes[step] : null;

  return (
    <div class="atlas-lab atlas-wp-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-segmented">
            <legend>Path scheme</legend>
            {fixtures.map((x) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-scheme`} checked={x.id === id} onChange={() => (setId(x.id), setAt(0))} />
                <span>{x.label}<small>{x.shortLabel}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented">
            <legend>Receive or change</legend>
            {d.addresses.map((x, k) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-addr`} checked={k === which} onChange={() => setWhich(k)} />
                <span>{x.change === 0 ? `Receive #${x.index}` : `Change #${x.index}`}<small>…/{x.change}/{x.index}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view: BIP 84’s first receiving address, every level shown. With JavaScript you can switch scheme, switch between receiving and change, and step down the path one level at a time.
        </p>
      )}

      <ol class="atlas-wp-ribbon" aria-label={`Path ${a.path}`}>
        {a.nodes.map((n, k) => (
          <li data-state={k === step ? "current" : k < step || !hydrated ? "done" : "ahead"} data-hardened={n.hardened ? "true" : undefined} data-kind={n.level}>
            {hydrated ? (
              <button type="button" onClick={() => setAt(k)} aria-current={k === step ? "step" : undefined}>
                <span class="atlas-wp-ribbon__seg">{n.segment}</span>
                <span class="atlas-wp-ribbon__name">{LEVEL_TEXT[n.level].title}</span>
              </button>
            ) : (
              <span class="atlas-wp-ribbon__inner">
                <span class="atlas-wp-ribbon__seg">{n.segment}</span>
                <span class="atlas-wp-ribbon__name">{LEVEL_TEXT[n.level].title}</span>
              </span>
            )}
          </li>
        ))}
        <li data-state={step === last ? "current" : "ahead"} data-kind="address">
          {hydrated ? (
            <button type="button" onClick={() => setAt(last)} aria-current={step === last ? "step" : undefined}>
              <span class="atlas-wp-ribbon__seg">→</span>
              <span class="atlas-wp-ribbon__name">address</span>
            </button>
          ) : (
            <span class="atlas-wp-ribbon__inner"><span class="atlas-wp-ribbon__seg">→</span><span class="atlas-wp-ribbon__name">address</span></span>
          )}
        </li>
      </ol>

      {hydrated ? (
        <div class="atlas-lab__buttons" role="group" aria-label="Step through the path">
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.max(0, step - 1))} disabled={step === 0}>← Up a level</button>
          <button type="button" class="manual-plate-button" onClick={() => setAt(Math.min(last, step + 1))} disabled={step === last}>Down a level →</button>
        </div>
      ) : null}

      <section class="atlas-panel atlas-wp-node" aria-live="polite" aria-label="Current level">
        {node ? (
          <>
            <h3 class="atlas-panel__title">
              {node.level === "m" ? "m · master key" : `Depth ${node.depth} · ${LEVEL_TEXT[node.level].title} = ${node.segment}`}
            </h3>
            <p>{LEVEL_TEXT[node.level].meaning}</p>
            {node.level !== "m" ? (
              <p class="atlas-wp-node__how" data-hardened={node.hardened ? "true" : "false"}>
                {node.hardened
                  ? "Hardened: this child needs the parent’s private key. Its parent’s public key alone cannot reach it."
                  : "Public (normal) derivation: anyone with the parent’s extended public key can compute this child."}
              </p>
            ) : null}
            <dl class="atlas-wp-node__vals">
              <div><dt>public key</dt><dd><code>{short(node.publicKeyHex)}</code></dd></div>
              {node.level !== "m" ? <div><dt>parent fingerprint</dt><dd><code>{node.parentFingerprintHex}</code></dd></div> : null}
            </dl>
            {node.level === "account" ? (
              <div class="atlas-wp-node__xpub">
                <p><strong>Account extended public key</strong>{d.accountXpubPublished ? ` (published in BIP ${d.scheme})` : " (computed; BIP 44 publishes none)"}:</p>
                <code class="atlas-break">{d.accountXpub}</code>
                <p>
                  Everything below this level uses public derivation. Whoever holds this key can derive every receiving and change address of the account; the build re-derived all
                  {" "}{d.addresses.length} shown here from it alone, and they match.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h3 class="atlas-panel__title">{a.label} · {a.path}</h3>
            {a.output === null ? (
              <p>
                BIP 44 fixes the path, not the script. Nothing in it says which output type or address encoding this key should use, so no address is shown.
                The key itself: <code>{short(a.publicKeyHex)}</code>.
              </p>
            ) : a.output.kind === "p2wpkh" ? (
              <dl class="atlas-wp-node__vals">
                <div><dt>public key</dt><dd><code>{short(a.publicKeyHex)}</code></dd></div>
                <div><dt>HASH160(key)</dt><dd><code class="atlas-break">{a.output.keyHashHex}</code></dd></div>
                <div><dt>scriptPubKey</dt><dd><code class="atlas-break">{a.output.scriptPubKeyHex}</code></dd></div>
                <div><dt>address (bech32)</dt><dd><code class="atlas-break">{a.output.address}</code></dd></div>
              </dl>
            ) : (
              <dl class="atlas-wp-node__vals">
                <div><dt>internal key</dt><dd><code class="atlas-break">{a.output.internalKeyHex}</code></dd></div>
                <div><dt>TapTweak (no scripts)</dt><dd><code class="atlas-break">{a.output.tweakHex}</code></dd></div>
                <div><dt>output key</dt><dd><code class="atlas-break">{a.output.outputKeyHex}</code></dd></div>
                <div><dt>address (bech32m)</dt><dd><code class="atlas-break">{a.output.address}</code></dd></div>
              </dl>
            )}
          </>
        )}
      </section>
      <p class="atlas-lab__source">
        {d.scheme === 44
          ? `Paths from BIP 44's examples (lines ${a.checkedLines.join(", ")}). BIP 44 publishes no keys: these come from BIP 84's test mnemonic, derived by the tested BIP 32 model.`
          : `BIP ${d.scheme} test vectors from the "abandon … about" mnemonic; every value above was checked against its test vectors at build time (this address: lines ${a.checkedLines.join(", ")}).`}
      </p>
    </div>
  );
}
