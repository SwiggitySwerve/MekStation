"""Aerospace source facts; see VEHICLE_QUALIFIERS_RULES.md's aerospace section."""

from __future__ import annotations

from typing import Any, Dict

from blk_aerospace_tables import ARMOR_CODE_MAP, SC_ARMOR_CODE_MAP, SC_TYPES
from blk_common import get_string, map_armor_code
from blk_unit_fields import bar_armor_fields, parse_qualifier_number, parse_source_qualifiers


def parse_aerospace_qualifiers(tags: Dict[str, Any]) -> Dict[str, Any]:
    """Preserve explicit facts without applying construction defaults."""
    result = parse_source_qualifiers(tags)
    if 'omnipodheatsinks' in tags:
        result['omniPodHeatSinks'] = parse_qualifier_number(tags, 'omnipodheatsinks', integer=True)
    return result


def parse_aerospace_armor(tags: Dict[str, Any], reads_bar_rating: bool = True) -> Dict[str, Any]:
    """Keep armor classification separate from original per-arc source codes."""
    code = parse_qualifier_number(tags, 'armor_type', integer=True) if 'armor_type' in tags else 0
    armor_map = SC_ARMOR_CODE_MAP if get_string(tags, 'UnitType') in SC_TYPES else ARMOR_CODE_MAP
    result: Dict[str, Any] = {'type': map_armor_code(code, armor_map), **bar_armor_fields(tags, code, reads_bar_rating)}
    type_by_arc = {
        tag[:-11].upper().replace(' ', '_'): parse_qualifier_number(tags, tag, integer=True)
        for tag in tags if tag.endswith('_armor_type')
    }
    if type_by_arc:
        result['typeByArc'] = type_by_arc
    return result
