import { checkSpec, type HeroSpec } from "../heroStates";
import { Drawing, Lamp, Responsive, Value, short, wrapLines } from "../kit";
import type { DerChangeId, DerivedDerFixture } from "../types";
import { SigRibbon, verdict } from "./parts";

export interface DerHeroState { change: DerChangeId }

interface Props {
  fixtures: DerivedDerFixture[];
  figureId: string;
  /** The change to draw; the published signature by default (also the no-JS state). */
  initial?: DerHeroState;
}

const ORDER: DerChangeId[] = ["published", "pad-removed", "zero-added", "length-byte", "s-flipped"];

export function derHeroSpec(fixtures: DerivedDerFixture[]): HeroSpec<DerHeroState> {
  const vs = fixtures[0].derived.variants;
  if (ORDER.some((id) => !vs.find((v) => v.id === id))) throw new Error("der-signature-checks: needs a signature with a padded R (all five changes)");
  return checkSpec<DerHeroState>({
    controls: [{ kind: "strip", name: "change", label: "Change to the published signature", options: ORDER.map((id) => ({ value: id, text: vs.find((v) => v.id === id)!.label })) }],
    states: ORDER.map((id) => ({ id, keys: [id], state: { change: id } })),
    initialKey: "published",
    noJsId: "published",
    staticNote: "Static view: the signature as published. With JavaScript you can try four changes to its bytes.",
  });
}

/**
 * der-signature-checks.v1 — the Strict signatures chapter's hero (drawing-first).
 *
 * Input 0's signature from BIP 143's example, as published or with one small
 * change: its DER fields (changed ones outlined), BIP 66's fourteen checks in
 * order up to the first that fails, then BIP 146's proposed LOW_S check and
 * ECDSA verification once the encoding passes. Every result comes from the tested
 * model at build time; ECDSA is audited noble.
 */
export function DerSignatureChecks({ fixtures, figureId, initial }: Props) {
  const f = fixtures[0];
  const d = f.derived;
  const v = d.variants.find((x) => x.id === (initial?.change ?? "published"))!;
  const pub = d.variants.find((x) => x.id === "published")!;
  const failedAt = v.encoding.valid ? -1 : v.encoding.ran - 1;
  const numbers = v.id === "pad-removed" ? "R keeps its digits but, without the zero byte, DER reads it as negative; S is unchanged" : v.sameNumbers ? "R and S are the same numbers as published" : "R is the same; S is replaced by n − S";
  const txid = v.txidHex === pub.txidHex ? "the txid is unchanged" : "the transaction's txid would change";
  const said = verdict(v);
  const after =
    v.id === "published" ? ""
    : v.encoding.valid ? ` BIP 146 records LOW_S as relay policy, not a consensus rule. Anyone can make this change without the key, and it changes the transaction's txid.`
    : ` If nodes accepted it, ${txid}.`;
  const status = `${v.label}: ${v.bytes} bytes. ${numbers}. ${said[0].toUpperCase()}${said.slice(1)}.${after}`;
  const desc = `Input 0's signature in BIP 143's example: ${v.hex}. Fields: ${v.fields.map((x) => `${x.label} ${x.hex}`).join(", ")}${v.changed.length ? `; changed: ${v.changed.join(", ")}` : ""}. BIP 66's checks: ${d.checks.map((c, i) => `line ${c.line}, ${c.label}: ${i < v.encoding.ran ? (i === failedAt ? "fails" : "passes") : "not run"}`).join("; ")}. BIP 146 LOW_S: ${v.lowS === null ? "not reached" : v.lowS ? "passes" : "would fail"}. ECDSA: ${v.ecdsa === null ? "not reached" : v.ecdsa ? "verifies" : "fails"}. ${status}`;

  const draw = (wide: boolean) => {
    const W = wide ? 640 : 330;
    const fid = `${figureId}-${wide ? "w" : "n"}`;
    const x0 = wide ? 20 : 14;
    const ribbonY = 40;
    const checksY = ribbonY + 62;
    const cols = wide ? 2 : 1;
    const perCol = Math.ceil(d.checks.length / cols);
    const colW = wide ? 206 : W - 2 * x0;
    const rowH = 16;
    const checksEnd = checksY + 14 + perCol * rowH;
    // Right column (wide) or below (narrow): ECDSA and LOW_S, then the verdict.
    const rx = wide ? x0 + 2 * colW + 22 : x0;
    const ry = wide ? checksY : checksEnd + 14;
    const verdictLines = wrapLines(verdict(v), wide ? 30 : 52);
    const H = (wide ? Math.max(checksEnd, ry + 112 + verdictLines.length * 13) : ry + 112 + verdictLines.length * 13) + 10;
    const lamp = (state: boolean | null) => (state === null ? "idle" : state ? "on" : "off");
    return (
      <Drawing id={fid} width={W} height={H} title="One signature through BIP 66 and BIP 146" desc={desc}>
        <Value at={[x0, 14]} text={wide ? `BIP 143 EXAMPLE · INPUT 0 (P2PK) · SIGNATURE IN THE scriptSig · ${v.bytes} BYTES` : `BIP 143 · INPUT 0 · scriptSig · ${v.bytes} BYTES`} size={8.5} cls="k-value--label" />
        <Value at={[x0, 27]} text={v.id === "published" ? "AS PUBLISHED" : `CHANGED (▼): ${v.label.toUpperCase()}`} size={8} cls={v.id === "published" ? "k-value--muted" : "k-value--label"} />
        <SigRibbon x={x0} y={ribbonY} v={v} width={W - 2 * x0} />
        <Value at={[x0, checksY]} text="BIP 66 · IsValidSignatureEncoding, IN ORDER" size={8} cls="k-value--label" />
        {d.checks.map((c, i) => {
          const col = Math.floor(i / perCol), row = i % perCol;
          const x = x0 + col * (colW + 12), y = checksY + 14 + row * rowH;
          const state = i < v.encoding.ran ? (i === failedAt ? "off" : "on") : "idle";
          return (
            <g data-check={c.id} data-state={state}>
              <Value at={[x, y + 11]} text={state === "on" ? "✓" : state === "off" ? "✕" : "·"} size={10} cls={state === "on" ? "k-value--ok" : state === "off" ? "k-value--fail" : "k-value--muted"} />
              <Value at={[x + 13, y + 11]} text={`L${c.line}`} size={8.5} cls="k-value--muted" />
              <Value at={[x + 40, y + 11]} text={c.label} size={9} cls={state === "idle" ? "k-value--muted" : state === "off" ? "k-value--fail" : ""} />
              {state === "off" ? <rect class="k-outline k-cell--em" x={x - 3} y={y} width={colW} height={rowH - 1} style="fill:none" /> : null}
            </g>
          );
        })}
        <g data-stage="low-s">
          <Lamp at={[rx + 10, ry + 14]} state={lamp(v.lowS)} r={7} />
          <Value at={[rx + 26, ry + 12]} text="LOW_S (BIP 146, PROPOSED)" size={9} cls="k-value--label" />
          <Value at={[rx + 26, ry + 24]} text={v.lowS === null ? "NOT REACHED" : v.lowS ? "S ≤ n / 2" : "S > n / 2: WOULD FAIL"} size={8.5} cls="k-value--muted" />
        </g>
        <g data-stage="ecdsa">
          <Lamp at={[rx + 10, ry + 50]} state={lamp(v.ecdsa)} r={7} />
          <Value at={[rx + 26, ry + 48]} text="ECDSA VERIFY" size={9} cls="k-value--label" />
          <Value at={[rx + 26, ry + 60]} text={v.ecdsa === null ? "NOT REACHED" : v.ecdsa ? "VALID SIGNATURE" : "FAILS"} size={8.5} cls="k-value--muted" />
        </g>
        <Value at={[rx, ry + 86]} text={v.id === "pad-removed" ? "R'S DIGITS KEPT, NOW READ AS NEGATIVE" : v.sameNumbers ? "R, S: SAME NUMBERS AS PUBLISHED" : "S REPLACED BY n − S"} size={7.5} cls="k-value--label" />
        <Value at={[rx, ry + 99]} text={v.id === "published" ? `txid ${short(v.txidHex, 10)}` : `${v.encoding.valid ? "txid with it" : "txid if accepted"} ${short(v.txidHex, 8)}${v.txidHex === pub.txidHex ? " (same)" : " (changed)"}`} size={7.5} cls="k-value--muted" />
        {verdictLines.map((l, i) => <Value at={[rx, ry + 116 + i * 13]} text={l} size={9} cls={v.encoding.valid && v.lowS ? "k-value--ok" : "k-value--fail"} />)}
      </Drawing>
    );
  };

  return (
    <>
      <Responsive wide={draw(true)} narrow={draw(false)} />
      <p class="atlas-hero__status" data-status>{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Signature ({v.bytes} bytes, sighash byte last)</dt><dd><code class="atlas-break">{v.hex}</code></dd>
          <dt>R</dt><dd><code class="atlas-break">{v.rHex}</code></dd>
          <dt>S</dt><dd><code class="atlas-break">{v.sHex}</code></dd>
          <dt>Signed digest (legacy, computed)</dt><dd><code class="atlas-break">{d.digestHex}</code></dd>
          <dt>txid with this signature (display order)</dt><dd><code class="atlas-break">{v.txidHex}</code></dd>
        </dl>
      </details>
      <p class="atlas-hero__source">BIP 143 line {f.signatureLine} (input 0's scriptSig in its signed example, line {f.txLine}). The four changes are computed by the model from those bytes; BIP 66's checks are lines 55–101 of its reference function. The example's keys are printed in BIP 143: test material only.</p>
    </>
  );
}
