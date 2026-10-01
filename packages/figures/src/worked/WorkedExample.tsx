import type { ComponentChildren } from "preact";
import { IsoStack, type IsoLayer } from "./IsoStack";

export interface WorkedStep {
  title: string;
  /** Concrete values for this step, shown in full (wrapped). */
  values?: Array<{ label: string; value: string }>;
  note?: ComponentChildren;
  layer: IsoLayer;
}

/**
 * A static, concrete walk through one published example: an exploded
 * isometric drawing with a numbered legend. Shared by every chapter's
 * "Worked example" tab; each recipe supplies its own steps.
 */
export function WorkedExample({ intro, steps, label, source }: { intro: ComponentChildren; steps: WorkedStep[]; label: string; source: ComponentChildren }) {
  return (
    <div class="atlas-worked">
      <p class="atlas-worked__intro">{intro}</p>
      <div class="atlas-worked__body">
        <div class="atlas-worked__art">
          <IsoStack layers={steps.map((s) => s.layer)} label={label} />
        </div>
        <ol class="atlas-worked__steps">
          {steps.map((s, i) => (
            <li data-tone={s.layer.tone ?? "plain"}>
              <span class="atlas-worked__n" aria-hidden="true">{i + 1}</span>
              <div class="atlas-worked__text">
                <p class="atlas-worked__title">{s.title}</p>
                {s.values?.length ? (
                  <dl class="atlas-worked__values">
                    {s.values.map((v) => (
                      <div><dt>{v.label}</dt><dd><code class={v.value.includes(" ") ? "atlas-worked__spaced" : "atlas-break"}>{v.value}</code></dd></div>
                    ))}
                  </dl>
                ) : null}
                {s.note ? <p class="atlas-worked__note">{s.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p class="atlas-lab__source">{source}</p>
    </div>
  );
}
