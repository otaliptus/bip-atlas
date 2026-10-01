import type { DerivedP2shFixture } from "../types";

const KIND: Record<string, string> = { legacy: "Legacy P2SH", "p2sh-p2wpkh": "P2SH-P2WPKH", "p2sh-p2wsh": "P2SH-P2WSH" };

/** p2sh-wrapped.v1 — static. Where each pinned spend carries its signatures: scriptSig or witness. */
export function P2shWrapped({ fixtures }: { fixtures: DerivedP2shFixture[] }) {
  const max = Math.max(...fixtures.map((f) => f.derived.scriptSigBytes + f.derived.witnessBytes));
  return (
    <div class="atlas-ser">
      {fixtures.map((f) => {
        const d = f.derived;
        return (
          <div class="atlas-ser__row">
            <p class="atlas-ser__head">
              <span class="atlas-ser__name">{KIND[d.kind]}</span>
              <span>scriptSig {d.scriptSigBytes} B · witness items {d.witnessBytes} B</span>
            </p>
            <div class="atlas-ser__bar" style={`inline-size: ${((d.scriptSigBytes + d.witnessBytes) / max) * 100}%`} role="img"
              aria-label={`${KIND[d.kind]}: scriptSig ${d.scriptSigBytes} bytes, witness ${d.witnessBytes} bytes.`}>
              <span class="atlas-ser__seg" data-group="inputs" style={`flex-grow: ${d.scriptSigBytes}`}><span class="atlas-ser__label">{d.scriptSigBytes >= 30 ? "scriptSig" : ""}</span></span>
              {d.witnessBytes ? <span class="atlas-ser__seg" data-group="witness" style={`flex-grow: ${d.witnessBytes}`}><span class="atlas-ser__label">witness</span></span> : null}
            </div>
          </div>
        );
      })}
      <p class="atlas-ser__legend">
        <span><span class="atlas-ser__key" data-group="inputs" />scriptSig: counted at 4 weight units per byte</span>
        <span><span class="atlas-ser__key" data-group="witness" />witness: 1 weight unit per byte</span>
      </p>
      <p class="atlas-lab__source">Byte counts of the items themselves (length prefixes excluded), from the pinned transactions.</p>
    </div>
  );
}
