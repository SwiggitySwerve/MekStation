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

import os
import sys
import json
import re
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

try:
    from enum_mappings import (
        map_tech_base,
        map_rules_level,
        map_year_to_era,
        generate_id_from_name,
        normalize_equipment_id,
    )
except ImportError:
    def map_tech_base(v: str) -> str:
        return "CLAN" if "Clan" in v else "INNER_SPHERE"

    def map_rules_level(v: str) -> str:
        return "STANDARD"

    def map_year_to_era(year: int) -> str:
        if year < 2781:
            return "STAR_LEAGUE"
        elif year < 3050:
            return "SUCCESSION_WARS"
        return "CLAN_INVASION"

    def generate_id_from_name(chassis: str, model: str) -> str:
        combined = f"{chassis}-{model}".lower()
        id_str = re.sub(r"[^a-z0-9\-]", "-", combined)
        while "--" in id_str:
            id_str = id_str.replace("--", "-")
        return id_str.strip("-")

    def normalize_equipment_id(name: str) -> str:
        id_str = name.lower()
        id_str = id_str.replace(" ", "-").replace("/", "-")
        id_str = re.sub(r"[^a-z0-9\-]", "", id_str)
        while "--" in id_str:
            id_str = id_str.replace("--", "-")
        return id_str.strip("-")


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
# Parsing helpers (shared subset)
# ---------------------------------------------------------------------------

def remove_comments(content: str) -> str:
    lines = [ln for ln in content.splitlines() if not ln.strip().startswith("#")]
    return "\n".join(lines)


def extract_tags(content: str) -> Dict[str, Any]:
    tags: Dict[str, Any] = {}
    pattern = re.compile(r"<([^/][^>]*)>\s*(.*?)\s*</\1>", re.DOTALL)
    for match in pattern.finditer(content):
        tag_name = match.group(1).strip()
        raw_value = match.group(2).strip()
        if tag_name.endswith("Equipment"):
            tags[tag_name] = [ln.strip() for ln in raw_value.splitlines() if ln.strip()]
        else:
            tags[tag_name] = raw_value
    return tags


def parse_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return None


def get_string(tags: Dict[str, Any], *keys: str) -> Optional[str]:
    for key in keys:
        val = tags.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return None


def map_armor_code(code: Any) -> str:
    if code is None:
        return "STANDARD"
    try:
        return ARMOR_CODE_MAP.get(int(float(str(code))), "STANDARD")
    except (ValueError, TypeError):
        return "STANDARD"


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
    armor_type_str = map_armor_code(armor_code)

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
    {"chassis": "Elemental Battle Armor", "min_squad": 4, "max_squad": 6},
    {"chassis": "Gnome Battle Armor",     "min_squad": 3, "max_squad": 5},
    {"chassis": "Kage Light Battle Armor","min_squad": 3, "max_squad": 5},
]


def run_parity_checks(manifest: List[Dict[str, Any]], logger: logging.Logger) -> int:
    failures = 0
    index: Dict[str, Dict[str, Any]] = {}
    for entry in manifest:
        key = entry.get("chassis", "").lower()
        index.setdefault(key, entry)

    for target in PARITY_TARGETS:
        key = target["chassis"].lower()
        entry = index.get(key)
        if entry is None:
            logger.warning(f"Parity: '{target['chassis']}' not found in output")
            failures += 1
            continue
        squad_size = entry.get("squadSize", 0)
        if not (target["min_squad"] <= squad_size <= target["max_squad"]):
            logger.error(
                f"Parity FAIL: {target['chassis']} squadSize={squad_size} "
                f"expected [{target['min_squad']},{target['max_squad']}]"
            )
            failures += 1
        else:
            logger.info(f"Parity OK: {target['chassis']} squadSize={squad_size}")
    return failures


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
        default=str(Path("/e/Projects/mm-data/data/mekfiles/battlearmor")),
        help="Path to mm-data battlearmor directory",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent.parent / "public/data/units/battlearmor"),
        help="Output directory for battle armor JSON files",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(levelname)s %(message)s", stream=sys.stderr)
    logger = logging.getLogger("blk_battlearmor_converter")

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

    # Manifest
    manifest_path = output_dir / "units-manifest.json"
    manifest_data = {
        "type": "battlearmor",
        "count": len(manifest),
        "units": sorted(manifest, key=lambda u: (u["chassis"], u["model"])),
    }
    manifest_path.write_text(json.dumps(manifest_data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info(f"Manifest written: {manifest_path} ({len(manifest)} units)")

    parity_failures = run_parity_checks(manifest, logger)

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
    print(json.dumps(run_log))
    return 1 if (errors > 0 or parity_failures > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
