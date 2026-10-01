import { INPUT_CHARSET } from "@bip-atlas/models/descsum";
import type { DerivedDescriptorFixture } from "../types";

/** descriptor-checksum.v1 — static. How BIP 380 turns characters into symbols before the checksum. */
export function DescriptorChecksum({ fixture }: { fixture: DerivedDescriptorFixture }) {
  const d = fixture.derived;
  const chars = [...d.body];
  return (
    <div class="atlas-ds-sum">
      <ol class="atlas-ds-sum__chars" aria-label={`Characters of ${d.body}, with their group and position`}>
        {chars.map((c) => {
          const v = INPUT_CHARSET.indexOf(c);
          return (
            <li data-group={v >> 5}>
              <span class="atlas-ds-sum__c">{c}</span>
              <span class="atlas-ds-sum__g">g{v >> 5}</span>
              <span class="atlas-ds-sum__p">{v & 31}</span>
            </li>
          );
        })}
      </ol>
      <ol class="atlas-ds-sum__symbols" aria-label="Symbols fed to the checksum">
        {d.symbols.map((s) => (
          <li data-kind={s.char === null ? "group" : "char"}>{s.value}</li>
        ))}
      </ol>
      <p class="atlas-ds-sum__result">
        {d.symbols.length} symbols → BCH polymod → <code>#{d.checksumComputed}</code> {d.checksumGiven === d.checksumComputed ? "(matches the published checksum)" : ""}
      </p>
      <p class="atlas-lab__source">
        Each character becomes its position within one of three groups of 32; after every third character one more symbol records the three group numbers (shaded).
        Computed by the tested checksum model, a transcription of BIP 380’s Python code; checked against the BIP’s vector.
      </p>
    </div>
  );
}
