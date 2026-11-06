"""
BLK BattleArmor Converter

Converts MegaMek BLK files for Battle Armor units into JSON conforming to
the IBattleArmorUnit shape used by MekStation.

BLK format specifics for Battle Armor:
  - UnitType: BattleArmor
  - Equipment in <Point Equipment> block with location suffixes (e.g., :RA, :LA, :Body)
  - <Trooper Count> for squad size (4 IS, 5 Clan, 6 SL)
  - <weightclass> code: 0=PA(L), 1=Light, 2=Medium, 3=Heavy, 4=Assault
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
    parse_battlearmor_fields,
    parse_point_equipment as shared_parse_point_equipment,
)
from blk_conversion_runner import BlkConversionConfig, run_blk_conversion, run_manifest_range_parity
from blk_unit_fields import parse_fluff, parse_mul_id, parse_quirk_fields

# Shared BLK helpers + enum_mappings re-exports — see blk_common.py for the
# extraction rationale (2026-04-25 maintenance sweep).
from blk_common import (
    default_mm_data_root,
    extract_tags,
    generate_id_from_name,
    get_string,
    map_blk_tech_type,
    map_year_to_era,
    remove_comments,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

parse_point_equipment = shared_parse_point_equipment
extract_manipulators = shared_extract_manipulators


# ---------------------------------------------------------------------------
# Converter core
# ---------------------------------------------------------------------------

def convert_battlearmor_blk(blk_path: Path, logger: logging.Logger) -> Optional[Dict[str, Any]]:
    """Parse one BLK file and return a BA JSON dict."""
    try:
        content = blk_path.read_text(encoding="utf-8")
    except OSError as e:
        raise ValueError(f"Cannot read {blk_path}: {e}") from e

    clean = remove_comments(content)
    raw_tags = extract_tags(clean)
    tags = {**raw_tags, **{key.lower(): value for key, value in raw_tags.items()}}

    unit_type_raw = get_string(tags, "unittype")
    if unit_type_raw != "BattleArmor":
        logger.debug(f"Skipping {blk_path.name}: UnitType='{unit_type_raw}' (not BattleArmor)")
        return None

    # BLKBattleArmorFile composes required source facts and Java defaults.
    fields = parse_battlearmor_fields(tags)
    name = get_string(tags, "name")
    if not name:
        raise ValueError("missing required <Name> tag")
    model = get_string(tags, "model") or ""
    year = fields.pop("year")
    tech_base, rules_level = map_blk_tech_type(tags.get("type"), year)
    era = map_year_to_era(year)

    # --- Misc ---
    mul_id = parse_mul_id(tags)
    role = get_string(tags, "role")
    source = get_string(tags, "source")
    fluff = parse_fluff(tags)

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
        **fields,
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
    # Smoke-check representative explicitly declared squad sizes.
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
