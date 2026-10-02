import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { Drawing, Responsive, Value, idsFor } from "../kit";
import type { DerivedBip322Fixture } from "../types";

interface Props {
  fixtures: DerivedBip322Fixture[];
  figureId: string;
}

const s8 = (hex: string) => `${hex.slice(0, 8)}…`;
type View = "to_spend" | "to_sign";

/**
 * bip322-virtual-tx.v1 — the Message signing chapter's hero (drawing-first).
 *
 * Two tickets for the two virtual transactions of a published BIP 322
 * vector: to_spend commits to the message hash and the address; to_sign
 * spends its output 0 and carries the signature. The verifier's stamp sits
 * on to_sign. Everything was rebuilt and verified at build time by the
 * tested model; the browser only chooses what to show.
 */
export function Bip322VirtualTx({ fixtures, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [id, setId] = useState(fixtures[0].id);
  const [view, setView] = useState<View>("to_spend");
  const [reveal, setReveal] = useState(false);
  const f = fixtures.find((x) => x.id === id)!;
  const d = f.derived, t = d.toSign, v = d.verdict;
  const show = hydrated ? reveal : true;
  const both = !hydrated;
  const n = t.witness.length;
  const sig = n ? `${n} item${n === 1 ? "" : "s"} · ${t.witness.reduce((a, w) => a + w.length / 2, 0)} B` : `${t.scriptSig.length / 2} B`;
  const stamp = v.state === "valid" ? `VALID · T ${v.time} · S ${v.age}` : v.state.toUpperCase();
  const status = view === "to_spend" && !both
    ? `to_spend for “${d.message}”: one input spending an output that does not exist, its scriptSig pushing ${show ? `the message hash ${s8(d.messageHash)}` : "the message hash"}, and one 0-satoshi output to the address's script. Its ID is ${s8(d.toSpend.txid)}.`
    : `to_sign spends to_spend's output 0 and pays 0 satoshis to OP_RETURN. Its ${t.witness.length ? `witness, ${t.witness.length} item${t.witness.length === 1 ? "" : "s"},` : "scriptSig"} is the signature. Verdict: ${v.state}${v.state === "valid" ? ` at time ${v.time} and age ${v.age}` : `: ${v.reason}`}.`;
  const desc = `BIP 322 vector ${f.label}, address ${d.address}, message “${d.message}”. Message hash ${show ? d.messageHash : "not shown"}. to_spend ${d.toSpend.txid}: input 000…000:0xFFFFFFFF, scriptSig OP_0 PUSH32 of the message hash, output 0 of 0 satoshis to ${d.toSpend.challenge}. to_sign ${t.txid}: version ${t.version}, lock time ${t.lockTime}, sequence ${t.sequence}, input to_spend:0, signature ${sig}, output 0 satoshis to OP_RETURN. ${status}`;

  const ticket = (x: number, y: number, w: number, which: View, ids: ReturnType<typeof idsFor>) => {
    const dim = !both && view !== which;
    const spend = which === "to_spend";
    const row = (k: number, label: string, value: string, cls = "k-fill--plain", dashed = false) => (
      <g>
        <rect class={`k-cell ${cls}${dashed ? " k-dashed" : ""}`} x={x + 8} y={y + 26 + k * 30} width={w - 16} height={26} />
        <text class="k-b3-l" x={x + 13} y={y + 36 + k * 30}>{label}</text>
        <text class="k-b3-v" x={x + 13} y={y + 47 + k * 30}>{value}</text>
      </g>
    );
    return (
      <g class={dim ? "k-faded" : undefined} data-ticket={which}>
        <rect class={`k-outline k-fill--plain${dim ? "" : " k-cell--em"}`} x={x} y={y} width={w} height={130} rx="3" />
        <text class="k-b3-h" x={x + 8} y={y + 16}>{`${which.toUpperCase()} · ${s8(spend ? d.toSpend.txid : t.txid)}`}</text>
        {spend ? (
          <>
            {row(0, "IN · 000…000:FFFFFFFF", "an output that does not exist", "k-fill--plain", true)}
            <rect class="k-cell k-fill--plain" x={x + 8} y={y + 56} width={w - 16} height={26} />
            <text class="k-b3-l" x={x + 13} y={y + 66}>SCRIPTSIG · OP_0 PUSH32</text>
            <rect class={`k-cell ${show ? "k-fill--hash" : ""}`} x={x + 13} y={y + 69} width={78} height={11} style={show ? undefined : `fill:${ids.hatch}`} />
            <text class="k-b3-v" x={x + 16} y={y + 78}>{show ? s8(d.messageHash) : ""}</text>
            <text class="k-b3-l" x={x + 96} y={y + 78}>MESSAGE HASH</text>
            {row(2, "OUT 0 · 0 SAT TO", `the address's script ${d.scriptKind.toUpperCase()}`)}
          </>
        ) : (
          <>
            {row(0, "IN · TO_SPEND:0", `v${t.version} · lock time ${t.lockTime} · seq ${t.sequence}`, t.lockTime || t.sequence ? "k-fill--time" : "k-fill--plain")}
            {row(1, t.witness.length ? "WITNESS = THE SIGNATURE" : "SCRIPTSIG = THE SIGNATURE", sig, "k-fill--sig")}
            {row(2, "OUT 0 · 0 SAT TO", "OP_RETURN")}
          </>
        )}
      </g>
    );
  };

  const draw = (wide: boolean) => {
    const W = wide ? 640 : 330, tw = wide ? 290 : 306;
    const ids = idsFor(`${figureId}-${wide ? "w" : "n"}`);
    const ax = 12, ay = 52, bx = wide ? 338 : 12, by = wide ? 52 : 214;
    const H = by + 176;
    return (
      <Drawing id={`${figureId}-${wide ? "w" : "n"}`} width={W} height={H} title="to_spend and to_sign" desc={desc}>
        <Value at={[12, 16]} text={`MESSAGE “${d.message.length > 38 ? `${d.message.slice(0, 38)}…` : d.message}”`} size={9} cls="k-value--label" />
        <Value at={[12, 32]} text={`ADDRESS ${d.address.slice(0, 18)}…`} size={8} cls="k-value--muted" />
        {ticket(ax, ay, tw, "to_spend", ids)}
        {ticket(bx, by, tw, "to_sign", ids)}
        {/* to_sign's input spends to_spend's output 0 */}
        <path class="k-line" d={wide ? `M${ax + tw - 8} ${ay + 121} H${ax + tw + 16} V${by + 39} H${bx + 8}` : `M${ax + tw - 30} ${ay + 134} V${by - 4}`} marker-end={ids.arrow} />
        <g class="k-b3-stamp" data-state={v.state}>
          <rect x={bx + tw - 150} y={by + 136} width="150" height="24" rx="3" />
          <text x={bx + tw - 75} y={by + 152} text-anchor="middle">{stamp}</text>
        </g>
        <Value at={[ax, by + 152]} text="NEVER BROADCAST" size={8.5} cls="k-value--muted" />
      </Drawing>
    );
  };

  const strip = (label: string, opts: Array<[string, string]>, cur: string, set: (s: string) => void) => (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {opts.map(([val, text]) => (
        <label class="atlas-strip__opt">
          <input type="radio" name={`${figureId}-${label}`} checked={cur === val} onChange={() => set(val)} />
          <span>{text}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Published vector">
            {fixtures.map((x) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-vec`} checked={x.id === id} onChange={() => setId(x.id)} aria-label={`${x.label}, ${x.shortLabel}`} />
                <span>{x.label.split(",")[0]}{x.derived.variant === "ful" ? " · ful" : ""}</span>
              </label>
            ))}
          </div>
          {strip("Virtual transaction", [["to_spend", "to_spend"], ["to_sign", "to_sign"]], view, (s) => setView(s as View))}
          {strip("Message hash", [["hide", "Hash hidden"], ["show", "Reveal the hash"]], reveal ? "show" : "hide", (s) => setReveal(s === "show"))}
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: the first vector, both virtual transactions and the message hash. With JavaScript you can switch vectors and views.</p>
      )}
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this vector</summary>
        <dl class="atlas-hexlist">
          <dt>Message and address</dt><dd>“{d.message}”<br /><code class="atlas-break">{d.address}</code></dd>
          {show ? <><dt>Message hash</dt><dd><code class="atlas-break">{d.messageHash}</code></dd></> : null}
          <dt>to_spend and to_sign IDs</dt><dd><code class="atlas-break">{d.toSpend.txid}</code><br /><code class="atlas-break">{t.txid}</code></dd>
          <dt>Address script</dt><dd><code class="atlas-break">{d.toSpend.challenge}</code></dd>
          <dt>Signature ({t.witness.length ? "witness items" : "scriptSig"})</dt><dd>{(t.witness.length ? t.witness : [t.scriptSig]).map((w) => <><code class="atlas-break">{w || "(empty)"}</code><br /></>)}</dd>
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 322 test vectors; to_spend, to_sign and the verdict rebuilt by the tested model, which fails the build if a verdict differs from the recorded one.</p>
    </div>
  );
}
