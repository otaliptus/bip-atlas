import { Drawing, Value } from "../kit";
import type { DerivedDescriptorFixture } from "../types";
import { shortKey } from "./descTree";
import { hPrime, splitOrigin } from "./DescriptorAnatomy";

const CH = 5.7; // character width at 9.5 units

/**
 * descriptor-sentence.v1 — static, opening. One published descriptor laid
 * out as a sentence of parts, each named on a leader line: the script
 * expression, the key's origin, the key, its derivation and its range, and
 * the optional checksum. Parts come from the build-time parse.
 */
export function DescriptorSentence({ fixture }: { fixture: DerivedDescriptorFixture }) {
  const d = fixture.derived;
  if (d.error || d.keys.length !== 1) throw new Error(`${fixture.id}: descriptor-sentence.v1 needs a parsed one-key descriptor`);
  const k = d.keys[0];
  // Parts in order; the origin is split so only its fingerprint is coloured as a hash.
  const parts: Array<{ text: string; role: string; label?: string; sub?: string; span?: number }> = [];
  for (const t of d.tokens) {
    if (t.role === "fn") parts.push({ text: `${t.text}(`, role: "plain", label: "SCRIPT EXPRESSION", sub: "WHAT KIND OF OUTPUT" });
    else if (t.role === "origin") {
      const [fp, steps] = splitOrigin(t.text);
      parts.push({ text: fp, role: "hash", label: "KEY ORIGIN", sub: "FINGERPRINT + STEPS", span: steps ? 2 : 1 });
      if (steps) parts.push({ text: hPrime(steps), role: "plain" });
    } else if (t.role === "key") parts.push({ text: shortKey(t.text), role: k.isPrivate ? "secret" : "public", label: k.isPrivate ? "PRIVATE KEY" : "PUBLIC KEY", sub: k.kind === "xpub" ? "AN XPUB" : k.kind.toUpperCase() });
    else if (t.role === "path") parts.push({ text: hPrime(t.text), role: "plain", label: "DERIVATION", sub: "STEPS AFTER THE KEY" });
    else if (t.role === "range") parts.push({ text: hPrime(t.text), role: "plain", label: "RANGE", sub: "EVERY CHILD INDEX" });
    else if (t.text === ")") parts.push({ text: ")", role: "plain" });
  }
  let x = 14;
  const boxes = parts.map((p) => {
    const w = p.text.length * CH + 9;
    const b = { ...p, x, w };
    x += w;
    return b;
  });
  const hashX = x + 6;
  const Y = 74;
  // Labels alternate above and below, two heights each; those right of centre read leftwards.
  const labelled = boxes.map((b, i) => ({ b, i })).filter(({ b }) => b.label);
  const desc =
    `The descriptor ${d.body} from BIP ${fixture.source.bip}, read as parts: ${labelled.map(({ b, i }) => `${b.span === 2 ? b.text + boxes[i + 1].text : b.text}, the ${b.label!.toLowerCase()}`).join("; ")}. ` +
    `${d.checksumGiven === null ? "No checksum is written after #; it is optional." : `Checksum #${d.checksumGiven}.`} ` +
    `${d.ranged ? `It stands for one output script per child index; BIP ${fixture.source.bip} lists the first ${d.scripts.length}.` : ""}`;
  const label = (cx: number, up: boolean, high: boolean, title: string, sub: string) => {
    const end = cx > 200;
    const tip = up ? Y - (high ? 46 : 20) : Y + 24 + (high ? 46 : 20);
    const ty = up ? tip - 15 : tip + 12;
    return (
      <g class="k-label">
        <line class="k-leader" x1={cx} y1={up ? Y - 2 : Y + 26} x2={cx} y2={tip} />
        <text x={end ? cx + 2 : cx - 2} y={ty} text-anchor={end ? "end" : "start"} style="font-size:9px">{title}</text>
        <text class="k-value--muted" x={end ? cx + 2 : cx - 2} y={ty + 11} text-anchor={end ? "end" : "start"} style="font-size:9px">{sub}</text>
      </g>
    );
  };
  return (
    <>
      <Drawing id="a13-sentence" width={344} height={206} title="A descriptor, part by part" desc={desc}>
        {boxes.map((b) => (
          <g>
            <rect class={`k-cell k-fill--${b.role}${b.label === "RANGE" ? " k-dashed" : ""}`} x={b.x} y={Y} width={b.w} height="24" />
            <Value at={[b.x + 5, Y + 16]} text={b.text} size={9.5} />
          </g>
        ))}
        {labelled.map(({ b, i }, n) => {
          const cx = b.span === 2 ? b.x + (b.w + boxes[i + 1].w) / 2 : b.x + b.w / 2;
          return label(cx, n % 2 === 0, n % 4 < 2 ? n % 4 === 0 : n % 4 === 3, b.label!, b.sub!);
        })}
        <rect class="k-outline k-dashed" x={hashX} y={Y} width="22" height="24" fill="none" />
        <Value at={[hashX + 5, Y + 16]} text="#" size={10.5} cls="k-value--muted" />
        {label(hashX + 11, false, false, "CHECKSUM", d.checksumGiven === null ? "OPTIONAL" : "8 CHARACTERS")}
        {d.ranged ? <Value at={[14, 198]} text="ONE OUTPUT SCRIPT PER CHILD INDEX" size={9} cls="k-value--label" /> : null}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>The descriptor in full (BIP {fixture.source.bip}, line {fixture.source.line})</summary>
        <code class="atlas-break">{fixture.descriptor}</code>
      </details>
    </>
  );
}
