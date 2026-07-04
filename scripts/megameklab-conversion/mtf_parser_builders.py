"""Builder helpers for mtf_parser.py."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set, Tuple

from enum_mappings import map_mech_location, normalize_equipment_id
from mtf_serialized_models import SerializedEquipment

CRITICAL_MOUNTED_EQUIPMENT_IDS = {
    'chaff pod': 'chaffpod',
    'chaffpod': 'chaffpod',
    'is chaff pod': 'chaffpod',
    'ischaffpod': 'chaffpod',
}

def build_armor_allocation(raw_allocation: Dict[str, int]) -> Dict[str, Any]:
    """Build armor allocation with proper location names and front/rear handling."""
    allocation: Dict[str, Any] = {}

    # Location mapping
    loc_map = {
        'LA': 'LEFT_ARM',
        'RA': 'RIGHT_ARM',
        'LT': 'LEFT_TORSO',
        'RT': 'RIGHT_TORSO',
        'CT': 'CENTER_TORSO',
        'HD': 'HEAD',
        'LL': 'LEFT_LEG',
        'RL': 'RIGHT_LEG',
        'RTL': 'LEFT_TORSO_REAR',
        'RTR': 'RIGHT_TORSO_REAR',
        'RTC': 'CENTER_TORSO_REAR',
    }

    # First pass: collect front armor
    for key, value in raw_allocation.items():
        mapped_loc = loc_map.get(key, key)
        if 'REAR' not in mapped_loc:
            allocation[mapped_loc] = value

    # Second pass: merge rear armor into torso locations
    for key, value in raw_allocation.items():
        mapped_loc = loc_map.get(key, key)
        if 'REAR' in mapped_loc:
            # Get the front location name
            front_loc = mapped_loc.replace('_REAR', '')
            if front_loc in allocation:
                # Convert to front/rear object
                front_value = allocation[front_loc]
                if isinstance(front_value, int):
                    allocation[front_loc] = {
                        'front': front_value,
                        'rear': value
                    }

    return allocation

def _clean_rear_mount_suffix(name: str) -> str:
    return re.sub(r'\s*\((?:r|rear)\)\s*', ' ', name, flags=re.IGNORECASE).strip()

def _clean_critical_equipment_name(name: str) -> str:
    return re.sub(r'\s*\((?:omnipod|armored)\)\s*', ' ', name, flags=re.IGNORECASE).strip()

def _canonical_seen_id(equip_id: str) -> str:
    compact = re.sub(r'^\d+-', '', equip_id).replace('-', '')
    aliases = {
        'ischaffpod': 'chaffpod',
    }
    return aliases.get(compact, compact)

def _seen_key(equip_id: str, location: str, is_rear: bool) -> Tuple[str, str, bool]:
    return (_canonical_seen_id(equip_id), location, is_rear)

def _mounted_equipment_from_critical(item: str) -> Optional[str]:
    clean = _clean_critical_equipment_name(item)
    lower = clean.lower()
    compact = lower.replace(' ', '')
    return CRITICAL_MOUNTED_EQUIPMENT_IDS.get(lower) or CRITICAL_MOUNTED_EQUIPMENT_IDS.get(compact)

def build_equipment_list(
    weapons: List[Dict[str, str]],
    criticals: Optional[Dict[str, List[str]]] = None,
) -> List[SerializedEquipment]:
    """Build equipment list from weapons data and selected critical-only equipment."""
    equipment: List[SerializedEquipment] = []
    seen: Set[Tuple[str, str, bool]] = set()

    for weapon in weapons:
        name = weapon.get('name', '')
        location = weapon.get('location', '')

        # Check for rear-mounted
        is_rear = '(r)' in name.lower() or '(rear)' in name.lower()
        clean_name = _clean_rear_mount_suffix(name)

        # Generate equipment ID
        equip_id = normalize_equipment_id(clean_name)

        # Map location
        mapped_location = map_mech_location(location)
        seen.add(_seen_key(equip_id, mapped_location, is_rear))

        equipment.append(SerializedEquipment(
            id=equip_id,
            location=mapped_location,
            isRearMounted=is_rear if is_rear else None
        ))

    for location, items in (criticals or {}).items():
        mapped_location = map_mech_location(location)
        for item in items:
            if not item or item == '-Empty-':
                continue
            for sub_item in item.split('|'):
                equip_id = _mounted_equipment_from_critical(sub_item)
                if not equip_id:
                    continue
                key = _seen_key(equip_id, mapped_location, False)
                if key in seen:
                    continue
                seen.add(key)
                equipment.append(SerializedEquipment(
                    id=equip_id,
                    location=mapped_location,
                ))

    return equipment

def build_critical_slots(criticals: Dict[str, List[str]]) -> Dict[str, List[Optional[str]]]:
    """Build critical slots dictionary with proper slot counts per location."""
    slots: Dict[str, List[Optional[str]]] = {}

    # BattleTech critical slot counts per location
    # Head: 6 slots, Legs: 6 slots each, Arms and Torsos: 12 slots each
    slot_counts = {
        'HEAD': 6,
        'CENTER_TORSO': 12,
        'LEFT_TORSO': 12,
        'RIGHT_TORSO': 12,
        'LEFT_ARM': 12,
        'RIGHT_ARM': 12,
        'LEFT_LEG': 6,
        'RIGHT_LEG': 6,
        # Quad mech legs
        'FRONT_LEFT_LEG': 6,
        'FRONT_RIGHT_LEG': 6,
        'REAR_LEFT_LEG': 6,
        'REAR_RIGHT_LEG': 6,
    }

    for location, items in criticals.items():
        mapped_location = map_mech_location(location)
        max_slots = slot_counts.get(mapped_location, 12)

        slot_list: List[Optional[str]] = []

        for item in items:
            if item == '-Empty-' or not item:
                slot_list.append(None)
            else:
                slot_list.append(item)

        # Normalize to correct slot count
        if len(slot_list) > max_slots:
            # Trim excess slots (usually trailing nulls from MTF format)
            slot_list = slot_list[:max_slots]
        elif len(slot_list) < max_slots:
            # Pad with nulls if needed
            slot_list.extend([None] * (max_slots - len(slot_list)))

        slots[mapped_location] = slot_list

    return slots
