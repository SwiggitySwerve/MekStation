"""
BLK Vehicle Converter

Converts MegaMek BLK (Building Block) files for ground vehicles (Tank, VTOL,
SupportTank, SupportVTOL, Naval, Wheeled, Hover, Hydrofoil, Submarine, WiGE)
into JSON conforming to the IVehicle / IVTOL shape used by MekStation.

Output: public/data/units/vehicles/<name>.json
Manifest: public/data/units/vehicles/units-manifest.json

Usage:
    python blk_vehicle_converter.py \\
        --source /path/to/mm-data/data/mekfiles/vehicles \\
        --output /path/to/public/data/units/vehicles

Skips WarShip / DropShip / JumpShip unit types with a warning log.
"""

import argparse
import json
import logging
import math
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Shared BLK helpers + enum_mappings re-exports — see blk_common.py for the
# extraction rationale (2026-04-25 maintenance sweep).
from blk_common import (
    default_mm_data_root,
    extract_tags,
    generate_id_from_name,
    get_string,
    map_armor_code,
    map_engine_type,
    map_rules_level,
    map_tech_base,
    map_year_to_era,
    normalize_equipment_id,
    parse_armor_array,
    parse_number,
    remove_comments,
    setup_logger,
    write_manifest,
    write_parity_report,
    write_run_log,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# BLK unit type strings considered ground vehicles
VEHICLE_UNIT_TYPES = {
    "Tank", "VTOL", "SupportTank", "SupportVTOL", "Naval",
    "Hover", "Wheeled", "Tracked", "Hydrofoil", "Submarine", "WiGE",
}

# BLK unit types to skip
UNSUPPORTED_UNIT_TYPES = {
    "Warship", "WarShip", "Dropship", "DropShip", "JumpShip", "Jumpship",
    "SpaceStation", "LAM", "QuadVee", "MobileStructure",
}

# Vehicle armor location order in BLK files: Front, Right, Left, Rear, Turret (optional)
VEHICLE_ARMOR_LOCATIONS = ["FRONT", "RIGHT", "LEFT", "REAR", "TURRET"]

# BLK equipment section tag → canonical location key
VEHICLE_LOCATION_MAP: Dict[str, str] = {
    "Front Equipment": "FRONT",
    "Right Equipment": "RIGHT",
    "Left Equipment": "LEFT",
    "Rear Equipment": "REAR",
    "Turret Equipment": "TURRET",
    "Body Equipment": "BODY",
    "Secondary Turret Equipment": "TURRET_2",
    "Front Turret Equipment": "TURRET",
    "Sponson Turret Equipment": "SPONSON",
}

# Motion type mapping: BLK motion_type value → IVehicle motionType
MOTION_TYPE_MAP: Dict[str, str] = {
    "Tracked": "Tracked",
    "Wheeled": "Wheeled",
    "Hover": "Hover",
    "VTOL": "VTOL",
    "Naval": "Naval",
    "Hydrofoil": "Hydrofoil",
    "Submarine": "Submarine",
    "WiGE": "WiGE",
    "Rail": "Rail",
    "Maglev": "Maglev",
    # BLK sometimes uses these
    "Leg": "Tracked",
    "Jump": "VTOL",
}

# Engine type code numeric → string (supplements enum_mappings for codes 6+)
ENGINE_CODE_EXT: Dict[str, str] = {
    "6": "ICE",
    "7": "FUEL_CELL",
    "8": "FISSION",
    "9": "SOLAR",
    "10": "BATTERY",
    "11": "FLYWHEEL",
    "12": "STEAM",
    "13": "MAGLEV",
    "14": "NONE",
    "15": "EXTERNAL",
}

# Armor type code numeric → string (commonly seen in BLK armor_type tag)
ARMOR_CODE_MAP: Dict[int, str] = {
    0: "STANDARD",
    1: "FERRO_FIBROUS",
    2: "REACTIVE",
    3: "REFLECTIVE",
    4: "HARDENED",
    5: "LIGHT_FERRO_FIBROUS",
    6: "HEAVY_FERRO_FIBROUS",
    7: "PATCHWORK",
    8: "STEALTH",
    31: "COMMERCIAL",
    32: "INDUSTRIAL",
    33: "HEAVY_INDUSTRIAL",
    34: "FERRO_FIBROUS_CLAN",
    35: "REFLECTIVE_CLAN",
    36: "REACTIVE_CLAN",
    37: "FERRO_LAMELLOR",
    38: "ANTI_PENETRATIVE_ABLATION",
    39: "PRIMITIVE",
    40: "IMPACT_RESISTANT",
    41: "BAR_2",
    42: "BAR_3",
    43: "BAR_4",
    44: "BAR_5",
    45: "BAR_6",
    46: "BAR_7",
    47: "BAR_8",
    48: "BAR_9",
    49: "BAR_10",
}


# ---------------------------------------------------------------------------
# Vehicle-specific helpers
# ---------------------------------------------------------------------------

def map_engine_code(code: Any) -> str:
    """Map numeric engine_type code to string constant."""
    if code is None:
        return "FUSION"
    code_str = str(code).strip()
    # Try extended map first (codes 6+)
    if code_str in ENGINE_CODE_EXT:
        return ENGINE_CODE_EXT[code_str]
    return map_engine_type(code_str)


def map_motion_type(raw: Optional[str]) -> str:
    """Map BLK motion_type string to IVehicle motionType."""
    if not raw:
        return "Tracked"
    return MOTION_TYPE_MAP.get(raw.strip(), raw.strip())


def get_weight_class(tonnage: float, motion_type: str) -> str:
    """Derive a BattleTech weight class label from tonnage."""
    if tonnage <= 20:
        return "LIGHT"
    elif tonnage <= 40:
        return "MEDIUM"
    elif tonnage <= 60:
        return "HEAVY"
    elif tonnage <= 100:
        return "ASSAULT"
    else:
        return "SUPERHEAVY"


# ---------------------------------------------------------------------------
# Converter core
# ---------------------------------------------------------------------------

def convert_vehicle_blk(blk_path: Path, logger: logging.Logger) -> Optional[Dict[str, Any]]:
    """
    Parse one BLK file and return a vehicle JSON dict.
    Returns None if the file should be skipped (unsupported type or parse error).
    """
    try:
        content = blk_path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        logger.warning(f"Cannot read {blk_path}: {e}")
        return None

    clean = remove_comments(content)
    tags = extract_tags(clean)

    # --- Unit type gate ---
    unit_type_raw = get_string(tags, "UnitType")
    if unit_type_raw is None:
        logger.warning(f"Skipping {blk_path.name}: missing UnitType tag")
        return None

    if unit_type_raw in UNSUPPORTED_UNIT_TYPES:
        logger.info(f"Skipping {blk_path.name}: unsupported type '{unit_type_raw}'")
        return None

    if unit_type_raw not in VEHICLE_UNIT_TYPES:
        # Not a vehicle (e.g., Mech, ProtoMech, Infantry) — pass to another converter
        logger.debug(f"Skipping {blk_path.name}: not a vehicle type ('{unit_type_raw}')")
        return None

    # --- Required fields ---
    name = get_string(tags, "Name")
    if not name:
        logger.warning(f"Skipping {blk_path.name}: missing Name tag")
        return None

    model = get_string(tags, "Model", "model") or ""
    year_raw = parse_number(get_string(tags, "year", "Year"))
    if year_raw is None:
        logger.warning(f"Skipping {blk_path.name}: missing year tag")
        return None
    year = int(year_raw)

    tonnage_raw = parse_number(get_string(tags, "tonnage", "Tonnage"))
    if tonnage_raw is None:
        logger.warning(f"Skipping {blk_path.name}: missing tonnage tag")
        return None
    tonnage = int(tonnage_raw) if tonnage_raw == int(tonnage_raw) else tonnage_raw

    # --- Classification ---
    tech_type_str = get_string(tags, "type", "Type") or "IS Level 1"
    tech_base = map_tech_base(tech_type_str)
    rules_level = map_rules_level(tech_type_str)
    era = map_year_to_era(year)

    motion_raw = get_string(tags, "motion_type")
    # VTOL motion_type may come from unit_type_raw as well
    if unit_type_raw == "VTOL" and not motion_raw:
        motion_raw = "VTOL"
    motion_type = map_motion_type(motion_raw)

    # Override unit_type discriminator for VTOL vs Tank
    if unit_type_raw == "VTOL" or motion_type == "VTOL":
        unit_type_out = "VTOL"
    elif unit_type_raw in ("SupportTank", "SupportVTOL"):
        unit_type_out = "SupportVehicle"
    else:
        unit_type_out = "Vehicle"

    # --- Movement ---
    cruise_mp = int(parse_number(get_string(tags, "cruiseMP", "CruiseMP")) or 0)
    jump_mp = int(parse_number(get_string(tags, "jumpingMP", "JumpMP")) or 0)
    # Flank MP = ceil(cruise × 1.5)
    flank_mp = math.ceil(cruise_mp * 1.5)

    # --- Engine ---
    engine_code = get_string(tags, "engine_type")
    engine_type_str = map_engine_code(engine_code)
    # Engine rating: not stored in vehicle BLK, compute from tonnage × cruise_mp
    # Standard vehicle engine rating = tonnage × cruise_mp (rounded to 5)
    engine_rating = round(tonnage * cruise_mp / 5) * 5 if tonnage and cruise_mp else 0

    # --- Armor ---
    armor_raw = tags.get("armor") or tags.get("Armor")
    armor_values = parse_armor_array(armor_raw)
    armor_code = get_string(tags, "armor_type")
    armor_type_str = map_armor_code(armor_code, ARMOR_CODE_MAP)

    # Build per-location armor dict
    armor_by_location: Dict[str, int] = {}
    for i, loc in enumerate(VEHICLE_ARMOR_LOCATIONS):
        if i < len(armor_values):
            armor_by_location[loc] = armor_values[i]

    # --- Equipment ---
    equipment: List[Dict[str, str]] = []
    for blk_tag, loc_key in VEHICLE_LOCATION_MAP.items():
        items = tags.get(blk_tag) or []
        if isinstance(items, str):
            items = [ln.strip() for ln in items.splitlines() if ln.strip()]
        for item in items:
            if item:
                equipment.append({
                    "id": normalize_equipment_id(item),
                    "name": item,
                    "location": loc_key,
                })

    # --- Misc ---
    mul_id_raw = get_string(tags, "mul id:", "mulId")
    mul_id = int(parse_number(mul_id_raw)) if mul_id_raw and parse_number(mul_id_raw) is not None else None

    role = get_string(tags, "role")
    source = get_string(tags, "source")
    quirks_raw = get_string(tags, "quirks")
    quirks = [q.strip() for q in quirks_raw.splitlines() if q.strip()] if quirks_raw else []

    weight_class = get_weight_class(float(tonnage), motion_type)

    # --- Fluff ---
    fluff: Dict[str, str] = {}
    for fluff_field in ("overview", "capabilities", "deployment", "history", "manufacturer", "primaryFactory"):
        val = get_string(tags, fluff_field)
        if val:
            fluff[fluff_field] = val
    sys_mfr_raw = get_string(tags, "systemManufacturers")
    if sys_mfr_raw:
        sys_mfr: Dict[str, str] = {}
        for line in sys_mfr_raw.splitlines():
            if ":" in line:
                k, _, v = line.partition(":")
                sys_mfr[k.strip()] = v.strip()
        if sys_mfr:
            fluff["systemManufacturer"] = sys_mfr  # type: ignore[assignment]

    # --- Assemble output ---
    unit_id = generate_id_from_name(name, model)
    output: Dict[str, Any] = {
        "id": unit_id,
        "chassis": name,
        "model": model,
        "unitType": unit_type_out,
        "techBase": tech_base,
        "rulesLevel": rules_level,
        "era": era,
        "year": year,
        "tonnage": tonnage,
        "weightClass": weight_class,
        "motionType": motion_type,
        "movement": {
            "cruiseMP": cruise_mp,
            "flankMP": flank_mp,
            "jumpMP": jump_mp,
        },
        "engine": {
            "type": engine_type_str,
            "rating": engine_rating,
        },
        "armor": {
            "type": armor_type_str,
            "byLocation": armor_by_location,
        },
        "equipment": equipment,
    }

    if mul_id is not None:
        output["mulId"] = mul_id
    if role:
        output["role"] = role
    if source:
        output["source"] = source
    if quirks:
        output["quirks"] = quirks
    if fluff:
        output["fluff"] = fluff

    return output


# ---------------------------------------------------------------------------
# Parity checks
# ---------------------------------------------------------------------------

PARITY_TARGETS: List[Dict[str, Any]] = [
    # 10 canonical vehicles with chassis-name match (BLK chassis includes
    # qualifier like 'Heavy Tank') and tonnage tolerance.
    {"chassis": "Manticore Heavy Tank",         "model": "",        "min_tons": 55, "max_tons": 65},
    {"chassis": "Puma Assault Tank",            "model": "PAT-001", "min_tons": 90, "max_tons": 100},
    {"chassis": "Savannah Master Hovercraft",   "model": "",        "min_tons": 4,  "max_tons": 6},
    {"chassis": "Scorpion Light Tank",          "model": "",        "min_tons": 20, "max_tons": 30},
    {"chassis": "Demolisher Heavy Tank",        "model": "",        "min_tons": 75, "max_tons": 85},
    {"chassis": "LRM Carrier",                  "model": "",        "min_tons": 55, "max_tons": 65},
    {"chassis": "SRM Carrier",                  "model": "",        "min_tons": 55, "max_tons": 65},
    {"chassis": "Hetzer Wheeled Assault Gun",   "model": "",        "min_tons": 35, "max_tons": 45},
    {"chassis": "Pegasus Scout Hover Tank",     "model": "",        "min_tons": 30, "max_tons": 40},
    {"chassis": "Galleon Light Tank",           "model": "",        "min_tons": 25, "max_tons": 35},
]


def run_parity_checks(
    manifest: List[Dict[str, Any]],
    logger: logging.Logger,
) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Run parity assertions against known canonical vehicles.

    Returns (failures, parity_records). parity_records is the per-target
    comparison data the caller serialises to ``blk-vehicle-parity.json``.
    Note: BV / equipment-list-length parity is deferred until per-type BV
    calculators land — see add-vehicle-construction wave 5.
    """
    failures = 0
    index: Dict[str, Dict[str, Any]] = {}
    for entry in manifest:
        key = entry.get("chassis", "").lower()
        index[key] = entry

    records: List[Dict[str, Any]] = []
    for target in PARITY_TARGETS:
        chassis_key = target["chassis"].lower()
        entry = index.get(chassis_key)
        record: Dict[str, Any] = {
            "chassis": target["chassis"],
            "expected_min_tons": target["min_tons"],
            "expected_max_tons": target["max_tons"],
        }
        if entry is None:
            logger.warning(f"Parity: '{target['chassis']}' not found in output")
            record["status"] = "missing"
            failures += 1
            records.append(record)
            continue
        tonnage = entry.get("tonnage", 0)
        record["actual_tons"] = tonnage
        record["actual_equipment_count"] = len(entry.get("equipment", []) or [])
        if not (target["min_tons"] <= tonnage <= target["max_tons"]):
            logger.error(
                f"Parity FAIL: {target['chassis']} tonnage={tonnage} "
                f"expected [{target['min_tons']},{target['max_tons']}]"
            )
            record["status"] = "fail"
            failures += 1
        else:
            logger.info(f"Parity OK: {target['chassis']} tonnage={tonnage}")
            record["status"] = "ok"
        records.append(record)
    return failures, records


# ---------------------------------------------------------------------------
# Manifest generation
# ---------------------------------------------------------------------------

def build_manifest_entry(unit: Dict[str, Any]) -> Dict[str, Any]:
    """Create a lightweight manifest entry from a full unit dict."""
    return {
        "id": unit["id"],
        "chassis": unit["chassis"],
        "model": unit["model"],
        "unitType": unit["unitType"],
        "techBase": unit["techBase"],
        "era": unit["era"],
        "year": unit["year"],
        "tonnage": unit["tonnage"],
        "bv": None,
        "motionType": unit.get("motionType", "Tracked"),
        "role": unit.get("role"),
        "source": unit.get("source"),
        "mulId": unit.get("mulId"),
    }


# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Convert BLK vehicle files to MekStation JSON")
    parser.add_argument(
        "--source",
        default=str(Path(default_mm_data_root()) / "mekfiles" / "vehicles"),
        help="Path to mm-data vehicles directory",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent.parent / "public/data/units/vehicles"),
        help="Output directory for vehicle JSON files",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    logger = setup_logger("blk_vehicle_converter", args.verbose)

    source_dir = Path(args.source)
    output_dir = Path(args.output)

    if not source_dir.exists():
        logger.error(f"Source directory not found: {source_dir}")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    # --- Scan and convert ---
    blk_files = list(source_dir.rglob("*.blk"))
    logger.info(f"Found {len(blk_files)} BLK files under {source_dir}")

    converted = 0
    skipped_unsupported = 0
    skipped_other = 0
    errors = 0
    manifest: List[Dict[str, Any]] = []

    for blk_path in sorted(blk_files):
        unit = convert_vehicle_blk(blk_path, logger)
        if unit is None:
            # Check why: peek at unit type
            try:
                raw = blk_path.read_text(encoding="utf-8", errors="replace")
                clean = remove_comments(raw)
                tags = extract_tags(clean)
                ut = get_string(tags, "UnitType") or ""
                if ut in UNSUPPORTED_UNIT_TYPES:
                    skipped_unsupported += 1
                else:
                    skipped_other += 1
            except Exception:
                skipped_other += 1
            continue

        # Sanitize filename: BLK chassis/model can contain '/' (e.g. "AC/2 Carrier")
        # which Path interprets as a directory separator. Replace with '-'.
        raw_name = f"{unit['chassis']} {unit['model']}".strip()
        safe_name = re.sub(r"[\\/:*?\"<>|]", "-", raw_name)
        out_path = output_dir / f"{safe_name}.json"
        try:
            out_path.write_text(json.dumps(unit, indent=2, ensure_ascii=False), encoding="utf-8")
            converted += 1
            manifest.append(build_manifest_entry(unit))
        except OSError as e:
            logger.error(f"Failed to write {out_path}: {e}")
            errors += 1

    # --- Manifest + budget check ---
    manifest_path = output_dir / "units-manifest.json"
    errors += write_manifest(manifest, manifest_path, "vehicles", logger)

    # --- Parity checks ---
    parity_failures, parity_records = run_parity_checks(manifest, logger)

    # Write the parity report referenced by the unit-data-import spec scenario.
    parity_report_path = (
        Path(__file__).parent.parent.parent / "validation-output" / "blk-vehicle-parity.json"
    )
    write_parity_report("vehicles", parity_records, parity_failures, parity_report_path, logger)

    # --- Summary ---
    logger.info(
        f"Done. converted={converted} skipped_unsupported={skipped_unsupported} "
        f"skipped_other={skipped_other} errors={errors} parity_failures={parity_failures}"
    )

    # Persist the run-log for CI / parity-regression auditing (task 7.3).
    run_log = {
        "converter": "blk_vehicle_converter",
        "source": str(source_dir),
        "output": str(output_dir),
        "converted": converted,
        "skipped_unsupported": skipped_unsupported,
        "skipped_other": skipped_other,
        "errors": errors,
        "parity_failures": parity_failures,
    }
    log_path = Path(__file__).parent.parent.parent / "validation-output" / "blk-vehicle-run-log.json"
    write_run_log(run_log, log_path, logger)

    return 1 if (errors > 0 or parity_failures > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
