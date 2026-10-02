import { Bracket, Cells, Drawing, Value } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

const name = (p: string) => (p ? `"${p}"` : "empty");

/** passphrase-seeds.v1 — static. The same words with two passphrases: two unrelated 64-byte seeds, side by side. */
export function PassphraseSeeds({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const seeds = fixture.derived.seeds;
  const size = 19;
  return (
    <Drawing
      id="a01-pass"
      width={340}
      height={222}
      title="Same words, two passphrases"
      desc={seeds.map((s) => `With passphrase ${name(s.passphrase)} the seed is ${s.seedHex}${s.origin === "vector" ? " (published vector)" : " (computed by the tested implementation)"}.`).join(" ")}
    >
      {seeds.map((s, k) => {
        const x = 14 + k * 168;
        return (
          <g>
            <Value at={[x, 18]} text={`PASSPHRASE ${name(s.passphrase).toUpperCase()}`} size={9} />
            <Cells x={x} y={30} values={s.seedHex.match(/.{2}/g)!} size={size} perRow={8} rowGap={0} roleOf={() => "secret"} />
            <Bracket x1={x} x2={x + 8 * size} y={30 + 8 * size + 4} text={s.origin === "vector" ? "published vector" : "computed"} />
          </g>
        );
      })}
    </Drawing>
  );
}
