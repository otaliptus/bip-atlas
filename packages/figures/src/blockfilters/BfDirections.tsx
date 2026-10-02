import { Cells, Computer, Drawing, Value, idsFor } from "../kit";
import type { DerivedBfBlockFixture } from "../types";
import { group } from "./parts";

/**
 * bf-two-directions.v1 — static. Who sends what. BIP 37: the light client
 * hands a full node a Bloom filter of its interests. BIP 157/158: the full
 * node serves each block's filter, drawn as the published filter of one
 * vector block, byte by byte, and the client tests its own scripts.
 */
export function BfDirections({ fixture }: { fixture: DerivedBfBlockFixture }) {
  const d = fixture.derived;
  const ids = idsFor("a16-dir");
  const cell = Math.min(9, 200 / d.filterBytes);
  return (
    <Drawing
      id="a16-dir"
      width={344}
      height={236}
      title="Two directions"
      desc={`Two scenes. BIP 37: the light client sends a full node a Bloom filter describing what it is interested in, and the node answers with matching data; the node learns what the client wants. BIPs 157 and 158: the full node builds one filter per block and serves it to anyone; drawn here is the published basic filter of testnet block ${d.height}, ${d.filterBytes} bytes. The client tests its own scripts against it and downloads the block only if one matches.`}
    >
      <Value at={[14, 14]} text="BIP 37 · THE CLIENT ASKS" size={8.5} cls="k-value--label" />
      <Computer at={[18, 26]} label="light client" />
      <Computer at={[300, 26]} label="full node" />
      <path class="k-line" d="M52 36 H290" marker-end={ids.arrow} />
      <Value at={[171, 30]} text="BLOOM FILTER OF ITS INTERESTS" size={8} anchor="middle" cls="k-value--label" />
      <path class="k-line k-dashed" d="M290 52 H52" marker-end={ids.arrow} />
      <Value at={[171, 64]} text="MATCHING DATA" size={8} anchor="middle" cls="k-value--muted" />
      <Value at={[326, 86]} text="LEARNS WHAT THE CLIENT WANTS" size={8} anchor="end" cls="k-value--label" />
      <line class="k-sep k-leader" x1="14" y1="104" x2="330" y2="104" />
      <Value at={[14, 124]} text="BIPS 157 · 158 · THE NODE PUBLISHES" size={8.5} cls="k-value--label" />
      <Computer at={[18, 136]} label="light client" />
      <Computer at={[300, 136]} label="full node" />
      <path class="k-line" d="M290 158 H52" marker-end={ids.arrow} />
      <Cells x={171 - (d.filterBytes * cell) / 2} y={140} values={Array(d.filterBytes).fill("")} size={cell} roleOf={() => "net"} text={false} />
      <Value at={[171, 166 + cell]} text={`FILTER OF BLOCK ${group(d.height)} · ${d.filterBytes} B`} size={8} anchor="middle" cls="k-value--label" />
      <Value at={[14, 200]} text="TESTS ITS OWN SCRIPTS" size={8} cls="k-value--label" />
      <Value at={[14, 212]} text="FETCHES THE BLOCK ONLY ON A MATCH" size={8} cls="k-value--label" />
      <Value at={[326, 200]} text="SAME FILTER FOR EVERYONE" size={8} anchor="end" cls="k-value--muted" />
    </Drawing>
  );
}
