import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { holdFocus } from "../focus";
import { Drawing, KeyGlyph, Responsive, Value, idsFor } from "../kit";
import type { DerivedDescriptorFixture } from "../types";
import { descTree, prime, shortKey, type DescNode } from "./descTree";

interface Props {
  fixtures: DerivedDescriptorFixture[];
  figureId: string;
  /** Starting state; the no-JS render uses it too. */
  initial?: { fixtureId: string; key: number; checked: boolean };
}

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
const short = (s: string, n = 12) => (s.length > n + 2 ? `${s.slice(0, n)}…` : s);

interface Laid { h: number; draw: (x: number, y: number) => ComponentChildren; /** Width of a leaf (keys, numbers, text). */ wid?: number }

/**
 * descriptor-anatomy.v1 — the Descriptors chapter's hero (drawing-first).
 *
 * A published descriptor drawn as nested boxes, one per script expression
 * (and one per script tree), with each key split into origin, key,
 * derivation and range. Beside it, the output scripts it stands for. Strips
 * pick the descriptor and the key; a button checks the checksum. Everything
 * was parsed, expanded and checked against the BIPs at build time.
 */
export function DescriptorAnatomy({ fixtures, figureId, initial }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const start = initial ?? { fixtureId: fixtures[0].id, key: 0, checked: false };
  const [id, setId] = useState(start.fixtureId);
  const f = fixtures.find((x) => x.id === id);
  if (!f) throw new Error(`descriptor-anatomy.v1: no fixture ${id}`);
  const d = f.derived;
  const [keySel, setKeySel] = useState(start.key);
  const [checked, setChecked] = useState(start.checked);
  const k = d.keys[Math.min(keySel, d.keys.length - 1)] ?? null;
  const kIndex = k ? d.keys.indexOf(k) : -1;
  const showCheck = hydrated ? checked : true;
  const choose = (x: string) => (setId(x), setKeySel(0), setChecked(false));
  const tree = d.error ? null : descTree(d.tokens);

  const verdictText: Record<string, string> = {
    valid: "MATCHES THE WRITTEN CHECKSUM",
    "no-checksum": "NONE WRITTEN: OPTIONAL FOR PARSING",
    mismatch: "DOES NOT MATCH: REJECTED",
    "bad-length": "NOT 8 CHARACTERS: REJECTED",
    "bad-charset": "OUTSIDE THE CHARACTER SET: REJECTED",
  };
  const flag = d.hasPrivateKeys ? "HOLDS A PRIVATE KEY: A SPENDING SECRET" : d.keys.length ? "PUBLIC KEYS ONLY: REVEALS SCRIPTS, CANNOT SPEND" : "NO KEYS";
  const status =
    `${f.label}. ` +
    (d.error ? `It does not parse: ${d.error}.` : `${d.outline}, ${d.keys.length} key${d.keys.length === 1 ? "" : "s"}${d.ranged ? ", ranged: one script per child index" : ""}. ${d.hasPrivateKeys ? "It holds a private key." : ""}`) +
    (showCheck ? ` Checksum: computed #${d.checksumComputed}, ${d.checksumGiven === null ? "none written" : `written #${d.checksumGiven}`}, ${d.checksumVerdict === "valid" ? "they match" : d.checksumVerdict === "no-checksum" ? "nothing to compare" : "rejected"}.` : "");

  /** Lay out a node at a given width; returns its height and a drawing function. */
  const lay = (n: DescNode, w: number): Laid => {
    if (n.kind === "key") {
      const desc = d.keys[n.index];
      const segs = n.parts.map((p) => ({ ...p, show: p.role === "key" ? shortKey(p.text) : prime(p.text) }));
      const em = n.index === kIndex;
      return {
        h: ROW,
        wid: segs.reduce((a, sg) => a + sg.show.length * CH + 8, 0),
        draw: (x, y) => {
          let cx = x;
          return (
            <g class="k-ds-key" data-key={n.index}>
              {segs.map((s) => {
                const sw = s.show.length * CH + 8;
                const role = s.role === "origin" ? "hash" : s.role === "key" ? (desc.isPrivate ? "secret" : "public") : "plain";
                const at = cx;
                cx += sw;
                return (
                  <g>
                    <rect class={`k-cell k-fill--${role}${em ? " k-cell--em" : ""}${s.role === "range" ? " k-dashed" : ""}`} x={at} y={y} width={sw} height={ROW - 4} />
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
    const kids = n.children.map((c) => lay(c, w - 2 * IND));
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
              <Value at={[x + 5, y + 16]} text={`${n.name}( )`} size={9.5} cls="k-ds-fn" />
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
            <Value at={[x + 5, y + 11]} text={n.kind === "fn" ? `${n.name}( )` : "{ } SCRIPT TREE"} size={9.5} cls={n.kind === "fn" ? "k-ds-fn" : "k-value--label"} />
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

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const gid = `${figureId}-${w}`;
    const ids = idsFor(gid);
    const left = { x: 8, w: wide ? 380 : 314 };
    const laid = tree ? lay(tree, left.w) : null;
    const boxTop = 30;
    const boxH = laid ? laid.h : 40;
    const csY = boxTop + boxH + 14;
    const csH = showCheck ? 58 : 26;
    const right = wide ? { x: 404, y: 30, w: 226 } : { x: 8, y: csY + csH + 14, w: 314 };
    const scripts = d.scripts;
    const keyH = k ? 34 + k.publicKeys.length * 14 + (k.isPrivate ? 14 : 0) : 0;
    const W = wide ? 640 : 330;
    // One row per script, a small gap between children.
    const rows: Array<{ y: number; tag: string; script: string }> = [];
    let sy = right.y + 20;
    scripts.forEach((list, i) => {
      list.forEach((script, j) => {
        rows.push({ y: sy, tag: d.ranged ? `/${i}` : list.length > 1 ? `${j + 1}` : "", script });
        sy += 20;
      });
      sy += 4;
    });
    const rowsEnd = sy;
    const ky = d.error ? right.y + 44 : rowsEnd + (d.ranged ? 28 : 10);
    const H = Math.max(csY + csH, ky + keyH) + 10;
    return (
      <Drawing id={gid} width={W} height={H} title="Reading a descriptor" desc={`${d.body}${d.checksumGiven !== null ? `#${d.checksumGiven}` : ""}. ${status}`}>
        <KeyGlyph at={[8, 6]} role={d.hasPrivateKeys ? "secret" : "public"} scale={0.7} />
        <Value at={[36, 15]} text={flag} size={9} cls="k-value--label" />
        {d.ranged && wide ? <Value at={[404, 15]} text="RANGED: ONE SCRIPT PER CHILD" size={9} cls="k-value--label" /> : null}
        {laid ? (
          laid.draw(left.x, boxTop)
        ) : (
          <>
            <rect class="k-outline" x={left.x} y={boxTop} width={left.w} height="34" style={`fill:${ids.hatch}`} />
            <rect class="k-hd-chip" x={left.x + 4} y={boxTop + 6} width={Math.min(left.w - 8, d.body.length * CH + 8)} height="22" />
            <Value at={[left.x + 8, boxTop + 21]} text={short(d.body, 40)} size={9.5} />
          </>
        )}
        {/* Checksum */}
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
        {showCheck ? (
          <>
            <Value at={[left.x, csY + 34]} text={`${d.symbolCount} SYMBOLS → POLYMOD → #${d.checksumComputed}`} size={9} cls="k-value--check" />
            <Value at={[left.x, csY + 50]} text={verdictText[d.checksumVerdict]} size={9} cls="k-value--label" />
          </>
        ) : null}
        {/* Scripts and the highlighted key */}
        <Value at={[right.x, right.y + 10]} text="OUTPUT SCRIPTS" size={9} cls="k-value--label" />
        {d.error ? (
          <Value at={[right.x, right.y + 30]} text="NONE: THE DESCRIPTOR IS REJECTED" size={9} cls="k-value--muted" />
        ) : (
          <>
            {rows.map((r) => (
              <g>
                <Value at={[right.x, r.y + 12]} text={r.tag} size={9} cls="k-value--muted" />
                <rect class="k-cell k-fill--plain" x={right.x + 22} y={r.y} width={right.w - 22} height="16" />
                <Value at={[right.x + 26, r.y + 11.5]} text={short(r.script, 20)} size={9} />
              </g>
            ))}
            {d.ranged ? <Value at={[right.x + 22, rowsEnd + 8]} text="… AND EVERY LATER CHILD" size={9} cls="k-value--muted" /> : null}
          </>
        )}
        {k ? (
          (() => {
            return (
              <g class="k-ds-keypanel">
                <Value at={[right.x, ky + 10]} text={`KEY ${kIndex + 1} OF ${d.keys.length} · ${KIND[k.kind].toUpperCase()}`} size={9} cls="k-value--label" />
                <Value at={[right.x, ky + 24]} text={`origin ${k.origin ? `[${prime(k.origin)}]` : "none"} · after the key ${k.derivation ? prime(k.derivation) : "none"}`} size={9} />
                {k.publicKeys.map((p, i) => <Value at={[right.x, ky + 38 + i * 14]} text={`${k.range ? `child ${i} ` : ""}public key ${short(p, 10)}`} size={9} />)}
                {k.isPrivate ? <Value at={[right.x, ky + 38 + k.publicKeys.length * 14]} text="PRIVATE: WHOEVER HAS THIS CAN SPEND" size={9} cls="k-value--label" /> : null}
              </g>
            );
          })()
        ) : null}
      </Drawing>
    );
  };

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          <div class="atlas-strip" role="radiogroup" aria-label="Published descriptor">
            {fixtures.map((x) => (
              <label class="atlas-strip__opt">
                <input type="radio" name={`${figureId}-desc`} checked={x.id === id} onChange={() => choose(x.id)} />
                <span>{x.shortLabel ?? x.label}</span>
              </label>
            ))}
          </div>
          {d.keys.length > 1 ? (
            <div class="atlas-strip" role="radiogroup" aria-label="Highlight a key">
              {d.keys.map((_, i) => (
                <label class="atlas-strip__opt">
                  <input type="radio" name={`${figureId}-key`} checked={i === kIndex} onChange={() => setKeySel(i)} />
                  <span>key {i + 1}</span>
                </label>
              ))}
            </div>
          ) : null}
          <div role="group" aria-label="Checksum" data-focus-home tabIndex={-1}>
            <button type="button" class="atlas-scrub__btn atlas-ds-check" aria-pressed={checked} onClick={() => setChecked(!checked)}>{checked ? "Hide the checksum check" : "Check the checksum"}</button>
          </div>
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: {f.label}, with its checksum checked. With JavaScript you can pick any of {fixtures.length} published descriptors, highlight each key and check each checksum.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this descriptor</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Descriptor (BIP {f.source.bip} line {f.source.line})</dt><dd><code class="atlas-break">{f.descriptor}</code></dd>
          <dt>Checksum computed</dt><dd><code>#{d.checksumComputed}</code></dd>
          {k ? <><dt>Key {kIndex + 1}</dt><dd><code class="atlas-break">{k.text}</code></dd>{k.publicKeys.map((p, i) => <><dt>{k.range ? `Public key, child ${i}` : "Public key"}</dt><dd><code class="atlas-break">{p}</code></dd></>)}</> : null}
          {d.scripts.map((list, i) => list.map((s, j) => <><dt>{d.ranged ? `Script, child ${i}` : list.length > 1 ? `Script ${j + 1}` : "Script"}</dt><dd><code class="atlas-break">{s}</code></dd></>))}
        </dl>
      </details>
      <p class="atlas-hero__source">
        Source: BIP {f.source.bip}, line {f.source.line}. Parsed and expanded at build time by the tested descriptor model; {d.error ? "the BIP lists this case to show the checksum failing." : "the scripts match those the BIP lists."}
      </p>
    </div>
  );
}
