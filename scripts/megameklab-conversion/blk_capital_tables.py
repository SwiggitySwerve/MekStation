"""Capital-ship BLK conversion tables, pinned to MegaMek 48fcb2f6 loaders."""

from __future__ import annotations

from typing import Dict

DROPSHIP_UNIT_TYPES = {"Dropship", "DropShip"}
CAPITAL_UNIT_TYPES = {
    **dict.fromkeys(DROPSHIP_UNIT_TYPES, "DropShip"),
    "Jumpship": "JumpShip", "JumpShip": "JumpShip",
    "Warship": "WarShip", "WarShip": "WarShip", "SpaceStation": "Space Station",
}

# Capital units share the small-craft naming (SmallCraft.java:78 LOCATION_NAMES) plus a Hull location.
DROPSHIP_LOCATION_MAP: Dict[str, str] = {
    "Nose Equipment": "NOSE",
    "Left Side Equipment": "LEFT_SIDE",
    "Right Side Equipment": "RIGHT_SIDE",
    "Aft Equipment": "AFT",
    "Hull Equipment": "HULL",
}

# BLKDropshipFile.java:132-136: armor[NOSE=0] nose, armor[RW=1] right, armor[LW=2] left, armor[AFT=3] aft.
# Order matters: the aerospace and small-craft converters list the wings left first.
DROPSHIP_ARMOR_ARCS = ["NOSE", "RIGHT_SIDE", "LEFT_SIDE", "AFT"]

# Jumpship.java LOCATION_NAMES: all three larger classes load these six armor entries.
# Warship broadsides (indexes 7/8) and Hull (6) receive ARMOR_NA, never source armor.
JUMPSHIP_ARMOR_ARCS = ["NOSE", "FRONT_LEFT_SIDE", "FRONT_RIGHT_SIDE", "AFT", "AFT_LEFT_SIDE", "AFT_RIGHT_SIDE"]
JUMPSHIP_LOCATION_MAP = dict(zip(
    [f"{name} Equipment" for name in ("Nose", "Left Front Side", "Right Front Side", "Aft", "Aft Left Side", "Aft Right Side", "Hull")],
    [*JUMPSHIP_ARMOR_ARCS, "HULL"],
))
JUMPSHIP_LOCATION_ALIASES = {"Front Right Side Equipment": "FRONT_RIGHT_SIDE", "Front Left Side Equipment": "FRONT_LEFT_SIDE"}
WARSHIP_BROADSIDES = {"Left Broadsides Equipment": "LEFT_BROADSIDE", "Right Broadsides Equipment": "RIGHT_BROADSIDE"}
WARSHIP_BROADSIDE_ALIASES = {"Right Broadside Equipment": "RIGHT_BROADSIDE", "Left Broadside Equipment": "LEFT_BROADSIDE"}

# EquipmentType.java:104-105,125-126 (T_ARMOR_ALUM, T_ARMOR_HEAVY_ALUM, T_ARMOR_PRIMITIVE_AERO,
# T_ARMOR_AEROSPACE). BLKDropshipFile.java:120-125 rewrites the legacy standard code 0 to aerospace.
CAPITAL_ARMOR_CODE_MAP: Dict[int, str] = {
    0: "AEROSPACE",
    11: "FERRO_CARBIDE",
    12: "LAMELLOR_FERRO_CARBIDE",
    13: "IMPROVED_FERRO_ALUMINUM",
    19: "FERRO_ALUMINUM",
    20: "HEAVY_FERRO_ALUMINUM",
    40: "PRIMITIVE_AERO",
    41: "AEROSPACE",
}

# BLKFile `designtype` (Aero.java:437-438): CIVILIAN = 0, MILITARY = 1 (the default).
DESIGN_TYPE_MAP: Dict[int, str] = {0: "CIVILIAN", 1: "MILITARY"}

DEFAULT_SOURCE_SUBDIRS = ["dropships", "jumpships", "warship", "spacestation"]

UNSUPPORTED_UNIT_TYPES = set()
