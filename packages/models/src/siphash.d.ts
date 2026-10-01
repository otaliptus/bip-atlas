declare module "siphash" {
  const SipHash: { hash(key: number[], message: Uint8Array | string): { h: number; l: number } };
  export default SipHash;
}
