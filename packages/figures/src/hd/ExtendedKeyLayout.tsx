import type { DerivedBip32Fixture } from "../types";

const FIELDS = [
  { name: "Version", bytes: 4, note: "says xpub or xprv, mainnet or testnet" },
  { name: "Depth", bytes: 1, note: "0 for the master" },
  { name: "Parent fingerprint", bytes: 4, note: "first 4 bytes of the parent key’s Hash160" },
  { name: "Child number", bytes: 4, note: "≥ 0x80000000 means hardened" },
  { name: "Chain code", bytes: 32, note: "the extra 256 bits" },
  { name: "Key data", bytes: 33, note: "02/03 + x for public, 00 + k for private" },
  { name: "Checksum", bytes: 4, note: "double SHA-256, for Base58Check" },
] as const;

const short = (hex: string) => (hex.length > 20 ? `${hex.slice(0, 12)}…${hex.slice(-6)}` : hex);

/** extended-key-layout.v1 — static. The 78-byte payload (+ checksum) of one node, public vs private. */
export function ExtendedKeyLayout({ fixture }: { fixture: DerivedBip32Fixture }) {
  const { serialization } = fixture.derived;
  const split = (rawHex: string, checksumHex: string) => {
    const all = rawHex + checksumHex;
    let offset = 0;
    return FIELDS.map((f) => {
      const value = all.slice(offset * 2, (offset + f.bytes) * 2);
      offset += f.bytes;
      return value;
    });
  };
  const [pub, prv] = serialization.rows;
  const pubFields = split(pub.rawHex, pub.checksumHex);
  const prvFields = split(prv.rawHex, prv.checksumHex);
  const total = FIELDS.reduce((n, f) => n + f.bytes, 0);
  let x = 0;
  return (
    <div class="atlas-xkey">
      <svg class="atlas-xkey__bar" viewBox={`0 0 ${total * 10} 30`} preserveAspectRatio="none" role="img"
        aria-label={`78-byte payload plus 4-byte checksum: ${FIELDS.map((f) => `${f.name} ${f.bytes}`).join(", ")}.`}>
        {FIELDS.map((f, i) => {
          const rect = <rect x={x * 10} y={4} width={f.bytes * 10 - 2} height={22} class={`atlas-xkey__seg atlas-xkey__seg--${i}`} />;
          x += f.bytes;
          return rect;
        })}
      </svg>
      <div class="atlas-table-wrap" tabIndex={0} role="region" aria-label="Extended key fields, scrollable">
        <table class="manual-table atlas-xkey__table">
          <caption>Node {serialization.path}, serialized both ways. Of the 78 payload bytes, only the version and the key data differ; the checksum then differs as a consequence.</caption>
          <thead>
            <tr><th scope="col">Field</th><th scope="col">Bytes</th><th scope="col">xpub</th><th scope="col">xprv</th></tr>
          </thead>
          <tbody>
            {FIELDS.map((f, i) => {
              const same = pubFields[i] === prvFields[i];
              return (
                <tr data-same={same ? "true" : "false"}>
                  <th scope="row">
                    <i class={`atlas-xkey__swatch atlas-xkey__seg--${i}`} aria-hidden="true" />
                    {f.name}
                    <small>{f.note}</small>
                  </th>
                  <td class="atlas-nowrap">{f.bytes}</td>
                  <td><code title={pubFields[i]}>{short(pubFields[i])}</code></td>
                  <td>{same ? <span class="atlas-xkey__same">same</span> : <code title={prvFields[i]}>{short(prvFields[i])}</code>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <dl class="atlas-hexlist">
        <dt>xpub · {pub.base58.length} Base58 characters</dt>
        <dd><code>{pub.base58}</code></dd>
        <dt>xprv · {prv.base58.length} Base58 characters</dt>
        <dd><code>{prv.base58}</code></dd>
      </dl>
    </div>
  );
}
