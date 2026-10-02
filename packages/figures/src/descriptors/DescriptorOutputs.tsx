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
  // Each script splits into opcode bytes, the pushed key or hash, and closing opcodes.
  // Only the prefix length is structural; the payload length is the script's own push byte.
  const forms = [
    { expression: "pk(KEY)", name: "P2PK", prefixBytes: 1, role: "public" },
    { expression: "pkh(KEY)", name: "P2PKH", prefixBytes: 3, role: "hash" },
    { expression: "wpkh(KEY)", name: "P2WPKH", prefixBytes: 2, role: "hash" },
    { expression: "sh(wpkh(KEY))", name: "P2SH-P2WPKH", prefixBytes: 2, role: "hash" },
  ].map((f, i) => ({ ...f, ...splitScript(scripts[i], f.prefixBytes, fixture.id) }));
  if (forms[0].payload !== key || forms[1].payload !== forms[2].payload) {
    throw new Error(`${fixture.id}: combo() scripts do not push the shared key and its hash`);
  }
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
        const shown = `${spaced(f.prefix)} `;
        return <g data-output-form={f.expression} data-script-prefix={f.prefix} data-script-payload={f.payload} data-script-suffix={f.suffix}>
          <Arrow d={`M31 ${y + 30} H53`} ids={ids} />
          <path class="k-outline k-fill--plain" d={`M59 ${y} H323 V${y + 61} H59 Z`} />
          <Value at={[71, y + 20]} text={f.expression} size={11} />
          <Value at={[310, y + 20]} text={f.name} size={9.5} anchor="end" cls="k-value--muted" />
          <path class="k-leader" d={`M71 ${y + 29} H311`} />
          <rect class={`k-fill--${f.role}`} x={71 + shown.length * 6} y={y + 35} width="78" height="16" />
          <Value at={[71, y + 47]} text={`${shown}${f.payload.slice(0, 12)}…${f.suffix ? ` ${spaced(f.suffix)}` : ""}`} size={10} />
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

/** Hex bytes separated by spaces, as drawn. */
const spaced = (hex: string) => hex.match(/../g)?.join(" ") ?? "";

/** Prefix opcodes (ending in a direct push), the pushed bytes, and what follows, all sliced from the script. */
export function splitScript(script: string, prefixBytes: number, id: string) {
  const prefix = script.slice(0, prefixBytes * 2);
  const push = parseInt(prefix.slice(-2), 16);
  if (prefix.length !== prefixBytes * 2 || !(push >= 1 && push <= 75) || script.length < (prefixBytes + push) * 2) {
    throw new Error(`${id}: script ${script} does not end its prefix with a direct push`);
  }
  const payload = script.slice(prefix.length, prefix.length + push * 2);
  const suffix = script.slice(prefix.length + push * 2);
  return { prefix, payload, suffix };
}
