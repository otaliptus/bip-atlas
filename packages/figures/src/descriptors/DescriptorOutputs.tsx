import { Arrow, Drawing, KeyGlyph, Value, idsFor } from "../kit";
import type { DerivedDescriptorFixture } from "../types";

/** One published combo() expansion makes the ambiguity of a bare key visible. */
export function DescriptorOutputs({ fixture }: { fixture: DerivedDescriptorFixture }) {
  const d = fixture.derived;
  const key = d.keys[0]?.publicKeys[0];
  const scripts = d.scripts[0];
  if (d.error || d.ranged || d.hasPrivateKeys || d.outline !== "combo(KEY)" || !key || scripts?.length !== 4) {
    throw new Error(`${fixture.id}: descriptor-outputs.v1 needs a public, unranged combo() with four outputs`);
  }
  const forms = [
    { expression: "pk(KEY)", name: "P2PK", prefix: `${scripts[0].slice(0, 2)} `, payload: key.slice(0, 12), suffix: " ac", role: "public" },
    { expression: "pkh(KEY)", name: "P2PKH", prefix: "76 a9 14 ", payload: scripts[1].slice(6, 18), suffix: " 88 ac", role: "hash" },
    { expression: "wpkh(KEY)", name: "P2WPKH", prefix: "00 14 ", payload: scripts[2].slice(4, 16), suffix: "", role: "hash" },
    { expression: "sh(wpkh(KEY))", name: "P2SH-P2WPKH", prefix: "a9 14 ", payload: scripts[3].slice(4, 16), suffix: " 87", role: "hash" },
  ];
  const ids = idsFor("a13-outputs");
  const desc = `One compressed public key, ${key}, can be used in different output scripts. BIP 384's published combo() example produces all four: ${forms.map((f, i) => `${f.expression}, ${f.name}: ${scripts[i]}`).join("; ")}. KEY is a placeholder for that same public key in each expression, not four different keys. A more specific expression selects the script form. These are output scripts, not addresses; their displayed bytes are shortened.`;
  return <>
    <Drawing id="a13-outputs" width={344} height={432} title="One key does not identify one script" desc={desc}>
      <KeyGlyph at={[22, 18]} role="public" scale={1.45} />
      <Value at={[82, 26]} text="THE SAME PUBLIC KEY" size={10} />
      <Value at={[82, 45]} text={`${key.slice(0, 22)}…`} size={11} />
      <Value at={[82, 63]} text="can be used in each of these" size={9.5} cls="k-value--muted" />
      <path class="k-line" d="M31 49 V363" />
      {forms.map((f, i) => {
        const y = 93 + i * 80;
        return <g data-output-form={f.expression}>
          <Arrow d={`M31 ${y + 30} H53`} ids={ids} />
          <path class="k-outline k-fill--plain" d={`M59 ${y} H323 V${y + 61} H59 Z`} />
          <Value at={[71, y + 20]} text={f.expression} size={11} />
          <Value at={[310, y + 20]} text={f.name} size={9.5} anchor="end" cls="k-value--muted" />
          <path class="k-leader" d={`M71 ${y + 29} H311`} />
          <rect class={`k-fill--${f.role}`} x={71 + f.prefix.length * 6} y={y + 35} width="78" height="16" />
          <Value at={[71, y + 47]} text={`${f.prefix}${f.payload}…${f.suffix}`} size={10} />
        </g>;
      })}
      <Value at={[172, 420]} text="THE EXPRESSION SETTLES THE CHOICE" size={10} anchor="middle" />
    </Drawing>
    <details class="atlas-disclosure">
      <summary>The shared key and all four output scripts</summary>
      <dl class="atlas-hexlist">
        <dt>Published combo() descriptor</dt><dd><code class="atlas-break">{fixture.descriptor}</code></dd>
        <dt>Public key used in every expression</dt><dd><code class="atlas-break">{key}</code></dd>
        {forms.map((f, i) => <><dt>{f.expression} · BIP {fixture.source.bip}, line {fixture.scriptLines[i]}</dt><dd><code class="atlas-break">{scripts[i]}</code></dd></>)}
      </dl>
    </details>
  </>;
}
