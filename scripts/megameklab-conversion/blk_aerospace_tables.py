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

AERO_ARMOR_ARCS = ["NOSE", "LEFT_WING", "RIGHT_WING", "AFT"]
SC_ARMOR_ARCS = ["NOSE", "LEFT_SIDE", "RIGHT_SIDE", "AFT"]

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

ARMOR_CODE_MAP: Dict[int, str] = {
    0: "STANDARD", 1: "FERRO_FIBROUS", 2: "REACTIVE", 3: "REFLECTIVE",
    4: "HARDENED", 5: "LIGHT_FERRO_FIBROUS", 6: "HEAVY_FERRO_FIBROUS",
    8: "STEALTH", 31: "COMMERCIAL", 32: "INDUSTRIAL", 33: "HEAVY_INDUSTRIAL",
    34: "FERRO_FIBROUS_CLAN", 39: "PRIMITIVE", 40: "IMPACT_RESISTANT",
    41: "BAR_2", 42: "BAR_3", 43: "BAR_4", 44: "BAR_5",
}

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
    "Aerodyne": "AERODYNE",
    "Spheroid": "SPHEROID",
}

DEFAULT_SOURCE_SUBDIRS = ["fighters", "convfighter", "smallcraft"]
