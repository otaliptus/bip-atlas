import { Computer, Storyboard, Value, type Frame } from "../kit";
import type { DerivedPsbtTraceFixture, PsbtStateView } from "../types";
import { mapTitle, recordRole, shortName, shortRole } from "./cards";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * psbt-role-story.v1 — static storyboard (replaces the retired worked
 * example). One frame per published state of BIP 174's trace, then the
 * extractor: the role's computer and a miniature of the envelope, one cell
 * per record in each map; cells a role added are outlined heavily, cells
 * the finalizer cleared are hatched.
 */
export function PsbtRoleStory({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const { states, extracted } = fixture.derived;
  const mini = (s: PsbtStateView, hatch: string, first: boolean) =>
    s.maps.map((m, k) => {
      const x = 92 + k * 42;
      const cells = [...m.records.map((r) => ({ r, removed: false, added: r.status === "added" })), ...m.removed.map((r) => ({ r, removed: true, added: false }))];
      return (
        <g data-map={mapTitle(m.scope, m.index)}>
          <text class="k-card__type" x={x} y={22}>{m.scope === "global" ? "G" : `${m.scope === "input" ? "IN" : "OUT"}${m.index}`}</text>
          <line class="k-leader" x1={x} y1={28} x2={x + 34} y2={28} />
          {cells.map(({ r, removed, added }, j) => (
            <rect
              class={`k-cell k-fill--${recordRole(r)}${!first && added ? " k-cell--em" : ""}${removed ? " k-dashed" : ""}`}
              x={x}
              y={32 + j * 10}
              width="34"
              height="8"
              style={removed ? `fill:${hatch}` : undefined}
            />
          ))}
        </g>
      );
    });
  const noteOf = (s: PsbtStateView, i: number) => {
    const recs = s.maps.flatMap((m) => m.records);
    const added = recs.filter((r) => r.status === "added");
    const removed = s.maps.reduce((n, m) => n + m.removed.length, 0);
    const counts = [...added.reduce((m, r) => m.set(shortName(r), (m.get(shortName(r)) ?? 0) + 1), new Map<string, number>())].map(([n, c]) => `${c} ${n}`);
    const parent = s.basedOn.length === 1 ? states.findIndex((x) => x.id === s.basedOn[0]) : -1;
    if (i === 0) return `${s.role}: the unsigned transaction and empty maps, ${s.bytes} bytes.`;
    if (s.basedOn.length > 1) return `${s.role}: the union of ${s.basedOn.length} PSBTs${s.uniqueFrom ? `, ${s.uniqueFrom.join(" + ")} fields found in only one` : ""}; ${s.bytes} bytes.`;
    return `${s.role}: ${added.length ? `adds ${counts.join(", ")}` : "adds nothing"}${removed ? `, clears ${removed}` : ""}${parent >= 0 && parent !== i - 1 ? `; starts from the copy of ${shortRole(states[parent].id, states[parent].role)}` : ""}; ${s.bytes} bytes.`;
  };
  const frames: Frame[] = [
    ...states.map((s, i): Frame => ({
      note: noteOf(s, i),
      desc: `${noteOf(s, i)} Maps: ${s.maps.map((m) => `${mapTitle(m.scope, m.index)} ${m.records.map(shortName).join(", ") || "empty"}${m.removed.length ? `, cleared ${m.removed.map(shortName).join(", ")}` : ""}`).join("; ")}.`,
      draw: (ids) => (
        <>
          <Computer at={[14, 20]} label={shortRole(s.id, s.role)} />
          {mini(s, ids.hatch, i === 0)}
        </>
      ),
    })),
    {
      note: `Transaction Extractor: the final scripts become a ${extracted.bytes}-byte network transaction with ${plural(extracted.inputs, "input")}.`,
      desc: `The Transaction Extractor reads the final scriptSigs and witnesses into the network transaction, ${extracted.bytes} bytes, txid ${extracted.txidHex}.`,
      draw: () => (
        <>
          <Computer at={[14, 20]} label="Extractor" />
          <rect class="k-cell k-fill--plain k-cell--em" x="92" y="32" width="200" height="18" />
          <Value at={[98, 44.5]} text={`NETWORK TX · ${extracted.bytes} B`} size={9} cls="k-value--label" />
          <Value at={[92, 70]} text={`txid ${extracted.txidHex.slice(0, 12)}…`} size={9} cls="k-value--hash" />
        </>
      ),
    },
  ];
  const tallest = Math.max(...states.map((s) => Math.max(...s.maps.map((m) => m.records.length + m.removed.length))));
  return (
    <>
      <Storyboard id="a05-roles" title="What each role adds" width={300} height={40 + tallest * 10} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact network transaction id (byte order as computed)</summary>
        <code class="atlas-break">{extracted.txidHex}</code>
      </details>
    </>
  );
}
