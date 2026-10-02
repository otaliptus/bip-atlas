/** 1234567 → "1,234,567" (decimal strings from the model may exceed 2^53). */
export const group = (n: string | number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** First bytes of a script with an ellipsis; "(empty)" for a nil item. Exact values go in a disclosure. */
export const shortHex = (hex: string, n = 6) => (hex === "" ? "(empty)" : hex.length > n * 2 ? `${hex.slice(0, n * 2)}…` : hex);
/** x position of a value in [0, F) on a line from x0 to x1. */
/** "block 180480" → "block 180,480". */
export const fromText = (from: string) => from.replace(/\d+/, (m) => group(m));
export const along = (v: string, F: string, x0: number, x1: number) => (F === "0" ? x0 : x0 + (Number((BigInt(v) * 100000n) / BigInt(F)) / 100000) * (x1 - x0));
