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

import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from blk_infantry_armor import ARMOR_KITS, infantry_armor
from blk_infantry_equipment import INFANTRY_WEAPONS, FIELD_EQUIPMENT, TROOPER_EQUIPMENT
from schema_gate import validate_unit
from blk_unit_fields import mixed_chassis_fields, parse_quirk_fields

from blk_conversion_runner import BlkConversionConfig, run_blk_conversion, run_manifest_range_parity

# Shared BLK helpers + enum_mappings re-exports — see blk_common.py for the
# extraction rationale (2026-04-25 maintenance sweep).
from blk_common import (
    default_mm_data_root,
    extract_tags,
    generate_id_from_name,
    get_string,
    map_blk_tech_type,
    map_year_to_era,
    normalize_equipment_id,
    parse_number,
    remove_comments,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Infantry motion type → output enum
INFANTRY_MOTION_MAP: Dict[str, str] = {
    "Leg": "FOOT",
    "Jump": "JUMP",
    "Motorized": "MOTORIZED",
    "Wheeled": "WHEELED",
    "Tracked": "TRACKED",
    "Hover": "HOVER",
    "VTOL": "VTOL",
    "UMU": "UMU",
}

# BLKInfantryFile uses EntityMovementMode, not armor-kit name heuristics.
INFANTRY_MOTION_MAP = {key.lower(): value for key, value in INFANTRY_MOTION_MAP.items()}
INFANTRY_MOTION_MAP.update({"submarine": "SUBMARINE", "inf_leg": "FOOT",
    "inf_motorized": "MOTORIZED", "inf_jump": "JUMP", "inf_umu": "UMU",
    "scuba": "UMU", "motorized scuba": "UMU", "microcopter": "VTOL",
    "micro-copter": "VTOL", "microlite": "VTOL"})
# InfantryMount.sampleMounts (raw mount text is retained for later loader/BV work).
BEAST_DIVISORS = dict.fromkeys(("Donkey", "Coventry Kangaroo", "Horse", "Camel", "Branth",
    "Odessan Raxx", "Tabiranth", "Tariq"), 1.0) | {"Elephant": 2.0, "Orca": 2.0, "Hipposaur": 4.0}
AUGMENTATIONS = set((
    "artificial_pain_shunt vdni bvdni pl_enhanced pl_ienhanced pl_masc pl_extra_limbs pl_tail pl_glider pl_flight "
    "cyber_imp_audio cyber_imp_visual cyber_imp_laser cyber_imp_tele mm_implants enh_mm_implants comm_implant "
    "boost_comm_implant dermal_armor tsm_implant filtration_implants gas_effuser_pheromone gas_effuser_toxin "
    "dermal_camo_armor triple_core_processor suicide_implants proto_dni ei_implant"
).split())
PROSTHETICS = set("LASER BALLISTIC NEEDLER SHOTGUN SONIC_STUNNER SMG BLADE SHOCKER VIBROBLADE RUMAL_GARROTE GRAPPLER CLIMBING_CLAWS".split())


def infantry_number(tags, tag, default=None, *, integer=True, minimum=0):
    raw = tags.get(tag, default)
    value = parse_number(raw)
    if value is None or not math.isfinite(value) or value < minimum or (integer and not str(raw).strip().lstrip("+-").isdigit()):
        raise ValueError(f"Invalid infantry <{tag}>: {raw!r}")
    return int(value) if integer else value


def infantry_motion(raw: str) -> Tuple[str, float, int]:
    if raw.startswith("Beast:"):
        mount = raw[len("Beast:"):]
        if mount.startswith("Custom:"):
            fields = mount[len("Custom:"):].split(",")
            if len(fields) != 11 or fields[1] not in ("LARGE", "VERY_LARGE", "MONSTROUS") or fields[4] not in ("INF_LEG", "INF_MOTORIZED", "INF_JUMP", "INF_UMU", "TRACKED", "WHEELED", "HOVER", "VTOL", "SUBMARINE", "WIGE"):
                raise ValueError(f"Invalid infantry mount: {raw!r}")
            for index in (2, 3, 5, 6, 7, 8, 9, 10):
                infantry_number({"mount": fields[index]}, "mount", integer=index not in (2, 7))
            return "BEAST", float(fields[7]), 4096 if fields[4] in ("SUBMARINE", "INF_UMU") else 0
        if mount in BEAST_DIVISORS:
            return "BEAST", BEAST_DIVISORS[mount], 4096 if mount in ("Orca", "Hipposaur") else 0
    elif raw.lower() in INFANTRY_MOTION_MAP:
        mode = INFANTRY_MOTION_MAP[raw.lower()]
        return mode, 1.0, 4096 if mode in ("SUBMARINE", "UMU") else 0
    raise ValueError(f"Unsupported infantry motion_type: {raw!r}")


# ---------------------------------------------------------------------------
# Converter core
# ---------------------------------------------------------------------------

def convert_infantry_blk(blk_path: Path, logger: logging.Logger) -> Optional[Dict[str, Any]]:
    """Parse one BLK file and return an infantry JSON dict."""
    try:
        content = blk_path.read_text(encoding="utf-8")
    except OSError as e:
        raise ValueError(f"Cannot read {blk_path}: {e}") from e

    clean = remove_comments(content)
    tags = extract_tags(clean)

    unit_type_raw = get_string(tags, "UnitType")
    if unit_type_raw != "Infantry":
        logger.debug(f"Skipping {blk_path.name}: UnitType='{unit_type_raw}' (not Infantry)")
        return None

    # --- Required fields (BLKInfantryFile and BLKFile.setBasicEntityData) ---
    for key in ("Name", "year", "type", "squad_size", "squadn", "motion_type", "Primary"):
        if not get_string(tags, key):
            raise ValueError(f"Missing required infantry <{key}> tag")
    name = tags["Name"]

    model = get_string(tags, "Model", "model") or ""

    year = infantry_number(tags, "year", minimum=1)

    # --- Classification ---
    tech_base, rules_level = map_blk_tech_type(tags["type"], year)
    era = map_year_to_era(year)

    # --- Platoon composition ---
    squad_size = infantry_number(tags, "squad_size", minimum=1)
    squad_count = infantry_number(tags, "squadn", minimum=1)
    total_troopers = squad_size * squad_count

    # --- Motion type ---
    motion_raw = tags["motion_type"]
    motion_type, beast_divisor, implicit_specializations = infantry_motion(motion_raw)

    # --- Weapons ---
    primary_weapon = tags["Primary"]
    primary_weapon_id = normalize_equipment_id(primary_weapon)

    secondary_weapon = get_string(tags, "Secondary")
    if "Secondary" in tags and not secondary_weapon:
        raise ValueError("Empty infantry <Secondary> tag")
    for weapon in (primary_weapon, secondary_weapon):
        if weapon is not None and weapon.lower() not in INFANTRY_WEAPONS:
            raise ValueError(f"Unsupported infantry weapon: {weapon!r}")
    secondary_weapon_id = normalize_equipment_id(secondary_weapon) if secondary_weapon else None

    secondary_count = infantry_number(tags, "secondn", 0) if secondary_weapon else 0

    # --- Field guns ---
    field_gun_items: List[str] = tags.get("Field Guns Equipment") or []
    field_guns: List[Dict[str, str]] = []
    for item in field_gun_items:
        if item.strip():
            field_guns.append({
                "id": normalize_equipment_id(item),
                "name": item,
            })

    # Explicit equipment is source data; preserve order, duplicates and location.
    equipment = [{"id": normalize_equipment_id(item), "name": item, "location": location, "isRearMounted": False}
                 for tag, location in (("Troopers Equipment", "TROOPERS"), ("Field Guns Equipment", "FIELD_GUNS"))
                 for item in tags.get(tag, [])]
    for item in equipment:
        allowed = FIELD_EQUIPMENT if item["location"] == "FIELD_GUNS" else TROOPER_EQUIPMENT | ARMOR_KITS.keys()
        if item["name"].lower() not in allowed:
            raise ValueError(f"Unsupported infantry equipment: {item['name']!r}")
    custom_divisor = infantry_number(tags, "InfantryArmor", 1)
    if "armordivisor" in tags:
        custom_divisor = infantry_number(tags, "armordivisor", integer=False, minimum=0)
    if custom_divisor <= 0:
        raise ValueError("Infantry armor damage divisor must be positive")
    armor_flags = [flag for flag in ("encumberingarmor", "spacesuit", "dest", "sneakcamo", "sneakir", "sneakecm") if flag in tags]
    augmentations = [line.strip() for line in tags.get("augmentation", "").splitlines() if line.strip()]
    if set(augmentations) - AUGMENTATIONS:
        raise ValueError(f"Unsupported infantry augmentations: {augmentations!r}")
    enhancements, enhancement_counts = {}, {}
    for slot in ("prostheticEnhancement1", "prostheticEnhancement2", "extraneousPair1", "extraneousPair2"):
        key = "prostheticEnhancement" if slot == "prostheticEnhancement1" and slot not in tags else slot
        if key not in tags:
            continue
        enhancement = tags[key].upper().replace("/", "_").replace(" ", "_")
        if enhancement not in PROSTHETICS:
            raise ValueError(f"Unsupported infantry {key}: {tags[key]!r}")
        enhancements[slot] = enhancement
        enhancement_counts[slot] = 2 if slot.startswith("extraneous") else infantry_number(tags, key + "Count", 1, minimum=1)
    armor_kit, damage_divisor, effective_armor_flags = infantry_armor(tags.get("armorKit"), tags.get("Troopers Equipment", []),
        custom_divisor, armor_flags, augmentations, beast_divisor, get_string(tags, "armor_name"))
    # Java applies the specialization tag after motive and TAG defaults.
    if secondary_weapon and secondary_weapon.lower() in ("infantrytag", "infantry tag", "tag (light, man-portable)"):
        implicit_specializations |= 1024
    specializations = infantry_number(tags, "specialization", implicit_specializations)

    # --- Misc ---
    mul_key = next((key for key in ("mul id:", "mulId") if key in tags), None)
    mul_id = infantry_number(tags, mul_key, minimum=-1) if mul_key else None

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
        "motiveType": motion_raw,
        "equipment": equipment,
        "customArmorDamageDivisor": custom_divisor,
        "damageDivisor": damage_divisor,
        "armorFlags": armor_flags,
        "effectiveArmorFlags": effective_armor_flags,
        "specializations": specializations,
        "augmentations": augmentations,
        "prostheticEnhancements": enhancements,
        "prostheticEnhancementCounts": enhancement_counts,
    }

    if secondary_weapon_id:
        output["secondaryWeapon"] = {
            "id": secondary_weapon_id,
            "name": secondary_weapon,
            "count": secondary_count,
        }

    if field_guns:
        output["fieldGuns"] = field_guns

    if motion_type == "BEAST":
        output["beastMount"] = motion_raw
    for tag, field in (("armor_name", "customArmorName"), ("srmMunition", "srmMunition"), ("disposableWeapon", "disposableWeapon")):
        if tag in tags:
            output[field] = tags[tag]

    if mul_id is not None:
        output["mulId"] = mul_id
    if role:
        output["role"] = role
    if source:
        output["source"] = source
    if fluff:
        output["fluff"] = fluff

    output.update(parse_quirk_fields(tags))
    output.update(mixed_chassis_fields(tags["type"]))
    errors = validate_unit(output)
    if errors:
        raise ValueError(f"Invalid infantry output: {errors}")
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
    return run_manifest_range_parity(
        manifest,
        PARITY_TARGETS,
        logger,
        target_value_field_key="field",
        min_target_key="min_squad",
        max_target_key="max_squad",
        expected_min_record_key="expected_min",
        expected_max_record_key="expected_max",
        actual_record_key="actual",
        log_label="field",
    )


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
        "specializations": unit["specializations"],
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
            converter="blk_infantry_converter",
            description="Convert BLK infantry files to MekStation JSON",
            source_default=str(Path(default_mm_data_root()) / "mekfiles" / "infantry"),
            source_help="Path to mm-data infantry directory",
            output_default=str(Path(__file__).parent.parent.parent / "public/data/units/infantry"),
            output_help="Output directory for infantry JSON files",
            type_name="infantry",
            parity_report_filename="blk-infantry-parity.json",
            run_log_filename="blk-infantry-run-log.json",
            convert_unit=convert_infantry_blk,
            build_manifest_entry=build_manifest_entry,
            run_parity_checks=run_parity_checks,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
