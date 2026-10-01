import type { DerivedVersionbitsDeploymentFixture, VersionbitsNetworkView } from "../types";

const num = (n: number) => n.toLocaleString("en-US");
const day = (s: string) => s.slice(0, 10);

function Row({ net, v }: { net: string; v: VersionbitsNetworkView }) {
  return (
    <tr>
      <th scope="row">{net}</th>
      <td>{day(v.start)}<small>{num(v.startEpoch)}</small></td>
      <td>{day(v.expire)}<small>{num(v.expireEpoch)}</small></td>
      <td>{v.activeHeight === null ? v.state : <>block {num(v.activeHeight)}<small>period {num(v.implied!.activePeriod)}</small></>}</td>
      <td>{v.implied ? <>LOCKED_IN from {num(v.implied.lockedInFrom)}<small>blocks {num(v.implied.tallyFrom)}–{num(v.implied.tallyTo)} reached {num(v.threshold)}</small></> : "—"}</td>
    </tr>
  );
}

/** versionbits-record.v1 — static. The two BIP 9 deployments as the assignment table records them, and what the rules imply. */
export function VersionbitsRecord({ fixtures }: { fixtures: DerivedVersionbitsDeploymentFixture[] }) {
  return (
    <div class="atlas-vb-record-fig">
      {fixtures.map((f) => (
        <section aria-label={f.derived.name}>
          <p class="atlas-vb-record-fig__head"><strong>{f.derived.name}</strong> · bit {f.derived.bit} · BIPs {f.derived.bips.join(", ")}</p>
          <div class="atlas-table-wrap" tabindex={0} role="region" aria-label={`${f.derived.name} deployment record`}>
            <table class="manual-table atlas-vb-record-fig__table">
              <caption class="manual-sr-only">{f.derived.name}: start, timeout, recorded activation and implied lock-in</caption>
              <thead>
                <tr><th scope="col">Network</th><th scope="col">Start (MTP)</th><th scope="col">Timeout</th><th scope="col">Recorded</th><th scope="col">Implied by BIP 9’s rules</th></tr>
              </thead>
              <tbody>
                <Row net="mainnet" v={f.derived.mainnet} />
                <Row net="testnet" v={f.derived.testnet} />
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p class="atlas-lab__source">
        Dates and states from BIP 9’s assignment table (lines {fixtures.map((f) => f.source.line).join(", ")}); start and timeout cross-checked at build time against the Unix
        times in each BIP’s own deployment section. The last column is inferred from the activation height by the tested model.
      </p>
    </div>
  );
}
