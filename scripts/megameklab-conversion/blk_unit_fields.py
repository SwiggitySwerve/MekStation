"""Shared field extraction helpers for BLK unit converters."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from blk_common import get_string, normalize_equipment_id, parse_number, map_armor_code, BLK_ARMOR_CODE_MAP, validate_blk_tech_type
from enum_mappings import map_chassis_tech_base
from enum_mapping_tables import CLAN_TECH_LEVELS
from blk_vehicle_tables import BAR_ARMOR_CODES
from weapon_quirks import append_weapon_quirk

STANDARD_FLUFF_FIELDS = (
    "overview",
    "capabilities",
    "deployment",
    "history",
    "manufacturer",
    "primaryFactory",
)


def mixed_chassis_fields(tech_type: str, tags: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Project a validated BLK header through the shared Mixed chassis decoder.

    BLK_TECH_TYPES owns accepted rules-level suffixes; the existing MTF decoder
    owns the chassis qualifier and tech-base mapping. BA uses clanChassis instead.
    Given the unit's tags (vehicles and fighters), the armor side is added too.
    """
    header = validate_blk_tech_type(tech_type).partition(')')[0] + ')'
    chassis = map_chassis_tech_base(header)
    if not chassis:
        return {}
    sides = {'chassis': chassis}
    armor = mixed_armor_side(tags, chassis) if tags is not None else None
    if armor:
        sides['armor'] = armor
    return {'componentTechBases': sides}


# Pinned loaders that read the armor level through loadSVArmor (BLKFile.java:505-524): armor_tech_level only.
_SV_ARMOR_LOADERS = frozenset({'SupportTank', 'LargeSupportTank', 'SupportVTOL', 'FixedWingSupport'})


def mixed_armor_side(tags: Dict[str, Any], chassis: str) -> Optional[str]:
    """Armor side of a Mixed BLK unit, as the pinned loaders weigh it (MegaMek 48fcb2f64).

    The level comes from armor_tech_level, else the legacy armor_tech, else the unit's own level, which is
    the chassis side (BLKFile.setArmorTechLevelFromDataFile:1951-1958; BLKTankFile:283-304). Support
    vehicles read only armor_tech_level (BLKFile.loadSVArmor:505-524). ArmorType.forEntity:96-101 then picks
    the Clan type when TechConstants.isClan holds (CLAN_TECH_LEVELS). Patchwork armor has one level per
    location, so it has no single side and none is emitted.
    """
    if 'armor_type' in tags and parse_qualifier_number(tags, 'armor_type', integer=True) == 7:
        return None
    keys = ('armor_tech_level',) if get_string(tags, 'UnitType') in _SV_ARMOR_LOADERS else ('armor_tech_level', 'armor_tech')
    key = next((k for k in keys if k in tags), None)
    if key is None:
        return chassis
    return 'CLAN' if parse_qualifier_number(tags, key, integer=True) in CLAN_TECH_LEVELS else 'INNER_SPHERE'


# Engine side of an untagged Mixed unit, by pinned loader. These read clan_engine and otherwise take the
# chassis side: BLKTankFile:144-151 (Tank, VTOL via BLKVTOLFile:94-102), BLKAeroSpaceFighterFile:115-123,
# BLKConvFighterFile:106-114. BLKLargeSupportTankFile:98-101 always takes the chassis side. The support and
# small-craft loaders never set Engine.CLAN_ENGINE (BLKSupportTankFile:99, BLKSupportVTOLFile:99,
# BLKFixedWingSupportFile:100, BLKSmallCraftFile).
_ENGINE_CHASSIS_SIDE_LOADERS = frozenset({'Tank', 'VTOL', 'AeroSpaceFighter', 'Aero', 'ConvFighter', 'LargeSupportTank'})
_ENGINE_NEVER_CLAN_LOADERS = frozenset({'SupportTank', 'SupportVTOL', 'FixedWingSupport', 'SmallCraft'})


def untagged_mixed_clan_engine(tags: Dict[str, Any]) -> Optional[bool]:
    """Resolved engine side of a Mixed unit without a clan_engine tag; None for a non-Mixed unit."""
    tech_type = get_string(tags, 'type', 'Type')
    chassis = map_chassis_tech_base(validate_blk_tech_type(tech_type).partition(')')[0] + ')') if tech_type else None
    if chassis is None:
        return None
    unit_type = get_string(tags, 'UnitType')
    if unit_type is None:
        return None  # no loader is known, so no engine side is stated
    if unit_type in _ENGINE_CHASSIS_SIDE_LOADERS:
        return chassis == 'CLAN'
    if unit_type in _ENGINE_NEVER_CLAN_LOADERS:
        return False
    raise ValueError(f'No pinned engine-side rule for Mixed BLK UnitType {unit_type!r}')


def parse_mul_id(tags: Dict[str, Any]) -> Optional[int]:
    raw = get_string(tags, "mul id:", "mulId")
    parsed = parse_number(raw) if raw else None
    return int(parsed) if parsed is not None else None


def parse_quirks(tags: Dict[str, Any]) -> List[str]:
    raw = get_string(tags, "quirks")
    return [q.strip() for q in raw.splitlines() if q.strip()] if raw else []


def parse_quirk_fields(tags: Dict[str, Any]) -> Dict[str, Any]:
    """BLKFile.java:218-230: retain both unit and mounted weapon metadata."""
    fields: Dict[str, Any] = {}
    quirks = parse_quirks(tags)
    if quirks:
        fields['quirks'] = quirks
    weapon_quirks: Dict[str, List[str]] = {}
    raw = get_string(tags, 'weaponQuirks')
    for entry in raw.splitlines() if raw else []:
        if entry.strip():
            append_weapon_quirk(weapon_quirks, entry)
    if weapon_quirks:
        fields['weaponQuirks'] = weapon_quirks
    return fields


def parse_fluff(tags: Dict[str, Any], *, include_system_manufacturers: bool = False) -> Dict[str, Any]:
    fluff: Dict[str, Any] = {}
    for field in STANDARD_FLUFF_FIELDS:
        value = get_string(tags, field)
        if value:
            fluff[field] = value

    if include_system_manufacturers:
        raw = get_string(tags, "systemManufacturers")
        system_manufacturers: Dict[str, str] = {}
        for line in raw.splitlines() if raw else []:
            if ":" in line:
                key, _, value = line.partition(":")
                system_manufacturers[key.strip()] = value.strip()
        if system_manufacturers:
            fluff["systemManufacturer"] = system_manufacturers
    return fluff


def parse_location_equipment(
    tags: Dict[str, Any],
    location_map: Dict[str, str],
) -> List[Dict[str, str]]:
    equipment: List[Dict[str, str]] = []
    for blk_tag, location in location_map.items():
        items = tags.get(blk_tag) or []
        if isinstance(items, str):
            items = [line.strip() for line in items.splitlines() if line.strip()]
        for item in items:
            if item:
                equipment.append({
                    "id": normalize_equipment_id(item),
                    "name": item,
                    "location": location,
                })
    return equipment


def parse_source_qualifiers(tags: Dict[str, Any]) -> Dict[str, Any]:
    """Shared explicit Omni, engine-tech and transporter source facts."""
    result: Dict[str, Any] = {}
    if 'omni' in tags:
        result['isOmni'] = True

    if 'clan_engine' in tags:
        raw = str(tags['clan_engine']).strip().lower()
        if raw not in ('true', 'false'):
            raise ValueError(f'Invalid BLK clan_engine: {tags["clan_engine"]!r}')
        result['clanEngine'] = raw == 'true'
    else:
        resolved = untagged_mixed_clan_engine(tags)
        if resolved is not None:
            result['clanEngine'] = resolved

    if 'transporters' in tags:
        result['transporters'] = [
            line.strip() for line in str(tags['transporters']).splitlines() if line.strip()
        ]
    return result


def bar_armor_fields(
    tags: Dict[str, Any], code: Optional[float], reads_bar_rating: bool = True
) -> Dict[str, Any]:
    """The one BAR armor rule for BLK converters (vehicles and aerospace).

    EquipmentType.java:128-136: codes 43..51 are BAR armor. The rating comes only from
    an explicit positive `barrating` tag (BLKFile.java:501-513). Without one a support
    vehicle's rating stays 0 (SupportTank.java:63,80), which is no valid rating, so none
    is emitted and none is inferred from the code. `reads_bar_rating=False` is for
    loaders that never read the tag.
    """
    # loadSVArmor reads an explicit rating independently of armor_type.
    fields: Dict[str, Any] = {"type": "BAR"} if code in BAR_ARMOR_CODES else {}
    rating = parse_number(get_string(tags, "barrating")) if reads_bar_rating else None
    if rating and rating > 0:
        fields["barRating"] = int(rating)
    return fields


def parse_qualifier_number(tags: Dict[str, Any], tag: str, *, integer: bool = False) -> float:
    """Parse a finite explicit numeric fact; do not default malformed tags."""
    try:
        value = float(tags[tag])
    except (TypeError, ValueError) as exc:
        raise ValueError(f'Invalid BLK {tag}: {tags[tag]!r}') from exc
    if not math.isfinite(value) or (integer and not value.is_integer()):
        raise ValueError(f'Invalid BLK {tag}: {tags[tag]!r}')
    return int(value) if integer else value


def vehicle_patchwork_armor_fields(tags: Dict[str, Any], locations: Dict[str, int], support: bool) -> Dict[str, Any]:
    """BLKTankFile.setupArmorTypeAndTechLevel / BLKFile.loadSVArmor facts."""
    types, bars = {}, {}
    for location in locations:
        name = location.replace('_', ' ').title()
        if 'TURRET_2' in locations and location in ('TURRET', 'TURRET_2'):
            name = 'Rear Turret' if location == 'TURRET' else 'Front Turret'
        if support and f'{name}_barrating' in tags:
            rating = parse_qualifier_number(tags, f'{name}_barrating', integer=True)
            if not 2 <= rating <= 10:
                raise ValueError(f'Invalid patchwork BAR: {rating}')
            types[location], bars[location] = BAR_ARMOR_CODES[rating - 2], rating
        else:
            type_tag = f'{name}_armor_type'
            # BLKTankFile.java:306-307 requires a type for every installed location.
            if type_tag not in tags:
                raise ValueError(f'Missing patchwork armor type for {name}: <{type_tag}>')
            code = parse_qualifier_number(tags, type_tag, integer=True)
            map_armor_code(code, BLK_ARMOR_CODE_MAP)
            types[location] = code
            if support:
                bars[location] = 10
    return {'typeByLocation': types, **({'barRatingByLocation': bars} if bars else {})}
