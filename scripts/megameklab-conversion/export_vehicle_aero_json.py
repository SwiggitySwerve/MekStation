"""Write what the vehicle and aerospace converters produce as NDJSON rows `{path, unit}`.

`path` is relative to mekfiles (the join key to the UL-16 Java reference rows); skipped sources are
listed in `export-summary.json`. Output goes to the scratch directory named, never this checkout's `public/data`
(the guard cannot know about other checkouts' catalogs).

Usage: python -B export_vehicle_aero_json.py <mekfiles> <out-dir>
"""

import collections
import json
import logging
import os
import sys
from pathlib import Path

import blk_aerospace_converter as aerospace
import blk_vehicle_converter as vehicle

FAMILIES = (
    ("vehicles", ("vehicles",), vehicle.convert_vehicle_blk),
    ("aerospace", ("fighters", "convfighter", "smallcraft"), aerospace.convert_aerospace_blk),
)


PROTECTED_DATA_DIR = Path(__file__).resolve().parents[2] / "public" / "data"


def _require_scratch(out_dir: Path) -> None:
    """Refuse the shipped data tree and anything under it, before any filesystem write.

    Decided by directory identity, not spelling: the target and each existing ancestor are
    compared with `os.path.samefile`, which sees through `..`, letter case, junctions and
    Windows `\\\\?\\` prefixes, and works across drives.
    """
    target = out_dir.resolve()
    for candidate in (target, *target.parents):
        if candidate.exists() and os.path.samefile(candidate, PROTECTED_DATA_DIR):
            raise ValueError(f"export output must be a scratch directory, not under public/data: {out_dir}")


def export(mekfiles: Path, out_dir: Path) -> dict:
    _require_scratch(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("export_vehicle_aero_json")
    logger.addHandler(logging.NullHandler())
    summary = {}
    for family, source_dirs, convert in FAMILIES:
        by_type = collections.Counter()
        skipped = []
        with open(out_dir / f"{family}.ndjson", "w", encoding="utf-8", newline="\n") as handle:
            for source_dir in source_dirs:
                for blk in sorted((mekfiles / source_dir).rglob("*.blk")):
                    rel = blk.relative_to(mekfiles).as_posix()
                    unit = convert(blk, logger)
                    if unit is None:
                        skipped.append(rel)
                        continue
                    by_type[unit["unitType"]] += 1
                    handle.write(json.dumps({"path": rel, "unit": unit}, ensure_ascii=False, sort_keys=True) + "\n")
        summary[family] = {"converted": sum(by_type.values()), "byUnitType": dict(by_type), "skipped": skipped}
    (out_dir / "export-summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    return summary


if __name__ == "__main__":
    result = export(Path(sys.argv[1]), Path(sys.argv[2]))
    print({family: (info["converted"], len(info["skipped"])) for family, info in result.items()})
