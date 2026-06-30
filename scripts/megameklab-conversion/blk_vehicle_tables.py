"""Vehicle BLK conversion lookup tables."""

from __future__ import annotations

from typing import Dict

VEHICLE_UNIT_TYPES = {
    "Tank", "VTOL", "SupportTank", "SupportVTOL", "Naval",
    "Hover", "Wheeled", "Tracked", "Hydrofoil", "Submarine", "WiGE",
}

UNSUPPORTED_UNIT_TYPES = {
    "Warship", "WarShip", "Dropship", "DropShip", "JumpShip", "Jumpship",
    "SpaceStation", "LAM", "QuadVee", "MobileStructure",
}

VEHICLE_ARMOR_LOCATIONS = ["FRONT", "RIGHT", "LEFT", "REAR", "TURRET"]

VEHICLE_LOCATION_MAP: Dict[str, str] = {
    "Front Equipment": "FRONT",
    "Right Equipment": "RIGHT",
    "Left Equipment": "LEFT",
    "Rear Equipment": "REAR",
    "Turret Equipment": "TURRET",
    "Body Equipment": "BODY",
    "Secondary Turret Equipment": "TURRET_2",
    "Front Turret Equipment": "TURRET",
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

ENGINE_CODE_EXT: Dict[str, str] = {
    "6": "ICE",
    "7": "FUEL_CELL",
    "8": "FISSION",
    "9": "SOLAR",
    "10": "BATTERY",
    "11": "FLYWHEEL",
    "12": "STEAM",
    "13": "MAGLEV",
    "14": "NONE",
    "15": "EXTERNAL",
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
    41: "BAR_2",
    42: "BAR_3",
    43: "BAR_4",
    44: "BAR_5",
    45: "BAR_6",
    46: "BAR_7",
    47: "BAR_8",
    48: "BAR_9",
    49: "BAR_10",
}
