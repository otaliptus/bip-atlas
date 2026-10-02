import { SIGOP_COST } from "@bip-atlas/models/tapscript";
import { Arrow, Drawing, Value, idsFor } from "../kit";
import type { DerivedTapscriptFixture, TapscriptElement } from "../types";
import { itemSize } from "./common";

/** The first recorded signature check of a given kind, with the element that was checked. */
function firstCheck(fixtures: DerivedTapscriptFixture[], check: string, emptySig: boolean): { f: DerivedTapscriptFixture; e: TapscriptElement } {
  for (const f of fixtures) {
    const v = f.derived.success;
    for (const s of v.steps) {
      if (s.sig?.check !== check) continue;
      // The signature is the deepest of the items the opcode popped.
      const sigEl = v.elements[s.before[s.before.length - (s.name === "OP_CHECKSIGADD" ? 3 : 2)]];
      if ((sigEl.bytes === 0) === emptySig) return { f, e: sigEl };
    }
  }
  throw new Error(`no recorded ${check} signature check`);
}

/**
 * tapscript-sig-pays.v1 — static. Why the budget rarely runs out: a checked
 * signature adds its own bytes, plus a length byte, to the witness and so to
 * the budget, more than the 50 its check costs. An empty signature adds one
 * length byte and costs nothing. Both read from recorded Core witnesses.
 */
export function SigPays({ fixtures }: { fixtures: DerivedTapscriptFixture[] }) {
  const valid = firstCheck(fixtures, "valid", false);
  const empty = firstCheck(fixtures, "empty", true);
  if (valid.e.bytes !== 64 && valid.e.bytes !== 65) throw new Error("a checked BIP 340 signature must be 64 or 65 bytes");
  const ids = idsFor("a08-pays");
  const rows = [
    { name: `${valid.e.bytes}-BYTE SIGNATURE`, src: `case ${valid.f.caseIndex}`, adds: itemSize(valid.e.bytes), costs: SIGOP_COST, role: "sig" },
    { name: "EMPTY SIGNATURE", src: `case ${empty.f.caseIndex}`, adds: itemSize(0), costs: 0, role: "plain" },
  ];
  const desc = rows.map((r) => `${r.costs ? "A" : "An"} ${r.name.toLowerCase()} (as in Core ${r.src}) adds ${r.adds} serialized witness byte${r.adds === 1 ? "" : "s"}, so ${r.adds} to the budget; ${r.costs ? `its check costs ${r.costs}` : "it is not checked and costs nothing"}: net +${r.adds - r.costs}.`).join(" ");
  return (
    <Drawing id="a08-pays" width={344} height={186} title="A signature pays its own way" desc={desc}>
      {rows.map((r, i) => {
        const y = 22 + i * 82;
        return (
          <g>
            <Value at={[14, y]} text={`${r.name} · ${r.src.toUpperCase()}`} size={9} cls="k-value--label" />
            <rect class={`k-cell k-fill--${r.role}${r.role === "plain" ? " k-dashed" : ""}`} x="14" y={y + 10} width="64" height="22" />
            <rect class="k-cell k-fill--plain" x="78" y={y + 10} width="14" height="22" />
            <Value at={[85, y + 25]} text="L" size={8} anchor="middle" />
            <Arrow d={`M96 ${y + 21} H122`} ids={ids} />
            <Value at={[128, y + 18]} text={`+${r.adds} WITNESS BYTES`} size={8.5} />
            <Value at={[128, y + 30]} text={`= +${r.adds} BUDGET`} size={8.5} />
            <Value at={[250, y + 18]} text={r.costs ? `CHECK −${r.costs}` : "NOT CHECKED, −0"} size={8.5} />
            <Value at={[14, y + 52]} text={`NET ${r.adds - r.costs >= 0 ? "+" : ""}${r.adds - r.costs}`} size={10} cls="k-value--label" />
          </g>
        );
      })}
      <Value at={[14, 180]} text="L = THE ITEM'S LENGTH BYTE" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
