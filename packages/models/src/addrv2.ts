import { bytesToHex, hexToBytes } from "./hex";

export class AddrV2Error extends Error {}

export interface AddrV2Entry {
  time: number;
  services: number;
  networkId: number;
  addressHex: string;
  port: number;
}

export const ADDRV2_NETWORKS: Record<number, { name: string; bytes: number }> = {
  1: { name: "IPV4", bytes: 4 },
  2: { name: "IPV6", bytes: 16 },
  3: { name: "TORV2", bytes: 10 },
  4: { name: "TORV3", bytes: 32 },
  5: { name: "I2P", bytes: 32 },
  6: { name: "CJDNS", bytes: 16 },
  7: { name: "YGGDRASIL", bytes: 16 },
};

class Reader {
  offset = 0;
  constructor(readonly bytes: Uint8Array) {}
  take(n: number): Uint8Array {
    if (!Number.isInteger(n) || n < 0 || this.offset + n > this.bytes.length) throw new AddrV2Error("Unexpected end of addrv2 data.");
    const out = this.bytes.slice(this.offset, this.offset + n);
    this.offset += n;
    return out;
  }
  compactSize(): number {
    const first = this.take(1)[0];
    const size = first < 0xfd ? 0 : first === 0xfd ? 2 : first === 0xfe ? 4 : 8;
    const raw = this.take(size);
    let value = size === 0 ? first : 0;
    for (let i = size - 1; i >= 0; i--) value = value * 256 + raw[i];
    const minimal = value < 0xfd ? 0 : value <= 0xffff ? 2 : value <= 0xffffffff ? 4 : 8;
    if (size !== minimal) throw new AddrV2Error("Non-minimal CompactSize.");
    if (!Number.isSafeInteger(value)) throw new AddrV2Error("CompactSize exceeds the safe teaching-model range.");
    return value;
  }
}

const u32le = (bytes: Uint8Array) => (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
const u16be = (bytes: Uint8Array) => (bytes[0] << 8) | bytes[1];
const le32 = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];

function compactSize(value: number): number[] {
  if (!Number.isInteger(value) || value < 0) throw new AddrV2Error("CompactSize needs a non-negative integer.");
  if (value < 0xfd) return [value];
  if (value <= 0xffff) return [0xfd, value & 255, value >>> 8];
  if (value <= 0xffffffff) return [0xfe, value & 255, (value >>> 8) & 255, (value >>> 16) & 255, value >>> 24];
  throw new AddrV2Error("CompactSize above 2^32 is out of scope for this teaching model.");
}

export interface AddrV2EntryVerdict {
  outcome: "accept" | "ignore" | "reject";
  reason: string;
}

export function evaluateAddrV2Entry(entry: AddrV2Entry): AddrV2EntryVerdict {
  const address = hexToBytes(entry.addressHex);
  if (address.length > 512) return { outcome: "reject", reason: "Address exceeds the 512-byte maximum." };
  const network = ADDRV2_NETWORKS[entry.networkId];
  if (!network) return { outcome: "reject", reason: `Unknown network ID ${entry.networkId}; do not gossip it.` };
  if (address.length !== network.bytes) return { outcome: "reject", reason: `${network.name} requires ${network.bytes} address bytes, received ${address.length}.` };
  if (entry.networkId === 3) return { outcome: "ignore", reason: "Tor v2 is no longer operational; ignore it on receive and do not relay it." };
  if (entry.networkId === 2) {
    const ipv4Embedded = address.slice(0, 10).every((byte) => byte === 0) && address[10] === 0xff && address[11] === 0xff;
    const onionCat = address.slice(0, 6).every((byte, index) => byte === [0xfd, 0x87, 0xd8, 0x7e, 0xeb, 0x43][index]);
    if (ipv4Embedded || onionCat) return { outcome: "ignore", reason: "This IPv6 range embeds another network with its own canonical network ID." };
  }
  if (entry.networkId === 6 && address[0] !== 0xfc) return { outcome: "reject", reason: "CJDNS addresses belong to fc00::/8." };
  if (entry.networkId === 7 && (address[0] & 0xfe) !== 0x02) return { outcome: "reject", reason: "Yggdrasil addresses belong to 0200::/7." };
  if (!Number.isInteger(entry.port) || entry.port < 0 || entry.port > 0xffff) return { outcome: "reject", reason: "Port is outside uint16 range." };
  if (!Number.isInteger(entry.time) || entry.time < 0 || entry.time > 0xffffffff) return { outcome: "reject", reason: "Time is outside uint32 range." };
  if (!Number.isSafeInteger(entry.services) || entry.services < 0) return { outcome: "reject", reason: "Services must be a non-negative CompactSize value." };
  return { outcome: "accept", reason: `${network.name} with the expected ${network.bytes}-byte address.` };
}

export function encodeAddrV2(entries: AddrV2Entry[]): string {
  if (entries.length > 1000) throw new AddrV2Error("An addrv2 message may contain at most 1,000 addresses.");
  const bytes: number[] = [...compactSize(entries.length)];
  for (const entry of entries) {
    const address = hexToBytes(entry.addressHex);
    if (address.length > 512) throw new AddrV2Error("Address exceeds the 512-byte maximum.");
    if (ADDRV2_NETWORKS[entry.networkId] && address.length !== ADDRV2_NETWORKS[entry.networkId].bytes) throw new AddrV2Error("Address length does not match its network ID.");
    if (!Number.isInteger(entry.time) || entry.time < 0 || entry.time > 0xffffffff) throw new AddrV2Error("Time is outside uint32 range.");
    if (!Number.isInteger(entry.port) || entry.port < 0 || entry.port > 0xffff) throw new AddrV2Error("Port is outside uint16 range.");
    bytes.push(...le32(entry.time), ...compactSize(entry.services), entry.networkId, ...compactSize(address.length), ...address, entry.port >>> 8, entry.port & 255);
  }
  return bytesToHex(Uint8Array.from(bytes));
}

export interface AddrV2Packet {
  entries: Array<AddrV2Entry & { verdict: AddrV2EntryVerdict }>;
  packetHex: string;
}

export function parseAddrV2(hex: string): AddrV2Packet {
  const bytes = hexToBytes(hex);
  const reader = new Reader(bytes);
  const count = reader.compactSize();
  if (count > 1000) throw new AddrV2Error("An addrv2 message may contain at most 1,000 addresses.");
  const entries: AddrV2Packet["entries"] = [];
  for (let i = 0; i < count; i++) {
    const time = u32le(reader.take(4));
    const services = reader.compactSize();
    const networkId = reader.take(1)[0];
    const length = reader.compactSize();
    if (length > 512) throw new AddrV2Error("Address exceeds the 512-byte maximum.");
    const addressHex = bytesToHex(reader.take(length));
    const port = u16be(reader.take(2));
    const entry = { time, services, networkId, addressHex, port };
    entries.push({ ...entry, verdict: evaluateAddrV2Entry(entry) });
  }
  if (reader.offset !== bytes.length) throw new AddrV2Error("Unexpected trailing bytes in addrv2 message.");
  return { entries, packetHex: hex };
}

export function validateSendAddrV2Sequence(messages: string[]): { valid: boolean; reason: string } {
  let version = false;
  let verack = false;
  let send = false;
  for (const message of messages) {
    if (message === "version") version = true;
    if (message === "sendaddrv2") {
      if (!version || verack || send) return { valid: false, reason: "sendaddrv2 must follow version, precede verack, and appear once." };
      send = true;
    }
    if (message === "verack") verack = true;
  }
  return { valid: version && send && verack, reason: version && send && verack ? "sendaddrv2 sits between version and verack." : "The version/sendaddrv2/verack sequence is incomplete." };
}
