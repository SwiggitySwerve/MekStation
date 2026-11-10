"""Shared field extraction helpers for BLK unit converters."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from blk_common import get_string, normalize_equipment_id, parse_number, map_armor_code, BLK_ARMOR_CODE_MAP
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
