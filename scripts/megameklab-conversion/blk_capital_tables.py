"""Capital-ship BLK conversion lookup tables (DropShips now; JumpShip, WarShip and SpaceStation in UL-07b)."""

from __future__ import annotations

from typing import Dict

DROPSHIP_UNIT_TYPES = {"Dropship", "DropShip"}

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

# EquipmentType.java:104-105,125-126 (T_ARMOR_ALUM, T_ARMOR_HEAVY_ALUM, T_ARMOR_PRIMITIVE_AERO,
# T_ARMOR_AEROSPACE). BLKDropshipFile.java:120-125 rewrites the legacy standard code 0 to aerospace.
CAPITAL_ARMOR_CODE_MAP: Dict[int, str] = {
    0: "AEROSPACE",
    19: "FERRO_ALUMINUM",
    20: "HEAVY_FERRO_ALUMINUM",
    40: "PRIMITIVE_AERO",
    41: "AEROSPACE",
}

# BLKFile `designtype` (Aero.java:437-438): CIVILIAN = 0, MILITARY = 1 (the default).
DESIGN_TYPE_MAP: Dict[int, str] = {0: "CIVILIAN", 1: "MILITARY"}

DEFAULT_SOURCE_SUBDIRS = ["dropships"]

# Capital types this converter does not handle yet; UL-07b moves them into the converted set.
UNSUPPORTED_UNIT_TYPES = {"Jumpship", "JumpShip", "Warship", "WarShip", "SpaceStation"}
