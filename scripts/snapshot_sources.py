#!/usr/bin/env python3
"""Snapshot selected BIPs from an existing Git checkout at an immutable revision.

No network requests, LLM calls, repository-code execution, or worktree reads.
Raw files retain their original licenses. This is an ingestion starter, not a
complete MediaWiki parser. Run from the package root; see README.md.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

REPO_URL = "https://github.com/bitcoin/bips"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
HEADER_RE = re.compile(r"^\s*([A-Za-z][A-Za-z0-9-]*):\s*(.*)$")
MAX_FILE_BYTES = 4 * 1024 * 1024
MAX_TOTAL_BYTES = 24 * 1024 * 1024


def git(repo: Path, *args: str) -> bytes:
    """Use an argument vector, never a shell; read only explicit Git objects."""
    completed = subprocess.run(
        ["git", "--no-pager", "-C", str(repo), *args],
        check=False, capture_output=True, timeout=30,
    )
    if completed.returncode:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Git read failed: {detail[:600]}")
    return completed.stdout


def validate_revision(revision: str) -> None:
    if not SHA_RE.fullmatch(revision):
        raise ValueError("Revision must be a full lowercase 40-character commit SHA.")


def safe_path(path: str) -> str:
    p = PurePosixPath(path)
    if p.is_absolute() or not p.parts or any(x in {".", ".."} for x in p.parts) or "\\" in path:
        raise ValueError(f"Unsafe repository path: {path!r}")
    return str(p)


def parse_metadata(text: str, expected_number: int) -> dict[str, Any]:
    """Preserve preamble fields, continuations, unknown fields, and raw status.

    Parses the RFC-822-like preamble inside <pre> or fenced Markdown without
    attempting to transform the specification body. Unknown fields are retained.
    """
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines)
                  if re.match(r"^\s*BIP:\s*\d+\s*$", line)), None)
    if start is None:
        raise ValueError("No numeric BIP preamble found.")
    headers: dict[str, str] = {}
    key: str | None = None
    end = start
    for i in range(start, len(lines)):
        line = lines[i]
        if not line.strip() or line.strip().startswith(("</pre>", "```", "~~~")):
            break
        match = HEADER_RE.match(line)
        if match:
            key, value = match.groups()
            if key in headers:
                raise ValueError(f"Duplicate preamble field: {key}")
            headers[key] = value.strip()
        elif line[:1].isspace() and key:
            headers[key] += "\n" + line.strip()
        else:
            break
        end = i
    if int(headers.get("BIP", "-1")) != expected_number:
        raise ValueError("BIP number does not match the selected filename.")
    for required in ("Title", "Status", "Type"):
        if not headers.get(required):
            raise ValueError(f"Missing preamble field: {required}")
    headings = []
    fenced = False
    in_pre = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith(("```", "~~~")):
            fenced = not fenced
            continue
        if stripped.lower().startswith("<pre"):
            in_pre = True
        if stripped.lower().startswith("</pre"):
            in_pre = False
            continue
        if fenced or in_pre:
            continue
        wiki = re.match(r"^(={1,6})\s*(.*?)\s*\1\s*$", line)
        markdown = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", line)
        match = wiki or markdown
        if match:
            headings.append({"level": len(match.group(1)), "title": match.group(2), "line": i + 1})
    return {
        "number": expected_number,
        "headersRaw": headers,
        "title": headers["Title"],
        "authorsRaw": headers.get("Authors", headers.get("Author", "")),
        "statusRaw": headers["Status"],
        "typeRaw": headers["Type"],
        "assignedOrCreatedRaw": headers.get("Assigned", headers.get("Created")),
        "licenseRaw": headers.get("License"),
        "licenseReviewRequired": not bool(headers.get("License")),
        "preambleLines": [start + 1, end + 1],
        "headingCandidates": headings,
        "bodyParsing": "raw-preserved; heading candidates only, not a complete AST",
    }


def selected_numbers(catalog: dict[str, Any]) -> list[int]:
    primary: set[int] = set()
    for chapter in catalog["chapters"]:
        for number in chapter["primaryBips"]:
            if type(number) is not int or number <= 0 or number > 9999:
                raise ValueError("BIP IDs must be positive integers of at most four digits.")
            primary.add(number)
    supporting = catalog.get("supportingBips", [])
    if any(type(n) is not int or n <= 0 or n > 9999 for n in supporting):
        raise ValueError("Invalid supporting BIP ID.")
    return sorted(primary | set(supporting))


def snapshot(repo: Path, revision: str, catalog: dict[str, Any], out: Path) -> dict[str, Any]:
    validate_revision(revision)
    # A partial clone can cause Git itself to fetch missing objects lazily.
    # Require complete local objects so this read-only tool stays offline.
    config_lines = git(repo, "config", "--list").decode("utf-8", errors="replace").splitlines()
    for line in config_lines:
        key = line.partition("=")[0].lower()
        if key == "extensions.partialclone" or (key.startswith("remote.") and
                key.endswith((".promisor", ".partialclonefilter"))):
            raise ValueError("Partial/promisor clones are unsupported; use a complete local checkout.")
    commit = git(repo, "rev-parse", "--verify", f"{revision}^{{commit}}").decode().strip()
    if commit != revision:
        raise ValueError("Requested object is not the exact commit supplied.")
    tree = git(repo, "ls-tree", "-r", "-l", "-z", revision)
    entries: dict[str, tuple[str, str, str, int]] = {}
    for row in tree.split(b"\0"):
        if not row:
            continue
        metadata, filename = row.split(b"\t", 1)
        mode, typ, blob, size = metadata.decode().split()
        path = filename.decode("utf-8")
        entries[path] = (mode, typ, blob, int(size) if size.isdigit() else 0)
    numbers = selected_numbers(catalog)
    wanted: set[str] = set()
    sources: list[dict[str, Any]] = []
    for number in numbers:
        stem = f"bip-{number:04d}"
        candidates = [f"{stem}.{ext}" for ext in ("mediawiki", "md") if f"{stem}.{ext}" in entries]
        if len(candidates) != 1:
            raise ValueError(f"Expected exactly one source file for BIP {number}; found {candidates}")
        path = candidates[0]
        wanted.add(path)
        wanted.update(p for p in entries if p.startswith(stem + "/"))
        sources.append({"number": number, "path": path})
    for path in wanted:
        safe_path(path)
        mode, typ, _, size = entries[path]
        if typ != "blob" or mode not in {"100644", "100755"}:
            raise ValueError(f"Refusing symlink, submodule, or unsupported entry: {path}")
        if size > MAX_FILE_BYTES:
            raise ValueError(f"Oversized file: {path}")
    if sum(entries[p][3] for p in wanted) > MAX_TOTAL_BYTES:
        raise ValueError("Snapshot exceeds byte budget; review selection explicitly.")
    # Do not overwrite or follow symlinks into an existing output directory.
    if out.exists() or out.is_symlink():
        raise ValueError("Output already exists; choose a fresh snapshot directory.")
    out.mkdir(parents=True)
    files = []
    for path in sorted(wanted):
        data = git(repo, "cat-file", "blob", entries[path][2])
        if len(data) != entries[path][3]:
            raise ValueError(f"Unexpected size for {path}")
        target = out / "raw" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        # Saved blobs are data. No executable permission is propagated.
        target.chmod(0o644)
        files.append({"path": path, "gitBlob": entries[path][2],
                      "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    for source in sources:
        text = (out / "raw" / source["path"]).read_text(encoding="utf-8")
        source.update(parse_metadata(text, source["number"]))
        source["readerUrl"] = f"https://bips.dev/{source['number']}/"
        source["canonicalUrl"] = f"{REPO_URL}/blob/{revision}/{source['path']}"
    result = {
        "schemaVersion": "bip-atlas.sources.v1", "repository": REPO_URL,
        "commit": revision, "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "sources": sources, "files": files,
        "externalFixtures": "not fetched; independently pin explicitly allowlisted external repositories",
        "publicationReady": False,
    }
    (out / "sources.lock.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--catalog", default=Path("catalog.json"), type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    try:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        result = snapshot(args.repo, args.revision, catalog, args.out)
        print(f"Saved {len(result['sources'])} BIPs and {len(result['files'])} files at {result['commit']}")
        return 0
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f"Snapshot failed: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
