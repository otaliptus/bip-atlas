import type { DerivedTapscriptFixture } from "../types";

const shortHex = (hex: string) => (hex.length > 16 ? `${hex.slice(0, 8)}…${hex.slice(-4)}` : hex || "(empty)");

/**
 * tapscript-witness.v1 — static. One recorded script-path witness split into
 * the parts BIP 341 checks (control block, script commitment) and the part
 * BIP 342 runs (the script, starting from the initial stack).
 */
export function TapscriptWitness({ fixture }: { fixture: DerivedTapscriptFixture }) {
  const v = fixture.derived.success;
  return (
    <div class="atlas-ts-witness">
      <ol class="atlas-ts-witness__items" aria-label={`Witness with ${v.witness.items} items, first item first`}>
        {v.initialStack.map((i, n) => {
          const e = v.elements[i];
          return (
            <li data-part="stack">
              <span class="atlas-ts-witness__tag">item {n} · initial stack</span>
              <span>{e.label}</span>
              <code>{shortHex(e.hex)}</code>
            </li>
          );
        })}
        <li data-part="script">
          <span class="atlas-ts-witness__tag">item {v.initialStack.length} · script · {v.witness.scriptBytes} B</span>
          <code class="atlas-break">{v.ops.map((o) => o.name).join(" ")}</code>
        </li>
        <li data-part="control">
          <span class="atlas-ts-witness__tag">item {v.initialStack.length + 1} · control block · {v.witness.controlBytes} B</span>
          <span>leaf version 0xc0, internal key, {(v.witness.controlBytes - 33) / 32} sibling hashes</span>
        </li>
      </ol>
      <div class="atlas-ts-witness__split">
        <p data-part="bip341"><strong>BIP 341</strong> uses the last two items: it checks that the output key commits to this script (Fig. A07.2), and that the leaf version is 0xc0.</p>
        <p data-part="bip342"><strong>BIP 342</strong> then runs the script, starting from the items before it as the stack.</p>
      </div>
      <p class="atlas-lab__source">Bitcoin Core qa-assets script_assets_test.json, case {fixture.caseIndex} (“{fixture.comment}”), success witness.</p>
    </div>
  );
}
