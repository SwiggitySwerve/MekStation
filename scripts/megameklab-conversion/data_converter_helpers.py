import os
import re
from pathlib import Path


DERIVED_EQUIPMENT = {}
SKIPPED_FILES_LOG = "skipped_files.log"

FUNDAMENTAL_IS_COMPONENTS = [
    "cockpit", "life support", "sensors", "gyro", "engine", "structure", "myomer",
    "heat sink", "jump jet", "shoulder", "upper arm actuator", "lower arm actuator", "hand actuator",
    "hip", "upper leg actuator", "lower leg actuator", "foot actuator"
]
VEHICLE_ARMOR_LOCATIONS = ["Front", "Left Side", "Right Side", "Rear", "Turret"]
FIGHTER_ARMOR_LOCATIONS = ["Nose", "Left Wing", "Right Wing", "Aft"]
VTOL_ARMOR_LOCATIONS = ["Nose", "Left Side", "Right Side", "Rear", "Rotor"]


def get_mtf_item_type_from_line(item_name_line, unit_context):
    name_lower = item_name_line.lower().strip()
    type_str = ''.join(
        word.title()
        for word in item_name_line.replace("(", "").replace(")", "").replace("-", " ").replace("/", " ").split()
    )

    if not type_str:
        return "Unknown"

    if name_lower == "heat sink":
        return unit_context.get("heat_sink_type", "SingleHeatSink")
    if name_lower == "fusion engine":
        return unit_context.get("engine_type", "FusionEngine")
    if name_lower.startswith("is ammo") or name_lower.startswith("clan ammo"):
        return "Ammo"

    if "ppc" in name_lower:
        return type_str
    if "laser" in name_lower:
        return type_str
    if "srm" in name_lower and "ammo" not in name_lower:
        return type_str
    if "lrm" in name_lower and "ammo" not in name_lower:
        return type_str
    if "machine gun" in name_lower:
        return "MachineGun"
    if "autocannon" in name_lower or name_lower.startswith("ac"):
        return type_str.replace("/", "")
    if "gauss rifle" in name_lower:
        return "GaussRifle"
    if "flamer" in name_lower and "ammo" not in name_lower:
        return type_str
    if "lb-x" in name_lower and "ammo" not in name_lower:
        return type_str.replace("LB-X", "LBX")
    if "ultra ac" in name_lower and "ammo" not in name_lower:
        return type_str.replace("UltraAC", "UAC")
    if "rotary ac" in name_lower and "ammo" not in name_lower:
        return type_str.replace("RotaryAC", "RAC")
    if "mrm" in name_lower and "ammo" not in name_lower:
        return type_str
    if " Streak " in item_name_line and "ammo" not in name_lower:
        return type_str

    if name_lower == "gyro":
        return "Gyro"
    if name_lower == "sensors":
        return "Sensors"
    if name_lower == "cockpit":
        return "Cockpit"
    if name_lower == "life support":
        return "LifeSupport"
    if "actuator" in name_lower:
        return type_str
    if name_lower in ["shoulder", "hip"]:
        return type_str
    if name_lower == "structure":
        return "Structure"
    if name_lower == "myomer":
        return "Myomer"
    if "jump jet" in name_lower:
        return type_str

    return type_str if type_str else "Unknown"


def get_blk_item_type_from_name(item_name_str):
    name_lower = item_name_str.lower().strip()
    type_str = ''.join(
        word.title()
        for word in item_name_str.replace("(", "").replace(")", "").replace("-", " ").replace("/", " ").split()
    )

    if not type_str:
        return "Unknown"

    if "ppc" in name_lower:
        return type_str
    if "laser" in name_lower:
        return type_str
    if "srm" in name_lower and "ammo" not in name_lower:
        return type_str
    if "lrm" in name_lower and "ammo" not in name_lower:
        return type_str
    if "machine gun" in name_lower:
        return "MachineGun"
    if "autocannon" in name_lower or name_lower.startswith("ac"):
        return type_str.replace("/", "")
    if "gauss rifle" in name_lower:
        return "GaussRifle"
    if "flamer" in name_lower and "ammo" not in name_lower:
        return type_str
    if "lb-x" in name_lower and "ammo" not in name_lower:
        return type_str.replace("LB-X", "LBX")
    if "ultra ac" in name_lower and "ammo" not in name_lower:
        return type_str.replace("UltraAC", "UAC")
    if "rotary ac" in name_lower and "ammo" not in name_lower:
        return type_str.replace("RotaryAC", "RAC")
    if "mrm" in name_lower and "ammo" not in name_lower:
        return type_str
    if " Streak " in item_name_str and "ammo" not in name_lower:
        return type_str
    if name_lower.startswith("is ammo") or name_lower.startswith("clan ammo"):
        return "Ammo"

    if name_lower == "heat sink":
        return "HeatSink"
    if name_lower == "fusion engine":
        return "FusionEngine"
    if name_lower == "gyro":
        return "Gyro"
    if name_lower == "sensors":
        return "Sensors"
    if name_lower == "cockpit":
        return "Cockpit"
    if name_lower == "life support":
        return "LifeSupport"
    if "actuator" in name_lower:
        return type_str
    if name_lower in ["shoulder", "hip"]:
        return type_str
    if name_lower == "structure":
        return "Structure"
    if name_lower == "myomer":
        return "Myomer"
    if "jump jet" in name_lower:
        return type_str
    if name_lower == "targeting computer":
        return "TargetingComputer"

    return type_str if type_str else "Unknown"


def log_skipped_file(filepath, reason, output_dir_for_log):
    log_path = os.path.join(output_dir_for_log, SKIPPED_FILES_LOG)
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"Skipped: {filepath} - Reason: {reason}\n")


def parse_mtf_engine(engine_str):
    match = re.match(r"(\d+)\s*(.*?)(?:\(([^)]+)\))?$", engine_str)
    if match:
        rating, type_name, manufacturer = match.groups()
        return {
            "rating": int(rating),
            "type": type_name.strip(),
            "manufacturer": manufacturer.strip() if manufacturer else None,
        }
    return {"raw": engine_str, "rating": 0, "type": "Unknown", "manufacturer": None}


def parse_mtf_heat_sinks(hs_str):
    match = re.match(r"(\d+)\s*(.*?)(?:\sHeat Sink)?$", hs_str)
    if match:
        count, type_name = match.groups()
        return {"count": int(count), "type": type_name.strip()}
    return {"raw": hs_str, "count": 0, "type": "Unknown"}


def parse_mtf_structure(structure_str):
    match = re.match(r"(.+?)(?:\(([^)]+)\))?$", structure_str)
    if match:
        type_name, manufacturer = match.groups()
        return {"type": type_name.strip(), "manufacturer": manufacturer.strip() if manufacturer else None}
    return {"type": structure_str.strip(), "manufacturer": None}


def parse_mtf_armor_type_line(armor_str):
    match = re.match(r"(.+?)(?:\(([^)]+)\))?$", armor_str)
    if match:
        type_name, manufacturer = match.groups()
        return {"type": type_name.strip(), "manufacturer": manufacturer.strip() if manufacturer else None}
    return {"type": armor_str.strip(), "manufacturer": None}


def parse_mtf_myomer(myomer_str):
    match = re.match(r"(.+?)(?:\(([^)]+)\))?$", myomer_str)
    if match:
        type_name, manufacturer = match.groups()
        return {"type": type_name.strip(), "manufacturer": manufacturer.strip() if manufacturer else None}
    return {"type": myomer_str.strip(), "manufacturer": None}


def get_year_from_path(filepath_str):
    filepath = Path(filepath_str)
    year_pattern = re.compile(r"(\d{4})[Uu]?")
    path_str_lower = str(filepath).lower()

    known_tro_years = {
        "3025": 3025, "3039": 3039, "3050": 3050, "3055": 3055, "3057": 3057, "3058": 3058,
        "3060": 3060, "3067": 3067, "3075": 3075, "3085": 3085, "3145": 3145, "3150": 3150,
        "xtro primitivestest": 2400, "xtro primitives i": 2400, "xtro primitives ii": 2400,
        "xtro primitives iii": 2400, "xtro primitives iv": 2400, "xtro primitives v": 2400,
        "xtro clans": 2850, "xtro succession wars": 2900, "xtro boondoggles": 3060,
        "xtro corporations": 3060, "xtro davion": 3060, "xtro kurita": 3060,
        "xtro liaosuns": 3060, "xtro marik": 3060, "xtro mercs": 3060, "xtro steiner": 3060,
        "xtro pirates": 3060, "xtro royal society": 3060, "xtro ilclan": 3150,
        "prototypes": 3070, "project phoenix": 3070, "golden century": 2800,
        "recognition guide": 3140, "rg": 3140,
    }
    for key, year_val in known_tro_years.items():
        if key in path_str_lower:
            return year_val

    for part in reversed(filepath.parts):
        match = year_pattern.search(part)
        if match:
            return int(match.group(1))
    return 2750


def add_to_derived_equipment(
    item_name,
    item_type="Unknown",
    unit_tech_base_for_context="Unknown",
    introduction_year="Unknown",
    source_file="N/A",
):
    if not item_name or item_name == "-Empty-":
        return
    clean_item_name = item_name.strip()
    internal_id_base = re.sub(r"[^a-zA-Z0-9]", "", clean_item_name.upper())
    internal_id = internal_id_base.replace(" ", "")

    item_specific_tech_base = "Unknown"
    name_upper = clean_item_name.upper()
    if "(CL)" in name_upper or "CLAN" in name_upper or name_upper.endswith(" C") or name_upper.startswith("C "):
        item_specific_tech_base = "Clan"
    elif "(IS)" in name_upper or "INNER SPHERE" in name_upper:
        item_specific_tech_base = "Inner Sphere"

    final_tech_base = item_specific_tech_base
    is_fundamental = any(
        fundamental.lower() == clean_item_name.lower().split("(")[0].strip()
        for fundamental in FUNDAMENTAL_IS_COMPONENTS
    )

    if final_tech_base == "Unknown":
        if is_fundamental and unit_tech_base_for_context == "Inner Sphere":
            final_tech_base = "Inner Sphere"
        else:
            final_tech_base = unit_tech_base_for_context

    current_intro_year = "Unknown"
    if isinstance(introduction_year, int):
        current_intro_year = introduction_year
    elif isinstance(introduction_year, str) and introduction_year.isdigit():
        current_intro_year = int(introduction_year)
    elif isinstance(introduction_year, str):
        current_intro_year = introduction_year.strip() if introduction_year.strip() else "Unknown"

    if internal_id not in DERIVED_EQUIPMENT:
        DERIVED_EQUIPMENT[internal_id] = {
            "name": clean_item_name,
            "internal_id": internal_id,
            "type": item_type,
            "category": "Unknown",
            "tech_base": final_tech_base,
            "rules_level": "Standard",
            "introduction_year": current_intro_year,
            "extinction_year": "Unknown",
            "faction_availability": [],
            "technology_dependencies": [],
            "critical_slots": 0,
            "tonnage": 0,
            "cost_cbills": None,
            "battle_value": None,
            "source_book": None,
            "source_files": [source_file],
        }
        return

    entry = DERIVED_EQUIPMENT[internal_id]
    if source_file not in entry["source_files"]:
        entry["source_files"].append(source_file)

    current_type_is_generic = entry["type"].lower() in ["unknown", "equipment", "weapon", "ammo", "component"]
    new_type_is_specific = item_type.lower() not in ["unknown", "equipment", "weapon", "ammo", "component"]

    if current_type_is_generic and new_type_is_specific:
        entry["type"] = item_type
    elif entry["type"].lower() == "unknown" and item_type.lower() != "unknown":
        entry["type"] = item_type

    if entry["tech_base"] == "Unknown" and final_tech_base != "Unknown":
        entry["tech_base"] = final_tech_base
    elif entry["tech_base"] != final_tech_base and final_tech_base != "Unknown" and entry["tech_base"] != "Mixed":
        is_entry_fundamental_is = (
            any(f.lower() == entry["name"].lower().split("(")[0].strip() for f in FUNDAMENTAL_IS_COMPONENTS)
            and entry["tech_base"] == "Inner Sphere"
        )
        if not is_entry_fundamental_is:
            entry["tech_base"] = "Mixed"

    if current_intro_year != "Unknown":
        if (
            entry["introduction_year"] == "Unknown"
            or (
                isinstance(current_intro_year, int)
                and isinstance(entry["introduction_year"], int)
                and current_intro_year < entry["introduction_year"]
            )
            or (isinstance(current_intro_year, int) and isinstance(entry["introduction_year"], str))
        ):
            entry["introduction_year"] = current_intro_year
