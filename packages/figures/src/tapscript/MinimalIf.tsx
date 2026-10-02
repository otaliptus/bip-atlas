import { Drawing, Lamp, Value, idsFor } from "../kit";
import type { DerivedTapscriptFixture, TapscriptTraceView } from "../types";

/** The element OP_IF consumes: the top of the stack just before it runs. */
function ifArgument(v: TapscriptTraceView) {
  const s = v.steps.find((x) => x.name === "OP_IF");
  if (!s) throw new Error("no OP_IF step");
  return { step: s, e: v.elements[s.before[s.before.length - 1]] };
}

/**
 * tapscript-minimalif.v1 — static. OP_IF as a slot cut for exactly two
 * shapes, the empty vector and the single byte 0x01. The recorded success
 * witness offers 0x01 and passes; the failure witness offers a 3-byte value,
 * which does not fit, and the script stops at OP_IF.
 */
export function MinimalIf({ fixture }: { fixture: DerivedTapscriptFixture }) {
  const ok = ifArgument(fixture.derived.success), bad = ifArgument(fixture.derived.failure);
  if (ok.step.failed || ok.e.hex !== "01" || !bad.step.failed) throw new Error(`${fixture.id}: expected 0x01 to pass OP_IF and the failure argument to stop it`);
  const ids = idsFor("a08-minimalif");
  const desc =
    `Under MINIMALIF, OP_IF and OP_NOTIF accept only an empty vector or the single byte 0x01. In Bitcoin Core case ${fixture.caseIndex}, ` +
    `the success witness gives OP_IF the byte ${ok.e.hex}, which fits. The failure witness gives it ${bad.e.hex}, a ${bad.e.bytes}-byte value: ${fixture.derived.failure.reason}.`;
  const row = (y: number, hex: string, fits: boolean, label: string) => {
    const w = Math.max(34, (hex.length + 2) * 6 + 12);
    return (
      <g data-fits={fits ? "true" : "false"}>
        <Value at={[14, y]} text={label} size={8.5} cls="k-value--label" />
        <rect class="k-outline k-fill--plain" x="14" y={y + 10} width={w} height="22" />
        <Value at={[20, y + 25]} text={`0x${hex}`} size={9.5} />
        <path class="k-leader" d={`M${18 + w} ${y + 21} H150`} marker-end={ids.arrow} />
        {/* The slot plate: two cut-outs, the only shapes OP_IF accepts. */}
        <rect class="k-outline k-fill--plain k-cell--em" x="154" y={y + 4} width="104" height="34" />
        <rect class={`k-outline k-fill--plain k-dashed${fits && hex === "" ? " k-cell--em" : ""}`} x="162" y={y + 10} width="40" height="22" />
        <Value at={[182, y + 25]} text="empty" size={8} anchor="middle" cls="k-value--muted" />
        <rect class={`k-outline k-fill--plain${fits && hex === "01" ? " k-cell--em" : ""}`} x="210" y={y + 10} width="40" height="22" />
        <Value at={[230, y + 25]} text="01" size={9.5} anchor="middle" />
        <Lamp at={[300, y + 21]} state={fits ? "on" : "off"} label={fits ? "FITS" : "STOPS"} />
      </g>
    );
  };
  return (
    <Drawing id="a08-minimalif" width={344} height={150} title="OP_IF takes 0x01 or nothing" desc={desc}>
      <Value at={[154, 16]} text="THE ONLY SHAPES OP_IF TAKES" size={8.5} cls="k-value--label" />
      {row(40, ok.e.hex, true, "SUCCESS WITNESS")}
      {row(100, bad.e.hex, false, "FAILURE WITNESS")}
    </Drawing>
  );
}
