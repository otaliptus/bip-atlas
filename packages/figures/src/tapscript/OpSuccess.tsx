import { Arrow, Lamp, Storyboard, Value, type Frame } from "../kit";
import type { DerivedTapscriptFixture } from "../types";

/**
 * tapscript-op-success.v1 — static. The two recorded witnesses of the
 * OP_SUCCESS case, as the decoder sees them. In the success witness the
 * decoder meets an OP_SUCCESSx and a trapdoor ends validation as valid
 * before anything runs; the failure witness's script runs and leaves
 * nothing on the stack.
 */
export function OpSuccess({ fixture }: { fixture: DerivedTapscriptFixture }) {
  const s = fixture.derived.success, f = fixture.derived.failure;
  if (s.opSuccess === null || !s.valid || s.steps.length) throw new Error(`${fixture.id}: the success witness must end at an OP_SUCCESS opcode`);
  if (f.opSuccess !== null || f.valid) throw new Error(`${fixture.id}: the failure witness must run and fail`);
  const byte = (hex: string) => `0x${hex.slice(0, 2)}`;
  const frames: Frame[] = [
    {
      note: `Success witness: the script is the byte ${byte(s.scriptHex)}, ${s.opSuccess}. The decoder stops there and the spend is valid; nothing runs.`,
      desc: `The script ${s.scriptHex} decodes to ${s.ops.map((o) => o.name).join(" ")}. ${s.reason[0].toUpperCase()}${s.reason.slice(1)}.`,
      draw: (ids) => (
        <>
          <Value at={[14, 18]} text="DECODER" size={8.5} cls="k-value--label" />
          <rect class="k-outline k-fill--plain k-cell--em" x="14" y="28" width="44" height="22" />
          <Value at={[36, 43]} text={byte(s.scriptHex)} size={9.5} anchor="middle" />
          <Arrow d="M60 39 H84" ids={ids} />
          <Value at={[90, 43]} text={s.opSuccess!} size={9.5} />
          {/* A trapdoor: the floor of the path hinged open. */}
          <path class="k-ring" d="M14 86 H120" />
          <path class="k-ring" d="M120 86 L146 108" />
          <path class="k-ring" d="M176 86 H286" />
          <Value at={[150, 80]} text="TRAPDOOR" size={8.5} cls="k-value--label" />
          <Lamp at={[150, 118]} state="on" label="VALID" />
          <Value at={[190, 104]} text="RUN, STACK CHECKS:" size={8} cls="k-value--muted" />
          <Value at={[190, 116]} text="NEVER REACHED" size={8} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `Failure witness: the script is the byte ${byte(f.scriptHex)}, ${f.ops.map((o) => o.name).join(" ")}. It runs, leaves no element, and fails: ${f.reason}.`,
      desc: `The script ${f.scriptHex} decodes to ${f.ops.map((o) => o.name).join(" ")}; it runs and ${f.reason}.`,
      draw: (ids) => (
        <>
          <Value at={[14, 18]} text="DECODER" size={8.5} cls="k-value--label" />
          <rect class="k-outline k-fill--plain" x="14" y="28" width="44" height="22" />
          <Value at={[36, 43]} text={byte(f.scriptHex)} size={9.5} anchor="middle" />
          <Arrow d="M60 39 H84" ids={ids} />
          <Value at={[90, 43]} text={f.ops.map((o) => o.name).join(" ")} size={9.5} />
          <path class="k-ring" d="M14 86 H286" />
          <Value at={[14, 108]} text="RUNS · STACK AFTER: EMPTY" size={8.5} cls="k-value--label" />
          <rect class="k-outline k-fill--plain k-dashed" x="14" y="114" width="70" height="14" />
          <Lamp at={[262, 112]} state="off" label="INVALID" />
        </>
      ),
    },
  ];
  return <Storyboard id="a08-success" title={`Core case ${fixture.caseIndex}: an OP_SUCCESS opcode`} width={300} height={140} frames={frames} />;
}
