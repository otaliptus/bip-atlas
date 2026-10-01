import { useEffect, useState } from "preact/hooks";
import type { Bip32NodeDerived, DerivedBip32Fixture } from "../types";

interface Props {
  fixture: DerivedBip32Fixture;
  figureId: string;
}

type View = "private" | "public";

const short = (s: string, head = 10, tail = 6) => `${s.slice(0, head)}…${s.slice(-tail)}`;

/**
 * derivation-tree.v1 — the BIP32 chapter's hero figure.
 *
 * A fixed tree of nodes, every value precomputed by the tested model from
 * BIP32 test vector 1. Readers switch between holding the master extended
 * private key (m) and the master extended public key (M), expand branches,
 * and flip one branch between a normal and a hardened index; both variants
 * were derived at build time, so no relationship is invented by the UI.
 */
export function DerivationTree({ fixture, figureId }: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const { nodes } = fixture.derived;
  const { toggle } = fixture.tree;
  const [view, setView] = useState<View>("private");
  const [hardenedBranch, setHardenedBranch] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["m", "m/0H"]));
  const [selected, setSelected] = useState("m/0H/1");

  // Hide whichever variant of the toggled branch is not active.
  const hiddenPrefix = hardenedBranch ? toggle.normal : toggle.hardened;
  const visible = nodes.filter((n) => n.path !== hiddenPrefix && !n.path.startsWith(`${hiddenPrefix}/`));
  const byPath = new Map(visible.map((n) => [n.path, n]));
  const children = (path: string) => visible.filter((n) => n.parentPath === path);
  const isExpanded = (path: string) => !hydrated || expanded.has(path);
  const reachable = (n: Bip32NodeDerived) => view === "private" || n.hardenedAncestor === null;

  const current = byPath.get(selected) ?? byPath.get("m")!;
  const toggleExpand = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };
  const flipBranch = (on: boolean) => {
    setHardenedBranch(on);
    const from = on ? toggle.normal : toggle.hardened;
    const to = on ? toggle.hardened : toggle.normal;
    if (selected === from || selected.startsWith(`${from}/`)) setSelected(to + selected.slice(from.length));
    if (expanded.has(from)) {
      const next = new Set(expanded);
      next.delete(from);
      next.add(to);
      setExpanded(next);
    }
  };

  const renderNode = (n: Bip32NodeDerived) => {
    const kids = children(n.path);
    const open = isExpanded(n.path);
    const ok = reachable(n);
    const blockedHere = !ok && n.hardened && (n.parentPath === null || reachable(byPath.get(n.parentPath)!));
    const value = view === "private" ? n.xprv : n.xpub;
    return (
      <li
        role="treeitem"
        aria-expanded={kids.length ? open : undefined}
        aria-selected={hydrated ? n.path === current.path : undefined}
        class="atlas-tree__item"
        data-hardened={n.hardened ? "true" : undefined}
        data-reachable={ok ? "true" : "false"}
      >
        <div class="atlas-tree__row">
          {kids.length && hydrated ? (
            <button type="button" class="atlas-tree__twisty" aria-label={`${open ? "Collapse" : "Expand"} ${n.path}`} onClick={() => toggleExpand(n.path)}>
              {open ? "−" : "+"}
            </button>
          ) : (
            <span class="atlas-tree__twisty atlas-tree__twisty--leaf" aria-hidden="true" />
          )}
          {n.parentPath !== null ? (
            <span class="atlas-tree__edge" data-hardened={n.hardened ? "true" : undefined}>
              {n.hardened ? "hardened" : "normal"}
            </span>
          ) : null}
          {blockedHere ? <span class="atlas-tree__wall">CKDpub stops here</span> : null}
          {hydrated ? (
            <button
              type="button"
              class="atlas-tree__node"
              data-selected={n.path === current.path ? "true" : undefined}
              onClick={() => setSelected(n.path)}
              aria-label={`${n.path}: ${ok ? (view === "private" ? "extended private key" : "extended public key") : "not derivable from M"}`}
            >
              <span class="atlas-tree__path">{view === "public" && ok ? n.path.replace(/^m/, "M") : n.path}</span>
              <span class="atlas-tree__key">{ok ? short(value) : "not derivable from M"}</span>
              {n.vectorLine ? <span class="atlas-tree__badge">BIP 32 L{n.vectorLine}–{n.vectorLine + 2}</span> : null}
            </button>
          ) : (
            <span class="atlas-tree__node">
              <span class="atlas-tree__path">{n.path}</span>
              <span class="atlas-tree__key">{short(value)}</span>
              {n.vectorLine ? <span class="atlas-tree__badge">BIP 32 L{n.vectorLine}–{n.vectorLine + 2}</span> : null}
            </span>
          )}
        </div>
        {kids.length && open ? <ul role="group" class="atlas-tree__group">{kids.map(renderNode)}</ul> : null}
      </li>
    );
  };

  const currentOk = reachable(current);
  const label = (n: Bip32NodeDerived) => (view === "public" && reachable(n) ? n.path.replace(/^m/, "M") : n.path);
  const parent = current.parentPath ? byPath.get(current.parentPath)! : null;

  return (
    <div class="atlas-lab atlas-hd-lab" data-hydrated={hydrated ? "true" : "false"}>
      {hydrated ? (
        <div class="atlas-lab__controls">
          <fieldset class="atlas-segmented">
            <legend>You hold</legend>
            <label class="atlas-choice">
              <input type="radio" name={`${figureId}-view`} checked={view === "private"} onChange={() => setView("private")} />
              <span>m, the extended private key<small>xprv · can sign</small></span>
            </label>
            <label class="atlas-choice">
              <input type="radio" name={`${figureId}-view`} checked={view === "public"} onChange={() => setView("public")} />
              <span>M, the extended public key<small>xpub · watch only</small></span>
            </label>
          </fieldset>
          <label class="atlas-switch">
            <input type="checkbox" role="switch" checked={hardenedBranch} onChange={(e) => flipBranch((e.currentTarget as HTMLInputElement).checked)} />
            <span>Make branch {toggle.normal.split("/")[1]} hardened ({toggle.normal} → {toggle.hardened})</span>
          </label>
        </div>
      ) : (
        <p class="atlas-lab__static-note">
          Static view: the whole tree as seen by someone holding the master extended private key. With JavaScript you can
          switch to the public view, flip a branch to hardened, and inspect any node.
        </p>
      )}

      <div class="atlas-hd-lab__body">
        <ul role="tree" class="atlas-tree" aria-label={`Key tree from BIP 32 test vector 1, ${view} view`}>
          {renderNode(byPath.get("m")!)}
        </ul>

        <section class="atlas-panel atlas-node" aria-label={`Details for ${current.path}`} aria-live="polite">
          <h4 class="atlas-panel__title">
            {label(current)} · depth {current.depth} {current.vectorLine ? `· matches BIP 32 lines ${current.vectorLine}–${current.vectorLine + 2}` : "· computed by the tested implementation"}
          </h4>
          {!currentOk ? (
            <p class="atlas-node__blocked">
              <strong>Not derivable from M.</strong> The path passes through the hardened edge {current.hardenedAncestor}.
              Its HMAC input includes the parent <em>private</em> key, which an xpub holder does not have.
            </p>
          ) : null}
          <dl class="atlas-node__fields">
            <div><dt>Child number</dt><dd><code>{current.childNumberHex}</code> {current.parentPath ? (current.hardened ? "(≥ 0x80000000: hardened)" : "(normal)") : "(master)"}</dd></div>
            <div><dt>Parent fingerprint</dt><dd>{currentOk ? <code>{current.parentFingerprintHex}</code> : "—"}</dd></div>
            <div><dt>Chain code</dt><dd><code title={currentOk ? current.chainCodeHex : undefined}>{currentOk ? short(current.chainCodeHex, 12, 8) : "—"}</code></dd></div>
            <div><dt>Public key</dt><dd><code title={currentOk ? current.publicKeyHex : undefined}>{currentOk ? short(current.publicKeyHex, 12, 8) : "—"}</code></dd></div>
            <div><dt>Private key</dt><dd>{view === "private" ? <code title={current.privateKeyHex}>{short(current.privateKeyHex, 12, 8)}</code> : <span class="atlas-node__none">not available: M holds no private keys</span>}</dd></div>
          </dl>
          {parent ? (
            <p class="atlas-node__how">
              Derived with HMAC-SHA512 keyed by {label(parent)}’s chain code, over{" "}
              {current.hardened
                ? <><code>00</code> ‖ {label(parent)}’s <strong>private</strong> key ‖ <code>{current.childNumberHex}</code></>
                : <>{label(parent)}’s <strong>public</strong> key ‖ <code>{current.childNumberHex}</code></>}
              .
            </p>
          ) : (
            <p class="atlas-node__how">The master key: the two halves of HMAC-SHA512("Bitcoin seed", seed).</p>
          )}
          {currentOk ? (
            <p class="atlas-node__serial">
              <span>{view === "private" ? "xprv" : "xpub"}</span>
              <code>{view === "private" ? current.xprv : current.xpub}</code>
            </p>
          ) : null}
        </section>
      </div>
      <p class="atlas-lab__source">
        Seed: BIP 32 test vector 1 (line {fixture.source.line}). Every key here is public test material; never use it for
        funds.
      </p>
    </div>
  );
}
