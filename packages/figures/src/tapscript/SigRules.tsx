import { SIGOP_COST } from "@bip-atlas/models/tapscript";
import { Arrow, Drawing, Value, idsFor, wrapLines } from "../kit";
import type { DerivedTapscriptFixture } from "../types";

type Bin = "empty-key" | "empty" | "valid" | "invalid" | "unknown-key-type";

/** BIP 342's rules for a signature opcode, one tray per shape of key and signature. */
const TRAYS: Array<{ bins: Bin[]; head: string; body: string; cost: string }> = [
  { bins: ["empty-key"], head: "EMPTY KEY", body: "The script fails at once.", cost: "MUST FAIL" },
  { bins: ["empty"], head: "EMPTY SIG", body: "Not checked. CHECKSIG pushes empty, CHECKSIGADD pushes n, VERIFY fails.", cost: "COSTS 0" },
  { bins: ["valid", "invalid"], head: "32-BYTE KEY", body: "BIP 340 check. Valid: push 1 or n + 1. Invalid: the script fails.", cost: `COSTS ${SIGOP_COST}` },
  { bins: ["unknown-key-type"], head: "OTHER KEY", body: "Unknown key type: not checked, counts as a success.", cost: `COSTS ${SIGOP_COST}` },
];

/**
 * tapscript-sig-rules.v1 — static. What CHECKSIG, CHECKSIGVERIFY and
 * CHECKSIGADD do with each shape of key and signature, as a sorting tray.
 * Under each tray, the recorded Core witnesses that land in it, read from
 * the traces (not typed in).
 */
export function SigRules({ fixtures }: { fixtures: DerivedTapscriptFixture[] }) {
  const seen = new Map<Bin, string[]>();
  const note = (b: Bin, s: string) => seen.set(b, [...new Set([...(seen.get(b) ?? []), s])]);
  for (const f of fixtures) {
    for (const which of ["success", "failure"] as const) {
      const v = f.derived[which];
      const tag = `${f.caseIndex} ${which === "success" ? "✓" : "✕"}`;
      for (const s of v.steps) {
        if (s.sig) note(s.sig.check as Bin, tag);
        else if (s.failed && /public key is empty/.test(s.note)) note("empty-key", tag);
      }
    }
  }
  const ids = idsFor("a08-sigrules");
  const trayW = 78, gap = 4, x0 = 10, top = 66;
  const desc =
    `A signature opcode pops a public key and a signature (CHECKSIGADD also pops a number n). ` +
    TRAYS.map((t) => `${t.head.toLowerCase()}: ${t.body} ${t.cost.toLowerCase()}; recorded witnesses here: ${t.bins.flatMap((b) => seen.get(b) ?? []).join(", ") || "none"}.`).join(" ") +
    ` Too few stack elements, or an n longer than 4 bytes, also fail the script.`;
  return (
    <Drawing id="a08-sigrules" width={344} height={top + 168 + Math.max(...TRAYS.map((t) => t.bins.flatMap((b) => seen.get(b) ?? []).length)) * 11} title="What a signature opcode does" desc={desc}>
      <Value at={[172, 14]} text="POP A KEY AND A SIGNATURE" size={9} anchor="middle" cls="k-value--label" />
      <path class="k-outline k-fill--plain" d="M80 22 H264 L206 50 H138 Z" />
      <Value at={[172, 34]} text="SIGNATURE OPCODES" size={8} anchor="middle" />
      {TRAYS.map((t, i) => {
        const x = x0 + i * (trayW + gap);
        const cases = t.bins.flatMap((b) => seen.get(b) ?? []);
        const lines = wrapLines(t.body, 14);
        return (
          <g data-tray={t.bins.join(" ")}>
            <Arrow d={`M172 50 L${x + trayW / 2} ${top - 4}`} ids={ids} />
            <path class="k-outline k-fill--plain" d={`M${x} ${top} V${top + 140} H${x + trayW} V${top}`} />
            <Value at={[x + 5, top + 14]} text={t.head} size={8.5} cls="k-value--label" />
            {lines.map((l, k) => <Value at={[x + 5, top + 30 + k * 11]} text={l} size={8} />)}
            <Value at={[x + 5, top + 132]} text={t.cost} size={8} cls="k-value--label" />
            <Value at={[x + 2, top + 156]} text="RECORDED:" size={7.5} cls="k-value--muted" />
            {cases.map((c, k) => <Value at={[x + 2, top + 168 + k * 11]} text={`case ${c}`} size={8} />)}
          </g>
        );
      })}
    </Drawing>
  );
}
