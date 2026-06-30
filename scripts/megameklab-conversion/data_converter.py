import os
import json
import re
from pathlib import Path
import datetime
import multiprocessing

from data_converter_helpers import (
    DERIVED_EQUIPMENT,
    FIGHTER_ARMOR_LOCATIONS,
    SKIPPED_FILES_LOG,
    VEHICLE_ARMOR_LOCATIONS,
    VTOL_ARMOR_LOCATIONS,
    add_to_derived_equipment,
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
from data_converter_xml import parse_xml_file
from data_converter_blk import parse_blk_file
from data_converter_mtf import parse_mtf_file

# Worker function for multiprocessing
def _process_file_worker(args_tuple):
    filepath, base_output_dir, mekfiles_output_dir, root_dir_for_relative_path = args_tuple

    processed_count = 0
    derived_equipment_for_worker = []
    skipped_file_info = None # Tuple: (filepath, reason, output_dir_for_log)

    filename = os.path.basename(filepath)

    # Calculate relative_path for structuring output correctly
    if root_dir_for_relative_path:
        relative_path = os.path.relpath(filepath, root_dir_for_relative_path)
    else:
        # Fallback: use filename directly, implies output files are flat in mekfiles_output_dir
        # This might happen if root_dir_for_relative_path is not passed, though it should be.
        relative_path = Path(filename)

    # Ensure the output directory for the JSON file exists
    # output_filepath_json needs to include any subdirectories from relative_path
    output_json_dir = os.path.dirname(os.path.join(mekfiles_output_dir, relative_path))
    # os.makedirs(output_json_dir, exist_ok=True) # Worker should not create dirs, main process should pre-create.
                                                # Let's assume mekfiles_output_dir and its subdirs are prepped by main.
                                                # For now, save_to_json handles os.makedirs for the direct parent.

    output_filepath_json = os.path.join(mekfiles_output_dir, Path(relative_path).with_suffix('.json'))

    parsed_data = None
    # parse_error_occurred is used to avoid double-logging skips if the parser itself logs it.
    parse_error_occurred = False

    if filename.lower().endswith(".mtf"):
        parsed_data, derived_eq = parse_mtf_file(filepath, base_output_dir)
        if parsed_data:
            derived_equipment_for_worker.extend(derived_eq)
        else: # Error in parsing, assumed to be logged by parse_mtf_file
            parse_error_occurred = True
    elif filename.lower().endswith(".blk"):
        parsed_data, derived_eq = parse_blk_file(filepath, base_output_dir)
        if parsed_data:
            derived_equipment_for_worker.extend(derived_eq)
        else: # Error in parsing, assumed to be logged by parse_blk_file
            parse_error_occurred = True
    elif filename.lower() == "unitverifieroptions.xml":
        # For this specific file, the output path is fixed relative to mekfiles_output_dir
        output_filepath_json = os.path.join(mekfiles_output_dir, "UnitVerifierOptions.json")
        parsed_data, derived_eq = parse_xml_file(filepath, base_output_dir) # Expects two values now
        if parsed_data:
            derived_equipment_for_worker.extend(derived_eq)
        else: # Error in parsing, assumed to be logged by parse_xml_file
            parse_error_occurred = True

    # This part for non-MTF/BLK/XML files might need adjustment if other XMLs are to be processed for derived_equipment
    # For now, only unitverifieroptions.xml is handled by parse_xml_file explicitly for derived_equipment.


    if parsed_data:
        # Ensure the specific directory for this JSON exists before saving
        # This is important if relative_path contains subdirectories
        os.makedirs(os.path.dirname(output_filepath_json), exist_ok=True)
        save_to_json(parsed_data, output_filepath_json, base_output_dir)
        processed_count = 1
    elif not parse_error_occurred and not filename.lower().endswith(
        ('.png', '.gif', '.jpg', '.jpeg', '.svg', '.txt', '.html', '.xml~',
         '.psd', '.md', '.pdf', '.doc', '.docx', '.zip', '.log', '.jar',
         '.xsl', '.css', '.js', '.tif', '.tiff', '.bmp', '.datasheet',
         '.bk2', '.लक', '.dat', '.mmf')
        ):
        # This file wasn't processed by any specific parser, no error was logged by them,
        # and it's not in the general skip list.
        # We need to record this skip to be logged by the main process.
        # Exception: unitverifieroptions.xml, if it failed parsing, parse_error_occurred would be true.
        # If it's some other XML, it would fall here.
        if not (filename.lower() == "unitverifieroptions.xml" and parse_error_occurred) :
             skipped_file_info = (filepath, "Unsupported file type or error during processing.", base_output_dir)

    return {
        "processed_count": processed_count,
        "derived_equipment": derived_equipment_for_worker,
        "skipped_file_info": skipped_file_info
    }

def save_to_json(data, output_filepath, output_dir_for_log):
    try:
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        with open(output_filepath, 'w', encoding='utf-8') as f: json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving JSON to {output_filepath}: {e}")
        log_skipped_file(output_filepath, f"JSON Save Error: {e}", output_dir_for_log)

def process_files(root_dir, base_output_dir):
    total_processed_count = 0
    all_derived_equipment_tuples = []
    files_to_process_args_list = []

    mekfiles_output_dir = os.path.join(base_output_dir, "mekfiles")
    # No need to os.makedirs for mekfiles_output_dir here,
    # _process_file_worker -> save_to_json will create subdirectories as needed for each file.
    # However, the main mekfiles_output_dir itself should exist.
    os.makedirs(mekfiles_output_dir, exist_ok=True)

    # Collect all filepaths and arguments for the worker
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            # The worker needs: filepath, base_output_dir, mekfiles_output_dir, root_dir (for relpath calc)
            files_to_process_args_list.append((filepath, base_output_dir, mekfiles_output_dir, root_dir))

    # Use multiprocessing Pool
    # num_processes = multiprocessing.cpu_count() # Use all available CPUs
    # Using a fixed number for now for stability, can be tuned. e.g. max(1, num_processes -1 )
    num_processes = multiprocessing.cpu_count()

    print(f"Starting processing with {num_processes} workers...")

    results = []
    # Consider using imap_unordered for large number of files for better memory usage and progress feedback
    # For simplicity, using map for now.
    with multiprocessing.Pool(processes=num_processes) as pool:
        results = pool.map(_process_file_worker, files_to_process_args_list)

    # Process results from workers
    for result in results:
        if result: # Ensure result is not None, though workers should always return a dict
            total_processed_count += result["processed_count"]
            all_derived_equipment_tuples.extend(result["derived_equipment"])
            if result["skipped_file_info"]:
                # skipped_file_info is (filepath, reason, output_dir_for_log)
                log_skipped_file(result["skipped_file_info"][0], result["skipped_file_info"][1], result["skipped_file_info"][2])

    # Populate DERIVED_EQUIPMENT from all collected tuples
    # This must be done in the main process after all workers are done.
    for equip_tuple in all_derived_equipment_tuples:
        # Ensure the tuple has the correct number of arguments for add_to_derived_equipment
        if len(equip_tuple) == 5:
            add_to_derived_equipment(equip_tuple[0], equip_tuple[1], equip_tuple[2], equip_tuple[3], equip_tuple[4])
        else:
            # Log an error or handle malformed tuples if necessary
            print(f"Warning: Malformed equipment tuple: {equip_tuple}")


    # Save the aggregated DERIVED_EQUIPMENT to JSON
    derived_equipment_path = os.path.join(mekfiles_output_dir, "derivedEquipment.json")
    # Ensure DERIVED_EQUIPMENT is not empty before trying to get values, though list() on empty dict is fine.
    save_to_json(list(DERIVED_EQUIPMENT.values()), derived_equipment_path, base_output_dir)
    print(f"Derived equipment data saved to {derived_equipment_path}")

    return total_processed_count

if __name__ == "__main__":
    fixed_output_dir_name = os.environ.get("MEGAMEKLAB_OUTPUT_DIR", "megameklab_converted_output")
    os.makedirs(fixed_output_dir_name, exist_ok=True)
    current_run_log_path = os.path.join(fixed_output_dir_name, SKIPPED_FILES_LOG)
    if os.path.exists(current_run_log_path):
        try: os.remove(current_run_log_path)
        except OSError: pass
    megameklab_data_dir = os.environ.get("MEGAMEKLAB_DATA_DIR", "megameklab/data/mekfiles") # Default path
    if not os.path.isdir(megameklab_data_dir): print(f"Error: Data directory not found: {megameklab_data_dir}")
    else:
        print(f"Starting conversion from '{megameklab_data_dir}'... Output will be in: '{fixed_output_dir_name}'")
        processed_count = process_files(megameklab_data_dir, fixed_output_dir_name)
        print(f"Processing complete. {processed_count} files converted.")
        print(f"Total unique equipment items derived: {len(DERIVED_EQUIPMENT)}")
        if os.path.exists(current_run_log_path):
            with open(current_run_log_path, 'r', encoding='utf-8') as log_f:
                num_skipped = sum(1 for _ in log_f)
                if num_skipped > 0: print(f"{num_skipped} files/items were skipped or had errors. See {current_run_log_path}")
                else:
                    try: os.remove(current_run_log_path)
                    except OSError: pass
        else: print("No files were skipped or had errors.")
    print(f"Output directory name: {fixed_output_dir_name}")
