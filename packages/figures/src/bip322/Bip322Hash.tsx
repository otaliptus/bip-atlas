import { Arrow, Cells, Drawing, Machine, Value, idsFor } from "../kit";
import type { DerivedBip322Fixture } from "../types";

/** BIP 322's message tag (a BIP constant; a test checks it equals the model's MESSAGE_TAG). */
export const TAG = "BIP0322-signed-message";

/**
 * bip322-message-hash.v1 — static. Two published vectors for the same
 * address with different messages: each message goes through the tagged
 * hash, and a different hash gives a different to_spend. Values from the
 * tested model; full hashes and IDs in a disclosure.
 */
export function Bip322Hash({ fixtures }: { fixtures: DerivedBip322Fixture[] }) {
  if (fixtures.length !== 2 || fixtures[0].derived.address !== fixtures[1].derived.address) throw new Error("bip322-message-hash.v1 needs two vectors for one address");
  const ids = idsFor("a18-hash");
  const row = (f: DerivedBip322Fixture, y: number) => {
    const d = f.derived;
    const msg = d.message.length > 18 ? `${d.message.slice(0, 18)}…` : d.message;
    return (
      <g>
        <rect class="k-outline k-fill--plain" x="12" y={y} width="130" height="24" />
        <text class="k-b3-v" x="17" y={y + 15}>{`“${msg}”`}</text>
        <Arrow d={`M144 ${y + 12} H160`} ids={ids} />
        <Machine at={[184, y + 26]} w={40} d={22} h={18} label="hash" role="hash" />
        <Arrow d={`M228 ${y + 12} H240`} ids={ids} />
        <Cells x={244} y={y + 3} values={d.messageHash.slice(0, 10).match(/.{2}/g)!} size={16} roleOf={() => "hash"} />
        <text class="k-b3-v" x="326" y={y + 15}>…</text>
        <text class="k-b3-l" x="244" y={y + 34}>{`TO_SPEND ${d.toSpend.txid.slice(0, 8)}…`}</text>
      </g>
    );
  };
  return (
    <>
      <Drawing
        id="a18-hash"
        width={344}
        height={130}
        title="One character, another hash"
        desc={`The message hash is the tagged hash with tag ${TAG} of the message, with no length prefix. ${fixtures.map((f) => `“${f.derived.message}” gives ${f.derived.messageHash} and to_spend ${f.derived.toSpend.txid}`).join("; ")}. Same address, different messages: unrelated hashes and different to_spend transactions.`}
      >
        <Value at={[12, 14]} text={`TAG “${TAG}” · NO LENGTH PREFIX`} size={8.5} cls="k-value--label" />
        {row(fixtures[0], 28)}
        {row(fixtures[1], 82)}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {fixtures.map((f) => <><dt>“{f.derived.message}”: hash, to_spend</dt><dd><code class="atlas-break">{f.derived.messageHash}</code><br /><code class="atlas-break">{f.derived.toSpend.txid}</code></dd></>)}
        </dl>
      </details>
    </>
  );
}
