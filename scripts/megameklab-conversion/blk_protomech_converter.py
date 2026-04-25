"""
BLK ProtoMech Converter

Converts MegaMek BLK files for ProtoMechs into JSON conforming to the
IProtoMechUnit shape used by MekStation.

BLK format specifics for ProtoMechs:
  - UnitType: ProtoMek
  - <armor> 5 values: Head, Torso, Right Arm, Left Arm, Legs
  - Equipment blocks: <Head Equipment>, <Torso Equipment>, <Right Arm Equipment>,
                      <Left Arm Equipment>, <Legs Equipment>, <Body Equipment>,
                      <Main Gun Equipment>
  - <motion_type>  Biped (standard), Quad, Glider, UMU
  - <interface_cockpit>  true if has interface cockpit
  - <jumpingMP>    jump/glider MP

Output: public/data/units/protomechs/<name>.json
Manifest: public/data/units/protomechs/units-manifest.json

Usage:
    python blk_protomech_converter.py \\
        --source /path/to/mm-data/data/mekfiles/protomeks \\
        --output /path/to/public/data/units/protomechs
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

# BLK armor array order for ProtoMechs
PROTO_ARMOR_LOCATIONS = ["HEAD", "TORSO", "RIGHT_ARM", "LEFT_ARM", "LEGS"]

# Equipment block tag → location key
PROTO_LOCATION_MAP: Dict[str, str] = {
    "Head Equipment": "HEAD",
    "Torso Equipment": "TORSO",
    "Right Arm Equipment": "RIGHT_ARM",
    "Left Arm Equipment": "LEFT_ARM",
    "Legs Equipment": "LEGS",
    "Body Equipment": "BODY",
    "Main Gun Equipment": "MAIN_GUN",
}

# Motion type map: BLK motion_type → output enum
PROTO_MOTION_MAP: Dict[str, str] = {
    "Biped": "BIPED",
    "Quad": "QUAD",
    "Glider": "GLIDER",
    "UMU": "UMU",
    "WiGE": "WIGE",
}

# Armor type code (rarely used in ProtoMech BLKs, but handle it)
ARMOR_CODE_MAP: Dict[int, str] = {
    0: "STANDARD", 1: "FERRO_FIBROUS", 2: "REACTIVE", 3: "REFLECTIVE",
    4: "HARDENED", 34: "FERRO_FIBROUS_CLAN",
}


# Weight class thresholds for ProtoMechs (by tonnage)
# ProtoMechs range from 2t (PA(L)) to 9t (Assault)
def get_proto_weight_class(tonnage: float) -> str:
    if tonnage <= 2:
        return "PAL"
    elif tonnage <= 4:
        return "LIGHT"
    elif tonnage <= 6:
        return "MEDIUM"
    elif tonnage <= 8:
        return "HEAVY"
    else:
        return "ASSAULT"


# ---------------------------------------------------------------------------
# Converter core
# ---------------------------------------------------------------------------

def convert_protomech_blk(blk_path: Path, logger: logging.Logger) -> Optional[Dict[str, Any]]:
    """Parse one BLK file and return a ProtoMech JSON dict."""
    try:
        content = blk_path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        logger.warning(f"Cannot read {blk_path}: {e}")
        return None

    clean = remove_comments(content)
    tags = extract_tags(clean)

    unit_type_raw = get_string(tags, "UnitType")
    if unit_type_raw not in ("ProtoMek", "ProtoMech"):
        logger.debug(f"Skipping {blk_path.name}: UnitType='{unit_type_raw}' (not ProtoMek)")
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
    tech_type_str = get_string(tags, "type", "Type") or "Clan Level 2"
    tech_base = map_tech_base(tech_type_str)
    rules_level = map_rules_level(tech_type_str)
    era = map_year_to_era(year)

    weight_class = get_proto_weight_class(float(tonnage))

    # --- Motion type ---
    motion_raw = get_string(tags, "motion_type") or "Biped"
    motion_type = PROTO_MOTION_MAP.get(motion_raw, motion_raw.upper())

    # Glider detection: either motion_type == Glider or interface_cockpit flag
    is_glider = (motion_raw.lower() == "glider")

    # --- Movement ---
    cruise_mp = int(parse_number(get_string(tags, "cruiseMP", "CruiseMP")) or 0)
    jump_mp = int(parse_number(get_string(tags, "jumpingMP", "JumpingMP")) or 0)
    umu_mp = int(parse_number(get_string(tags, "UMUPM", "umuMP")) or 0)

    # ProtoMechs use glider MP as jump MP
    if is_glider and jump_mp == 0 and cruise_mp > 0:
        # For gliders, cruise = ground, jump = glide
        pass  # Already correct

    # --- Engine ---
    engine_code = get_string(tags, "engine_type")
    engine_type_str = map_engine_type(engine_code or "0")

    # --- Armor (5 locations: Head, Torso, R Arm, L Arm, Legs) ---
    armor_raw = tags.get("armor") or tags.get("Armor")
    armor_values = parse_armor_array(armor_raw)
    armor_code = get_string(tags, "armor_type")
    armor_type_str = map_armor_code(armor_code, ARMOR_CODE_MAP)

    armor_by_location: Dict[str, int] = {}
    for i, loc in enumerate(PROTO_ARMOR_LOCATIONS):
        if i < len(armor_values):
            armor_by_location[loc] = armor_values[i]

    # --- Equipment ---
    equipment: List[Dict[str, str]] = []
    main_gun: List[str] = []

    for blk_tag, loc_key in PROTO_LOCATION_MAP.items():
        items: List[str] = tags.get(blk_tag) or []
        if isinstance(items, str):
            items = [ln.strip() for ln in items.splitlines() if ln.strip()]
        for item in items:
            if item.strip():
                eq = {
                    "id": normalize_equipment_id(item),
                    "name": item,
                    "location": loc_key,
                }
                if loc_key == "MAIN_GUN":
                    main_gun.append(item)
                else:
                    equipment.append(eq)

    # --- Misc ---
    mul_id_raw = get_string(tags, "mul id:", "mulId")
    mul_id = int(parse_number(mul_id_raw)) if mul_id_raw and parse_number(mul_id_raw) is not None else None

    role = get_string(tags, "role")
    source = get_string(tags, "source")
    quirks_raw = get_string(tags, "quirks")
    quirks = [q.strip() for q in quirks_raw.splitlines() if q.strip()] if quirks_raw else []

    # --- Interface cockpit ---
    interface_cockpit_raw = get_string(tags, "interface_cockpit")
    has_interface_cockpit = (interface_cockpit_raw or "").lower() == "true"

    # --- Fluff ---
    fluff: Dict[str, Any] = {}
    for ff in ("overview", "capabilities", "deployment", "history", "manufacturer", "primaryFactory"):
        val = get_string(tags, ff)
        if val:
            fluff[ff] = val

    unit_id = generate_id_from_name(name, model)
    output: Dict[str, Any] = {
        "id": unit_id,
        "chassis": name,
        "model": model,
        "unitType": "ProtoMech",
        "techBase": tech_base,
        "rulesLevel": rules_level,
        "era": era,
        "year": year,
        "tonnage": tonnage,
        "weightClass": weight_class,
        "motionType": motion_type,
        "isGlider": is_glider,
        "hasInterfaceCockpit": has_interface_cockpit,
        "movement": {
            "cruiseMP": cruise_mp,
            "jumpMP": jump_mp,
            "umuMP": umu_mp,
        },
        "engine": {
            "type": engine_type_str,
        },
        "armor": {
            "type": armor_type_str,
            "byLocation": armor_by_location,
        },
        "equipment": equipment,
    }

    if main_gun:
        output["mainGun"] = {
            "weapons": [{"id": normalize_equipment_id(w), "name": w} for w in main_gun],
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
    # 10 canonical ProtoMech chassis with verified MUL tonnages
    {"chassis": "Minotaur",                       "min_tons": 8,  "max_tons": 10},
    {"chassis": "Roc",                            "min_tons": 6,  "max_tons": 8},
    {"chassis": "Siren",                          "min_tons": 2,  "max_tons": 4},
    {"chassis": "Centaur",                        "min_tons": 4,  "max_tons": 6},
    {"chassis": "Basilisk",                       "min_tons": 6,  "max_tons": 8},
    {"chassis": "Harpy",                          "min_tons": 1,  "max_tons": 3},
    {"chassis": "Gorgon",                         "min_tons": 7,  "max_tons": 9},
    {"chassis": "Satyr",                          "min_tons": 3,  "max_tons": 5},
    {"chassis": "Hobgoblin Ultraheavy ProtoMech", "min_tons": 9,  "max_tons": 11},
    {"chassis": "Sprite Ultraheavy ProtoMech",    "min_tons": 14, "max_tons": 16},
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
        "tonnage": unit["tonnage"],
        "bv": None,
        "weightClass": unit["weightClass"],
        "motionType": unit["motionType"],
        "isGlider": unit.get("isGlider", False),
        "hasMainGun": "mainGun" in unit,
        "role": unit.get("role"),
        "source": unit.get("source"),
        "mulId": unit.get("mulId"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Convert BLK ProtoMech files to MekStation JSON")
    parser.add_argument(
        "--source",
        default=str(Path(default_mm_data_root()) / "mekfiles" / "protomeks"),
        help="Path to mm-data protomeks directory",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent.parent / "public/data/units/protomechs"),
        help="Output directory for ProtoMech JSON files",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    logger = setup_logger("blk_protomech_converter", args.verbose)

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
        unit = convert_protomech_blk(blk_path, logger)
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
    errors += write_manifest(manifest, manifest_path, "protomechs", logger)

    # --- Parity checks ---
    parity_failures, parity_records = run_parity_checks(manifest, logger)

    parity_report_path = (
        Path(__file__).parent.parent.parent / "validation-output" / "blk-protomech-parity.json"
    )
    write_parity_report("protomechs", parity_records, parity_failures, parity_report_path, logger)

    logger.info(
        f"Done. converted={converted} skipped={skipped} errors={errors} parity_failures={parity_failures}"
    )

    run_log = {
        "converter": "blk_protomech_converter",
        "source": str(source_dir),
        "output": str(output_dir),
        "converted": converted,
        "skipped": skipped,
        "errors": errors,
        "parity_failures": parity_failures,
    }
    log_path = Path(__file__).parent.parent.parent / "validation-output" / "blk-protomech-run-log.json"
    write_run_log(run_log, log_path, logger)

    return 1 if (errors > 0 or parity_failures > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
