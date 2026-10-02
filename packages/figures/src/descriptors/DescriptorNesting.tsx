import { Drawing, KeyGlyph, Value } from "../kit";
import type { DerivedDescriptorFixture } from "../types";
import { descTree, shortKey, type DescNode } from "./descTree";
import { hPrime } from "./DescriptorAnatomy";

/** The templates BIPs 381 and 382 give (constants of the BIPs, not data). */
const TEMPLATE: Record<string, [string, string]> = {
  sh: ["P2SH", "OP_HASH160 <20-byte script hash> OP_EQUAL"],
  wpkh: ["P2WPKH", "OP_0 <20-byte key hash>"],
};
const short = (s: string, n: number) => `${s.slice(0, n)}…`;

/**
 * descriptor-nesting.v1 — static. sh(wpkh(KEY)) as boxes inside boxes, read
 * from the outside in: the outer expression's script hashes the inner one's
 * script, which pays to the key. The descriptor, its key and its child-0
 * script come from BIP 382's vector, parsed and expanded at build time.
 */
export function DescriptorNesting({ fixture }: { fixture: DerivedDescriptorFixture }) {
  const d = fixture.derived;
  if (d.error) throw new Error(`${fixture.id}: needs a parsed descriptor`);
  const tree = descTree(d.tokens);
  const levels: Array<Extract<DescNode, { kind: "fn" }>> = [];
  let n: DescNode = tree;
  while (n.kind === "fn") {
    levels.push(n);
    const inner: DescNode | undefined = n.children[0];
    if (!inner) break;
    n = inner;
  }
  if (levels.map((l) => l.name).join("/") !== "sh/wpkh" || n.kind !== "key") throw new Error(`${fixture.id}: descriptor-nesting.v1 draws sh(wpkh(KEY))`);
  const key = n;
  const k = d.keys[key.index];
  const script0 = d.scripts[0][0];
  if (!script0.startsWith("a914") || !script0.endsWith("87")) throw new Error(`${fixture.id}: child 0 is not a P2SH script`);
  const desc =
    `${d.outline}, read from the outside in. sh() makes a P2SH output, OP_HASH160 <20-byte script hash> OP_EQUAL, whose script is the inner one. ` +
    `wpkh() makes a P2WPKH script, OP_0 <20-byte key hash>, for the key ${k.text}${k.derivation ? ` stepped by ${k.derivation}` : ""}. ` +
    `${k.isPrivate ? "The key is an extended private key, so the descriptor is a spending secret. " : ""}Child 0's output script is ${script0}, as BIP ${fixture.source.bip} lists it on line ${fixture.scriptLines[0]}.`;
  const box = (i: number) => ({ x: 14 + i * 16, y: 22 + i * 46, w: 316 - i * 32, h: 128 - i * 62 });
  return (
    <>
      <Drawing id="a13-nest" width={344} height={228} title="Read from the outside in" desc={desc}>
        {levels.map((l, i) => {
          const b = box(i);
          const [kind, tpl] = TEMPLATE[l.name];
          return (
            <g>
              <rect class="k-outline k-fill--plain" x={b.x} y={b.y} width={b.w} height={b.h} />
              <Value at={[b.x + 6, b.y + 14]} text={`${l.name}( )`} size={10.5} cls="k-ds-fn" />
              <Value at={[b.x + b.w - 6, b.y + 14]} text={kind} anchor="end" size={9} cls="k-value--label" />
              <Value at={[b.x + 6, b.y + 28]} text={tpl} size={9} cls="k-value--muted" />
            </g>
          );
        })}
        {(() => {
          const b = box(levels.length);
          let x = b.x;
          return key.parts.map((p) => {
            const text = p.role === "key" ? shortKey(p.text) : hPrime(p.text);
            const w = text.length * 5.7 + 8;
            const at = x;
            x += w;
            return (
              <g>
                <rect class={`k-cell k-fill--${p.role === "key" ? (k.isPrivate ? "secret" : "public") : "plain"}${p.role === "range" ? " k-dashed" : ""}`} x={at} y={b.y - 8} width={w} height="18" />
                <Value at={[at + 4, b.y + 5]} text={text} size={9.5} />
              </g>
            );
          });
        })()}
        <KeyGlyph at={[14, 164]} role={k.isPrivate ? "secret" : "public"} scale={0.8} />
        <Value at={[42, 173]} text={k.isPrivate ? `HOLDS ${k.kind === "xprv" ? "AN XPRV" : "A PRIVATE KEY"}: A SPENDING SECRET` : "PUBLIC KEYS ONLY"} size={9} cls="k-value--label" />
        <Value at={[14, 196]} text={`CHILD 0${k.range === "hardened" ? "′" : ""} OUTPUT SCRIPT · BIP ${fixture.source.bip} LINE ${fixture.scriptLines[0]}`} size={9} cls="k-value--label" />
        <rect class="k-cell k-fill--plain" x="14" y="202" width="316" height="18" />
        <Value at={[19, 215]} text={`a9 14 ${short(script0.slice(4), 16)} 87`} size={9.5} />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Descriptor (BIP {fixture.source.bip} line {fixture.source.line})</dt><dd><code class="atlas-break">{fixture.descriptor}</code></dd>
          {d.scripts.map((s, i) => <><dt>Script, child {i}{k.range === "hardened" ? "h" : ""}</dt><dd><code class="atlas-break">{s[0]}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
