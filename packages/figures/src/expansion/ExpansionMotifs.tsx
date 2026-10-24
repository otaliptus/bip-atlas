import { Arrow, Cells, Computer, IsoBox, KeyGlyph, Lamp, Machine, Packet, Value, type DrawingIds } from "../kit";
import type { ExpansionMotifKind } from "./types";

export function ExpansionMotif({ kind, width, ids }: { kind: ExpansionMotifKind; width: number; ids: DrawingIds }) {
  const wide = width > 400;
  if (kind === "records") {
    return (
      <g data-motif={kind}>
        {wide ? (
          <>
            <Value at={[20, 18]} text="PSBTV0 · ONE UNSIGNED TRANSACTION" size={9} cls="k-value--label" />
            <IsoBox at={[40, 90]} w={82} d={42} h={26} />
            <Value at={[20, 44]} text="unsigned tx" size={9} />
            <Arrow d="M142 58 H174" ids={ids} />
            <Machine at={[194, 76]} w={54} d={30} h={24} label="V2" role="hash" />
            <Arrow d="M258 56 H290" ids={ids} />
            <Cells x={306} y={26} values={["in", "out"]} size={34} roleOf={() => "public"} />
            <KeyGlyph at={[392, 36]} role="public" />
            <Value at={[306, 82]} text="counts + input / output maps" size={9} />
            <Value at={[306, 103]} text="keys + trees + signing rounds" size={9} />
            <Value at={[20, 142]} text="Construction becomes inspectable records — not a signing decision." size={9.5} />
          </>
        ) : (
          <>
            <Value at={[20, 16]} text="PSBTV0" size={9} cls="k-value--label" />
            <IsoBox at={[32, 72]} w={58} d={32} h={20} />
            <Arrow d="M108 48 H134" ids={ids} />
            <Machine at={[150, 62]} w={40} d={24} h={20} label="V2" role="hash" />
            <Cells x={210} y={24} values={["in", "out"]} size={26} roleOf={() => "public"} />
            <KeyGlyph at={[274, 28]} role="public" scale={0.75} />
            <Value at={[20, 106]} text="unsigned tx → counts + input/output maps" size={9} />
            <Value at={[20, 132]} text="Records to inspect, not permission to sign." size={9} />
          </>
        )}
      </g>
    );
  }
  if (kind === "relay") {
    return (
      <g data-motif={kind}>
        {wide ? (
          <>
            <Value at={[20, 18]} text="TRANSACTIONS ALREADY KNOWN" size={9} cls="k-value--label" />
            <Cells x={24} y={32} values={["tx", "tx", "tx"]} size={30} perRow={1} roleOf={() => "public"} />
            <Value at={[68, 58]} text="local" size={9} />
            <Value at={[68, 87]} text="mempool" size={9} />
            <Arrow d="M116 68 H148" ids={ids} />
            <Machine at={[168, 86]} w={62} d={32} h={24} label="48 bits" role="hash" />
            <Arrow d="M242 62 H278" ids={ids} />
            <Cells x={290} y={38} values={["a1", "b2"]} size={30} roleOf={() => "check"} />
            <Arrow d="M362 54 H390" ids={ids} />
            <Computer at={[408, 42]} label="node" />
            <Value at={[290, 108]} text="match locally · request only gaps" size={9} />
            <Value at={[20, 142]} text="Six-byte hints stand for transactions, not their full identity." size={9.5} />
          </>
        ) : (
          <>
            <Cells x={20} y={24} values={["tx", "tx", "tx"]} size={26} roleOf={() => "public"} />
            <Arrow d="M108 40 H130" ids={ids} />
            <Machine at={[148, 56]} w={42} d={24} h={20} label="48 bits" role="hash" />
            <Arrow d="M200 40 H224" ids={ids} />
            <Cells x={234} y={24} values={["a1", "b2"]} size={26} roleOf={() => "check"} />
            <Computer at={[294, 20]} />
            <Value at={[20, 102]} text="known tx → six-byte hints" size={9} />
            <Value at={[20, 126]} text="missing tx → full-data request" size={9} />
            <Value at={[20, 152]} text="A hint is not a unique identity." size={9} cls="k-value--label" />
          </>
        )}
      </g>
    );
  }
  if (kind === "replacement") {
    return (
      <g data-motif={kind}>
        {wide ? (
          <>
            <Value at={[20, 20]} text="SAME INPUT · NEW FEE" size={9} cls="k-value--label" />
            <IsoBox at={[42, 104]} w={78} d={40} h={22} />
            <IsoBox at={[132, 90]} w={78} d={40} h={34} role="public" />
            <Arrow d="M244 58 H278" ids={ids} />
            <Machine at={[298, 76]} w={62} d={32} h={24} label="5 gates" role="check" />
            <Lamp at={[408, 48]} state="on" />
            <Value at={[376, 84]} text="policy pass" size={9} />
            <Value at={[20, 144]} text="Mempool policy — not a confirmation promise." size={9.5} />
          </>
        ) : (
          <>
            <Value at={[20, 18]} text="SAME INPUT · NEW FEE" size={9} cls="k-value--label" />
            <IsoBox at={[26, 78]} w={58} d={30} h={18} />
            <IsoBox at={[90, 70]} w={58} d={30} h={26} role="public" />
            <Arrow d="M166 48 H188" ids={ids} />
            <Machine at={[204, 62]} w={44} d={26} h={20} label="5 gates" role="check" />
            <Lamp at={[284, 42]} state="on" />
            <Value at={[20, 112]} text="candidate pays for its own bandwidth" size={9} />
            <Value at={[20, 142]} text="policy pass ≠ relay or confirmation" size={9} cls="k-value--label" />
          </>
        )}
      </g>
    );
  }
  if (kind === "instruction") {
    return (
      <g data-motif={kind}>
        {wide ? (
          <>
            <Value at={[20, 34]} text="bitcoin:" size={14} />
            <rect class="k-cell k-fill--public" x={92} y={12} width={140} height={30} />
            <Value at={[102, 32]} text="address / empty" size={9} />
            <rect class="k-cell k-fill--hash" x={240} y={12} width={90} height={30} />
            <Value at={[250, 32]} text="amount" size={9} />
            <rect class="k-cell k-fill--net" x={338} y={12} width={112} height={30} />
            <Value at={[348, 32]} text="lightning" size={9} />
            <rect class="k-cell k-fill--check" x={458} y={12} width={56} height={30} />
            <Value at={[476, 32]} text="sp" size={9} />
            <Value at={[20, 70]} text="One instruction can offer several payment methods." size={9} />
            <Arrow d="M20 98 H164" ids={ids} label="parse" at={[92, 90]} />
            <Computer at={[184, 78]} label="you" />
            <Value at={[238, 102]} text="inspect → choose → authorize" size={9.5} />
            <Value at={[20, 142]} text="The URI does not pay by itself." size={9.5} />
          </>
        ) : (
          <>
            <Value at={[20, 28]} text="bitcoin:" size={12} />
            <rect class="k-cell k-fill--public" x={88} y={10} width={92} height={26} />
            <Value at={[94, 27]} text="address / empty" size={9} />
            <rect class="k-cell k-fill--check" x={186} y={10} width={34} height={26} />
            <Value at={[197, 27]} text="sp" size={9} />
            <rect class="k-cell k-fill--net" x={226} y={10} width={84} height={26} />
            <Value at={[234, 27]} text="lightning" size={9} />
            <Value at={[20, 62]} text="address? amount=… · lightning=… · sp=…" size={9} />
            <Arrow d="M20 92 H112" ids={ids} label="parse" at={[66, 84]} />
            <Computer at={[132, 76]} label="you" />
            <Value at={[182, 96]} text="authorize" size={9} />
            <Value at={[20, 142]} text="instruction ≠ payment · callback ≠ web page" size={9} cls="k-value--label" />
          </>
        )}
      </g>
    );
  }
  return (
    <g data-motif={kind}>
      {wide ? (
        <>
          <Value at={[20, 20]} text="LEGACY ADDR" size={9} cls="k-value--label" />
          <Cells x={20} y={30} values={Array.from({ length: 16 }, () => "")} size={12} />
          <Value at={[20, 64]} text="16 bytes · one IP shape" size={9} />
          <Arrow d="M224 44 H262" ids={ids} />
          <Value at={[20, 106]} text="ADDRV2" size={9} cls="k-value--label" />
          <Packet x={20} y={116} perRow={34} unit={10} rowH={22} fields={[{ id: "network", label: "network ID", bytes: 1, role: "net" }, { id: "length", label: "length", bytes: 1, role: "check" }, { id: "address", label: "address", bytes: 32, role: "public" }]} />
          <Value at={[390, 126]} text="network ID + length + address" size={9} />
          <Value at={[390, 148]} text="Tor v3 · I2P · CJDNS · Yggdrasil" size={10} />
        </>
      ) : (
        <>
          <Value at={[20, 18]} text="LEGACY · 16-BYTE IP" size={9} cls="k-value--label" />
          <Cells x={20} y={28} values={Array.from({ length: 16 }, () => "")} size={10} />
          <Arrow d="M192 36 H222" ids={ids} />
          <Value at={[234, 40]} text="addrv2" size={9} />
          <Packet x={20} y={74} perRow={34} unit={8} rowH={22} fields={[{ id: "network", label: "network ID", bytes: 1, role: "net" }, { id: "length", label: "length", bytes: 1, role: "check" }, { id: "address", label: "address", bytes: 32, role: "public" }]} />
          <Value at={[20, 116]} text="network ID + length + address bytes" size={9} />
          <Value at={[20, 142]} text="Tor v3 · I2P · CJDNS · Yggdrasil" size={10} />
        </>
      )}
    </g>
  );
}
