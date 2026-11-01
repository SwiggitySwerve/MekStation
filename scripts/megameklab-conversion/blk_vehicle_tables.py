"""Vehicle BLK conversion lookup tables."""

from __future__ import annotations

from typing import Dict, Optional

VEHICLE_UNIT_TYPES = {
    "Tank", "VTOL", "SupportTank", "LargeSupportTank", "SupportVTOL", "Naval",
    "Hover", "Wheeled", "Tracked", "Hydrofoil", "Submarine", "WiGE",
}

UNSUPPORTED_UNIT_TYPES = {
    "Warship", "WarShip", "Dropship", "DropShip", "JumpShip", "Jumpship",
    "SpaceStation", "LAM", "QuadVee", "MobileStructure",
}

# Mirrors BlkFormat.ts and blkVehicleArmorLayout.ts; see VEHICLE_LOCATIONS_RULES.md.
VEHICLE_ARMOR_LOCATIONS = ["FRONT", "RIGHT", "LEFT", "REAR", "TURRET", "TURRET_2"]
SUPERHEAVY_ARMOR_LOCATIONS = [
    "FRONT", "FRONT_RIGHT", "FRONT_LEFT", "REAR_RIGHT", "REAR_LEFT", "REAR", "TURRET", "TURRET_2",
]
VTOL_ARMOR_LOCATIONS = ["FRONT", "RIGHT", "LEFT", "REAR", "ROTOR", "TURRET"]
SUPERHEAVY_ABOVE_TONS = {
    "hover": 50, "wheeled": 80, "wige": 80, "glider": 80,
    "tracked": 100, "naval": 300, "submarine": 300,
}


def resolve_vehicle_armor(unit_type: str, motion: Optional[str], tonnage: float, armor: list[int]) -> Dict[str, int]:
    """Python mirror of resolveBlkVehicleArmor; never infer a layout from length."""
    limit = SUPERHEAVY_ABOVE_TONS.get((motion or "").lower())
    if unit_type in ("VTOL", "SupportVTOL"):
        locations, minimum = VTOL_ARMOR_LOCATIONS, 5
    elif unit_type == "LargeSupportTank" or (
        unit_type in ("Tank", "Naval") and limit is not None and tonnage > limit
    ):
        locations, minimum = SUPERHEAVY_ARMOR_LOCATIONS, 6
    elif unit_type in ("Tank", "Naval", "SupportTank"):
        locations, minimum = VEHICLE_ARMOR_LOCATIONS, 4
    else:
        raise ValueError(f"Unsupported BLK vehicle armor layout: {unit_type}")
    if not minimum <= len(armor) <= len(locations):
        raise ValueError(f"Incorrect armor array length for {unit_type}: {len(armor)} (expected {minimum}..{len(locations)})")
    return dict(zip(locations, armor))

VEHICLE_LOCATION_MAP: Dict[str, str] = {
    "Front Equipment": "FRONT",
    "Right Equipment": "RIGHT",
    "Left Equipment": "LEFT",
    "Rear Equipment": "REAR",
    "Turret Equipment": "TURRET",
    "Body Equipment": "BODY",
    "Secondary Turret Equipment": "TURRET_2",
    "Front Turret Equipment": "TURRET_2",
    "Rear Turret Equipment": "TURRET",
    "Front Right Equipment": "FRONT_RIGHT",
    "Front Left Equipment": "FRONT_LEFT",
    "Rear Right Equipment": "REAR_RIGHT",
    "Rear Left Equipment": "REAR_LEFT",
    "Rotor Equipment": "ROTOR",
    "Sponson Turret Equipment": "SPONSON",
}

MOTION_TYPE_MAP: Dict[str, str] = {
    "Tracked": "Tracked",
    "Wheeled": "Wheeled",
    "Hover": "Hover",
    "VTOL": "VTOL",
    "Naval": "Naval",
    "Hydrofoil": "Hydrofoil",
    "Submarine": "Submarine",
    "WiGE": "WiGE",
    "Rail": "Rail",
    "Maglev": "Maglev",
    "Leg": "Tracked",
    "Jump": "VTOL",
}

ARMOR_CODE_MAP: Dict[int, str] = {
    0: "STANDARD",
    1: "FERRO_FIBROUS",
    2: "REACTIVE",
    3: "REFLECTIVE",
    4: "HARDENED",
    5: "LIGHT_FERRO_FIBROUS",
    6: "HEAVY_FERRO_FIBROUS",
    7: "PATCHWORK",
    8: "STEALTH",
    31: "COMMERCIAL",
    32: "INDUSTRIAL",
    33: "HEAVY_INDUSTRIAL",
    34: "FERRO_FIBROUS_CLAN",
    35: "REFLECTIVE_CLAN",
    36: "REACTIVE_CLAN",
    37: "FERRO_LAMELLOR",
    38: "ANTI_PENETRATIVE_ABLATION",
    39: "PRIMITIVE",
    40: "IMPACT_RESISTANT",
}
