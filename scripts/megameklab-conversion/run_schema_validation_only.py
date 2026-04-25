"""
run_schema_validation_only.py — corpus conformance harness for the
cross-language schema bridge.

Walks the equipment-data corpus under
``public/data/equipment/official/<shape>/*.json`` and validates every
``items[]`` entry against the canonical JSON Schemas via
``schema_gate.py``. Used by the ``schema-bridge`` CI job.

Modes:
  - ``--shape weapon`` (default) — only validate weapon shape; PR-A1 is
    weapon-pilot only. Repeat the flag to enable additional shapes; use
    ``--shape all`` to enable every shape ``schema_gate`` knows.
  - ``--strict`` — exit code 1 on any conformance failure. Without
    ``--strict`` the script reports failure counts but always exits 0,
    which is what PR-A1 wants (corpus is known to have ~6 drift items
    that PR-A2 will fix).

Output:
  - Human-readable summary printed to stdout.
  - ``validation-output/schema-bridge-report.json`` written for CI logs
    and follow-up analysis. Each entry contains ``file``, ``id``, and
    the list of failure messages.

This script replaces a much earlier PostgreSQL-flavoured stub (which
referenced a no-longer-existing ``schemas/`` directory and an old
``validator.py`` import path). The historical version validated the
mekfiles tree against per-unit-type schemas; that flow has been
superseded by the SQLite migration and the cross-language schema bridge,
so the file is repurposed here. Anything that needs the legacy mekfiles
walk should use the SQLite-side validator at ``mekstation-app/data/``.
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

# Map each schema-gate shape -> the on-disk subdirectory + filename glob
# that holds its corpus. Some shapes (``unit``) live elsewhere; we leave
# them out of PR-A1's reach so the harness stays focused on equipment.
SHAPE_TO_CORPUS = {
    "weapon": ("weapons", "*.json"),
    "ammunition": ("ammunition", "*.json"),
    "electronics": ("electronics", "*.json"),
    "misc_equipment": ("miscellaneous", "*.json"),
    # `physical` lives inside `weapons/physical.json` — handled below.
    "physical_weapon": ("weapons", "physical.json"),
}

# Files inside the weapons directory that DO NOT match weapon-schema.json
# (they belong to the physical_weapon shape). Excluded from the weapon
# walk so we don't mis-attribute drift.
_WEAPON_EXCLUSIONS = {"physical.json"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate equipment JSON corpus against the canonical JSON Schemas.",
    )
    parser.add_argument(
        "--shape",
        action="append",
        default=None,
        help=(
            "Shape(s) to validate. Repeatable. Defaults to ['weapon']. "
            "Use --shape all to validate every supported shape. "
            f"Valid shapes: {sorted(SHAPE_TO_CORPUS)}."
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
    """Resolve the --shape arg into a concrete list, defaulting to weapon."""
    if not requested:
        return ["weapon"]
    if "all" in requested:
        return sorted(SHAPE_TO_CORPUS)
    unknown = [s for s in requested if s not in SHAPE_TO_CORPUS]
    if unknown:
        raise SystemExit(
            f"run_schema_validation_only: unknown shape(s) {unknown}; "
            f"valid shapes: {sorted(SHAPE_TO_CORPUS)}"
        )
    return requested


def collect_files(shape: str) -> List[Path]:
    """Return the list of corpus files for ``shape``."""
    subdir, glob = SHAPE_TO_CORPUS[shape]
    base = _EQUIPMENT_ROOT / subdir
    if not base.is_dir():
        return []
    files = sorted(base.glob(glob))
    if shape == "weapon":
        files = [p for p in files if p.name not in _WEAPON_EXCLUSIONS]
    return files


def validate_shape(shape: str) -> Dict[str, List[Dict[str, object]]]:
    """
    Validate every item in every file of ``shape``. Returns a dict
    keyed by relative file path; values are a list of per-item failure
    records. Files with zero failures are still included with an empty
    list so the report distinguishes "validated, all-clean" from
    "skipped".
    """
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


def main() -> int:
    args = parse_args()
    shapes = resolve_shapes(args.shape)

    print("schema-bridge: corpus conformance check")
    print(f"  shapes:   {shapes}")
    print(f"  strict:   {args.strict}")
    print(f"  root:     {_EQUIPMENT_ROOT}")
    print()

    report: Dict[str, Dict[str, List[Dict[str, object]]]] = {}
    total_files = 0
    total_items = 0
    total_failures = 0

    for shape in shapes:
        shape_results = validate_shape(shape)
        report[shape] = shape_results
        for rel, failures in shape_results.items():
            total_files += 1
            # We need the item count for the summary; reread the file
            # cheaply (it was already JSON-parsed during validation, but
            # the parsed object is not retained to keep memory bounded).
            try:
                with (_REPO_ROOT / rel).open(encoding="utf-8") as fh:
                    data = json.load(fh)
                total_items += len(data.get("items") or [])
            except Exception:
                pass
            total_failures += len(failures)
            failure_count = len(failures)
            status = "OK" if failure_count == 0 else f"FAIL ({failure_count})"
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
