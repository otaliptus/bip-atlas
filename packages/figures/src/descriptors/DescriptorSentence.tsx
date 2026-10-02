import { Drawing, Value } from "../kit";
import type { DerivedDescriptorFixture } from "../types";
import { prime, shortKey } from "./descTree";

const CH = 6.2; // character width at 10.5 units

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
  const parts: Array<{ text: string; role: string; label: string; sub: string }> = [];
  for (const t of d.tokens) {
    if (t.role === "fn") parts.push({ text: `${t.text}(`, role: "plain", label: "SCRIPT EXPRESSION", sub: "WHAT KIND OF OUTPUT" });
    else if (t.role === "origin") parts.push({ text: prime(t.text), role: "hash", label: "KEY ORIGIN", sub: "FINGERPRINT + STEPS" });
    else if (t.role === "key") parts.push({ text: shortKey(t.text), role: k.isPrivate ? "secret" : "public", label: k.isPrivate ? "PRIVATE KEY" : "PUBLIC KEY", sub: k.kind === "xpub" ? "AN XPUB" : k.kind.toUpperCase() });
    else if (t.role === "path") parts.push({ text: prime(t.text), role: "plain", label: "DERIVATION", sub: "STEPS AFTER THE KEY" });
    else if (t.role === "range") parts.push({ text: prime(t.text), role: "plain", label: "RANGE", sub: "EVERY CHILD INDEX" });
    else if (t.text === ")") parts.push({ text: ")", role: "plain", label: "", sub: "" });
  }
  let x = 14;
  const boxes = parts.map((p) => {
    const w = p.text.length * CH + 10;
    const b = { ...p, x, w };
    x += w;
    return b;
  });
  const Y = 74;
  const desc =
    `The descriptor ${d.body} from BIP ${fixture.source.bip}, read as parts: ${boxes.filter((b) => b.label).map((b) => `${b.text}, the ${b.label.toLowerCase()}`).join("; ")}. ` +
    `${d.checksumGiven === null ? "No checksum is written; it is optional." : `Checksum #${d.checksumGiven}.`} ` +
    `${d.ranged ? `It stands for one output script per child index; BIP ${fixture.source.bip} lists the first ${d.scripts.length}.` : ""}`;
  return (
    <>
      <Drawing id="a13-sentence" width={344} height={190} title="A descriptor, part by part" desc={desc}>
        {boxes.map((b, i) => {
          const up = i % 2 === 0;
          const cx = b.x + b.w / 2;
          return (
            <g>
              <rect class={`k-cell k-fill--${b.role}${b.label === "RANGE" ? " k-cell--em" : ""}`} x={b.x} y={Y} width={b.w} height="24" />
              <Value at={[b.x + 5, Y + 16]} text={b.text} size={10.5} />
              {b.label ? (
                <g class="k-label">
                  <line class="k-leader" x1={cx} y1={up ? Y - 2 : Y + 26} x2={cx} y2={up ? Y - (i % 4 === 0 ? 44 : 20) : Y + (i % 4 === 1 ? 50 : 28)} />
                  <text x={cx - 2} y={up ? Y - (i % 4 === 0 ? 58 : 34) : Y + (i % 4 === 1 ? 62 : 40)} style="font-size:9px">{b.label}</text>
                  <text class="k-value--muted" x={cx - 2} y={up ? Y - (i % 4 === 0 ? 47 : 23) : Y + (i % 4 === 1 ? 73 : 51)} style="font-size:9px">{b.sub}</text>
                </g>
              ) : null}
            </g>
          );
        })}
        <rect class="k-outline k-dashed" x={x + 6} y={Y} width="22" height="24" fill="none" />
        <Value at={[x + 11, Y + 16]} text="#" size={10.5} cls="k-value--muted" />
        <Value at={[14, 176]} text={`${d.checksumGiven === null ? "NO CHECKSUM WRITTEN: IT IS OPTIONAL · " : ""}${d.ranged ? `ONE SCRIPT PER CHILD` : ""}`} size={9} cls="k-value--label" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>The descriptor in full (BIP {fixture.source.bip}, line {fixture.source.line})</summary>
        <code class="atlas-break">{fixture.descriptor}</code>
      </details>
    </>
  );
}
