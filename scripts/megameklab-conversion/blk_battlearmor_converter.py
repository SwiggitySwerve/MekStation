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

import argparse
import json
import logging
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
    map_rules_level,
    map_tech_base,
    map_year_to_era,
    normalize_equipment_id,
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

# BA equipment location suffixes
BA_LOCATION_SUFFIX_MAP: Dict[str, str] = {
    ":RA": "RIGHT_ARM",
    ":LA": "LEFT_ARM",
    ":Body": "BODY",
    ":BODY": "BODY",
    ":Torso": "TORSO",
    ":TORSO": "TORSO",
    ":Legs": "LEGS",
    ":LEGS": "LEGS",
    ":Head": "HEAD",
    ":HEAD": "HEAD",
}

# Manipulator keywords
MANIPULATOR_KEYWORDS = {
    "BABattleClaw", "BattleClaw", "BABasicManipulator", "BasicManipulator",
    "BAArmoredGlove", "ArmoredGlove", "BAHeavyManipulator", "HeavyManipulator",
    "BAIndustrialDrill", "IndustrialDrill", "BACargoLifter", "CargoLifter",
    "BASalvageArm", "SalvageArm",
}

# Anti-personnel mount keywords
AP_MOUNT_KEYWORDS = {"BAAPMount", "APMount"}

# Modular weapon mount keywords
MWM_KEYWORDS = {"BAMWM", "MWM", "ModularWeaponMount"}


# ---------------------------------------------------------------------------
# BA-specific parsing helpers
# ---------------------------------------------------------------------------

def parse_point_equipment(items: List[str]) -> Tuple[List[Dict[str, str]], List[str], bool, bool]:
    """
    Parse <Point Equipment> lines for BA.
    Each line may have a location suffix: ISBAFlamer:RA → item=ISBAFlamer, loc=RIGHT_ARM
    Some lines have no location suffix (squad-level abilities like SwarmMek).
    Returns: (equipment_list, abilities_list, has_ap_mount, has_mwm)
    """
    equipment: List[Dict[str, str]] = []
    abilities: List[str] = []
    has_ap_mount = False
    has_mwm = False

    for line in items:
        if not line.strip():
            continue

        # Determine location suffix
        location = "BODY"  # default
        item_name = line
        for suffix, loc in BA_LOCATION_SUFFIX_MAP.items():
            if line.endswith(suffix) or (":" + suffix.lstrip(":") + ":") in line or line.count(":") > 0:
                break

        # Split on colons — format: ItemName:Location or ItemName:Location:Subtype or ItemName
        parts = line.split(":")
        item_id = parts[0].strip()

        if len(parts) >= 2:
            # Try to find a location part
            for part in parts[1:]:
                part = part.strip()
                mapped = BA_LOCATION_SUFFIX_MAP.get(":" + part)
                if mapped:
                    location = mapped
                    break

        # Classify
        if item_id in AP_MOUNT_KEYWORDS:
            has_ap_mount = True
            continue  # don't add mount hardware as equipment item
        if item_id in MWM_KEYWORDS:
            has_mwm = True
            continue
        if item_id in MANIPULATOR_KEYWORDS:
            equipment.append({
                "id": normalize_equipment_id(item_id),
                "name": item_id,
                "location": location,
                "type": "MANIPULATOR",
            })
            continue
        # Squad abilities (no location)
        if item_id in ("SwarmMek", "SwarmWeaponMek", "StopSwarm", "LegAttack", "SwarmInfantry"):
            abilities.append(item_id)
            continue
        # Regular equipment
        if item_id:
            equipment.append({
                "id": normalize_equipment_id(item_id),
                "name": item_id,
                "location": location,
            })

    return equipment, abilities, has_ap_mount, has_mwm


def extract_manipulators(equipment: List[Dict[str, str]]) -> Dict[str, Optional[str]]:
    """Extract manipulator types for left and right arms."""
    manipulators: Dict[str, Optional[str]] = {"RIGHT_ARM": None, "LEFT_ARM": None}
    for item in equipment:
        if item.get("type") == "MANIPULATOR":
            loc = item.get("location", "")
            if loc in manipulators:
                manipulators[loc] = item["name"]
    return manipulators


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
    mul_id_raw = get_string(tags, "mul id:", "mulId")
    mul_id = int(parse_number(mul_id_raw)) if mul_id_raw and parse_number(mul_id_raw) is not None else None

    role = get_string(tags, "role")
    source = get_string(tags, "source")
    quirks_raw = get_string(tags, "quirks")
    quirks = [q.strip() for q in quirks_raw.splitlines() if q.strip()] if quirks_raw else []

    # --- Fluff ---
    fluff: Dict[str, Any] = {}
    for ff in ("overview", "capabilities", "deployment", "history", "manufacturer", "primaryFactory"):
        val = get_string(tags, ff)
        if val:
            fluff[ff] = val

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
    failures = 0
    index: Dict[str, Dict[str, Any]] = {}
    for entry in manifest:
        key = entry.get("chassis", "").lower()
        index.setdefault(key, entry)

    records: List[Dict[str, Any]] = []
    for target in PARITY_TARGETS:
        key = target["chassis"].lower()
        entry = index.get(key)
        record: Dict[str, Any] = {
            "chassis": target["chassis"],
            "expected_min_squad": target["min_squad"],
            "expected_max_squad": target["max_squad"],
        }
        if entry is None:
            logger.warning(f"Parity: '{target['chassis']}' not found in output")
            record["status"] = "missing"
            failures += 1
            records.append(record)
            continue
        squad_size = entry.get("squadSize", 0)
        record["actual_squad"] = squad_size
        record["actual_equipment_count"] = len(entry.get("equipment", []) or [])
        if not (target["min_squad"] <= squad_size <= target["max_squad"]):
            logger.error(
                f"Parity FAIL: {target['chassis']} squadSize={squad_size} "
                f"expected [{target['min_squad']},{target['max_squad']}]"
            )
            record["status"] = "fail"
            failures += 1
        else:
            logger.info(f"Parity OK: {target['chassis']} squadSize={squad_size}")
            record["status"] = "ok"
        records.append(record)
    return failures, records


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
    parser = argparse.ArgumentParser(description="Convert BLK Battle Armor files to MekStation JSON")
    parser.add_argument(
        "--source",
        default=str(Path(default_mm_data_root()) / "mekfiles" / "battlearmor"),
        help="Path to mm-data battlearmor directory",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent.parent / "public/data/units/battlearmor"),
        help="Output directory for battle armor JSON files",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logger = setup_logger("blk_battlearmor_converter", args.verbose)

    source_dir = Path(args.source)
    output_dir = Path(args.output)

    if not source_dir.exists():
        logger.error(f"Source directory not found: {source_dir}")
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)

    blk_files = sorted(source_dir.rglob("*.blk"))
    logger.info(f"Found {len(blk_files)} BLK files under {source_dir}")

    converted = 0
    skipped = 0
    errors = 0
    manifest: List[Dict[str, Any]] = []

    for blk_path in blk_files:
        unit = convert_battlearmor_blk(blk_path, logger)
        if unit is None:
            skipped += 1
            continue

        safe_name = f"{unit['chassis']} {unit['model']}".strip().replace("/", "-").replace(":", "-")
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
    errors += write_manifest(manifest, manifest_path, "battlearmor", logger)

    # --- Parity checks ---
    parity_failures, parity_records = run_parity_checks(manifest, logger)

    parity_report_path = (
        Path(__file__).parent.parent.parent / "validation-output" / "blk-battlearmor-parity.json"
    )
    write_parity_report("battlearmor", parity_records, parity_failures, parity_report_path, logger)

    logger.info(
        f"Done. converted={converted} skipped={skipped} errors={errors} parity_failures={parity_failures}"
    )

    run_log = {
        "converter": "blk_battlearmor_converter",
        "source": str(source_dir),
        "output": str(output_dir),
        "converted": converted,
        "skipped": skipped,
        "errors": errors,
        "parity_failures": parity_failures,
    }
    log_path = Path(__file__).parent.parent.parent / "validation-output" / "blk-battlearmor-run-log.json"
    write_run_log(run_log, log_path, logger)

    return 1 if (errors > 0 or parity_failures > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
