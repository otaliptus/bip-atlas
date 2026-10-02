import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Computer, Drawing, Lamp, Responsive, Strip, Value, idsFor } from "../kit";
import type { Role } from "../kit";
import type { DerivedSpFixture, SpDerived } from "../types";
import { Chip, kindOf, short } from "./common";

interface Props {
  fixtures: DerivedSpFixture[];
  figureId: string;
}

export type SpView = "sender" | "receiver" | "observer";
interface Row { role: Role; text: string; dashed?: boolean; lamp?: "on" | "off" }

const VIEW_NAME: Record<SpView, string> = { sender: "the sender", receiver: "the receiver", observer: "an outside observer" };

/**
 * What each party knows, as rows of chips. Pure: the drawing, the text
 * equivalent and the tests all use it, so they cannot disagree. Secret keys
 * are never given a value; a panel that is not the viewer's is not built.
 */
export function spPanels(d: SpDerived, view: SpView, steps: boolean) {
  const chain: Row[] = d.inputs.map((i) => (i.pubkey ? { role: "public" as Role, text: `in ${kindOf(i)} · ${short(i.pubkey)}` } : { role: "plain" as Role, text: `in ${kindOf(i)} · skipped`, dashed: true }));
  if (steps) chain.push({ role: "public", text: `A = Σ keys · ${short(d.A)}` }, { role: "hash", text: `input_hash · ${short(d.inputHash)}` });
  for (const o of d.txOutputs) {
    const note =
      view === "observer" ? "owner unknown"
      : view === "sender" ? (d.senderOutputs.includes(o.key) ? "made by the sender" : "not the sender's")
      : o.mine ? `mine, k = ${o.k}${o.label !== null ? `, label ${o.label}` : ""}` : "not mine";
    chain.push({ role: "public", text: `out ${short(o.key)} · ${note}` });
  }
  const sender: Row[] | null = view !== "sender" ? null : [
    { role: "secret", text: "a = Σ aᵢ · secret, no value", dashed: true },
    ...d.paidTo.flatMap((p) => [
      { role: "public" as Role, text: `pays B_scan ${short(p.Bscan)}` },
      { role: "public" as Role, text: `B_m ${short(p.Bm)}${p.label !== null ? ` (label ${p.label})` : ""}` },
    ]),
    ...(steps ? [{ role: "secret" as Role, text: `secret ${short(d.senderSecret)}` }] : []),
    ...d.senderOutputs.map((o, k) => ({ role: "public" as Role, text: `makes P${"₀₁₂₃₄₅₆₇₈₉"[k] ?? k} ${short(o)}` })),
  ];
  const receiver: Row[] | null = view !== "receiver" ? null : [
    { role: "secret", text: "b_scan · secret, no value", dashed: true },
    { role: "public", text: `B_scan ${short(d.receiver.Bscan)}` },
    { role: "public", text: `B_spend ${short(d.receiver.Bspend)}` },
    ...(d.receiver.labels.length ? [{ role: "plain" as Role, text: `labels ${d.receiver.labels.join(", ")}` }] : []),
    ...(steps ? [{ role: "hash" as Role, text: `tweak ${short(d.tweak)}` }, { role: "secret" as Role, text: `secret ${short(d.sharedSecret)}` }] : []),
    ...(steps
      ? d.steps.map((s) => ({ role: "public" as Role, text: `k=${s.k} P ${short(s.Pk)}`, lamp: (s.matched ? "on" : "off") as "on" | "off" }))
      : [{ role: "plain" as Role, text: `${d.txOutputs.filter((o) => o.mine).length} output(s) found` }]),
  ];
  return { chain, sender, receiver };
}

/** The text equivalent of one view: everything drawn, exact. */
export function describeView(d: SpDerived, view: SpView, steps: boolean): string {
  const parts = [`Vector “${d.comment}”, seen by ${VIEW_NAME[view]}.`];
  parts.push(`On chain: inputs ${d.inputs.map((i) => (i.pubkey ? `${kindOf(i)} with key ${i.pubkey}` : `${kindOf(i)}, skipped (${i.skipped})`)).join("; ")}.`);
  if (steps) parts.push(`Anyone can compute A = ${d.A} and input_hash = ${d.inputHash} from them.`);
  parts.push(`Taproot outputs: ${d.txOutputs.map((o) => o.key).join(", ")}.`);
  if (view === "sender") {
    parts.push(`The sender knows its input keys' secrets (not shown) and pays ${d.paidTo.map((p) => p.address).join(", ")}.`);
    if (steps) parts.push(`Its shared secret with that scan key is ${d.senderSecret}.`);
    parts.push(`It creates ${d.senderOutputs.join(", ")}.`);
  } else if (view === "receiver") {
    parts.push(`The receiver knows b_scan (not shown) and its address ${d.receiver.address}${d.receiver.labels.length ? `, with labels ${d.receiver.labels.join(", ")}` : ""}.`);
    if (steps) parts.push(`It computes the tweak ${d.tweak} and the shared secret ${d.sharedSecret}; ${d.steps.map((s) => `k = ${s.k}, P = ${s.Pk}, ${s.matched ? "found" : "not found"}`).join("; ")}.`);
    parts.push(`Outputs that are its own: ${d.txOutputs.filter((o) => o.mine).map((o) => o.key).join(", ") || "none"}.`);
  } else {
    parts.push("The observer has neither a nor b_scan, so it cannot compute any shared secret or tell which address, if any, an output pays.");
  }
  return parts.join(" ");
}

function Panel({ x, y, w, title, rows, hidden, hatch, who }: { x: number; y: number; w: number; title: string; rows: Row[] | null; hidden: string; hatch: string; who?: string }) {
  return (
    <g>
      {who ? <Computer at={[x, y - 2]} /> : null}
      <Value at={[x + (who ? 32 : 0), y + 8]} text={title} size={8.5} cls="k-value--label" />
      {rows ? (
        rows.map((r, k) => (
          <g>
            <Chip x={x} y={y + 28 + k * 17} w={w - (r.lamp ? 18 : 0)} role={r.role} text={r.text} dashed={r.dashed} />
            {r.lamp ? <Lamp at={[x + w - 6, y + 35 + k * 17]} state={r.lamp} r={4} /> : null}
          </g>
        ))
      ) : (
        <>
          <rect class="k-outline" x={x} y={y + 28} width={w} height="16" style={`fill:${hatch}`} />
          <Value at={[x, y + 56]} text={hidden} size={8} cls="k-value--muted" />
        </>
      )}
    </g>
  );
}

const panelH = (rows: Row[] | null) => (rows ? 30 + rows.length * 17 : 62);

/**
 * silent-payment-derivation.v1 — the Silent payments chapter's hero (drawing-first).
 *
 * Sender and receiver as computers either side of the published
 * transaction, which an outside observer can also read. Switch whose view it
 * is: each side shows only what that party knows, the other side is
 * hatched, and the observer sees no shared secret and no ownership. Values
 * are recomputed at build time by the tested model and checked against the
 * BIP 352 vectors; secret keys are never drawn.
 */
export function SpDerivation({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [view, setView] = useState<SpView>("sender");
  const [steps, setSteps] = useState(true);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived;
  const v: SpView = hydrated ? view : "sender";
  const st = hydrated ? steps : true;
  const p = spPanels(d, v, st);
  const status =
    v === "sender"
      ? `The sender's view: it sums its input keys' secrets, combines them with the receiver's scan key into a shared secret, and creates ${d.senderOutputs.length} taproot output${d.senderOutputs.length === 1 ? "" : "s"}.`
      : v === "receiver"
        ? `The receiver's view: from the public input keys and its secret b_scan it reaches ${d.secretsAgree ? "the same shared secret, and finds" : "a shared secret, but finds"} ${d.txOutputs.filter((o) => o.mine).length} output${d.txOutputs.filter((o) => o.mine).length === 1 ? "" : "s"} of its own.`
        : "An outside observer's view: the same transaction, with no shared secret and no way to tell whom the outputs pay.";

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const did = `${figureId}-${w}`;
    const ids = idsFor(did);
    const hide = (_side: string) => `HIDDEN: NOT KNOWN TO ${VIEW_NAME[v].toUpperCase()}`;
    if (wide) {
      const H = 24 + Math.max(panelH(p.sender), panelH(p.chain), panelH(p.receiver)) + 10;
      return (
        <Drawing id={did} width={640} height={H} title="One payment, seen from each side" desc={describeView(d, v, st)}>
          <Panel x={10} y={12} w={190} title="SENDER" who="sender" rows={p.sender} hidden={hide("SENDER")} hatch={ids.hatch} />
          <line class="k-boundary__line" x1="212" y1="4" x2="212" y2={H - 4} />
          <Panel x={224} y={12} w={192} title="THE TRANSACTION · PUBLIC" rows={p.chain} hidden="" hatch={ids.hatch} />
          <line class="k-boundary__line" x1="428" y1="4" x2="428" y2={H - 4} />
          <Panel x={440} y={12} w={190} title="RECEIVER" who="receiver" rows={p.receiver} hidden={hide("RECEIVER")} hatch={ids.hatch} />
        </Drawing>
      );
    }
    const y1 = 12, y2 = y1 + panelH(p.sender) + 14, y3 = y2 + panelH(p.chain) + 14;
    const H = y3 + panelH(p.receiver) + 6;
    return (
      <Drawing id={did} width={330} height={H} title="One payment, seen from each side" desc={describeView(d, v, st)}>
        <Panel x={10} y={y1} w={310} title="SENDER" who="sender" rows={p.sender} hidden={hide("SENDER")} hatch={ids.hatch} />
        <line class="k-boundary__line" x1="4" y1={y2 - 8} x2="326" y2={y2 - 8} />
        <Panel x={10} y={y2} w={310} title="THE TRANSACTION · PUBLIC" rows={p.chain} hidden="" hatch={ids.hatch} />
        <line class="k-boundary__line" x1="4" y1={y3 - 8} x2="326" y2={y3 - 8} />
        <Panel x={10} y={y3} w={310} title="RECEIVER" who="receiver" rows={p.receiver} hidden={hide("RECEIVER")} hatch={ids.hatch} />
      </Drawing>
    );
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <Strip label="Choose a published vector" name={`${figureId}-case`} options={fixtures.map((x) => ({ value: x.id, text: x.label }))} current={id} onPick={setId} />
          <Strip label="Switch sender/receiver view" name={`${figureId}-view`} options={[{ value: "sender", text: "Sender" }, { value: "receiver", text: "Receiver" }, { value: "observer", text: "Outside observer" }]} current={view} onPick={(x) => setView(x as SpView)} />
          <Strip label="Reveal shared-secret steps" name={`${figureId}-steps`} options={[{ value: "no", text: "Result only" }, { value: "yes", text: "Every step" }]} current={steps ? "yes" : "no"} onPick={(x) => setSteps(x === "yes")} />
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the sender’s side of the first vector, every step shown. With JavaScript you can switch to the receiver or an outside observer, pick other vectors and hide the intermediate steps.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this view</summary>
        <p class="atlas-hexlist" style="overflow-wrap:anywhere">{describeView(d, v, st)}</p>
      </details>
      <p class="atlas-hero__source">BIP 352 send_and_receive_test_vectors.json, “{d.comment}” (line {f.source.line}). Recomputed at build time by the tested model and checked against the vector’s outputs, shared secret and found outputs.</p>
    </div>
  );
}
