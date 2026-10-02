import { Arrow, Drawing, IsoBox, Machine, Value, idsFor } from "../kit";

const XS = [44, 124, 204, 284];
const SUMMARIES = ["hashPrevouts", "hashSequence", "hashOutputs"];

/**
 * sighash-reuse.v1 — static, schematic (no values). Four inputs signed under
 * the original digest (each check hashes a copy of the whole transaction)
 * and under BIP 143 (three summary hashes made once, then one fixed-shape
 * preimage per input).
 */
export function SighashReuse() {
  const ids = idsFor("a03-reuse");
  const bar = (y: number) => (
    <>
      <rect class="k-cell k-fill--plain" x="14" y={y} width="316" height="16" />
      <Value at={[20, y + 11.5]} text="THE WHOLE TRANSACTION" size={8.5} />
    </>
  );
  return (
    <Drawing
      id="a03-reuse"
      width={344}
      height={372}
      title="Hashing once, or once per input"
      desc="Schematic, four inputs. Original digest: each of the four signature checks hashes its own copy of the whole transaction, so the hashing grows with the number of inputs times the size of the transaction. BIP 143: hashPrevouts, hashSequence and hashOutputs are each computed once from the transaction; each input's preimage then combines those three summaries with that input's own items, and has the same fixed shape for every input."
    >
      <Value at={[14, 14]} text="ORIGINAL DIGEST" size={9} cls="k-value--label" />
      {bar(24)}
      {XS.map((x, k) => (
        <g>
          <Arrow d={`M${x} 42 V58`} ids={ids} />
          <Machine at={[x - 8, 88]} w={34} d={22} h={18} label="" role="hash" />
          <Value at={[x, 134]} text={`INPUT ${k}`} size={8.5} anchor="middle" cls="k-value--label" />
        </g>
      ))}
      <Value at={[14, 152]} text="EACH CHECK HASHES A COPY OF THE WHOLE TX" size={8.5} cls="k-value--muted" />
      <line class="k-sep" x1="14" y1="164" x2="330" y2="164" />
      <Value at={[14, 184]} text="BIP 143" size={9} cls="k-value--label" />
      {bar(194)}
      {SUMMARIES.map((name, k) => {
        const x = 70 + k * 102;
        return (
          <g>
            <Arrow d={`M${x} 212 V228`} ids={ids} />
            <IsoBox at={[x, 236]} w={14} d={14} h={10} role="hash" />
            <Value at={[x + 14, 244]} text={name} size={8.5} />
          </g>
        );
      })}
      {XS.map((x, k) => (
        <g>
          {SUMMARIES.map((_, j) => <line class="k-leader" x1={70 + j * 102} y1={254} x2={x} y2={288} />)}
          <rect class="k-cell k-fill--plain" x={x - 30} y={290} width="60" height="18" />
          <Value at={[x, 302.5]} text="PREIMAGE" size={8} anchor="middle" />
          <rect class="k-cell k-fill--plain k-dashed" x={x - 30} y={308} width="60" height="10" />
          <Value at={[x, 330]} text={`INPUT ${k}`} size={8.5} anchor="middle" cls="k-value--label" />
        </g>
      ))}
      <Value at={[14, 350]} text="THREE SUMMARIES ONCE, THEN ONE FIXED-SHAPE" size={8.5} cls="k-value--muted" />
      <Value at={[14, 362]} text="PREIMAGE PER INPUT (DASHED: ITS OWN ITEMS)" size={8.5} cls="k-value--muted" />
    </Drawing>
  );
}
