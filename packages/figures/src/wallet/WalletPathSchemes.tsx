import type { DerivedWalletPathFixture } from "../types";

const SAYS: Record<number, { script: string; encoding: string; keys: string }> = {
  44: { script: "Not specified", encoding: "Not specified", keys: "Not specified" },
  84: { script: "P2WPKH: 0x0014{20-byte key hash}", encoding: "BIP 173 format (published addresses: bc1q…)", keys: "zpub / zprv version bytes" },
  86: { script: "P2TR key path: 0x5120{output key}, unspendable script path", encoding: "Not named (published addresses: bc1p…, bech32m)", keys: "None defined (vectors print xpub / xprv)" },
};

/** wallet-path-schemes.v1 — static. Same path shape, three purposes; what each BIP fixes beyond the path. */
export function WalletPathSchemes({ fixtures }: { fixtures: DerivedWalletPathFixture[] }) {
  return (
    <div class="atlas-wp-schemes">
      {fixtures.map((f) => {
        const d = f.derived;
        const first = d.addresses[0];
        const s = SAYS[d.scheme];
        return (
          <section class="atlas-wp-schemes__col" data-scheme={d.scheme} aria-label={`BIP ${d.scheme}`}>
            <p class="atlas-wp-schemes__head">BIP {d.scheme}</p>
            <code class="atlas-wp-schemes__path">m/{d.scheme}′/0′/0′/0/0</code>
            <dl>
              <div><dt>script</dt><dd>{s.script}</dd></div>
              <div><dt>address</dt><dd>{s.encoding}</dd></div>
              <div><dt>extended keys</dt><dd>{s.keys}</dd></div>
              <div>
                <dt>first receiving</dt>
                <dd>{first.output ? <code class="atlas-break">{first.output.address}</code> : <span class="atlas-wp-schemes__none">no address: the BIP names no script</span>}</dd>
              </div>
            </dl>
          </section>
        );
      })}
      <p class="atlas-lab__source">What each BIP states; where it states nothing, the published vectors are described instead. Addresses from BIP 84’s and BIP 86’s test vectors, reproduced by the tested model from the same mnemonic.</p>
    </div>
  );
}
