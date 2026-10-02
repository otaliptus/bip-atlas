/**
 * BIP 324 constants with no imports, so drawing code can use them without
 * pulling the curve and cipher libraries into a client bundle.
 * `v2transport.ts` re-exports them.
 */
export const MAINNET_MAGIC = "f9beb4d9";
/** The first 16 bytes of every v1 connection: magic, "version", zero padding. */
export const V1_PREFIX = MAINNET_MAGIC + [..."version"].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("") + "0000000000";
export const REKEY_INTERVAL = 224;
export const LENGTH_FIELD_LEN = 3;
export const HEADER_LEN = 1;
export const TAG_LEN = 16;
export const MAX_GARBAGE = 4095;
/** Overhead per message: v2 adds 3 + 1 + 16 bytes to the contents; v1 has a 24-byte header. */
export const V2_OVERHEAD = LENGTH_FIELD_LEN + HEADER_LEN + TAG_LEN;
export const V1_HEADER = 24;
