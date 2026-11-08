import { V2_FIELDS, constructorMay, determineLockTime, parseTypeRegistry, readPsbtAnyVersion, sighashName, signerUpdate, uniqueId, unsignedTransaction, SIGHASH, type FieldName, type MapScope, type PsbtRecord } from "@bip-atlas/models";
import type { DerivedPsbtV2Fixture, PsbtV2MapView, PsbtV2VectorFixture } from "@bip-atlas/figures";
import { SNAPSHOT_PHASE4, checkSourceQuote, pinnedText } from "./sources";

let registry: FieldName[] | null = null;
const fieldName = (scope: MapScope, type: number) =>
  (registry ??= parseTypeRegistry(pinnedText("bip-0174/type-registry.mediawiki", SNAPSHOT_PHASE4))).find((f) => f.scope === scope && f.keyType === type)?.constant ?? `0x${type.toString(16).padStart(2, "0")}`;

const lineOf = (n: number) => pinnedText("bip-0370.mediawiki", SNAPSHOT_PHASE4).split("\n")[n - 1] ?? "";

/** One signature of each base sighash type, without and with ANYONECANPAY. */
const SIGHASH_TYPES = [SIGHASH.ALL, SIGHASH.NONE, SIGHASH.SINGLE, SIGHASH.ALL | SIGHASH.ANYONECANPAY, SIGHASH.NONE | SIGHASH.ANYONECANPAY, SIGHASH.SINGLE | SIGHASH.ANYONECANPAY];

/**
 * A BIP 370 vector read by the model. The hex must be on its line; invalid
 * vectors must be rejected for the field their case names, valid ones read
 * as version 2, and lock-time vectors give the lock time their heading says.
 */
export function deriveBip370(f: PsbtV2VectorFixture): DerivedPsbtV2Fixture {
  checkSourceQuote(f, SNAPSHOT_PHASE4);
  if (!lineOf(f.hexLine).includes(`<pre>${f.hex}</pre>`)) throw new Error(`${f.id}: hex not on BIP 370 line ${f.hexLine}`);
  const r = readPsbtAnyVersion(f.hex);
  if (f.group === "invalid") {
    if (r.valid) throw new Error(`${f.id}: BIP 370 lists it as invalid, the model reads it as valid`);
    if (!/^The following are invalid PSBTs:/.test(lineOf(f.groupLine!))) throw new Error(`${f.id}: heading not on line ${f.groupLine}`);
    // The case names the field the PSBT gets wrong, except "PSBTv0 but with PSBT_GLOBAL_VERSION
    // set to 2": read as version 2, it still carries the unsigned transaction version 2 excludes.
    const named = f.label.match(/PSBT_[A-Z_]+/)?.[0];
    const expected = named === "PSBT_GLOBAL_VERSION" ? "PSBT_GLOBAL_UNSIGNED_TX" : named;
    if (r.violation.field !== expected) throw new Error(`${f.id}: model rejects it for ${r.violation.field}, the case names ${named}`);
    return { ...f, derived: { version: r.version, valid: false, violation: r.violation, maps: [], txVersion: null, fallbackLocktime: null, modifiable: null, inputs: [], outputs: [], lockTime: null, unsignedTx: null, uniqueIdHex: null, modifiableView: null } };
  }
  if (!r.valid || r.version !== 2) throw new Error(`${f.id}: expected a valid version 2 PSBT`);
  const p = r.psbt;
  const lt = determineLockTime(p);
  if (f.group === "locktime") {
    const heading = lineOf(f.expectedLine!);
    const says = f.expectedLockTime === null ? /cannot be computed:$/.test(heading) : heading.endsWith(`computed to be ${f.expectedLockTime}:`);
    if (!says) throw new Error(`${f.id}: heading on line ${f.expectedLine} does not give ${f.expectedLockTime}`);
    if (lt.value !== f.expectedLockTime) throw new Error(`${f.id}: model lock time ${lt.value}, BIP 370 ${f.expectedLockTime}`);
  } else if (!/^The following are valid PSBTs/.test(lineOf(f.groupLine!))) throw new Error(`${f.id}: heading not on line ${f.groupLine}`);
  const view = (scope: MapScope, records: PsbtRecord[], index?: number): PsbtV2MapView => ({
    scope,
    index,
    records: records.map((rec) => ({ keyType: rec.keyType, name: fieldName(scope, rec.keyType), v2: rec.keyType in V2_FIELDS[scope], bytes: rec.valueHex.length / 2, valueHex: rec.valueHex })),
  });
  for (const [scope, type, name] of [["global", 0x02, "PSBT_GLOBAL_TX_VERSION"], ["input", 0x0e, "PSBT_IN_PREVIOUS_TXID"], ["output", 0x04, "PSBT_OUT_SCRIPT"]] as const) {
    if (fieldName(scope, type) !== name || V2_FIELDS[scope][type] !== name) throw new Error(`registry and model disagree on ${name}`);
  }
  const unsigned = lt.value === null ? null : unsignedTransaction(p);
  const flags = p.modifiable;
  return {
    ...f,
    derived: {
      version: 2,
      valid: true,
      violation: null,
      maps: [view("global", p.global), ...p.inputMaps.map((m, i) => view("input", m, i)), ...p.outputMaps.map((m, i) => view("output", m, i))],
      txVersion: p.txVersion,
      fallbackLocktime: p.fallbackLocktime,
      modifiable: flags,
      inputs: p.inputs,
      outputs: p.outputs.map((o) => ({ amountSats: o.amountSats.toString(), scriptHex: o.scriptHex })),
      lockTime: { ...lt, date: lt.kind === "time" ? new Date(lt.value! * 1000).toISOString().replace(".000Z", "Z") : null },
      unsignedTx: unsigned,
      uniqueIdHex: lt.value === null ? null : uniqueId(p),
      modifiableView:
        flags === null
          ? null
          : { may: constructorMay(flags), afterSigning: SIGHASH_TYPES.map((t) => ({ sighash: sighashName(t), flags: signerUpdate(flags, t), may: constructorMay(signerUpdate(flags, t)) })) },
    },
  };
}
