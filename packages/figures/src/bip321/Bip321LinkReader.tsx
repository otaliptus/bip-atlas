import { checkSpec, type HeroSpec } from "../heroStates";
import { Computer, Drawing, Responsive, Value, wrapLines } from "../kit";
import type { DerivedBip321Fixture } from "../types";
import { UriRibbon, segmentsOf, walletSentence, walletVerdict } from "./parts";

export interface Bip321HeroState { id: string }

interface Props {
  fixtures: DerivedBip321Fixture[];
  figureId: string;
  /** The example to draw; the first by default (also the no-JS state). */
  initial?: Bip321HeroState;
}

export function bip321HeroSpec(fixtures: DerivedBip321Fixture[]): HeroSpec<Bip321HeroState> {
  return checkSpec<Bip321HeroState>({
    controls: [{ kind: "strip", name: "uri", label: "Example link", options: fixtures.map((f, i) => ({ value: `u${i}`, text: f.shortLabel ?? f.label })) }],
    states: fixtures.map((f, i) => ({ id: `u${i}`, keys: [`u${i}`], state: { id: f.id } })),
    initialKey: "u0",
    noJsId: "u0",
    staticNote: `Static view: the first of ${fixtures.length} published example links. With JavaScript you can choose the others.`,
  });
}

/**
 * bip321-link-reader.v1 — the Payment links chapter's hero (drawing-first).
 *
 * One of BIP 321's published example links, cut into its parts (scheme,
 * address, parameters, each tagged), its decoded values, and how three
 * illustrative wallets that implement different keys read it: what each can
 * pay with, or why the link is invalid for it. Every reading comes from the
 * tested model applying BIP 321's rules at build time.
 */
export function Bip321LinkReader({ fixtures, figureId, initial }: Props) {
  const f = fixtures.find((x) => x.id === (initial?.id ?? fixtures[0].id));
  if (!f) throw new Error(`bip321-link-reader: no fixture ${initial?.id}`);
  const d = f.derived;
  const r = d.reading;
  const segs = segmentsOf(f);
  const decoded = r.params.filter((p) => p.value !== null && p.raw.slice(p.raw.indexOf("=") + 1) !== p.value);
  const verdicts = d.wallets.map((w) => walletSentence(w).slice(w.name.length + 2));
  const status = verdicts.every((v) => v === verdicts[0])
    ? `${f.label}: ${verdicts[0]}, for all three wallets.`
    : `${f.label}: ${d.wallets.map(walletSentence).join("; ")}.`;
  const desc =
    `The link ${f.uri}. Scheme ${r.scheme}; ${r.address ? `address ${r.address}` : "no address in the body"}; ` +
    `${r.params.length ? `parameters ${r.params.map((p) => `${p.raw} (${p.required ? "required " : ""}${p.kind})`).join(", ")}` : "no parameters"}. ` +
    `${decoded.map((p) => `${p.key} decodes to "${p.value}"`).join("; ")} ${status}`;

  const draw = (wide: boolean) => {
    const W = wide ? 640 : 330;
    const fid = `${figureId}-${wide ? "w" : "n"}`;
    const x0 = wide ? 20 : 14;
    const ribbon = UriRibbon({ x: x0, y: 30, width: W - 2 * x0, segs, size: wide ? 9 : 8.5 });
    const decY = 30 + ribbon.height + 8;
    const wy = decY + decoded.length * 14 + 18;
    const colW = wide ? (W - 2 * x0 - 20) / 3 : W - 2 * x0;
    // Each verdict wrapped to its card; every card as tall as the longest.
    const verdictLines = d.wallets.map((w) => wrapLines(walletVerdict(w), Math.floor((colW - 50) / 4.5)));
    const cardH = 30 + Math.max(...verdictLines.map((l) => l.length)) * 12;
    const card = (i: number) => (wide ? { x: x0 + i * (colW + 10), y: wy } : { x: x0, y: wy + i * (cardH + 8) });
    const H = wide ? wy + cardH + 20 : wy + 3 * (cardH + 8) + 4;
    return (
      <Drawing id={fid} width={W} height={H} title="One link, read by three wallets" desc={desc}>
        <Value at={[x0, 14]} text={`BIP 321 EXAMPLE · LINE ${f.source.line} · ${r.valid ? "VALID" : "INVALID"}`} size={8.5} cls={r.valid ? "k-value--label" : "k-value--fail"} />
        {ribbon.el}
        {decoded.map((p, i) => <Value at={[x0, decY + i * 14]} text={`${p.key.toUpperCase()} DECODES TO “${p.value}”`} size={8.5} />)}
        <Value at={[x0, wy - 6]} text="READ BY THREE ILLUSTRATIVE WALLETS" size={8} cls="k-value--muted" />
        {d.wallets.map((w, i) => {
          const c = card(i);
          const pays = w.valid && w.pays.length > 0;
          const lines = verdictLines[i];
          return (
            <g data-wallet={w.name}>
              <rect class={`k-outline ${pays ? "k-fill--net" : w.valid ? "k-fill--plain" : "k-fill--plain k-cell--em"}`} x={c.x} y={c.y} width={colW} height={cardH} />
              <Computer at={[c.x + 8, c.y + 8]} />
              <Value at={[c.x + 42, c.y + 16]} text={w.name.toUpperCase()} size={8} cls="k-value--label" />
              {lines.map((l, k) => <Value at={[c.x + 42, c.y + 32 + k * 12]} text={l} size={7.5} cls={pays ? "k-value--ok" : w.valid ? "k-value--muted" : "k-value--fail"} />)}
            </g>
          );
        })}
      </Drawing>
    );
  };

  return (
    <>
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <p class="atlas-hero__status" data-status>{status}</p>
      <details class="atlas-disclosure">
        <summary>What each wallet implements</summary>
        <dl class="atlas-hexlist">
          {d.wallets.map((w) => <><dt>{w.name}</dt><dd><code>{w.implemented.join(", ")}</code>{w.ignored.length ? <> · ignores <code>{w.ignored.join(", ")}</code></> : null}</dd></>)}
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 321 line {f.noteLine}: “{f.note}”, and the link on line {f.source.line}. The example addresses are intentionally invalid. The three wallets are illustrations, not part of BIP 321; each reading applies its rules.</p>
    </>
  );
}
