import { analyzeSegwitAddress, bytesToFiveBitGroups } from "@bip-atlas/models/bech32";
import { hexToBytes } from "@bip-atlas/models/hex";
import { Cells, Drawing } from "./kit";
import type { AddressFixture } from "./types";

const B = 7; // one bit
const X = 12;

interface Slice {
  title: string;
  fixture: AddressFixture;
  /** First byte shown; byteStart * 8 must be a multiple of 5 so groups align. */
  byteStart: number;
  byteEnd: number;
}

/**
 * program-regrouping.v1 — static. The same bits cut two ways: into 8-bit
 * bytes above, 5-bit characters below. All bits, values and characters come
 * from the tested model; the figure throws (failing the build) if the
 * regrouped characters differ from the address's own characters.
 */
export function ProgramRegrouping({ fixtures }: { fixtures: AddressFixture[] }) {
  const [head, tail] = fixtures;
  const tailBytes = analyzeSegwitAddress(tail.address, tail.network).programHex!.length / 2;
  const slices: Slice[] = [
    { title: "START OF A 20-BYTE PROGRAM", fixture: head, byteStart: 0, byteEnd: 5 },
    { title: `END OF A ${tailBytes}-BYTE PROGRAM`, fixture: tail, byteStart: tailBytes - 2, byteEnd: tailBytes },
  ];
  const panels = slices.map(panel);
  const H = panels.reduce((a, p) => a + p.h, 0) + 8;
  let y = 8;
  return (
    <>
      <Drawing id="a04-regroup" width={344} height={H} title="Eight-bit bytes, five-bit characters" desc={panels.map((p) => p.desc).join(" ")}>
        {panels.map((p) => {
          const at = y;
          y += p.h;
          return p.draw(at);
        })}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact programs, in full</summary>
        <dl class="atlas-hexlist atlas-hexlist--case">
          {fixtures.map((f) => {
            const a = analyzeSegwitAddress(f.address, f.network);
            return <><dt>{f.label} · {a.programHex!.length / 2} bytes</dt><dd><code class="atlas-break">{a.programHex}</code></dd></>;
          })}
        </dl>
      </details>
    </>
  );
}

function panel(slice: Slice) {
  const a = analyzeSegwitAddress(slice.fixture.address, slice.fixture.network);
  if (!a.valid) throw new Error(`program-regrouping.v1 needs a valid fixture; ${slice.fixture.id} is not.`);
  const program = hexToBytes(a.programHex!);
  if ((slice.byteStart * 8) % 5 !== 0) throw new Error("Slice must start on a shared byte/character boundary.");
  const all = bytesToFiveBitGroups(program);
  const bytes = [...program.slice(slice.byteStart, slice.byteEnd)];
  const firstGroup = (slice.byteStart * 8) / 5;
  const isEnd = slice.byteEnd === program.length;
  const groups = all.slice(firstGroup, isEnd ? all.length : Math.ceil((slice.byteEnd * 8) / 5));
  const versionIndex = slice.fixture.address.lastIndexOf("1") + 1;
  const firstPos = versionIndex + 2 + firstGroup;
  const shown = groups.map((g) => g.char).join("");
  const actual = slice.fixture.address.slice(firstPos - 1, firstPos - 1 + groups.length).toLowerCase();
  if (shown !== actual) throw new Error(`Regrouping mismatch for ${slice.fixture.id}: ${shown} vs ${actual}`);
  const bits = bytes.flatMap((b) => [...b.toString(2).padStart(8, "0")]);
  const dataBits = bits.length;
  const totalBits = groups.length * 5;
  const pad = totalBits - dataBits;
  const desc =
    `${slice.title.toLowerCase()} (${slice.fixture.label}): bytes ${bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ")}, bits ${bits.join("")}${pad ? ` plus ${pad} zero bits of padding` : ""}, ` +
    `cut into 5-bit groups ${groups.map((g) => `${g.bits} = ${g.value} = ${g.char}`).join(", ")}: characters ${firstPos} to ${firstPos + groups.length - 1} of the address.`;
  const h = 138;
  return {
    h,
    desc,
    draw: (y0: number) => {
      const yb = y0 + 34; // bit row
      return (
        <g>
          <text class="k-value k-value--label" x={X} y={y0 + 10} style="font-size:9px">{`${slice.title} · CHARACTERS ${firstPos}–${firstPos + groups.length - 1}`}</text>
          {bytes.map((b, i) => (
            <g class="k-label">
              <path class="k-leader" d={`M${X + i * 8 * B + 1} ${yb - 4} V${yb - 8} H${X + (i + 1) * 8 * B - 1} V${yb - 4}`} />
              <text x={X + i * 8 * B + 4 * B} y={yb - 12} text-anchor="middle" style="font-size:9.5px">{b.toString(16).padStart(2, "0")}</text>
            </g>
          ))}
          <Cells x={X} y={yb} values={bits} size={B} roleOf={() => "plain"} strong={(i) => bits[i] === "1"} text={false} />
          {Array.from({ length: pad }, (_, i) => (
            <rect class="k-cell k-fill--plain k-dashed" x={X + (dataBits + i) * B} y={yb} width={B} height={B} />
          ))}
          {groups.map((g, i) => {
            const x1 = X + i * 5 * B, x2 = X + (i + 1) * 5 * B;
            return (
              <g>
                <path class="k-leader" d={`M${x1 + 1} ${yb + B + 4} V${yb + B + 8} H${x2 - 1} V${yb + B + 4}`} />
                <text class="k-value k-value--muted" x={(x1 + x2) / 2} y={yb + B + 20} text-anchor="middle" style="font-size:9px">{g.value}</text>
                <rect class={`k-cell k-fill--plain${g.padded ? " k-dashed" : ""}`} x={x1 + 3} y={yb + B + 26} width={5 * B - 6} height="20" />
                <text class="k-value" x={(x1 + x2) / 2} y={yb + B + 40} text-anchor="middle" style="font-size:11px">{g.char}</text>
              </g>
            );
          })}
          {Array.from({ length: Math.floor(dataBits / 40) + 1 }, (_, k) => k * 40).filter((b) => b <= dataBits && b > 0).map((b) => (
            <line class="k-cut" x1={X + b * B} y1={yb - 10} x2={X + b * B} y2={yb + B + 48} />
          ))}
          <text class="k-value k-value--muted" x={X} y={yb + B + 66} style="font-size:9px">{pad ? `DASHED: ${pad} ZERO BITS OF PADDING` : "BLACK = 1 · BYTES ALIGN WITH CHARACTERS EVERY 40 BITS"}</text>
        </g>
      );
    },
  };
}
