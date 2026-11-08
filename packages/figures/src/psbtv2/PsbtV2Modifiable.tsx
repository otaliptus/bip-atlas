import { Drawing, Value } from "../kit";
import type { DerivedPsbtV2Fixture } from "../types";

const BITS = ["INPUTS MODIFIABLE", "OUTPUTS MODIFIABLE", "HAS SIGHASH_SINGLE"];
const bit = (flags: number, b: number) => (flags >> b) & 1;

/**
 * psbt-v2-modifiable.v1 — static. PSBT_GLOBAL_TX_MODIFIABLE as eight bit
 * cells (bits 0–2 defined, 3–7 undefined), what a Constructor may add with
 * the first vector's flags, and the flags after one signature of each
 * sighash type, as BIP 370's Signer rules set them. A second vector with
 * every bit set shows undefined bits are still valid.
 */
export function PsbtV2Modifiable({ fixtures }: { fixtures: DerivedPsbtV2Fixture[] }) {
  const [f, all] = fixtures;
  const mv = f.derived.modifiableView;
  if (!mv || f.derived.modifiable === null) throw new Error(`psbt-v2-modifiable: ${f.id} has no flags`);
  const flags = f.derived.modifiable;
  const x0 = 14, W = 344, cw = 30;
  const bx = (b: number) => x0 + (7 - b) * cw;
  const tableY = 162;
  const rowH = 22;
  const H = tableY + 26 + mv.afterSigning.length * rowH + (all ? 30 : 8);
  const yes = (v: boolean) => (v ? "✓" : "✕");
  const desc =
    `PSBT_GLOBAL_TX_MODIFIABLE of ${f.label} (BIP 370 line ${f.hexLine}) is 0x${flags.toString(16).padStart(2, "0")}: ` +
    BITS.map((name, b) => `bit ${b}, ${name.toLowerCase()}, is ${bit(flags, b)}`).join("; ") +
    `. A Constructor may ${mv.may.addInputs ? "" : "not "}add inputs and may ${mv.may.addOutputs ? "" : "not "}add outputs. After one signature: ` +
    mv.afterSigning.map((s) => `${s.sighash} leaves 0x${s.flags.toString(16).padStart(2, "0")}, inputs ${s.may.addInputs ? "still" : "no longer"} addable, outputs ${s.may.addOutputs ? "still" : "no longer"} addable${s.may.checkSighashSingle ? ", SIGHASH_SINGLE flagged" : ""}`).join("; ") +
    "." + (all ? ` ${all.label} (line ${all.hexLine}) sets all eight bits, 0x${all.derived.modifiable!.toString(16)}, and is still valid.` : "");
  return (
    <Drawing id="a22-flags" width={W} height={H} title="PSBT_GLOBAL_TX_MODIFIABLE, bit by bit" desc={desc}>
      <Value at={[x0, 14]} text={`BIP 370 LINE ${f.hexLine} · TX_MODIFIABLE = 0x${flags.toString(16).padStart(2, "0")}`} size={8.5} cls="k-value--label" />
      {Array.from({ length: 8 }, (_, k) => 7 - k).map((b) => (
        <g data-bit={b}>
          <rect class={`k-cell ${b > 2 ? "k-fill--hidden" : bit(flags, b) ? "k-mark--plain" : "k-fill--plain"}`} x={bx(b)} y={26} width={cw - 2} height={24} />
          <Value at={[bx(b) + (cw - 2) / 2, 42]} text={String(bit(flags, b))} size={10} anchor="middle" cls={b <= 2 && bit(flags, b) ? "k-value--on" : ""} />
          <Value at={[bx(b) + (cw - 2) / 2, 62]} text={`BIT ${b}`} size={7} anchor="middle" cls="k-value--muted" />
        </g>
      ))}
      {BITS.map((name, b) => (
        <Value at={[x0, 78 + b * 13]} text={`BIT ${b} · ${name} = ${bit(flags, b)}`} size={7.5} cls={b <= 2 && bit(flags, b) ? "k-value--label" : "k-value--muted"} />
      ))}
      <Value at={[x0, 78 + 3 * 13]} text="BITS 3–7 · UNDEFINED" size={7.5} cls="k-value--muted" />
      <Value at={[x0, 138]} text={`A CONSTRUCTOR MAY ADD: INPUTS ${yes(mv.may.addInputs)} · OUTPUTS ${yes(mv.may.addOutputs)}`} size={8.5} cls="k-value--label" />
      <Value at={[x0, tableY]} text="AFTER ONE SIGNATURE (BIP 370's SIGNER RULES)" size={8} cls="k-value--label" />
      <Value at={[x0 + 6, tableY + 16]} text="SIGHASH TYPE" size={7} cls="k-value--muted" />
      <Value at={[150, tableY + 16]} text="FLAGS" size={7} cls="k-value--muted" />
      <Value at={[212, tableY + 16]} text="+INPUTS" size={7} anchor="middle" cls="k-value--muted" />
      <Value at={[260, tableY + 16]} text="+OUTPUTS" size={7} anchor="middle" cls="k-value--muted" />
      <Value at={[306, tableY + 16]} text="BIT 2" size={7} anchor="middle" cls="k-value--muted" />
      {mv.afterSigning.map((s, i) => {
        const y = tableY + 22 + i * rowH;
        return (
          <g data-sighash={s.sighash}>
            <rect class="k-outline k-fill--sig" x={x0} y={y} width={W - 2 * x0} height={rowH - 4} />
            <Value at={[x0 + 6, y + 12.5]} text={s.sighash} size={8} />
            <Value at={[150, y + 12.5]} text={`0x${s.flags.toString(16).padStart(2, "0")}`} size={8} />
            <Value at={[212, y + 12.5]} text={yes(s.may.addInputs)} size={9} anchor="middle" cls={s.may.addInputs ? "k-value--ok" : "k-value--fail"} />
            <Value at={[260, y + 12.5]} text={yes(s.may.addOutputs)} size={9} anchor="middle" cls={s.may.addOutputs ? "k-value--ok" : "k-value--fail"} />
            <Value at={[306, y + 12.5]} text={s.may.checkSighashSingle ? "SET" : "·"} size={7.5} anchor="middle" cls={s.may.checkSighashSingle ? "k-value--label" : "k-value--muted"} />
          </g>
        );
      })}
      {all ? <Value at={[x0, H - 10]} text={`LINE ${all.hexLine}: ALL EIGHT BITS SET (0x${all.derived.modifiable!.toString(16)}) IS STILL A VALID PSBT`} size={7.5} cls="k-value--muted" /> : null}
    </Drawing>
  );
}
