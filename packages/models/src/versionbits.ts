/**
 * Version-bits teaching model for BIP 9 and BIP 8: which block versions
 * signal for a deployment, and how a deployment's state moves from one
 * 2016-block retarget period to the next, following each BIP's
 * GetStateForBlock pseudocode.
 *
 * Pure integer arithmetic with no runtime imports, so client islands can
 * import it directly (`@bip-atlas/models/versionbits`). It never sees a real
 * chain: signalling counts and clocks are supplied by the caller.
 */

/** Blocks per retarget period; every block in one period shares a state. */
export const PERIOD = 2016;
/** Top three bits of a signalling version must be 001. */
export const TOP_MASK = 0xe0000000;
export const TOP_BITS = 0x20000000;
/** Signalling versions run from 0x20000000 to 0x3FFFFFFF inclusive. */
export const VERSION_MIN = 0x20000000;
export const VERSION_MAX = 0x3fffffff;
/** Usable deployment bits: 0 to 28. */
export const MAX_BIT = 28;

export const BIP9_THRESHOLD = { mainnet: 1916, testnet: 1512 } as const;
/** BIP 8's suggested thresholds (selection guidelines). */
export const BIP8_THRESHOLD = { mainnet: 1815, testnet: 1512 } as const;

export type Bip9State = "DEFINED" | "STARTED" | "LOCKED_IN" | "ACTIVE" | "FAILED";
export type Bip8State = Bip9State | "MUST_SIGNAL";

const u32 = (n: number) => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;

/** Does a block with this nVersion signal for `bit`? Top bits must be 001 and the bit set. */
export function signals(nVersion: number, bit: number): boolean {
  if (!u32(nVersion)) throw new RangeError("nVersion must be a 32-bit unsigned value");
  if (!Number.isInteger(bit) || bit < 0 || bit > MAX_BIT) throw new RangeError("bit must be 0..28");
  return ((nVersion & TOP_MASK) >>> 0) === TOP_BITS && ((nVersion >>> bit) & 1) === 1;
}

/** The version a miner sets to signal for every bit in `bits` (top bits 001). */
export function versionFor(bits: number[]): number {
  let v = TOP_BITS;
  for (const b of bits) {
    if (!Number.isInteger(b) || b < 0 || b > MAX_BIT) throw new RangeError("bit must be 0..28");
    v |= 1 << b;
  }
  return v >>> 0;
}

/* ---------- BIP 9 ---------- */

export interface Bip9Params {
  bit: number;
  /** Unix time; compared with the median time past of the period's first block's parent. */
  starttime: number;
  timeout: number;
  threshold: number;
}

export interface Bip9Boundary {
  /** GetMedianTimePast(block.parent) at the first block of the new period. */
  mtp: number;
  /** Signalling blocks among the 2016 blocks of the period just ended. */
  count: number;
}

export interface Transition<S> {
  from: S;
  to: S;
  /** Which branch of the pseudocode decided. */
  rule: string;
}

function checkCount(count: number) {
  if (!Number.isInteger(count) || count < 0 || count > PERIOD) throw new RangeError("count must be 0..2016");
}

/** One step of BIP 9's GetStateForBlock, at a period boundary. */
export function bip9Next(prev: Bip9State, b: Bip9Boundary, p: Bip9Params): Transition<Bip9State> {
  checkCount(b.count);
  const t = (to: Bip9State, rule: string) => ({ from: prev, to, rule });
  switch (prev) {
    case "DEFINED":
      if (b.mtp >= p.timeout) return t("FAILED", "MTP ≥ timeout");
      if (b.mtp >= p.starttime) return t("STARTED", "MTP ≥ starttime");
      return t("DEFINED", "MTP < starttime");
    case "STARTED":
      // The transition to FAILED takes precedence over counting.
      if (b.mtp >= p.timeout) return t("FAILED", "MTP ≥ timeout (checked before counting)");
      if (b.count >= p.threshold) return t("LOCKED_IN", `${b.count} ≥ ${p.threshold} signalling blocks`);
      return t("STARTED", `${b.count} < ${p.threshold} signalling blocks`);
    case "LOCKED_IN":
      return t("ACTIVE", "one period after lock-in, always");
    case "ACTIVE":
      return t("ACTIVE", "terminal");
    case "FAILED":
      return t("FAILED", "terminal");
  }
}

/**
 * Run BIP 9 over consecutive periods. `boundaries[k]` describes the start of
 * period k + 1; period 0 is DEFINED (it holds the genesis block, or any
 * period before the deployment means anything). Returns the state of each period.
 */
export function simulateBip9(p: Bip9Params, boundaries: Bip9Boundary[]): Array<{ state: Bip9State; via: Transition<Bip9State> | null }> {
  const out: Array<{ state: Bip9State; via: Transition<Bip9State> | null }> = [{ state: "DEFINED", via: null }];
  for (const b of boundaries) {
    const via = bip9Next(out[out.length - 1].state, b, p);
    out.push({ state: via.to, via });
  }
  return out;
}

/* ---------- BIP 8 ---------- */

export interface Bip8Params {
  bit: number;
  startheight: number;
  timeoutheight: number;
  threshold: number;
  minimumActivationHeight: number;
  lockinontimeout: boolean;
}

/** BIP 8's parameter rules: heights on retarget boundaries, timeout at least two periods after start. */
export function bip8ParamProblems(p: Bip8Params): string[] {
  const problems: string[] = [];
  for (const k of ["startheight", "timeoutheight", "minimumActivationHeight"] as const)
    if (!Number.isInteger(p[k]) || p[k] < 0 || p[k] % PERIOD !== 0) problems.push(`${k} must be a multiple of 2016`);
  if (p.timeoutheight < p.startheight + 2 * PERIOD) problems.push("timeoutheight must be at least 4032 blocks after startheight");
  if (!Number.isInteger(p.threshold) || p.threshold < 1 || p.threshold > PERIOD) problems.push("threshold must be 1..2016");
  return problems;
}

/** One step of BIP 8's GetStateForBlock; `height` is the height of the period's first block. */
export function bip8Next(prev: Bip8State, b: { height: number; count: number }, p: Bip8Params): Transition<Bip8State> {
  checkCount(b.count);
  if (!Number.isInteger(b.height) || b.height % PERIOD !== 0) throw new RangeError("height must be a period boundary");
  const t = (to: Bip8State, rule: string) => ({ from: prev, to, rule });
  switch (prev) {
    case "DEFINED":
      return b.height >= p.startheight ? t("STARTED", "height ≥ startheight") : t("DEFINED", "height < startheight");
    case "STARTED":
      if (b.count >= p.threshold) return t("LOCKED_IN", `${b.count} ≥ ${p.threshold} signalling blocks`);
      if (p.lockinontimeout && b.height + PERIOD >= p.timeoutheight) return t("MUST_SIGNAL", "last period before the timeout, lockinontimeout set");
      if (b.height >= p.timeoutheight) return t("FAILED", "height ≥ timeoutheight");
      return t("STARTED", `${b.count} < ${p.threshold} signalling blocks`);
    case "MUST_SIGNAL":
      return t("LOCKED_IN", "after a MUST_SIGNAL period, always");
    case "LOCKED_IN":
      return b.height >= p.minimumActivationHeight ? t("ACTIVE", "height ≥ minimum_activation_height") : t("LOCKED_IN", "height < minimum_activation_height");
    case "ACTIVE":
      return t("ACTIVE", "terminal");
    case "FAILED":
      return t("FAILED", "terminal");
  }
}

/** Run BIP 8 from the period starting at `firstHeight` (state DEFINED) with one count per period. */
export function simulateBip8(p: Bip8Params, firstHeight: number, counts: number[]): Array<{ height: number; state: Bip8State; via: Transition<Bip8State> | null }> {
  const problems = bip8ParamProblems(p);
  if (problems.length) throw new RangeError(problems.join("; "));
  if (firstHeight % PERIOD !== 0) throw new RangeError("firstHeight must be a period boundary");
  const out: Array<{ height: number; state: Bip8State; via: Transition<Bip8State> | null }> = [{ height: firstHeight, state: "DEFINED", via: null }];
  counts.forEach((count) => {
    const last = out[out.length - 1];
    const height = last.height + PERIOD;
    const via = bip8Next(last.state, { height, count }, p);
    out.push({ height, state: via.to, via });
  });
  return out;
}

/**
 * BIP 8's mandatory-signalling check inside a MUST_SIGNAL period: a block is
 * invalid once more than 2016 − threshold blocks of the period (counting it) fail to signal.
 */
export function mustSignalInvalid(nonSignallingSoFar: number, threshold: number): boolean {
  return nonSignallingSoFar > PERIOD - threshold;
}

/* ---------- pinned deployment tables ---------- */

export interface DeploymentRow {
  name: string;
  bit: number;
  mainnet: { start: string; expire: string; state: string };
  testnet: { start: string; expire: string; state: string };
  bips: number[];
  /** 1-based line of the row's name cell in the assignments file. */
  line: number;
}

/** Parse the wikitable in bip-0009/assignments.mediawiki (one cell per line, rows split by `|-`). */
export function parseAssignments(text: string): DeploymentRow[] {
  const lines = text.split("\n");
  const rows: DeploymentRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "|-") continue;
    const cells: string[] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith("| ")) cells.push(lines[j++].slice(2).trim());
    if (cells.length !== 9) continue;
    rows.push({
      name: cells[0],
      bit: Number(cells[1]),
      mainnet: { start: cells[2], expire: cells[3], state: cells[4] },
      testnet: { start: cells[5], expire: cells[6], state: cells[7] },
      bips: [...cells[8].matchAll(/\|(\d+)\]\]/g)].map((m) => Number(m[1])),
      line: i + 2,
    });
  }
  return rows;
}

/** "2016-05-01 00:00:00" (UTC, as the table states) → Unix time. */
export function utcToEpoch(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) throw new RangeError(`not a UTC timestamp: ${s}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
}

/** "active since #419328" → 419328. */
export function activationHeight(state: string): number | null {
  const m = /^active since #(\d+)$/.exec(state);
  return m ? Number(m[1]) : null;
}

/**
 * What BIP 9's rules imply from an activation height alone: the LOCKED_IN
 * period is the one before it, and the period before that is the one whose
 * signalling reached the threshold.
 */
export function bip9Implied(activeHeight: number) {
  if (!Number.isInteger(activeHeight) || activeHeight % PERIOD !== 0 || activeHeight < 2 * PERIOD) throw new RangeError("activation must start on a period boundary");
  return {
    activePeriod: activeHeight / PERIOD,
    lockedInFrom: activeHeight - PERIOD,
    tallyFrom: activeHeight - 2 * PERIOD,
    tallyTo: activeHeight - PERIOD - 1,
  };
}
