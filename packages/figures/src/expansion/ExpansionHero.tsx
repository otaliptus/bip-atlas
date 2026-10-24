import { Arrow, Drawing, Lamp, Packet, Responsive, Value, idsFor, wrapLines } from "../kit";
import { ExpansionMotif } from "./ExpansionMotifs";
import type { ExpansionPanel, ExpansionView } from "./types";

const short = (value: string, max: number) => {
  const display = value.replace(/<\/?tt>/g, "");
  return display.length <= max ? display : `${display.slice(0, Math.max(1, max - 1))}…`;
};

export function ExpansionHero({ figureId, view }: { figureId: string; view: ExpansionView }) {
  const draw = (mode: "wide" | "narrow") => {
    const wide = mode === "wide";
    const W = wide ? 640 : 330;
    const id = `${figureId}-${mode}`;
    const ids = idsFor(id);
    const perPanel = Math.max(1, Math.min(wide ? 4 : 2, view.panels.length));
    const panelRows = view.layout === "comparison" ? 0 : Math.ceil(view.panels.length / perPanel);
    const panelH = view.layout === "gates" ? 88 : 64;
    const panelTop = view.motif ? (wide ? 168 : 180) : 24;
    const flowGap = wide ? 18 : 12;
    const panelW = (W - 24 - (perPanel - 1) * flowGap) / perPanel;
    const comparisonY = panelTop + (panelRows ? panelRows * (panelH + 10) + 10 : 0);
    const packetRows = view.packet ? Math.ceil(view.packet.fields.reduce((sum, field) => sum + field.bytes, 0) / view.packet.perRow) : 0;
    const packetY = view.layout === "comparison" ? comparisonY + (view.comparison?.length ?? 0) * 30 + 16 : comparisonY;
    const legendRows = view.packet ? Math.ceil(view.packet.fields.length / (wide ? 2 : 1)) : 0;
    const stagesY = packetY + (view.packet ? packetRows * 24 + 28 + legendRows * 18 : 0);
    const perGate = wide ? 3 : 2;
    const stageRows = Math.ceil(view.stages.length / perGate);
    const notesY = stagesY + stageRows * 52 + 8;
    const noteWidth = wide ? 100 : 52;
    const noteLines = view.notes?.flatMap((note) => wrapLines(note, noteWidth).flatMap((line) => line.match(new RegExp(`.{1,${noteWidth}}`, "g")) ?? [])) ?? [];
    const H = notesY + noteLines.length * 14 + 14;
    const panel = (item: ExpansionPanel, index: number) => {
      const col = index % perPanel;
      const row = Math.floor(index / perPanel);
      const x = 12 + col * (panelW + flowGap);
      const y = panelTop + row * (panelH + 10);
      return (
        <g>
          <rect class={`k-cell k-fill--${item.role ?? "plain"}`} x={x} y={y} width={panelW} height={panelH} />
          <Value at={[x + 7, y + 15]} text={short(item.title, wide ? 30 : 24)} size={9} cls="k-value--label" />
          {item.fields.flatMap((field) => {
            const text = field.label === "value" ? field.value : `${field.label}: ${field.value}`;
            const max = wide ? 38 : 24;
            return wrapLines(text, max).slice(0, view.layout === "gates" ? 3 : 2).map((line) => short(line, max));
          }).map((text, line) => (
            <Value at={[x + 7, y + 36 + line * 13]} text={text} size={9.5} />
          ))}
          {view.layout === "flow" && index < view.panels.length - 1 && col < perPanel - 1 ? <Arrow d={`M${x + panelW + 3} ${y + panelH / 2} H${x + panelW + flowGap - 3}`} ids={ids} /> : null}
        </g>
      );
    };
    const description = [
      view.summary,
      ...view.panels.map((item) => `${item.title}: ${item.fields.map((field) => `${field.label} ${field.value}`).join(", ")}`),
      ...(view.comparison ?? []).map((row) => `${row.label}: ${row.left}, ${row.right}`),
      ...(view.packet?.fields.map((field) => `${field.label}: ${field.bytes} bytes`) ?? []),
      ...view.stages.map((stage) => `${stage.title}: ${stage.status}. ${stage.detail}`),
    ].join(" ");
    return (
      <Drawing id={id} width={W} height={H} title={view.motif ? `${view.motif} mechanism` : "Protocol fields and outcomes"} desc={description}>
        {view.motif ? <ExpansionMotif kind={view.motif} width={W} ids={ids} /> : null}
        {view.layout === "comparison" && view.comparison ? (
          <g>
            <Value at={[W / 4, comparisonY + 12]} text={view.panels.length === 2 ? view.panels[0].title : "BEFORE"} size={9} cls="k-value--label" />
            <Value at={[W * 0.75, comparisonY + 12]} text={view.panels.length === 2 ? view.panels[1].title : "AFTER"} size={9} cls="k-value--label" />
            {view.comparison.map((row, index) => {
              const y = comparisonY + 22 + index * 30;
              return (
                <g>
                  <Value at={[12, y + 12]} text={row.label} size={9} cls="k-value--label" />
                  <Value at={[W / 4, y + 12]} text={short(row.left, wide ? 34 : 22)} size={9} anchor="middle" />
                  <Value at={[W * 0.75, y + 12]} text={short(row.right, wide ? 34 : 22)} size={9} anchor="middle" />
                  <line class="k-sep" x1={12} y1={y + 20} x2={W - 12} y2={y + 20} />
                </g>
              );
            })}
          </g>
        ) : null}
        {view.layout !== "comparison" ? view.panels.map(panel) : null}
        {view.packet ? (
          <g transform={`translate(0 ${packetY})`}>
            <Value at={[12, -4]} text="WIRE / RECORD LAYOUT" size={9} cls="k-value--label" />
            <Packet x={12} y={8} fields={view.packet.fields} perRow={view.packet.perRow} unit={Math.min(wide ? 10 : 8, (W - 24) / view.packet.perRow)} rowH={24} />
          </g>
        ) : null}
        {view.packet?.fields.map((field, index) => {
          const perRow = wide ? 2 : 1;
          const x = 12 + (index % perRow) * (W / perRow);
          const y = packetY + packetRows * 24 + 20 + Math.floor(index / perRow) * 18;
          return (
            <g>
              <rect class={`k-cell k-fill--${field.role ?? "plain"}`} x={x} y={y - 8} width={8} height={8} />
              <Value at={[x + 14, y]} text={`${field.label} · ${field.bytes} B`} size={9} />
            </g>
          );
        })}
        {view.stages.map((stage, index) => {
          const col = index % perGate;
          const row = Math.floor(index / perGate);
          const gateW = (W - 24 - (perGate - 1) * 10) / perGate;
          const x = 12 + col * (gateW + 10);
          const y = stagesY + row * 52;
          const failed = stage.status === "fail";
          const pending = stage.status === "not-reached";
          return (
            <g data-stage={stage.id} data-status={stage.status}>
              <rect class={`k-cell ${failed ? "k-mark--plain" : "k-fill--plain"}`} x={x} y={y} width={gateW} height={42} style={pending ? `fill:${ids.hatch}` : undefined} />
              <Lamp at={[x + 14, y + 15]} r={6} state={failed ? "off" : pending ? "idle" : "on"} />
              <Value at={[x + 28, y + 16]} text={`${String(index + 1).padStart(2, "0")} ${short(stage.title, wide ? 25 : 17)}`} size={9} cls={failed ? "k-value--on" : "k-value--label"} />
              <Value at={[x + 28, y + 33]} text={stage.status === "pass" ? "PASSED" : failed ? "STOPPED HERE" : "NOT REACHED"} size={9} cls={failed ? "k-value--on" : "k-value--muted"} />
            </g>
          );
        })}
        {noteLines.map((note, index) => <Value at={[12, notesY + index * 14]} text={note} size={9} cls="k-value--muted" />)}
      </Drawing>
    );
  };
  return (
    <>
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      <p class="atlas-hero__status" data-status>{view.summary}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this view</summary>
        <dl class="atlas-hexlist">
          {view.panels.flatMap((panel) => panel.fields.map((field) => <><dt>{panel.title}{field.label === "value" ? "" : ` · ${field.label}`}</dt><dd><code class="atlas-break">{field.value.replace(/<\/?tt>/g, "")}</code></dd></>))}
          {view.comparison?.map((row) => <><dt>{row.label}</dt><dd><code class="atlas-break">{row.left} → {row.right}</code></dd></>)}
          {view.packet?.fields.map((field) => <><dt>{field.label}</dt><dd>{field.bytes} bytes</dd></>)}
          {view.stages.map((stage) => <><dt>{stage.title}</dt><dd>{stage.status} — {stage.detail}</dd></>)}
        </dl>
      </details>
      <p class="atlas-hero__source">{view.source}</p>
    </>
  );
}
