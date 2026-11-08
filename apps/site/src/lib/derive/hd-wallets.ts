import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, ckdPriv, ckdPub, neuter, recoverParentPrivateKey, derivePath, fingerprint, formatIndex, hexToBytes, masterFromSeed, parsePath, serialize, serializeRaw, hash160 } from "@bip-atlas/models";
import type { Bip32SeedFixture, DerivedBip32Fixture } from "@bip-atlas/figures";

const hex32 = (n: number) => n.toString(16).padStart(8, "0");

export function deriveBip32(f: Bip32SeedFixture): DerivedBip32Fixture {
  const master = masterFromSeed(hexToBytes(f.seedHex));
  for (const c of f.vectorChains) {
    const key = derivePath(master.key, c.path);
    if (serialize(key, "private") !== c.xprv || serialize(key, "public") !== c.xpub) {
      throw new Error(`${f.id} ${c.path}: model differs from BIP32 test vector line ${c.line}`);
    }
  }
  const nodes = f.tree.paths.map((path) => {
    const indices = parsePath(path);
    const key = derivePath(master.key, path);
    const parentPath = indices.length ? path.slice(0, path.lastIndexOf("/")) : null;
    const step = parentPath ? ckdPriv(derivePath(master.key, parentPath), indices.at(-1)!) : null;
    const hardenedAt = indices.findIndex((i) => i >= 0x80000000);
    return {
      path,
      parentPath,
      depth: key.depth,
      indexLabel: indices.length ? formatIndex(indices.at(-1)!) : "m",
      hardened: indices.length > 0 && indices.at(-1)! >= 0x80000000,
      xprv: serialize(key, "private"),
      xpub: serialize(key, "public"),
      fingerprintHex: hex32(fingerprint(key)),
      parentFingerprintHex: hex32(key.parentFingerprint),
      childNumberHex: hex32(key.childNumber),
      chainCodeHex: bytesToHex(key.chainCode),
      publicKeyHex: bytesToHex(key.publicKey),
      privateKeyHex: bytesToHex(key.privateKey!),
      hmacDataHex: step ? step.dataHex : null,
      hmacOutHex: step ? step.iHex : null,
      identifierHex: bytesToHex(hash160(key.publicKey)),
      vectorLine: f.vectorChains.find((c) => c.path === path)?.line ?? null,
      hardenedAncestor: hardenedAt >= 0 ? `m/${indices.slice(0, hardenedAt + 1).map(formatIndex).join("/")}` : null,
    };
  });
  // BIP 32: a normal child's public key is the same by CKDpriv and by CKDpub (from the neutered parent).
  for (const n of nodes) {
    if (!n.parentPath || n.hardened) continue;
    const pub = ckdPub(neuter(derivePath(master.key, n.parentPath)), parsePath(n.path).at(-1)!);
    if (bytesToHex(pub.key.publicKey) !== n.publicKeyHex || pub.iHex !== n.hmacOutHex) throw new Error(`${f.id} ${n.path}: CKDpub differs from CKDpriv`);
  }
  // BIP 32's stated weakness, recomputed: parent xpub + normal child's private key → parent private key.
  const child = nodes.find((n) => n.path === f.recoveryPath);
  if (!child || !child.parentPath || child.hardened) throw new Error(`${f.id}: recoveryPath must be a normal child in the tree`);
  const parent = nodes.find((n) => n.path === child.parentPath)!;
  const index = parsePath(child.path).at(-1)!;
  const recovered = bytesToHex(recoverParentPrivateKey(neuter(derivePath(master.key, parent.path)), hexToBytes(child.privateKeyHex), index));
  if (recovered !== parent.privateKeyHex) throw new Error(`${f.id}: recovering ${parent.path} from ${child.path} failed`);
  const recovery = { parentPath: parent.path, childPath: child.path, index, iLHex: child.hmacOutHex!.slice(0, 64), childPrivateKeyHex: child.privateKeyHex, recoveredHex: recovered };
  const serialKey = derivePath(master.key, f.serializePath);
  const rows = (["public", "private"] as const).map((kind) => {
    const raw = serializeRaw(serialKey, kind);
    return { kind, rawHex: bytesToHex(raw), checksumHex: bytesToHex(sha256(sha256(raw)).slice(0, 4)), base58: serialize(serialKey, kind) };
  });
  return { ...f, derived: { masterIHex: master.iHex, nodes, recovery, serialization: { path: f.serializePath, rows } } };
}
