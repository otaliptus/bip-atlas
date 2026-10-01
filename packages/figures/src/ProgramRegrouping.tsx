import { analyzeSegwitAddress, bytesToFiveBitGroups } from "@bip-atlas/models/bech32";
import { hexToBytes } from "@bip-atlas/models/hex";
import type { AddressFixture } from "./types";

interface Props {
  /** [head fixture, tail fixture]: the start of one program and the padded end of another. */
  fixtures: AddressFixture[];
}

const BIT = 16;
const LEFT = 92;
const RIGHT = 12;

interface Slice {
  title: string;
  fixture: AddressFixture;
  /** First byte shown; byteStart * 8 must be a multiple of 5 so groups align. */
  byteStart: number;
  byteEnd: number;
}

/**
 * program-regrouping.v1 — static SVG. All bits, values and characters come
 * from the tested model; the render throws (failing the build) if the
 * regrouped characters do not match the fixture's own characters.
 */
export function ProgramRegrouping({ fixtures }: Props) {
  const [head, tail] = fixtures;
  const tailBytes = analyzeSegwitAddress(tail.address, tail.network).programHex!.length / 2;
  const slices: Slice[] = [
    { title: "Start of a 20-byte program", fixture: head, byteStart: 0, byteEnd: 5 },
    { title: `End of a ${tailBytes}-byte program`, fixture: tail, byteStart: tailBytes - 2, byteEnd: tailBytes },
  ];
  return (
    <div class="atlas-regroup">
      {slices.map((slice) => (
        <RegroupPanel slice={slice} />
      ))}
      <details class="atlas-disclosure">
        <summary>Exact programs, in full</summary>
        <dl class="atlas-hexlist">
          {fixtures.map((f) => {
            const a = analyzeSegwitAddress(f.address, f.network);
            return (
              <>
                <dt>{f.label} · {a.programHex!.length / 2} bytes</dt>
                <dd><code>{a.programHex!.match(/.{1,8}/g)!.join(" ")}</code></dd>
              </>
            );
          })}
        </dl>
      </details>
    </div>
  );
}

function RegroupPanel({ slice }: { slice: Slice }) {
  const analysis = analyzeSegwitAddress(slice.fixture.address, slice.fixture.network);
  if (!analysis.valid) throw new Error(`program-regrouping.v1 needs a valid fixture; ${slice.fixture.id} is not.`);
  const program = hexToBytes(analysis.programHex!);
  if ((slice.byteStart * 8) % 5 !== 0) throw new Error("Slice must start on a shared byte/character boundary.");

  const allGroups = bytesToFiveBitGroups(program);
  const bytes = [...program.slice(slice.byteStart, slice.byteEnd)];
  const firstGroup = (slice.byteStart * 8) / 5;
  const isEnd = slice.byteEnd === program.length;
  const lastGroup = isEnd ? allGroups.length : Math.ceil((slice.byteEnd * 8) / 5);
  const groups = allGroups.slice(firstGroup, lastGroup);

  // Where these characters sit in the address (1-based positions).
  const versionIndex = slice.fixture.address.lastIndexOf("1") + 1;
  const firstPos = versionIndex + 2 + firstGroup;
  const shown = groups.map((g) => g.char).join("");
  const actual = slice.fixture.address.slice(firstPos - 1, firstPos - 1 + groups.length).toLowerCase();
  if (shown !== actual) throw new Error(`Regrouping mismatch for ${slice.fixture.id}: ${shown} vs ${actual}`);

  const dataBits = bytes.length * 8;
  const totalBits = groups.length * 5;
  const width = LEFT + totalBits * BIT + RIGHT;
  const height = 150;
  const x = (bit: number) => LEFT + bit * BIT;
  const bits = bytes.flatMap((b) => [...b.toString(2).padStart(8, "0")]);
  const y = { hex: 16, byteTop: 24, bitTop: 36, bitBottom: 60, groupTick: 70, value: 86, charTop: 96, charBottom: 124 };
  const label = `${slice.title}: bytes ${slice.byteStart + 1} to ${slice.byteEnd} (${bytes
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ")}) regroup into characters ${shown}, positions ${firstPos} to ${firstPos + groups.length - 1} of the address${
    totalBits > dataBits ? `, with ${totalBits - dataBits} zero bits of padding` : ""
  }.`;

  return (
    <figure class="atlas-regroup__panel">
      <figcaption class="atlas-regroup__title">
        {slice.title} <span>· {slice.fixture.label}</span>
      </figcaption>
      <p class="atlas-scroll-hint" aria-hidden="true">Scroll sideways to see every bit →</p>
      <div class="atlas-scroll" tabIndex={0} role="region" aria-label={`${slice.title}, scrollable`}>
        <svg
          class="atlas-regroup__svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={label}
        >
          <defs>
            <pattern id={`hatch-${slice.fixture.id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" class="atlas-svg-hatch" />
            </pattern>
          </defs>
          <text x={0} y={y.hex} class="atlas-svg-rowlabel">bytes (hex)</text>
          <text x={0} y={y.bitTop + 16} class="atlas-svg-rowlabel">bits</text>
          <text x={0} y={y.value} class="atlas-svg-rowlabel">5-bit value</text>
          <text x={0} y={y.charTop + 19} class="atlas-svg-rowlabel">character</text>

          {bytes.map((b, i) => (
            <g>
              <text x={x(i * 8 + 4)} y={y.hex} class="atlas-svg-hex" text-anchor="middle">
                {b.toString(16).padStart(2, "0")}
              </text>
              <rect x={x(i * 8)} y={y.byteTop} width={8 * BIT} height={y.bitBottom - y.byteTop} class="atlas-svg-byte" />
            </g>
          ))}

          {Array.from({ length: totalBits }, (_, i) => {
            const padding = i >= dataBits;
            return (
              <g>
                <rect
                  x={x(i)}
                  y={y.bitTop}
                  width={BIT}
                  height={y.bitBottom - y.bitTop}
                  class={padding ? "atlas-svg-bit atlas-svg-bit--pad" : "atlas-svg-bit"}
                  fill={padding ? `url(#hatch-${slice.fixture.id})` : undefined}
                />
                <text x={x(i) + BIT / 2} y={y.bitBottom - 7} class="atlas-svg-bittext" text-anchor="middle">
                  {padding ? "0" : bits[i]}
                </text>
              </g>
            );
          })}

          {groups.map((g, i) => {
            const left = x(i * 5);
            const right = x(i * 5 + 5);
            return (
              <g>
                <path d={`M${left + 1} ${y.groupTick - 6} V${y.groupTick} H${right - 1} V${y.groupTick - 6}`} class="atlas-svg-bracket" />
                <text x={(left + right) / 2} y={y.value} class="atlas-svg-value" text-anchor="middle">{g.value}</text>
                <rect x={left + 2} y={y.charTop} width={5 * BIT - 4} height={y.charBottom - y.charTop} class={g.padded ? "atlas-svg-char atlas-svg-char--pad" : "atlas-svg-char"} />
                <text x={(left + right) / 2} y={y.charBottom - 8} class="atlas-svg-chartext" text-anchor="middle">{g.char}</text>
              </g>
            );
          })}

          {Array.from({ length: Math.floor(totalBits / 40) + 1 }, (_, k) => k * 40)
            .filter((bit) => bit <= dataBits)
            .map((bit) => (
              <line x1={x(bit)} x2={x(bit)} y1={y.byteTop - 6} y2={y.charBottom + 6} class="atlas-svg-align" />
            ))}

          {totalBits > dataBits ? (
            <text x={x(dataBits) + ((totalBits - dataBits) * BIT) / 2} y={y.charBottom + 20} class="atlas-svg-note" text-anchor="middle">
              padding
            </text>
          ) : null}
        </svg>
      </div>
      <p class="atlas-regroup__foot">
        Characters {firstPos}–{firstPos + groups.length - 1} of <code>{slice.fixture.address}</code>
      </p>
    </figure>
  );
}
