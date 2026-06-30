"""
BLK Aerospace Converter

Converts MegaMek BLK files for aerospace units:
  - Aerospace Fighters (UnitType: Aero / AeroSpaceFighter)
  - Conventional Fighters (UnitType: ConvFighter / FixedWingSupport)
  - Small Craft (UnitType: SmallCraft)

Output: public/data/units/aerospace/<name>.json
Manifest: public/data/units/aerospace/units-manifest.json

Usage:
    python blk_aerospace_converter.py \\
        --source /path/to/mm-data/data/mekfiles \\
        --output /path/to/public/data/units/aerospace

Source directories scanned: fighters/, convfighter/, smallcraft/
Skips DropShips, JumpShips, WarShips with a log entry.
"""

import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from blk_aerospace_tables import (
    AERO_ARMOR_ARCS,
    AERO_LOCATION_MAP,
    AEROSPACE_UNIT_TYPES,
    ARMOR_CODE_MAP,
    ASF_TYPES,
    CF_TYPES,
    COCKPIT_CODE_MAP,
    DEFAULT_SOURCE_SUBDIRS,
    MOTION_MAP,
    SC_ARMOR_ARCS,
    SC_LOCATION_MAP,
    SC_TYPES,
    UNSUPPORTED_UNIT_TYPES,
)
from blk_conversion_runner import (
    BlkConversionConfig,
    collect_subdir_blk_files,
    run_blk_conversion,
    run_manifest_range_parity,
)
from blk_unit_fields import parse_fluff, parse_location_equipment, parse_mul_id, parse_quirks

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

# Unit types handled by this converter

# Unit types to skip with warning

# Sub-type classification

# Armor arc order in BLK: Nose, Left Wing, Right Wing, Aft

# Equipment location tag → output key

# Small craft use "side" instead of "wing"

# Armor type code → string (same as vehicle converter)

# Cockpit code → string

# Motion type for aerospace


# ---------------------------------------------------------------------------
# Aerospace-specific helpers
# ---------------------------------------------------------------------------

def map_cockpit_code(code: Any) -> str:
    """Map numeric cockpit_type code to enum string."""
    if code is None:
        return "STANDARD"
    try:
        return COCKPIT_CODE_MAP.get(int(float(str(code))), "STANDARD")
    except (ValueError, TypeError):
        return "STANDARD"


def get_weight_class(tonnage: float) -> str:
    """Aerospace weight class thresholds."""
    if tonnage <= 35:
        return "LIGHT"
    elif tonnage <= 55:
        return "MEDIUM"
    elif tonnage <= 70:
        return "HEAVY"
    else:
        return "ASSAULT"


# ---------------------------------------------------------------------------
# Converter core
# ---------------------------------------------------------------------------

def convert_aerospace_blk(blk_path: Path, logger: logging.Logger) -> Optional[Dict[str, Any]]:
    """Parse one BLK file and return an aerospace unit JSON dict."""
    try:
        content = blk_path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        logger.warning(f"Cannot read {blk_path}: {e}")
        return None

    clean = remove_comments(content)
    tags = extract_tags(clean)

    unit_type_raw = get_string(tags, "UnitType")
    if unit_type_raw is None:
        logger.warning(f"Skipping {blk_path.name}: missing UnitType tag")
        return None

    if unit_type_raw in UNSUPPORTED_UNIT_TYPES:
        logger.info(f"Skipping {blk_path.name}: unsupported type '{unit_type_raw}'")
        return None

    if unit_type_raw not in AEROSPACE_UNIT_TYPES:
        logger.debug(f"Skipping {blk_path.name}: not an aerospace type ('{unit_type_raw}')")
        return None

    # --- Sub-type ---
    if unit_type_raw in ASF_TYPES:
        sub_type = "AerospaceFighter"
        unit_type_out = "Aerospace"
    elif unit_type_raw in CF_TYPES:
        sub_type = "ConventionalFighter"
        unit_type_out = "ConventionalFighter"
    else:
        sub_type = "SmallCraft"
        unit_type_out = "SmallCraft"

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
    tech_type_str = get_string(tags, "type", "Type") or "IS Level 2"
    tech_base = map_tech_base(tech_type_str)
    rules_level = map_rules_level(tech_type_str)
    era = map_year_to_era(year)

    # --- Motion type ---
    motion_raw = get_string(tags, "motion_type") or "Aerodyne"
    motion_type = MOTION_MAP.get(motion_raw, "AERODYNE")

    # --- Thrust / movement ---
    safe_thrust = int(parse_number(get_string(tags, "SafeThrust", "safeThrust")) or 0)
    max_thrust = math.ceil(safe_thrust * 1.5)

    # --- Fuel ---
    fuel = int(parse_number(get_string(tags, "fuel", "Fuel")) or 0)

    # --- Structural integrity (from BLK si tag) ---
    si = int(parse_number(get_string(tags, "SI", "si", "structural_integrity")) or 0)

    # --- Heat sinks ---
    heatsinks = int(parse_number(get_string(tags, "heatsinks", "Heatsinks")) or 0)
    sink_type = int(parse_number(get_string(tags, "sink_type", "heat_sinks")) or 0)
    hs_type_str = "DOUBLE" if sink_type == 1 else "SINGLE"

    # --- Engine ---
    engine_code = get_string(tags, "engine_type")
    engine_type_str = map_engine_type(engine_code or "0")

    # --- Cockpit ---
    cockpit_code = get_string(tags, "cockpit_type")
    cockpit_type_str = map_cockpit_code(cockpit_code)

    # --- Armor ---
    armor_raw = tags.get("armor") or tags.get("Armor")
    armor_values = parse_armor_array(armor_raw)
    armor_code = get_string(tags, "armor_type")
    armor_type_str = map_armor_code(armor_code, ARMOR_CODE_MAP)

    # Arc-based armor — ASF/CF use Nose/LW/RW/Aft; SmallCraft use Nose/LS/RS/Aft
    is_small_craft = sub_type == "SmallCraft"
    arc_names = SC_ARMOR_ARCS if is_small_craft else AERO_ARMOR_ARCS
    armor_by_arc: Dict[str, int] = {}
    for i, arc in enumerate(arc_names):
        if i < len(armor_values):
            armor_by_arc[arc] = armor_values[i]

    # --- Equipment ---
    loc_map = SC_LOCATION_MAP if is_small_craft else AERO_LOCATION_MAP
    equipment = parse_location_equipment(tags, loc_map)

    # Detect bomb bay — BLK marks it via "Bomb Bay" equipment or bombcount tag
    bomb_bay_items = [e for e in equipment if "bomb" in e["id"].lower() or "bomb" in e["name"].lower()]
    has_bomb_bay = len(bomb_bay_items) > 0 or bool(get_string(tags, "bombcount", "bombs"))
    bomb_capacity = int(parse_number(get_string(tags, "bombcount")) or 0)

    # --- Small craft extras ---
    crew = int(parse_number(get_string(tags, "crew")) or 0)
    passengers = int(parse_number(get_string(tags, "passengers")) or 0)
    cargo_capacity = 0.0
    escape_pods = int(parse_number(get_string(tags, "escapepods", "escape_pods")) or 0)
    life_boats = int(parse_number(get_string(tags, "lifeboats", "life_boats")) or 0)

    # Parse cargo from transporters tag
    transporters_raw = get_string(tags, "transporters")
    if transporters_raw:
        for tline in transporters_raw.splitlines():
            tline = tline.strip()
            if tline.startswith("cargobay:"):
                parts = tline.split(":")
                if len(parts) >= 2:
                    try:
                        cargo_capacity += float(parts[1])
                    except ValueError:
                        pass

    # --- Misc ---
    mul_id = parse_mul_id(tags)
    role = get_string(tags, "role")
    source = get_string(tags, "source")
    quirks = parse_quirks(tags)

    weight_class = get_weight_class(float(tonnage))

    # --- Fluff ---
    fluff = parse_fluff(tags)

    # --- Assemble ---
    unit_id = generate_id_from_name(name, model)
    output: Dict[str, Any] = {
        "id": unit_id,
        "chassis": name,
        "model": model,
        "unitType": unit_type_out,
        "subType": sub_type,
        "techBase": tech_base,
        "rulesLevel": rules_level,
        "era": era,
        "year": year,
        "tonnage": tonnage,
        "weightClass": weight_class,
        "motionType": motion_type,
        "movement": {
            "safeThrust": safe_thrust,
            "maxThrust": max_thrust,
        },
        "fuel": fuel,
        "structuralIntegrity": si,
        "engine": {
            "type": engine_type_str,
        },
        "heatSinks": {
            "type": hs_type_str,
            "count": heatsinks,
        },
        "cockpit": cockpit_type_str,
        "armor": {
            "type": armor_type_str,
            "byArc": armor_by_arc,
        },
        "equipment": equipment,
    }

    # Sub-type specific fields
    if sub_type == "AerospaceFighter":
        output["hasBombBay"] = has_bomb_bay
        output["bombCapacity"] = bomb_capacity
    elif sub_type == "ConventionalFighter":
        output["hasBombBay"] = has_bomb_bay
        output["bombCapacity"] = bomb_capacity
    elif sub_type == "SmallCraft":
        output["crew"] = crew
        output["passengers"] = passengers
        output["cargoCapacity"] = round(cargo_capacity, 2)
        output["escapePods"] = escape_pods
        output["lifeBoats"] = life_boats

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

PARITY_TARGETS = [
    # 10 canonical aerospace fighters with verified MUL tonnage ranges.
    {"chassis": "Shilone",     "model": "SL-17", "min_tons": 60,  "max_tons": 70},
    {"chassis": "Stuka",       "model": "",      "min_tons": 95,  "max_tons": 105},
    {"chassis": "Sparrowhawk", "model": "",      "min_tons": 25,  "max_tons": 35},
    {"chassis": "Firebird",    "model": "FR-1",  "min_tons": 40,  "max_tons": 50},
    {"chassis": "Sabre",       "model": "",      "min_tons": 20,  "max_tons": 30},
    {"chassis": "Sholagar",    "model": "",      "min_tons": 30,  "max_tons": 40},
    {"chassis": "Lucifer",     "model": "",      "min_tons": 60,  "max_tons": 70},
    {"chassis": "Slayer",      "model": "",      "min_tons": 75,  "max_tons": 85},
    {"chassis": "Hellcat",     "model": "",      "min_tons": 55,  "max_tons": 65},
    {"chassis": "Eagle",       "model": "",      "min_tons": 70,  "max_tons": 80},
]


def run_parity_checks(
    manifest: List[Dict[str, Any]],
    logger: logging.Logger,
) -> Tuple[int, List[Dict[str, Any]]]:
    """Returns (failures, parity_records). BV parity deferred to wave 5."""
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
# Manifest
# ---------------------------------------------------------------------------

def build_manifest_entry(unit: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": unit["id"],
        "chassis": unit["chassis"],
        "model": unit["model"],
        "unitType": unit["unitType"],
        "subType": unit.get("subType"),
        "techBase": unit["techBase"],
        "era": unit["era"],
        "year": unit["year"],
        "tonnage": unit["tonnage"],
        "bv": None,
        "motionType": unit.get("motionType", "AERODYNE"),
        "role": unit.get("role"),
        "source": unit.get("source"),
        "mulId": unit.get("mulId"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    return run_blk_conversion(
        BlkConversionConfig(
            converter="blk_aerospace_converter",
            description="Convert BLK aerospace files to MekStation JSON",
            source_default=str(Path(default_mm_data_root()) / "mekfiles"),
            source_help="Path to mm-data mekfiles root (contains fighters/, convfighter/, smallcraft/)",
            output_default=str(Path(__file__).parent.parent.parent / "public/data/units/aerospace"),
            output_help="Output directory for aerospace JSON files",
            type_name="aerospace",
            parity_report_filename="blk-aerospace-parity.json",
            run_log_filename="blk-aerospace-run-log.json",
            convert_unit=convert_aerospace_blk,
            build_manifest_entry=build_manifest_entry,
            run_parity_checks=run_parity_checks,
            collect_files=lambda source, logger: collect_subdir_blk_files(
                source, logger, DEFAULT_SOURCE_SUBDIRS
            ),
            unsupported_unit_types=UNSUPPORTED_UNIT_TYPES,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
