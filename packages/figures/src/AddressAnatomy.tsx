import { analyzeSegwitAddress } from "@bip-atlas/models/bech32";
import { ROLE_LABELS, familyName, roleRuns } from "./describe";
import type { AddressFixture } from "./types";

interface Props {
  fixture: AddressFixture;
}

/** address-anatomy.v1 — static. One valid public address, split into its parts. */
export function AddressAnatomy({ fixture }: Props) {
  const analysis = analyzeSegwitAddress(fixture.address, fixture.network);
  if (!analysis.valid) throw new Error(`address-anatomy.v1 needs a valid fixture; ${fixture.id} is not.`);
  const chars = [...fixture.address];
  const runs = roleRuns(analysis.roles);
  const programBytes = analysis.programHex!.length / 2;

  const notes: Record<string, string> = {
    hrp: fixture.network === "bc" ? "network: mainnet" : "network: testnet",
    separator: "always “1”",
    version: `witness version ${analysis.witnessVersion}`,
    program: `${programBytes} bytes, ${runs.find((r) => r.role === "program")!.end - runs.find((r) => r.role === "program")!.start} characters`,
    checksum: `${familyName(analysis.encoding!)}, no information`,
  };

  return (
    <div class="atlas-anatomy">
      <p class="atlas-anatomy__whole" aria-label={`The address ${fixture.address}`}>
        {runs.map((run) => (
          <span class="atlas-anatomy__run" data-role={run.role}>
            {chars.slice(run.start, run.end).join("")}
          </span>
        ))}
      </p>
      <dl class="atlas-anatomy__rows">
        {runs.map((run) => {
          const runChars = chars.slice(run.start, run.end);
          const rows = run.role === "program" ? chunk(runChars, 8) : [runChars];
          return (
            <div class="atlas-anatomy__row" data-role={run.role}>
              <dt>
                <span class="atlas-anatomy__role">{ROLE_LABELS[run.role]}</span>
                <span class="atlas-anatomy__note">{notes[run.role]}</span>
              </dt>
              <dd>
                {rows.map((row) => (
                  <span class="atlas-cells" aria-hidden="true">
                    {row.map((c) => (
                      <span class="atlas-cell" data-role={run.role}>{c}</span>
                    ))}
                  </span>
                ))}
                <span class="manual-sr-only">{runChars.join("")}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
