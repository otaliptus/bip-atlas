import { Drawing, Value } from "../kit";

/**
 * address-q-weakness.v1 — static, schematic (no real address). BIP 350's
 * finding about Bech32: when a string ends in p, inserting or deleting q
 * characters just before that p leaves the checksum valid. Version 0
 * addresses escaped because only two lengths are allowed for them.
 */
export function QWeakness() {
  const C = 18;
  const rows = [
    { inserted: 0, label: "A BECH32 STRING THAT ENDS IN p" },
    { inserted: 1, label: "ONE q INSERTED: CHECKSUM STILL VALID" },
    { inserted: 3, label: "THREE q INSERTED: CHECKSUM STILL VALID" },
  ];
  const desc =
    "Schematic: a Bech32 string whose last character is p. Inserting one q, or three, just before that p leaves the checksum valid; deleting q characters there does too. " +
    "BIP 350 notes that version 0 addresses were not affected because they are restricted to two lengths, 42 or 62 characters; a few inserted q characters give a length version 0 does not allow.";
  return (
    <Drawing id="a04-q" width={344} height={200} title="The q insertion" desc={desc}>
      {rows.map((r, i) => {
        const y = 14 + i * 50;
        const cells = [...Array(6).fill("·"), ...Array(r.inserted).fill("q"), "p"];
        return (
          <g>
            <Value at={[14, y + 9]} text="…" size={11} />
            {cells.map((c, j) => (
              <g>
                <rect class={`k-cell ${c === "q" ? "k-mark--plain" : "k-fill--plain"}`} x={30 + j * C} y={y} width={C} height={C} />
                <text class={`k-value${c === "q" ? " k-value--on" : ""}`} x={30 + j * C + C / 2} y={y + 13} text-anchor="middle" style="font-size:10px">{c}</text>
              </g>
            ))}
            <Value at={[30 + cells.length * C + 8, y + 13]} text="✓" size={11} />
            <Value at={[14, y + 32]} text={r.label} size={9} cls="k-value--label" />
          </g>
        );
      })}
      <Value at={[14, 172]} text="SCHEMATIC · VERSION 0 ESCAPED: ONLY TWO LENGTHS," size={9} cls="k-value--muted" />
      <Value at={[14, 184]} text="42 OR 62 · A FEW INSERTED q GIVE A LENGTH V0 FORBIDS" size={9} cls="k-value--muted" />
    </Drawing>
  );
}
