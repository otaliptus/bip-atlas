import type { DerivedVersionbitsDeploymentFixture } from "../types";

const hex32 = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;

/** versionbits-field.v1 — static. A block's nVersion as BIP 9 reads it: top bits 001, then 29 deployment bits. */
export function VersionbitsField({ fixtures }: { fixtures: DerivedVersionbitsDeploymentFixture[] }) {
  const byBit = new Map(fixtures.map((f) => [f.derived.bit, f.derived.name]));
  const both = fixtures.reduce((v, f) => (v | f.derived.signalVersion) >>> 0, 0);
  return (
    <div class="atlas-vb-field">
      <div class="atlas-vb-field__bits" role="img"
        aria-label={`nVersion bits 31 to 0: bits 31, 30 and 29 must read 0, 0, 1; bits 28 to 0 are deployment bits; ${[...byBit].map(([b, n]) => `bit ${b} is ${n}`).join(", ")}.`}>
        {Array.from({ length: 32 }, (_, k) => 31 - k).map((b) => (
          <span class="atlas-vb-field__bit" data-kind={b >= 29 ? "top" : byBit.has(b) ? "used" : "free"}>
            <span class="atlas-vb-field__v">{b === 29 ? "1" : b > 29 ? "0" : byBit.has(b) ? "?" : ""}</span>
            <span class="atlas-vb-field__n">{b}</span>
          </span>
        ))}
      </div>
      <ul class="atlas-vb-field__notes">
        <li><strong>Bits 31–29 = 001.</strong> Any other top bits and the block signals nothing, whatever its lower bits say.</li>
        {fixtures.map((f) => (
          <li><strong>Bit {f.derived.bit}: {f.derived.name}.</strong> A block signalling only for it has version <code>{hex32(f.derived.signalVersion)}</code>.</li>
        ))}
        <li><strong>Both at once:</strong> <code>{hex32(both)}</code>. Signalling versions run from <code>0x20000000</code> to <code>0x3fffffff</code>.</li>
      </ul>
      <p class="atlas-lab__source">Bits from BIP 9’s assignment table; versions computed by the tested version-bits model.</p>
    </div>
  );
}
