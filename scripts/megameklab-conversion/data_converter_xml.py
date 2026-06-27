import os
import re
import xml.etree.ElementTree as ET

from data_converter_helpers import log_skipped_file


def parse_xml_file(filepath, output_dir_for_log):
    derived_equipment_accumulator = []
    data_for_json = {}
    source_file_basename = os.path.basename(filepath)

    equipment_categories_tags = [
        "ammos", "battlearmorequips", "battlearmorweapons", "bombs",
        "engines", "equipments", "gyros", "heatsinks", "jumpjets",
        "physicalweapons", "structures", "targetingcomputers", "weapons",
    ]

    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        data_for_json[root.tag] = {}

        for category_element in root:
            category_tag_name = category_element.tag
            data_for_json[root.tag][category_tag_name] = {}

            if not list(category_element):
                data_for_json[root.tag][category_tag_name] = (
                    category_element.text.strip() if category_element.text else ""
                )

            for item_element in category_element:
                item_tag_name = item_element.tag
                entity_data = {}

                item_name_text = "Unknown Name"
                tech_base = "Unknown"
                intro_year_val = "Unknown"
                item_type_val = item_tag_name

                for option_elem in item_element:
                    option_tag = option_elem.tag
                    text_content = option_elem.text.strip() if option_elem.text else ""

                    if option_tag == "ceilWeight":
                        entity_data[option_tag] = {
                            cw_elem.tag: cw_elem.text.strip()
                            for cw_elem in option_elem
                        }
                    elif option_tag == "ignoreFailedEquipment":
                        entity_data[option_tag] = [e.strip() for e in text_content.split(",")] if text_content else []
                    else:
                        if text_content.lower() == "true":
                            entity_data[option_tag] = True
                        elif text_content.lower() == "false":
                            entity_data[option_tag] = False
                        elif re.fullmatch(r"-?\d+", text_content):
                            entity_data[option_tag] = int(text_content)
                        elif re.fullmatch(r"-?\d+\.\d+", text_content):
                            try:
                                entity_data[option_tag] = float(text_content)
                            except ValueError:
                                entity_data[option_tag] = text_content
                        else:
                            entity_data[option_tag] = text_content

                    if option_tag == "name":
                        item_name_text = text_content
                    elif option_tag == "techlevel":
                        if text_content == "0":
                            tech_base = "Inner Sphere"
                        elif text_content == "1":
                            tech_base = "Clan"
                        elif text_content == "2":
                            tech_base = "Mixed"
                        else:
                            tech_base = text_content
                    elif option_tag == "introyear":
                        intro_year_val = int(text_content) if text_content.isdigit() else text_content
                    elif option_tag == "type" and item_tag_name.lower() in ["weapon", "equipment", "ammo"]:
                        if text_content:
                            item_type_val = text_content.replace(" ", "")

                if item_name_text != "Unknown Name" and item_name_text:
                    data_for_json[root.tag][category_tag_name][item_name_text] = entity_data
                else:
                    data_for_json[root.tag][category_tag_name].setdefault(item_tag_name, []).append(entity_data)

                if category_tag_name in equipment_categories_tags:
                    if item_name_text and item_name_text != "Unknown Name" and item_name_text != "-":
                        item_type_val_clean = re.sub(r"[^a-zA-Z0-9]", "", item_type_val.title())
                        derived_equipment_accumulator.append((
                            item_name_text,
                            item_type_val_clean,
                            tech_base,
                            intro_year_val,
                            source_file_basename,
                        ))
        return data_for_json, derived_equipment_accumulator
    except Exception as e:
        log_skipped_file(filepath, f"XML Processing Error: {e}", output_dir_for_log)
        return None, []
