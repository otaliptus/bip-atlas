import { useEffect, useState } from "preact/hooks";
import { holdFocus } from "../focus";
import { COS30, Drawing, IsoBox, KeyGlyph, Responsive, Tag, Value, idsFor, iso, onTop, type DrawingIds } from "../kit";
import type { DerivedWalletPathFixture, WalletAddressView, WalletNodeView } from "../types";

interface Props {
  fixtures: DerivedWalletPathFixture[];
  figureId: string;
  /** Starting state; the no-JS render uses it too. Defaults to the first fixture's first address, every level walked. */
  initial?: { fixtureId: string; address: number; step: number };
}

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

/**
 * wallet-path-walk.v1 — the Wallet paths chapter's hero (drawing-first).
 *
 * A path drawn as an exploded stack of plates, one per level: m, purpose,
 * coin type, account, change, address index. The three hardened levels sit
 * above the account line; the two public levels below it are green, because
 * the account's extended public key reaches them. A stepper lights one plate
 * at a time and the last step builds the address. Every key and address was
 * derived at build time and checked against BIP 84's and BIP 86's vectors.
 */
export function WalletPathWalk({ fixtures, figureId, initial }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const start = initial ?? { fixtureId: fixtures[0].id, address: 0, step: -1 };
  const [fid, setFid] = useState(start.fixtureId);
  const f = fixtures.find((x) => x.id === fid);
  if (!f) throw new Error(`wallet-path-walk.v1: no fixture ${fid}`);
  const d = f.derived;
  const [which, setWhich] = useState(start.address);
  const a: WalletAddressView | undefined = d.addresses[which];
  if (!a) throw new Error(`wallet-path-walk.v1: ${f.id} has no address ${which}`);
  const last = a.nodes.length; // the address step
  // Hydrated, the reader starts at the master key and steps down; without JS every level is walked.
  const [at, setAt] = useState(start.step < 0 ? 0 : start.step);
  const step = hydrated ? Math.min(at, last) : start.step < 0 ? last : Math.min(start.step, last);
  const node = step < last ? a.nodes[step] : null;
  const o = a.output;

  const lineOf = (n: WalletNodeView) => (n.level === "m" ? "the master key" : `${LEVEL_TEXT[n.level].name} ${seg(n)}`);
  const status = node
    ? `${f.label}, ${a.label}. Step ${step} of ${last}: ${lineOf(node)}${node.level === "m" ? "" : node.hardened ? ", hardened: it needs the parent’s private key" : ", public derivation: the account’s extended public key reaches it"}.`
    : o === null
      ? `${f.label}, ${a.label}: the walk ends at a key, ${short(a.publicKeyHex)}. BIP 44 names no script type, so there is no address.`
      : o.kind === "p2wpkh"
        ? `${f.label}, ${a.label}: HASH160 of the key goes into 0014 ‖ hash; the bech32 address is ${o.address}.`
        : `${f.label}, ${a.label}: the key’s x coordinate is the internal key; tweaked with no script tree it gives the output key; the bech32m address is ${o.address}.`;
  const describe = () =>
    `The path ${a.path} as a stack of six plates: ${a.nodes.map((n) => `${n.level === "m" ? "m" : `${LEVEL_TEXT[n.level].name} ${seg(n)}`}${n.level === "m" ? "" : n.hardened ? " (hardened)" : " (public derivation)"}`).join(", ")}. ` +
    `The account's extended public key reaches the two public levels below it. ${status}`;

  const choose = (id: string) => {
    setFid(id);
    setAt(0);
  };

  const draw = (w: "wide" | "narrow") => {
    const wide = w === "wide";
    const id = `${figureId}-${w}`;
    const ids = idsFor(id);
    const sx = 14, sy = 14;
    const ox = sx + PD * COS30;
    const plateY = (k: number) => sy + PH + k * GAP;
    const stackBottom = plateY(a.nodes.length - 1) + (PW + PD) / 2;
    const panel = wide ? { x: 360, y: 18, w: 266 } : { x: 14, y: stackBottom + 26, w: 302 };
    const W = wide ? 640 : 330;
    const H = wide ? Math.max(stackBottom + 16, panel.y + 200) : panel.y + 196;
    const accountK = a.nodes.findIndex((n) => n.level === "account");
    const lineY = plateY(accountK) + (PW + PD) / 2 - 12;
    return (
      <Drawing id={id} width={W} height={H} title="One level at a time" desc={describe()}>
        <line class="k-boundary__line" x1={sx} y1={lineY} x2={wide ? 330 : 316} y2={lineY} />
        {[...a.nodes].map((n, k) => ({ n, k })).reverse().map(({ n, k }) => {
          const P = iso(ox, plateY(k));
          const known = !hydrated || k <= step;
          const current = k === step;
          const role = n.level === "m" ? "secret" : n.hardened ? "plain" : "public";
          const right = P(PW, 0, PH / 2);
          return (
            <g class={`k-wp-plate${known ? "" : " k-faded"}`} data-current={current ? "true" : undefined}>
              <IsoBox at={[ox, plateY(k)]} w={PW} d={PD} h={PH} role={role} cls={current ? "k-iso--em" : ""} />
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
          <Value at={[316, lineY + 13]} text="ACCOUNT XPUB REACHES BELOW" anchor="end" size={9} cls="k-value--label" />
        )}
        {panelView(ids, panel.x, panel.y, panel.w)}
      </Drawing>
    );
  };

  /** What the current step shows, drawn beside (wide) or below (narrow) the stack. */
  const panelView = (ids: DrawingIds, x: number, y: number, w: number) => {
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
          <KeyGlyph at={[x, y + 114]} role={node.level === "m" ? "secret" : "public"} scale={0.8} />
          <Value at={[x + 32, y + 123]} text={`public key ${short(node.publicKeyHex)}`} size={9.5} />
          {node.level === "m" ? null : <Value at={[x, y + 146]} text={`parent fingerprint ${node.parentFingerprintHex}`} size={9} cls="k-value--muted" />}
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
            {box(x, y + 50, w, "public", `internal key P = x(key)  ${short(o.internalKeyHex, 6)}`)}
            {arrow(y + 70)}
            {box(x, y + 82, w, "hash", `TapTweak, no scripts  t ${short(o.tweakHex, 6)}`)}
            {arrow(y + 102)}
            {box(x, y + 114, w, "public", `output key Q = P + t·G  ${short(o.outputKeyHex, 6)}`)}
            {arrow(y + 134)}
            {box(x, y + 146, w, "plain", `5120 ‖ Q · bech32m  ${short(o.address, 10)}`)}
            <Value at={[x, y + 184]} text="P2TR KEY PATH · BIP 86" size={9} cls="k-value--label" />
          </>
        )}
      </g>
    );
  };

  const strip = (label: string, group: string, options: Array<{ value: string; text: string }>, current: string, set: (v: string) => void) => (
    <div class="atlas-strip" role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <label class="atlas-strip__opt">
          <input type="radio" name={`${figureId}-${group}`} checked={current === opt.value} onChange={() => set(opt.value)} />
          <span>{opt.text}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div class="atlas-hero" data-hydrated={hydrated ? "true" : "false"} onClickCapture={hydrated ? holdFocus : undefined}>
      {hydrated ? (
        <div class="atlas-hero__controls">
          {strip("Path scheme", "scheme", fixtures.map((x) => ({ value: x.id, text: `BIP ${x.derived.scheme}` })), fid, choose)}
          {strip("Receive or change", "addr", d.addresses.map((x, k) => ({ value: String(k), text: `${x.change === 0 ? "receive" : "change"} ${x.index}` })), String(which), (v) => setWhich(Number(v)))}
        </div>
      ) : (
        <p class="atlas-hero__static">Static view: {f.label}, {a.label} address, every level walked. With JavaScript you can switch scheme, switch between receiving and change, and step down one level at a time.</p>
      )}
      <Responsive wide={draw("wide")} narrow={draw("narrow")} />
      {hydrated ? (
        <div class="atlas-scrub" role="group" aria-label="Step through path levels">
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.max(0, step - 1))} disabled={step === 0} aria-label="Up a level">←</button>
          <input
            type="range"
            min={0}
            max={last}
            value={step}
            aria-label="Path level"
            aria-valuetext={node ? `${step} of ${last}: ${lineOf(node)}` : `${last} of ${last}: the address`}
            onInput={(e) => setAt(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <button type="button" class="atlas-scrub__btn" onClick={() => setAt(Math.min(last, step + 1))} disabled={step === last} aria-label="Down a level">→</button>
        </div>
      ) : null}
      <p class="atlas-hero__status" aria-live="polite">{status}</p>
      <details class="atlas-disclosure">
        <summary>Exact values for this path</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          <dt>Path</dt><dd><code>{a.path}</code></dd>
          {node ? <><dt>Public key at {lineOf(node)}</dt><dd><code class="atlas-break">{node.publicKeyHex}</code></dd></> : null}
          <dt>Account extended public key{d.accountXpubPublished ? ` (BIP ${d.scheme} line ${f.account.pubLine})` : " (computed)"}</dt><dd><code class="atlas-break">{d.accountXpub}</code></dd>
          <dt>Key at the end of the path</dt><dd><code class="atlas-break">{a.publicKeyHex}</code></dd>
          {o && o.kind === "p2wpkh" ? <><dt>HASH160</dt><dd><code class="atlas-break">{o.keyHashHex}</code></dd></> : null}
          {o && o.kind === "p2tr" ? (
            <>
              <dt>Internal key</dt><dd><code class="atlas-break">{o.internalKeyHex}</code></dd>
              <dt>Tweak</dt><dd><code class="atlas-break">{o.tweakHex}</code></dd>
              <dt>Output key</dt><dd><code class="atlas-break">{o.outputKeyHex}</code></dd>
            </>
          ) : null}
          {o ? <><dt>scriptPubKey</dt><dd><code class="atlas-break">{o.scriptPubKeyHex}</code></dd><dt>Address</dt><dd><code class="atlas-break">{o.address}</code></dd></> : null}
        </dl>
      </details>
      <p class="atlas-hero__source">
        {d.scheme === 44
          ? `Paths from BIP 44's examples (line ${a.checkedLines.join(", ")}). BIP 44 publishes no keys: these come from BIP 84's test mnemonic, derived by the tested BIP 32 model.`
          : `BIP ${d.scheme} test vectors from the "abandon … about" mnemonic; checked at build time against lines ${a.checkedLines.join(", ")}. Public test material; never use it for funds.`}
      </p>
    </div>
  );
}
