"""
BLK ProtoMech Converter

Converts MegaMek BLK files for ProtoMechs into JSON conforming to the
IProtoMechUnit shape used by MekStation.

BLK format specifics for ProtoMechs:
  - UnitType: ProtoMek
  - <armor> 5 or 6 values: Head, Torso, Right Arm, Left Arm, Legs, optional Main Gun
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

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from blk_conversion_runner import BlkConversionConfig, run_blk_conversion, run_manifest_range_parity

# Shared BLK helpers + enum_mappings re-exports — see blk_common.py for the
# extraction rationale (2026-04-25 maintenance sweep).
from blk_common import (
    BLK_ARMOR_CODE_MAP,
    map_armor_code,
    default_mm_data_root,
    extract_tags,
    generate_id_from_name,
    get_string,
    map_blk_tech_type,
    map_year_to_era,
    parse_number,
    remove_comments,
)

from blk_unit_fields import parse_location_equipment, parse_qualifier_number, parse_quirk_fields

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

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

PROTO_ARMOR_LOCATIONS = ('HEAD', 'TORSO', 'RIGHT_ARM', 'LEFT_ARM', 'LEGS', 'MAIN_GUN')
# EntityMovementMode.parseFromString accepts enum names and these legacy aliases.
MOTION_MODES = frozenset(('BIPED TRIPOD QUAD TRACKED WHEELED HOVER VTOL NAVAL HYDROFOIL '
    'SUBMARINE INF_LEG INF_MOTORIZED INF_JUMP BIPED_SWIM QUAD_SWIM WIGE AERODYNE '
    'SPHEROID INF_UMU AEROSPACE AIRSHIP STATION_KEEPING RAIL MAGLEV').split())
MOTION_ALIASES = {
    'GLIDER': 'WIGE', 'UMU': 'INF_UMU', 'SCUBA': 'INF_UMU', 'MOTORIZED SCUBA': 'INF_UMU',
    'MICROCOPTER': 'VTOL', 'MICRO-COPTER': 'VTOL', 'MICROLITE': 'VTOL',
    'LEG': 'INF_LEG', 'MOTORIZED': 'INF_MOTORIZED', 'JUMP': 'INF_JUMP',
    'STATION': 'STATION_KEEPING', 'SATELLITE': 'STATION_KEEPING', 'STATION-KEEPING': 'STATION_KEEPING',
}


def get_proto_weight_class(tonnage: float) -> str:
    """EntityWeightClass.protoWeightLimits: 3/5/7/9, then WEIGHT_SUPER_HEAVY."""
    for limit, name in ((3, 'LIGHT'), (5, 'MEDIUM'), (7, 'HEAVY'), (9, 'ASSAULT')):
        if tonnage <= limit:
            return name
    return 'ULTRAHEAVY'


def parse_proto_fields(tags: Dict[str, Any]) -> Dict[str, Any]:
    for tag in ('Name', 'year', 'tonnage', 'type', 'motion_type', 'cruiseMP', 'armor'):
        if tag not in tags or not str(tags[tag]).strip():
            raise ValueError(f'Missing required ProtoMek <{tag}>')
    year = parse_qualifier_number(tags, 'year', integer=True)
    tonnage = parse_qualifier_number(tags, 'tonnage')
    if tonnage <= 0:
        raise ValueError('Invalid ProtoMek tonnage: must be positive')
    tonnage = int(tonnage) if tonnage.is_integer() else tonnage
    raw_motion = str(tags['motion_type']).upper()
    motion = MOTION_ALIASES.get(raw_motion, raw_motion)
    if motion not in MOTION_MODES:
        raise ValueError(f'Invalid ProtoMek motion_type: {raw_motion!r}')
    armor_values = [parse_qualifier_number({'armor': value}, 'armor', integer=True)
                    for value in str(tags['armor']).splitlines() if value.strip()]
    if len(armor_values) not in (5, 6):
        raise ValueError('Incorrect ProtoMek armor array length: expected 5 or 6')
    armor_code = parse_qualifier_number(tags, 'armor_type', integer=True) if 'armor_type' in tags else 0
    armor = {
        'type': map_armor_code(42 if armor_code == 0 else armor_code, BLK_ARMOR_CODE_MAP),
        'byLocation': dict(zip(PROTO_ARMOR_LOCATIONS, armor_values)),
    }
    tech_tag = next((tag for tag in ('armor_tech_level', 'armor_tech') if tag in tags), None)
    if tech_tag:
        armor['sourceTechLevel'] = parse_qualifier_number(tags, tech_tag, integer=True)
    movement = {'cruiseMP': parse_qualifier_number(tags, 'cruiseMP', integer=True),
                'jumpMP': parse_qualifier_number(tags, 'jumpingMP', integer=True) if 'jumpingMP' in tags else 0}
    return dict(year=year, tonnage=tonnage, weightClass=get_proto_weight_class(tonnage),
                motionType=motion, isGlider=motion == 'WIGE', isQuad=motion == 'QUAD',
                hasMainGun=len(armor_values) == 6, armor=armor, movement=movement)


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

    fields = parse_proto_fields(tags)
    name = get_string(tags, "Name")
    model = get_string(tags, "Model", "model") or ""
    year = fields['year']
    tech_base, rules_level = map_blk_tech_type(get_string(tags, "type"), year)
    era = map_year_to_era(year)

    # --- Engine ---
    engine_code = tags.get("engine_type")
    # MegaMek 48fcb2f6 BLKProtoMekFile.java:93-95 ignores the tag.
    engine_type_str = "FUSION"
    if engine_code is not None and str(engine_code).strip() != "0":
        logger.warning(f"{blk_path}: ignored raw engine_type={engine_code!r}; ProtoMek loader uses fusion")

    # Source locations and names remain intact; runtime mount resolution belongs
    # to the loader. Java ignores the Main Gun block when the location is absent.
    locations = {tag: location for tag, location in PROTO_LOCATION_MAP.items()
                 if location != "MAIN_GUN" or fields['hasMainGun']}
    equipment = parse_location_equipment(tags, locations)
    main_gun = [item for item in equipment if item['location'] == 'MAIN_GUN']

    # --- Misc ---
    mul_id_raw = get_string(tags, "mul id:", "mulId")
    mul_id = int(parse_number(mul_id_raw)) if mul_id_raw and parse_number(mul_id_raw) is not None else None

    role = get_string(tags, "role")
    source = get_string(tags, "source")

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
        **fields,
        "hasInterfaceCockpit": has_interface_cockpit,
        "engine": {
            "type": engine_type_str,
        },
        "equipment": equipment,
    }

    if main_gun:
        output["mainGun"] = {
            "weapons": [{"id": w["id"], "name": w["name"]} for w in main_gun],
        }

    if mul_id is not None:
        output["mulId"] = mul_id
    if role:
        output["role"] = role
    if source:
        output["source"] = source
    output.update(parse_quirk_fields(tags))
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
        "tonnage": unit["tonnage"],
        "bv": None,
        "weightClass": unit["weightClass"],
        "motionType": unit["motionType"],
        "isGlider": unit.get("isGlider", False),
        "hasMainGun": unit["hasMainGun"],
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
            converter="blk_protomech_converter",
            description="Convert BLK ProtoMech files to MekStation JSON",
            source_default=str(Path(default_mm_data_root()) / "mekfiles" / "protomeks"),
            source_help="Path to mm-data protomeks directory",
            output_default=str(Path(__file__).parent.parent.parent / "public/data/units/protomechs"),
            output_help="Output directory for ProtoMech JSON files",
            type_name="protomechs",
            parity_report_filename="blk-protomech-parity.json",
            run_log_filename="blk-protomech-run-log.json",
            convert_unit=convert_protomech_blk,
            build_manifest_entry=build_manifest_entry,
            run_parity_checks=run_parity_checks,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
