"""
run_schema_validation_only.py — corpus conformance harness for the
cross-language schema bridge.

Walks the equipment-data corpus under
``public/data/equipment/official/<shape>/*.json`` and validates every
``items[]`` entry against the canonical JSON Schemas via
``schema_gate.py``. PR-A2 also validates the unit corpus at
``public/data/units/**/*.json`` (one unit per file, no ``items[]``
wrapper) when ``unit`` is in the requested shapes.

Modes:
  - ``--shape <name>`` (repeatable). Defaults to ``all`` (PR-A2). Use
    ``--shape all`` to enable every shape ``schema_gate`` knows.
  - ``--strict`` — exit code 1 on any conformance failure.

Output:
  - Human-readable summary printed to stdout.
  - ``validation-output/schema-bridge-report.json`` written for CI logs
    and follow-up analysis. Each entry contains ``file``, ``id``, and
    the list of failure messages.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List

# Ensure ``schema_gate`` resolves regardless of how the script is
# invoked (from repo root, from the script directory, or via CI).
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from schema_gate import SHAPE_VALIDATORS  # noqa: E402

_REPO_ROOT = _SCRIPT_DIR.parent.parent
_EQUIPMENT_ROOT = _REPO_ROOT / "public" / "data" / "equipment" / "official"
_UNITS_ROOT = _REPO_ROOT / "public" / "data" / "units"

# Map each schema-gate shape -> the on-disk subdirectory + filename glob
# that holds its corpus, FOR EQUIPMENT-STYLE shapes (single file with an
# ``items[]`` array). The ``unit`` shape lives elsewhere and is handled
# by ``collect_unit_files`` / ``validate_unit_shape`` below.
SHAPE_TO_CORPUS = {
    "weapon": ("weapons", "*.json"),
    "ammunition": ("ammunition", "*.json"),
    "electronics": ("electronics", "*.json"),
    "misc_equipment": ("miscellaneous", "*.json"),
    # `physical` lives inside `weapons/physical.json` — handled below.
    "physical_weapon": ("weapons", "physical.json"),
}

# All shapes the harness can validate, including ``unit`` which uses a
# different corpus path. ``--shape all`` resolves to this list.
ALL_SHAPES = sorted(set(SHAPE_TO_CORPUS) | {"unit"})

# Files inside the weapons directory that DO NOT match weapon-schema.json
# (they belong to the physical_weapon shape). Excluded from the weapon
# walk so we don't mis-attribute drift.
_WEAPON_EXCLUSIONS = {"physical.json"}

# Files inside the units tree that are NOT individual units (e.g.
# index.json catalogues per era directory). Skipped in the unit walk.
_UNIT_FILE_EXCLUSIONS = {"index.json"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate equipment + unit JSON corpus against the canonical JSON Schemas.",
    )
    parser.add_argument(
        "--shape",
        action="append",
        default=None,
        help=(
            "Shape(s) to validate. Repeatable. Defaults to ['all'] in PR-A2. "
            "Use --shape all to validate every supported shape. "
            f"Valid shapes: {ALL_SHAPES}."
        ),
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero if any item fails validation.",
    )
    parser.add_argument(
        "--report-path",
        default=str(_REPO_ROOT / "validation-output" / "schema-bridge-report.json"),
        help="Where to write the JSON report.",
    )
    return parser.parse_args()


def resolve_shapes(requested: List[str] | None) -> List[str]:
    """Resolve the --shape arg into a concrete list, defaulting to all shapes."""
    if not requested:
        # PR-A2: validate everything by default. PR-A1 used 'weapon' only.
        return ALL_SHAPES
    if "all" in requested:
        return ALL_SHAPES
    unknown = [s for s in requested if s not in ALL_SHAPES]
    if unknown:
        raise SystemExit(
            f"run_schema_validation_only: unknown shape(s) {unknown}; "
            f"valid shapes: {ALL_SHAPES}"
        )
    return requested


def collect_files(shape: str) -> List[Path]:
    """Return the list of equipment-style corpus files for ``shape``."""
    subdir, glob = SHAPE_TO_CORPUS[shape]
    base = _EQUIPMENT_ROOT / subdir
    if not base.is_dir():
        return []
    files = sorted(base.glob(glob))
    if shape == "weapon":
        files = [p for p in files if p.name not in _WEAPON_EXCLUSIONS]
    return files


def collect_unit_files() -> List[Path]:
    """Return all unit JSON files under ``public/data/units``."""
    if not _UNITS_ROOT.is_dir():
        return []
    return sorted(
        p for p in _UNITS_ROOT.rglob("*.json")
        if p.name not in _UNIT_FILE_EXCLUSIONS
    )


def validate_unit_shape() -> Dict[str, List[Dict[str, object]]]:
    """
    Validate the unit corpus. Unlike the equipment shapes, units are
    stored one-per-file (no ``items[]`` wrapper), so we walk the
    ``public/data/units`` tree and validate each file individually.
    """
    validator = SHAPE_VALIDATORS["unit"]
    out: Dict[str, List[Dict[str, object]]] = {}
    files = collect_unit_files()
    if not files:
        print(f"  WARN: no unit corpus under {_UNITS_ROOT}")
        return out

    for fpath in files:
        rel = str(fpath.relative_to(_REPO_ROOT)).replace(os.sep, "/")
        try:
            with fpath.open(encoding="utf-8") as fh:
                data = json.load(fh)
        except json.JSONDecodeError as e:
            out[rel] = [{"id": "<file>", "errors": [f"JSON decode error: {e}"]}]
            continue

        if not isinstance(data, dict):
            out[rel] = [
                {"id": "<file>", "errors": ["Unit file is not a JSON object."]}
            ]
            continue

        errors = validator(data)
        if errors:
            out[rel] = [
                {
                    "index": 0,
                    "id": data.get("id"),
                    "errors": errors,
                }
            ]
        else:
            out[rel] = []
    return out


def validate_shape(shape: str) -> Dict[str, List[Dict[str, object]]]:
    """Validate every item in every file of ``shape``."""
    if shape == "unit":
        return validate_unit_shape()

    validator = SHAPE_VALIDATORS[shape]
    out: Dict[str, List[Dict[str, object]]] = {}
    files = collect_files(shape)
    if not files:
        print(f"  WARN: no corpus files for shape={shape} under {_EQUIPMENT_ROOT}")
        return out

    for fpath in files:
        rel = str(fpath.relative_to(_REPO_ROOT)).replace(os.sep, "/")
        try:
            with fpath.open(encoding="utf-8") as fh:
                data = json.load(fh)
        except json.JSONDecodeError as e:
            out[rel] = [{"id": "<file>", "errors": [f"JSON decode error: {e}"]}]
            continue

        items = data.get("items") if isinstance(data, dict) else None
        if not isinstance(items, list):
            out[rel] = [
                {"id": "<file>", "errors": ["File missing 'items' array."]}
            ]
            continue

        failures: List[Dict[str, object]] = []
        for index, item in enumerate(items):
            errors = validator(item)
            if errors:
                failures.append(
                    {
                        "index": index,
                        "id": (item.get("id") if isinstance(item, dict) else None),
                        "errors": errors,
                    }
                )
        out[rel] = failures
    return out


def _count_items(rel: str, shape: str) -> int:
    """
    Count items contributed by ``rel`` to the totals row. For
    equipment-style shapes we use the ``items[]`` length; for unit
    shape each file is exactly 1 item.
    """
    if shape == "unit":
        return 1
    try:
        with (_REPO_ROOT / rel).open(encoding="utf-8") as fh:
            data = json.load(fh)
        return len(data.get("items") or [])
    except Exception:
        return 0


def main() -> int:
    args = parse_args()
    shapes = resolve_shapes(args.shape)

    print("schema-bridge: corpus conformance check")
    print(f"  shapes:   {shapes}")
    print(f"  strict:   {args.strict}")
    print(f"  equipment root: {_EQUIPMENT_ROOT}")
    print(f"  units root:     {_UNITS_ROOT}")
    print()

    report: Dict[str, Dict[str, List[Dict[str, object]]]] = {}
    total_files = 0
    total_items = 0
    total_failures = 0

    for shape in shapes:
        shape_results = validate_shape(shape)
        report[shape] = shape_results
        # For unit shape we report a single rolled-up line because
        # 4k+ rows would dominate the output.
        if shape == "unit":
            shape_failures = sum(len(v) for v in shape_results.values())
            shape_files = len(shape_results)
            total_files += shape_files
            total_items += shape_files
            total_failures += shape_failures
            status = (
                "OK" if shape_failures == 0
                else f"FAIL ({shape_failures} of {shape_files})"
            )
            print(f"  [{shape}] (rolled-up across {shape_files} files): {status}")
            # If any failures, surface the first 5 so logs are useful
            if shape_failures > 0:
                surfaced = 0
                for rel, failures in sorted(shape_results.items()):
                    if not failures or surfaced >= 5:
                        continue
                    print(f"    {rel}: {failures[0]['errors'][:2]}")
                    surfaced += 1
                if shape_failures > 5:
                    print(f"    ... and {shape_failures - 5} more (see report)")
            continue

        for rel, failures in shape_results.items():
            total_files += 1
            total_items += _count_items(rel, shape)
            total_failures += len(failures)
            status = "OK" if not failures else f"FAIL ({len(failures)})"
            print(f"  [{shape}] {rel}: {status}")

    # Always write the report so CI logs can attach it as an artifact.
    report_path = Path(args.report_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "shapes": shapes,
                "totals": {
                    "files": total_files,
                    "items": total_items,
                    "failures": total_failures,
                },
                "results": report,
            },
            fh,
            indent=2,
            ensure_ascii=False,
        )

    print()
    print("--- Summary ---")
    print(f"  files:    {total_files}")
    print(f"  items:    {total_items}")
    print(f"  failures: {total_failures}")
    print(f"  report:   {report_path}")

    if total_failures > 0 and args.strict:
        print(
            "\nschema-bridge: --strict mode triggered; corpus has "
            f"{total_failures} item(s) failing canonical schemas."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
