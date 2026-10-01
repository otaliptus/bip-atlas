export function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/.test(hex)) throw new RangeError("Expected lowercase even-length hex.");
  return Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
