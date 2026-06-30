"""Legacy BLK parser for data_converter.py."""

from __future__ import annotations

import datetime
import os
import re
from pathlib import Path

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


def parse_blk_tag_content(content_str, key_hint=""):
    items = [item.strip() for item in content_str.strip().split('\n') if item.strip()]
    if not items: return None

    if key_hint in ["model", "source", "name", "chassis", "variant"] or "manufacturer" in key_hint: # Ensure these are strings
        return " ".join(items)

    processed_items = []
    for item in items:
        if item.lower() == "true": processed_items.append(True)
        elif item.lower() == "false": processed_items.append(False)
        # Avoid converting MUL IDs or version strings like "2.0" to int/float unless contextually appropriate
        elif re.fullmatch(r"-?\d+", item) and key_hint not in ["id", "mulid", "version", "source", "model"]:
             processed_items.append(int(item))
        elif re.fullmatch(r"-?\d+\.\d+", item) and key_hint not in ["version", "source", "model"]:
            try: processed_items.append(float(item))
            except ValueError: processed_items.append(item)
        else: processed_items.append(item)
    return processed_items[0] if len(processed_items) == 1 else processed_items


def parse_blk_file(filepath, output_dir_for_log):
    derived_equipment_accumulator = [] # To store (item_name, item_type, unit_tech_base, intro_year, source_file)
    content = ""; data = {}; base_filename = os.path.basename(filepath)
    unit_type_from_file = "unknown"
    path_lower = filepath.lower()
    if "vehicle" in path_lower: unit_type_from_file = "vehicle"
    elif "fighter" in path_lower and "convfighter" not in path_lower : unit_type_from_file = "fighter"
    elif "convfighter" in path_lower: unit_type_from_file = "conventionalfighter"
    elif "dropship" in path_lower: unit_type_from_file = "dropship"
    elif "smallcraft" in path_lower: unit_type_from_file = "smallcraft"
    elif "warship" in path_lower: unit_type_from_file = "warship"
    elif "battlearmor" in path_lower: unit_type_from_file = "battlearmor"
    elif "protomek" in path_lower: unit_type_from_file = "protomek"
    elif "infantry" in path_lower: unit_type_from_file = "infantry"
    elif "gunemplacement" in path_lower or "/ge/" in path_lower : unit_type_from_file = "gunemplacement"
    elif "battlemech" in path_lower or "/mek/" in path_lower: unit_type_from_file = "battlemech" # Default if path contains /mek/


    file_era = get_year_from_path(filepath)
    file_tech_base = "Inner Sphere"
    if "clan" in path_lower: file_tech_base = "Clan"

    try:
        with open(filepath, 'r', encoding='latin-1', errors='ignore') as f: content = f.read()
        content = re.sub(r"<!--.*?-->", "", content, flags=re.DOTALL)
        content = re.sub(r"#ifs?.*?#endifs?", "", content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r"#.*?(\r?\n|$)", "", content) # More careful comment removal

        type_tag_match = re.search(r"<type>([^<]+)</type>", content, flags=re.IGNORECASE)
        if type_tag_match:
            type_val_str = type_tag_match.group(1).strip().lower()
            # More specific type inference from <type> tag
            if "vehicle" in type_val_str: unit_type_from_file = "vehicle"
            elif "battlemech" in type_val_str or " biped" in type_val_str : unit_type_from_file = "battlemech"
            elif "fighter" in type_val_str and "conventional" not in type_val_str: unit_type_from_file = "fighter"
            elif "conventionalfighter" in type_val_str: unit_type_from_file = "conventionalfighter"
            elif "battlearmor" in type_val_str: unit_type_from_file = "battlearmor"
            elif "protomek" in type_val_str: unit_type_from_file = "protomek"
            elif "infantry" in type_val_str: unit_type_from_file = "infantry"
            elif "dropship" in type_val_str: unit_type_from_file = "dropship"
            elif "smallcraft" in type_val_str: unit_type_from_file = "smallcraft"
            elif "warship" in type_val_str: unit_type_from_file = "warship"
            # Tech base from type tag
            if "clan" in type_val_str: file_tech_base = "Clan"
            elif "inner sphere" in type_val_str or "is " in type_val_str : file_tech_base = "Inner Sphere"
            elif "mixed" in type_val_str: file_tech_base = "Mixed"

        year_tag_match = re.search(r"<year>([^<]+)</year>", content, flags=re.IGNORECASE)
        if year_tag_match:
            year_val = year_tag_match.group(1).strip()
            try: file_era = int(year_val)
            except ValueError: file_era = year_val
        else:
            orig_year_match = re.search(r"<originalBuildYear>([^<]+)</originalBuildYear>", content, flags=re.IGNORECASE)
            if orig_year_match:
                year_val = orig_year_match.group(1).strip()
                try: file_era = int(year_val)
                except ValueError: file_era = year_val

        pattern = re.compile(r"<([a-zA-Z0-9_ :.-]+?)>([\s\S]*?)</\s*\s*>", flags=re.IGNORECASE) # Allow . and - in tag names
        for match in pattern.finditer(content):
            tag, value_str = match.groups()
            key = tag.strip().lower().replace(" ", "_").replace(":", "").replace(".","").replace("-","") # Normalize key
            parsed_value = parse_blk_tag_content(value_str, key)

            if key == "mass" and isinstance(parsed_value, str):
                try: parsed_value = int(parsed_value)
                except ValueError:
                    try: parsed_value = float(parsed_value)
                    except ValueError: pass

            if key == "grav_decks":
                if isinstance(parsed_value, list) and len(parsed_value) > 0:
                    try: data[key] = int(parsed_value[0])
                    except (ValueError, TypeError): data[key] = 0
                elif isinstance(parsed_value, (int, float)): data[key] = int(parsed_value)
                else: data[key] = 0
                continue

            if key == "armor":
                armor_type_str = data.get("armortype", "Standard Armor")
                armor_obj = {"type": armor_type_str, "manufacturer": None, "locations": [], "total_armor_points": 0}

                location_map = []
                if "vehicle" in unit_type_from_file: location_map = VEHICLE_ARMOR_LOCATIONS
                elif "fighter" in unit_type_from_file or "smallcraft" in unit_type_from_file or "dropship" in unit_type_from_file or "conventionalfighter" in unit_type_from_file: location_map = FIGHTER_ARMOR_LOCATIONS
                elif "vtol" in unit_type_from_file: location_map = VTOL_ARMOR_LOCATIONS

                raw_armor_values = []
                if isinstance(parsed_value, list): raw_armor_values = parsed_value
                elif parsed_value is not None: raw_armor_values = [parsed_value]

                total_armor = 0
                if "battlearmor" in unit_type_from_file and len(raw_armor_values) == 1:
                     try: armor_obj["armor_points_per_trooper"] = int(raw_armor_values[0]); total_armor = int(raw_armor_values[0])
                     except (ValueError, TypeError): pass
                elif location_map and raw_armor_values: # Ensure there's a map and values
                    for i, val_str in enumerate(raw_armor_values):
                        if i < len(location_map):
                            try: points = int(val_str); total_armor += points
                            except (ValueError, TypeError): points = 0
                            armor_obj["locations"].append({"location": location_map[i], "armor_points": points})
                        else:
                            try: points = int(val_str); total_armor += points
                            except (ValueError, TypeError): points = 0
                            armor_obj["locations"].append({"location": f"Extra_{i}", "armor_points": points})
                elif raw_armor_values: # No map, but values exist (e.g. single overall value)
                    try: points = int(raw_armor_values[0]); total_armor = points
                    except (ValueError,TypeError): points = 0
                    armor_obj["locations"].append({"location": "Overall", "armor_points": points})


                if total_armor > 0 : armor_obj["total_armor_points"] = total_armor
                data[key] = armor_obj
                if "armortype" in data and key == "armor": data.pop("armortype")
                continue

            if key in data:
                if not isinstance(data[key], list): data[key] = [data[key]]
                if isinstance(parsed_value, list): data[key].extend(parsed_value)
                else: data[key].append(parsed_value)
            else: data[key] = parsed_value

        # Process manufacturers ensuring it's a list of objects
        manufacturer_keys = ["manufacturer", "primaryfactory", "factory"] # Add other relevant keys if any
        final_manufacturers_list = []
        for m_key in manufacturer_keys:
            if m_key in data:
                m_values = data.pop(m_key) # Remove original string/list
                if not isinstance(m_values, list):
                    m_values = [m_values]
                for val in m_values:
                    if isinstance(val, str):
                         # Handle comma-separated values within a single manufacturer string
                        for s_val in val.split(','):
                            s_val_stripped = s_val.strip()
                            if s_val_stripped:
                                final_manufacturers_list.append({"name": s_val_stripped})
                    # If it's already an object (though current parsing makes it string), it could be handled here
        if final_manufacturers_list:
            # Ensure no duplicates if multiple keys contribute the same manufacturer
            unique_manufacturers = []
            seen_names = set()
            for man_obj in final_manufacturers_list:
                if man_obj["name"] not in seen_names:
                    unique_manufacturers.append(man_obj)
                    seen_names.add(man_obj["name"])
            data["manufacturers"] = unique_manufacturers

        # Process 'config' field (improved logic)
        if "config" in data:
            parsed_value = data["config"]
            if isinstance(parsed_value, str):
                config_val_lower = parsed_value.lower()
                if "biped" in config_val_lower: data["config"] = "Biped"
                elif "quad" in config_val_lower: data["config"] = "Quad"
                elif "tripod" in config_val_lower: data["config"] = "Tripod"
                else: data["config"] = None
            elif isinstance(parsed_value, list): # If it was parsed as a list of strings
                # Try to find a mappable config in the list, prioritizing Biped > Quad > Tripod
                found_config = None
                for item_str in parsed_value:
                    if isinstance(item_str, str):
                        item_lower = item_str.lower()
                        if "biped" in item_lower: found_config = "Biped"; break
                        if "quad" in item_lower and not found_config: found_config = "Quad"
                        if "tripod" in item_lower and not found_config: found_config = "Tripod"
                data["config"] = found_config # Will be None if no keywords found
            else: # If it's neither string nor list of strings that we can interpret
                data["config"] = None
        # If "config" was not in data at all, it remains absent, implying null in schema



        data['era'] = file_era
        data['tech_base'] = file_tech_base
        if 'type' not in data or data.get('type') == 'unknown' : data['type'] = unit_type_from_file # Ensure type is set

        equipment_tags = ["equipment", "body_equipment", "right_arm_equipment", "left_arm_equipment", "right_leg_equipment", "left_leg_equipment", "head_equipment", "center_torso_equipment", "right_torso_equipment", "left_torso_equipment", "nose_equipment", "left_wing_equipment", "right_wing_equipment", "aft_equipment"]
        all_items_for_derived = []
        unit_model_name_for_blk = data.get('model', "") # Get model name for checking

        for tag_name in equipment_tags:
            if tag_name in data:
                # It's important that data[tag_name] isn't modified if it's needed later for specific output structures
                # For derived_equipment, we just extract names.
                items_source = data[tag_name]
                if not isinstance(items_source, list): items_source = [items_source]

                for item_entry in items_source:
                    item_name_candidate = None
                    if isinstance(item_entry, str) and item_entry.lower() != "empty":
                        item_name_candidate = item_entry.split('(')[0].strip()
                    elif isinstance(item_entry, dict) and 'name' in item_entry and item_entry['name'].lower() != 'empty':
                        item_name_candidate = item_entry['name'].split('(')[0].strip()

                    if item_name_candidate:
                        # Fix for model name appearing as equipment
                        if unit_model_name_for_blk and item_name_candidate == unit_model_name_for_blk:
                            pass # Skip adding model name as equipment
                        else:
                            all_items_for_derived.append(item_name_candidate)

        for item_name_on_unit in set(all_items_for_derived): # Use set to get unique names
            item_type_for_blk = get_blk_item_type_from_name(item_name_on_unit)
            derived_equipment_accumulator.append((item_name_on_unit, item_type_for_blk, file_tech_base, file_era, base_filename))

        # Review point 5: weapons_and_equipment item_type in parse_blk_file
        # Current logic in parse_blk_file does not directly populate a structured 'weapons_and_equipment' list in 'data'.
        # It extracts equipment names into flat lists under keys like 'body_equipment', 'right_arm_equipment', etc.
        # These names are then added to 'derived_equipment_accumulator' with type "Unknown".
        # This is acceptable as per the subtask instructions. No change needed here for schema compliance of item_type
        # unless the script was also building a data["weapons_and_equipment"] list for the JSON output here.

        if "structure" in data and isinstance(data["structure"], str): data["structure"] = {"type": data["structure"], "manufacturer": None}
        if "myomer" in data and isinstance(data["myomer"], str): data["myomer"] = {"type": data["myomer"].strip(), "manufacturer": None}
        if "engine" in data and isinstance(data["engine"], str):
            engine_type_str = data["engine"]; rating_match = re.search(r'(\d+)', engine_type_str)
            rating = int(rating_match.group(1)) if rating_match else 0
            engine_type = engine_type_str.replace(str(rating), "").strip() if rating else engine_type_str
            data["engine"] = {"type": engine_type, "rating": rating, "manufacturer": None}
        if "heat_sinks" in data:
            hs_val = data["heat_sinks"]
            if isinstance(hs_val, str):
                hs_str = hs_val; count_match = re.search(r'(\d+)', hs_str)
                count = int(count_match.group(1)) if count_match else 0
                hs_type = hs_str.replace(str(count), "").strip() if count else hs_str
                data["heat_sinks"] = {"count": count, "type": hs_type}
            elif isinstance(hs_val, int): data["heat_sinks"] = {"count": hs_val, "type": "Unknown"}

        data.setdefault("quirks", [])
        if isinstance(data["quirks"], str): data["quirks"] = [data["quirks"]]

        if "model" in data and isinstance(data["model"], list) and len(data["model"]) == 1: data["model"] = data["model"][0]
        elif "model" in data and isinstance(data["model"], list) and not data["model"]: data["model"] = None


    except Exception as e:
        log_skipped_file(filepath, f"BLK Parsing Error: {e}", output_dir_for_log); return None, []
    return data, derived_equipment_accumulator
