import { Bracket, Drawing, Value, idsFor } from "../kit";
import type { DerivedTransactionFixture } from "../types";
import { PartsRow, placeParts } from "./PartsRow";
import { KeyCheck, WitnessLabels, witnessParts } from "./WitnessField";


/**
 * nested-input.v1 — static. One P2SH-wrapped P2WPKH input: a scriptSig that
 * pushes a 22-byte redeem script (witness version 0, then a push of the 20-byte witness program, a key hash), and a
 * two-item witness whose key hashes to that program.
 */
export function NestedInput({ fixture }: { fixture: DerivedTransactionFixture }) {
  const d = fixture.derived;
  const k = d.inputs.findIndex((i) => i.scriptSig === "program-push");
  const input = d.inputs[k];
  if (!input || !input.programHex) throw new Error(`nested-input: ${fixture.id} has no nested witness program`);
  const ids = idsFor("a03-nested");
  const sig = input.scriptSigHex;
  // scriptSig: its push opcode, then the program's version byte, its push of 20 and the 20-byte hash.
  const progBytes = (sig.length - 2) / 2;
  const sigPlaced = placeParts(
    [
      { kind: "byte", hex: sig.slice(0, 2) },
      { kind: "byte", hex: sig.slice(2, 4) },
      { kind: "byte", hex: sig.slice(4, 6) },
      { kind: "block", bytes: 20, role: "hash", text: `program · 20 B` },
    ],
    14, 18, 6,
  );
  const witPlaced = placeParts(witnessParts(input), 14, 18, 1.75);
  const y1 = 70, y2 = 150;
  const hashPart = sigPlaced[3];
  return (
    <>
      <Drawing
        id="a03-nested"
        width={344}
        height={310}
        title="One input with a scriptSig and a witness"
        desc={`Input ${k} of the ${fixture.label} example. Its scriptSig is ${sig.length / 2} bytes: the push opcode ${sig.slice(0, 2)} and the ${progBytes}-byte redeem script ${sig.slice(2)}: the witness version byte ${sig.slice(2, 4)}, then a push of 20 bytes (${sig.slice(4, 6)}) of the witness program, a key hash. Its witness holds a ${input.witness[0].length / 2}-byte signature and a ${input.witness[1].length / 2}-byte public key, whose HASH160 is that key hash.`}
      >
        <Value at={[14, 14]} text={`INPUT ${k} · SCRIPTSIG · ${sig.length / 2} B`} size={9} cls="k-value--label" />
        <PartsRow placed={sigPlaced} y={y1} />
        <Bracket x1={sigPlaced[1].x} x2={hashPart.x + hashPart.w} y={y1 + 24} text={`redeem script · ${progBytes} B`} align="start" />
        {/* Elbow leaders: the leftmost byte gets the highest label, so no leader crosses another. */}
        {[`push of ${progBytes} bytes`, "witness version 0", "push of the 20-byte program"].map((t, j) => {
          const cx = sigPlaced[j].x + 9, ly = y1 - 36 + j * 12;
          return (
            <g class="k-label">
              <path class="k-leader" d={`M${cx} ${y1} V${ly} H${100}`} />
              <text x={104} y={ly + 3.3}>{t.toUpperCase()}</text>
            </g>
          );
        })}
        <Value at={[14, y2 - 12]} text={`INPUT ${k} · WITNESS · ${input.witness.length} ITEMS`} size={9} cls="k-value--label" />
        <PartsRow placed={witPlaced} y={y2} />
        <WitnessLabels placed={witPlaced} y={y2 + 20} input={input} />
        <KeyCheck ids={ids} keyPart={witPlaced.at(-1)!} y={y2 + 22} input={input} />
        <Value at={[14, 302]} text="THE SAME KEY HASH THE SCRIPTSIG PUSHES" size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact scriptSig and witness</summary>
        <dl class="atlas-hexlist">
          <dt>scriptSig ({sig.length / 2} bytes)</dt><dd><code class="atlas-break">{sig}</code></dd>
          {input.witness.map((w, j) => (
            <>
              <dt>Witness item {j} ({w.length / 2} bytes)</dt>
              <dd><code class="atlas-break">{w}</code></dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
