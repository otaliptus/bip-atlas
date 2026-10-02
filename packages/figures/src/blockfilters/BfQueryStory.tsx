import { BASIC_M, expectedFalsePositives } from "@bip-atlas/models/blockfilter";
import { Computer, Storyboard, Value, type DrawingIds, type Frame } from "../kit";
import type { BfProbe, DerivedBfBlockFixture } from "../types";
import { along, fromText, group, shortHex } from "./parts";

/**
 * bf-query-story.v1 — static storyboard. What a light client does with an
 * answer: a script from the block matches (maybe: fetch the block); a script
 * from another vector block does not (skip it); and how often an unrelated
 * script would match anyway, from the model's 1/M.
 */
export function BfQueryStory({ fixture }: { fixture: DerivedBfBlockFixture }) {
  const d = fixture.derived;
  const hit = d.probes.find((p) => p.matched);
  const miss = d.probes.find((p) => !p.matched);
  if (!hit || !miss) throw new Error(`${fixture.id}: needs one matching and one non-matching test script`);
  const tests = 100 * 10_000;
  const fp = Math.round(expectedFalsePositives(tests) * 10) / 10;
  const M = group(BASIC_M.toString());
  const scene = (_: DrawingIds, p: BfProbe) => {
    const tx = along(p.target, d.F, 14, 200);
    return (
      <>
        <rect class="k-outline k-fill--plain" x="14" y="12" width="96" height="16" />
        <text class="k-bf-hex" x="18" y="23.5">{shortHex(p.script, 5)}</text>
        <Value at={[116, 23.5]} text={p.from === "this block" ? "FROM THIS BLOCK" : `FROM ${fromText(p.from).toUpperCase()}`} size={8} cls="k-value--muted" />
        <line class="k-line" x1="14" y1="66" x2="200" y2="66" />
        {d.values.map((v, i) => (
          <rect class={`k-cell ${i < p.steps.length ? "k-mark--hash" : "k-fill--plain k-dashed"}`} x={along(v, d.F, 14, 200) - 3} y={63} width="6" height="6" data-decoded={String(i < p.steps.length)} />
        ))}
        <path class="k-bf-target" d={`M${tx} 84 V72 M${tx - 4} 77 L${tx} 71 L${tx + 4} 77`} />
        <Computer at={[236, 44]} label="client" />
        <Value at={[249, 104]} text={p.matched ? "FETCH BLOCK" : "SKIP BLOCK"} size={8.5} anchor="middle" cls="k-value--label" />
        <Value at={[14, 104]} text={p.matched ? `VALUE ${p.steps.length} = TARGET` : p.steps.at(-1)?.outcome === "greater" ? `VALUE ${p.steps.length} > TARGET` : "ALL VALUES < TARGET"} size={8.5} cls="k-value--label" />
      </>
    );
  };
  const frames: Frame[] = [
    {
      note: `A script from block ${group(d.height)} itself matches. That means maybe: the client downloads the block to find out.`,
      desc: `The script ${hit.script} hashes to ${hit.target}; decoding stops at value ${hit.steps.length}, which equals it. Match: the client fetches block ${d.height}.`,
      draw: (ids) => scene(ids, hit),
    },
    {
      note: `A script from ${fromText(miss.from)} does not. Given the right filter, no output here pays to it and no input spends it: skip.`,
      desc: `The script ${miss.script} hashes to ${miss.target}; decoding stops at value ${miss.steps.length}, which passes it. No match: the client skips the block. Values it never decoded are drawn empty.`,
      draw: (ids) => scene(ids, miss),
    },
    {
      note: `An unrelated script matches anyway with probability 1/${M}. Over ${group(100)} scripts and ${group(10_000)} blocks, about ${fp} needless downloads.`,
      desc: `With M = ${BASIC_M}, an unrelated script matches a filter with probability 1 in ${BASIC_M}. Testing 100 scripts against 10,000 blocks, ${tests} tests, gives an expected ${fp} false matches.`,
      draw: () => (
        <>
          <circle class="k-outline k-fill--plain" cx="70" cy="62" r="44" />
          <text class="k-bf-big" x="70" y="56" text-anchor="middle">1 IN</text>
          <text class="k-bf-big" x="70" y="74" text-anchor="middle">{M}</text>
          <Value at={[134, 44]} text={`${group(tests)} TESTS`} size={8.5} cls="k-value--label" />
          <Value at={[134, 58]} text="100 SCRIPTS × 10,000 BLOCKS" size={8} cls="k-value--muted" />
          <Value at={[134, 82]} text={`≈ ${fp} FALSE MATCHES`} size={9} cls="k-value--label" />
        </>
      ),
    },
  ];
  return <Storyboard id="a16-query" title="Yes means maybe" width={300} height={116} frames={frames} />;
}
