import { Drawing, KeyGlyph, Machine, Responsive, Value, idsFor, type DrawingIds } from "../kit";
import type { Bip32NodeDerived, DerivedBip32Fixture } from "../types";
import { allStates, layer, matches, stateKey, type HeroSpec, type HeroState } from "../heroLayers";

type View = "private" | "public";

const short = (hex: string) => `${hex.slice(0, 8)}…`;
/** BIP 32 writes the public-key view with a capital M; never change the case of paths otherwise. */
const shown = (path: string, view: View, reachable: boolean) => (view === "public" && reachable ? path.replace(/^m/, "M") : path);

export interface TreeSpot {
  node: Bip32NodeDerived;
  x: number;
  y: number;
}

/** Leaves get evenly spaced slots; a parent sits over the middle of its children. */
export function layoutHdTree(nodes: Bip32NodeDerived[], width: number, rowH: number, top: number): TreeSpot[] {
  const kids = (p: string) => nodes.filter((n) => n.parentPath === p);
  const leaves: string[] = [];
  const walk = (p: string) => (kids(p).length ? kids(p).forEach((k) => walk(k.path)) : leaves.push(p));
  walk("m");
  const slot = width / leaves.length;
  const xOf = new Map<string, number>();
  const place = (p: string): number => {
    const ks = kids(p);
    const x = ks.length ? ks.map((k) => place(k.path)).reduce((a, b) => a + b, 0) / ks.length : slot * (leaves.indexOf(p) + 0.5);
    xOf.set(p, x);
    return x;
  };
  place("m");
  return nodes.map((node) => ({ node, x: xOf.get(node.path)!, y: top + node.depth * rowH }));
}

/** The tree with the inactive variant of the toggled branch removed. */
export function visibleNodes(fixture: DerivedBip32Fixture, hardenedBranch: boolean) {
  const { toggle } = fixture.tree;
  const hidden = hardenedBranch ? toggle.normal : toggle.hardened;
  return fixture.derived.nodes.filter((n) => n.path !== hidden && !n.path.startsWith(`${hidden}/`));
}

/** Everything one state (who holds what, which branch is open) needs. */
export function hdState(fixture: DerivedBip32Fixture, view: View, hardenedBranch: boolean, branch: string) {
  const nodes = visibleNodes(fixture, hardenedBranch);
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const reach = (n: Bip32NodeDerived) => view === "private" || n.hardenedAncestor === null;
  const sel = byPath.get(branch);
  if (!sel || !sel.parentPath) throw new Error(`derivation-tree.v1: branch ${branch} is not a visible child node`);
  const parent = byPath.get(sel.parentPath)!;
  const parentHeld = reach(parent);
  const childHeld = reach(sel);
  const pub = view === "public";
  const name = (n: Bip32NodeDerived) => shown(n.path, view, reach(n));
  const idx = sel.indexLabel;
  const derivable = parentHeld && (!sel.hardened || !pub);
  // What this holder can say about the opened branch.
  const outcome = !parentHeld
    ? `out of reach: its parent ${parent.path} ${parent.hardenedAncestor === parent.path ? "is a hardened child, which M cannot derive" : `lies below the hardened edge into ${parent.hardenedAncestor}, which M cannot cross`}.`
    : sel.hardened && pub
      ? `hardened. Its HMAC input is 00, the private key of ${parent.path} and ${sel.childNumberHex}. M holds no private key, so ${sel.path} and everything below it cannot be derived.`
      : sel.hardened
        ? `hardened. HMAC-SHA512 keyed by ${name(parent)}’s chain code hashes 00, its private key and ${sel.childNumberHex}; the left half is added to that private key.`
        : pub
          ? `normal. HMAC-SHA512 keyed by ${name(parent)}’s chain code hashes its public key and ${sel.childNumberHex}; the child public key is point(I_L) + K.`
          : `normal. HMAC-SHA512 keyed by ${name(parent)}’s chain code hashes its public key and ${sel.childNumberHex}; the left half is added to its private key.`;
  const status = `${pub ? "Holding M, the extended public key" : "Holding m, the extended private key"}. Branch ${name(sel)} is ${outcome}`;

  return { nodes, byPath, reach, sel, parent, parentHeld, childHeld, pub, name, idx, derivable, status };
}

const VIEWS: View[] = ["private", "public"];
const TOGGLES = ["normal", "hardened"] as const;
const branchesOf = (fixture: DerivedBip32Fixture, hardened: boolean) => visibleNodes(fixture, hardened).filter((n) => n.parentPath).map((n) => n.path);
const INITIAL: HeroState = { view: "private", toggle: "normal", branch: "m/0H/1" };

/** The controls, initial state and every status line of the hero (see stateHero.ts). */
export function derivationTreeSpec(fixture: DerivedBip32Fixture, figureId: string, initial: HeroState = INITIAL): HeroSpec {
  const { toggle } = fixture.tree;
  const keys = ["view", "toggle", "branch"];
  const all = allStates(keys, { view: VIEWS, toggle: [...TOGGLES], branch: [...new Set([...branchesOf(fixture, false), ...branchesOf(fixture, true)])] }, (s) => branchesOf(fixture, s.toggle === "hardened").includes(s.branch));
  const status = Object.fromEntries(all.map((s) => [stateKey(keys, s), hdState(fixture, s.view as View, s.toggle === "hardened", s.branch).status]));
  const group = (p: string) => p.replace(toggle.hardened, toggle.normal);
  const branchOptions = [...new Set([...branchesOf(fixture, false), ...branchesOf(fixture, true)])].map((p) => {
    const under = (q: string) => p === q || p.startsWith(`${q}/`);
    return { value: p, text: p.slice(2), group: group(p), when: under(toggle.normal) ? "toggle=normal" : under(toggle.hardened) ? "toggle=hardened" : undefined };
  });
  return {
    figureId,
    keys,
    initial,
    controls: [
      { kind: "strip", key: "view", label: "You hold", keepCase: true, options: [{ value: "private", text: "m · xprv" }, { value: "public", text: "M · xpub" }] },
      { kind: "strip", key: "toggle", label: "Branch 1", keepCase: true, options: [{ value: "normal", text: `${toggle.normal.slice(2)} normal` }, { value: "hardened", text: `${toggle.hardened.slice(2)} hardened` }] },
      { kind: "strip", key: "branch", label: "Expand branch", keepCase: true, options: branchOptions },
    ],
    status,
    staticNote: `Static view: the tree held as m, with branch ${initial.branch} opened. With JavaScript you can switch to holding only M, make branch ${toggle.normal.slice(2)} hardened, and open any branch.`,
    source: `Seed: BIP 32 test vector 1 (line ${fixture.source.line}). Every key here is public test material; never use it for funds.`,
  };
}

/**
 * derivation-tree.v1 — the HD wallets chapter's hero (drawing-first, layered).
 *
 * BIP 32 test vector 1's tree, every value precomputed by the tested model.
 * Nodes are key glyphs: pink when you hold the extended private key m, green
 * when you hold only the extended public key M, hatched when M cannot reach
 * them. Hardened edges carry a gate, closed in the public view. One branch at
 * a time opens into a zoom box showing what goes into its HMAC and whether
 * this holder has it. The drawing is rendered on the server, one layer per
 * state; StateHero (client) only switches layers. In the public layers
 * nothing behind a closed gate is drawn, described or disclosed with a value.
 */
export function DerivationTree({ fixture, figureId, initial = INITIAL, only = false }: { fixture: DerivedBip32Fixture; figureId: string; initial?: HeroState; only?: boolean }) {
  return (
    <>
      {VIEWS.flatMap((view) =>
        TOGGLES.filter((tog) => !only || matches(`view=${view}&toggle=${tog}`, initial)).map((tog) => {
          const hardenedBranch = tog === "hardened";
          const branches = branchesOf(fixture, hardenedBranch).filter((b) => !only || b === initial.branch);
          return (
            <div {...layer(`view=${view}&toggle=${tog}`, initial)}>
              <Responsive wide={treeDrawing(fixture, `${figureId}-${view}-${tog}-wide`, true, view, hardenedBranch, branches, initial)} narrow={treeDrawing(fixture, `${figureId}-${view}-${tog}-narrow`, false, view, hardenedBranch, branches, initial)} />
            </div>
          );
        }),
      )}
    </>
  );
}

/** The "Exact values" disclosure, one layer per state. */
export function DerivationTreeValues({ fixture, initial = INITIAL, only = false }: { fixture: DerivedBip32Fixture; initial?: HeroState; only?: boolean }) {
  return (
    <>
      {VIEWS.flatMap((view) =>
        TOGGLES.flatMap((tog) =>
          branchesOf(fixture, tog === "hardened").filter((branch) => !only || matches(`view=${view}&toggle=${tog}&branch=${branch}`, initial)).map((branch) => {
            const { sel, parent, parentHeld, pub, name, derivable } = hdState(fixture, view, tog === "hardened", branch);
            return (
              <details class="atlas-disclosure" {...layer(`view=${view}&toggle=${tog}&branch=${branch}`, initial)}>
                <summary>Exact values for this branch</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {parentHeld ? (
            <>
              <dt>Chain code of {name(parent)}</dt><dd><code class="atlas-break">{parent.chainCodeHex}</code></dd>
              <dt>Public key of {name(parent)}</dt><dd><code class="atlas-break">{parent.publicKeyHex}</code></dd>
            </>
          ) : null}
          {derivable ? (
            <>
              <dt>HMAC data</dt><dd><code class="atlas-break">{sel.hmacDataHex}</code></dd>
              <dt>HMAC-SHA512 output I = I_L ‖ I_R</dt><dd><code class="atlas-break">{sel.hmacOutHex}</code></dd>
              {pub ? null : <><dt>Private key of {sel.path}</dt><dd><code class="atlas-break">{sel.privateKeyHex}</code></dd></>}
              <dt>Public key of {name(sel)}</dt><dd><code class="atlas-break">{sel.publicKeyHex}</code></dd>
              <dt>{pub ? "xpub" : "xprv"} of {name(sel)}{sel.vectorLine ? ` (BIP 32 line ${sel.vectorLine + (pub ? 1 : 2)})` : ""}</dt>
              <dd><code class="atlas-break">{pub ? sel.xpub : sel.xprv}</code></dd>
            </>
          ) : (
            <><dt>Child number</dt><dd><code>{sel.childNumberHex}</code> (no other value of {sel.path} can be derived from M)</dd></>
          )}
        </dl>
              </details>
            );
          }),
        ),
      )}
    </>
  );
}

/** Text on a hatched area sits on a small white chip so it stays legible. */
const chip = (x: number, y: number, text: string) => (
  <g>
    <rect class="k-hd-chip" x={x - 3} y={y - 10} width={text.length * 5.6 + 6} height="13" />
    <Value at={[x, y]} text={text} size={9} />
  </g>
);

/** Small magnifier glyph: marks the opened edge and the zoom box that shows it. */
const magGlyph = (x: number, y: number) => (
  <g class="k-hd-mag">
    <line class="k-mag__rim" x1={x + 4} y1={y + 4} x2={x + 9} y2={y + 9} />
    <circle class="k-mag__lens k-mag__rim" cx={x} cy={y} r="5.5" />
  </g>
);

/** One tree (for one holder and one form of branch 1), with a layer per opened branch. */
function treeDrawing(fixture: DerivedBip32Fixture, id: string, wide: boolean, view: View, hardenedBranch: boolean, branches: string[], initial: HeroState) {
  const nodes = visibleNodes(fixture, hardenedBranch);
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const pub = view === "public";
  const reach = (n: Bip32NodeDerived) => view === "private" || n.hardenedAncestor === null;
  const name = (n: Bip32NodeDerived) => shown(n.path, view, reach(n));
  const ids = idsFor(id);
  const treeW = wide ? 330 : 314;
  const ROW = 72;
  const spots = layoutHdTree(nodes, treeW, ROW, 22).map((s) => ({ ...s, x: s.x + (wide ? 4 : 8) }));
  const at = (p: string) => spots.find((s) => s.node.path === p)!;
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  const treeBottom = 22 + maxDepth * ROW + 30;
  const boxH = 176;
  const box = wide ? { x: 356, y: Math.max(8, (treeBottom - boxH) / 2), w: 276 } : { x: 10, y: treeBottom + 20, w: 310 };
  const W = wide ? 640 : 330;
  const H = wide ? Math.max(treeBottom + 12, box.y + boxH + 10) : box.y + boxH + 10;
  /** An edge runs from under the parent's label to above the child's glyph. */
  const edge = (p: TreeSpot, c: TreeSpot) => {
    const x1 = p.x, y1 = p.y + 27, x2 = c.x, y2 = c.y - 10;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const along = (t: number): [number, number] => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    return { x1, y1, x2, y2, along, nx: -(y2 - y1) / len, ny: (x2 - x1) / len };
  };
  const parts = nodes.map((n) => {
    if (!n.parentPath) return pub ? "M, the master extended public key" : "m, the master extended private key";
    return `${name(n)} (${n.hardened ? "hardened" : "normal"} child of ${name(byPath.get(n.parentPath)!)})${reach(n) ? "" : ", not derivable from M"}`;
  });
  const desc = `Key tree from BIP 32 test vector 1, ${pub ? "seen by someone holding only M" : "seen by someone holding m"}: ${parts.join("; ")}. One branch is opened into a zoom box; the status line below names it and what goes into its HMAC.`;
  const edgeLine = (s: TreeSpot, cls: string) => {
    const { x1, y1, x2, y2, nx, ny } = edge(at(s.node.parentPath!), s);
    return s.node.hardened ? (
      <>
        <line class={cls} x1={x1 + nx * 1.6} y1={y1 + ny * 1.6} x2={x2 + nx * 1.6} y2={y2 + ny * 1.6} />
        <line class={cls} x1={x1 - nx * 1.6} y1={y1 - ny * 1.6} x2={x2 - nx * 1.6} y2={y2 - ny * 1.6} />
      </>
    ) : (
      <line class={cls} x1={x1} y1={y1} x2={x2} y2={y2} />
    );
  };
  return (
    <Drawing id={id} width={W} height={H} title="Who can derive what" desc={desc}>
      {/* Edges */}
      {spots.map((s) => {
        if (!s.node.parentPath) return null;
        const { x1, x2, along, nx, ny } = edge(at(s.node.parentPath), s);
        const lost = !reach(at(s.node.parentPath).node);
        const closed = s.node.hardened && pub;
        const [gx, gy] = along(0.42);
        const side = x2 >= x1 ? 1 : -1;
        const [lx, ly] = along(0.7);
        const ox = side > 0 ? -nx : nx, oy = side > 0 ? -ny : ny;
        return (
          <g class="k-hd-edge" data-hardened={s.node.hardened ? "true" : undefined}>
            {edgeLine(s, `k-line${lost ? " k-dashed" : ""}`)}
            {s.node.hardened ? <rect class={`k-outline ${closed ? "k-mark--plain" : "k-fill--plain"}`} x={gx - 8} y={gy - 4} width="16" height="8" /> : null}
            <Value at={[lx - ox * 8, ly - oy * 8 + 3]} text={s.node.indexLabel} anchor={side > 0 ? "end" : "start"} size={9} cls="k-value--muted" />
          </g>
        );
      })}
      {/* Gate labels: only where a public holder actually meets a closed gate. */}
      {pub
        ? spots
            .filter((s) => s.node.hardened && s.node.parentPath && reach(at(s.node.parentPath).node))
            .map((s) => {
              const { x1, x2, along, nx, ny } = edge(at(s.node.parentPath!), s);
              const [gx, gy] = along(0.42);
              const right = x2 >= x1;
              const ox = right ? -nx : nx, oy = right ? -ny : ny;
              return <Value at={[gx + ox * 10 + (right ? 4 : -4), gy + oy * 10 + 3]} text="CKDPUB STOPS" anchor={right ? "start" : "end"} size={9} cls="k-value--label" />;
            })
        : null}
      {/* Nodes */}
      {spots.map((s) => {
        const ok = reach(s.node);
        return (
          <g class="k-hd-node" data-reachable={ok ? "true" : "false"}>
            {ok ? <KeyGlyph at={[s.x - 15, s.y - 6]} role={pub ? "public" : "secret"} /> : <rect class="k-outline" x={s.x - 15} y={s.y - 7} width="30" height="14" style={`fill:${ids.hatch}`} />}
            <Value at={[s.x, s.y + 20]} text={shown(s.node.path, view, ok)} anchor="middle" size={9.5} cls={ok ? "" : "k-value--muted"} />
          </g>
        );
      })}
      {/* One layer per opened branch: the heavy edge, its glyph and the zoom box. */}
      {branches.map((b) => {
        const st = hdState(fixture, view, hardenedBranch, b);
        const s = at(b);
        const { x1, x2, along, nx, ny } = edge(at(s.node.parentPath!), s);
        const side = x2 >= x1 ? 1 : -1;
        const ox = side > 0 ? -nx : nx, oy = side > 0 ? -ny : ny;
        const closed = s.node.hardened && pub;
        return (
          <g {...layer(`branch=${b}`, initial)}>
            {edgeLine(s, "k-line k-hd-open")}
            {closed ? magGlyph(along(0.4)[0] - ox * 14, along(0.4)[1] - oy * 14) : magGlyph(along(0.5)[0] + ox * 14, along(0.5)[1] + oy * 14)}
            {zoomBox(ids, box.x, box.y, box.w, boxH, view, st)}
          </g>
        );
      })}
    </Drawing>
  );
}

/** The opened branch: key, data, HMAC, result — with nothing this holder lacks. */
function zoomBox(ids: DrawingIds, x: number, y: number, w: number, h: number, view: View, st: ReturnType<typeof hdState>) {
  const { sel, parent, parentHeld, childHeld, pub, name, idx, derivable } = st;
  const inner = w - 24;
  const idxW = 58;
  const hatch = `fill:${ids.hatch}`;
  const dataY = y + 74;
  return (
    <g class="k-hd-zoom">
      <rect class="k-outline k-fill--plain" x={x} y={y} width={w} height={h} />
      {magGlyph(x + 16, y + 13)}
      <Value at={[x + 30, y + 16]} text={`${name(parent)} → ${name(sel)} · ${sel.hardened ? "HARDENED" : "NORMAL"} · i = ${idx}`} size={9} cls="k-value--label" />
      <Value at={[x + 12, y + 32]} text="HMAC KEY: CHAIN CODE c" size={9} cls="k-value--muted" />
      <rect class="k-cell k-fill--public" x={x + 12} y={y + 37} width={inner} height="16" style={parentHeld ? undefined : hatch} />
      {parentHeld ? <Value at={[x + 18, y + 49]} text={`c  ${short(parent.chainCodeHex)}`} size={9} /> : chip(x + 18, y + 49, "not known to M")}
      <Value at={[x + 12, dataY - 5]} text={`HMAC DATA · 37 BYTES`} size={9} cls="k-value--muted" />
      {sel.hardened ? (
        <>
          <rect class="k-cell k-fill--plain" x={x + 12} y={dataY} width="16" height="18" />
          <Value at={[x + 20, dataY + 13]} text="00" anchor="middle" size={9} />
          <rect class="k-cell k-fill--secret" x={x + 28} y={dataY} width={inner - 16 - idxW} height="18" style={derivable ? undefined : hatch} />
          {derivable ? <Value at={[x + 34, dataY + 13]} text={`k  ${short(parent.privateKeyHex)}`} size={9} /> : chip(x + 34, dataY + 13, "k: not held")}
        </>
      ) : (
        <>
          <rect class="k-cell k-fill--public" x={x + 12} y={dataY} width={inner - idxW} height="18" style={parentHeld ? undefined : hatch} />
          {parentHeld ? <Value at={[x + 18, dataY + 13]} text={`K  ${short(parent.publicKeyHex)}`} size={9} /> : chip(x + 18, dataY + 13, "K: not known to M")}
        </>
      )}
      <rect class="k-cell k-fill--plain" x={x + 12 + inner - idxW} y={dataY} width={idxW} height="18" />
      <Value at={[x + 12 + inner - idxW / 2, dataY + 13]} text={sel.childNumberHex} anchor="middle" size={9} />
      <Machine at={[x + 30, y + 118]} w={84} d={22} h={18} label="HMAC-SHA512" />
      {derivable ? (
        <>
          <Value at={[x + 124, y + 122]} text={`I_L ${short(sel.hmacOutHex!.slice(0, 64))}`} size={9} cls="k-value--hash" />
          <Value at={[x + 124, y + 138]} text={pub ? "K′ = point(I_L) + K" : "k′ = I_L + k  (mod n)"} size={9} />
          <Value at={[x + 124, y + 154]} text="c′ = I_R" size={9} />
          <KeyGlyph at={[x + w - 44, y + 150]} role={pub ? "public" : "secret"} scale={0.8} />
          <Value at={[x + w - 12, y + 170]} text={shown(sel.path, view, childHeld)} anchor="end" size={9} />
        </>
      ) : (
        <>
          <rect class="k-outline k-mark--plain" x={x + 124} y={y + 120} width="16" height="10" />
          <Value at={[x + 146, y + 129]} text="CANNOT DERIVE" size={9} cls="k-value--label" />
          <Value at={[x + 124, y + 148]} text={parentHeld ? "NEEDS A PRIVATE KEY:" : "PARENT OUT OF REACH:"} size={9} cls="k-value--muted" />
          <Value at={[x + 124, y + 160]} text={parentHeld ? "M HOLDS NONE" : "M HOLDS NO KEY OR c HERE"} size={9} cls="k-value--muted" />
        </>
      )}
    </g>
  );
}
