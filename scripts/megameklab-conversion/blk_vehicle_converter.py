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

import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from blk_conversion_runner import (
    BlkConversionConfig,
    run_blk_conversion,
    run_manifest_range_parity,
    strict_safe_unit_filename,
)
from blk_unit_fields import parse_fluff, parse_location_equipment, parse_mul_id, parse_quirks
from blk_vehicle_tables import (
    ARMOR_CODE_MAP,
    ENGINE_CODE_EXT,
    MOTION_TYPE_MAP,
    UNSUPPORTED_UNIT_TYPES,
    VEHICLE_ARMOR_LOCATIONS,
    VEHICLE_LOCATION_MAP,
    VEHICLE_UNIT_TYPES,
)

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
    parse_armor_array,
    parse_number,
    remove_comments,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# BLK unit type strings considered ground vehicles

# BLK unit types to skip

# Vehicle armor location order in BLK files: Front, Right, Left, Rear, Turret (optional)

# BLK equipment section tag → canonical location key

# Motion type mapping: BLK motion_type value → IVehicle motionType

# Engine type code numeric → string (supplements enum_mappings for codes 6+)

# Armor type code numeric → string (commonly seen in BLK armor_type tag)


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
    equipment = parse_location_equipment(tags, VEHICLE_LOCATION_MAP)

    # --- Misc ---
    mul_id = parse_mul_id(tags)
    role = get_string(tags, "role")
    source = get_string(tags, "source")
    quirks = parse_quirks(tags)

    weight_class = get_weight_class(float(tonnage), motion_type)

    # --- Fluff ---
    fluff = parse_fluff(tags, include_system_manufacturers=True)

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
    return run_manifest_range_parity(
        manifest,
        PARITY_TARGETS,
        logger,
        value_field="tonnage",
        min_target_key="min_tons",
        max_target_key="max_tons",
        expected_min_record_key="expected_min_tons",
        expected_max_record_key="expected_max_tons",
        actual_record_key="actual_tons",
        log_label="tonnage",
        index_overwrite=True,
    )


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
    return run_blk_conversion(
        BlkConversionConfig(
            converter="blk_vehicle_converter",
            description="Convert BLK vehicle files to MekStation JSON",
            source_default=str(Path(default_mm_data_root()) / "mekfiles" / "vehicles"),
            source_help="Path to mm-data vehicles directory",
            output_default=str(Path(__file__).parent.parent.parent / "public/data/units/vehicles"),
            output_help="Output directory for vehicle JSON files",
            type_name="vehicles",
            parity_report_filename="blk-vehicle-parity.json",
            run_log_filename="blk-vehicle-run-log.json",
            convert_unit=convert_vehicle_blk,
            build_manifest_entry=build_manifest_entry,
            run_parity_checks=run_parity_checks,
            unsupported_unit_types=UNSUPPORTED_UNIT_TYPES,
            filename_builder=strict_safe_unit_filename,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
