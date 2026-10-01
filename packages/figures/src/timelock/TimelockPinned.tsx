import type { DerivedTimelockBipTxFixture } from "../types";

const hex32 = (n: number) => `0x${(n >>> 0).toString(16).padStart(8, "0")}`;
const num = (n: number) => n.toLocaleString("en-US");

/** timelock-pinned-fields.v1 — static. How consensus reads the lock fields of transactions published in BIPs 143 and 174. */
export function TimelockPinned({ fixtures }: { fixtures: DerivedTimelockBipTxFixture[] }) {
  return (
    <div class="atlas-tl-pinned">
      <div class="atlas-table-wrap" tabindex={0} role="region" aria-label="Lock fields of published transactions">
      <table class="manual-table atlas-tl-pinned__table">
        <caption class="manual-sr-only">Lock fields of published transactions and what they mean</caption>
        <thead>
          <tr>
            <th scope="col">Transaction</th>
            <th scope="col">nVersion</th>
            <th scope="col">nLockTime</th>
            <th scope="col">Input nSequence</th>
            <th scope="col">Reading</th>
          </tr>
        </thead>
        <tbody>
          {fixtures.map((f) => {
            const d = f.derived;
            return (
              <tr>
                <th scope="row">{f.label}<small>{f.shortLabel}, line {f.source.line}</small></th>
                <td>{d.version}</td>
                <td>{num(d.nLockTime)}<small>{d.nLockTime === 0 ? "zero" : d.lockKind}</small></td>
                <td>
                  {d.inputs.map((i, k) => (
                    <span class="atlas-tl-pinned__seq">
                      <code>{hex32(i.nSequence)}</code>
                      <small>
                        {d.inputs.length > 1 ? `input ${k}: ` : ""}
                        {i.final ? "final" : "not final"}
                        {i.relative ? `, relative lock ${num(i.relative.value)} ${i.relative.unit === "blocks" ? "blocks" : "× 512 s"}` : i.reason === "version" ? ", version < 2: no relative lock" : ", bit 31 set: no relative lock"}
                      </small>
                    </span>
                  ))}
                </td>
                <td>
                  {d.enforced
                    ? d.lockKind === "height"
                      ? `nLockTime enforced: no block before height ${num(d.firstHeight!)}.`
                      : "nLockTime enforced as a time."
                    : "Every input is final, so nLockTime is not enforced."}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <p class="atlas-lab__source">Fields read by the tested timelock model from the transactions as published (BIP 143 and BIP 174 line numbers shown).</p>
    </div>
  );
}
