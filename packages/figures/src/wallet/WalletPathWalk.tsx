import { COS30, Drawing, IsoBox, KeyGlyph, Responsive, Tag, Value, idsFor, iso, onTop, type DrawingIds } from "../kit";
import type { DerivedWalletPathFixture, WalletAddressView, WalletNodeView } from "../types";
import { allStates, layer, matches, stateKey, type HeroSpec, type HeroState } from "../heroLayers";

const short = (s: string, n = 8) => `${s.slice(0, n)}…`;
/** BIP 44 writes hardened levels with an apostrophe; this book prints a prime. */
const seg = (n: WalletNodeView) => (n.index === null ? "m" : `${n.index}${n.hardened ? "′" : ""}`);

export const LEVEL_TEXT: Record<string, { name: string; job: [string, string] }> = {
  m: { name: "master key", job: ["From the seed. Everything below", "is derived from it."] },
  purpose: { name: "purpose", job: ["Which convention the subtree", "follows: 44′, 84′ or 86′."] },
  coin_type: { name: "coin type", job: ["One subtree per coin: 0′ for", "Bitcoin, 1′ for testnet."] },
  account: { name: "account", job: ["Independent identities, like", "bank accounts. From 0."] },
  change: { name: "change", job: ["0: external chain (receiving).", "1: internal chain (change)."] },
  address_index: { name: "address index", job: ["Addresses numbered from 0", "along the chain."] },
};

const PW = 112, PD = 48, PH = 6, GAP = 40;
const lineOf = (n: WalletNodeView) => (n.level === "m" ? "the master key" : `${LEVEL_TEXT[n.level].name} ${seg(n)}`);

/** The status line for one scheme, address and step. */
export function walkStatus(f: DerivedWalletPathFixture, a: WalletAddressView, step: number): string {
  const last = a.nodes.length;
  const node = step < last ? a.nodes[step] : null;
  const o = a.output;
  const keysNote = f.derived.scheme === 44 ? " (keys from BIP 84's test mnemonic: BIP 44 publishes none)" : "";
  const core = node
    ? `${f.label}, ${a.label}. Step ${step} of ${last}: ${lineOf(node)}${node.level === "m" ? "" : node.hardened ? ", hardened: it needs the parent’s private key" : ", public derivation: the account’s extended public key reaches it"}.`
    : o === null
      ? `${f.label}, ${a.label}: the walk ends at a key, ${short(a.publicKeyHex)}. BIP 44 names no script type, so there is no address.`
      : o.kind === "p2wpkh"
        ? `${f.label}, ${a.label}: HASH160 of the key goes into 0014 ‖ hash; the bech32 address is ${o.address}.`
        : `${f.label}, ${a.label}: the key’s x coordinate is the internal key; tweaked with a hash of that key alone it gives the output key; the bech32m address is ${o.address}.`;
  return core.replace(/\.$/, `${keysNote}.`);
}

const STEPS = (a: WalletAddressView) => Array.from({ length: a.nodes.length + 1 }, (_, i) => String(i));

/** Controls, initial state and every status line of the hero (see heroLayers.ts). */
export function walletWalkSpec(fixtures: DerivedWalletPathFixture[], figureId: string, initial?: HeroState): HeroSpec {
  const keys = ["scheme", "addr", "step"];
  const f0 = fixtures[0];
  const start = initial ?? { scheme: f0.id, addr: "0", step: String(f0.derived.addresses[0].nodes.length) };
  const states = allStates(keys, { scheme: fixtures.map((f) => f.id), addr: ["0", "1", "2"], step: STEPS(f0.derived.addresses[0]) });
  const status: Record<string, string> = {};
  for (const st of states) {
    const f = fixtures.find((x) => x.id === st.scheme)!;
    const a = f.derived.addresses[+st.addr];
    if (!a) throw new Error(`${f.id}: no address ${st.addr}`);
    status[stateKey(keys, st)] = walkStatus(f, a, +st.step);
  }
  const f = fixtures.find((x) => x.id === start.scheme)!;
  const a = f.derived.addresses[+start.addr];
  return {
    figureId,
    keys,
    initial: start,
    controls: [
      { kind: "strip", key: "scheme", label: "Path scheme", options: fixtures.map((x) => ({ value: x.id, text: `BIP ${x.derived.scheme}` })) },
      { kind: "strip", key: "addr", label: "Receive or change", options: f0.derived.addresses.map((x, k) => ({ value: String(k), text: `${x.change === 0 ? "receive" : "change"} ${x.index}` })) },
      { kind: "scrub", key: "step", label: "Path level", min: 0, max: a.nodes.length, prev: "Up a level", next: "Down a level" },
    ],
    status,
    staticNote: `Static view: ${f.label}, ${a.label} address, every level walked. With JavaScript you can switch scheme, switch between receiving and change, and step down one level at a time.`,
    source: "BIP 84 and BIP 86 test vectors from the “abandon … about” mnemonic; every key and address was derived by the tested model and checked against the vectors at build time. BIP 44 publishes paths but no keys: its keys come from the same mnemonic. Public test material; never use it for funds.",
  };
}

/**
 * wallet-path-walk.v1 — the Wallet paths chapter's hero (drawing-first, layered).
 *
 * A path drawn as an exploded stack of plates, one per level: m, purpose,
 * coin type, account, change, address index. The three hardened levels sit
 * above the account line; the two public levels below it are green, because
 * the account's extended public key reaches them. Rendered on the server: one
 * stack per scheme and address, one panel layer per step; the current plate's
 * outline and the fading of plates not yet reached follow the step through
 * CSS (data-s-step on the hero). Every key and address was derived at build
 * time and checked against BIP 84's and BIP 86's vectors.
 */
export function WalletPathWalk({ fixtures, figureId, initial, only = false }: { fixtures: DerivedWalletPathFixture[]; figureId: string; initial?: HeroState; only?: boolean }) {
  const spec = walletWalkSpec(fixtures, figureId, initial);
  const init = spec.initial;
  return (
    <>
      {fixtures.flatMap((f) =>
        f.derived.addresses.map((a, k) => {
          const when = `scheme=${f.id}&addr=${k}`;
          if (only && !matches(when, init)) return null;
          return (
            <div {...layer(when, init)}>
              <Responsive wide={walkDrawing(f, a, `${figureId}-${f.id}-${k}-w`, true, init, only)} narrow={walkDrawing(f, a, `${figureId}-${f.id}-${k}-n`, false, init, only)} />
            </div>
          );
        }),
      )}
    </>
  );
}

/** Exact values: one layer per scheme and address. */
export function WalletPathValues({ fixtures, initial, only = false }: { fixtures: DerivedWalletPathFixture[]; initial?: HeroState; only?: boolean }) {
  const init = walletWalkSpec(fixtures, "", initial).initial;
  return (
    <>
      {fixtures.flatMap((f) =>
        f.derived.addresses.map((a, k) => {
          const when = `scheme=${f.id}&addr=${k}`;
          if (only && !matches(when, init)) return null;
          const d = f.derived, o = a.output;
          return (
            <details class="atlas-disclosure" {...layer(when, init)}>
              <summary>Exact values for this path</summary>
              <dl class="atlas-hexlist atlas-hexlist--case">
                <dt>Path</dt><dd><code>{a.path}</code></dd>
                {a.nodes.map((n) => <><dt>Public key at {lineOf(n)}</dt><dd><code class="atlas-break">{n.publicKeyHex}</code></dd></>)}
                <dt>Account extended public key{d.accountXpubPublished ? ` (BIP ${d.scheme} line ${f.account.pubLine})` : " (computed)"}</dt><dd><code class="atlas-break">{d.accountXpub}</code></dd>
                {o && o.kind === "p2wpkh" ? <><dt>HASH160</dt><dd><code class="atlas-break">{o.keyHashHex}</code></dd></> : null}
                {o && o.kind === "p2tr" ? (
                  <>
                    <dt>Internal key</dt><dd><code class="atlas-break">{o.internalKeyHex}</code></dd>
                    <dt>Tweak</dt><dd><code class="atlas-break">{o.tweakHex}</code></dd>
                    <dt>Output key</dt><dd><code class="atlas-break">{o.outputKeyHex}</code></dd>
                  </>
                ) : null}
                {o ? <><dt>scriptPubKey</dt><dd><code class="atlas-break">{o.scriptPubKeyHex}</code></dd><dt>Address (checked against lines {a.checkedLines.join(", ")})</dt><dd><code class="atlas-break">{o.address}</code></dd></> : null}
              </dl>
            </details>
          );
        }),
      )}
    </>
  );
}

function walkDrawing(f: DerivedWalletPathFixture, a: WalletAddressView, id: string, wide: boolean, init: HeroState, only: boolean) {
  const ids = idsFor(id);
  const sx = 14, sy = 14;
  const ox = sx + PD * COS30;
  const plateY = (k: number) => sy + PH + k * GAP;
  const stackBottom = plateY(a.nodes.length - 1) + (PW + PD) / 2;
  const panel = wide ? { x: 360, y: 18, w: 266 } : { x: 14, y: stackBottom + 36, w: 302 };
  const W = wide ? 640 : 330;
  const H = wide ? Math.max(stackBottom + 16, panel.y + 200) : panel.y + 196;
  const accountK = a.nodes.findIndex((n) => n.level === "account");
  const lineY = plateY(accountK) + (PW + PD) / 2 - 12;
  const last = a.nodes.length;
  const desc =
    `The path ${a.path} as a stack of six plates: ${a.nodes.map((n) => `${n.level === "m" ? "m" : `${LEVEL_TEXT[n.level].name} ${seg(n)}`}${n.level === "m" ? "" : n.hardened ? " (hardened)" : " (public derivation)"}`).join(", ")}. ` +
    `The account's extended public key reaches the two public levels below it. Beside the stack, the current level; at the last step, the address. The status line below names the step.`;
  return (
    <Drawing id={id} width={W} height={H} title="One level at a time" desc={desc}>
      <line class="k-boundary__line" x1={sx} y1={lineY} x2={wide ? 330 : 316} y2={lineY} />
      {[...a.nodes].map((n, k) => ({ n, k })).reverse().map(({ n, k }) => {
        const P = iso(ox, plateY(k));
        const role = n.level === "m" ? "secret" : n.hardened ? "plain" : "public";
        const right = P(PW, 0, PH / 2);
        // Faded at every step before this plate is reached (CSS reads data-s-step).
        const fade = Array.from({ length: k }, (_, s) => s).join(" ");
        return (
          <g class="k-wp-plate" data-plate={k} data-fade={fade || undefined}>
            <IsoBox at={[ox, plateY(k)]} w={PW} d={PD} h={PH} role={role} />
            <text class="k-engrave k-engrave--big" transform={onTop(P(12, PD - 12, PH))}>{seg(n)}</text>
            {n.hardened ? <rect class="k-outline k-mark--plain" transform={onTop(P(PW - 22, PD - 14, PH))} width="10" height="5" /> : null}
            <Tag at={[right[0] + 4, right[1]]} text={n.level === "m" ? "m · MASTER" : `${LEVEL_TEXT[n.level].name.toUpperCase()}${n.hardened ? " · HARDENED" : ""}`} len={12} />
          </g>
        );
      })}
      {wide ? (
        <>
          <KeyGlyph at={[238, lineY + 6]} role="public" scale={0.8} />
          <Value at={[266, lineY + 15]} text="ACCOUNT XPUB" size={9} cls="k-value--label" />
          <Value at={[266, lineY + 26]} text="REACHES BELOW" size={9} cls="k-value--label" />
        </>
      ) : (
        <Value at={[14, stackBottom + 12]} text="ACCOUNT XPUB REACHES EVERYTHING BELOW THE LINE" size={9} cls="k-value--label" />
      )}
      {Array.from({ length: last + 1 }, (_, step) => {
        if (only && String(step) !== init.step) return null;
        return <g {...layer(`step=${step}`, init)}>{panelView(f, a, step, ids, panel.x, panel.y, panel.w)}</g>;
      })}
    </Drawing>
  );
}

/** What one step shows, drawn beside (wide) or below (narrow) the stack. */
function panelView(f: DerivedWalletPathFixture, a: WalletAddressView, step: number, ids: DrawingIds, x: number, y: number, w: number) {
  const d = f.derived;
  const last = a.nodes.length;
  const node = step < last ? a.nodes[step] : null;
  const o = a.output;
  if (node) {
    const t = LEVEL_TEXT[node.level];
    return (
      <g class="k-wp-panel">
        <Value at={[x, y + 8]} text={`STEP ${step} OF ${last} · ${t.name.toUpperCase()}`} size={9} cls="k-value--label" />
        <Value at={[x, y + 42]} text={seg(node)} size={26} />
        <Value at={[x, y + 64]} text={t.job[0]} size={9.5} />
        <Value at={[x, y + 77]} text={t.job[1]} size={9.5} />
        {node.level === "m" ? null : (
          <Value at={[x, y + 98]} text={node.hardened ? "HARDENED: NEEDS THE PARENT’S PRIVATE KEY" : "PUBLIC: THE PARENT’S XPUB IS ENOUGH"} size={9} cls="k-value--label" />
        )}
        <KeyGlyph at={[x, y + 114]} role="public" scale={0.8} />
        <Value at={[x + 32, y + 123]} text={`public key ${short(node.publicKeyHex)}`} size={9.5} />
        {node.level === "m" ? null : <Value at={[x, y + 146]} text={`parent fingerprint ${node.parentFingerprintHex}`} size={9} cls="k-value--muted" />}
        {d.scheme === 44 && node.level !== "account" ? <Value at={[x, y + 184]} text="KEYS: BIP 84'S MNEMONIC · BIP 44 PUBLISHES NONE" size={9} cls="k-value--muted" /> : null}
        {node.level === "account" ? (
          <>
            <Value at={[x, y + 170]} text={`account xpub ${short(d.accountXpub, 12)}`} size={9.5} />
            <Value at={[x, y + 184]} text={d.accountXpubPublished ? `PUBLISHED IN BIP ${d.scheme} (LINE ${f.account.pubLine})` : "COMPUTED: BIP 44 PUBLISHES NO KEYS"} size={9} cls="k-value--muted" />
          </>
        ) : null}
      </g>
    );
  }
  const box = (bx: number, by: number, bw: number, role: string, text: string) => (
    <g>
      <rect class={`k-cell k-fill--${role}`} x={bx} y={by} width={bw} height="18" />
      <text class="k-value" x={bx + 5} y={by + 12.5} style="font-size:9px">{text}</text>
    </g>
  );
  const arrow = (ay: number) => <path class="k-line" d={`M${x + 12} ${ay} v10`} marker-end={ids.arrow} />;
  return (
    <g class="k-wp-panel">
      <Value at={[x, y + 8]} text={`STEP ${last} OF ${last} · THE ADDRESS`} size={9} cls="k-value--label" />
      {box(x, y + 18, w, "public", `key  ${short(a.publicKeyHex)}  33 B`)}
      {o === null ? (
        <>
          <rect class="k-outline k-dashed" x={x} y={y + 52} width={w} height="40" fill="none" />
          <Value at={[x + 8, y + 68]} text="BIP 44 NAMES NO SCRIPT TYPE" size={9} cls="k-value--label" />
          <Value at={[x + 8, y + 82]} text="AND NO ADDRESS FORMAT" size={9} cls="k-value--label" />
          <Value at={[x, y + 110]} text="KEY FROM BIP 84'S MNEMONIC · BIP 44 PUBLISHES NONE" size={9} cls="k-value--muted" />
        </>
      ) : o.kind === "p2wpkh" ? (
        <>
          {arrow(y + 38)}
          {box(x, y + 50, w, "hash", `HASH160  ${short(o.keyHashHex)}  20 B`)}
          {arrow(y + 70)}
          {box(x, y + 82, w, "plain", `script  0014 ‖ hash`)}
          {arrow(y + 102)}
          {box(x, y + 114, w, "plain", `bech32  ${short(o.address, 14)}`)}
          <Value at={[x, y + 152]} text="P2WPKH · BIP 84" size={9} cls="k-value--label" />
        </>
      ) : (
        <>
          {arrow(y + 38)}
          {box(x, y + 50, w, "public", `internal key P = lift_x(x)  ${short(o.internalKeyHex, 6)}`)}
          {arrow(y + 70)}
          {box(x, y + 82, w, "hash", `TapTweak of P alone  t ${short(o.tweakHex, 6)}`)}
          {arrow(y + 102)}
          {box(x, y + 114, w, "public", `output key Q = P + t·G  ${short(o.outputKeyHex, 6)}`)}
          {arrow(y + 134)}
          {box(x, y + 146, w, "plain", `5120 ‖ Q · bech32m  ${short(o.address, 10)}`)}
          <Value at={[x, y + 184]} text="P2TR KEY PATH · BIP 86" size={9} cls="k-value--label" />
        </>
      )}
    </g>
  );
}
