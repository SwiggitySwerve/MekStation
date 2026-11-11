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



def export_strict(mekfiles: Path, out_dir: Path, family: str | None = None, *, catalog_objects: bool = False) -> None:
    """All in-scope MTF/BLK sources, hashed independently of the oracle."""
    import hashlib
    import blk_capital_converter as capital
    import blk_battlearmor_converter as battlearmor
    import blk_infantry_converter as infantry
    import blk_protomech_converter as protomech
    from mtf_converter import MTFParser, dataclass_to_dict
    from strict_provenance import converter_inputs, write_source_manifest

    families = json.loads((Path(__file__).parent / "strict-families.json").read_text(encoding="utf-8"))
    if family is not None and family not in families:
        raise ValueError(f"Unknown strict family: {family}")
    folders = families[family] if family is not None else [folder for group in families.values() for folder in group]
    _require_scratch(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("strict_bv_export")
    parser = MTFParser()
    personnel = {"battlearmor": battlearmor.convert_battlearmor_blk,
                 "infantry": infantry.convert_infantry_blk,
                 "protomeks": protomech.convert_protomech_blk}
    output = out_dir / ("catalog-objects.ndjson" if catalog_objects else "sources.ndjson")
    with output.open("w", encoding="utf-8", newline="\n") as handle:
        for folder in folders:
            extension = "*.mtf" if folder == "meks" else "*.blk"
            for source in sorted((mekfiles / folder).rglob(extension)):
                row = {"path": source.relative_to(mekfiles).as_posix(),
                       "sha256": hashlib.sha256(source.read_bytes().replace(b"\r\n", b"\n")).hexdigest(), "unit": None}
                try:
                    if folder == "meks":
                        row["unit"] = dataclass_to_dict(parser.parse_file(str(source)))
                    elif folder in personnel:
                        if catalog_objects:
                            row["unit"] = personnel[folder](source, logger)
                        else:
                            row["sourceText"] = source.read_bytes().decode("utf-8")
                    elif folder in ("dropships", "jumpships", "warship", "spacestation"):
                        row["unit"] = capital.convert_capital_blk(source, logger)
                    elif folder == "vehicles":
                        row["unit"] = vehicle.convert_vehicle_blk(source, logger)
                        if row["unit"] is None:
                            row["unit"] = aerospace.convert_aerospace_blk(source, logger)
                    else:
                        row["unit"] = aerospace.convert_aerospace_blk(source, logger)
                    if row["unit"] is None and "reason" not in row and "sourceText" not in row:
                        row["reason"] = "Converter produced no unit"
                except Exception as error:
                    row["reason"] = str(error)
                handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
    if catalog_objects:
        # An object comparison artifact must not masquerade as BV input: the
        # numeric harness intentionally parses personnel from source text.
        payload = output.read_bytes()
        receipt = {"version": 1, "kind": "catalog-objects-only", "family": family,
                   "sourceCount": len(payload.splitlines()), "sourcesSha256": hashlib.sha256(payload).hexdigest(),
                   "converterInputs": converter_inputs()}
        output.with_name(output.name + '.manifest.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8', newline='\n')
    else:
        write_source_manifest(out_dir, list(folders), family)

if __name__ == "__main__":
    if len(sys.argv) > 3 and sys.argv[3] == "--strict":
        import argparse
        args = argparse.ArgumentParser()
        args.add_argument("mekfiles", type=Path)
        args.add_argument("out", type=Path)
        args.add_argument("--strict", action="store_true")
        args.add_argument("--family")
        args.add_argument("--catalog-objects", action="store_true", help="Object-parity artifact only; never numeric BV input")
        options = args.parse_args()
        export_strict(options.mekfiles, options.out, family=options.family, catalog_objects=options.catalog_objects)
    else:
        result = export(Path(sys.argv[1]), Path(sys.argv[2]))
        print({family: (info["converted"], len(info["skipped"])) for family, info in result.items()})
