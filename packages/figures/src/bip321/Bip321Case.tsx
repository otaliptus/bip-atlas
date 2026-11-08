import { Drawing, Value } from "../kit";
import type { DerivedBip321Fixture } from "../types";

/**
 * bip321-case.v1 — static. BIP 321's lowercase and uppercase forms of one
 * link, each read by the model: the scheme and keys match in any case, the
 * values keep theirs, and both give the same payment instructions.
 */
export function Bip321Case({ fixtures }: { fixtures: DerivedBip321Fixture[] }) {
  const [lower, upper] = fixtures;
  if (!lower || !upper) throw new Error("bip321-case: needs the lowercase and uppercase links");
  const same = lower.derived.reading.instructions.map((i) => `${i.key}=${i.value.toLowerCase()}`).join() === upper.derived.reading.instructions.map((i) => `${i.key}=${i.value.toLowerCase()}`).join();
  if (!same) throw new Error("bip321-case: the two links should read alike");
  const x0 = 14;
  const block = (f: DerivedBip321Fixture, y: number, title: string) => {
    const r = f.derived.reading;
    return (
      <g data-form={title}>
        <Value at={[x0, y]} text={title} size={8} cls="k-value--label" />
        <Value at={[x0, y + 16]} text={`${r.scheme}:${r.address}?`} size={8.5} />
        {r.params.map((p, i) => (
          <g>
            <rect class="k-cell k-fill--net" x={x0} y={y + 24 + i * 34} width={316} height={18} />
            <Value at={[x0 + 4, y + 37 + i * 34]} text={p.raw.length > 54 ? `${p.raw.slice(0, 53)}…` : p.raw} size={8} />
            <Value at={[x0, y + 52 + i * 34]} text={`KEY READ AS “${p.key}” · VALUE KEPT AS WRITTEN`} size={7.5} cls="k-value--muted" />
          </g>
        ))}
      </g>
    );
  };
  const h1 = 24 + lower.derived.reading.params.length * 34 + 30;
  const H = 14 + 2 * h1 + 18;
  return (
    <Drawing
      id="a21-case"
      width={344}
      height={H}
      title="The same link in lowercase and uppercase"
      desc={`${lower.uri} and ${upper.uri} read alike: the scheme and the keys are case-insensitive, so both give the instructions ${lower.derived.reading.instructions.map((i) => `${i.key} ${i.value}`).join(" and ")}.`}
    >
      {block(lower, 14, "LOWERCASE")}
      {block(upper, 14 + h1, "UPPERCASE, AS MANY QR CODES WRITE IT")}
      <Value at={[x0, H - 8]} text="SAME KEYS, SAME ADDRESSES: ONE MEANING" size={8} cls="k-value--ok" />
    </Drawing>
  );
}
