import { Bracket, Drawing, Value } from "../kit";
import type { DerivedWalletPathFixture } from "../types";
import { LEVEL_TEXT } from "./WalletPathWalk";

const CW = 50, CH = 30, X0 = 22, Y0 = 52;

/**
 * wallet-path-levels.v1 — static, opening. BIP 44's first example path as a
 * ribbon of six segments: the master key, three hardened levels and two
 * public ones, with the account line between them. The path and its reading
 * come from BIP 44's examples table, parsed and checked at build time.
 */
export function WalletPathLevels({ fixture }: { fixture: DerivedWalletPathFixture }) {
  const t = fixture.derived.bip44;
  if (!t) throw new Error(`${fixture.id}: wallet-path-levels.v1 needs BIP 44's examples table`);
  const a = fixture.derived.addresses[0];
  const ex = t.examples.find((e) => e.path === a.path);
  if (!ex) throw new Error(`${fixture.id}: ${a.path} is not in BIP 44's examples table`);
  const nodes = a.nodes;
  const seg = (k: number) => (nodes[k].index === null ? "m" : `${nodes[k].index}${nodes[k].hardened ? "′" : ""}`);
  const hard = nodes.filter((n) => n.hardened).length;
  const firstPublic = nodes.findIndex((n) => n.level !== "m" && !n.hardened);
  const cx = (k: number) => X0 + k * CW + CW / 2;
  const desc =
    `BIP 44's path ${nodes.map((_, k) => seg(k)).join(" / ")}: the master key m, then ${nodes.slice(1).map((n, k) => `${LEVEL_TEXT[n.level].name} ${seg(k + 1)}`).join(", ")}. ` +
    `The first ${hard} levels below m are hardened and need the parent's private key; the last ${nodes.length - firstPublic} use public derivation, so the account's extended public key reaches them. ` +
    `BIP 44's examples table reads this path as ${ex.coin}, ${ex.account} account, ${ex.chain} chain, ${ex.address} address.`;
  return (
    <Drawing id="a12-levels" width={344} height={196} title="Five levels below the master key" desc={desc}>
      <Bracket x1={X0 + CW} x2={X0 + firstPublic * CW - 2} y={Y0 - 6} below={false} text="hardened" />
      <Bracket x1={X0 + firstPublic * CW + 2} x2={X0 + nodes.length * CW} y={Y0 - 6} below={false} text="public" />
      {nodes.map((n, k) => (
        <g>
          <rect class={`k-cell k-fill--${n.level === "m" ? "secret" : n.hardened ? "plain" : "public"}`} x={X0 + k * CW} y={Y0} width={CW} height={CH} />
          <Value at={[cx(k), Y0 + 20]} text={seg(k)} anchor="middle" size={13} />
          {n.hardened ? <rect class="k-outline k-mark--plain" x={X0 + k * CW + CW - 13} y={Y0 + 4} width="9" height="5" /> : null}
        </g>
      ))}
      <line class="k-boundary__line" x1={X0 + firstPublic * CW} y1={Y0 - 14} x2={X0 + firstPublic * CW} y2={Y0 + CH + 12} />
      {nodes.map((n, k) => {
        const low = k % 2 === 0;
        const ly = Y0 + CH + (low ? 16 : 40);
        return (
          <g class="k-label">
            <line class="k-leader" x1={cx(k)} y1={Y0 + CH + 2} x2={cx(k)} y2={ly - 9} />
            <text x={cx(k)} y={ly} text-anchor="middle" style="font-size:9px">{n.level === "m" ? "MASTER" : LEVEL_TEXT[n.level].name.toUpperCase()}</text>
          </g>
        );
      })}
      <Value at={[X0, Y0 + CH + 76]} text={`BIP 44 LINE ${ex.line}: ${ex.coin.toUpperCase()}, ${ex.account.toUpperCase()} ACCOUNT,`} size={9} cls="k-value--label" />
      <Value at={[X0, Y0 + CH + 90]} text={`${ex.chain.toUpperCase()} CHAIN, ${ex.address.toUpperCase()} ADDRESS`} size={9} cls="k-value--label" />
      <rect class="k-outline k-mark--plain" x={X0} y={Y0 + CH + 101} width="9" height="5" />
      <Value at={[X0 + 14, Y0 + CH + 108]} text="HARDENED" size={9} cls="k-value--muted" />
    </Drawing>
  );
}
