import { Drawing, KeyGlyph, Value, wrapLines } from "../kit";
import type { DerivedSpEligibilityFixture } from "../types";
import { kindOf, short } from "./common";

/**
 * sp-input-eligibility.v1 — static. A sorting tray: each published vector's
 * inputs, read by the tested model, dropped into "key counts" or "skipped",
 * with the reason for each skip. Keys are the ones the model read from what
 * the transaction reveals; exact values in the disclosure.
 */
export function SpEligibility({ fixture }: { fixture: DerivedSpEligibilityFixture }) {
  const rows = fixture.derived.rows;
  const reasons = [...new Set(rows.flatMap((r) => r.inputs.filter((i) => !i.pubkey).map((i) => i.skipped!)))];
  if (rows.some((r) => r.inputs.some((i) => !i.pubkey && !i.skipped))) throw new Error(`${fixture.id}: a skipped input has no reason`);
  const colX = [14, 182], colW = 152, tokH = 16;
  const heights = rows.map((r) => Math.max(r.inputs.filter((i) => i.pubkey).length, r.inputs.filter((i) => !i.pubkey).length) * (tokH + 4) + 22);
  const top = 30;
  const ys = heights.map((_, i) => top + heights.slice(0, i).reduce((a, b) => a + b, 0));
  const legendY = top + heights.reduce((a, b) => a + b, 0) + 8;
  const legend = reasons.map((r, k) => ({ k, lines: wrapLines(`${String.fromCharCode(97 + k)} ${r}`, 60) }));
  const H = legendY + legend.reduce((n, l) => n + l.lines.length * 11 + 2, 0) + 8;
  const desc = rows
    .map((r) => `${r.comment}: ${r.inputs.map((i) => `${kindOf(i)} ${i.pubkey ? `counts, key ${i.pubkey}` : `skipped, ${i.skipped}`}`).join("; ")}.`)
    .join(" ");
  let ly = legendY;
  return (
    <>
      <Drawing id="a15-elig" width={344} height={H} title="Inputs that count, inputs that do not" desc={desc}>
        <Value at={[colX[0], 14]} text="KEY COUNTS" size={9} cls="k-value--label" />
        <Value at={[colX[1], 14]} text="SKIPPED" size={9} cls="k-value--label" />
        {rows.map((r, i) => {
          const y = ys[i];
          const counts = r.inputs.filter((x) => x.pubkey), skipped = r.inputs.filter((x) => !x.pubkey);
          return (
            <g data-row={i}>
              <Value at={[colX[0], y + 8]} text={wrapLines(r.comment, 64)[0] + (r.comment.length > 64 ? " …" : "")} size={7.5} cls="k-value--muted" />
              {counts.map((x, k) => (
                <g>
                  <rect class="k-outline k-fill--public" x={colX[0]} y={y + 13 + k * (tokH + 4)} width={colW} height={tokH} />
                  <KeyGlyph at={[colX[0] + 4, y + 15 + k * (tokH + 4)]} role="public" scale={0.4} />
                  <Value at={[colX[0] + 22, y + 24.5 + k * (tokH + 4)]} text={`${kindOf(x)} · ${short(x.pubkey!)}`} size={8} />
                </g>
              ))}
              {skipped.map((x, k) => (
                <g>
                  <rect class="k-outline k-fill--plain k-dashed" x={colX[1]} y={y + 13 + k * (tokH + 4)} width={colW} height={tokH} />
                  <Value at={[colX[1] + 4, y + 24.5 + k * (tokH + 4)]} text={`✕ ${kindOf(x)} · reason ${String.fromCharCode(97 + reasons.indexOf(x.skipped!))}`} size={8} />
                </g>
              ))}
            </g>
          );
        })}
        {legend.map((l) => {
          const out = l.lines.map((t, k) => <Value at={[14, ly + 9 + k * 11]} text={t} size={8} cls="k-value--muted" />);
          ly += l.lines.length * 11 + 2;
          return <g>{out}</g>;
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {rows.map((r) => (
            <>
              <dt>{r.comment}</dt>
              <dd>{r.inputs.map((x) => (x.pubkey ? <><code class="atlas-break">{x.pubkey}</code> ({kindOf(x)})<br /></> : <>{kindOf(x)}: skipped, {x.skipped}<br /></>))}</dd>
            </>
          ))}
        </dl>
      </details>
    </>
  );
}
