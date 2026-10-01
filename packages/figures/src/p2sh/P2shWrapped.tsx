import type { DerivedP2shFixture } from "../types";

const KIND: Record<string, string> = { legacy: "Legacy P2SH", "p2sh-p2wpkh": "P2SH-P2WPKH", "p2sh-p2wsh": "P2SH-P2WSH" };
/** BIP141 weight: bytes outside the witness count four times, witness bytes once. */
const weight = (d: DerivedP2shFixture["derived"]) => 4 * d.scriptSigBytes + d.witnessBytes;

/** p2sh-wrapped.v1 — static. Where each pinned spend carries its signatures, and what that costs in weight. */
export function P2shWrapped({ fixtures }: { fixtures: DerivedP2shFixture[] }) {
  const max = Math.max(...fixtures.map((f) => weight(f.derived)));
  return (
    <div class="atlas-ser">
      {fixtures.map((f) => {
        const d = f.derived;
        const w = weight(d);
        return (
          <div class="atlas-ser__row">
            <p class="atlas-ser__head">
              <span class="atlas-ser__name">{KIND[d.kind]}</span>
              <span>scriptSig {d.scriptSigBytes} B · witness {d.witnessBytes ? `${d.witnessBytes} B` : "none"} · {w} WU</span>
            </p>
            <div class="atlas-ser__bar" style={`inline-size: ${(w / max) * 100}%`} role="img"
              aria-label={`${KIND[d.kind]}: scriptSig ${d.scriptSigBytes} bytes, ${4 * d.scriptSigBytes} weight units; witness ${d.witnessBytes} bytes, ${d.witnessBytes} weight units.`}>
              <span class="atlas-ser__seg" data-group="inputs" style={`flex-grow: ${4 * d.scriptSigBytes}`}><span class="atlas-ser__label">{d.scriptSigBytes >= 30 ? "scriptSig ×4" : ""}</span></span>
              {d.witnessBytes ? <span class="atlas-ser__seg" data-group="witness" style={`flex-grow: ${d.witnessBytes}`}><span class="atlas-ser__label">witness</span></span> : null}
            </div>
          </div>
        );
      })}
      <p class="atlas-ser__legend">
        <span><span class="atlas-ser__key" data-group="inputs" />scriptSig: 4 weight units per byte</span>
        <span><span class="atlas-ser__key" data-group="witness" />witness: 1 weight unit per byte</span>
      </p>
      <p class="atlas-lab__source">
        Bar length is weight units. scriptSig: the script’s bytes, push opcodes included. Witness: as serialized, with the item count and each item’s length prefix.
        Neither includes the rest of the input (outpoint, nSequence, the scriptSig’s own length byte). From the pinned transactions.
      </p>
    </div>
  );
}
