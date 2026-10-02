import { Arrow, Cells, Drawing, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedMnemonicFixture } from "../types";

const STEPS = ["encode", "stretch", "derive"] as const;

/**
 * mnemonic-chain.v1 — static. Entropy → words → seed → (BIP 32, next chapter).
 * Encoding rewrites the same secret as words; stretching computes a new value
 * from the words and the passphrase; deriving keys is the next chapter.
 */
export function MnemonicChain({ fixture }: { fixture: DerivedMnemonicFixture }) {
  const { layout } = fixture.derived;
  const words = fixture.mnemonic.split(" ");
  const seed = fixture.derived.seeds.find((s) => s.origin === "vector")!;
  const seedBytes = seed.seedHex.length / 2;
  const desc =
    `Encode rewrites the ${layout.entropyBits}-bit entropy as ${words.length} words: the same secret in another form, plus a ${layout.checksumBits}-bit checksum. ` +
    `Stretch computes a new ${seedBytes}-byte seed, beginning ${seed.seedHex.slice(0, 8)}, from the words and the passphrase. ` +
    `Derive: BIP 32, the next chapter, grows keys from the seed.`;
  const parts = (ids: DrawingIds, horizontal: boolean) => {
    const at = (i: number): [number, number] => (horizontal ? [20 + i * 160, 40] : [70, 20 + i * 118]);
    const [sx, sy] = at(1);
    // Where the passphrase joins the stretch arrow.
    const join: [number, number] = horizontal ? [sx + 117, sy + 20] : [sx + 30, sy + 93];
    return (
      <>
        <g transform={`translate(${at(0)[0]} ${at(0)[1]})`}>
          <Cells x={0} y={0} values={Array(layout.entropyBits / 8).fill("")} size={7} perRow={8} rowGap={0} roleOf={() => "secret"} text={false} />
          <Value at={[0, (layout.entropyBits / 64) * 7 + 16]} text="ENTROPY" size={8.5} />
        </g>
        <g transform={`translate(${sx} ${sy})`}>
          <rect class="k-outline k-fill--secret" width="74" height="54" />
          {words.slice(0, 3).map((w, i) => <Value at={[6, 12 + i * 11]} text={w} size={8.5} />)}
          <Value at={[6, 45]} text="…" size={8.5} />
          <Value at={[0, 66]} text={`WORDS · ${words.length}`} size={8.5} />
        </g>
        <g transform={`translate(${at(2)[0]} ${at(2)[1]})`}>
          <Cells x={0} y={0} values={Array(seedBytes).fill("")} size={6} perRow={8} rowGap={0} roleOf={() => "secret"} text={false} />
          <Value at={[0, (seedBytes / 8) * 6 + 12]} text={`SEED · ${seedBytes} BYTES`} size={8.5} />
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
        {horizontal ? (
          <>
            <rect class="k-outline k-fill--secret" x={join[0] - 30} y={sy + 50} width="60" height="16" />
            <Value at={[join[0], sy + 61]} text="PASSPHRASE" size={7.5} anchor="middle" />
            <Arrow d={`M${join[0]} ${sy + 50} V${join[1] + 4}`} ids={ids} />
          </>
        ) : (
          <>
            <rect class="k-outline k-fill--secret" x={0} y={join[1] - 8} width="60" height="16" />
            <Value at={[30, join[1] + 3]} text="PASSPHRASE" size={7.5} anchor="middle" />
            <Arrow d={`M60 ${join[1]} H${join[0] - 4}`} ids={ids} />
          </>
        )}
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
