import { Drawing, Value, idsFor } from "../kit";
import type { DerivedTapscriptFixture } from "../types";

/** The symbolic policy: how many signatures it requires, and which key slots receive one. */
export const MULTISIG_REQUIRED = 2;
const MULTISIG_SLOTS = [true, false, true];

/** Running CHECKSIG / CHECKSIGADD counts for the slots; throws unless the final count meets the requirement. */
export function multisigTally(required = MULTISIG_REQUIRED, slots = MULTISIG_SLOTS) {
  const counts = slots.map((_, i) => slots.slice(0, i + 1).filter(Boolean).length);
  const total = counts[counts.length - 1] ?? 0;
  if (total !== required) throw new Error(`multisig illustration: ${total} signatures drawn, policy requires ${required}`);
  return { required, slots, counts, total };
}

/** A symbolic threshold policy beside the recorded failure of the old opcode. */
export function MultisigChain({ fixture }: { fixture: DerivedTapscriptFixture }) {
  const v = fixture.derived.failure;
  const last = v.steps[v.steps.length - 1];
  if (!last?.failed || last.name !== "OP_CHECKMULTISIG") throw new Error(`${fixture.id}: expected the disabled opcode to fail`);
  const before = v.steps.slice(0, -1).filter((s) => s.executed).length;
  // This is a symbolic policy, not an invented signed transaction or test vector.
  const { required, slots, counts, total } = multisigTally();
  const ids = idsFor("a08-multisig");
  return (
    <Drawing id="a08-multisig" width={344} height={382} title="Counting signatures in a symbolic policy"
      desc={`A symbolic illustration of a ${required}-of-${slots.length} policy, not a recorded script run: no keys or signatures from a test vector are drawn. Signature, empty slot, signature: the count goes ${counts.join(", ")}. CHECKSIG starts the count; CHECKSIGADD adds one for a valid signature or zero for an empty one. NUMEQUAL compares the result with the required count. A non-empty invalid signature fails immediately. Separately, Core case ${fixture.caseIndex}'s failure witness reaches the disabled OP_CHECKMULTISIG after ${before} opcodes and fails.`}>
      <Value at={[14, 16]} text={`SYMBOLIC POLICY · ${required} OF ${slots.length} KEYS · NOT A RECORDED RUN`} size={8.5} cls="k-value--label" />
      <Value at={[14, 34]} text="A slot can be empty. A bad signature cannot pass." size={8} cls="k-value--muted" />
      {slots.map((signed, i) => {
        const y = 57 + i * 74;
        const count = counts[i];
        return <g data-slot={signed ? "signature" : "empty"}>
          <rect class={`k-outline ${signed ? "k-fill--sig" : "k-fill--plain k-dashed"}`} x="14" y={y} width="80" height="35" rx="2" />
          <Value at={[54, y + 15]} text={signed ? "SIGNATURE" : "EMPTY SLOT"} size={8} anchor="middle" />
          <Value at={[54, y + 27]} text={signed ? "valid" : "no signature"} size={8} anchor="middle" cls="k-value--muted" />
          <path class="k-line" d={`M100 ${y + 17} H124`} marker-end={ids.arrow} />
          <rect class="k-outline k-fill--public" x="130" y={y} width="119" height="35" />
          <Value at={[189, y + 14]} text={`KEY ${i + 1}`} size={8} anchor="middle" cls="k-value--label" />
          <Value at={[189, y + 27]} text={i ? "CHECKSIGADD" : "CHECKSIG"} size={9} anchor="middle" />
          <path class="k-line" d={`M253 ${y + 17} H275`} marker-end={ids.arrow} />
          <circle class="k-outline k-fill--plain" cx="301" cy={y + 17} r="19" />
          <Value at={[301, y + 23]} text={String(count)} size={19} anchor="middle" />
          {i < slots.length - 1 && <path class="k-leader" d={`M301 ${y + 40} V${y + 58} H189 V${y + 70}`} marker-end={ids.arrow} />}
          <Value at={[14, y + 49]} text={signed ? "contributes one" : "contributes zero"} size={8} cls="k-value--muted" />
        </g>;
      })}
      <path class="k-line" d="M301 245 V273 H270" marker-end={ids.arrow} />
      <rect class="k-outline k-fill--plain k-cell--em" x="14" y="265" width="249" height="44" />
      <Value at={[28, 282]} text={`NUMEQUAL · REQUIRED ${required}`} size={9} cls="k-value--label" />
      <Value at={[28, 301]} text={`${total} = ${required}   ✓   POLICY SATISFIED`} size={11} />
      <line class="k-sep k-leader" x1="14" y1="330" x2="330" y2="330" />
      <Value at={[14, 349]} text="✕ OP_CHECKMULTISIG IS DISABLED" size={9} cls="k-value--label" />
      <Value at={[14, 365]} text={`CORE ${fixture.caseIndex}: FAILS AFTER ${before} OPCODES`} size={8} cls="k-value--muted" />
    </Drawing>
  );
}
