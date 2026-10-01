import type { DerivedTaprootKeyspendFixture } from "../types";

const short = (hex: string) => (hex.length > 20 ? `${hex.slice(0, 10)}…${hex.slice(-6)}` : hex);

/**
 * taproot-sigmsg.v1 — static. The BIP 341 signature message for one published
 * key-path spend, item by item, with what each item commits to.
 */
export function SigMsgLayout({ fixture }: { fixture: DerivedTaprootKeyspendFixture }) {
  const d = fixture.derived;
  return (
    <div class="atlas-sigmsg">
      <p class="atlas-sigmsg__head">
        Input {d.txinIndex} of {d.inputs} · hash_type 0x{d.hashType.toString(16).padStart(2, "0")} · SigMsg {d.sigMsgBytes} bytes
      </p>
      <ol class="atlas-sigmsg__items">
        {d.items.map((it) => (
          <li data-item={it.id} data-commit={it.id === "sha_amounts" || it.id === "sha_scriptpubkeys" ? "new" : undefined}>
            <span class="atlas-sigmsg__label">{it.label}</span>
            <span class="atlas-sigmsg__bytes">{it.bytes} B</span>
            <code title={it.hex}>{short(it.hex)}</code>
            <span class="atlas-sigmsg__note">{it.note}</span>
          </li>
        ))}
      </ol>
      <p class="atlas-sigmsg__result">
        hash<sub>TapSighash</sub>(0x00 ‖ SigMsg) = <code class="atlas-break">{d.sighashHex}</code>
      </p>
      <details class="atlas-tap-exact">
        <summary>Exact values</summary>
        <dl>
          {d.items.map((it) => (
            <div><dt>{it.label}</dt><dd><code class="atlas-break">{it.hex}</code></dd></div>
          ))}
        </dl>
      </details>
      <p class="atlas-lab__source">
        BIP 341 wallet-test-vectors.json, {fixture.source.pointer}, input {d.txinIndex}. SigMsg, sighash and the published signature were checked at build time.
      </p>
    </div>
  );
}
