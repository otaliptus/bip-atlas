import { useEffect, useState } from "preact/hooks";
import type { DerivedTaprootTreeFixture, TaprootLeafView, TaprootNodeView } from "../types";

interface Props {
  fixture: DerivedTaprootTreeFixture;
  figureId: string;
}

type Path = "key" | "script";
type View = "wallet" | "proof";
/** What a viewer of the spend can see about one piece of the structure. */
type Seen = "revealed" | "hash-only" | "recomputed" | "hidden" | "known";

const short = (hex: string) => `${hex.slice(0, 6)}…${hex.slice(-4)}`;
const leafName = (id: number) => `Leaf ${String.fromCharCode(65 + id)}`;

const leavesUnder = (n: TaprootNodeView): number[] => (n.leaf !== null ? [n.leaf] : n.children.flatMap(leavesUnder));

const SEEN_TEXT: Record<Seen, string> = {
  revealed: "in the witness",
  "hash-only": "only its hash revealed",
  recomputed: "recomputed by the verifier",
  hidden: "not revealed",
  known: "known to the wallet",
};

/**
 * taproot-commitment.v1 — the Taproot chapter's hero figure.
 *
 * One published BIP 341 tree: every hash, tweak, key and control block was
 * recomputed at build time with the tested model and matched against the
 * wallet vectors, and every control block was run through the BIP's
 * commitment check. The key-path signature is the published witness for this
 * same output. The reader chooses a spending path, a leaf, and whether to see
 * only what the spend reveals; nothing here signs or accepts input.
 */
export function TaprootCommitment({ fixture, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const d = fixture.derived;
  const [path, setPath] = useState<Path>("script");
  const [leafId, setLeafId] = useState(d.leaves[d.leaves.length > 1 ? 1 : 0]?.id ?? 0);
  const [view, setView] = useState<View>("wallet");
  const leaf: TaprootLeafView | undefined = d.leaves.find((l) => l.id === leafId);
  const proof = view === "proof";

  // For the chosen leaf: hashes on the path are siblings; nodes containing the leaf are recomputed.
  const siblingHashes = new Set(path === "script" && leaf ? leaf.path : []);
  const seenOf = (n: TaprootNodeView): Seen => {
    if (path === "key") return proof ? "hidden" : "known";
    if (n.leaf === leafId) return "revealed";
    if (leavesUnder(n).includes(leafId)) return "recomputed";
    if (siblingHashes.has(n.hash)) return "hash-only";
    return proof ? "hidden" : "known";
  };

  const renderNode = (n: TaprootNodeView) => {
    const seen = seenOf(n);
    const l = n.leaf !== null ? d.leaves.find((x) => x.id === n.leaf)! : null;
    const showContent = !proof || seen === "revealed" || seen === "recomputed" || seen === "hash-only";
    return (
      <li class="atlas-tap-tree__item">
        <div class="atlas-tap-node" data-seen={seen} data-kind={l ? "leaf" : "branch"}>
          <span class="atlas-tap-node__name">{l ? leafName(l.id) : "TapBranch"}</span>
          {l && (!proof || seen === "revealed") ? (
            <code class="atlas-tap-node__script">{l.scriptReading}</code>
          ) : l ? (
            <span class="atlas-tap-node__script" data-concealed="true">script concealed</span>
          ) : null}
          {showContent ? <code class="atlas-tap-node__hash">{short(n.hash)}</code> : <span class="atlas-tap-node__hash" data-concealed="true">—</span>}
          <span class="atlas-tap-node__seen">{l && seen === "revealed" ? "script in the witness; hash recomputed" : SEEN_TEXT[seen]}</span>
        </div>
        {n.children.length ? <ol class="atlas-tap-tree__kids">{n.children.map(renderNode)}</ol> : null}
      </li>
    );
  };

  const keySeen: Seen = path === "key" ? (proof ? "hidden" : "known") : "revealed";
  const rootSeen: Seen = path === "key" ? (proof ? "hidden" : "known") : "recomputed";
  const cb = leaf?.controlBlockHex ?? "";
  const pathHashes = leaf ? leaf.path : [];

  return (
    <div class="atlas-lab atlas-tap-lab" data-hydrated={hydrated ? "true" : "false"} data-path={path} data-view={view}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-segmented">
            <legend>Spending path</legend>
            {(["key", "script"] as const).map((p) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-path`} checked={path === p} onChange={() => setPath(p)} />
                <span>{p === "key" ? "Key path" : "Script path"}<small>{p === "key" ? "one signature" : "script + proof"}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented" disabled={path === "key"}>
            <legend>Leaf</legend>
            {d.leaves.map((l) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-leaf`} checked={leafId === l.id} onChange={() => setLeafId(l.id)} disabled={path === "key"} />
                <span>{leafName(l.id)}<small>depth {l.path.length}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset class="atlas-segmented">
            <legend>Show</legend>
            {(["wallet", "proof"] as const).map((v) => (
              <label class="atlas-choice">
                <input type="radio" name={`${figureId}-view`} checked={view === v} onChange={() => setView(v)} />
                <span>{v === "wallet" ? "Everything" : "Only the proof"}<small>{v === "wallet" ? "the wallet’s view" : "what the spend reveals"}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view: a script-path spend of {leaf ? leafName(leaf.id) : "a leaf"}, with the whole tree shown as the wallet knows it.
          With JavaScript you can switch to the key path, choose another leaf, and hide everything the spend does not reveal.
        </p>
      )}

      <div class="atlas-tap-lab__body">
        <div class="atlas-tap-lab__structure" aria-label="Commitment structure">
          <div class="atlas-tap-out">
            <span class="atlas-tap-out__label">Output · witness v1 program</span>
            <code class="atlas-break">{d.outputKeyHex}</code>
            <small>Output key Q (x only). This is all the output itself shows.</small>
          </div>
          <p class="atlas-tap-eq">
            Q = P + t⋅G, &nbsp;t = hash<sub>TapTweak</sub>(P ‖ root)
            <span class="atlas-tap-eq__seen">{path === "key" ? (proof ? "tweak not revealed" : "known to the wallet") : "recomputed by the verifier"}</span>
          </p>
          <div class="atlas-tap-inputs">
            <div class="atlas-tap-node" data-seen={keySeen} data-kind="key">
              <span class="atlas-tap-node__name">Internal key P</span>
              {proof && keySeen === "hidden" ? <span class="atlas-tap-node__hash" data-concealed="true">—</span> : <code class="atlas-tap-node__hash">{short(d.internalKeyHex)}</code>}
              <span class="atlas-tap-node__seen">{SEEN_TEXT[keySeen]}</span>
            </div>
            <div class="atlas-tap-node" data-seen={rootSeen} data-kind="root">
              <span class="atlas-tap-node__name">Merkle root</span>
              {proof && rootSeen === "hidden" ? <span class="atlas-tap-node__hash" data-concealed="true">—</span> : <code class="atlas-tap-node__hash">{d.merkleRootHex ? short(d.merkleRootHex) : "none"}</code>}
              <span class="atlas-tap-node__seen">{SEEN_TEXT[rootSeen]}</span>
            </div>
          </div>
          {d.root ? <ol class="atlas-tap-tree" aria-label="Script tree">{renderNode(d.root)}</ol> : null}
          <p class="atlas-tap-legend">
            <span data-seen="revealed">in the witness</span>
            <span data-seen="hash-only">hash only</span>
            <span data-seen="recomputed">recomputed</span>
            <span data-seen={proof ? "hidden" : "known"}>{proof ? "not revealed" : "known to the wallet"}</span>
          </p>
        </div>

        <section class="atlas-panel atlas-tap-lab__panel" aria-live="polite" aria-label="Witness and verification">
          {path === "key" ? (
            <>
              <h4 class="atlas-panel__title">Key-path witness · 1 element</h4>
              {d.keySpend ? (
                <>
                  <ol class="atlas-tap-witness">
                    <li>
                      <span class="atlas-tap-witness__label">signature · {d.keySpend.signatureHex.length / 2} bytes{d.keySpend.hashType === 0 ? ", SIGHASH_DEFAULT" : ""}</span>
                      <code class="atlas-break">{d.keySpend.signatureHex}</code>
                    </li>
                  </ol>
                  <p class="atlas-tap-check" data-ok="true">✓ BIP 340 signature valid for the output key Q over the transaction’s signature hash</p>
                </>
              ) : (
                <p class="atlas-panel__empty">The published vectors include no key-path spend of this output.</p>
              )}
              <p class="atlas-panel__scope">
                The spend shows Q and one signature. Nothing in it says whether a script tree exists: the internal key, the tweak and every script stay
                off chain. Signing needs the secret key for Q, which is the internal secret key adjusted by the tweak.
              </p>
            </>
          ) : leaf ? (
            <>
              <h4 class="atlas-panel__title">Script-path witness for {leafName(leaf.id)}</h4>
              <ol class="atlas-tap-witness">
                <li data-missing="true">
                  <span class="atlas-tap-witness__label">script inputs</span>
                  <span>Whatever the script needs; for this leaf, a signature for its key. The vectors publish none, so none is shown.</span>
                </li>
                <li>
                  <span class="atlas-tap-witness__label">script s · {leaf.scriptHex.length / 2} bytes</span>
                  <code class="atlas-break">{leaf.scriptHex}</code>
                </li>
                <li>
                  <span class="atlas-tap-witness__label">control block c · {cb.length / 2} bytes = 33 + 32 × {pathHashes.length}</span>
                  <span class="atlas-tap-cb">
                    <code data-part="byte" title="leaf version | parity">{cb.slice(0, 2)}</code>
                    <code data-part="key" class="atlas-break">{cb.slice(2, 66)}</code>
                    {pathHashes.map((h) => <code data-part="path" class="atlas-break">{h}</code>)}
                  </span>
                  <small>
                    first byte 0x{cb.slice(0, 2)} = leaf version 0x{leaf.leafVersion.toString(16)} + parity bit {d.parity}; then the internal key P; then {pathHashes.length} sibling {pathHashes.length === 1 ? "hash" : "hashes"}
                  </small>
                </li>
              </ol>
              <ol class="atlas-tap-steps" aria-label="Verifier recomputation">
                {leaf.check.map((s) => (
                  <li data-ok={s.ok ? "true" : "false"}>
                    {s.id === "length" ? <>Length {s.values.bytes} bytes = 33 + 32 × {s.values.m} ✓</> : null}
                    {s.id === "internal-key" ? <>P = lift_x(c[1:33]) ✓</> : null}
                    {s.id === "leaf-version" ? <>leaf version v = c[0] &amp; 0xfe = {s.values.v}</> : null}
                    {s.id === "leaf-hash" ? <>k0 = hash<sub>TapLeaf</sub>(v ‖ size ‖ s) = <code>{short(s.values.k0)}</code></> : null}
                    {s.id === "branch" ? (
                      <>
                        k{Number(s.values.j) + 1} = hash<sub>TapBranch</sub>({s.values.first === "k" ? `k${s.values.j} ‖ e${s.values.j}` : `e${s.values.j} ‖ k${s.values.j}`}) = <code>{short(s.values.next)}</code>
                        <small> smaller hash first</small>
                      </>
                    ) : null}
                    {s.id === "tweak" ? <>t = hash<sub>TapTweak</sub>(P ‖ k) = <code>{short(s.values.t)}</code></> : null}
                    {s.id === "output-key" ? <>Q = P + t⋅G; y(Q) is {s.values.parity === "0" ? "even" : "odd"}, matching the parity bit</> : null}
                    {s.id === "compare" ? <>x(Q) = q {s.ok ? "✓" : "✕"}: the output committed to this script</> : null}
                  </li>
                ))}
              </ol>
              <p class="atlas-panel__scope">
                The spend reveals that a script path exists, this leaf’s script, and its depth ({leaf.path.length}). Other leaves appear, if at all, only as hashes.
                Running the script itself is BIP 342’s job and is not shown here.
              </p>
            </>
          ) : null}
        </section>
      </div>

      <details class="atlas-tap-exact">
        <summary>Exact values</summary>
        <dl>
          <div><dt>internal key P</dt><dd><code class="atlas-break">{d.internalKeyHex}</code></dd></div>
          <div><dt>Merkle root</dt><dd><code class="atlas-break">{d.merkleRootHex ?? "none"}</code></dd></div>
          <div><dt>tweak t</dt><dd><code class="atlas-break">{d.tweakHex}</code></dd></div>
          <div><dt>output key Q</dt><dd><code class="atlas-break">{d.outputKeyHex}</code> (y {d.parity ? "odd" : "even"})</dd></div>
          <div><dt>address</dt><dd><code class="atlas-break">{d.address}</code></dd></div>
          {d.leaves.map((l) => (
            <div><dt>{leafName(l.id)} hash</dt><dd><code class="atlas-break">{l.leafHash}</code></dd></div>
          ))}
        </dl>
      </details>
      <p class="atlas-lab__source">
        Source: BIP 341 wallet-test-vectors.json, {fixture.source.pointer}{fixture.keySpend ? ` and ${fixture.keySpend.pointer}` : ""}. Hashes are byte arrays, first byte first.
        The tree’s shape is this vector’s; BIP 341 lets a wallet choose any binary tree.
      </p>
    </div>
  );
}
