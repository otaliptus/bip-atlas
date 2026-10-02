import { analyzeSegwitAddress } from "@bip-atlas/models/bech32";
import { Drawing, Value } from "../kit";
import { stageLabel } from "../describe";
import type { AddressFixture } from "../types";

const CH = 5.7;

/**
 * address-case.v1 — static. All-lowercase and all-uppercase spellings of
 * BIP 173's example both decode to the same script; a string that mixes
 * cases (a BIP 350 vector) is refused before anything else is checked.
 * Every verdict from the tested bech32 model.
 */
export function AddressCase({ fixtures }: { fixtures: AddressFixture[] }) {
  const rows = fixtures.map((f) => ({ f, a: analyzeSegwitAddress(f.address, f.network) }));
  const lower = rows.find((r) => r.a.valid && r.f.address === r.f.address.toLowerCase());
  const upper = rows.find((r) => r.a.valid && r.f.address === r.f.address.toUpperCase());
  const mixed = rows.find((r) => r.a.failedStage === "characters");
  if (!lower || !upper || !mixed) throw new Error("address-case.v1 needs a lowercase, an uppercase and a mixed-case fixture");
  if (lower.a.scriptPubKeyHex !== upper.a.scriptPubKeyHex) throw new Error("the two spellings should decode to the same script");
  // Show the mixed string around its odd-case letters, shortened with an ellipsis.
  const m = mixed.f.address;
  const odd = [...m].findIndex((c) => c !== c.toLowerCase());
  const keep = 22;
  const from = Math.max(0, odd - keep + 4);
  const mixedShown = `${from > 0 ? "…" : ""}${m.slice(from, from + keep)}${from + keep < m.length ? "…" : ""}`;
  const oddInShown = odd - from + (from > 0 ? 1 : 0);
  const list = [
    { text: lower.f.address, verdict: "✓ VALID · LOWERCASE", note: `BIP ${lower.f.source.bip} LINE ${lower.f.source.line}`, mark: -1 },
    { text: upper.f.address, verdict: "✓ VALID · UPPERCASE, SAME SCRIPT", note: `BIP ${upper.f.source.bip} LINE ${upper.f.source.line} · COMPACT IN QR CODES`, mark: -1 },
    { text: mixedShown, verdict: `✕ REFUSED AT ${stageLabel("characters").toUpperCase()}: MIXED CASE`, note: `BIP ${mixed.f.source.bip} LINE ${mixed.f.source.line}`, mark: oddInShown },
  ];
  const desc =
    `${lower.f.address} and ${upper.f.address} are the same address in lower and upper case; both decode to ${lower.a.scriptPubKeyHex}. ` +
    `${m} mixes cases (an uppercase ${m[odd]} at position ${odd + 1}) and is refused at the first check.`;
  return (
    <>
      <Drawing id="a04-case" width={344} height={176} title="One case at a time" desc={desc}>
        {list.map((r, i) => {
          const y = 22 + i * 52;
          return (
            <g>
              <rect class={`k-cell ${i === 2 ? "k-fill--plain k-dashed" : "k-fill--plain"}`} x="8" y={y - 13} width={r.text.length * CH + 12} height="18" />
              {r.mark >= 0 ? <rect class="k-cell k-mark--plain" x={14 + r.mark * CH - 1} y={y - 11} width={CH + 2} height="14" /> : null}
              {[...r.text].map((c, j) => <text class={`k-value${j === r.mark ? " k-value--on" : ""}`} x={14 + j * CH + CH / 2} y={y} text-anchor="middle" style="font-size:9.5px">{c}</text>)}
              <Value at={[8, y + 18]} text={r.verdict} size={9} cls="k-value--label" />
              <Value at={[8, y + 30]} text={r.note} size={9} cls="k-value--muted" />
            </g>
          );
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact strings</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {rows.map((r) => <><dt>BIP {r.f.source.bip} line {r.f.source.line}</dt><dd><code class="atlas-break">{r.f.address}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
