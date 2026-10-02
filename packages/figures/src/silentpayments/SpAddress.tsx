import { Arrow, Drawing, KeyGlyph, Value, idsFor } from "../kit";
import type { Role } from "../kit";
import type { DerivedSpFixture } from "../types";
import { short } from "./common";

const CHECKSUM_CHARS = 6;

/**
 * sp-address.v1 — static. A version 0 silent payment address as a ribbon of
 * character cells: the human-readable part, the separator, the version
 * character, the data that carries the two keys, and the bech32m checksum.
 * The data decodes to the scan key and the spend key. Address re-encoded by
 * the tested model; exact values in the disclosure.
 */
export function SpAddress({ fixture }: { fixture: DerivedSpFixture }) {
  const r = fixture.derived.receiver;
  const a = r.address;
  const sep = a.lastIndexOf("1");
  if (sep < 1 || a[sep + 1] !== "q") throw new Error(`${fixture.id}: not a version 0 address`);
  const dataLen = a.length - sep - 2 - CHECKSUM_CHARS;
  const keyBytes = (r.Bscan.length + r.Bspend.length) / 2;
  const roleOf = (i: number): Role => (i < sep ? "plain" : i === sep ? "plain" : i === sep + 1 ? "plain" : i < a.length - CHECKSUM_CHARS ? "public" : "check");
  const perRow = 29, cell = 10.5, x0 = 14, y0 = 26, rowH = 18;
  const rows = Math.ceil(a.length / perRow);
  const ids = idsFor("a15-addr");
  const keysY = y0 + rows * rowH + 46;
  const desc =
    `The ${a.length}-character address ${a}. It starts with the human-readable part "${a.slice(0, sep)}", then the separator 1, then the version character q (version 0). ` +
    `The next ${dataLen} characters carry ${keyBytes} bytes: the scan key B_scan ${r.Bscan} and the spend key B_m ${r.Bspend}, both 33-byte compressed public keys. The last ${CHECKSUM_CHARS} characters are the bech32m checksum.`;
  return (
    <>
      <Drawing id="a15-addr" width={344} height={keysY + 70} title="Inside an sp1 address" desc={desc}>
        <Value at={[x0, 14]} text={`${a.length} CHARACTERS · VERSION 0 · MAINNET`} size={8.5} cls="k-value--label" />
        {[...a].map((ch, i) => {
          const x = x0 + (i % perRow) * cell, y = y0 + Math.floor(i / perRow) * rowH;
          const role = roleOf(i);
          return (
            <g>
              <rect class={`k-cell k-fill--${role}${i === sep + 1 ? " k-cell--em" : ""}`} x={x} y={y} width={cell} height={14} />
              <text class="k-value" x={x + cell / 2} y={y + 10} text-anchor="middle" style={`font-size:8px${i <= sep + 1 ? ";font-weight:600" : ""}`}>{ch}</text>
            </g>
          );
        })}
        {[
          { role: "plain" as Role, t: `"${a.slice(0, sep)}" · "1" · "q": PREFIX, SEPARATOR, VERSION 0` },
          { role: "public" as Role, t: `${dataLen} CHARACTERS: B_SCAN ‖ B_M, ${keyBytes} BYTES` },
          { role: "check" as Role, t: `${CHECKSUM_CHARS} CHARACTERS: BECH32M CHECKSUM` },
        ].map((l, k) => (
          <g>
            <rect class={`k-cell k-fill--${l.role}`} x={x0} y={y0 + rows * rowH + 2 + k * 13} width="10" height="9" />
            <Value at={[x0 + 16, y0 + rows * rowH + 10 + k * 13]} text={l.t} size={8} cls="k-value--muted" />
          </g>
        ))}
        <Arrow d={`M${x0 + 4} ${keysY - 2} V${keysY + 10}`} ids={ids} />
        <Value at={[x0 + 12, keysY + 6]} text="DECODES TO" size={8} cls="k-value--muted" />
        <KeyGlyph at={[x0, keysY + 16]} role="public" scale={0.8} />
        <Value at={[x0 + 32, keysY + 24]} text="B_SCAN · 33 B" size={8.5} cls="k-value--label" />
        <Value at={[x0 + 32, keysY + 36]} text={short(r.Bscan)} size={9} />
        <KeyGlyph at={[x0 + 170, keysY + 16]} role="public" scale={0.8} />
        <Value at={[x0 + 202, keysY + 24]} text="B_M · 33 B" size={8.5} cls="k-value--label" />
        <Value at={[x0 + 202, keysY + 36]} text={short(r.Bspend)} size={9} />
        <Value at={[x0 + 32, keysY + 50]} text="THE SCAN KEY" size={8} cls="k-value--muted" />
        <Value at={[x0 + 202, keysY + 50]} text="THE SPEND KEY, UNLABELED" size={8} cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          <dt>Address</dt><dd><code class="atlas-break">{a}</code></dd>
          <dt>B_scan</dt><dd><code class="atlas-break">{r.Bscan}</code></dd>
          <dt>B_m (here the unlabeled spend key B_spend)</dt><dd><code class="atlas-break">{r.Bspend}</code></dd>
        </dl>
      </details>
    </>
  );
}
