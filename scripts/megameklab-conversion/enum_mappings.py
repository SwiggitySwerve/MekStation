"""
Enum Mappings for MTF to TypeScript Conversion

Maps MegaMek MTF format strings to TypeScript enum values used in megamek-web.
These mappings ensure consistent data conversion from legacy MTF files.

Usage:
    from enum_mappings import map_tech_base, map_engine_type, map_armor_location
"""

from typing import Optional, Dict

# =============================================================================
# TECH BASE MAPPINGS
# =============================================================================

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


def map_tech_base(value: str) -> str:
    """Map MTF tech base string to TypeScript enum value."""
    clean = value.strip()
    return TECH_BASE_MAP.get(clean, TECH_BASE_MAP.get(clean.title(), "INNER_SPHERE"))


# =============================================================================
# RULES LEVEL MAPPINGS
# =============================================================================

RULES_LEVEL_MAP: Dict[str, str] = {
    # Numeric rules levels
    "0": "INTRODUCTORY",
    "1": "STANDARD",
    "2": "ADVANCED",
    "3": "EXPERIMENTAL",
    "4": "UNOFFICIAL",
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


def map_rules_level(value: str) -> str:
    """Map MTF rules level to TypeScript enum value."""
    clean = value.strip()
    if clean in RULES_LEVEL_MAP:
        return RULES_LEVEL_MAP[clean]
    # Try extracting just the number
    for char in clean:
        if char.isdigit():
            return RULES_LEVEL_MAP.get(char, "STANDARD")
    return "STANDARD"


# =============================================================================
# ENGINE TYPE MAPPINGS
# =============================================================================

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
    # Numeric codes (from BLK engine_type tag)
    "0": "FUSION",
    "1": "XL",
    "2": "LIGHT",
    "3": "COMPACT",
    "4": "CLAN_XL",
    "5": "XXL",
}


def map_engine_type(value: str) -> str:
    """Map MTF engine type to TypeScript enum value."""
    clean = value.strip()
    if clean in ENGINE_TYPE_MAP:
        return ENGINE_TYPE_MAP[clean]
    # Try to extract type from longer strings
    upper = clean.upper()
    if "XXL" in upper:
        return "XXL"
    if "XL" in upper and "CLAN" in upper:
        return "CLAN_XL"
    if "XL" in upper:
        return "XL"
    if "LIGHT" in upper:
        return "LIGHT"
    if "COMPACT" in upper:
        return "COMPACT"
    if "ICE" in upper or "COMBUSTION" in upper:
        return "ICE"
    if "FUEL" in upper or "CELL" in upper:
        return "FUEL_CELL"
    if "FISSION" in upper:
        return "FISSION"
    return "FUSION"


# =============================================================================
# GYRO TYPE MAPPINGS
# =============================================================================

GYRO_TYPE_MAP: Dict[str, str] = {
    "Standard Gyro": "STANDARD",
    "Standard": "STANDARD",
    "XL Gyro": "XL",
    "Extra-Light Gyro": "XL",
    "Compact Gyro": "COMPACT",
    "Heavy Duty Gyro": "HEAVY_DUTY",
    "Heavy-Duty Gyro": "HEAVY_DUTY",
    "Superheavy Gyro": "SUPERHEAVY",
    "Super Heavy Gyro": "SUPERHEAVY",
    "None": "NONE",
    # Numeric codes
    "0": "STANDARD",
    "1": "XL",
    "2": "COMPACT",
    "3": "HEAVY_DUTY",
    "4": "SUPERHEAVY",
}


def map_gyro_type(value: str) -> str:
    """Map MTF gyro type to TypeScript enum value."""
    clean = value.strip()
    if clean in GYRO_TYPE_MAP:
        return GYRO_TYPE_MAP[clean]
    upper = clean.upper()
    if "SUPERHEAVY" in upper or "SUPER HEAVY" in upper:
        return "SUPERHEAVY"
    if "XL" in upper or "EXTRA" in upper:
        return "XL"
    if "COMPACT" in upper:
        return "COMPACT"
    if "HEAVY" in upper:
        return "HEAVY_DUTY"
    return "STANDARD"


# =============================================================================
# COCKPIT TYPE MAPPINGS
# =============================================================================

COCKPIT_TYPE_MAP: Dict[str, str] = {
    "Standard Cockpit": "STANDARD",
    "Standard": "STANDARD",
    "Small Cockpit": "SMALL",
    "Small": "SMALL",
    "Command Console": "COMMAND_CONSOLE",
    "Torso-Mounted Cockpit": "TORSO_MOUNTED",
    "Torso Cockpit": "TORSO_MOUNTED",
    "Primitive Cockpit": "PRIMITIVE",
    "Primitive": "PRIMITIVE",
    "Industrial Cockpit": "INDUSTRIAL",
    "Industrial": "INDUSTRIAL",
    "Primitive Industrial Cockpit": "PRIMITIVE_INDUSTRIAL",
    "Primitive Industrial": "PRIMITIVE_INDUSTRIAL",
    "Superheavy Industrial Cockpit": "SUPERHEAVY_INDUSTRIAL",
    "Tripod Industrial Cockpit": "TRIPOD_INDUSTRIAL",
    "Superheavy Tripod Industrial Cockpit": "SUPERHEAVY_TRIPOD_INDUSTRIAL",
    "Superheavy Cockpit": "SUPERHEAVY",
    "Superheavy Tripod Cockpit": "SUPERHEAVY_TRIPOD",
    "Interface Cockpit": "INTERFACE",
    "QuadVee Cockpit": "QUADVEE",
}


def map_cockpit_type(value: str) -> str:
    """Map MTF cockpit type to TypeScript enum value."""
    clean = value.strip()
    return COCKPIT_TYPE_MAP.get(clean, "STANDARD")


# =============================================================================
# INTERNAL STRUCTURE TYPE MAPPINGS
# =============================================================================

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


def map_structure_type(value: str) -> str:
    """Map MTF structure type to TypeScript enum value."""
    clean = value.strip()
    if clean in STRUCTURE_TYPE_MAP:
        return STRUCTURE_TYPE_MAP[clean]
    upper = clean.upper()
    if "ENDO" in upper and "COMPOSITE" in upper:
        return "ENDO_COMPOSITE"
    if "ENDO" in upper and "CLAN" in upper:
        return "ENDO_STEEL_CLAN"
    if "ENDO" in upper:
        return "ENDO_STEEL"
    if "REINFORCED" in upper:
        return "REINFORCED"
    if "COMPOSITE" in upper:
        return "COMPOSITE"
    if "INDUSTRIAL" in upper:
        return "INDUSTRIAL"
    return "STANDARD"


# =============================================================================
# ARMOR TYPE MAPPINGS
# =============================================================================

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
}


def map_armor_type(value: str) -> str:
    """Map MTF armor type to TypeScript enum value."""
    clean = value.strip()
    if clean in ARMOR_TYPE_MAP:
        return ARMOR_TYPE_MAP[clean]
    upper = clean.upper()
    if "STEALTH" in upper:
        return "STEALTH"
    if "REACTIVE" in upper:
        return "REACTIVE"
    if "REFLECTIVE" in upper or "LASER-REFLECT" in upper:
        return "REFLECTIVE"
    if "HARDENED" in upper:
        return "HARDENED"
    if "HEAVY" in upper and "FERRO" in upper:
        return "HEAVY_FERRO_FIBROUS"
    if "LIGHT" in upper and "FERRO" in upper:
        return "LIGHT_FERRO_FIBROUS"
    if "FERRO" in upper and "CLAN" in upper:
        return "FERRO_FIBROUS_CLAN"
    if "FERRO" in upper:
        return "FERRO_FIBROUS"
    if "PRIMITIVE" in upper:
        return "PRIMITIVE"
    if "COMMERCIAL" in upper:
        return "COMMERCIAL"
    if "IMPACT" in upper and "RESIST" in upper:
        return "IMPACT_RESISTANT"
    if "HEAVY" in upper and "INDUSTRIAL" in upper:
        return "HEAVY_INDUSTRIAL"
    if "INDUSTRIAL" in upper:
        return "INDUSTRIAL"
    return "STANDARD"


# =============================================================================
# HEAT SINK TYPE MAPPINGS
# =============================================================================

HEAT_SINK_TYPE_MAP: Dict[str, str] = {
    "Single": "SINGLE",
    "Single Heat Sink": "SINGLE",
    "Single Heat Sinks": "SINGLE",
    "Double": "DOUBLE",
    "Double Heat Sink": "DOUBLE",
    "Double Heat Sinks": "DOUBLE",
    "Double (IS)": "DOUBLE",
    "Double (Clan)": "DOUBLE_CLAN",
    "Clan Double Heat Sink": "DOUBLE_CLAN",
    "Clan Double": "DOUBLE_CLAN",
    "Compact": "COMPACT",
    "Compact Heat Sink": "COMPACT",
    "Laser": "LASER",
    "Laser Heat Sink": "LASER",
}


def map_heat_sink_type(value: str) -> str:
    """Map MTF heat sink type to TypeScript enum value."""
    clean = value.strip()
    if clean in HEAT_SINK_TYPE_MAP:
        return HEAT_SINK_TYPE_MAP[clean]
    upper = clean.upper()
    if "DOUBLE" in upper and "CLAN" in upper:
        return "DOUBLE_CLAN"
    if "DOUBLE" in upper:
        return "DOUBLE"
    if "COMPACT" in upper:
        return "COMPACT"
    if "LASER" in upper:
        return "LASER"
    return "SINGLE"


# =============================================================================
# MECH LOCATION MAPPINGS
# =============================================================================

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

# Armor location key mappings (from MTF armor lines)
ARMOR_LOCATION_KEY_MAP: Dict[str, str] = {
    "la armor": "LEFT_ARM",
    "ra armor": "RIGHT_ARM",
    "lt armor": "LEFT_TORSO",
    "rt armor": "RIGHT_TORSO",
    "ct armor": "CENTER_TORSO",
    "hd armor": "HEAD",
    "ll armor": "LEFT_LEG",
    "rl armor": "RIGHT_LEG",
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
    "rtl": "LEFT_TORSO_REAR",
    "rtr": "RIGHT_TORSO_REAR",
    "rtc": "CENTER_TORSO_REAR",
}


def map_mech_location(value: str) -> str:
    """Map MTF location string to TypeScript enum value."""
    clean = value.strip()
    if clean in MECH_LOCATION_MAP:
        return MECH_LOCATION_MAP[clean]
    lower = clean.lower()
    if lower in ARMOR_LOCATION_KEY_MAP:
        return ARMOR_LOCATION_KEY_MAP[lower]
    # Default
    return clean.upper().replace(" ", "_")


# =============================================================================
# MECH CONFIGURATION MAPPINGS
# =============================================================================

MECH_CONFIG_MAP: Dict[str, str] = {
    "Biped": "Biped",
    "Quad": "Quad",
    "Tripod": "Tripod",
    "LAM": "LAM",
    "QuadVee": "QuadVee",
    "Biped Omnimech": "Biped",
    "Quad Omnimech": "Quad",
}


def map_mech_config(value: str) -> str:
    """Map MTF config to TypeScript enum value."""
    clean = value.strip()
    return MECH_CONFIG_MAP.get(clean, "Biped")


# =============================================================================
# ERA MAPPINGS
# =============================================================================

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


def map_year_to_era(year: int) -> str:
    """Map introduction year to BattleTech era string (matches TypeScript Era enum)."""
    if year < 2005:
        return "EARLY_SPACEFLIGHT"
    elif year < 2571:
        return "AGE_OF_WAR"
    elif year < 2781:
        return "STAR_LEAGUE"
    elif year < 3050:
        return "SUCCESSION_WARS"
    elif year < 3068:
        return "CLAN_INVASION"
    elif year < 3081:
        return "CIVIL_WAR"
    elif year < 3152:
        return "DARK_AGE"
    else:
        return "ILCLAN"


def get_era_folder_name(era: str) -> str:
    """Get a folder-safe name for an era with chronological prefix."""
    era_folders = {
        "EARLY_SPACEFLIGHT": "0-early-spaceflight",
        "AGE_OF_WAR": "1-age-of-war",
        "STAR_LEAGUE": "2-star-league",
        "SUCCESSION_WARS": "3-succession-wars",
        "CLAN_INVASION": "4-clan-invasion",
        "CIVIL_WAR": "5-civil-war",
        "DARK_AGE": "6-dark-age",
        "ILCLAN": "7-ilclan",
    }
    return era_folders.get(era, "99-unknown")


def get_rules_level_folder_name(rules_level: str) -> str:
    """Get a folder-safe name for a rules level."""
    rules_folders = {
        "INTRODUCTORY": "introductory",
        "STANDARD": "standard",
        "ADVANCED": "advanced",
        "EXPERIMENTAL": "experimental",
    }
    return rules_folders.get(rules_level, "standard")


# =============================================================================
# UNIT TYPE MAPPINGS
# =============================================================================

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


def map_unit_type(value: str) -> str:
    """Map MTF unit type to TypeScript enum value."""
    clean = value.strip()
    return UNIT_TYPE_MAP.get(clean, "BattleMech")


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def generate_id_from_name(chassis: str, model: str) -> str:
    """Generate a canonical ID from chassis and model names."""
    combined = f"{chassis}-{model}".lower()
    # Replace special characters
    id_str = combined.replace(" ", "-").replace("/", "-").replace("(", "").replace(")", "")
    id_str = id_str.replace("'", "").replace('"', "").replace(".", "").replace(",", "")
    # Remove double dashes
    while "--" in id_str:
        id_str = id_str.replace("--", "-")
    # Remove leading/trailing dashes
    return id_str.strip("-")


def normalize_equipment_id(name: str) -> str:
    """Normalize an equipment name to a canonical ID format."""
    id_str = name.lower()
    # Handle common patterns
    id_str = id_str.replace("(clan)", "clan")
    id_str = id_str.replace("(is)", "is")
    id_str = id_str.replace("(inner sphere)", "is")
    # Replace special characters
    id_str = id_str.replace("/", "-").replace(" ", "-")
    id_str = id_str.replace("(", "").replace(")", "")
    id_str = id_str.replace("'", "").replace('"', "")
    # Remove double dashes
    while "--" in id_str:
        id_str = id_str.replace("--", "-")
    return id_str.strip("-")

