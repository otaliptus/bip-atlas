"""Small deterministic teaching models. NOT a wallet or consensus implementation.

Specifications: BIPs 39, 141, 173, and 350. No network, signing, or private-key
operations. Decoder is deliberately limited to bc/tb SegWit address fixtures;
it does not prove that a recipient is safe, funded, or controlled by anyone.
"""
from __future__ import annotations
import hashlib

CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
BECH32 = 1
BECH32M = 0x2BC830A3


def mnemonic_layout(entropy_bits: int) -> dict[str, int]:
    if type(entropy_bits) is not int or entropy_bits not in (128, 160, 192, 224, 256):
        raise ValueError("Entropy length must be 128, 160, 192, 224, or 256 bits.")
    checksum_bits = entropy_bits // 32
    return {"entropyBits": entropy_bits, "checksumBits": checksum_bits,
            "totalBits": entropy_bits + checksum_bits,
            "wordCount": (entropy_bits + checksum_bits) // 11,
            "lastWordEntropyBits": 11 - checksum_bits}


def mnemonic_indices(entropy: bytes) -> tuple[str, list[int]]:
    layout = mnemonic_layout(len(entropy) * 8)
    raw_bits = "".join(f"{value:08b}" for value in entropy)
    digest_bits = "".join(f"{value:08b}" for value in hashlib.sha256(entropy).digest())
    combined = raw_bits + digest_bits[:layout["checksumBits"]]
    return combined, [int(combined[i:i + 11], 2) for i in range(0, len(combined), 11)]


def transaction_sizes(base_bytes: int, total_bytes: int) -> dict[str, int]:
    if type(base_bytes) is not int or type(total_bytes) is not int:
        raise ValueError("Sizes must be integer byte counts.")
    if base_bytes < 0 or total_bytes < base_bytes:
        raise ValueError("Sizes require 0 <= base_bytes <= total_bytes.")
    weight = 3 * base_bytes + total_bytes
    return {"baseBytes": base_bytes, "totalBytes": total_bytes,
            "weightUnits": weight, "virtualBytes": (weight + 3) // 4}


def polymod(values: list[int]) -> int:
    state = 1
    taps = (0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3)
    for symbol in values:
        if not 0 <= symbol < 32:
            raise ValueError("Invalid five-bit symbol.")
        high = state >> 25
        state = ((state & 0x1FFFFFF) << 5) ^ symbol
        for bit, polynomial in enumerate(taps):
            if (high >> bit) & 1:
                state ^= polynomial
    return state


def decode_encoding(address: str) -> tuple[str, list[int], str]:
    if not isinstance(address, str) or not 8 <= len(address) <= 90:
        raise ValueError("Invalid length.")
    if any(ord(c) < 33 or ord(c) > 126 for c in address):
        raise ValueError("Non-printable or non-ASCII character.")
    if address.lower() != address and address.upper() != address:
        raise ValueError("Mixed case.")
    normalized = address.lower()
    split = normalized.rfind("1")
    if split < 1 or len(normalized) - split - 1 < 6:
        raise ValueError("Missing HRP, separator, or checksum.")
    hrp = normalized[:split]
    symbols = normalized[split + 1:]
    try:
        values = [CHARSET.index(c) for c in symbols]
    except ValueError as exc:
        raise ValueError("Invalid alphabet character.") from exc
    expanded = [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]
    residue = polymod(expanded + values)
    if residue == BECH32:
        encoding = "bech32"
    elif residue == BECH32M:
        encoding = "bech32m"
    else:
        raise ValueError("Checksum mismatch.")
    return hrp, values[:-6], encoding


def unpack_five_bit(values: list[int]) -> bytes:
    accumulator = 0
    bit_count = 0
    output: list[int] = []
    for value in values:
        if not 0 <= value < 32:
            raise ValueError("Invalid five-bit value.")
        accumulator = ((accumulator << 5) | value) & 0xFFF
        bit_count += 5
        while bit_count >= 8:
            bit_count -= 8
            output.append((accumulator >> bit_count) & 0xFF)
    if bit_count >= 5 or ((accumulator << (8 - bit_count)) & 0xFF):
        raise ValueError("Invalid or non-zero padding.")
    return bytes(output)


def decode_segwit(address: str, expected_hrp: str) -> dict[str, object]:
    if expected_hrp not in ("bc", "tb"):
        raise ValueError("This demo only accepts explicitly selected bc/tb fixtures.")
    hrp, data, encoding = decode_encoding(address)
    if hrp != expected_hrp:
        raise ValueError("Wrong network prefix for this fixture.")
    if not data or data[0] > 16:
        raise ValueError("Invalid witness version.")
    version = data[0]
    program = unpack_five_bit(data[1:])
    if not 2 <= len(program) <= 40:
        raise ValueError("Invalid witness program length.")
    if version == 0 and len(program) not in (20, 32):
        raise ValueError("Witness v0 program must be 20 or 32 bytes.")
    expected = "bech32" if version == 0 else "bech32m"
    if encoding != expected:
        raise ValueError("Checksum family does not match witness version.")
    opcode = 0 if version == 0 else 0x50 + version
    script = bytes([opcode, len(program)]) + program
    return {"hrp": hrp, "witnessVersion": version, "encoding": encoding,
            "programHex": program.hex(), "scriptPubKeyHex": script.hex(),
            "validationScope": "address syntax and encoding only; not spendability or ownership"}
