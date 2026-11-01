"""
unit_index.py — per-family ``index.json`` generator for converted unit catalogs.

Writes ``<units-dir>/<family>/index.json`` in the same shape as
``public/data/units/battlemechs/index.json`` (``version``, ``generatedAt``,
``totalUnits``, ``units[]``), with one addition: each entry carries ``unitType``,
because the loader must not assume every catalog is BattleMechs.

Before writing anything it checks that ids are unique across every family being
indexed and the reserved (already shipped) indexes, e.g. the BattleMech index.
A collision exits 1 and writes nothing. Without ``--write`` it is a dry run, so
a scratch directory can be checked without touching ``public/data``.
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
_MECH_INDEX = _UNITS_ROOT / "battlemechs" / "index.json"

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


def find_id_collisions(ids_by_catalog: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Map each id seen more than once to the catalogs holding it, one name per occurrence."""
    seen: Dict[str, List[str]] = {}
    for catalog, ids in ids_by_catalog.items():
        for unit_id in ids:
            seen.setdefault(unit_id, []).append(catalog)
    return {unit_id: owners for unit_id, owners in seen.items() if len(owners) > 1}


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Generate per-family unit index.json files.")
    parser.add_argument("--units-dir", default=str(_UNITS_ROOT), help="Directory holding the family subdirectories.")
    parser.add_argument("--family", action="append", help=f"Family directory to index (repeatable). Default: {list(DEFAULT_FAMILIES)}.")
    parser.add_argument(
        "--reserved-index",
        action="append",
        help=(
            "Already shipped index.json whose ids must stay unique (repeatable). Passing any replaces "
            "the default, the BattleMech index; a path that does not exist exits 1."
        ),
    )
    parser.add_argument("--write", action="store_true", help="Write the index files. Default is a dry run.")
    args = parser.parse_args(argv)

    units_dir = Path(args.units_dir)
    if not units_dir.is_dir():
        print(f"unit_index: units dir {units_dir} not found; nothing indexed")
        return 1
    # Index every present family for the uniqueness check, even with --family:
    # a filtered write must not publish an id a sibling family already holds.
    selected = list(args.family or DEFAULT_FAMILIES)
    indexes: Dict[str, Dict[str, Any]] = {}
    for family in dict.fromkeys([*DEFAULT_FAMILIES, *selected]):
        family_dir = units_dir / family
        if family_dir.is_dir():
            indexes[family] = generate_index(family_dir)
        elif family in selected:
            print(f"  skip {family}: {family_dir} not found")

    ids_by_catalog: Dict[str, List[str]] = {}
    for reserved in args.reserved_index or [str(_MECH_INDEX)]:
        reserved_path = Path(reserved)
        # Fail closed: a missing reserved index would silently drop the uniqueness check.
        if not reserved_path.is_file():
            print(f"unit_index: reserved index {reserved_path} not found; no index written")
            return 1
        data = json.loads(reserved_path.read_text(encoding="utf-8"))
        ids_by_catalog[str(reserved_path)] = [u["id"] for u in data["units"]]
    for family, index in indexes.items():
        ids_by_catalog[family] = [u["id"] for u in index["units"]]

    collisions = find_id_collisions(ids_by_catalog)
    for family, index in indexes.items():
        print(f"  {family}: {index['totalUnits']} units")
    if collisions:
        for unit_id, owners in sorted(collisions.items()):
            print(f"  COLLISION {unit_id}: {owners}")
        print(f"unit_index: {len(collisions)} duplicate id(s); no index written")
        return 1

    if args.write:
        written = [family for family in indexes if family in selected]
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
