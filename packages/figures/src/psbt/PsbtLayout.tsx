import { Drawing, Value, idsFor } from "../kit";
import { BytePacket, bytesHeight, layoutBytes, type ByteField } from "../tx/BytePacket";
import type { DerivedPsbtTraceFixture, PsbtStateView } from "../types";
import { mapTitle, recordRole, shortName } from "./cards";

const one = (n: number) => {
  if (n >= 0xfd) throw new Error("psbt-layout: multi-byte lengths are outside this drawing");
  return 1;
};

/**
 * A PSBT state laid out byte by byte: the magic, then each map's records
 * (key length, key type, key data, value length, value) and its 0x00
 * separator. Throws unless the fields add up to the published size.
 */
export function psbtBytes(state: PsbtStateView): ByteField[] {
  const out: ByteField[] = [{ id: "magic", short: "magic", bytes: 5, role: "plain" }];
  for (const m of state.maps) {
    const t = mapTitle(m.scope, m.index);
    m.records.forEach((r, k) => {
      const kd = r.keyDataHex.length / 2, v = r.valueHex.length / 2;
      out.push({ id: `${t}.${k}.keylen`, short: "len", bytes: one(1 + kd), role: "plain" });
      out.push({ id: `${t}.${k}.type`, short: "type", bytes: 1, role: "plain" });
      if (kd) out.push({ id: `${t}.${k}.keydata`, short: "key data", bytes: kd, role: recordRole(r) === "plain" ? "plain" : "public" });
      out.push({ id: `${t}.${k}.vallen`, short: "len", bytes: one(v), role: "plain" });
      out.push({ id: `${t}.${k}.value`, short: `${shortName(r)} · ${v} B`, bytes: v, role: recordRole(r) });
    });
    out.push({ id: `${t}.sep`, short: "00", bytes: 1, role: "plain", em: true });
  }
  const total = out.reduce((n, f) => n + f.bytes, 0);
  if (total !== state.bytes) throw new Error(`psbt-layout: fields add up to ${total} bytes, not ${state.bytes}`);
  return out;
}

/**
 * psbt-layout.v1 — static. The Creator's PSBT on a 32-byte ruler: five magic
 * bytes, one global record holding the unsigned transaction, and a 0x00
 * separator closing each map; the four input and output maps are nothing
 * but their separator.
 */
export function PsbtLayout({ fixture }: { fixture: DerivedPsbtTraceFixture }) {
  const state = fixture.derived.states[0];
  const ids = idsFor("a05-layout");
  const fields = psbtBytes(state);
  const perRow = 32, unit = 9.5, rowH = 22, gap = 3, x0 = 20, y0 = 90;
  const segs = layoutBytes(fields, perRow, x0, y0, unit, rowH, gap);
  const end = y0 + bytesHeight(state.bytes, perRow, rowH, gap);
  const first = (id: string) => segs.find((s) => s.field.id === id && s.first)!;
  const topLabels = [["magic", "magic · 70 73 62 74 ff"], ["global.0.keylen", "key length"], ["global.0.type", "key type 0x00"], ["global.0.vallen", "value length"]] as const;
  const seps = state.maps.map((m) => ({ id: `${mapTitle(m.scope, m.index)}.sep`, text: m.records.length ? `${mapTitle(m.scope, m.index)} map ends` : `${mapTitle(m.scope, m.index)} map · empty` }));
  const H = end + 18 + seps.length * 12 + 16;
  return (
    <Drawing
      id="a05-layout"
      width={344}
      height={H}
      title="A newly created PSBT, byte by byte"
      desc={`The Creator's PSBT from BIP 174 line ${state.line}, ${state.bytes} bytes: the magic bytes 70 73 62 74 ff, then the global map with one record (key length, key type 0x00, value length, and the ${state.maps[0].records[0]?.valueHex.length / 2}-byte unsigned transaction), ended by 0x00; then ${state.maps.length - 1} input and output maps, each empty and so just its 0x00 separator.`}
    >
      <Value at={[x0, 14]} text={`CREATED PSBT · ${state.bytes} BYTES · BIP 174 LINE ${state.line}`} size={9} cls="k-value--label" />
      <BytePacket segs={segs} hatch={ids.hatch} ruler perRow={perRow} unit={unit} x={x0} y={y0} rowH={rowH} />
      {topLabels.map(([id, text], i) => {
        const s = first(id);
        const cx = s.x + s.w / 2, ly = y0 - 22 - 12 * (topLabels.length - 1 - i);
        return (
          <g class="k-label">
            <path class="k-leader" d={`M${cx} ${y0} V${ly} H${x0 + 12 * unit}`} />
            <text x={x0 + 12 * unit + 4} y={ly + 3.3}>{text.toUpperCase()}</text>
          </g>
        );
      })}
      {seps.map((sp, i) => {
        const s = first(sp.id);
        const cx = s.x + s.w / 2, ly = end + 10 + 12 * (seps.length - 1 - i);
        return (
          <g class="k-label">
            <path class="k-leader" d={`M${cx} ${s.y + rowH} V${ly} H${x0 + 12 * unit}`} />
            <text x={x0 + 12 * unit + 4} y={ly + 3.3}>{sp.text.toUpperCase()}</text>
          </g>
        );
      })}
    </Drawing>
  );
}
