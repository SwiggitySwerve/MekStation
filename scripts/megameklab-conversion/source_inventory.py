"""Inventory immutable mm-data Git objects; never convert or publish a catalog.

@spec unit-services: Immutable source inventory (establish-all-unit-data-parity)
Format discovery follows MegaMek MekFileParser.parse at 48fcb2f64a1b3f2d575707ce5653dad64927b587.
An inventoried file is not evidence of a loadable entity or correct calculation.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

SOURCE_ROOT = "data/mekfiles"
SOURCE_FORMATS = frozenset({"mtf", "blk", "bfs"})


class InventoryError(ValueError):
    """The selected source cannot produce a complete, nonempty inventory."""


def _git(repo: Path, *args: str, data: bytes | None = None) -> bytes:
    try:
        result = subprocess.run(
            ["git", "--no-replace-objects", "-C", str(repo), *args],
            input=data, capture_output=True, check=True,
        )
        return result.stdout
    except (OSError, subprocess.CalledProcessError) as error:
        detail = getattr(error, "stderr", b"").decode("utf-8", errors="replace").strip()
        raise InventoryError(f"Git source read failed: {detail or error}") from error


def build_inventory(repo: Path, commit: str, *, repository: str) -> dict:
    """Return byte-stable source records, independent of the Git worktree.

    Read batches of immutable blobs rather than running one Git process per file.
    Preserve all entries, including metadata and archive containers, so later
    coverage reports cannot silently shrink their source denominator.
    Repository identity is supplied by the caller, not inferred from content or
    copied from a mutable remote configuration. This does not attest ownership.
    """
    if not repository or repository != repository.strip():
        raise InventoryError("Supply a nonempty repository identity without surrounding whitespace")
    if not re.fullmatch(r"[0-9a-fA-F]{40}|[0-9a-fA-F]{64}", commit):
        raise InventoryError("Supply a full commit hash, not a branch or abbreviation")
    resolved = _git(repo, "rev-parse", "--verify", f"{commit}^{{commit}}").decode().strip()
    if resolved.lower() != commit.lower():
        raise InventoryError("Source revision must identify a commit directly")
    tree = _git(repo, "ls-tree", "-rz", resolved, "--", SOURCE_ROOT)
    entries = []
    for raw in tree.split(b"\0"):
        if not raw:
            continue
        header, raw_path = raw.split(b"\t", 1)
        mode, kind, blob = header.decode("ascii").split()
        try:
            path = raw_path.decode("utf-8")
        except UnicodeDecodeError as error:
            raise InventoryError("Source path is not valid UTF-8") from error
        if kind != "blob" or mode not in {"100644", "100755"}:
            raise InventoryError(f"Cannot inventory non-regular source entry: {path} ({mode})")
        suffix = PurePosixPath(path).suffix.lower().removeprefix(".")
        entries.append({
            "path": path, "format": suffix or None,
            "kind": "source" if suffix in SOURCE_FORMATS else "archive" if suffix == "zip" else "other",
            "blob": blob, "mode": mode,
        })
    entries.sort(key=lambda entry: entry["path"])
    if not any(entry["kind"] == "source" for entry in entries):
        raise InventoryError(f"Pinned tree contains no source definitions under {SOURCE_ROOT}")

    # Bound peak memory even when a future source corpus adds large assets.
    for start in range(0, len(entries), 256):
        batch = entries[start:start + 256]
        requests = "".join(f"{entry['blob']}\n" for entry in batch).encode("ascii")
        stream = io.BytesIO(_git(repo, "cat-file", "--batch", data=requests))
        for entry in batch:
            header = stream.readline().decode("ascii").strip().split()
            if len(header) != 3 or header[:2] != [entry["blob"], "blob"]:
                raise InventoryError(f"Unexpected Git blob response for {entry['path']}")
            size = int(header[2])
            content = stream.read(size)
            if len(content) != size or stream.read(1) != b"\n":
                raise InventoryError(f"Incomplete Git blob response for {entry['path']}")
            entry.update({"bytes": size, "sha256": hashlib.sha256(content).hexdigest()})
        if stream.read():
            raise InventoryError("Unexpected trailing Git batch output")

    by_format = Counter(entry["format"] for entry in entries if entry["kind"] == "source")
    return {
        "schemaVersion": 1,
        "repository": repository,
        "commit": resolved,
        "sourceRoot": SOURCE_ROOT,
        "entityLoading": "not-run",
        "parity": "not-run",
        "summary": {
            "trackedFiles": len(entries),
            "sourceFiles": sum(by_format.values()),
            "byFormat": dict(sorted(by_format.items())),
            "archiveFiles": sum(entry["kind"] == "archive" for entry in entries),
            "otherFiles": sum(entry["kind"] == "other" for entry in entries),
        },
        "entries": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path, help="Local mm-data Git repository")
    parser.add_argument("--repository", required=True,
                        help="Asserted repository identity URI; preserved exactly, not fetched or verified")
    parser.add_argument("--commit", required=True, help="Full immutable mm-data commit hash")
    args = parser.parse_args()
    try:
        report = build_inventory(args.repo, args.commit, repository=args.repository)
    except InventoryError as error:
        print(f"Source inventory failed: {error}", file=sys.stderr)
        return 1
    # Binary stdout avoids platform newline/encoding changes to the JSON artifact.
    sys.stdout.buffer.write((json.dumps(report, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
