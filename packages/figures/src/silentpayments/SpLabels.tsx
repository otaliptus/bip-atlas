import { Drawing, Value } from "../kit";
import type { DerivedSpFixture } from "../types";

/**
 * sp-labels.v1 — static. One receiver's unlabeled address and its labeled
 * addresses, each drawn as a ribbon. Their opening characters, which encode
 * the shared B_scan, are identical and outlined: anyone comparing the
 * addresses can tell they belong together. Addresses from the tested model.
 */
export function SpLabels({ fixture }: { fixture: DerivedSpFixture }) {
  const r = fixture.derived.receiver;
  if (!r.labels.length || r.labels.length !== r.labeledAddresses.length) throw new Error(`${fixture.id}: needs labeled addresses`);
  const all = [{ name: "NO LABEL", a: r.address }, ...r.labels.map((m, i) => ({ name: `LABEL m = ${m}`, a: r.labeledAddresses[i] }))];
  let common = 0;
  while (all.every((x) => x.a[common] === all[0].a[common])) common++;
  const sep = r.address.lastIndexOf("1");
  // B_scan comes first in the data: its bits fill this many whole 5-bit characters after "sp1q".
  const scanChars = Math.floor(((r.Bscan.length / 2) * 8) / 5);
  if (common < sep + 2 + scanChars) throw new Error(`${fixture.id}: labeled addresses do not share the B_scan characters`);
  const total = r.address.length;
  const unit = 300 / total;
  const rowH = 40, top = 30;
  const desc =
    `${all.length} addresses of one receiver: ${all.map((x) => `${x.name.toLowerCase()}, ${x.a}`).join("; ")}. ` +
    `The first ${common} characters are the same in all of them, because they encode the same scan key B_scan (and, here, the first bits of each B_m); the rest of the spend-key part and the checksum differ. Anyone who sees two of these addresses can tell they belong together.`;
  return (
    <>
      <Drawing id="a15-labels" width={344} height={top + all.length * rowH + 30} title="Labels share the scan key" desc={desc}>
        <Value at={[14, 16]} text={`${total} CHARACTERS EACH · THE FIRST ${common} ARE THE SAME`} size={8.5} cls="k-value--label" />
        {all.map((x, i) => {
          const y = top + i * rowH;
          return (
            <g data-label={x.name}>
              <Value at={[14, y + 8]} text={x.name} size={8.5} cls="k-value--label" />
              <rect class="k-outline k-fill--public k-cell--em" x="14" y={y + 13} width={common * unit} height="14" />
              <rect class="k-outline k-fill--plain" x={14 + common * unit} y={y + 13} width={(total - common) * unit} height="14" />
              <text class="k-value" x="18" y={y + 23.5} style="font-size:8px">{`${x.a.slice(0, 12)}…`}</text>
              <text class="k-value" x={18 + common * unit} y={y + 23.5} style="font-size:8px">{`${x.a.slice(common, common + 8)}…`}</text>
            </g>
          );
        })}
        <Value at={[14, top + all.length * rowH + 8]} text="OUTLINED: THE SAME IN ALL, COVERING ALL OF B_SCAN" size={8} cls="k-value--muted" />
        <Value at={[14, top + all.length * rowH + 20]} text="PLAIN: THE REST OF B_M AND THE CHECKSUM, WHICH DIFFER" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {all.map((x) => (<><dt>{x.name.toLowerCase()}</dt><dd><code class="atlas-break">{x.a}</code></dd></>))}
        </dl>
      </details>
    </>
  );
}
