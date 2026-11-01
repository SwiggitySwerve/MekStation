"""
BLK Capital Converter

Converts MegaMek BLK files for DropShips, JumpShips, WarShips and Space Stations.

Output: public/data/units/capital/<name>.json
Manifest: public/data/units/capital/units-manifest.json

Usage:
    python blk_capital_converter.py \\
        --source /path/to/mm-data/data/mekfiles \\
        --output /path/to/public/data/units/capital

Field semantics follow the pinned MegaMek BLK capital loaders (48fcb2f6).
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

from blk_aerospace_tables import map_aerospace_motion
from blk_capital_tables import (
    CAPITAL_ARMOR_CODE_MAP,
    CAPITAL_UNIT_TYPES,
    DEFAULT_SOURCE_SUBDIRS,
    DESIGN_TYPE_MAP,
    DROPSHIP_ARMOR_ARCS,
    DROPSHIP_LOCATION_MAP,
    JUMPSHIP_ARMOR_ARCS,
    JUMPSHIP_LOCATION_MAP,
    JUMPSHIP_LOCATION_ALIASES,
    WARSHIP_BROADSIDES,
    WARSHIP_BROADSIDE_ALIASES,
    UNSUPPORTED_UNIT_TYPES,
)
from blk_common import (
    default_mm_data_root,
    extract_tags,
    generate_id_from_name,
    get_string,
    map_rules_level,
    map_tech_base,
    map_year_to_era,
    maximum_thrust,
    parse_armor_array,
    parse_number,
    remove_comments,
    validate_blk_tech_type,
)
from blk_conversion_runner import (
    BlkConversionConfig,
    collect_subdir_blk_files,
    run_blk_conversion,
    run_manifest_range_parity,
)
from blk_unit_fields import parse_fluff, parse_location_equipment, parse_mul_id, parse_quirks

# Tags BLKDropshipFile.java throws on when absent (:55-59, :68-77, :104-106, :113-117, :121-125, :134-135, :142-143).
# A silent 0 would be a lie for these, so a missing one rejects the source like Java does.
REQUIRED_COUNT_TAGS = ("crew", "life_boat", "escape_pod", "structural_integrity", "fuel", "heatsinks", "sink_type", "SafeThrust")

# Optional crew-complement tags (BLKDropshipFile.java:58-95) -> output key.
OPTIONAL_COUNT_TAGS = {
    "officers": "officers",
    "gunners": "gunners",
    "passengers": "passengers",
    "battlearmor": "battleArmor",
    "marines": "marines",
    "otherpassenger": "otherPassengers",
}


def required_count(tags: Dict[str, Any], tag: str, blk_path: Path) -> int:
    value = parse_number(get_string(tags, tag))
    if value is None:
        raise ValueError(f"{blk_path.name}: missing required <{tag}> tag")
    return int(value)


def map_capital_armor(blk_path: Path, tags: Dict[str, Any]) -> str:
    code = get_string(tags, "armor_type")
    code_value = parse_number(code) if code is not None else 41  # BLKDropshipFile.java:118 default
    if code_value not in CAPITAL_ARMOR_CODE_MAP:
        raise ValueError(f"{blk_path.name}: unsupported capital armor_type {code!r}")
    return CAPITAL_ARMOR_CODE_MAP[code_value]


def convert_capital_blk(blk_path: Path, logger: logging.Logger) -> Any:
    """Parse one capital BLK, rejecting damaged recognized sources; skip other families."""
    try:
        content = blk_path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        logger.warning(f"Cannot read {blk_path}: {e}")
        return None

    tags = extract_tags(remove_comments(content))
    unit_type_raw = get_string(tags, "UnitType")
    if unit_type_raw is None:
        logger.warning(f"Skipping {blk_path.name}: missing UnitType tag")
        return None
    if unit_type_raw in UNSUPPORTED_UNIT_TYPES:
        logger.info(f"Skipping {blk_path.name}: unsupported type '{unit_type_raw}'")
        return None
    if unit_type_raw not in CAPITAL_UNIT_TYPES:
        logger.debug(f"Skipping {blk_path.name}: not a capital type ('{unit_type_raw}')")
        return None

    unit_type = CAPITAL_UNIT_TYPES[unit_type_raw]
    dropship = unit_type == "DropShip"
    warship = unit_type == "WarShip"
    armor_arcs = DROPSHIP_ARMOR_ARCS if dropship else JUMPSHIP_ARMOR_ARCS
    location_map = dict(DROPSHIP_LOCATION_MAP if dropship else JUMPSHIP_LOCATION_MAP)
    if not dropship:
        if warship:
            location_map.update(WARSHIP_BROADSIDES)
        location_map.update(JUMPSHIP_LOCATION_ALIASES)
        if warship:
            location_map.update(WARSHIP_BROADSIDE_ALIASES)

    name = get_string(tags, "Name")
    if not name:
        raise ValueError(f"{blk_path.name}: missing required <Name> tag")
    model = get_string(tags, "Model", "model") or ""

    year_raw = parse_number(get_string(tags, "year", "Year"))
    tonnage_raw = parse_number(get_string(tags, "tonnage", "Tonnage"))
    if year_raw is None:
        raise ValueError(f"{blk_path.name}: missing required <year> tag")
    if tonnage_raw is None:
        raise ValueError(f"{blk_path.name}: missing required <tonnage> tag")
    year = int(year_raw)
    tonnage = int(tonnage_raw) if tonnage_raw == int(tonnage_raw) else tonnage_raw

    required_tags = REQUIRED_COUNT_TAGS if dropship else tuple(tag for tag in REQUIRED_COUNT_TAGS if tag != "SafeThrust") + ("passengers",)
    if warship:
        required_tags += ("SafeThrust",)
    counts = {tag: required_count(tags, tag, blk_path) for tag in required_tags}
    safe_thrust = counts.get("SafeThrust", 0)  # JumpShip/Station loaders force zero, even if tagged.

    armor_values = parse_armor_array(tags.get("armor"))
    if len(armor_values) != len(armor_arcs):
        raise ValueError(f"{blk_path.name}: expected {len(armor_arcs)} armor values, found {len(armor_values)}")

    tech_type_str = validate_blk_tech_type(get_string(tags, "type", "Type"))
    motion_raw = get_string(tags, "motion_type")
    if dropship and motion_raw is None:
        raise ValueError(f"{blk_path.name}: missing required <motion_type> tag")

    # DropShip inherits the SmallCraft ICE placeholder; the larger loaders explicitly set Engine(400, 0, 0).
    # None of these loaders decodes the BLK engine_type as a construction engine.
    if tags.get("engine_type") is not None:
        logger.info(f"{blk_path}: ignored raw engine_type={tags['engine_type']!r}; upstream capital ICE placeholder")

    design_raw = parse_number(get_string(tags, "designtype"))
    design_code = (1 if dropship or warship else 0) if design_raw is None else int(design_raw)
    if design_code not in DESIGN_TYPE_MAP:
        raise ValueError(f"{blk_path.name}: unsupported designtype {design_code}")

    output: Dict[str, Any] = {
        "id": generate_id_from_name(name, model),
        "chassis": name,
        "model": model,
        "unitType": unit_type,
        "subType": unit_type,
        "techBase": map_tech_base(tech_type_str),
        "rulesLevel": map_rules_level(tech_type_str),
        "era": map_year_to_era(year),
        "year": year,
        "tonnage": tonnage,
        "motionType": map_aerospace_motion(motion_raw) if dropship else "AERODYNE",
        "designType": DESIGN_TYPE_MAP[design_code],
        **({"collarType": int(parse_number(get_string(tags, "collartype")) or 0)} if dropship else {}),
        "movement": {"safeThrust": safe_thrust, "maxThrust": maximum_thrust(safe_thrust)},
        "fuel": counts["fuel"],
        "structuralIntegrity": counts["structural_integrity"],
        "engine": {"type": "ICE"},
        "heatSinks": {"type": "DOUBLE" if counts["sink_type"] == 1 else "SINGLE", "count": counts["heatsinks"]},
        "armor": {
            "type": map_capital_armor(blk_path, tags),
            "byArc": dict(zip(armor_arcs, armor_values)),
        },
        "equipment": parse_location_equipment(tags, location_map),
        "crew": counts["crew"],
        "escapePods": counts["escape_pod"],
        "lifeBoats": counts["life_boat"],
    }
    for tag, key in OPTIONAL_COUNT_TAGS.items():
        if dropship or tag != "otherpassenger":
            output[key] = int(parse_number(get_string(tags, tag)) or 0)

    # Bay and quarters lines are kept verbatim; the read-only viewer (UL-14) interprets them.
    transporters = [line.strip() for line in (get_string(tags, "transporters") or "").splitlines() if line.strip()]
    if transporters:
        output["transporters"] = transporters
    if not dropship:
        output.update(parse_jump_ship_fields(tags, unit_type, transporters, blk_path))

    original_build_year = parse_number(get_string(tags, "originalBuildYear"))
    if original_build_year is not None:
        output["originalBuildYear"] = int(original_build_year)
    mul_id = parse_mul_id(tags)
    if mul_id is not None:
        output["mulId"] = mul_id
    for key, value in (("role", get_string(tags, "role")), ("source", get_string(tags, "source"))):
        if value:
            output[key] = value
    quirks = parse_quirks(tags)
    if quirks:
        output["quirks"] = quirks
    fluff = parse_fluff(tags)
    if fluff:
        output["fluff"] = fluff
    return output


def parse_jump_ship_fields(tags: Dict[str, Any], unit_type: str, transporters: List[str], blk_path: Path) -> Dict[str, Any]:
    """Source facts and constructor defaults shared by the three Jumpship-derived Java loaders."""
    station = unit_type == "Space Station"
    warship = unit_type == "WarShip"
    decks = []
    # Jumpship.setGravDeck{,Large,Huge}: append legacy representative diameters, then explicit decks.
    for tag, diameter in (("grav_deck", 50), ("grav_deck_large", 175), ("grav_deck_huge", 375)):
        if tag in tags:
            decks.extend([diameter] * required_count(tags, tag, blk_path))
    for value in (get_string(tags, "grav_decks") or "").splitlines():
        decks.append(int(value))
    legacy_docks = int(parse_number(get_string(tags, "docking_collar")) or 0) if not station else 0
    fields = {
        "otherCrew": int(parse_number(get_string(tags, "other_crew")) or 0),
        "driveCoreType": required_count(tags, "kf_core", blk_path) if warship and "kf_core" in tags else (3 if station else 1 if warship else 0),
        "jumpRange": required_count(tags, "jump_range", blk_path) if warship and "jump_range" in tags else 30,
        "hasSail": required_count(tags, "sail", blk_path) != 0 if "sail" in tags else not station,
        "hasLFBattery": not station and "lithium-fusion" in tags,
        "hasHPG": "hpg" in tags,
        "gravDecks": decks,
        "dockingCollars": max(0, legacy_docks) + sum(line.split(":", 1)[0].lower() == "dockingcollar" for line in transporters),
    }
    if station:
        fields["isModular"] = "modular" in tags
    return fields


# ---------------------------------------------------------------------------
# Parity checks
# ---------------------------------------------------------------------------

PARITY_TARGETS = [
    # Tonnages from the pinned-Java oracle (UL-16 full.jsonl); each chassis has one tonnage across its variants.
    {"chassis": "Union", "model": "(3070)", "min_tons": 3600, "max_tons": 3600},
    {"chassis": "Leopard", "model": "", "min_tons": 1900, "max_tons": 1900},
    {"chassis": "Overlord", "model": "", "min_tons": 9700, "max_tons": 9700},
    {"chassis": "Behemoth", "model": "(2658)", "min_tons": 100000, "max_tons": 100000},
]


def run_parity_checks(
    manifest: List[Dict[str, Any]],
    logger: logging.Logger,
) -> Tuple[int, List[Dict[str, Any]]]:
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


def build_manifest_entry(unit: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": unit["id"],
        "chassis": unit["chassis"],
        "model": unit["model"],
        "unitType": unit["unitType"],
        "subType": unit["subType"],
        "techBase": unit["techBase"],
        "era": unit["era"],
        "year": unit["year"],
        "tonnage": unit["tonnage"],
        "bv": None,
        "motionType": unit["motionType"],
        "role": unit.get("role"),
        "source": unit.get("source"),
        "mulId": unit.get("mulId"),
    }


def main() -> int:
    return run_blk_conversion(
        BlkConversionConfig(
            converter="blk_capital_converter",
            description="Convert BLK capital-ship files to MekStation JSON",
            source_default=str(Path(default_mm_data_root()) / "mekfiles"),
            source_help="Path to mm-data mekfiles root (dropships/, jumpships/, warship/, spacestation/)",
            # No default: the capital catalog is published only by the UL-C1 step,
            # which passes --output public/data/units/capital explicitly.
            output_default=None,
            output_help="Output directory for capital-ship JSON files (required)",
            type_name="capital",
            parity_report_filename="blk-capital-parity.json",
            run_log_filename="blk-capital-run-log.json",
            convert_unit=convert_capital_blk,
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
