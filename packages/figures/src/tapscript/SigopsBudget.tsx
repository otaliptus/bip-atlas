import { BUDGET_BASE, SIGOP_COST } from "@bip-atlas/models/tapscript";
import { Drawing, Value } from "../kit";
import type { DerivedTapscriptFixture } from "../types";

/**
 * sigops-budget.v1 — static. The budget of each recorded success witness as
 * a fuel tank drawn to scale: capacity 50 + witness bytes, the part its
 * signature checks drained shown empty and dashed, what is left filled.
 */
export function SigopsBudget({ fixtures }: { fixtures: DerivedTapscriptFixture[] }) {
  const rows = fixtures.map((f) => {
    const v = f.derived.success;
    if (v.budgetStart !== BUDGET_BASE + v.witness.totalBytes) throw new Error(`${f.id}: budget is not ${BUDGET_BASE} + witness size`);
    const spent = v.sigOpsCounted * SIGOP_COST;
    const lastSig = [...v.steps].reverse().find((s) => s.sig);
    if ((lastSig?.sig?.budgetAfter ?? v.budgetStart) !== v.budgetStart - spent) throw new Error(`${f.id}: recorded budget differs from ${SIGOP_COST} per counted signature`);
    return { f, v, spent, left: v.budgetStart - spent };
  });
  const max = Math.max(...rows.map((r) => r.v.budgetStart));
  const scale = 300 / max, rowH = 46, top = 14;
  const desc = rows
    .map((r) => `Case ${r.f.caseIndex}: budget ${BUDGET_BASE} + ${r.v.witness.totalBytes} = ${r.v.budgetStart}; ${r.v.sigOpsCounted} signature check${r.v.sigOpsCounted === 1 ? "" : "s"} counted, ${r.spent} spent, ${r.left} left${r.v.opSuccess ? `; ${r.v.opSuccess} ends validation before anything runs` : ""}.`)
    .join(" ");
  return (
    <Drawing id="a08-budget" width={344} height={top + rows.length * rowH + 16} title="What the recorded witnesses could afford" desc={desc}>
      {rows.map((r, i) => {
        const y = top + i * rowH;
        const full = r.v.budgetStart * scale, leftW = r.left * scale;
        return (
          <g data-case={r.f.caseIndex}>
            <Value at={[14, y + 8]} text={`${r.f.caseIndex} · ${r.f.label}`} size={8.5} cls="k-value--label" />
            <rect class={r.v.opSuccess ? "k-outline k-fill--plain k-dashed" : "k-fuel"} x="14" y={y + 14} width={leftW} height="14" />
            {r.spent ? <rect class="k-outline k-fill--plain k-dashed" x={14 + leftW} y={y + 14} width={full - leftW} height="14" /> : null}
            <rect class="k-outline" x="14" y={y + 14} width={full} height="14" rx="3" fill="none" />
            <Value at={[14, y + 40]} text={r.v.opSuccess ? `NO BUDGET IN FORCE: ${r.v.opSuccess} ENDS VALIDATION FIRST` : `${BUDGET_BASE} + ${r.v.witness.totalBytes} = ${r.v.budgetStart} · ${r.v.sigOpsCounted} × ${SIGOP_COST} spent · ${r.left} left`} size={8.5} cls="k-value--muted" />
          </g>
        );
      })}
      <Value at={[14, top + rows.length * rowH + 6]} text="FILLED: LEFT · DASHED: SPENT ON SIGNATURE CHECKS" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
