import type { ComponentChildren } from "preact";
import { Drawing, KeyGlyph, Responsive, Value, idsFor } from "../kit";
import type { DerivedDescriptorFixture, DescriptorKeyView } from "../types";
import { allStates, layer, stateKey, type HeroSpec, type HeroState } from "../heroLayers";
import { descTree, prime, shortKey, type DescNode } from "./descTree";

const CH = 5.7; // width of one character at 9.5 units
const ROW = 20, HEAD = 15, PAD = 6, IND = 9;
const KIND: Record<string, string> = {
  "hex-compressed": "hex public key",
  "hex-uncompressed": "hex public key, uncompressed",
  xonly: "x-only public key",
  wif: "WIF private key",
  xpub: "extended public key",
  xprv: "extended private key",
};
/** The order BIP 384 and the model give combo()'s scripts in. */
const COMBO = ["P2PK", "P2PKH", "P2WPKH", "P2SH-P2WPKH"];
const VERDICT: Record<string, string> = {
  valid: "MATCHES THE WRITTEN CHECKSUM",
  "no-checksum": "COMPUTED HERE · NONE WRITTEN, WHICH IS ALLOWED",
  mismatch: "DOES NOT MATCH: REJECTED",
  "bad-length": "NOT 8 CHARACTERS: REJECTED",
  "bad-charset": "OUTSIDE THE CHARACTER SET: REJECTED",
};
const short = (s: string, n = 12) => (s.length > n + 2 ? `${s.slice(0, n)}…` : s);
/** Derive writes hardened steps with h; the drawings print a prime, as the rest of the book does. */
export const hPrime = (s: string) => s.replace(/h/g, "′").replace(/'/g, "′");
/** Split "[fingerprint/steps]" so only the fingerprint is coloured as a hash. */
export function splitOrigin(text: string): [string, string] {
  const at = text.indexOf("/");
  return at < 0 ? [text, ""] : [text.slice(0, at), text.slice(at)];
}
const childTag = (k: DescriptorKeyView | undefined, i: number) => `${i}${k?.range === "hardened" ? "′" : ""}`;

interface Laid { h: number; draw: (x: number, y: number) => ComponentChildren; /** Width of a leaf (keys, numbers, text). */ wid?: number }

/** The status line for one descriptor, highlighted key and checksum state. */
export function descriptorStatus(f: DerivedDescriptorFixture, key: number, checked: boolean): string {
  const d = f.derived;
  return (
    `${f.label}. ` +
    (d.error ? `It does not parse: ${d.error}.` : `${d.outline}, ${d.keys.length} key${d.keys.length === 1 ? "" : "s"}${d.ranged ? ", ranged: one script per child index" : ""}.${d.hasPrivateKeys ? " It holds a private key." : ""}${d.keys.length > 1 ? ` Key ${key + 1} is highlighted.` : ""}`) +
    (checked ? ` Checksum: computed #${d.checksumComputed}, ${d.checksumGiven === null ? "none written" : `written #${d.checksumGiven}`}, ${d.checksumVerdict === "valid" ? "they match" : d.checksumVerdict === "no-checksum" ? "nothing to compare" : "rejected"}.` : "")
  );
}

/** Controls, initial state and every status line of the hero (see heroLayers.ts). */
export function descriptorSpec(fixtures: DerivedDescriptorFixture[], figureId: string, initial?: HeroState): HeroSpec {
  const keys = ["desc", "key", "check"];
  const start = initial ?? { desc: fixtures[0].id, key: "0", check: "1" };
  const status: Record<string, string> = {};
  for (const f of fixtures) for (const st of allStates(["key", "check"], { key: (f.derived.keys.length ? f.derived.keys : [null]).map((_, i) => String(i)), check: ["0", "1"] })) {
    status[stateKey(keys, { desc: f.id, ...st })] = descriptorStatus(f, +st.key, st.check === "1");
  }
  const f = fixtures.find((x) => x.id === start.desc)!;
  return {
    figureId,
    keys,
    initial: start,
    controls: [
      { kind: "strip", key: "desc", label: "Published descriptor", options: fixtures.map((x) => ({ value: x.id, text: x.shortLabel ?? x.label })) },
      { kind: "strip", key: "key", label: "Highlight a key", options: fixtures.flatMap((x) => x.derived.keys.map((_, i) => ({ value: String(i), text: `key ${i + 1}`, when: `desc=${x.id}` }))) },
      { kind: "toggle", key: "check", label: "Check the descriptor checksum", off: "Check the checksum", on: "Hide the checksum check" },
    ],
    resets: { desc: { key: "0" } },
    status,
    staticNote: `Static view: ${f.label}, with its checksum ${f.derived.checksumGiven === null ? "computed (none is written)" : "checked"}. With JavaScript you can pick any of ${fixtures.length} published descriptors, highlight each key and check each checksum.`,
    source: "Published descriptors from BIPs 380–386, parsed and expanded at build time by the tested descriptor model; every script the BIPs list for them matches.",
  };
}

/**
 * descriptor-anatomy.v1 — the Descriptors chapter's hero (drawing-first, layered).
 *
 * A published descriptor drawn as nested boxes, one per script expression
 * (and one per script tree), with each key split into origin, key,
 * derivation and range. Beside it, the output scripts it stands for. Rendered
 * on the server, one layer per descriptor; the highlighted key follows the
 * state through CSS (data-s-key), the checksum check and key panel are
 * layers. Everything was parsed, expanded and checked at build time.
 */
export function DescriptorAnatomy({ fixtures, figureId, initial, only = false }: { fixtures: DerivedDescriptorFixture[]; figureId: string; initial?: HeroState; only?: boolean }) {
  const init = descriptorSpec(fixtures, figureId, initial).initial;
  return (
    <>
      {fixtures.map((f) => {
        if (only && f.id !== init.desc) return null;
        return (
          <div {...layer(`desc=${f.id}`, init)}>
            <Responsive wide={anatomyDrawing(f, `${figureId}-${f.id}-w`, true, init, only)} narrow={anatomyDrawing(f, `${figureId}-${f.id}-n`, false, init, only)} />
          </div>
        );
      })}
    </>
  );
}

/** Exact values: one layer per descriptor. */
export function DescriptorValues({ fixtures, initial, only = false }: { fixtures: DerivedDescriptorFixture[]; initial?: HeroState; only?: boolean }) {
  const init = descriptorSpec(fixtures, "", initial).initial;
  return (
    <>
      {fixtures.map((f) => {
        if (only && f.id !== init.desc) return null;
        const d = f.derived;
        return (
          <details class="atlas-disclosure" {...layer(`desc=${f.id}`, init)}>
            <summary>Exact values for this descriptor</summary>
            <dl class="atlas-hexlist atlas-hexlist--case">
              <dt>Descriptor (BIP {f.source.bip} line {f.source.line})</dt><dd><code class="atlas-break">{f.descriptor}</code></dd>
              <dt>Checksum computed</dt><dd><code>#{d.checksumComputed}</code></dd>
              {d.keys.map((k, ki) => (
                <>
                  <dt>Key {ki + 1}</dt><dd><code class="atlas-break">{k.text}</code></dd>
                  {k.publicKeys.map((p, i) => <><dt>{k.xonly ? "X-only public key" : "Public key"}{k.range ? `, child ${childTag(k, i)}` : ""}</dt><dd><code class="atlas-break">{p}</code></dd></>)}
                </>
              ))}
              {d.scripts.map((list, i) => list.map((s, j) => <><dt>{d.ranged ? `Script, child ${childTag(d.keys[0], i)}` : list.length > 1 ? `Script ${j + 1}${list.length === 4 || list.length === 2 ? ` (${COMBO[j]})` : ""}` : "Script"}</dt><dd><code class="atlas-break">{s}</code></dd></>))}
            </dl>
          </details>
        );
      })}
    </>
  );
}

function anatomyDrawing(f: DerivedDescriptorFixture, gid: string, wide: boolean, init: HeroState, only: boolean) {
  const d = f.derived;
  const ids = idsFor(gid);
  const tree = d.error ? null : descTree(d.tokens);
  /** Lay out a node at a given width; returns its height and a drawing function. */
  const lay = (n: DescNode, w: number, depth = 0): Laid => {
    if (n.kind === "key") {
      const kv = d.keys[n.index];
      const segs = n.parts.flatMap((p) => {
        if (p.role === "origin") {
          const [fp, steps] = splitOrigin(p.text);
          return [{ role: "fingerprint", show: fp }, ...(steps ? [{ role: "path", show: hPrime(steps) }] : [])];
        }
        return [{ role: p.role, show: p.role === "key" ? shortKey(p.text) : hPrime(p.text) }];
      });
      return {
        h: ROW,
        wid: segs.reduce((a, sg) => a + sg.show.length * CH + 8, 0),
        draw: (x, y) => {
          let cx = x;
          return (
            <g class="k-ds-key" data-key={n.index}>
              {segs.map((s) => {
                const sw = s.show.length * CH + 8;
                const role = s.role === "fingerprint" ? "hash" : s.role === "key" ? (kv.isPrivate ? "secret" : "public") : "plain";
                const at = cx;
                cx += sw;
                return (
                  <g>
                    <rect class={`k-cell k-fill--${role}${s.role === "range" ? " k-dashed" : ""}`} x={at} y={y} width={sw} height={ROW - 4} />
                    <Value at={[at + 4, y + 11.5]} text={s.show} size={9.5} />
                  </g>
                );
              })}
            </g>
          );
        },
      };
    }
    if (n.kind === "num" || n.kind === "text") {
      const show = short(n.text, 14);
      return { h: ROW, wid: show.length * CH + 8, draw: (x, y) => <g><rect class="k-cell k-fill--plain" x={x} y={y} width={show.length * CH + 8} height={ROW - 4} /><Value at={[x + 4, y + 11.5]} text={show} size={9.5} /></g> };
    }
    const kids = n.children.map((c) => lay(c, w - 2 * IND, n.kind === "tree" ? depth + 1 : depth));
    const label = n.kind === "fn" ? `${n.name}( )` : depth === 0 ? "{ } SCRIPT TREE" : "{ } BRANCH";
    // A function whose arguments are all leaves and fit on one line is drawn on one line: pk( KEY ).
    const nameW = n.kind === "fn" ? (n.name.length + 3) * CH + 8 : 0;
    const inlineW = kids.reduce((a, c) => a + (c.wid ?? Infinity) + 4, 0);
    if (n.kind === "fn" && nameW + inlineW + 8 <= w) {
      return {
        h: ROW + 8,
        draw: (x, y) => {
          let cx = x + nameW;
          return (
            <g>
              <rect class="k-outline k-fill--plain" x={x} y={y} width={w} height={ROW + 4} />
              <Value at={[x + 5, y + 16]} text={label} size={9.5} cls="k-ds-fn" />
              {kids.map((c) => {
                const at = cx;
                cx += (c.wid ?? 0) + 4;
                return c.draw(at, y + 4);
              })}
            </g>
          );
        },
      };
    }
    const h = HEAD + kids.reduce((a, c) => a + c.h, 0) + PAD;
    return {
      h,
      draw: (x, y) => {
        let cy = y + HEAD;
        return (
          <g>
            <rect class={`k-outline k-fill--plain${n.kind === "tree" ? " k-dashed" : ""}`} x={x} y={y} width={w} height={h - 2} />
            <Value at={[x + 5, y + 11]} text={label} size={9.5} cls={n.kind === "fn" ? "k-ds-fn" : "k-value--label"} />
            {kids.map((c) => {
              const at = cy;
              cy += c.h;
              return c.draw(x + IND, at);
            })}
          </g>
        );
      },
    };
  };

  const left = { x: 8, w: wide ? 380 : 314 };
  const laid = tree ? lay(tree, left.w) : null;
  const boxTop = 30;
  const boxH = laid ? laid.h : 40;
  const csY = boxTop + boxH + 14;
  const csH = 58;
  const right = wide ? { x: 404, y: 30, w: 226 } : { x: 8, y: csY + csH + 14, w: 314 };
  const rows: Array<{ y: number; tag: string; script: string }> = [];
  let sy = right.y + 20;
  d.scripts.forEach((list, i) => {
    list.forEach((script, j) => {
      rows.push({ y: sy, tag: d.ranged ? `/${childTag(d.keys[0], i)}` : list.length > 1 ? COMBO[j] ?? String(j + 1) : "", script });
      sy += 20;
    });
    sy += 4;
  });
  const tagW = rows.some((r) => r.tag.length > 3) ? 76 : 26;
  const ky = d.error ? right.y + 44 : sy + (d.ranged ? 28 : 10);
  const keyH = d.keys.length ? 64 + Math.max(...d.keys.map((k) => k.publicKeys.length)) * 14 : 0;
  const W = wide ? 640 : 330;
  const H = Math.max(csY + csH, ky + keyH) + 10;
  const flag = d.hasPrivateKeys ? "HOLDS A PRIVATE KEY: A SPENDING SECRET" : d.keys.length ? "PUBLIC KEYS ONLY: REVEALS SCRIPTS, CANNOT SPEND" : "NO KEYS IN THIS DESCRIPTOR";
  const desc =
    `${d.body}${d.checksumGiven !== null ? `#${d.checksumGiven}` : ""}, from BIP ${f.source.bip} line ${f.source.line}. ` +
    (d.error ? `It does not parse: ${d.error}.` : `It reads ${d.outline}: ${d.keys.map((k, i) => `key ${i + 1} is ${k.xonly ? "used x-only, " : ""}a ${KIND[k.kind]}${k.origin ? ` with origin [${k.origin}]` : ""}${k.derivation ? `, then ${k.derivation}` : ""}`).join("; ")}. It stands for ${rows.length} output script${rows.length === 1 ? "" : "s"}${d.ranged ? " (the first children; the range continues)" : ""}.`) +
    ` The checksum computed from the text is #${d.checksumComputed}: ${VERDICT[d.checksumVerdict].toLowerCase()}.`;
  return (
    <Drawing id={gid} width={W} height={H} title="Reading a descriptor" desc={desc}>
      {d.keys.length ? <KeyGlyph at={[8, 6]} role={d.hasPrivateKeys ? "secret" : "public"} scale={0.7} /> : null}
      <Value at={[d.keys.length ? 36 : 8, 15]} text={flag} size={9} cls="k-value--label" />
      {d.ranged && wide ? <Value at={[404, 15]} text="RANGED: ONE SCRIPT PER CHILD" size={9} cls="k-value--label" /> : null}
      {laid ? (
        laid.draw(left.x, boxTop)
      ) : (
        <>
          <rect class="k-outline k-fill--plain" x={left.x} y={boxTop} width={left.w} height="34" />
          <Value at={[left.x + 8, boxTop + 15]} text={short(d.body, 40)} size={9.5} />
          <Value at={[left.x + 8, boxTop + 28]} text="✕ REJECTED: DOES NOT PARSE" size={9} cls="k-value--label" />
        </>
      )}
      {/* Checksum: the written one; the check is a layer. */}
      <Value at={[left.x, csY + 12]} text="#" size={11} />
      {d.checksumGiven !== null ? (
        [...d.checksumGiven].map((c, i) => (
          <g>
            <rect class="k-cell k-fill--check" x={left.x + 12 + i * 15} y={csY} width="15" height="17" />
            <Value at={[left.x + 19.5 + i * 15, csY + 12]} text={c} anchor="middle" size={9.5} />
          </g>
        ))
      ) : (
        <rect class="k-outline k-dashed" x={left.x + 12} y={csY} width="120" height="17" fill="none" />
      )}
      <Value at={[left.x + 142, csY + 12]} text={d.checksumGiven !== null ? "WRITTEN CHECKSUM" : "NO CHECKSUM WRITTEN"} size={9} cls="k-value--label" />
      {only && init.check !== "1" ? null : (
        <g {...layer("check=1", init)}>
          <Value at={[left.x, csY + 34]} text={`${d.symbolCount} SYMBOLS → POLYMOD → #${d.checksumComputed}`} size={9} cls="k-value--check" />
          <Value at={[left.x, csY + 50]} text={VERDICT[d.checksumVerdict]} size={9} cls="k-value--label" />
        </g>
      )}
      {/* Scripts */}
      <Value at={[right.x, right.y + 10]} text="OUTPUT SCRIPTS" size={9} cls="k-value--label" />
      {d.error ? (
        <Value at={[right.x, right.y + 30]} text="NONE: THE DESCRIPTOR IS REJECTED" size={9} cls="k-value--muted" />
      ) : (
        <>
          {rows.map((r) => (
            <g>
              <Value at={[right.x, r.y + 12]} text={r.tag} size={9} cls="k-value--muted" />
              <rect class="k-cell k-fill--plain" x={right.x + tagW} y={r.y} width={right.w - tagW} height="16" />
              <Value at={[right.x + tagW + 4, r.y + 11.5]} text={short(r.script, tagW > 30 ? 16 : 20)} size={9} />
            </g>
          ))}
          {d.ranged ? <Value at={[right.x + tagW, sy + 8]} text="… AND EVERY LATER CHILD" size={9} cls="k-value--muted" /> : null}
        </>
      )}
      {/* The highlighted key, one layer per key. */}
      {d.keys.map((k, i) => {
        if (only && String(i) !== init.key) return null;
        const pk = (p: string) => (k.xonly ? `x-only ${short(p, 10)}` : `public key ${short(p, 10)}`);
        return (
          <g class="k-ds-keypanel" {...layer(`key=${i}`, init)}>
            <Value at={[right.x, ky + 10]} text={`KEY ${i + 1} OF ${d.keys.length} · ${KIND[k.kind].toUpperCase()}${tree && tree.kind === "fn" && tree.name === "tr" && i === 0 ? " · INTERNAL KEY" : ""}`} size={9} cls="k-value--label" />
            <Value at={[right.x, ky + 24]} text={`origin ${k.origin ? `[${hPrime(k.origin)}]` : "none"}`} size={9} />
            <Value at={[right.x, ky + 38]} text={`after the key ${k.derivation ? hPrime(k.derivation) : "none"}`} size={9} />
            {k.publicKeys.map((p, j) => <Value at={[right.x, ky + 52 + j * 14]} text={`${k.range ? `child ${childTag(k, j)} ` : ""}${pk(p)}`} size={9} />)}
            {k.isPrivate ? <Value at={[right.x, ky + 52 + k.publicKeys.length * 14]} text="PRIVATE: WHOEVER HAS THIS CAN SPEND" size={9} cls="k-value--label" /> : null}
          </g>
        );
      })}
    </Drawing>
  );
}
