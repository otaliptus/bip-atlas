import { Drawing, Value } from "../kit";
import type { DerivedBip67Fixture } from "../types";

const SHOWN = [0, 1, 2, 32];

/**
 * bip67-byte-order.v1 — static. Two published vectors' keys in sorted order,
 * each as its first three bytes and its last; between neighbours, the first
 * byte that differs is outlined. Sorting compares bytes from the left, and
 * that byte decides.
 */
export function Bip67ByteOrder({ fixtures }: { fixtures: DerivedBip67Fixture[] }) {
  const x0 = 14, cw = 28, gap = 22, rowH = 30;
  let y = 30;
  const blocks = fixtures.map((f) => {
    const top = y;
    y += 18 + f.derived.sorted.length * rowH + 22;
    return { f, top };
  });
  const H = y;
  const col = (i: number) => x0 + 34 + (i < 3 ? i * cw : 3 * cw + gap);
  const descOf = (f: DerivedBip67Fixture) =>
    `${f.label}, sorted: ${f.derived.sorted.join(", ")}. ` + f.derived.firstDifferences.map((b, i) => `Keys ${i + 1} and ${i + 2} first differ at byte ${b + 1}, where key ${i + 1} is smaller`).join("; ") + ".";
  return (
    <Drawing id="a20-bytes" width={344} height={H} title="The first different byte decides" desc={fixtures.map(descOf).join(" ")}>
      <Value at={[x0, 14]} text="BYTES 1–3 … 33 OF EACH KEY · OUTLINED: THE BYTE THAT DECIDES" size={8} cls="k-value--muted" />
      {blocks.map(({ f, top }) => (
        <g data-vector={f.id}>
          <Value at={[x0, top + 6]} text={`${f.label.toUpperCase()} · SORTED`} size={8} cls="k-value--label" />
          {f.derived.sorted.map((k, r) => {
            const yy = top + 14 + r * rowH;
            const decides = (b: number) => f.derived.firstDifferences[r] === b || f.derived.firstDifferences[r - 1] === b;
            return (
              <g>
                <Value at={[x0, yy + 15]} text={`${r + 1}.`} size={9} cls="k-value--muted" />
                {SHOWN.map((b, i) => (
                  <g>
                    <rect class={`k-cell k-fill--public${decides(b) ? " k-cell--em" : ""}`} x={col(i)} y={yy} width={cw - 2} height={22} />
                    <Value at={[col(i) + (cw - 2) / 2, yy + 15]} text={k.slice(b * 2, b * 2 + 2)} size={9} anchor="middle" />
                  </g>
                ))}
                <Value at={[col(2) + cw + 4, yy + 15]} text="…" size={10} />
              </g>
            );
          })}
          {f.derived.firstDifferences.map((b, i) => (
            <Value at={[col(3) + cw + 10, top + 14 + i * rowH + 30]} text={`${i + 1} < ${i + 2}: BYTE ${b + 1}`} size={8} cls="k-value--muted" />
          ))}
        </g>
      ))}
    </Drawing>
  );
}
