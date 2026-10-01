import type { DerivedTapscriptFixture } from "../types";

/**
 * sigops-budget.v1 — static. For each recorded success witness: the budget
 * (50 + witness size), what its signature opcodes spent, and what was left.
 */
export function SigopsBudget({ fixtures }: { fixtures: DerivedTapscriptFixture[] }) {
  const max = Math.max(...fixtures.map((f) => f.derived.success.budgetStart));
  return (
    <div class="atlas-budget">
      <ol class="atlas-budget__rows">
        {fixtures.map((f) => {
          const v = f.derived.success;
          const spent = v.sigOpsCounted * 50;
          return (
            <li>
              <span class="atlas-budget__name">{f.label}</span>
              <span class="atlas-budget__bar" role="img" aria-label={`Budget ${v.budgetStart}, spent ${spent}, left ${v.budgetStart - spent}`} style={`inline-size: ${(v.budgetStart / max) * 100}%`}>
                <span class="atlas-budget__spent" style={`inline-size: ${(spent / v.budgetStart) * 100}%`} />
              </span>
              <span class="atlas-budget__nums">
                50 + {v.witness.totalBytes} = {v.budgetStart} · {v.sigOpsCounted} × 50 spent · {v.budgetStart - spent} left
              </span>
            </li>
          );
        })}
      </ol>
      <p class="atlas-ser__legend">
        <span><span class="atlas-ser__key" data-group="budget-spent" />spent by non-empty signatures</span>
        <span><span class="atlas-ser__key" data-group="budget-left" />remaining budget</span>
      </p>
      <p class="atlas-lab__source">Success witnesses of the recorded Core test cases. Witness sizes include every item’s length prefix.</p>
    </div>
  );
}
