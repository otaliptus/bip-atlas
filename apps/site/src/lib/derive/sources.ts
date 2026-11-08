import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ROOT } from "../root";
import { bytesToHex, hexToBytes } from "@bip-atlas/models";

const SNAPSHOT = "sources/research-2026-10-01";
/** Phase-three BIPs, snapshotted separately at the same bitcoin/bips commit. */
export const SNAPSHOT_PHASE3 = "sources/research-2026-10-01-phase3";

const locks = new Map<string, Array<{ path: string; sha256: string }>>();
/** A raw file from a pinned snapshot, checked against that snapshot's lock. */
export function pinnedText(path: string, snapshot: string = SNAPSHOT): string {
  const bytes = readFileSync(`${ROOT}${snapshot}/raw/${path}`);
  if (!locks.has(snapshot)) locks.set(snapshot, JSON.parse(readFileSync(`${ROOT}${snapshot}/sources.lock.json`, "utf8")).files);
  const expected = locks.get(snapshot)!.find((f) => f.path === path)?.sha256;
  if (createHash("sha256").update(bytes).digest("hex") !== expected) throw new Error(`${path} does not match the source lock`);
  return bytes.toString("utf8");
}

/** Hex in either case to bytes, and bytes to lowercase hex. */
export const hx = (s: string) => hexToBytes(s.toLowerCase());
export const HX = (b: Uint8Array) => bytesToHex(b);
/** A 256-bit scalar as 64 hex digits. */
export const big = (n: bigint) => n.toString(16).padStart(64, "0");

/** Throws unless the fixture's quote is on its cited line of the phase-three snapshot. */
export function checkSourceQuote(f: { id: string; source: { file?: string; line?: number; quote?: string } }) {
  const line = pinnedText(f.source.file!, SNAPSHOT_PHASE3).split("\n")[f.source.line! - 1];
  if (!line?.includes(f.source.quote!)) throw new Error(`${f.id}: quote not on ${f.source.file} line ${f.source.line}`);
}

/** Resolves a pointer such as `english[3]` or `[5].seed` inside parsed JSON. */
export const resolvePointer = (data: unknown, pointer: string): any => {
  let value: any = data;
  for (const token of pointer.match(/[^.[\]]+/g) ?? []) value = value?.[/^\d+$/.test(token) ? Number(token) : token];
  return value;
};
