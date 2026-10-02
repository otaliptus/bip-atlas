import { PBKDF2_ITERATIONS } from "@bip-atlas/models/bip39";
import { Arrow, Bracket, Cells, Drawing, Machine, Value, idsFor } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

/** seed-derivation.v1 — static. Sentence and salt into PBKDF2, 2,048 rounds, out comes the 64-byte seed (published vector). */
export function SeedDerivation({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const seed = fixture.derived.seeds.find((s) => s.origin === "vector")!;
  const bytes = seed.seedHex.match(/.{2}/g)!;
  const ids = idsFor("a01-seed");
  const head = fixture.mnemonic.split(" ").slice(0, 3).join(" ");
  const rounds = PBKDF2_ITERATIONS.toLocaleString("en-US");
  return (
    <Drawing
      id="a01-seed"
      width={340}
      height={446}
      title="Words and passphrase to seed"
      desc={`PBKDF2 with HMAC-SHA512 runs ${rounds} times. Its password is the sentence (“${head} …”) and its salt is the text “mnemonic” followed by the passphrase “${seed.passphrase}”. The result is the 64-byte seed ${seed.seedHex}, which matches the published vector.`}
    >
      <rect class="k-outline k-fill--secret" x="14" y="14" width="150" height="34" />
      <Value at={[22, 28]} text="PASSWORD" size={8} cls="k-value--muted" />
      <Value at={[22, 42]} text={`${head} …`} size={10} />
      <rect class="k-outline k-fill--secret" x="176" y="14" width="150" height="34" />
      <Value at={[184, 28]} text="SALT" size={8} cls="k-value--muted" />
      <Value at={[184, 42]} text={`"mnemonic" + "${seed.passphrase}"`} size={10} />
      <Arrow d="M89 48 V70 H138" ids={ids} />
      <Arrow d="M251 48 V70 H206" ids={ids} />
      <Machine at={[170, 96]} w={80} d={44} h={36} label="PBKDF2" sub="HMAC-SHA512" />
      <path class="k-leader" d="M252 118 a12 8 0 1 1 0.1 0" marker-end={ids.arrow} />
      <Value at={[270, 122]} text={`× ${rounds}`} size={11} />
      <Arrow d="M194 166 V192" ids={ids} />
      <Cells x={114} y={200} values={bytes} size={20} perRow={8} rowGap={0} roleOf={() => "secret"} />
      <Bracket x1={114} x2={114 + 8 * 20} y={200 + 8 * 20 + 4} text="seed · 64 bytes = 512 bits" />
      <Value at={[194, 412]} text="MATCHES THE PUBLISHED VECTOR" anchor="middle" size={9} cls="k-value--muted" />
    </Drawing>
  );
}
