"""
BLK BattleArmor Converter

Converts MegaMek BLK files for Battle Armor units into JSON conforming to
the IBattleArmorUnit shape used by MekStation.

BLK format specifics for Battle Armor:
  - UnitType: BattleArmor
  - Equipment in <Point Equipment> block with location suffixes (e.g., :RA, :LA, :Body)
  - <Trooper Count> for squad size (4 IS, 5 Clan, 6 SL)
  - <weightclass> code: 1=PA(L), 2=Light, 3=Medium, 4=Heavy, 5=Assault
  - <armor> single value = armor per trooper
  - <chassis> biped|quad

Output: public/data/units/battlearmor/<name>.json
Manifest: public/data/units/battlearmor/units-manifest.json

Usage:
    python blk_battlearmor_converter.py \\
        --source /path/to/mm-data/data/mekfiles/battlearmor \\
        --output /path/to/public/data/units/battlearmor
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from blk_battlearmor_fields import (
    extract_manipulators as shared_extract_manipulators,
    parse_point_equipment as shared_parse_point_equipment,
)
from blk_conversion_runner import BlkConversionConfig, run_blk_conversion, run_manifest_range_parity
from blk_unit_fields import parse_fluff, parse_mul_id, parse_quirks

# Shared BLK helpers + enum_mappings re-exports — see blk_common.py for the
# extraction rationale (2026-04-25 maintenance sweep).
from blk_common import (
    default_mm_data_root,
    extract_tags,
    generate_id_from_name,
    get_string,
    map_armor_code,
    map_rules_level,
    map_tech_base,
    map_year_to_era,
    parse_number,
    remove_comments,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Weight class code → label (MegaMek BA weight class codes)
WEIGHT_CLASS_MAP: Dict[int, str] = {
    1: "PAL",        # PA(L) — 400 kg
    2: "LIGHT",      # Light — 750 kg
    3: "MEDIUM",     # Medium — 1000 kg
    4: "HEAVY",      # Heavy — 1500 kg
    5: "ASSAULT",    # Assault — 2000 kg
}

# Motion type strings from BLK
BA_MOTION_MAP: Dict[str, str] = {
    "Jump": "JUMP",
    "Ground": "GROUND",
    "UMU": "UMU",
    "Motorized": "MOTORIZED",
    "None": "GROUND",
    "Wheeled": "MOTORIZED",
    "Tracked": "MOTORIZED",
    "Leg": "GROUND",
    "Foot": "GROUND",
    "Hover": "HOVER",
    "VTOL": "VTOL",
}

# Armor type code → string (BA uses the same numeric codes as vehicle/aero)
ARMOR_CODE_MAP: Dict[int, str] = {
    0: "STANDARD", 1: "STANDARD", 2: "REACTIVE", 3: "REFLECTIVE",
    4: "HARDENED", 5: "LIGHT_FERRO_FIBROUS", 6: "HEAVY_FERRO_FIBROUS",
    8: "STEALTH", 28: "FIRE_RESISTANT",
    30: "MIMETIC", 31: "COMMERCIAL", 32: "STEALTH_IMPROVED",
    33: "STEALTH_PROTOTYPE", 34: "FERRO_FIBROUS_CLAN",
    35: "REFLECTIVE_CLAN", 36: "REACTIVE_CLAN",
    39: "PRIMITIVE", 40: "IMPACT_RESISTANT",
}

parse_point_equipment = shared_parse_point_equipment
extract_manipulators = shared_extract_manipulators


# ---------------------------------------------------------------------------
# Converter core
# ---------------------------------------------------------------------------

def convert_battlearmor_blk(blk_path: Path, logger: logging.Logger) -> Optional[Dict[str, Any]]:
    """Parse one BLK file and return a BA JSON dict."""
    try:
        content = blk_path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        logger.warning(f"Cannot read {blk_path}: {e}")
        return None

    clean = remove_comments(content)
    tags = extract_tags(clean)

    unit_type_raw = get_string(tags, "UnitType")
    if unit_type_raw != "BattleArmor":
        logger.debug(f"Skipping {blk_path.name}: UnitType='{unit_type_raw}' (not BattleArmor)")
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

    # --- Classification ---
    tech_type_str = get_string(tags, "type", "Type") or "IS Level 2"
    tech_base = map_tech_base(tech_type_str)
    rules_level = map_rules_level(tech_type_str)
    era = map_year_to_era(year)

    # --- BA-specific fields ---
    trooper_count = int(parse_number(get_string(tags, "Trooper Count", "TrooperCount")) or 4)
    weight_class_code = int(parse_number(get_string(tags, "weightclass", "WeightClass")) or 2)
    weight_class_str = WEIGHT_CLASS_MAP.get(weight_class_code, "MEDIUM")

    chassis_type = get_string(tags, "chassis") or "biped"
    chassis_str = chassis_type.upper()  # BIPED | QUAD

    motion_raw = get_string(tags, "motion_type") or "Jump"
    motion_type = BA_MOTION_MAP.get(motion_raw, motion_raw.upper())

    # Movement
    cruise_mp = int(parse_number(get_string(tags, "cruiseMP", "CruiseMP")) or 1)
    jump_mp = int(parse_number(get_string(tags, "jumpingMP", "JumpingMP")) or 0)
    umu_mp = int(parse_number(get_string(tags, "UMUPM", "umuMP")) or 0)

    # Armor — single value = per trooper
    armor_raw = tags.get("armor") or tags.get("Armor")
    if isinstance(armor_raw, list):
        armor_per_trooper = int(float(armor_raw[0])) if armor_raw else 0
    else:
        try:
            armor_per_trooper = int(float(str(armor_raw).strip().splitlines()[0])) if armor_raw else 0
        except (ValueError, AttributeError):
            armor_per_trooper = 0

    armor_code = get_string(tags, "armor_type")
    armor_type_str = map_armor_code(armor_code, ARMOR_CODE_MAP)

    # --- Equipment ---
    point_eq_items: List[str] = tags.get("Point Equipment") or []
    equipment, abilities, has_ap_mount, has_mwm = parse_point_equipment(point_eq_items)
    manipulators = extract_manipulators(equipment)
    # Remove manipulator-typed items from the output equipment list (they go in dedicated field)
    clean_equipment = [e for e in equipment if e.get("type") != "MANIPULATOR"]

    # --- Misc ---
    mul_id = parse_mul_id(tags)
    role = get_string(tags, "role")
    source = get_string(tags, "source")
    quirks = parse_quirks(tags)
    fluff = parse_fluff(tags)

    # --- Squad size defaults by tech base ---
    # Clan = 5, IS = 4, Star League = 6 — but always use explicit Trooper Count from file
    squad_size = trooper_count

    unit_id = generate_id_from_name(name, model)
    output: Dict[str, Any] = {
        "id": unit_id,
        "chassis": name,
        "model": model,
        "unitType": "BattleArmor",
        "techBase": tech_base,
        "rulesLevel": rules_level,
        "era": era,
        "year": year,
        "weightClass": weight_class_str,
        "chassisType": chassis_str,
        "motionType": motion_type,
        "movement": {
            "groundMP": cruise_mp,
            "jumpMP": jump_mp,
            "umuMP": umu_mp,
        },
        "squadSize": squad_size,
        "armorPerTrooper": armor_per_trooper,
        "armor": {
            "type": armor_type_str,
            "perTrooper": armor_per_trooper,
        },
        "manipulators": {
            "rightArm": manipulators.get("RIGHT_ARM"),
            "leftArm": manipulators.get("LEFT_ARM"),
        },
        "hasAntiPersonnelMount": has_ap_mount,
        "hasModularWeaponMount": has_mwm,
        "abilities": abilities,
        "equipment": clean_equipment,
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

PARITY_TARGETS = [
    # 10 canonical BattleArmor chassis. squad_size in BLK is often absent so we
    # accept the converter's default fallback (4) as well as the canonical 5/6.
    {"chassis": "Elemental Battle Armor",         "min_squad": 4, "max_squad": 6},
    {"chassis": "Gnome Battle Armor",             "min_squad": 3, "max_squad": 5},
    {"chassis": "Kage Light Battle Armor",        "min_squad": 3, "max_squad": 5},
    {"chassis": "Marauder Battle Armor",          "min_squad": 3, "max_squad": 5},
    {"chassis": "Phalanx Battle Armor",           "min_squad": 3, "max_squad": 5},
    {"chassis": "Salamander Battle Armor",        "min_squad": 3, "max_squad": 5},
    {"chassis": "Sloth Battle Armor",             "min_squad": 3, "max_squad": 5},
    {"chassis": "Achileus Light Battle Armor",    "min_squad": 3, "max_squad": 5},
    {"chassis": "Cavalier Battle Armor",          "min_squad": 3, "max_squad": 5},
    {"chassis": "Sylph Battle Armor",             "min_squad": 3, "max_squad": 5},
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
        value_field="squadSize",
        min_target_key="min_squad",
        max_target_key="max_squad",
        expected_min_record_key="expected_min_squad",
        expected_max_record_key="expected_max_squad",
        actual_record_key="actual_squad",
        log_label="squadSize",
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
        "techBase": unit["techBase"],
        "era": unit["era"],
        "year": unit["year"],
        "weightClass": unit["weightClass"],
        "squadSize": unit["squadSize"],
        "bv": None,
        "motionType": unit["motionType"],
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
            converter="blk_battlearmor_converter",
            description="Convert BLK Battle Armor files to MekStation JSON",
            source_default=str(Path(default_mm_data_root()) / "mekfiles" / "battlearmor"),
            source_help="Path to mm-data battlearmor directory",
            output_default=str(Path(__file__).parent.parent.parent / "public/data/units/battlearmor"),
            output_help="Output directory for battle armor JSON files",
            type_name="battlearmor",
            parity_report_filename="blk-battlearmor-parity.json",
            run_log_filename="blk-battlearmor-run-log.json",
            convert_unit=convert_battlearmor_blk,
            build_manifest_entry=build_manifest_entry,
            run_parity_checks=run_parity_checks,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
