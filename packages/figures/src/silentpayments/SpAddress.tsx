import type { DerivedSpFixture } from "../types";

/** sp-address.v1 — static. The parts of a version 0 silent payment address. */
export function SpAddress({ fixture }: { fixture: DerivedSpFixture }) {
  const a = fixture.derived.receiver.address;
  const sep = a.lastIndexOf("1");
  const parts = [
    { role: "hrp", text: a.slice(0, sep), note: "human-readable part, mainnet (tsp on testnets)" },
    { role: "sep", text: "1", note: "separator" },
    { role: "ver", text: a[sep + 1], note: "version 0" },
    { role: "data", text: a.slice(sep + 2, a.length - 6), note: "B_scan ‖ B_m, 66 bytes" },
    { role: "check", text: a.slice(-6), note: "bech32m checksum" },
  ];
  return (
    <div class="atlas-sp-addr">
      <p class="atlas-sp-addr__ribbon" aria-label={`${a.length}-character silent payment address`}>
        {parts.map((p) => <span data-role={p.role}>{p.text}</span>)}
      </p>
      <ul class="atlas-sp-addr__key">
        {parts.map((p) => (
          <li data-role={p.role}><strong>{p.role === "data" ? `${p.text.length} characters` : p.text}</strong> {p.note}</li>
        ))}
      </ul>
      <p class="atlas-sp-addr__keys">
        Decoded: scan key <code>{fixture.derived.receiver.Bscan}</code>, spend key <code>{fixture.derived.receiver.Bspend}</code>.
      </p>
      <p class="atlas-lab__source">Address from BIP 352’s first test vector ({a.length} characters), re-encoded from the receiver’s keys by the tested model.</p>
    </div>
  );
}
