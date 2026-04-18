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

import os
import sys
import json
import re
import math
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

try:
    from enum_mappings import (
        map_tech_base,
        map_rules_level,
        map_engine_type,
        map_year_to_era,
        generate_id_from_name,
        normalize_equipment_id,
    )
except ImportError:
    def map_tech_base(v: str) -> str:
        m = {"Clan": "CLAN", "Mixed": "MIXED"}
        return m.get(v.strip(), "INNER_SPHERE")

    def map_rules_level(v: str) -> str:
        return "STANDARD"

    def map_engine_type(v: str) -> str:
        codes = {"0": "FUSION", "1": "XL", "2": "LIGHT", "3": "COMPACT", "4": "CLAN_XL",
                 "5": "XXL", "6": "ICE", "7": "FUEL_CELL", "8": "FISSION"}
        return codes.get(v.strip(), "FUSION")

    def map_year_to_era(year: int) -> str:
        if year < 2781:
            return "STAR_LEAGUE"
        elif year < 3050:
            return "SUCCESSION_WARS"
        elif year < 3068:
            return "CLAN_INVASION"
        return "DARK_AGE"

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

# Unit types handled by this converter
AEROSPACE_UNIT_TYPES = {
    "Aero", "AeroSpaceFighter",                     # Standard aerospace fighters
    "ConvFighter", "FixedWingSupport",               # Conventional fighters / support aircraft
    "SmallCraft",                                    # Small craft (assault boats, shuttles)
}

# Unit types to skip with warning
UNSUPPORTED_UNIT_TYPES = {
    "Dropship", "DropShip", "Jumpship", "JumpShip", "Warship", "WarShip",
    "SpaceStation", "Tank", "VTOL", "BattleArmor", "Infantry", "ProtoMech",
}

# Sub-type classification
ASF_TYPES = {"Aero", "AeroSpaceFighter"}
CF_TYPES = {"ConvFighter", "FixedWingSupport"}
SC_TYPES = {"SmallCraft"}

# Armor arc order in BLK: Nose, Left Wing, Right Wing, Aft
AERO_ARMOR_ARCS = ["NOSE", "LEFT_WING", "RIGHT_WING", "AFT"]
SC_ARMOR_ARCS = ["NOSE", "LEFT_SIDE", "RIGHT_SIDE", "AFT"]

# Equipment location tag → output key
AERO_LOCATION_MAP: Dict[str, str] = {
    "Nose Equipment": "NOSE",
    "Left Wing Equipment": "LEFT_WING",
    "Right Wing Equipment": "RIGHT_WING",
    "Aft Equipment": "AFT",
    "Wings Equipment": "WINGS",
    "Fuselage Equipment": "FUSELAGE",
    "Body Equipment": "FUSELAGE",
    "Front Equipment": "NOSE",
    "Left Equipment": "LEFT_WING",
    "Right Equipment": "RIGHT_WING",
    "Rear Equipment": "AFT",
}

# Small craft use "side" instead of "wing"
SC_LOCATION_MAP: Dict[str, str] = {
    "Nose Equipment": "NOSE",
    "Left Side Equipment": "LEFT_SIDE",
    "Right Side Equipment": "RIGHT_SIDE",
    "Left Wing Equipment": "LEFT_SIDE",
    "Right Wing Equipment": "RIGHT_SIDE",
    "Aft Equipment": "AFT",
    "Fuselage Equipment": "FUSELAGE",
    "Body Equipment": "FUSELAGE",
}

# Armor type code → string (same as vehicle converter)
ARMOR_CODE_MAP: Dict[int, str] = {
    0: "STANDARD", 1: "FERRO_FIBROUS", 2: "REACTIVE", 3: "REFLECTIVE",
    4: "HARDENED", 5: "LIGHT_FERRO_FIBROUS", 6: "HEAVY_FERRO_FIBROUS",
    8: "STEALTH", 31: "COMMERCIAL", 32: "INDUSTRIAL", 33: "HEAVY_INDUSTRIAL",
    34: "FERRO_FIBROUS_CLAN", 39: "PRIMITIVE", 40: "IMPACT_RESISTANT",
    41: "BAR_2", 42: "BAR_3", 43: "BAR_4", 44: "BAR_5",
}

# Cockpit code → string
COCKPIT_CODE_MAP: Dict[int, str] = {
    0: "STANDARD",
    1: "SMALL",
    2: "COMMAND_CONSOLE",
    3: "PRIMITIVE",
    4: "STANDARD_AERO",
    5: "PRIMITIVE_AERO",
    6: "CLAN",
}

# Motion type for aerospace
MOTION_MAP: Dict[str, str] = {
    "Aerodyne": "AERODYNE",
    "Spheroid": "SPHEROID",
}


# ---------------------------------------------------------------------------
# Shared BLK parsing helpers (same logic as vehicle converter)
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


def parse_armor_array(raw: Any) -> List[int]:
    if raw is None:
        return []
    lines = raw if isinstance(raw, list) else str(raw).strip().splitlines()
    result = []
    for ln in lines:
        ln = ln.strip()
        if ln:
            try:
                result.append(int(float(ln)))
            except ValueError:
                pass
    return result


def map_armor_code(code: Any) -> str:
    if code is None:
        return "STANDARD"
    try:
        return ARMOR_CODE_MAP.get(int(float(str(code))), "STANDARD")
    except (ValueError, TypeError):
        return "STANDARD"


def map_cockpit_code(code: Any) -> str:
    if code is None:
        return "STANDARD"
    try:
        return COCKPIT_CODE_MAP.get(int(float(str(code))), "STANDARD")
    except (ValueError, TypeError):
        return "STANDARD"


def get_weight_class(tonnage: float) -> str:
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
    armor_type_str = map_armor_code(armor_code)

    # Arc-based armor — ASF/CF use Nose/LW/RW/Aft; SmallCraft use Nose/LS/RS/Aft
    is_small_craft = sub_type == "SmallCraft"
    arc_names = SC_ARMOR_ARCS if is_small_craft else AERO_ARMOR_ARCS
    armor_by_arc: Dict[str, int] = {}
    for i, arc in enumerate(arc_names):
        if i < len(armor_values):
            armor_by_arc[arc] = armor_values[i]

    # --- Equipment ---
    loc_map = SC_LOCATION_MAP if is_small_craft else AERO_LOCATION_MAP
    equipment: List[Dict[str, str]] = []
    for blk_tag, loc_key in loc_map.items():
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
    mul_id_raw = get_string(tags, "mul id:", "mulId")
    mul_id = int(parse_number(mul_id_raw)) if mul_id_raw and parse_number(mul_id_raw) is not None else None

    role = get_string(tags, "role")
    source = get_string(tags, "source")
    quirks_raw = get_string(tags, "quirks")
    quirks = [q.strip() for q in quirks_raw.splitlines() if q.strip()] if quirks_raw else []

    weight_class = get_weight_class(float(tonnage))

    # --- Fluff ---
    fluff: Dict[str, Any] = {}
    for ff in ("overview", "capabilities", "deployment", "history", "manufacturer", "primaryFactory"):
        val = get_string(tags, ff)
        if val:
            fluff[ff] = val

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
    {"chassis": "Shilone",    "model": "SL-17",  "min_tons": 60, "max_tons": 70},
    {"chassis": "Stuka",      "model": "",        "min_tons": 95, "max_tons": 105},
    {"chassis": "Sparrowhawk","model": "",        "min_tons": 25, "max_tons": 35},
    {"chassis": "Firebird",   "model": "FR-1",    "min_tons": 40, "max_tons": 50},
]


def run_parity_checks(manifest: List[Dict[str, Any]], logger: logging.Logger) -> int:
    failures = 0
    index: Dict[str, Dict[str, Any]] = {}
    for entry in manifest:
        key = entry.get("chassis", "").lower()
        index[key] = entry

    for target in PARITY_TARGETS:
        key = target["chassis"].lower()
        entry = index.get(key)
        if entry is None:
            logger.warning(f"Parity: '{target['chassis']}' not found in output")
            failures += 1
            continue
        tonnage = entry.get("tonnage", 0)
        if not (target["min_tons"] <= tonnage <= target["max_tons"]):
            logger.error(f"Parity FAIL: {target['chassis']} tonnage={tonnage} expected [{target['min_tons']},{target['max_tons']}]")
            failures += 1
        else:
            logger.info(f"Parity OK: {target['chassis']} tonnage={tonnage}")
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
        "subType": unit.get("subType"),
        "techBase": unit["techBase"],
        "era": unit["era"],
        "year": unit["year"],
        "tonnage": unit["tonnage"],
        "motionType": unit.get("motionType", "AERODYNE"),
        "role": unit.get("role"),
        "source": unit.get("source"),
        "mulId": unit.get("mulId"),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# Default source sub-directories to scan
DEFAULT_SOURCE_SUBDIRS = ["fighters", "convfighter", "smallcraft"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert BLK aerospace files to MekStation JSON")
    parser.add_argument(
        "--source",
        default=str(Path("/e/Projects/mm-data/data/mekfiles")),
        help="Path to mm-data mekfiles root (contains fighters/, convfighter/, smallcraft/)",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent.parent / "public/data/units/aerospace"),
        help="Output directory for aerospace JSON files",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=log_level, format="%(levelname)s %(message)s", stream=sys.stderr)
    logger = logging.getLogger("blk_aerospace_converter")

    source_root = Path(args.source)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Collect all BLK files from the relevant subdirs
    blk_files: List[Path] = []
    for sub in DEFAULT_SOURCE_SUBDIRS:
        sub_dir = source_root / sub
        if sub_dir.exists():
            blk_files.extend(sorted(sub_dir.rglob("*.blk")))
        else:
            logger.warning(f"Source subdir not found: {sub_dir}")

    logger.info(f"Found {len(blk_files)} BLK files in aerospace subdirs")

    converted = 0
    skipped_unsupported = 0
    skipped_other = 0
    errors = 0
    manifest: List[Dict[str, Any]] = []

    for blk_path in blk_files:
        unit = convert_aerospace_blk(blk_path, logger)
        if unit is None:
            try:
                raw = blk_path.read_text(encoding="utf-8", errors="replace")
                tags = extract_tags(remove_comments(raw))
                ut = get_string(tags, "UnitType") or ""
                if ut in UNSUPPORTED_UNIT_TYPES:
                    skipped_unsupported += 1
                else:
                    skipped_other += 1
            except Exception:
                skipped_other += 1
            continue

        # Sanitize filename
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
        "type": "aerospace",
        "count": len(manifest),
        "units": sorted(manifest, key=lambda u: (u["chassis"], u["model"])),
    }
    manifest_path.write_text(json.dumps(manifest_data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info(f"Manifest written: {manifest_path} ({len(manifest)} units)")

    parity_failures = run_parity_checks(manifest, logger)

    logger.info(
        f"Done. converted={converted} skipped_unsupported={skipped_unsupported} "
        f"skipped_other={skipped_other} errors={errors} parity_failures={parity_failures}"
    )

    run_log = {
        "converter": "blk_aerospace_converter",
        "source": str(source_root),
        "output": str(output_dir),
        "converted": converted,
        "skipped_unsupported": skipped_unsupported,
        "skipped_other": skipped_other,
        "errors": errors,
        "parity_failures": parity_failures,
    }
    print(json.dumps(run_log))
    return 1 if (errors > 0 or parity_failures > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
