import { Arrow, Drawing, Value, idsFor } from "../kit";
import type { DerivedDescriptorFixture } from "../types";

const short = (s: string, n: number) => `${s.slice(0, n)}…`;

/** The descriptor as written (apostrophe or h kept), split at its origin and key from the build-time parse. */
function spelled(f: DerivedDescriptorFixture) {
  const k = f.derived.keys[0];
  const toks = f.derived.tokens;
  const origin = toks.find((t) => t.key === 0 && t.role === "origin");
  const key = toks.find((t) => t.key === 0 && t.role === "key");
  if (!k || !origin || !key) throw new Error(`${f.id}: needs a key with an origin`);
  const at = f.descriptor.indexOf(origin.text + key.text);
  if (at < 0) throw new Error(`${f.id}: origin and key not found in the descriptor`);
  return { before: f.descriptor.slice(0, at), origin: origin.text, key: short(key.text, 8), after: f.descriptor.slice(at + origin.text.length + key.text.length), isPrivate: k.isPrivate };
}

/**
 * descriptor-spellings.v1 — static. Three ways BIP 381 writes the same pkh()
 * descriptor: hardened steps with ' or with h, and the key as WIF or as its
 * public key. All three expand to one and the same script; the build checks
 * each against the script BIP 381 lists, and this figure throws unless the
 * three scripts are equal.
 */
export function DescriptorSpellings({ fixtures }: { fixtures: DerivedDescriptorFixture[] }) {
  if (fixtures.length < 2) throw new Error("descriptor-spellings.v1 compares at least two spellings");
  const script = fixtures[0].derived.scripts[0]?.[0];
  if (!script || !fixtures.every((f) => !f.derived.error && f.derived.scripts[0]?.[0] === script)) throw new Error("descriptor-spellings.v1: the spellings must give one script");
  const ids = idsFor("a13-spell");
  const rows = fixtures.map(spelled);
  const cx = 8;
  const desc =
    `${fixtures.length} descriptors from BIP 381: ${fixtures.map((f) => `${f.descriptor} (line ${f.source.line})`).join("; ")}. ` +
    `They differ in how a hardened step is marked (' or h) and in whether the key is written as a WIF private key or as its public key. All produce the same script, ${script}.`;
  return (
    <>
      <Drawing id="a13-spell" width={344} height={70 + rows.length * 34 + 40} title="Three spellings, one script" desc={desc}>
        {rows.map((r, i) => {
          const y = 14 + i * 34;
          const w1 = r.before.length * 5.7;
          const wo = r.origin.length * 5.7 + 8;
          const w2 = r.key.length * 5.7 + 8;
          return (
            <g>
              <Value at={[cx, y + 13]} text={r.before} size={9.5} />
              <rect class="k-cell k-fill--hash" x={cx + w1 + 1} y={y} width={wo} height="18" />
              <Value at={[cx + w1 + 5, y + 13]} text={r.origin} size={9.5} />
              <rect class={`k-cell k-fill--${r.isPrivate ? "secret" : "public"}`} x={cx + w1 + wo + 1} y={y} width={w2} height="18" />
              <Value at={[cx + w1 + wo + 5, y + 13]} text={r.key} size={9.5} />
              <Value at={[cx + w1 + wo + w2 + 3, y + 13]} text={r.after} size={9.5} />
              <Value at={[336, y + 13]} text={`L${fixtures[i].source.line}`} anchor="end" size={9} cls="k-value--muted" />
              <Value at={[cx, y + 27]} text={`ORIGIN AS WRITTEN · ${r.isPrivate ? "WIF PRIVATE KEY" : "PUBLIC KEY"}`} size={9} cls="k-value--label" />
            </g>
          );
        })}
        <Arrow d={`M172 ${14 + rows.length * 34 - 2} V${14 + rows.length * 34 + 14}`} ids={ids} />
        <rect class="k-cell k-fill--plain k-cell--em" x="8" y={14 + rows.length * 34 + 18} width="328" height="22" />
        <Value at={[14, 14 + rows.length * 34 + 33]} text={`ONE SCRIPT · ${short(script, 26)}`} size={9.5} />
        <Value at={[8, 14 + rows.length * 34 + 58]} text="' AND h BOTH MARK A HARDENED STEP · THE ORIGIN ADDS NO BYTES" size={9} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {fixtures.map((f) => <><dt>BIP 381 line {f.source.line}</dt><dd><code class="atlas-break">{f.descriptor}</code></dd></>)}
          <dt>Script (each)</dt><dd><code class="atlas-break">{script}</code></dd>
        </dl>
      </details>
    </>
  );
}
