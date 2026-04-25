"""
BLK Infantry Converter

Converts MegaMek BLK files for conventional infantry platoons into JSON
conforming to the IInfantryUnit shape used by MekStation.

BLK format specifics for Infantry:
  - UnitType: Infantry
  - <squad_size>   soldiers per squad (e.g., 5 for Clan, 7 for IS standard)
  - <squadn>       number of squads in platoon
  - <Primary>      primary weapon equipment ID
  - <Secondary>    secondary weapon equipment ID (optional)
  - <secondn>      number of secondary weapons per squad
  - <Field Guns Equipment> optional block listing field gun equipment
  - <armorKit>     armor kit identifier
  - <spacesuit>    present tag → space marine specialization
  - <motion_type>  Leg / Wheeled / Motorized / Jump / VTOL / UMU
  - No tonnage tag (infantry weight is per-soldier)

Output: public/data/units/infantry/<name>.json
Manifest: public/data/units/infantry/units-manifest.json

Usage:
    python blk_infantry_converter.py \\
        --source /path/to/mm-data/data/mekfiles/infantry \\
        --output /path/to/public/data/units/infantry
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

# Infantry motion type → output enum
INFANTRY_MOTION_MAP: Dict[str, str] = {
    "Leg": "FOOT",
    "Foot": "FOOT",
    "None": "FOOT",
    "Jump": "JUMP",
    "Motorized": "MOTORIZED",
    "Wheeled": "WHEELED",
    "Tracked": "TRACKED",
    "Hover": "HOVER",
    "VTOL": "VTOL",
    "UMU": "UMU",
    "Beast": "BEAST",
    "Mechanized": "MECHANIZED",
}

# Armor kit specialization inference
MARINE_KIT_KEYWORDS = {"Marine", "Spacesuit", "Vacuum", "CLEnvironmentSuitMarine"}
MOUNTAIN_KIT_KEYWORDS = {"Mountain", "Combat", "CombatKitMI", "MountainKit"}
ARCTIC_KIT_KEYWORDS = {"Arctic", "Cold"}
JUNGLE_KIT_KEYWORDS = {"Jungle"}
SWAMP_KIT_KEYWORDS = {"Swamp"}
DESERT_KIT_KEYWORDS = {"Desert"}


def infer_specialization(armor_kit: Optional[str], has_spacesuit: bool, motion_type: str) -> Optional[str]:
    """Infer platoon specialization from armor kit and flags."""
    if has_spacesuit:
        return "SPACE_MARINE"
    if armor_kit:
        kit_upper = armor_kit.upper()
        if any(kw.upper() in kit_upper for kw in MARINE_KIT_KEYWORDS):
            return "MARINE"
        if any(kw.upper() in kit_upper for kw in MOUNTAIN_KIT_KEYWORDS):
            return "MOUNTAIN"
        if any(kw.upper() in kit_upper for kw in ARCTIC_KIT_KEYWORDS):
            return "ARCTIC"
        if any(kw.upper() in kit_upper for kw in JUNGLE_KIT_KEYWORDS):
            return "JUNGLE"
        if any(kw.upper() in kit_upper for kw in SWAMP_KIT_KEYWORDS):
            return "SWAMP"
        if any(kw.upper() in kit_upper for kw in DESERT_KIT_KEYWORDS):
            return "DESERT"
    # Beast-mounted
    if motion_type == "BEAST":
        return "BEAST_MOUNTED"
    return None


# ---------------------------------------------------------------------------
# Converter core
# ---------------------------------------------------------------------------

def convert_infantry_blk(blk_path: Path, logger: logging.Logger) -> Optional[Dict[str, Any]]:
    """Parse one BLK file and return an infantry JSON dict."""
    try:
        content = blk_path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        logger.warning(f"Cannot read {blk_path}: {e}")
        return None

    clean = remove_comments(content)
    tags = extract_tags(clean)

    unit_type_raw = get_string(tags, "UnitType")
    if unit_type_raw != "Infantry":
        logger.debug(f"Skipping {blk_path.name}: UnitType='{unit_type_raw}' (not Infantry)")
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

    # --- Platoon composition ---
    squad_size = int(parse_number(get_string(tags, "squad_size", "squadSize")) or 7)
    squad_count = int(parse_number(get_string(tags, "squadn", "squadCount")) or 1)
    total_troopers = squad_size * squad_count

    # --- Motion type ---
    motion_raw = get_string(tags, "motion_type") or "Leg"
    motion_type = INFANTRY_MOTION_MAP.get(motion_raw, motion_raw.upper())

    # --- Weapons ---
    primary_weapon = get_string(tags, "Primary") or ""
    primary_weapon_id = normalize_equipment_id(primary_weapon) if primary_weapon else ""

    secondary_weapon = get_string(tags, "Secondary")
    secondary_weapon_id = normalize_equipment_id(secondary_weapon) if secondary_weapon else None

    secondary_count = int(parse_number(get_string(tags, "secondn", "secondN")) or 0)

    # --- Field guns ---
    field_gun_items: List[str] = tags.get("Field Guns Equipment") or []
    field_guns: List[Dict[str, str]] = []
    for item in field_gun_items:
        if item.strip():
            field_guns.append({
                "id": normalize_equipment_id(item),
                "name": item,
            })

    # --- Armor ---
    armor_kit = get_string(tags, "armorKit")
    infantry_armor = int(parse_number(get_string(tags, "InfantryArmor")) or 0)

    # --- Specialization ---
    has_spacesuit = "spacesuit" in tags
    specialization = infer_specialization(armor_kit, has_spacesuit, motion_type)

    # --- Misc ---
    mul_id_raw = get_string(tags, "mul id:", "mulId")
    mul_id = int(parse_number(mul_id_raw)) if mul_id_raw and parse_number(mul_id_raw) is not None else None

    role = get_string(tags, "role")
    source = get_string(tags, "source")

    # --- Fluff ---
    fluff: Dict[str, Any] = {}
    for ff in ("overview", "capabilities", "deployment", "history", "manufacturer"):
        val = get_string(tags, ff)
        if val:
            fluff[ff] = val

    unit_id = generate_id_from_name(name, model)
    output: Dict[str, Any] = {
        "id": unit_id,
        "chassis": name,
        "model": model,
        "unitType": "Infantry",
        "techBase": tech_base,
        "rulesLevel": rules_level,
        "era": era,
        "year": year,
        "motionType": motion_type,
        "platoon": {
            "squadSize": squad_size,
            "squadCount": squad_count,
            "totalTroopers": total_troopers,
        },
        "primaryWeapon": {
            "id": primary_weapon_id,
            "name": primary_weapon,
        },
        "armorKit": armor_kit,
        "armorPoints": infantry_armor,
    }

    if secondary_weapon_id:
        output["secondaryWeapon"] = {
            "id": secondary_weapon_id,
            "name": secondary_weapon,
            "count": secondary_count,
        }

    if field_guns:
        output["fieldGuns"] = field_guns

    if specialization:
        output["specialization"] = specialization

    if mul_id is not None:
        output["mulId"] = mul_id
    if role:
        output["role"] = role
    if source:
        output["source"] = source
    if fluff:
        output["fluff"] = fluff

    return output


# ---------------------------------------------------------------------------
# Parity checks
# ---------------------------------------------------------------------------

PARITY_TARGETS = [
    # 10 canonical infantry platoons covering foot/jump/motorized/marine/etc.
    {"chassis": "Clan Anti-Infantry",       "min_squad": 3, "max_squad": 6, "field": "squadSize"},
    {"chassis": "Field Gun Infantry",       "min_squad": 2, "max_squad": 4, "field": "squadCount"},
    {"chassis": "Clan Space Marine",        "min_squad": 3, "max_squad": 6, "field": "squadSize"},
    {"chassis": "Clan Foot Point",          "min_squad": 4, "max_squad": 6, "field": "squadSize"},
    {"chassis": "Clan Heavy Foot Infantry", "min_squad": 4, "max_squad": 6, "field": "squadSize"},
    {"chassis": "Clan Jump Point",          "min_squad": 4, "max_squad": 6, "field": "squadSize"},
    {"chassis": "Anti-'Mech Jump Infantry", "min_squad": 5, "max_squad": 8, "field": "squadSize"},
    {"chassis": "AA Jump Infantry",         "min_squad": 5, "max_squad": 8, "field": "squadSize"},
    {"chassis": "AA Mechanized Infantry",   "min_squad": 4, "max_squad": 7, "field": "squadSize"},
    {"chassis": "Bandit Motorized Point",   "min_squad": 4, "max_squad": 6, "field": "squadSize"},
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
            "field": target["field"],
            "expected_min": target["min_squad"],
            "expected_max": target["max_squad"],
        }
        if entry is None:
            logger.warning(f"Parity: '{target['chassis']}' not found in output")
            record["status"] = "missing"
            failures += 1
            records.append(record)
            continue
        val = entry.get(target["field"], 0)
        record["actual"] = val
        record["actual_equipment_count"] = len(entry.get("equipment", []) or [])
        if not (target["min_squad"] <= val <= target["max_squad"]):
            logger.error(
                f"Parity FAIL: {target['chassis']} {target['field']}={val} "
                f"expected [{target['min_squad']},{target['max_squad']}]"
            )
            record["status"] = "fail"
            failures += 1
        else:
            logger.info(f"Parity OK: {target['chassis']} {target['field']}={val}")
            record["status"] = "ok"
        records.append(record)
    return failures, records


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def build_manifest_entry(unit: Dict[str, Any]) -> Dict[str, Any]:
    platoon = unit.get("platoon", {})
    return {
        "id": unit["id"],
        "chassis": unit["chassis"],
        "model": unit["model"],
        "unitType": unit["unitType"],
        "techBase": unit["techBase"],
        "era": unit["era"],
        "year": unit["year"],
        "motionType": unit["motionType"],
        "squadSize": platoon.get("squadSize"),
        "squadCount": platoon.get("squadCount"),
        "totalTroopers": platoon.get("totalTroopers"),
        "bv": None,
        "specialization": unit.get("specialization"),
        "role": unit.get("role"),
        "source": unit.get("source"),
        "mulId": unit.get("mulId"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Convert BLK infantry files to MekStation JSON")
    parser.add_argument(
        "--source",
        default=str(Path(default_mm_data_root()) / "mekfiles" / "infantry"),
        help="Path to mm-data infantry directory",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent.parent / "public/data/units/infantry"),
        help="Output directory for infantry JSON files",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logger = setup_logger("blk_infantry_converter", args.verbose)

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

    # Track unsupported sub-types for post-run summary
    unsupported_counts: Dict[str, int] = {}

    for blk_path in blk_files:
        unit = convert_infantry_blk(blk_path, logger)
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
    errors += write_manifest(manifest, manifest_path, "infantry", logger)

    # --- Parity checks ---
    parity_failures, parity_records = run_parity_checks(manifest, logger)

    parity_report_path = (
        Path(__file__).parent.parent.parent / "validation-output" / "blk-infantry-parity.json"
    )
    write_parity_report("infantry", parity_records, parity_failures, parity_report_path, logger)

    logger.info(
        f"Done. converted={converted} skipped={skipped} errors={errors} parity_failures={parity_failures}"
    )

    run_log = {
        "converter": "blk_infantry_converter",
        "source": str(source_dir),
        "output": str(output_dir),
        "converted": converted,
        "skipped": skipped,
        "errors": errors,
        "parity_failures": parity_failures,
    }
    log_path = Path(__file__).parent.parent.parent / "validation-output" / "blk-infantry-run-log.json"
    write_run_log(run_log, log_path, logger)

    return 1 if (errors > 0 or parity_failures > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
