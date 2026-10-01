#!/usr/bin/env python3
"""Extract BIP173/BIP350 test vectors from a pinned source snapshot.

Reads the raw MediaWiki files written by snapshot_sources.py, verifies their
SHA-256 against the snapshot lock, and writes a JSON vector file that records
the source line of every vector. Vectors are copied, never computed.

  python scripts/extract_address_vectors.py \
    --snapshot sources/research-2026-10-01 --out fixtures/bip173-350-vectors.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

TT = re.compile(r"<tt>(.*?)</tt>")
PREFIX = re.compile(r"^\* 0x([0-9A-Fa-f]{2}) \+ <tt>(.*?)</tt>: (.+)$")
SUFFIX = re.compile(r"^\* <tt>(.*?)</tt> \+ 0x([0-9A-Fa-f]{2}): (.+)$")

SECTIONS = {
    "valid Bech32:": ("generic", "valid", "bech32"),
    "not valid Bech32 ": ("generic", "invalid", "bech32"),
    "valid Bech32m:": ("generic", "valid", "bech32m"),
    "not valid Bech32m ": ("generic", "invalid", "bech32m"),
    # "invalid" first: "valid segwit addresses" is a substring of it.
    "invalid segwit addresses": ("segwit", "invalid", None),
    "valid segwit addresses": ("segwit", "valid", None),
}


def classify(line: str):
    if not line.startswith("The following"):
        return None
    for marker, kind in SECTIONS.items():
        if marker in line:
            return kind
    return None


def extract(path: Path, bip: int) -> list[dict]:
    vectors: list[dict] = []
    section = None
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        kind = classify(line)
        if kind:
            section = kind
            continue
        if line.startswith("=="):
            section = None
            continue
        if not section or not line.startswith("* "):
            continue
        family, validity, encoding = section
        entry: dict = {"bip": bip, "line": number, "family": family, "validity": validity}
        if encoding:
            entry["encoding"] = encoding
        if m := PREFIX.match(line):
            entry["string"] = chr(int(m.group(1), 16)) + m.group(2)
            entry["reason"] = m.group(3).strip()
        elif m := SUFFIX.match(line):
            entry["string"] = m.group(1) + chr(int(m.group(2), 16))
            entry["reason"] = m.group(3).strip()
        else:
            values = TT.findall(line)
            if not values:
                continue
            entry["string"] = values[0]
            rest = line.split("</tt>", 1)[1].lstrip(":").strip()
            if family == "segwit" and validity == "valid":
                entry["scriptPubKeyHex"] = values[1]
            elif validity == "invalid":
                entry["reason"] = rest
            elif rest:
                entry["note"] = TT.sub(lambda mm: mm.group(1), rest)[:200]
        vectors.append(entry)
    return vectors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    lock = json.loads((args.snapshot / "sources.lock.json").read_text(encoding="utf-8"))
    files = {f["path"]: f for f in lock["files"]}
    sources = []
    vectors: list[dict] = []
    for bip in (173, 350):
        name = f"bip-{bip:04d}.mediawiki"
        raw = args.snapshot / "raw" / name
        digest = hashlib.sha256(raw.read_bytes()).hexdigest()
        if digest != files[name]["sha256"]:
            print(f"{name}: SHA-256 does not match the snapshot lock", file=sys.stderr)
            return 1
        sources.append({"bip": bip, "path": name, "sha256": digest, "gitBlob": files[name]["gitBlob"]})
        vectors.extend(extract(raw, bip))

    payload = {
        "type": "bip-atlas.vectors.v1",
        "repository": lock["repository"],
        "commit": lock["commit"],
        "sources": sources,
        "note": "Copied verbatim from the pinned BIP text. Public test material; never use for funds.",
        "vectors": vectors,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    for v in vectors:
        key = f"BIP{v['bip']} {v['family']} {v['validity']}"
        counts[key] = counts.get(key, 0) + 1
    for key, count in counts.items():
        print(f"{key}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
