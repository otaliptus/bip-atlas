import type { DerivedTransactionFixture } from "../types";

type Seg = DerivedTransactionFixture["derived"]["segments"][number];

const GROUPS = [
  { key: "version", label: "nVersion", test: (s: Seg) => s.id === "version" },
  { key: "marker", label: "marker + flag", test: (s: Seg) => s.part === "marker" },
  { key: "inputs", label: "txins", test: (s: Seg) => s.id.startsWith("input") },
  { key: "outputs", label: "txouts", test: (s: Seg) => s.id.startsWith("output") },
  { key: "witness", label: "witness", test: (s: Seg) => s.part === "witness" },
  { key: "locktime", label: "nLockTime", test: (s: Seg) => s.id === "locktime" },
] as const;

/** two-serializations.v1 — static. The txid and wtxid preimages of one transaction, drawn to scale. */
export function TwoSerializations({ fixture }: { fixture: DerivedTransactionFixture }) {
  const { segments, measures } = fixture.derived;
  const sized = GROUPS.map((g) => ({ ...g, bytes: segments.filter(g.test).reduce((n, s) => n + s.hex.length / 2, 0) }));
  const rows = [
    { name: "txid", total: measures.baseSize, groups: sized.filter((g) => g.key !== "marker" && g.key !== "witness"), hash: measures.txidHex },
    { name: "wtxid", total: measures.totalSize, groups: sized, hash: measures.wtxidHex },
  ];
  const scale = 100 / measures.totalSize;
  return (
    <div class="atlas-ser">
      {rows.map((row) => (
        <div class="atlas-ser__row">
          <p class="atlas-ser__head">
            <span class="atlas-ser__name">{row.name}</span>
            <span>double SHA-256 of {row.total} bytes</span>
          </p>
          <div class="atlas-ser__bar" style={`inline-size: ${row.total * scale}%`} role="img"
            aria-label={`${row.name} preimage: ${row.groups.map((g) => `${g.label} ${g.bytes} bytes`).join(", ")}.`}>
            {row.groups.map((g) => (
              <span class="atlas-ser__seg" data-group={g.key} style={`flex-grow: ${g.bytes}`} title={`${g.label}: ${g.bytes} bytes`}>
                <span class="atlas-ser__label">{g.bytes >= 20 ? g.label : ""}</span>
              </span>
            ))}
          </div>
          <code class="atlas-ser__hash" title={row.hash}>{row.hash.slice(0, 20)}…{row.hash.slice(-8)}</code>
        </div>
      ))}
      <p class="atlas-ser__legend" aria-hidden="true">
        {sized.map((g) => (
          <span><i class="atlas-ser__key" data-group={g.key} />{g.label} · {g.bytes} B</span>
        ))}
      </p>
    </div>
  );
}
