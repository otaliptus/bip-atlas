import { Drawing, Value } from "../kit";
import type { DerivedBip48Fixture } from "../types";

/**
 * bip48-paths.v1 — static. BIP 48's published example paths, level by level:
 * purpose 48', coin type, account and script type hardened; change and index
 * not. Each cosigner derives keys under this hierarchy from their own seed, and the
 * keys are then sorted as BIP 67 describes.
 */
export function Bip48Paths({ fixtures }: { fixtures: DerivedBip48Fixture[] }) {
  const x0 = 14, cw = 50, rowH = 64, y0 = 34;
  const H = y0 + fixtures.length * rowH + 30;
  return (
    <Drawing
      id="a20-paths"
      width={344}
      height={H}
      title="BIP 48's example paths"
      desc={fixtures.map((f) => `${f.label}: ${f.derived.path}, levels ${f.derived.levels.map((l) => `${l.name} ${l.value}`).join(", ")}.`).join(" ") + " The first four levels are hardened; change and index use public derivation. Each cosigner derives keys under this hierarchy from their own seed, and for each address BIP 48 wallets sort the cosigners' keys as BIP 67 describes."}
    >
      <Value at={[x0, 14]} text="FILLED: PUBLIC DERIVATION · OUTLINED: CHANGED FROM PATH 1" size={8} cls="k-value--muted" />
      {fixtures.map((f, r) => {
        const y = y0 + r * rowH;
        return (
          <g data-example={f.id}>
            <Value at={[x0, y]} text={`${f.script.toUpperCase()} · ${f.chain.toUpperCase()} · ${f.address.toUpperCase()} ADDRESS`} size={8} cls="k-value--label" />
            <Value at={[x0, y + 23]} text="m" size={11} />
            {f.derived.levels.map((l, i) => {
              const changed = r > 0 && fixtures[0].derived.levels[i].value !== l.value;
              return (
                <g>
                  <rect class={`k-cell ${l.hardened ? "k-fill--plain" : "k-fill--public"}${changed ? " k-cell--em" : ""}`} x={x0 + 14 + i * (cw + 2)} y={y + 8} width={cw} height={22} />
                  <Value at={[x0 + 14 + i * (cw + 2) + cw / 2, y + 23]} text={l.value} size={10} anchor="middle" />
                  {r === 0 ? <Value at={[x0 + 14 + i * (cw + 2) + cw / 2, y + 42]} text={(l.name === "address index" ? "index" : l.name).toUpperCase()} size={7} anchor="middle" cls="k-value--muted" /> : null}
                </g>
              );
            })}
          </g>
        );
      })}
      <Value at={[x0, H - 12]} text="EACH COSIGNER: OWN SEED · KEYS SORTED PER ADDRESS (BIP 67)" size={8} cls="k-value--label" />
    </Drawing>
  );
}
