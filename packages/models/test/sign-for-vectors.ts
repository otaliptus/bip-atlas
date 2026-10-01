/**
 * Test-only: reproduce published signatures with noble, using each vector's own
 * aux_rand. Kept out of the models package so no site code can sign.
 */
import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "../src/hex";

export function signForVector(secretKeyHex: string, messageHex: string, auxRandHex: string): string {
  return bytesToHex(schnorr.sign(hexToBytes(messageHex), hexToBytes(secretKeyHex), hexToBytes(auxRandHex)));
}
