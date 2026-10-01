import type { DerivedV2RekeyFixture } from "../types";

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-6)}`;

/** v2-rekey.v1 — static. FSChaCha20Poly1305 nonces and keys across rekeys. */
export function V2Rekey({ fixture }: { fixture: DerivedV2RekeyFixture }) {
  const rows = fixture.derived.rows;
  return (
    <div class="atlas-v2-rekey">
      <table class="atlas-bf-gr__table">
        <caption>Payload cipher of the {fixture.derived.initiating ? "initiator" : "responder"} in a published vector</caption>
        <thead><tr><th scope="col">packet</th><th scope="col">nonce: packet in epoch (4 B LE) ‖ epoch (8 B LE)</th><th scope="col">key in use</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr data-new-key={i > 0 && r.key !== rows[i - 1].key ? "true" : "false"}>
              <td>{r.packet}</td>
              <td><code>{r.nonce.slice(0, 8)}</code> <code>{r.nonce.slice(8)}</code></td>
              <td><code>{short(r.key)}</code>{i > 0 && r.key !== rows[i - 1].key ? <small> new key</small> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="atlas-lab__source">Keys from BIP 324’s packet vector for packet 223 (line {fixture.source.line}), run forward by the tested model. After every 224th packet the key is replaced by an encryption of 32 zero bytes under the old key.</p>
    </div>
  );
}
