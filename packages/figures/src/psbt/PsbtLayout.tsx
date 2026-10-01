import type { DerivedPsbtTraceFixture } from "../types";

const title = (scope: string, index: number) => (scope === "global" ? "Global map" : `${scope === "input" ? "Input" : "Output"} ${index} map`);

/** psbt-layout.v1 — static. The Creator's PSBT as an envelope of key-value maps. */
export function PsbtLayout({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const state = fixture.derived.states[0];
  return (
    <div class="atlas-env atlas-env--static">
      <p class="atlas-env__magic">
        <code>70 73 62 74 ff</code> <span>“psbt” + 0xff</span>
      </p>
      {state.maps.map((m) => (
        <section class="atlas-env__map" data-scope={m.scope} aria-label={title(m.scope, m.index)}>
          <h5 class="atlas-env__title">{title(m.scope, m.index)}</h5>
          {m.records.length ? (
            <ul class="atlas-env__records">
              {m.records.map((r) => (
                <li class="atlas-env__record">
                  <span class="atlas-env__type">0x{r.keyType.toString(16).padStart(2, "0")}</span>
                  <span class="atlas-env__name">{r.name}</span>
                  <span class="atlas-env__reading">{r.reading}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="atlas-env__empty">empty: just the 0x00 separator</p>
          )}
        </section>
      ))}
      <p class="atlas-env__foot">
        {state.bytes} bytes, as created on BIP 174 line {state.line}. Outputs pay {fixture.derived.outputsBtc.join(" BTC and ")} BTC.
      </p>
    </div>
  );
}
