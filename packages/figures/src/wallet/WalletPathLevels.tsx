import type { DerivedWalletPathFixture } from "../types";

const LEVELS = [
  { seg: "purpose′", what: "which convention: 44′, 84′, 86′", hardened: true },
  { seg: "coin_type′", what: "0′ Bitcoin · 1′ testnet", hardened: true },
  { seg: "account′", what: "independent identities, from 0", hardened: true },
  { seg: "change", what: "0 receive · 1 change", hardened: false },
  { seg: "address_index", what: "addresses, from 0", hardened: false },
];

/** wallet-path-levels.v1 — static. BIP 44's five levels on a BIP 32 path, and where hardening stops. */
export function WalletPathLevels({ fixture }: { fixture: DerivedWalletPathFixture }) {
  return (
    <div class="atlas-wp-levels">
      <ol class="atlas-wp-levels__row" aria-label="m / purpose' / coin_type' / account' / change / address_index">
        <li data-kind="m"><span class="atlas-wp-levels__seg">m</span><span class="atlas-wp-levels__what">master key</span></li>
        {LEVELS.map((l) => (
          <li data-hardened={l.hardened ? "true" : "false"}>
            <span class="atlas-wp-levels__seg">{l.seg}</span>
            <span class="atlas-wp-levels__what">{l.what}</span>
            <span class="atlas-wp-levels__how">{l.hardened ? "hardened" : "public derivation"}</span>
          </li>
        ))}
      </ol>
      <p class="atlas-wp-levels__split">
        <span>needs the private key ↑</span>
        <span>↓ an account’s extended public key reaches everything here</span>
      </p>
      <p class="atlas-wp-levels__examples">
        BIP 44’s examples: {fixture.derived.addresses.map((a) => <><code>{a.path}</code> ({a.label}) </>)}
      </p>
      <p class="atlas-lab__source">Levels and derivation types as BIP 44 defines them; example paths from its Examples table, parsed by the tested path model.</p>
    </div>
  );
}
