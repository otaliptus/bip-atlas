import { Arrow, Cells, Drawing, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

const STEPS = ["encode", "stretch", "derive"] as const;

/** mnemonic-chain.v1 — static. Entropy → words → seed → (BIP 32, next chapter): three different steps, three different secrets. */
export function MnemonicChain({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const words = fixture.mnemonic.split(" ");
  const seed = fixture.derived.seeds.find((s) => s.origin === "vector")!;
  const desc = `Three steps, each producing a different secret. Encode: the ${fixture.derived.layout.entropyBits}-bit entropy becomes ${words.length} words. Stretch: PBKDF2 turns the words and passphrase into a 64-byte seed beginning ${seed.seedHex.slice(0, 8)}. Derive: BIP 32, the next chapter, grows keys from the seed.`;
  const parts = (ids: DrawingIds, horizontal: boolean) => {
    const at = (i: number): [number, number] => (horizontal ? [20 + i * 160, 40] : [40, 20 + i * 118]);
    return (
      <>
        <g transform={`translate(${at(0)[0]} ${at(0)[1]})`}>
          <Cells x={0} y={0} values={Array(16).fill("")} size={7} perRow={8} rowGap={0} roleOf={() => "secret"} text={false} />
          <Value at={[0, 30]} text="ENTROPY" size={8.5} />
        </g>
        <g transform={`translate(${at(1)[0]} ${at(1)[1]})`}>
          <rect class="k-outline k-fill--plain" width="74" height="54" />
          {words.slice(0, 4).map((w, i) => <Value at={[6, 12 + i * 11]} text={w} size={8.5} />)}
          <Value at={[0, 66]} text={`WORDS · ${words.length}`} size={8.5} />
        </g>
        <g transform={`translate(${at(2)[0]} ${at(2)[1]})`}>
          <Cells x={0} y={0} values={Array(64).fill("")} size={6} perRow={8} rowGap={0} roleOf={() => "secret"} text={false} />
          <Value at={[0, 60]} text="SEED · 64 BYTES" size={8.5} />
        </g>
        <g transform={`translate(${at(3)[0]} ${at(3)[1]})`} class="k-faded">
          <circle class="k-outline k-fill--plain" cx="24" cy="6" r="5" />
          <path class="k-leader" d="M24 11 L10 30 M24 11 L38 30 M10 30 L4 48 M10 30 L16 48 M38 30 L32 48 M38 30 L44 48" />
          <Value at={[0, 64]} text="KEYS · BIP 32" size={8.5} />
        </g>
        {STEPS.map((s, i) => {
          const [x, y] = at(i);
          const d = horizontal ? `M${x + 84} ${y + 20} H${x + 150}` : `M${x + 30} ${y + 76} V${y + 110}`;
          const t: [number, number] = horizontal ? [x + 117, y + 12] : [x + 110, y + 96];
          return <Arrow d={d} ids={ids} label={s} at={t} />;
        })}
      </>
    );
  };
  return (
    <Responsive
      wide={<Drawing id="a01-chain-w" width={680} height={130} title="Still not a key" desc={desc}>{parts(idsFor("a01-chain-w"), true)}</Drawing>}
      narrow={<Drawing id="a01-chain-n" width={300} height={480} title="Still not a key" desc={desc}>{parts(idsFor("a01-chain-n"), false)}</Drawing>}
    />
  );
}
