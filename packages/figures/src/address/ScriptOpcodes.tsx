import { CHARSET, analyzeSegwitAddress } from "@bip-atlas/models/bech32";
import { Arrow, Drawing, Value, idsFor } from "../kit";
import type { AddressFixture } from "../types";

const short = (s: string, n: number) => `${s.slice(0, n)}…`;

/**
 * address-script.v1 — static. From address to output script for a v0 and a
 * v1 example: the version character becomes a number and then an opcode
 * (0x00, or 0x50 + n), followed by the program's length and the program.
 * Every byte from the tested bech32 model.
 */
export function ScriptOpcodes({ fixtures }: { fixtures: AddressFixture[] }) {
  const rows = fixtures.map((f) => {
    const a = analyzeSegwitAddress(f.address, f.network);
    if (!a.valid) throw new Error(`address-script.v1 needs valid fixtures; ${f.id} is not`);
    const vchar = f.address[f.address.lastIndexOf("1") + 1].toLowerCase();
    if (CHARSET.indexOf(vchar) !== a.witnessVersion) throw new Error(`${f.id}: version character does not match`);
    return { f, a, vchar };
  });
  const ids = idsFor("a04-script");
  const desc = rows
    .map(({ f, a, vchar }) => `${f.address}: version character ${vchar} is ${a.witnessVersion}, written as the opcode byte ${a.scriptPubKeyHex!.slice(0, 2)}; then ${a.scriptPubKeyHex!.slice(2, 4)}, a push of ${a.programHex!.length / 2} bytes; then the program ${a.programHex}.`)
    .join(" ");
  return (
    <>
      <Drawing id="a04-script" width={344} height={34 + rows.length * 74} title="From address to script" desc={desc}>
        {rows.map(({ a, vchar }, i) => {
          const y = 18 + i * 74;
          const spk = a.scriptPubKeyHex!;
          return (
            <g>
              <rect class="k-cell k-fill--plain k-cell--em" x="14" y={y} width="22" height="22" />
              <Value at={[25, y + 15]} text={vchar} anchor="middle" size={11} />
              <Arrow d={`M40 ${y + 11} H56`} ids={ids} />
              <Value at={[62, y + 15]} text={String(a.witnessVersion)} size={11} />
              <Arrow d={`M76 ${y + 11} H92`} ids={ids} />
              <rect class="k-cell k-fill--plain" x="96" y={y} width="44" height="22" />
              <Value at={[102, y + 15]} text={spk.slice(0, 2)} size={10} />
              <rect class="k-cell k-fill--plain" x="140" y={y} width="44" height="22" />
              <Value at={[146, y + 15]} text={spk.slice(2, 4)} size={10} />
              <rect class="k-cell k-fill--plain" x="184" y={y} width="146" height="22" />
              <Value at={[190, y + 15]} text={short(a.programHex!, 14)} size={10} />
              <Value at={[14, y + 38]} text="VERSION" size={9} cls="k-value--label" />
              <Value at={[96, y + 38]} text={`OP_${a.witnessVersion}`} size={9} cls="k-value--label" />
              <Value at={[140, y + 38]} text={`PUSH ${a.programHex!.length / 2}`} size={9} cls="k-value--label" />
              <Value at={[184, y + 38]} text="PROGRAM" size={9} cls="k-value--label" />
            </g>
          );
        })}
        <Value at={[14, 18 + rows.length * 74]} text={`OP_0 = 0x00 · OP_1 … OP_16 = 0x${(0x51).toString(16)} … 0x${(0x60).toString(16)}`} size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact scripts</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {rows.map(({ f, a }) => <><dt>{f.label}</dt><dd><code class="atlas-break">{a.scriptPubKeyHex}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
