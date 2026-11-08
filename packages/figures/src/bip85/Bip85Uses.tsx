import { Drawing, Value, short } from "../kit";
import type { DerivedBip85Fixture } from "../types";
import { ByteBar, OUTPUT_NAME, usesText } from "./parts";

/**
 * bip85-uses.v1 — static. Each published application's own 64 bytes as a row
 * of cells, filled where the application reads them, with what it makes of
 * them. Every application sits on its own path, so each row is different
 * entropy; the drawing compares which bytes are read, not their values.
 */
export function Bip85Uses({ fixtures }: { fixtures: DerivedBip85Fixture[] }) {
  const x0 = 14, rowH = 44, y0 = 30;
  const H = y0 + fixtures.length * rowH + 4;
  return (
    <Drawing
      id="a19-uses"
      width={344}
      height={H}
      title="Each application's own 64 bytes, and the part it reads"
      desc={fixtures.map((f) => `${f.label} (${f.path}): ${usesText(f).join("; ").toLowerCase()}; its ${OUTPUT_NAME[f.derived.outputKind]} begins ${short(f.derived.output, 12)}`).join(". ") + "."}
    >
      <Value at={[x0, 14]} text="EACH ROW: ONE APPLICATION'S 64 BYTES · FILLED = READ" size={8} cls="k-value--muted" />
      {fixtures.map((f, i) => {
        const y = y0 + i * rowH;
        return (
          <g data-app={f.derived.outputKind}>
            <Value at={[x0, y + 6]} text={`${(f.shortLabel ?? f.label).toUpperCase()} · ${f.path}`} size={8} cls="k-value--label" />
            <ByteBar x={x0} y={y + 11} f={f} size={4.5} />
            <Value at={[x0, y + 30]} text={usesText(f).map((u) => u.replace(/^BYTES /, "").replace(/^ALL 64 BYTES: /, "ALL: ")).join(" · ")} size={7.5} cls="k-value--muted" />
          </g>
        );
      })}
    </Drawing>
  );
}
