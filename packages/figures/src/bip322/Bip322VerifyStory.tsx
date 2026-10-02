import { Arrow, Machine, Storyboard, Value, type Frame } from "../kit";
import type { DerivedBip322Fixture } from "../types";

const s8 = (hex: string) => `${hex.slice(0, 8)}…`;

/**
 * bip322-verify-story.v1 — static storyboard (was the worked example). A
 * verifier's steps for one published full-format vector, each result from
 * the tested model: rebuild to_spend, decode to_sign, check the link, run
 * the scripts, report the verdict with T and S.
 */
export function Bip322VerifyStory({ fixture }: { fixture: DerivedBip322Fixture }) {
  const d = fixture.derived, t = d.toSign, v = d.verdict;
  if (d.variant !== "ful" || v.state !== "valid") throw new Error(`${fixture.id}: the storyboard follows a valid full-format vector`);
  const card = (x: number, y: number, w: number, head: string, lines: string[], cls = "k-fill--plain") => (
    <g>
      <rect class={`k-outline ${cls}`} x={x} y={y} width={w} height={14 + lines.length * 11} rx="2" />
      <text class="k-b3-h" x={x + 6} y={y + 11}>{head}</text>
      {lines.map((l, i) => <text class="k-b3-v" x={x + 6} y={y + 23 + i * 11}>{l}</text>)}
    </g>
  );
  const frames: Frame[] = [
    {
      note: "From the message and the address alone, the verifier builds to_spend itself.",
      desc: `Message “${d.message}” and address ${d.address} give the message hash ${d.messageHash} and to_spend ${d.toSpend.txid}.`,
      draw: (ids) => (
        <>
          {card(12, 12, 120, "MESSAGE", [`“${d.message.length > 16 ? `${d.message.slice(0, 16)}…` : d.message}”`])}
          {card(12, 54, 120, "ADDRESS", [`${d.address.slice(0, 16)}…`])}
          <Arrow d="M136 46 H156" ids={ids} />
          {card(162, 30, 126, "TO_SPEND", [`ID ${s8(d.toSpend.txid)}`, `hash ${s8(d.messageHash)}`])}
        </>
      ),
    },
    {
      note: `It decodes to_sign from the “${d.variant}” signature: its first input must spend to_spend's output 0, and it must have one output.`,
      desc: `The full signature decodes to to_sign ${t.txid}, version ${t.version}, lock time ${t.lockTime}, sequence ${t.sequence}. Its first input spends to_spend:0 and it has exactly one output.`,
      draw: () => (
        <>
          {card(12, 12, 130, `SIGNATURE · ${d.variant.toUpperCase()}`, [`prefix “${d.variant}”`, `${d.signatureChars} base64 characters`])}
          {card(162, 12, 126, "TO_SIGN", [`IN ${s8(d.toSpend.txid)}:0 ✓`, "ONE OUTPUT ✓"])}
          <Value at={[162, 74]} text={`LOCK TIME ${t.lockTime}`} size={8.5} cls="k-b3-time" />
          <Value at={[162, 86]} text={`SEQUENCE ${t.sequence}`} size={8.5} cls="k-b3-time" />
        </>
      ),
    },
    {
      note: "It runs the pair through the script interpreter with BIP 322's required rules; lock time and sequence are reported, not enforced.",
      desc: `The ${d.checked} spend passes the script checks and BIP 322's required rules in the model's reviewed-opcode interpreter.`,
      draw: (ids) => (
        <>
          {card(12, 20, 120, "BOTH TXS", [d.checked.toUpperCase()])}
          <Arrow d="M136 36 H156" ids={ids} />
          <Machine at={[188, 50]} w={48} d={26} h={20} label="script" />
          <Value at={[12, 80]} text="REVIEWED-OPCODE INTERPRETER" size={8.5} cls="k-value--label" />
          <Value at={[12, 94]} text="SCRIPT RULES + REQUIRED RULES ✓" size={8.5} cls="k-value--label" />
        </>
      ),
    },
    {
      note: `Valid at time T = ${v.time} and age S = ${v.age}: to_sign's lock time and first sequence, not a date.`,
      desc: `Verdict: valid at time T = ${v.time} and age S = ${v.age}, the lock time and first input's sequence of to_sign.`,
      draw: () => (
        <>
          <g class="k-b3-stamp" data-state="valid">
            <rect x="40" y="30" width="220" height="40" rx="4" />
            <text x="150" y="55" text-anchor="middle">{`VALID · T ${v.time} · S ${v.age}`}</text>
          </g>
          <rect class="k-cell k-mark--time" x="40" y="74" width="220" height="3" />
          <Value at={[150, 92]} text="T, S: LOCK-TIME FIELDS, REPORTED" size={8.5} anchor="middle" cls="k-b3-time" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a18-verify" title="A verifier's steps" width={300} height={110} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Message and address</dt><dd>“{d.message}”<br /><code class="atlas-break">{d.address}</code></dd>
          <dt>Message hash, to_spend, to_sign</dt><dd><code class="atlas-break">{d.messageHash}</code><br /><code class="atlas-break">{d.toSpend.txid}</code><br /><code class="atlas-break">{t.txid}</code></dd>
        </dl>
      </details>
    </>
  );
}
