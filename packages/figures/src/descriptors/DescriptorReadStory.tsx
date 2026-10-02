import { Arrow, KeyGlyph, Storyboard, Value, type Frame } from "../kit";
import type { DerivedDescriptorFixture } from "../types";
import { prime, shortKey } from "./descTree";

const short = (s: string, n: number) => `${s.slice(0, n)}…`;

function bar(x: number, y: number, w: number, role: string, text: string, h = 18) {
  return (
    <g>
      <rect class={`k-cell k-fill--${role}`} x={x} y={y} width={w} height={h} />
      <text class="k-value" x={x + 5} y={y + h / 2 + 3.4} style="font-size:9.5px">{text}</text>
    </g>
  );
}

/**
 * descriptor-read-story.v1 — static storyboard (the old worked example).
 * BIP 382's ranged wpkh() descriptor read part by part and expanded: the
 * template, the origin, the key and its range, then one script per child.
 * Keys and scripts from the build-time expansion, checked against the BIP.
 */
export function DescriptorReadStory({ fixture }: { fixture: DerivedDescriptorFixture }) {
  const d = fixture.derived;
  const k = d.keys[0];
  if (d.error || !k || !d.ranged || !d.outline.startsWith("wpkh(") || !k.origin) throw new Error(`${fixture.id}: descriptor-read-story.v1 reads a ranged wpkh() with an origin`);
  const originTok = d.tokens.find((t) => t.key === 0 && t.role === "origin");
  const keyTok = d.tokens.find((t) => t.key === 0 && t.role === "key");
  if (!originTok || !keyTok) throw new Error(`${fixture.id}: no origin or key token`);
  const origin = prime(originTok.text.slice(1, -1));
  const scripts = d.scripts.map((s) => s[0]);
  if (!scripts.every((s) => s.startsWith("0014") && s.length === 44)) throw new Error(`${fixture.id}: scripts are not P2WPKH`);
  const frames: Frame[] = [
    {
      note: "wpkh() fixes the shape of every script: OP_0, then a key’s 20-byte hash.",
      desc: "The script expression wpkh() produces the template OP_0 <KEY_hash160>: a version 0 witness program holding the HASH160 of one compressed key.",
      draw: () => (
        <>
          <Value at={[14, 20]} text="wpkh( KEY )" size={12} cls="k-ds-fn" />
          {bar(14, 40, 60, "plain", "OP_0")}
          {bar(74, 40, 212, "hash", "<KEY_hash160> · 20 B")}
          <Value at={[14, 82]} text="SEGWIT V0 · ONE KEY" size={9} cls="k-value--label" />
        </>
      ),
    },
    {
      note: `The origin [${origin}] says where the key came from. It adds nothing to the script.`,
      desc: `The key origin is [${origin}]: the fingerprint ${origin.split("/")[0]} of the key where derivation began, and the steps taken from it. It is information about the key and changes no script.`,
      draw: () => (
        <>
          {bar(14, 20, 120, "hash", `[${origin}]`)}
          <Value at={[14, 56]} text={`FINGERPRINT ${origin.split("/")[0]}`} size={9} cls="k-value--label" />
          <Value at={[14, 70]} text={`STEPS ${origin.slice(origin.indexOf("/"))}`} size={9} cls="k-value--label" />
          <Value at={[14, 96]} text="FOR SOFTWARE THAT HOLDS THE ROOT KEY" size={9} cls="k-value--muted" />
        </>
      ),
    },
    {
      note: `The key is an xpub; ${prime(k.derivation ?? "")} steps down from it, and the final * stands for every child index.`,
      desc: `The key ${k.text} is an extended public key. ${k.derivation} derives below it; the range /* gives one public key per child index. Children 0 to ${k.publicKeys.length - 1}: ${k.publicKeys.join(", ")}.`,
      draw: (ids) => (
        <>
          <KeyGlyph at={[14, 10]} role="public" scale={0.8} />
          <Value at={[42, 19]} text={`${shortKey(keyTok.text)} ${prime(k.derivation ?? "")}`} size={9.5} />
          {k.publicKeys.map((p, i) => (
            <g>
              <Arrow d={`M24 28 V${46 + i * 26} H44`} ids={ids} />
              {bar(48, 38 + i * 26, 238, "public", `child ${i}  ${short(p, 12)}`)}
            </g>
          ))}
        </>
      ),
    },
    {
      note: `Each child key fills the template: one script per child, as BIP 382 lists them (lines ${fixture.scriptLines.join(", ")}).`,
      desc: `The scripts for children 0 to ${scripts.length - 1}: ${scripts.join(", ")}, each OP_0 followed by the 20-byte HASH160 of that child's key, matching BIP 382 lines ${fixture.scriptLines.join(", ")}.`,
      draw: () => (
        <>
          {scripts.map((s, i) => (
            <g>
              <Value at={[14, 26 + i * 28]} text={`/${i}`} size={9.5} cls="k-value--muted" />
              {bar(36, 13 + i * 28, 40, "plain", "00 14")}
              {bar(76, 13 + i * 28, 210, "hash", short(s.slice(4), 14))}
            </g>
          ))}
          <Value at={[36, 112]} text="… AND EVERY LATER CHILD" size={9} cls="k-value--muted" />
        </>
      ),
    },
  ];
  return (
    <>
      <Storyboard id="a13-read" title="Reading and expanding a ranged descriptor" width={300} height={122} frames={frames} />
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Descriptor (BIP 382 line {fixture.source.line})</dt><dd><code class="atlas-break">{fixture.descriptor}</code></dd>
          {k.publicKeys.map((p, i) => <><dt>Public key, child {i}</dt><dd><code class="atlas-break">{p}</code></dd></>)}
          {scripts.map((s, i) => <><dt>Script, child {i} (line {fixture.scriptLines[i]})</dt><dd><code class="atlas-break">{s}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
