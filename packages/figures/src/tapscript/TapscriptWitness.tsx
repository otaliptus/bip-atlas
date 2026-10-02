import { Drawing, Value, wrapLines } from "../kit";
import type { DerivedTapscriptFixture } from "../types";
import { elementRole } from "./common";

/**
 * tapscript-witness.v1 — static. One recorded script path witness, item by
 * item, with two brackets: BIP 341 takes the last two items (script and
 * control block) and checks the commitment; BIP 342 runs the script on the
 * items before it. Values from the recorded Core case; exact ones disclosed.
 */
export function TapscriptWitness({ fixture }: { fixture: DerivedTapscriptFixture }) {
  const v = fixture.derived.success;
  if (v.witness.annexBytes) throw new Error(`${fixture.id}: the figure draws a witness without an annex`);
  const scriptBytes = v.scriptHex.length / 2;
  const cbBytes = v.witness.controlHex.length / 2;
  if (cbBytes !== 33 + 32 * v.witness.siblings) throw new Error(`${fixture.id}: control block size does not match its sibling count`);
  const rows = [
    ...v.initialStack.map((id, n) => {
      const e = v.elements[id];
      return { kind: "stack", text: `item ${n} · ${e.label}`, role: elementRole(e), dashed: e.bytes === 0 };
    }),
    { kind: "script", text: `item ${v.initialStack.length} · script · ${scriptBytes} B`, role: "plain" as const, dashed: false },
    { kind: "control", text: `item ${v.initialStack.length + 1} · control block · ${cbBytes} B`, role: "plain" as const, dashed: false },
  ];
  const rowH = 30, top = 40, x = 14, w = 196;
  const y = (i: number) => top + i * rowH;
  const n = rows.length;
  const opsLines = wrapLines(v.ops.map((o) => o.name).join(" "), 54);
  const H = y(n) + 34 + opsLines.length * 12;
  const desc =
    `The success witness of Bitcoin Core test case ${fixture.caseIndex} has ${v.witness.items} items. ` +
    rows.map((r) => r.text).join("; ") +
    `. The control block is a byte of leaf version 0xc0 and parity, the 32-byte internal key and ${v.witness.siblings} sibling hashes. ` +
    `BIP 341 uses the last two items to check that the output key commits to this script. BIP 342 then runs the script, ${v.ops.map((o) => o.name).join(" ")}, starting from the items before it as the stack.`;
  return (
    <>
      <Drawing id="a08-witness" width={344} height={H} title="Two specifications, one witness" desc={desc}>
        <Value at={[x, 12]} text={`WITNESS · CORE CASE ${fixture.caseIndex} · ${v.witness.items} ITEMS`} size={8.5} cls="k-value--label" />
        <Value at={[x, 26]} text="ITEM 0 IS THE STACK BOTTOM" size={8.5} cls="k-value--muted" />
        {rows.map((r, i) =>
          r.kind === "control" ? (
            <g>
              <rect class="k-cell k-fill--plain" x={x} y={y(i)} width="8" height="22" />
              <rect class="k-cell k-fill--public" x={x + 8} y={y(i)} width="36" height="22" />
              <rect class="k-cell k-fill--hash" x={x + 44} y={y(i)} width={w - 44} height="22" />
              <Value at={[x + 12, y(i) + 15]} text="P" size={9} />
              <Value at={[x + 50, y(i) + 15]} text={`${v.witness.siblings} hashes · ${cbBytes} B`} size={9} />
              <Value at={[x, y(i) + 32]} text="CONTROL BLOCK: VERSION · KEY · SIBLINGS" size={7.5} cls="k-value--muted" />
            </g>
          ) : (
            <g>
              <rect class={`k-cell k-fill--${r.role}${r.dashed ? " k-dashed" : ""}`} x={x} y={y(i)} width={w} height="22" />
              <Value at={[x + 6, y(i) + 15]} text={r.text} size={9} />
            </g>
          ),
        )}
        {/* BIP 342: the items before the script, plus the script it runs */}
        <path class="k-leader" d={`M${x + w + 6} ${y(0)} H${x + w + 12} V${y(n - 2) + 22} H${x + w + 6}`} />
        <Value at={[x + w + 18, y(0) + 12]} text="BIP 342" size={9} cls="k-value--label" />
        <Value at={[x + w + 18, y(0) + 24]} text="RUNS THE SCRIPT" size={8} cls="k-value--muted" />
        <Value at={[x + w + 18, y(0) + 35]} text="ON THE ITEMS" size={8} cls="k-value--muted" />
        <Value at={[x + w + 18, y(0) + 46]} text="BEFORE IT" size={8} cls="k-value--muted" />
        {/* BIP 341: script and control block */}
        <path class="k-leader" d={`M${x + w + 6} ${y(n - 2) + 4} H${x + w + 52} V${y(n - 1) + 22} H${x + w + 6}`} />
        <Value at={[x + w + 58, y(n - 2) + 20]} text="BIP 341" size={9} cls="k-value--label" />
        <Value at={[x + w + 58, y(n - 2) + 32]} text="CHECKS THE" size={8} cls="k-value--muted" />
        <Value at={[x + w + 58, y(n - 2) + 43]} text="COMMITMENT" size={8} cls="k-value--muted" />
        <Value at={[x, y(n) + 22]} text="THE SCRIPT, OPCODE BY OPCODE" size={8} cls="k-value--label" />
        {opsLines.map((l, i) => <Value at={[x, y(n) + 34 + i * 12]} text={l} size={8.5} />)}
      </Drawing>
      <details class="atlas-disclosure">
        <summary>Exact values</summary>
        <dl class="atlas-hexlist">
          {v.initialStack.map((id, n) => (
            <>
              <dt>Item {n}: {v.elements[id].label}</dt><dd><code class="atlas-break">{v.elements[id].hex || "(empty)"}</code></dd>
            </>
          ))}
          <dt>Item {v.initialStack.length}: script</dt><dd><code class="atlas-break">{v.scriptHex}</code></dd>
          <dt>Item {v.initialStack.length + 1}: control block</dt><dd><code class="atlas-break">{v.witness.controlHex}</code></dd>
        </dl>
      </details>
    </>
  );
}
