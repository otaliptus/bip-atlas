import { Drawing, Value } from "../kit";
import type { DerivedBip322FormatsFixture } from "../types";

/** Split text into lines of at most `n` characters at word breaks. */
export function wrap(text: string, n: number): string[] {
  const out: string[] = [];
  for (const w of text.split(" ")) {
    const last = out[out.length - 1];
    if (last !== undefined && last.length + 1 + w.length <= n) out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  return out;
}

/**
 * bip322-formats.v1 — static. BIP 322's signature formats as four
 * envelopes, each stamped with its three-letter prefix, read from the
 * BIP's table at build time. Legacy is drawn dashed: it has no prefix and
 * may be used only for P2PKH.
 */
export function Bip322Formats({ fixture }: { fixture: DerivedBip322FormatsFixture }) {
  const rows = fixture.derived.rows;
  const h = 72;
  return (
    <>
      <Drawing
        id="a18-formats"
        width={344}
        height={rows.length * h + 30}
        title="Signature formats"
        desc={`BIP 322's formats: ${rows.map((r) => `${r.name}, prefix ${r.prefix}, for ${r.scripts}: ${r.format}`).join("; ")}. ¹ technically possible but SHOULD NOT be used; legacy MAY be used but MUST be restricted to P2PKH. ² excluding time-lock scripts.`}
      >
        {rows.map((r, i) => {
          const y = 8 + i * h, legacy = r.prefix === "n/a";
          return (
            <g data-format={r.name}>
              <rect class={`k-outline k-fill--plain${legacy ? " k-dashed" : ""}`} x="12" y={y} width="320" height={h - 8} rx="2" />
              <path class="k-leader" d={`M12 ${y} L172 ${y + 18} L332 ${y}`} />
              <rect class={`k-outline ${legacy ? "k-fill--plain k-dashed" : "k-mark--plain"}`} x="20" y={y + 12} width="40" height="22" rx="2" />
              <text class={`k-b3-h${legacy ? "" : " k-cell__t--on"}`} x="40" y={y + 27} text-anchor="middle">{legacy ? "—" : r.prefix}</text>
              <text class="k-b3-h" x="68" y={y + 30}>{r.name.toUpperCase()}</text>
              <text class="k-b3-l" x="68" y={y + 41}>{r.scripts}</text>
              {wrap(r.format, 50).map((l, k) => <text class="k-b3-v" x="68" y={y + 52 + k * 10}>{l}</text>)}
            </g>
          );
        })}
        <Value at={[12, rows.length * h + 20]} text="¹ SHOULD NOT · LEGACY MUST BE P2PKH ONLY · ² NO TIME LOCKS" size={8} cls="k-value--muted" />
      </Drawing>
      <p class="atlas-hero__source">Read from BIP 322’s “Types of Signatures” table (line {fixture.source.line}).</p>
    </>
  );
}
