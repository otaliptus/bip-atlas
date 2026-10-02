import { Arrow, Drawing, KeyGlyph, Machine, Value, idsFor } from "../kit";
import type { DerivedDescriptorFixture } from "../types";

const short = (s: string, n: number) => `${s.slice(0, n)}…`;

/**
 * descriptor-template.v1 — static. pkh(KEY) fills BIP 381's template: the
 * key's HASH160 goes into the one slot between fixed opcodes. The script is
 * BIP 381's published one; the build checks the expansion against it, and
 * this figure throws unless the bytes split as the template says.
 */
export function DescriptorTemplate({ fixture }: { fixture: DerivedDescriptorFixture }) {
  const d = fixture.derived;
  const s = d.scripts[0]?.[0];
  const k = d.keys[0];
  if (d.error || !s || !k || !d.outline.startsWith("pkh(")) throw new Error(`${fixture.id}: descriptor-template.v1 draws a pkh() descriptor`);
  if (!s.startsWith("76a914") || !s.endsWith("88ac") || s.length !== 50) throw new Error(`${fixture.id}: script does not fill the pkh template`);
  const hash = s.slice(6, 46);
  const ids = idsFor("a13-tpl");
  const slots = [
    { op: "OP_DUP", hex: "76" },
    { op: "OP_HASH160", hex: "a9" },
    { op: "<KEY_hash160>", hex: `14 ${short(hash, 12)}`, fill: true },
    { op: "OP_EQUALVERIFY", hex: "88" },
    { op: "OP_CHECKSIG", hex: "ac" },
  ];
  const desc =
    `pkh() fills BIP 381's template OP_DUP OP_HASH160 <KEY_hash160> OP_EQUALVERIFY OP_CHECKSIG. ` +
    `The key ${k.publicKeys[0]} goes through HASH160, giving ${hash}, which fills the one slot after a push of 20 bytes (0x14). ` +
    `The script is ${s}, as BIP 381 lists it on line ${fixture.scriptLines[0]}.`;
  return (
    <>
      <Drawing id="a13-tpl" width={344} height={246} title="Filling the template" desc={desc}>
        <KeyGlyph at={[8, 10]} role="public" />
        <Value at={[46, 20]} text={`KEY · ${short(k.publicKeys[0], 10)}`} size={9.5} />
        <Value at={[46, 34]} text={k.origin ? `ITS ORIGIN [${k.origin.split("/")[0]}/…] ADDS NO BYTES` : "NO ORIGIN GIVEN"} size={9} cls="k-value--muted" />
        <Arrow d="M23 26 V44 H72" ids={ids} />
        <Machine at={[96, 62]} w={70} d={26} h={20} label="HASH160" role="hash" />
        <Value at={[174, 92]} text="→ 20 BYTES INTO THE ONE SLOT" size={9} cls="k-value--label" />
        <Value at={[8, 124]} text="TEMPLATE (BIP 381)" size={9} cls="k-value--label" />
        <Value at={[150, 124]} text={`BYTES · BIP 381 LINE ${fixture.scriptLines[0]}`} size={9} cls="k-value--label" />
        {slots.map((p, i) => (
          <g>
            <rect class={`k-cell ${p.fill ? "k-fill--hash k-cell--em" : "k-fill--plain"}`} x={8} y={132 + i * 22} width={136} height="20" />
            <Value at={[13, 145.5 + i * 22]} text={p.op} size={9.5} />
            <rect class={`k-cell ${p.fill ? "k-fill--hash" : "k-fill--plain"}`} x={150} y={132 + i * 22} width={186} height="20" />
            <Value at={[155, 145.5 + i * 22]} text={p.hex} size={9.5} />
          </g>
        ))}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Key</dt><dd><code class="atlas-break">{k.publicKeys[0]}</code></dd>
          <dt>HASH160 of the key</dt><dd><code class="atlas-break">{hash}</code></dd>
          <dt>Script</dt><dd><code class="atlas-break">{s}</code></dd>
        </dl>
      </details>
    </>
  );
}
