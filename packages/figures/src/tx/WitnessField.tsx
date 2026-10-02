import { Arrow, Bracket, Drawing, Label, Machine, Value, idsFor, type DrawingIds } from "../kit";
import type { DerivedTransactionFixture, TxInputView } from "../types";
import { PartsRow, placeParts, type Part, type PlacedPart } from "./PartsRow";
import { shortHex, txFields } from "./fields";

const lenHex = (hex: string) => (hex.length / 2).toString(16).padStart(2, "0");

/** The parts of one input's witness field: count, then each item's length and the item. */
export function witnessParts(input: TxInputView): Part[] {
  const parts: Part[] = [{ kind: "byte", hex: input.witness.length.toString(16).padStart(2, "0") }];
  input.witness.forEach((item, k) => {
    parts.push({ kind: "byte", hex: lenHex(item) });
    const p2wpkh = input.witnessKind === "p2wpkh";
    parts.push({ kind: "block", bytes: item.length / 2, role: p2wpkh ? (k === 0 ? "sig" : "public") : "plain", text: p2wpkh ? (k === 0 ? `signature · ${item.length / 2} B` : `key ${item.length / 2} B`) : `item ${k}` });
  });
  return parts;
}

/** Labels under a witness field's count and length bytes. */
export function WitnessLabels({ placed, y, input }: { placed: PlacedPart[]; y: number; input: TxInputView }) {
  return (
    <>
      <Label at={[placed[0].x + 9, y]} side="down" len={12} text="count" />
      {input.witness.map((w, k) => <Label at={[placed[1 + 2 * k].x + 9, y]} side="down" len={k % 2 ? 12 : 28} text={`len ${w.length / 2}`} />)}
    </>
  );
}

/**
 * HASH160 check of a P2WPKH witness key against the 20-byte program: an
 * arrow down from the key into a HASH160 machine, the program to its left.
 */
export function KeyCheck({ ids, keyPart: key, y, input }: { ids: DrawingIds; keyPart: PlacedPart; y: number; input: TxInputView }) {
  if (input.witnessKind !== "p2wpkh" || !input.programHex) throw new Error("KeyCheck needs a P2WPKH input");
  const kx = key.x + key.w / 2;
  const mx = kx - 26;
  return (
    <g>
      <Arrow d={`M${kx} ${y} V${y + 46}`} ids={ids} />
      <Machine at={[mx, y + 76]} w={52} d={28} h={22} label="HASH160" role="hash" />
      <Arrow d={`M${mx - 28} ${y + 84} H${150}`} ids={ids} />
      <Value at={[14, y + 72]} text="= THE 20-BYTE PROGRAM" size={8.5} cls="k-value--label" />
      <Value at={[14, y + 86]} text={shortHex(input.programHex, 16)} size={9.5} cls="k-value--hash" />
    </g>
  );
}

/**
 * witness-field.v1 — static. The witness section of a published transaction,
 * zoomed: one field per input, an empty one written 0x00, and a P2WPKH field
 * holding a count, two lengths, a signature and a key whose HASH160 is the
 * program.
 */
export function WitnessField({ fixture }: { fixture: DerivedTransactionFixture }) {
  const d = fixture.derived;
  const ids = idsFor("a03-witfield");
  const total = txFields(d).filter((f) => f.part === "witness").reduce((n, f) => n + f.bytes, 0);
  const keyInput = d.inputs.find((i) => i.witnessKind === "p2wpkh");
  if (!keyInput) throw new Error(`witness-field: ${fixture.id} has no P2WPKH input`);
  // Each input's field, left to right, with a gap between fields.
  let x = 14;
  const rows = d.inputs.map((input, i) => {
    const placed = placeParts(witnessParts(input), x, 18, 1.75);
    const end = placed[placed.length - 1];
    const r = { i, input, placed, x1: x, x2: end.x + end.w };
    x = r.x2 + 44;
    return r;
  });
  const y = 54;
  const keyPart = rows.find((r) => r.input === keyInput)!.placed.at(-1)!;
  return (
    <>
      <Drawing
        id="a03-witfield"
        width={344}
        height={222}
        title="The witness section, byte by byte"
        desc={`The witness section of the ${fixture.label} example, ${total} bytes, one field per input. ${rows
          .map((r) => (r.input.witness.length ? `Input ${r.i}: count ${r.input.witness.length}, then ${r.input.witness.map((w, k) => `a length byte and item ${k} of ${w.length / 2} bytes`).join(", ")}.` : `Input ${r.i}: empty, the single byte 00.`))
          .join(" ")} The key hashes with HASH160 to the 20-byte program ${keyInput.programHex}.`}
      >
        <Value at={[14, 16]} text={`WITNESS SECTION · ${total} BYTES`} size={9} cls="k-value--label" />
        {rows.map((r) => (
          <>
            <PartsRow placed={r.placed} y={y} />
            <Bracket x1={r.x1} x2={r.x2} y={y - 4} below={false} text={r.input.witness.length ? `input ${r.i} · ${r.input.witness.length} items` : `input ${r.i}`} align="start" />
            {r.input.witness.length ? <WitnessLabels placed={r.placed} y={y + 20} input={r.input} /> : <Label at={[r.placed[0].x + 9, y + 20]} side="down" len={12} text="empty" />}
          </>
        ))}
        <KeyCheck ids={ids} keyPart={keyPart} y={y + 22} input={keyInput} />
        <Value at={[14, 212]} text="THE PROGRAM IS IN THE OUTPUT BEING SPENT" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact witness items</summary>
        <dl class="atlas-hexlist">
          {rows.map((r) => r.input.witness.map((w, k) => (
            <>
              <dt>Input {r.i}, item {k} ({w.length / 2} bytes)</dt>
              <dd><code class="atlas-break">{w}</code></dd>
            </>
          )))}
          <dt>HASH160 of the key = the 20-byte program</dt><dd><code class="atlas-break">{keyInput.programHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
