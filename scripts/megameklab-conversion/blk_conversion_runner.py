"""Shared BLK converter runner and parity helpers."""

from __future__ import annotations

import argparse
import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from blk_common import (
    extract_tags,
    get_string,
    remove_comments,
    setup_logger,
    write_manifest,
    write_parity_report,
    write_run_log,
)

UnitDict = Dict[str, Any]
Converter = Callable[[Path, logging.Logger], Optional[UnitDict]]
ManifestBuilder = Callable[[UnitDict], UnitDict]
ParityRunner = Callable[[List[UnitDict], logging.Logger], Tuple[int, List[UnitDict]]]
FileCollector = Callable[[Path, logging.Logger], Optional[List[Path]]]
FilenameBuilder = Callable[[UnitDict], str]


@dataclass(frozen=True)
class BlkConversionConfig:
    converter: str
    description: str
    source_default: str
    source_help: str
    output_default: str
    output_help: str
    type_name: str
    parity_report_filename: str
    run_log_filename: str
    convert_unit: Converter
    build_manifest_entry: ManifestBuilder
    run_parity_checks: ParityRunner
    collect_files: Optional[FileCollector] = None
    unsupported_unit_types: Optional[Iterable[str]] = None
    filename_builder: Optional[FilenameBuilder] = None
    verbose_help: str = "Verbose logging"


def collect_recursive_blk_files(source_dir: Path, logger: logging.Logger) -> Optional[List[Path]]:
    if not source_dir.exists():
        logger.error(f"Source directory not found: {source_dir}")
        return None
    blk_files = sorted(source_dir.rglob("*.blk"))
    logger.info(f"Found {len(blk_files)} BLK files under {source_dir}")
    return blk_files


def collect_subdir_blk_files(
    source_root: Path,
    logger: logging.Logger,
    subdirs: Iterable[str],
) -> Optional[List[Path]]:
    blk_files: List[Path] = []
    for subdir in subdirs:
        source_dir = source_root / subdir
        if source_dir.exists():
            blk_files.extend(sorted(source_dir.rglob("*.blk")))
        else:
            logger.warning(f"Source subdir not found: {source_dir}")
    logger.info(f"Found {len(blk_files)} BLK files in configured subdirs")
    return blk_files


def safe_unit_filename(unit: UnitDict) -> str:
    return f"{unit['chassis']} {unit['model']}".strip().replace("/", "-").replace(":", "-")


def strict_safe_unit_filename(unit: UnitDict) -> str:
    return re.sub(r"[\\/:*?\"<>|]", "-", f"{unit['chassis']} {unit['model']}".strip())


def classify_unit_type(path: Path, unsupported_unit_types: Iterable[str]) -> str:
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
        tags = extract_tags(remove_comments(raw))
        unit_type = get_string(tags, "UnitType") or ""
    except Exception:
        return "other"
    return "unsupported" if unit_type in set(unsupported_unit_types) else "other"


def run_manifest_range_parity(
    manifest: List[UnitDict],
    targets: List[UnitDict],
    logger: logging.Logger,
    *,
    value_field: Optional[str] = None,
    target_value_field_key: Optional[str] = None,
    min_target_key: str,
    max_target_key: str,
    expected_min_record_key: str,
    expected_max_record_key: str,
    actual_record_key: str,
    log_label: str,
    index_overwrite: bool = False,
) -> Tuple[int, List[UnitDict]]:
    failures = 0
    index: Dict[str, UnitDict] = {}
    for entry in manifest:
        key = entry.get("chassis", "").lower()
        if index_overwrite:
            index[key] = entry
        else:
            index.setdefault(key, entry)

    records: List[UnitDict] = []
    for target in targets:
        chassis = target["chassis"]
        entry = index.get(chassis.lower())
        record: UnitDict = {
            "chassis": chassis,
            expected_min_record_key: target[min_target_key],
            expected_max_record_key: target[max_target_key],
        }
        if target_value_field_key:
            record["field"] = target[target_value_field_key]
        if entry is None:
            logger.warning(f"Parity: '{chassis}' not found in output")
            record["status"] = "missing"
            failures += 1
            records.append(record)
            continue

        field = str(target[target_value_field_key]) if target_value_field_key else str(value_field)
        actual = entry.get(field, 0)
        display_label = field if target_value_field_key else log_label
        record[actual_record_key] = actual
        record["actual_equipment_count"] = len(entry.get("equipment", []) or [])
        if not (target[min_target_key] <= actual <= target[max_target_key]):
            logger.error(
                f"Parity FAIL: {chassis} {display_label}={actual} "
                f"expected [{target[min_target_key]},{target[max_target_key]}]"
            )
            record["status"] = "fail"
            failures += 1
        else:
            logger.info(f"Parity OK: {chassis} {display_label}={actual}")
            record["status"] = "ok"
        records.append(record)
    return failures, records


def run_blk_conversion(config: BlkConversionConfig) -> int:
    parser = argparse.ArgumentParser(description=config.description)
    parser.add_argument("--source", default=config.source_default, help=config.source_help)
    parser.add_argument("--output", default=config.output_default, help=config.output_help)
    parser.add_argument("--verbose", "-v", action="store_true", help=config.verbose_help)
    args = parser.parse_args()

    logger = setup_logger(config.converter, args.verbose)
    source_dir = Path(args.source)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    collect_files = config.collect_files or collect_recursive_blk_files
    blk_files = collect_files(source_dir, logger)
    if blk_files is None:
        return 1

    converted = 0
    skipped = 0
    skipped_unsupported = 0
    skipped_other = 0
    errors = 0
    manifest: List[UnitDict] = []
    filename_builder = config.filename_builder or safe_unit_filename
    unsupported = tuple(config.unsupported_unit_types or ())

    for blk_path in blk_files:
        unit = config.convert_unit(blk_path, logger)
        if unit is None:
            if unsupported:
                skip_kind = classify_unit_type(blk_path, unsupported)
                if skip_kind == "unsupported":
                    skipped_unsupported += 1
                else:
                    skipped_other += 1
            else:
                skipped += 1
            continue

        out_path = output_dir / f"{filename_builder(unit)}.json"
        try:
            out_path.write_text(json.dumps(unit, indent=2, ensure_ascii=False), encoding="utf-8")
            converted += 1
            manifest.append(config.build_manifest_entry(unit))
        except OSError as exc:
            logger.error(f"Failed to write {out_path}: {exc}")
            errors += 1

    errors += write_manifest(manifest, output_dir / "units-manifest.json", config.type_name, logger)

    parity_failures, parity_records = config.run_parity_checks(manifest, logger)
    validation_dir = Path(__file__).parent.parent.parent / "validation-output"
    write_parity_report(
        config.type_name,
        parity_records,
        parity_failures,
        validation_dir / config.parity_report_filename,
        logger,
    )

    if unsupported:
        logger.info(
            f"Done. converted={converted} skipped_unsupported={skipped_unsupported} "
            f"skipped_other={skipped_other} errors={errors} parity_failures={parity_failures}"
        )
        run_log: UnitDict = {
            "converter": config.converter,
            "source": str(source_dir),
            "output": str(output_dir),
            "converted": converted,
            "skipped_unsupported": skipped_unsupported,
            "skipped_other": skipped_other,
            "errors": errors,
            "parity_failures": parity_failures,
        }
    else:
        logger.info(
            f"Done. converted={converted} skipped={skipped} "
            f"errors={errors} parity_failures={parity_failures}"
        )
        run_log = {
            "converter": config.converter,
            "source": str(source_dir),
            "output": str(output_dir),
            "converted": converted,
            "skipped": skipped,
            "errors": errors,
            "parity_failures": parity_failures,
        }

    write_run_log(run_log, validation_dir / config.run_log_filename, logger)
    return 1 if (errors > 0 or parity_failures > 0) else 0
