import { Drawing, Lamp, Machine, Value, wrapLines } from "../kit";
import type { DerivedMusig2PsigChecksFixture } from "../types";
import { short } from "./scene";

const VERDICT = { valid: "ACCEPTED", invalid: "REJECTED", error: "BLAMED" } as const;

/**
 * musig2-psig-checks.v1 — static. PartialSigVerify as a tester with one lamp
 * per published case: the valid partial signature lights it; wrong ones leave
 * it dark; the error cases name the signer and the contribution to blame.
 * Every verdict recomputed by the tested model and checked against the vector.
 */
export function Musig2PsigChecks({ fixture }: { fixture: DerivedMusig2PsigChecksFixture }) {
  const rows = fixture.derived.rows;
  const laid = rows.map((r) => ({ r, lines: wrapLines(r.label, 30), detail: wrapLines(`checked as signer ${r.signer + 1}: ${r.detail}`, 34) }));
  let y = 116;
  const at = laid.map((l) => {
    const top = y;
    y += Math.max(l.lines.length + l.detail.length, 2) * 11 + 18;
    return top;
  });
  const desc = rows.map((r) => `${r.label}: signer ${r.signer + 1}'s partial signature ${r.psig} is ${VERDICT[r.verdict].toLowerCase()}; ${r.detail}.`).join(" ");
  return (
    <>
      <Drawing id="a14-psig" width={344} height={y + 4} title="Checking partial signatures" desc={desc}>
        <Machine at={[30, 40]} w={116} d={26} h={26} label="PartialSigVerify" />
        <Value at={[180, 22]} text="ONE CHECK PER CASE:" size={8.5} cls="k-value--label" />
        <Value at={[180, 34]} text="s·G = Re + e·a·g′·P ?" size={9} />
        
        {laid.map((l, i) => (
          <g data-verdict={l.r.verdict}>
            <rect class="k-outline k-fill--sig" x="14" y={at[i]} width="78" height="16" />
            <Value at={[18, at[i] + 11.5]} text={`psig ${short(l.r.psig)}`} size={8} />
            {l.lines.map((t, k) => <Value at={[100, at[i] + 11 + k * 11]} text={t} size={8.5} />)}
            {l.detail.map((t, k) => <Value at={[100, at[i] + 11 + (l.lines.length + k) * 11]} text={t} size={8} cls="k-value--muted" />)}
            <Lamp at={[300, at[i] + 9]} state={l.r.verdict === "valid" ? "on" : "off"} r={6} />
            <Value at={[300, at[i] + 28]} text={VERDICT[l.r.verdict]} size={7.5} anchor="middle" cls="k-value--label" />
          </g>
        ))}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {rows.map((r) => (<><dt>{r.label} (signer {r.signer + 1})</dt><dd><code class="atlas-break">{r.psig}</code></dd></>))}
        </dl>
      </details>
    </>
  );
}
