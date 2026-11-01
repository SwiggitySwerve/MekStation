"""
unit_index.py — per-family ``index.json`` generator for converted unit catalogs.

Writes ``<units-dir>/<family>/index.json`` in the same shape as
``public/data/units/battlemechs/index.json`` (``version``, ``generatedAt``,
``totalUnits``, ``units[]``), with one addition: each entry carries ``unitType``,
because the loader must not assume every catalog is BattleMechs.

A unit's identity is (family, id) (owner ruling 2026-11-01), so ids must be
unique within a family and may repeat across families: ``tomahawk-c`` is both a
BattleMech and an aerospace fighter. Before writing anything it checks every
selected family; a duplicate id, or a family named with ``--family`` that does
not exist, exits 1 and writes nothing. Without ``--write`` it is a dry run, so a
scratch directory can be checked without touching ``public/data``.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_UNITS_ROOT = _REPO_ROOT / "public" / "data" / "units"

DEFAULT_FAMILIES = ("vehicles", "aerospace", "capital")
# Files in a units tree that are not units. The one owner of this list;
# run_schema_validation_only.py imports it.
NON_UNIT_FILES = frozenset({"index.json", "units-manifest.json"})

# The one owner of the index file shape. mtf_converter.generate_index (the
# BattleMech index) uses these too; family indexes add `unitType` after `model`.
INDEX_VERSION = "1.0.0"
INDEX_COLUMNS = ("id", "chassis", "model", "tonnage", "techBase", "year", "role", "rulesLevel", "path")


def index_envelope(units: List[Dict[str, Any]], generated_at: Optional[str] = None) -> Dict[str, Any]:
    return {
        "version": INDEX_VERSION,
        "generatedAt": generated_at or datetime.now().isoformat(),
        "totalUnits": len(units),
        "units": units,
    }


def build_index_entry(unit: Dict[str, Any], path: str) -> Dict[str, Any]:
    entry: Dict[str, Any] = {}
    for column in INDEX_COLUMNS:
        if column == "path":
            entry["path"] = path
        elif column == "role":
            entry["role"] = unit.get("role") or ""
        else:
            entry[column] = unit[column]
        if column == "model":
            entry["unitType"] = unit["unitType"]
    return entry


def generate_index(family_dir: Path, generated_at: Optional[str] = None) -> Dict[str, Any]:
    units: List[Dict[str, Any]] = []
    for unit_file in sorted(family_dir.rglob("*.json")):
        if unit_file.name in NON_UNIT_FILES:
            continue
        unit = json.loads(unit_file.read_text(encoding="utf-8"))
        rel = unit_file.relative_to(family_dir).as_posix()
        units.append(build_index_entry(unit, rel))
    units.sort(key=lambda u: (u["chassis"], u["model"], u["id"]))
    return index_envelope(units, generated_at)


def find_duplicate_ids(ids: List[str]) -> List[str]:
    """Ids that occur more than once in one family, each listed once, in first-seen order."""
    seen: Dict[str, int] = {}
    for unit_id in ids:
        seen[unit_id] = seen.get(unit_id, 0) + 1
    return [unit_id for unit_id, count in seen.items() if count > 1]


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Generate per-family unit index.json files.")
    parser.add_argument("--units-dir", default=str(_UNITS_ROOT), help="Directory holding the family subdirectories.")
    parser.add_argument(
        "--family",
        action="append",
        help=f"Converted family to index (repeatable), one of {list(DEFAULT_FAMILIES)}; default all of them.",
    )
    parser.add_argument("--write", action="store_true", help="Write the index files. Default is a dry run.")
    args = parser.parse_args(argv)

    units_dir = Path(args.units_dir)
    if not units_dir.is_dir():
        print(f"unit_index: units dir {units_dir} not found; nothing indexed")
        return 1
    families = list(dict.fromkeys(args.family or DEFAULT_FAMILIES))
    # Only the converted families. The BattleMech index belongs to mtf_converter and the shipped
    # catalog, which the owner ruling of 2026-11-01 does not allow editing; typos, path forms
    # and the units root itself are refused too, before anything is written.
    unknown = [family for family in families if family not in DEFAULT_FAMILIES]
    if unknown:
        print(f"unit_index: {unknown} not in {list(DEFAULT_FAMILIES)}; no index written")
        return 1
    indexes: Dict[str, Dict[str, Any]] = {}
    for family in families:
        family_dir = units_dir / family
        if family_dir.is_dir():
            indexes[family] = generate_index(family_dir)
        elif args.family:
            # A named family must exist; a typo would otherwise leave a stale index in place.
            print(f"unit_index: family {family} not found at {family_dir}; no index written")
            return 1
        else:
            print(f"  skip {family}: {family_dir} not found")

    duplicates = 0
    for family, index in indexes.items():
        print(f"  {family}: {index['totalUnits']} units")
        for unit_id in find_duplicate_ids([u["id"] for u in index["units"]]):
            print(f"  DUPLICATE {family}/{unit_id}")
            duplicates += 1
    if duplicates:
        print(f"unit_index: {duplicates} duplicate id(s) within a family; no index written")
        return 1

    if args.write:
        written = list(indexes)
        for family in written:
            (units_dir / family / "index.json").write_text(
                json.dumps(indexes[family], indent=2, ensure_ascii=False), encoding="utf-8"
            )
        print(f"unit_index: wrote {len(written)} index file(s) under {units_dir}")
    else:
        print("unit_index: dry run, nothing written (use --write)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
