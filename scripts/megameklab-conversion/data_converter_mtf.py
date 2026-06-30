"""Legacy MTF parser for data_converter.py."""

from __future__ import annotations

import os
import re

from data_converter_helpers import (
    FIGHTER_ARMOR_LOCATIONS,
    VEHICLE_ARMOR_LOCATIONS,
    VTOL_ARMOR_LOCATIONS,
    get_blk_item_type_from_name,
    get_mtf_item_type_from_line,
    get_year_from_path,
    log_skipped_file,
    parse_mtf_armor_type_line,
    parse_mtf_engine,
    parse_mtf_heat_sinks,
    parse_mtf_myomer,
    parse_mtf_structure,
)


def parse_mtf_file(filepath, output_dir_for_log):
    derived_equipment_accumulator = [] # To store (item_name, item_type, unit_tech_base, intro_year, source_file)
    data = {"quirks": [], "weapons_and_equipment": []}; fluff_text = {} # Initialize lists
    unit_context_for_typing = {} # To store info like heatsink type, engine type
    current_section_name = None; current_section_items = []
    fluff_fields = ["overview", "capabilities", "deployment", "history", "variants", "notable_pilots", "additional", "notes"]
    current_fluff_field = None; fluff_text_buffer = []
    base_filename = os.path.basename(filepath)

    file_era = get_year_from_path(filepath); data["era"] = file_era
    file_tech_base = "Inner Sphere"
    if "clan" in filepath.lower(): file_tech_base = "Clan"
    data["tech_base"] = file_tech_base # Set default, can be overridden

    non_mech_armor_keys = {
        "front armor": "Front", "left armor": "Left Side", "right armor": "Right Side", "rear armor": "Rear",
        "nose armor": "Nose", "left wing armor": "Left Wing", "right wing armor": "Right Wing", "aft armor": "Aft",
        "turret armor": "Turret", "rotor armor": "Rotor"
    }
    parsed_armor_locations = []
    line_number = 0

    try:
        with open(filepath, 'r', encoding='latin-1', errors='ignore') as f: lines = f.readlines()

        for line_content in lines:
            line_strip = line_content.strip()
            if ":" in line_strip:
                key, value = line_strip.split(":", 1); key_norm = key.strip().lower().replace(" ", "_"); value_clean = value.strip()
                if key_norm == "techbase": file_tech_base = value_clean; data["tech_base"] = file_tech_base
                elif key_norm == "era":
                    try: data["era"] = int(value_clean); file_era = data["era"]
                    except ValueError: data["era"] = value_clean; file_era = value_clean

        weapon_section_started = False
        for ln_idx, line_content in enumerate(lines):
            line_number = ln_idx + 1; line = line_content.strip()
            if not line:
                if current_fluff_field and fluff_text_buffer: fluff_text[current_fluff_field] = "\n".join(fluff_text_buffer).strip(); fluff_text_buffer = []; current_fluff_field = None
                weapon_section_started = False; continue

            is_fluff_header = False
            for field_name in fluff_fields:
                if line.lower().startswith(field_name + ":"):
                    if current_fluff_field and fluff_text_buffer: fluff_text[current_fluff_field] = "\n".join(fluff_text_buffer).strip()
                    current_fluff_field = field_name; fluff_text_buffer = [line[len(field_name)+1:].strip()]; is_fluff_header = True
                    if current_section_name: data.setdefault("criticals", []).append({"location": current_section_name, "slots": current_section_items}); current_section_name = None; current_section_items = []
                    weapon_section_started = False; break
            if is_fluff_header: continue
            if current_fluff_field: fluff_text_buffer.append(line); continue

            if line.lower().startswith("weapons:"): weapon_section_started = True; current_section_name = None; current_section_items = []; continue # Clear critical section context
            if weapon_section_started:
                item_name_on_weapon_line = line.split(',')[0].strip()
                location = line.split(',')[1].strip() if len(line.split(',')) > 1 else "Unknown"
                if item_name_on_weapon_line:
                    # Attempt to get a specific type from the name using the helper
                    derived_type_for_weapon = get_mtf_item_type_from_line(item_name_on_weapon_line, unit_context_for_typing)

                    # Determine the final type to use.
                    # If the derived type is "Unknown" or just a direct TitleCase of the name (which means no specific rule in helper matched well for a weapon context)
                    # AND it doesn't contain common weapon keywords, then classify it more generically as "Weapon".
                    # This handles cases where non-weapon items might appear in the weapons list.
                    is_generic_or_unclear_weapon_type = derived_type_for_weapon == "Unknown" or \
                                                       derived_type_for_weapon == ''.join(word.title() for word in item_name_on_weapon_line.replace("(","").replace(")","").replace("-"," ").replace("/"," ").split())

                    if is_generic_or_unclear_weapon_type and \
                       not any(kw in item_name_on_weapon_line.lower() for kw in ["laser","ppc","srm","lrm","ac","autocannon","gauss","flamer","lb-x","ultra","rotary"," streak ","gun","machine gun"]):
                        final_weapon_type = "Weapon"
                    else: # It's likely a weapon, or the helper found a good specific type.
                        final_weapon_type = derived_type_for_weapon

                    data["weapons_and_equipment"].append({"item_name": item_name_on_weapon_line, "location": location, "item_type": final_weapon_type})
                    derived_equipment_accumulator.append((item_name_on_weapon_line, final_weapon_type, file_tech_base, file_era, base_filename))
                continue

            if line.endswith(':') and not any(f_key in line.lower() for f_key in [" ammo:", "armor:", "manufacturer:", "primaryfactory:", "systemmanufacturer:"]) and not re.match(r"^\w+\s\w+:", line): # Potential critical section header
                if current_section_name and current_section_items:
                    data.setdefault("criticals", []).append({"location": current_section_name, "slots": current_section_items})

                temp_section_name = line[:-1]
                # Standardize critical hit locations
                if temp_section_name == "Rear Right Leg": temp_section_name = "Right Leg"
                elif temp_section_name == "Rear Left Leg": temp_section_name = "Left Leg"
                elif temp_section_name == "Rear Center Torso" or temp_section_name == "RTC": temp_section_name = "Center Torso (Rear)"
                # Add other critical location standardizations here if needed

                current_section_name = temp_section_name
                current_section_items = []
                continue

            if ":" in line:
                key, value = line.split(":", 1); key_norm = key.strip().lower().replace(" ", "_").replace("(", "").replace(")", ""); value_stripped = value.strip()

                if key_norm in non_mech_armor_keys:
                    try: parsed_armor_locations.append({"location": non_mech_armor_keys[key_norm], "armor_points": int(value_stripped)})
                    except ValueError: log_skipped_file(filepath, f"Non-integer armor value '{value_stripped}' for {key_norm}", output_dir_for_log)
                    continue

                if key_norm == "mass":
                    try: data["mass"] = int(value_stripped)
                    except ValueError: data["mass"] = value_stripped
                elif key_norm == "engine":
                    parsed_engine = parse_mtf_engine(value_stripped)
                    data["engine"] = parsed_engine
                    # Clean and store engine type, e.g. "FusionEngine", "XLEngine"
                    cleaned_engine_type = ''.join(word.title() for word in parsed_engine.get("type", "FusionEngine").replace("(IS)","").replace("(Clan)","").split())
                    if cleaned_engine_type and "engine" not in cleaned_engine_type.lower(): # e.g. XL -> XLEngine
                        cleaned_engine_type = f"{cleaned_engine_type}Engine"
                    elif not cleaned_engine_type:
                        cleaned_engine_type = "FusionEngine" # Default if type was empty
                    unit_context_for_typing["engine_type"] = cleaned_engine_type

                elif key_norm == "heat_sinks":
                    parsed_hs = parse_mtf_heat_sinks(value_stripped)
                    data["heat_sinks"] = parsed_hs
                    # Clean and store hs type, e.g. "SingleHeatSink", "DoubleHeatSink"
                    cleaned_hs_type = ''.join(word.title() for word in parsed_hs.get("type", "Single").split())
                    if cleaned_hs_type and "heatsink" not in cleaned_hs_type.lower(): # e.g. Single -> SingleHeatSink
                         cleaned_hs_type = f"{cleaned_hs_type}HeatSink"
                    elif not cleaned_hs_type:
                        cleaned_hs_type = "SingleHeatSink" # Default if type was empty
                    unit_context_for_typing["heat_sink_type"] = cleaned_hs_type
                elif key_norm == "armor" and not current_section_name: data["armor_details_temp"] = parse_mtf_armor_type_line(value_stripped)
                elif key_norm.endswith("_armor"):
                    loc_name = key_norm.upper().replace("_ARMOR",""); data.setdefault("armor_locations_map", {})[loc_name] = value_stripped
                elif key_norm == "quirk": data["quirks"].append(value_stripped)
                elif key_norm == "structure": data["structure"] = parse_mtf_structure(value_stripped)
                elif key_norm == "myomer": data["myomer"] = parse_mtf_myomer(value_stripped)
                # Manufacturer and PrimaryFactory processing
                elif key_norm == "manufacturer":
                    current_manufacturers = data.setdefault("manufacturers", [])
                    for man_name in value_stripped.split(','): # Handle comma-separated names
                        man_name_stripped = man_name.strip()
                        if man_name_stripped:
                            current_manufacturers.append({"name": man_name_stripped})
                elif key_norm == "primaryfactory":
                    current_manufacturers = data.setdefault("manufacturers", []) # Consolidate into manufacturers
                    for fac_name in value_stripped.split(','): # Handle comma-separated names
                        fac_name_stripped = fac_name.strip()
                        if fac_name_stripped:
                            current_manufacturers.append({"name": fac_name_stripped}) # Could add type: "primary" here if needed later
                elif key_norm not in ["engine", "heat_sinks", "structure", "myomer", "techbase", "era", "weapons", "armor", "conversion_notes", "mass", "systemmanufacturer", "mul_id"] : data[key_norm] = value_stripped
                # Removed "manufacturer", "primaryfactory" from the list above as they are now handled
                elif key_norm == "systemmanufacturer":
                    sys_type, sys_name = value_stripped.split(":", 1) if ":" in value_stripped else (key, value_stripped)
                    data.setdefault("system_manufacturers", []).append({"type": sys_type.strip(), "name": sys_name.strip()})
                elif key_norm == "mul_id": data["mul_id"] = value_stripped

            elif current_section_name:
                # Fix for model name appearing as critical slot item
                unit_model_name = data.get('model', "") # Get the model name, default to empty string if not found
                if line.strip() == unit_model_name:
                    pass # Skip adding model name as a critical item
                elif line.strip() == "-Empty-":
                    current_section_items.append("-Empty-")
                else: # This is a critical slot item
                    current_section_items.append(line)
                    item_type_for_crit = get_mtf_item_type_from_line(line, unit_context_for_typing)
                    derived_equipment_accumulator.append((line, item_type_for_crit, file_tech_base, file_era, base_filename))
            elif ":" not in line and current_section_name and line.strip() == "-Empty-": # Handle empty slots explicitly also here
                 current_section_items.append("-Empty-")


        if current_section_name and current_section_items: # Add the last section
            data.setdefault("criticals", []).append({"location": current_section_name, "slots": current_section_items})
        if current_fluff_field and fluff_text_buffer: fluff_text[current_fluff_field] = "\n".join(fluff_text_buffer).strip()
        if fluff_text: data["fluff_text"] = fluff_text

        armor_base_info = data.pop("armor_details_temp", parse_mtf_armor_type_line(data.get("armor", "Standard Armor")))
        final_armor_obj = {"type": armor_base_info["type"], "manufacturer": armor_base_info["manufacturer"], "locations": []}

        if "armor_locations_map" in data: # Mech armor
            total_armor = 0
            armor_map = data.pop("armor_locations_map")
            for loc_key, points_str in armor_map.items():
                try: points = int(points_str); total_armor += points
                except ValueError: points = 0

                # Standardize armor locations from map keys
                if loc_key == "RTC": display_loc = "Center Torso (Rear)"
                elif loc_key == "RTR": display_loc = "Right Torso (Rear)"
                elif loc_key == "RTL": display_loc = "Left Torso (Rear)"
                else: display_loc = loc_key # Keep original if no mapping needed

                final_armor_obj["locations"].append({"location": display_loc, "armor_points": points, "rear_armor_points": None})
            if total_armor > 0: final_armor_obj["total_armor_points"] = total_armor
        elif parsed_armor_locations: # Non-mech MTF armor
            final_armor_obj["locations"] = parsed_armor_locations
            final_armor_obj["total_armor_points"] = sum(loc.get("armor_points", 0) for loc in parsed_armor_locations if isinstance(loc.get("armor_points"), int))
        data["armor"] = final_armor_obj
        if not data.get("quirks"): data["quirks"] = [] # Ensure quirks list exists

    except Exception as e:
        log_skipped_file(filepath, f"MTF Error: {e} (line {line_number})", output_dir_for_log); return None, []
    return data, derived_equipment_accumulator
