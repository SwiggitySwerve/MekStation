"""Shared field extraction helpers for BLK unit converters."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from blk_common import get_string, normalize_equipment_id, parse_number

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
