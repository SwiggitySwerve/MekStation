"""Capital-ship BLK conversion lookup tables (DropShips now; JumpShip, WarShip and SpaceStation in UL-07b)."""

from __future__ import annotations

from typing import Dict

from blk_aerospace_tables import (
    LARGE_CRAFT_ARMOR_ARCS as DROPSHIP_ARMOR_ARCS,
    LARGE_CRAFT_ARMOR_CODE_MAP as CAPITAL_ARMOR_CODE_MAP,
)

DROPSHIP_UNIT_TYPES = {"Dropship", "DropShip"}

# Capital units share the small-craft naming (SmallCraft.java:78 LOCATION_NAMES) plus a Hull location.
DROPSHIP_LOCATION_MAP: Dict[str, str] = {
    "Nose Equipment": "NOSE",
    "Left Side Equipment": "LEFT_SIDE",
    "Right Side Equipment": "RIGHT_SIDE",
    "Aft Equipment": "AFT",
    "Hull Equipment": "HULL",
}

# BLKFile `designtype` (Aero.java:437-438): CIVILIAN = 0, MILITARY = 1 (the default).
DESIGN_TYPE_MAP: Dict[int, str] = {0: "CIVILIAN", 1: "MILITARY"}

DEFAULT_SOURCE_SUBDIRS = ["dropships"]

# Capital types this converter does not handle yet; UL-07b moves them into the converted set.
UNSUPPORTED_UNIT_TYPES = {"Jumpship", "JumpShip", "Warship", "WarShip", "SpaceStation"}
