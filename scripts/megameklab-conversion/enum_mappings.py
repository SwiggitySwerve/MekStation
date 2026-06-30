"""
Enum Mappings for MTF to TypeScript Conversion

Maps MegaMek MTF format strings to TypeScript enum values used in megamek-web.
These mappings ensure consistent data conversion from legacy MTF files.

Usage:
    from enum_mappings import map_tech_base, map_engine_type, map_armor_location
"""

import os
from typing import Optional, Dict
from enum_mapping_tables import (
    TECH_BASE_MAP,
    RULES_LEVEL_MAP,
    ENGINE_TYPE_MAP,
    GYRO_TYPE_MAP,
    COCKPIT_TYPE_MAP,
    STRUCTURE_TYPE_MAP,
    ARMOR_TYPE_MAP,
    HEAT_SINK_TYPE_MAP,
    MECH_LOCATION_MAP,
    ARMOR_LOCATION_KEY_MAP,
    MECH_CONFIG_MAP,
    ERA_MAP,
    UNIT_TYPE_MAP,
)


def default_mm_data_root() -> str:
    """Return the platform-correct default mm-data root.

    Honours the ``MM_DATA_ROOT`` env var. Otherwise falls back to the canonical
    install location used by MekStation contributors. On Windows the path uses
    a drive letter; elsewhere we keep the POSIX-style path so the docs example
    still resolves cleanly.
    """
    env = os.environ.get("MM_DATA_ROOT")
    if env:
        return env
    if os.name == "nt":
        return r"E:\Projects\mm-data\data"
    return "/e/Projects/mm-data/data"

# =============================================================================
# TECH BASE MAPPINGS
# =============================================================================



def map_tech_base(value: str) -> str:
    """Map MTF tech base string to TypeScript enum value."""
    clean = value.strip()
    return TECH_BASE_MAP.get(clean, TECH_BASE_MAP.get(clean.title(), "INNER_SPHERE"))


# =============================================================================
# RULES LEVEL MAPPINGS
# =============================================================================



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



def map_cockpit_type(value: str) -> str:
    """Map MTF cockpit type to TypeScript enum value."""
    clean = value.strip()
    return COCKPIT_TYPE_MAP.get(clean, "STANDARD")


# =============================================================================
# INTERNAL STRUCTURE TYPE MAPPINGS
# =============================================================================



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


# Armor location key mappings (from MTF armor lines)


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



def map_mech_config(value: str) -> str:
    """Map MTF config to TypeScript enum value."""
    clean = value.strip()
    return MECH_CONFIG_MAP.get(clean, "Biped")


# =============================================================================
# ERA MAPPINGS
# =============================================================================



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

