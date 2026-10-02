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
  const d = fixture.derived;
  const candidate = d.steps.find((s) => s.matched);
  if (!candidate) throw new Error(`${fixture.id}: the receiving scene needs a matching output`);
  const ids = idsFor("a15-find");
  const outputsY = 195;
  const scanY = outputsY + d.txOutputs.length * 32 + 45;
  return (
    <>
      <Drawing id="a15-find" width={344} height={scanY + 96} title="One address to publish; a payment to find" desc={`The receiver publishes ${d.receiver.address}, which carries the public scan and spend keys. The sender uses it with the transaction inputs to derive a Taproot output. In the receiver's view, scanning this transaction finds ${d.txOutputs.filter((o) => o.mine).length} matching output. The receiver computes ${candidate.Pk} for counter ${candidate.k}. The receiver uses the private scan key, public spend key and transaction input information locally. The scan secret is not sent. This is a teaching view of the receiver's knowledge, not what an outside observer can discover.`}>
        <rect class="k-outline k-fill--plain" x="54" y="12" width="236" height="67" rx="4" />
        <Value at={[172, 29]} text="PUBLIC RECEIVING ADDRESS" size={9.5} anchor="middle" />
        <Value at={[172, 47]} text={`${d.receiver.address.slice(0, 18)}…`} size={12} anchor="middle" />
        <Value at={[172, 65]} text="SCAN KEY + SPEND KEY · BOTH PUBLIC" size={9.5} anchor="middle" cls="k-value--muted" />
        <Arrow d="M172 83 V113" ids={ids} />
        <Value at={[172, 131]} text="SENDER CALCULATES A FRESH OUTPUT" size={9.5} anchor="middle" />
        <Value at={[172, 146]} text="using this address + transaction inputs" size={9.5} anchor="middle" cls="k-value--muted" />
        <Arrow d="M172 154 V180" ids={ids} />
        <Value at={[26, 188]} text="OUTPUTS IN THIS TRANSACTION" size={9.5} />
        {d.txOutputs.map((o, i) => (
          <g data-output-match={o.mine ? "true" : "false"}>
            <rect class={`k-outline ${o.mine ? "k-fill--public" : "k-fill--plain"}`} x="26" y={outputsY + i * 32} width="292" height="26" rx="13" />
            <Value at={[40, outputsY + i * 32 + 17]} text={`${o.key.slice(0, 16)}…`} size={10} />
            <Value at={[302, outputsY + i * 32 + 17]} text={o.mine ? "✓ MATCH" : "PASS"} size={9.5} anchor="end" />
          </g>
        ))}
        <path class="k-line k-dashed" d={`M172 ${scanY - 5} V${outputsY + d.txOutputs.length * 32 + 4}`} marker-end={ids.arrow} />
        <circle class="k-outline k-fill--plain" cx="70" cy={scanY + 22} r="23" />
        <line class="k-line" x1="54" y1={scanY + 40} x2="39" y2={scanY + 57} />
        <KeyGlyph at={[57, scanY + 17]} role="secret" scale={0.85} />
        <Value at={[108, scanY + 9]} text="RECEIVER SCANS" size={10} />
        <Value at={[108, scanY + 27]} text="scan secret + public spend key" size={9.5} />
        <Value at={[108, scanY + 43]} text="+ transaction input information" size={9.5} />
        <Value at={[108, scanY + 59]} text={`finds P${candidate.k} ${candidate.Pk.slice(0, 8)}…`} size={9.5} />
        <Value at={[172, scanY + 88]} text="A MATCH IN THE RECEIVER’S VIEW" size={9.5} anchor="middle" cls="k-value--muted" />
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Inside the address: characters, keys and checksum</summary>
        <AddressEncoding fixture={fixture} />
      </details>
    </>
  );
}

function AddressEncoding({ fixture }: { fixture: DerivedSpFixture }) {
  const r = fixture.derived.receiver;
  const a = r.address;
  const sep = a.lastIndexOf("1");
  if (sep < 1 || a[sep + 1] !== "q") throw new Error(`${fixture.id}: not a version 0 address`);
  if (a.slice(0, sep) !== "sp") throw new Error(`${fixture.id}: the figure labels a mainnet (sp) address`);
  // The character whose bits are split between B_scan and B_m (B_scan fills this many whole characters first).
  const shared = sep + 2 + Math.floor(((r.Bscan.length / 2) * 8) / 5);
  const dataLen = a.length - sep - 2 - CHECKSUM_CHARS;
  const keyBytes = (r.Bscan.length + r.Bspend.length) / 2;
  const roleOf = (i: number): Role => (i < sep ? "plain" : i === sep ? "plain" : i === sep + 1 ? "plain" : i < a.length - CHECKSUM_CHARS ? "public" : "check");
  const perRow = 29, cell = 10.5, x0 = 14, y0 = 26, rowH = 18;
  const rows = Math.ceil(a.length / perRow);
  const ids = idsFor("a15-addr");
  const keysY = y0 + rows * rowH + 58;
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
              <rect class={`k-cell k-fill--${role}${i === sep + 1 || i === shared ? " k-cell--em" : ""}${role === "check" ? " k-dashed" : ""}`} x={x} y={y} width={cell} height={14} />
              <text class="k-value" x={x + cell / 2} y={y + 10} text-anchor="middle" style={`font-size:8px${i <= sep + 1 ? ";font-weight:600" : ""}`}>{ch}</text>
            </g>
          );
        })}
        {[
          { role: "plain" as Role, t: `"${a.slice(0, sep)}" · "1" · "q": PREFIX, SEPARATOR, VERSION 0` },
          { role: "public" as Role, t: `${dataLen} CHARACTERS: B_SCAN ‖ B_M, ${keyBytes} BYTES` },
          { role: "check" as Role, t: `${CHECKSUM_CHARS} CHARACTERS, DASHED: BECH32M CHECKSUM` },
          { role: "public" as Role, t: `OUTLINED: CHARACTER ${shared + 1}, PART B_SCAN, PART B_M` },
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
