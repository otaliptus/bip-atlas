import type { DerivedMnemonicFixture } from "../types";

const groupHex = (hex: string) => hex.match(/.{1,8}/g)!.join(" ");
const shortHex = (hex: string) => `${hex.slice(0, 16)}…${hex.slice(-8)}`;

/**
 * seed-derivation.v1 — static. Mnemonic and passphrase into PBKDF2, out comes a
 * 64-byte seed. Seeds are computed by the tested model; the vector seed is also
 * checked against the pinned file at build and test time.
 */
export function SeedDerivation({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { seeds } = fixture.derived;
  return (
    <div class="atlas-seed">
      <p class="atlas-card__stamp">Public test values · never use for funds</p>
      <div class="atlas-seed__inputs">
        <div class="atlas-seed__box">
          <span class="atlas-seed__role">Password</span>
          <span class="atlas-seed__value">
            the sentence, <em>{fixture.mnemonic.split(" ").slice(0, 3).join(" ")} …</em>
          </span>
          <span class="atlas-seed__note">UTF-8, NFKD-normalized</span>
        </div>
        <div class="atlas-seed__box">
          <span class="atlas-seed__role">Salt</span>
          <span class="atlas-seed__value"><code>"mnemonic"</code> + passphrase</span>
          <span class="atlas-seed__note">UTF-8, NFKD-normalized</span>
        </div>
      </div>
      <div class="atlas-seed__arrow" aria-hidden="true">↓</div>
      <div class="atlas-seed__box atlas-seed__kdf">
        <span class="atlas-seed__role">PBKDF2</span>
        <span class="atlas-seed__value">HMAC-SHA512 · 2,048 iterations · 64-byte output</span>
      </div>
      <div class="atlas-seed__arrow" aria-hidden="true">↓</div>
      <ul class="atlas-seed__outputs">
        {seeds.map((s) => (
          <li class="atlas-seed__out">
            <span class="atlas-seed__role">
              Passphrase {s.passphrase ? <code>"{s.passphrase}"</code> : <>empty <code>""</code></>}
            </span>
            <code class="atlas-seed__hex" aria-label={`Seed ${s.seedHex}`}>{shortHex(s.seedHex)}</code>
            <span class="atlas-seed__note">
              {s.origin === "vector" ? "Matches the published test vector" : "Computed by the tested implementation"}
            </span>
          </li>
        ))}
      </ul>
      <details class="atlas-disclosure">
        <summary>Exact seeds, all 64 bytes</summary>
        <dl class="atlas-hexlist">
          {seeds.map((s) => (
            <>
              <dt>Passphrase {s.passphrase ? `"${s.passphrase}"` : `"" (empty)`}</dt>
              <dd><code>{groupHex(s.seedHex)}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </div>
  );
}
