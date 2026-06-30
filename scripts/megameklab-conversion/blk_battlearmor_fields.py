"""Battle Armor field parsing helpers for BLK conversion."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from blk_common import normalize_equipment_id

BA_LOCATION_SUFFIX_MAP: Dict[str, str] = {
    ":RA": "RIGHT_ARM",
    ":LA": "LEFT_ARM",
    ":Body": "BODY",
    ":BODY": "BODY",
    ":Torso": "TORSO",
    ":TORSO": "TORSO",
    ":Legs": "LEGS",
    ":LEGS": "LEGS",
    ":Head": "HEAD",
    ":HEAD": "HEAD",
}

MANIPULATOR_KEYWORDS = {
    "BABattleClaw", "BattleClaw", "BABasicManipulator", "BasicManipulator",
    "BAArmoredGlove", "ArmoredGlove", "BAHeavyManipulator", "HeavyManipulator",
    "BAIndustrialDrill", "IndustrialDrill", "BACargoLifter", "CargoLifter",
    "BASalvageArm", "SalvageArm",
}

AP_MOUNT_KEYWORDS = {"BAAPMount", "APMount"}
MWM_KEYWORDS = {"BAMWM", "MWM", "ModularWeaponMount"}


def parse_point_equipment(items: List[str]) -> Tuple[List[Dict[str, str]], List[str], bool, bool]:
    equipment: List[Dict[str, str]] = []
    abilities: List[str] = []
    has_ap_mount = False
    has_mwm = False

    for line in items:
        if not line.strip():
            continue

        location = "BODY"
        parts = line.split(":")
        item_id = parts[0].strip()
        for part in parts[1:]:
            mapped = BA_LOCATION_SUFFIX_MAP.get(":" + part.strip())
            if mapped:
                location = mapped
                break

        if item_id in AP_MOUNT_KEYWORDS:
            has_ap_mount = True
            continue
        if item_id in MWM_KEYWORDS:
            has_mwm = True
            continue
        if item_id in MANIPULATOR_KEYWORDS:
            equipment.append({
                "id": normalize_equipment_id(item_id),
                "name": item_id,
                "location": location,
                "type": "MANIPULATOR",
            })
            continue
        if item_id in ("SwarmMek", "SwarmWeaponMek", "StopSwarm", "LegAttack", "SwarmInfantry"):
            abilities.append(item_id)
            continue
        if item_id:
            equipment.append({
                "id": normalize_equipment_id(item_id),
                "name": item_id,
                "location": location,
            })

    return equipment, abilities, has_ap_mount, has_mwm


def extract_manipulators(equipment: List[Dict[str, str]]) -> Dict[str, Optional[str]]:
    manipulators: Dict[str, Optional[str]] = {"RIGHT_ARM": None, "LEFT_ARM": None}
    for item in equipment:
        if item.get("type") == "MANIPULATOR":
            loc = item.get("location", "")
            if loc in manipulators:
                manipulators[loc] = item["name"]
    return manipulators
