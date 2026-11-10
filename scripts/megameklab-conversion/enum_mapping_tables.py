"""Lookup tables for enum_mappings.py."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

TECH_BASE_MAP: Dict[str, str] = {
    # Standard variations
    "Inner Sphere": "INNER_SPHERE",
    "IS": "INNER_SPHERE",
    "IS Level 1": "INNER_SPHERE",
    "IS Level 2": "INNER_SPHERE",
    "IS Level 3": "INNER_SPHERE",
    "IS Level 4": "INNER_SPHERE",
    "Clan": "CLAN",
    "CL": "CLAN",
    "Clan Level 2": "CLAN",
    "Clan Level 3": "CLAN",
    "Mixed": "MIXED",
    "Mixed (IS Chassis)": "MIXED",
    "Mixed (Clan Chassis)": "MIXED",
    "Both": "BOTH",
    # From type tag in BLK files
    "0": "INNER_SPHERE",
    "1": "CLAN",
    "2": "MIXED",
}

# MTF source vocabulary shared with the TypeScript parser. Python keeps its
# legacy aliases below; see src/types/formats/MTF_COMPONENT_VOCABULARY.md.
MTF_COMPONENT_VOCABULARY: Dict[str, Dict[str, str]] = json.loads(
    (Path(__file__).resolve().parents[2] / 'src/types/formats/mtf-component-vocabulary.json')
    .read_text(encoding='utf-8-sig')
)

RULES_LEVEL_MAP: Dict[str, str] = {
    # One-based MTF levels: MegaMek 48fcb2f64 MtfFile.java:828-902.
    **MTF_COMPONENT_VOCABULARY["rulesLevel"],
    # Retain zero as a pre-existing compatibility alias, not an MTF source code.
    "0": "INTRODUCTORY",
    # Text rules levels
    "Introductory": "INTRODUCTORY",
    "Standard": "STANDARD",
    "Advanced": "ADVANCED",
    "Experimental": "EXPERIMENTAL",
    "Unofficial": "UNOFFICIAL",
    # IS Level variations (from type tag)
    "IS Level 1": "INTRODUCTORY",
    "IS Level 2": "STANDARD",
    "IS Level 3": "ADVANCED",
    "IS Level 4": "EXPERIMENTAL",
    # Clan Level variations
    "Clan Level 2": "STANDARD",
    "Clan Level 3": "ADVANCED",
}

ENGINE_TYPE_MAP: Dict[str, str] = {
    # Standard engines
    "Fusion Engine": "FUSION",
    "Fusion Engine(IS)": "FUSION",
    "Fusion Engine (IS)": "FUSION",
    "Fusion": "FUSION",
    "Standard Fusion": "FUSION",
    # XL Engines
    "XL Engine": "XL",
    "XL Engine(IS)": "XL",
    "XL Engine (IS)": "XL",
    "XL Fusion Engine": "XL",
    "Extra-Light Engine": "XL",
    # Clan XL
    "XL Engine(Clan)": "CLAN_XL",
    "XL Engine (Clan)": "CLAN_XL",
    "Clan XL Engine": "CLAN_XL",
    # Light Engine
    "Light Engine": "LIGHT",
    "Light Engine(IS)": "LIGHT",
    "Light Fusion Engine": "LIGHT",
    # Compact Engine
    "Compact Engine": "COMPACT",
    "Compact Fusion Engine": "COMPACT",
    # XXL Engine
    "XXL Engine": "XXL",
    "XXL Engine(IS)": "XXL",
    "XXL Engine(Clan)": "CLAN_XXL",
    # ICE Engine
    "ICE Engine": "ICE",
    "ICE": "ICE",
    "Internal Combustion Engine": "ICE",
    # Fuel Cell
    "Fuel Cell Engine": "FUEL_CELL",
    "Fuel Cell": "FUEL_CELL",
    "Fuel-Cell Engine": "FUEL_CELL",
    # Fission
    "Fission Engine": "FISSION",
    "Fission": "FISSION",
    # Legacy generic numeric aliases. BLK serialization uses BLK_ENGINE_CODE_MAP.
    "0": "FUSION",
    "1": "XL",
    "2": "LIGHT",
    "3": "COMPACT",
    "4": "CLAN_XL",
    "5": "XXL",
}

# Shared source-format facts; generic MTF aliases above deliberately remain separate.
BLK_ENGINE_CODE_MAP: Dict[str, str] = json.loads(
    (Path(__file__).resolve().parents[2] / 'src/types/formats/blk-engine-codes.json')
    .read_text(encoding='utf-8-sig')
)

GYRO_TYPE_MAP: Dict[str, str] = {
    **MTF_COMPONENT_VOCABULARY["gyro"],
    "Extra-Light Gyro": "XL",
    "Heavy-Duty Gyro": "HEAVY_DUTY",
    "Super Heavy Gyro": "SUPERHEAVY",
    # Numeric codes
    "0": "STANDARD",
    "1": "XL",
    "2": "COMPACT",
    "3": "HEAVY_DUTY",
    "4": "SUPERHEAVY",
}

COCKPIT_TYPE_MAP: Dict[str, str] = {
    **MTF_COMPONENT_VOCABULARY["cockpit"],
    "Torso Cockpit": "TORSO_MOUNTED",
    "VRRP": "VRRP",
}

STRUCTURE_TYPE_MAP: Dict[str, str] = {
    "Standard": "STANDARD",
    "IS Standard": "STANDARD",
    "Standard Structure": "STANDARD",
    "Endo Steel": "ENDO_STEEL",
    "IS Endo Steel": "ENDO_STEEL",
    "Endo-Steel": "ENDO_STEEL",
    "Clan Endo Steel": "ENDO_STEEL_CLAN",
    "Clan Endo-Steel": "ENDO_STEEL_CLAN",
    "Endo-Composite": "ENDO_COMPOSITE",
    "Endo Composite": "ENDO_COMPOSITE",
    "Reinforced": "REINFORCED",
    "Reinforced Structure": "REINFORCED",
    "Composite": "COMPOSITE",
    "Composite Structure": "COMPOSITE",
    "Industrial": "INDUSTRIAL",
    "Industrial Structure": "INDUSTRIAL",
}

ARMOR_TYPE_MAP: Dict[str, str] = {
    "Standard": "STANDARD",
    "Standard Armor": "STANDARD",
    "Standard(Inner Sphere)": "STANDARD",
    "Ferro-Fibrous": "FERRO_FIBROUS",
    "Ferro-Fibrous Armor": "FERRO_FIBROUS",
    "Ferro-Fibrous(Inner Sphere)": "FERRO_FIBROUS",
    "IS Ferro-Fibrous": "FERRO_FIBROUS",
    "Clan Ferro-Fibrous": "FERRO_FIBROUS_CLAN",
    "Ferro-Fibrous(Clan)": "FERRO_FIBROUS_CLAN",
    "Ferro-Lamellor(Clan)": "FERRO_LAMELLOR",
    "Light Ferro-Fibrous": "LIGHT_FERRO_FIBROUS",
    "Light Ferro-Fibrous Armor": "LIGHT_FERRO_FIBROUS",
    "Heavy Ferro-Fibrous": "HEAVY_FERRO_FIBROUS",
    "Heavy Ferro-Fibrous Armor": "HEAVY_FERRO_FIBROUS",
    "Stealth Armor": "STEALTH",
    "Stealth": "STEALTH",
    "Reactive Armor": "REACTIVE",
    "Reactive": "REACTIVE",
    "Reflective Armor": "REFLECTIVE",
    "Reflective": "REFLECTIVE",
    "Laser-Reflective": "REFLECTIVE",
    "Hardened Armor": "HARDENED",
    "Hardened": "HARDENED",
    "Primitive Armor": "PRIMITIVE",
    "Primitive": "PRIMITIVE",
    "Industrial Armor": "INDUSTRIAL",
    "Industrial": "INDUSTRIAL",
    "Commercial": "COMMERCIAL",
    "Commercial Armor": "COMMERCIAL",
    "Heavy Industrial": "HEAVY_INDUSTRIAL",
    "Heavy Industrial Armor": "HEAVY_INDUSTRIAL",
    "Impact-Resistant": "IMPACT_RESISTANT",
    "Impact-Resistant Armor": "IMPACT_RESISTANT",
    # MegaMek 48fcb2f64 MtfFile.java:414-483; EquipmentType.java:85-111.
    # Explicit corpus spellings keep unknown names out of substring fallbacks.
    "Anti-Penetrative Ablation(Inner Sphere)": "ANTI_PENETRATIVE_ABLATION",
    "Ballistic-Reinforced(Inner Sphere)": "BALLISTIC_REINFORCED",
    "Commercial(Inner Sphere)": "COMMERCIAL",
    "Ferro-Fibrous Prototype(Inner Sphere)": "FERRO_FIBROUS_PROTO",
    "Hardened(Clan)": "HARDENED",
    "Hardened(Inner Sphere)": "HARDENED",
    "Heat-Dissipating(Clan)": "HEAT_DISSIPATING",
    "Heat-Dissipating(Inner Sphere)": "HEAT_DISSIPATING",
    "Heavy Ferro-Fibrous(Inner Sphere)": "HEAVY_FERRO_FIBROUS",
    "Heavy Industrial(Clan)": "HEAVY_INDUSTRIAL",
    "Heavy Industrial(Inner Sphere)": "HEAVY_INDUSTRIAL",
    "Impact-Resistant(Inner Sphere)": "IMPACT_RESISTANT",
    "Industrial(Inner Sphere)": "INDUSTRIAL",
    "Light Ferro-Fibrous(Inner Sphere)": "LIGHT_FERRO_FIBROUS",
    "Patchwork": "PATCHWORK",
    "Primitive(Inner Sphere)": "PRIMITIVE",
    "Reactive(Clan)": "REACTIVE",
    "Reactive(Inner Sphere)": "REACTIVE",
    "Reflective(Clan)": "REFLECTIVE",
    "Reflective(Inner Sphere)": "REFLECTIVE",
    "Standard(Clan)": "STANDARD",
    "Stealth(Inner Sphere)": "STEALTH",
    "IS Reactive(Inner Sphere)": "REACTIVE",
    "Clan Standard(Clan)": "STANDARD",
    "IS Reflective(Inner Sphere)": "REFLECTIVE",
    "IS Heavy Industrial(Inner Sphere)": "HEAVY_INDUSTRIAL",
    "IS Hardened(Inner Sphere)": "HARDENED",
    "IS Standard(Inner Sphere)": "STANDARD",
    "IS Ferro-Fibrous(Inner Sphere)": "FERRO_FIBROUS",
    "Ballistic-Reinforced": "BALLISTIC_REINFORCED",
    "Anti-Penetrative Ablation": "ANTI_PENETRATIVE_ABLATION",
    "Heat-Dissipating": "HEAT_DISSIPATING",
    "Ferro-Fibrous Prototype": "FERRO_FIBROUS_PROTO",
}

HEAT_SINK_TYPE_MAP: Dict[str, str] = {
    **MTF_COMPONENT_VOCABULARY["heatSink"],
    # Bare "Double" takes its tech base from the unit in the pinned loader
    # (MtfFile.java:581-594), so it is not a fixed shared entry. The converter
    # has always read it as the Inner Sphere double.
    "Double": "DOUBLE",
    "Single Heat Sink": "SINGLE",
    "Single Heat Sinks": "SINGLE",
    "Double Heat Sink": "DOUBLE",
    "Double Heat Sinks": "DOUBLE",
    "Double (IS)": "DOUBLE",
    "Double (Clan)": "DOUBLE_CLAN",
    "Clan Double Heat Sink": "DOUBLE_CLAN",
    "Compact Heat Sink": "COMPACT",
    "Laser Heat Sink": "LASER",
}

MECH_LOCATION_MAP: Dict[str, str] = {
    # Standard locations
    "Head": "HEAD",
    "HD": "HEAD",
    "Center Torso": "CENTER_TORSO",
    "CT": "CENTER_TORSO",
    "Left Torso": "LEFT_TORSO",
    "LT": "LEFT_TORSO",
    "Right Torso": "RIGHT_TORSO",
    "RT": "RIGHT_TORSO",
    "Left Arm": "LEFT_ARM",
    "LA": "LEFT_ARM",
    "Right Arm": "RIGHT_ARM",
    "RA": "RIGHT_ARM",
    "Left Leg": "LEFT_LEG",
    "LL": "LEFT_LEG",
    "Right Leg": "RIGHT_LEG",
    "RL": "RIGHT_LEG",
    "Center Leg": "CENTER_LEG",
    "CL": "CENTER_LEG",
    # Rear locations
    "Center Torso (Rear)": "CENTER_TORSO_REAR",
    "CTR": "CENTER_TORSO_REAR",
    "RTC": "CENTER_TORSO_REAR",
    "Left Torso (Rear)": "LEFT_TORSO_REAR",
    "LTR": "LEFT_TORSO_REAR",
    "RTL": "LEFT_TORSO_REAR",
    "Right Torso (Rear)": "RIGHT_TORSO_REAR",
    "RTR": "RIGHT_TORSO_REAR",
    # Quad mech locations
    "Front Left Leg": "FRONT_LEFT_LEG",
    "FLL": "FRONT_LEFT_LEG",
    "Front Right Leg": "FRONT_RIGHT_LEG",
    "FRL": "FRONT_RIGHT_LEG",
    "Rear Left Leg": "REAR_LEFT_LEG",
    "RLL": "REAR_LEFT_LEG",
    "Rear Right Leg": "REAR_RIGHT_LEG",
    "RRL": "REAR_RIGHT_LEG",
}

ARMOR_LOCATION_KEY_MAP: Dict[str, str] = {
    "la armor": "LEFT_ARM",
    "ra armor": "RIGHT_ARM",
    "lt armor": "LEFT_TORSO",
    "rt armor": "RIGHT_TORSO",
    "ct armor": "CENTER_TORSO",
    "hd armor": "HEAD",
    "ll armor": "LEFT_LEG",
    "rl armor": "RIGHT_LEG",
    "cl armor": "CENTER_LEG",
    "rtl armor": "LEFT_TORSO_REAR",
    "rtr armor": "RIGHT_TORSO_REAR",
    "rtc armor": "CENTER_TORSO_REAR",
    # Also support without 'armor' suffix
    "la": "LEFT_ARM",
    "ra": "RIGHT_ARM",
    "lt": "LEFT_TORSO",
    "rt": "RIGHT_TORSO",
    "ct": "CENTER_TORSO",
    "hd": "HEAD",
    "ll": "LEFT_LEG",
    "rl": "RIGHT_LEG",
    "cl": "CENTER_LEG",
    "rtl": "LEFT_TORSO_REAR",
    "rtr": "RIGHT_TORSO_REAR",
    "rtc": "CENTER_TORSO_REAR",
}

ERA_MAP: Dict[int, str] = {
    # By year ranges
    # Age of War: 2005-2570
    # Star League: 2571-2780
    # Early Succession Wars: 2781-2900
    # Late Succession Wars: 2901-3019
    # Renaissance: 3020-3049
    # Clan Invasion: 3050-3061
    # Civil War: 3062-3067
    # Jihad: 3068-3085
    # Dark Age: 3086-3150
    # ilClan: 3151+
}

UNIT_TYPE_MAP: Dict[str, str] = {
    "BattleMech": "BattleMech",
    "Mech": "BattleMech",
    "Biped": "BattleMech",
    "Quad": "BattleMech",
    "OmniMech": "OmniMech",
    "IndustrialMech": "IndustrialMech",
    "ProtoMech": "ProtoMech",
    "Tank": "Vehicle",
    "Vehicle": "Vehicle",
    "VTOL": "VTOL",
    "Aerospace": "Aerospace",
    "AeroSpaceFighter": "Aerospace",
    "Conventional Fighter": "Conventional Fighter",
    "ConvFighter": "Conventional Fighter",
    "Small Craft": "Small Craft",
    "SmallCraft": "Small Craft",
    "DropShip": "DropShip",
    "Dropship": "DropShip",
    "JumpShip": "JumpShip",
    "Jumpship": "JumpShip",
    "WarShip": "WarShip",
    "Warship": "WarShip",
    "Space Station": "Space Station",
    "SpaceStation": "Space Station",
    "Infantry": "Infantry",
    "BattleArmor": "Battle Armor",
    "Battle Armor": "Battle Armor",
    "Support Vehicle": "Support Vehicle",
    "SupportVehicle": "Support Vehicle",
}
