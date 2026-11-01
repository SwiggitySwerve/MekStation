"""Aerospace BLK conversion lookup tables."""

from __future__ import annotations

from typing import Dict

AEROSPACE_UNIT_TYPES = {
    "Aero", "AeroSpaceFighter",
    "ConvFighter", "FixedWingSupport",
    "SmallCraft",
}

UNSUPPORTED_UNIT_TYPES = {
    "Dropship", "DropShip", "Jumpship", "JumpShip", "Warship", "WarShip",
    "SpaceStation", "Tank", "VTOL", "BattleArmor", "Infantry", "ProtoMech",
}

ASF_TYPES = {"Aero", "AeroSpaceFighter"}
CF_TYPES = {"ConvFighter", "FixedWingSupport"}
SC_TYPES = {"SmallCraft"}

# BLKAeroSpaceFighterFile.java:63-66,186-189; ConvFighter and FixedWingSupport
# use the same BLK indices, distinct from Aero's runtime location indices.
AERO_ARMOR_ARCS = ["NOSE", "RIGHT_WING", "LEFT_WING", "AFT"]

# BLKDropshipFile.java:196-199 uses the same BLK order as small craft.
LARGE_CRAFT_ARMOR_ARCS = ["NOSE", "RIGHT_SIDE", "LEFT_SIDE", "AFT"]
SC_ARMOR_ARCS = LARGE_CRAFT_ARMOR_ARCS

# EquipmentType.java:104-105,125-126. Large-craft loaders normalize legacy
# standard armor (0) to aerospace; fighter loaders keep standard armor.
LARGE_CRAFT_ARMOR_CODE_MAP: Dict[int, str] = {
    0: "AEROSPACE",
    19: "FERRO_ALUMINUM",
    20: "HEAVY_FERRO_ALUMINUM",
    40: "PRIMITIVE_AERO",
    41: "AEROSPACE",
}

AERO_LOCATION_MAP: Dict[str, str] = {
    "Nose Equipment": "NOSE",
    "Left Wing Equipment": "LEFT_WING",
    "Right Wing Equipment": "RIGHT_WING",
    "Aft Equipment": "AFT",
    "Wings Equipment": "WINGS",
    "Fuselage Equipment": "FUSELAGE",
    "Body Equipment": "FUSELAGE",
    "Front Equipment": "NOSE",
    "Left Equipment": "LEFT_WING",
    "Right Equipment": "RIGHT_WING",
    "Rear Equipment": "AFT",
}

SC_LOCATION_MAP: Dict[str, str] = {
    "Nose Equipment": "NOSE",
    "Left Side Equipment": "LEFT_SIDE",
    "Right Side Equipment": "RIGHT_SIDE",
    "Left Wing Equipment": "LEFT_SIDE",
    "Right Wing Equipment": "RIGHT_SIDE",
    "Aft Equipment": "AFT",
    "Fuselage Equipment": "FUSELAGE",
    "Body Equipment": "FUSELAGE",
}

# EquipmentType.java:85-126 at 48fcb2f6, using armor names present in the schema.
# Prototype/light ferro-aluminum (27/21) have no schema name; keep the existing
# unknown-code fallback rather than misclassifying them as production armor.
ARMOR_CODE_MAP: Dict[int, str] = {
    **LARGE_CRAFT_ARMOR_CODE_MAP,
    0: "STANDARD", 1: "FERRO_FIBROUS", 2: "REACTIVE", 3: "REFLECTIVE",
    4: "HARDENED", 5: "LIGHT_FERRO_FIBROUS", 6: "HEAVY_FERRO_FIBROUS",
    7: "PATCHWORK",
    # Both native stealth codes share the contract's STEALTH identity.
    8: "STEALTH", 10: "COMMERCIAL", 14: "INDUSTRIAL", 15: "HEAVY_INDUSTRIAL",
    16: "FERRO_LAMELLOR", 17: "PRIMITIVE", 22: "STEALTH",
    25: "IMPACT_RESISTANT", 39: "PRIMITIVE",
}

# BLKSmallCraftFile.java:154-161 also normalizes missing/zero codes to aerospace.
SC_ARMOR_CODE_MAP: Dict[int, str] = {**ARMOR_CODE_MAP, **LARGE_CRAFT_ARMOR_CODE_MAP}

COCKPIT_CODE_MAP: Dict[int, str] = {
    0: "STANDARD",
    1: "SMALL",
    2: "COMMAND_CONSOLE",
    3: "PRIMITIVE",
    4: "STANDARD_AERO",
    5: "PRIMITIVE_AERO",
    6: "CLAN",
}

MOTION_MAP: Dict[str, str] = {
    "aerodyne": "AERODYNE",
    "spheroid": "SPHEROID",
}


def map_aerospace_motion(raw: str) -> str:
    """BLK small/capital craft recognize spheroid without case sensitivity."""
    return MOTION_MAP.get(raw.casefold(), "AERODYNE")


DEFAULT_SOURCE_SUBDIRS = ["fighters", "convfighter", "smallcraft"]
