import { Drawing, Value, idsFor } from "../kit";
import type { DerivedBip322VerdictsFixture } from "../types";

/**
 * bip322-interpreter.v1 — static. The opcodes this site's BIP 322 verifier
 * executes, hung on a rack like key blanks: the set shared by every script
 * version, then what only tapscript adds. Anything else is not cut here:
 * the verdict is inconclusive. The list comes from the model's REVIEWED set
 * via derive.
 */
export function Bip322Rack({ fixture }: { fixture: DerivedBip322VerdictsFixture }) {
  const sets = fixture.derived.reviewed;
  if (sets.length < 2) throw new Error(`${fixture.id}: needs the reviewed opcode sets`);
  const common = sets[0].ops.filter((o) => sets.every((s) => s.ops.includes(o)));
  const extra = sets.map((s) => ({ version: s.version, ops: s.ops.filter((o) => !common.includes(o)) })).filter((s) => s.ops.length);
  // Reserved NOPs are listed as one tag.
  const nops = common.filter((o) => /^NOP\d+$/.test(o));
  const tags = [...common.filter((o) => !nops.includes(o)), nops.length ? `${nops[0]}, ${nops[1]}–${nops[nops.length - 1].slice(3)}` : null].filter((t): t is string => t !== null);
  const ids = idsFor("a18-rack");
  const cols = 3, tw = 104, th = 18, x0 = 12, y0 = 40;
  const rowsN = Math.ceil(tags.length / cols);
  const yx = y0 + rowsN * (th + 10) + 10;
  return (
    <Drawing
      id="a18-rack"
      width={344}
      height={yx + 34 + extra.length * 14 + 40}
      title="The reviewed opcodes"
      desc={`Besides pushes, OP_0, OP_1NEGATE and OP_1 to OP_16, this site's verifier executes, in every script version: ${common.join(", ")}. ${extra.map((e) => `${e.version} also: ${e.ops.join(", ")}`).join("; ")}. A script with any other opcode gets the verdict inconclusive.`}
    >
      <Value at={[x0, 14]} text="EVERY SCRIPT VERSION · PUSHES, OP_0, OP_1…16 ALWAYS" size={8.5} cls="k-value--label" />
      {Array.from({ length: rowsN }, (_, r) => <line class="k-b3-rail" x1={x0 - 4} y1={y0 + r * (th + 10) - 6} x2={x0 + cols * (tw + 2) + 2} y2={y0 + r * (th + 10) - 6} />)}
      {tags.map((t, i) => {
        const x = x0 + (i % cols) * (tw + 2), y = y0 + Math.floor(i / cols) * (th + 10);
        return (
          <g>
            <line class="k-leader" x1={x + 7} y1={y - 6} x2={x + 7} y2={y + th / 2 - 2.5} />
            <rect class="k-outline k-fill--plain" x={x} y={y} width={tw} height={th} rx="3" />
            <circle class="k-outline k-fill--plain" cx={x + 7} cy={y + th / 2} r="2.5" />
            <text class="k-b3-tag" x={x + 13} y={y + 12.5}>{t}</text>
          </g>
        );
      })}
      {extra.map((e, k) => <Value at={[x0, yx + k * 14]} text={`${e.version.toUpperCase()} ALSO: ${e.ops.join(", ")}`} size={8.5} cls="k-value--label" />)}
      <rect class="k-outline k-fill--plain k-dashed" x={x0} y={yx + extra.length * 14 + 6} width={150} height={22} />
      <Value at={[x0 + 6, yx + extra.length * 14 + 21]} text="ANY OTHER OPCODE" size={8.5} cls="k-value--label" />
      <path class="k-line" d={`M${x0 + 152} ${yx + extra.length * 14 + 17} H${x0 + 182}`} marker-end={ids.arrow} />
      <Value at={[x0 + 188, yx + extra.length * 14 + 21]} text="INCONCLUSIVE" size={9} cls="k-value--label" />
      <Value at={[x0, yx + extra.length * 14 + 46]} text="RESERVED NOPS: UPGRADEABLE, SO ALSO INCONCLUSIVE" size={8} cls="k-value--muted" />
    </Drawing>
  );
}
