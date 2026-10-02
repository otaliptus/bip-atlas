import { analyzeSegwitAddress } from "@bip-atlas/models/bech32";
import { Drawing, Responsive, Value } from "./kit";
import { ROLE_FILL } from "./AddressChecksumLab";
import { familyName, roleRuns } from "./describe";
import type { AddressFixture } from "./types";

/**
 * address-anatomy.v1 — static, opening. One valid public address as a ribbon
 * of characters, its five parts bracketed and named. Parts, program size and
 * checksum family come from the tested bech32 model.
 */
export function AddressAnatomy({ fixture }: { fixture: AddressFixture }) {
  const a = analyzeSegwitAddress(fixture.address, fixture.network);
  if (!a.valid) throw new Error(`address-anatomy.v1 needs a valid fixture; ${fixture.id} is not.`);
  const chars = [...fixture.address];
  const runs = roleRuns(a.roles);
  const bytes = a.programHex!.length / 2;
  const name = (role: string, n: number): [string, string] =>
    role === "hrp" ? ["PREFIX", fixture.network === "bc" ? "NETWORK: MAINNET" : "NETWORK: TESTNET"]
      : role === "separator" ? ["SEPARATOR", "ALWAYS 1"]
        : role === "version" ? ["VERSION", `WITNESS V${a.witnessVersion}`]
          : role === "program" ? ["PROGRAM", `${bytes} BYTES · ${n} CHARACTERS`]
            : ["CHECKSUM", `${familyName(a.encoding!).toUpperCase()} · NO INFORMATION`];
  const desc = `${fixture.address}: ${runs.map((r) => `${name(r.role, r.end - r.start).join(", ").toLowerCase()}: ${chars.slice(r.start, r.end).join("")}`).join("; ")}.`;
  const draw = (wide: boolean) => {
    const perRow = wide ? chars.length : Math.ceil(chars.length / 2);
    const cell = wide ? 14 : 15;
    const x0 = wide ? 12 : (330 - perRow * cell) / 2;
    const rowH = cell + 64;
    const at = (i: number): [number, number] => [x0 + (i % perRow) * cell, 72 + Math.floor(i / perRow) * rowH];
    // Split each run at a row break so every bracket sits on one row.
    const pieces = runs.flatMap((r) => {
      const out: Array<{ role: string; start: number; end: number; n: number; first: boolean }> = [];
      for (let s = r.start; s < r.end; ) {
        const e = Math.min(r.end, (Math.floor(s / perRow) + 1) * perRow);
        out.push({ role: r.role, start: s, end: e, n: r.end - r.start, first: s === r.start });
        s = e;
      }
      return out;
    });
    return (
      <>
        {chars.map((c, i) => {
          const [x, y] = at(i);
          const role = a.roles[i];
          return (
            <g>
              <rect class={`k-cell k-fill--${ROLE_FILL[role]}${role === "version" ? " k-cell--em" : ""}`} x={x} y={y} width={cell} height={cell + 4} />
              <text class="k-cell__t" x={x + cell / 2} y={y + cell / 2 + 5} text-anchor="middle" style="font-size:10px">{c}</text>
            </g>
          );
        })}
        {pieces.map((p) => {
          const [x1, y] = at(p.start);
          const x2 = at(p.end - 1)[0] + cell;
          if (!p.first) return <path class="k-leader" d={`M${x1} ${y + cell + 8} V${y + cell + 12} H${x2} V${y + cell + 8}`} />;
          const [title, sub] = name(p.role, p.n);
          const mid = (x1 + x2) / 2;
          // Prefix and separator are named above (two heights); the rest below.
          if (p.role === "hrp" || p.role === "separator") {
            const hi = p.role === "hrp";
            const top = y - (hi ? 40 : 14);
            return (
              <g class="k-label">
                <path class="k-leader" d={`M${mid} ${y - 2} V${top + 4}`} />
                <text x={mid - 2} y={top - 11} style="font-size:9px">{title}</text>
                <text class="k-value--muted" x={mid - 2} y={top} style="font-size:9px">{sub}</text>
              </g>
            );
          }
          const anchor = p.role === "version" ? "start" : p.role === "checksum" || !wide ? "end" : "middle";
          const tx = anchor === "start" ? x1 : anchor === "end" ? x2 : mid;
          return (
            <g class="k-label">
              <path class="k-leader" d={`M${x1} ${y + cell + 8} V${y + cell + 12} H${x2} V${y + cell + 8} M${mid} ${y + cell + 12} V${y + cell + 16}`} />
              <text x={tx} y={y + cell + 28} text-anchor={anchor} style="font-size:9px">{title}</text>
              <text class="k-value--muted" x={tx} y={y + cell + 39} text-anchor={anchor} style="font-size:9px">{sub}</text>
            </g>
          );
        })}
      </>
    );
  };
  return (
    <Responsive
      wide={<Drawing id="a04-anat-w" width={612} height={146} title="Anatomy of a SegWit address" desc={desc}>{draw(true)}</Drawing>}
      narrow={<Drawing id="a04-anat-n" width={330} height={232} title="Anatomy of a SegWit address" desc={desc}>{draw(false)}</Drawing>}
    />
  );
}
