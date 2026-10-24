export function formatBips(bips: number[]): string {
  const parts: string[] = [];
  for (let index = 0; index < bips.length;) {
    let end = index;
    while (end + 1 < bips.length && bips[end + 1] === bips[end] + 1) end += 1;
    if (end - index >= 2) parts.push(`${String(bips[index]).padStart(4, "0")}–${String(bips[end]).padStart(4, "0")}`);
    else for (let at = index; at <= end; at += 1) parts.push(String(bips[at]).padStart(4, "0"));
    index = end + 1;
  }
  return `BIP ${parts.join(" + ")}`;
}
