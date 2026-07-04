"""
MTF to ISerializedUnit Converter

Converts MegaMek MTF (MegaMek Text Format) files to JSON format compatible
with the ISerializedUnit TypeScript interface.

This is the new converter that outputs data-driven JSON for the megamek-web
application. It replaces the legacy data_converter.py for BattleMech files.

Usage:
    python mtf_converter.py --source /path/to/mekfiles/meks --output /path/to/output
"""

import os
import json
import re
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union
from enum_mappings import (
    map_tech_base,
    map_rules_level,
    map_engine_type,
    map_gyro_type,
    map_cockpit_type,
    map_structure_type,
    map_armor_type,
    map_heat_sink_type,
    map_mech_location,
    map_mech_config,
    map_year_to_era,
    map_unit_type,
    generate_id_from_name,
    normalize_equipment_id,
    get_era_folder_name,
    get_rules_level_folder_name,
)
from mtf_serialized_models import (
    SerializedArmor,
    SerializedEngine,
    SerializedEquipment,
    SerializedFluff,
    SerializedGyro,
    SerializedHeatSinks,
    SerializedMovement,
    SerializedStructure,
    SerializedUnit,
)

from mtf_parser import MTFParser


def should_preserve_trailing_newline(output_path: Union[str, Path]) -> bool:
    """Return true when an existing generated file already ends with a newline."""
    try:
        with open(output_path, 'rb') as existing_file:
            existing_file.seek(0, os.SEEK_END)
            if existing_file.tell() == 0:
                return False
            existing_file.seek(-1, os.SEEK_END)
            return existing_file.read(1) == b'\n'
    except OSError:
        return False


def write_json_file(output_path: Union[str, Path], data: Any) -> None:
    """Write converter JSON while preserving existing EOF newline style."""
    json_path = Path(output_path)
    preserve_trailing_newline = should_preserve_trailing_newline(json_path)

    os.makedirs(json_path.parent, exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        if preserve_trailing_newline:
            f.write('\n')


def convert_mtf_file(input_path: str, output_path: str) -> bool:
    """Convert a single MTF file to JSON."""
    parser = MTFParser()
    unit = parser.parse_file(input_path)
    
    if unit is None:
        return False
    
    # Convert dataclasses to dicts
    unit_dict = dataclass_to_dict(unit)
    
    # Write JSON
    write_json_file(output_path, unit_dict)
    
    return True


def dataclass_to_dict(obj: Any) -> Any:
    """Convert dataclass instances to dictionaries recursively."""
    if hasattr(obj, '__dataclass_fields__'):
        result = {}
        for field_name in obj.__dataclass_fields__:
            value = getattr(obj, field_name)
            converted = dataclass_to_dict(value)
            # Skip None values to keep JSON clean
            if converted is not None:
                result[field_name] = converted
        return result
    elif isinstance(obj, list):
        return [dataclass_to_dict(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: dataclass_to_dict(v) for k, v in obj.items()}
    else:
        return obj


def convert_directory(source_dir: str, output_dir: str, era_filter: Optional[str] = None) -> Tuple[int, int]:
    """
    Convert all MTF files in a directory.
    
    Files are organized by Era -> Rules Level:
    - succession-wars/standard/Atlas AS7-D.json
    - clan-invasion/advanced/Mad Cat Prime.json
    
    Returns tuple of (successful, failed) counts.
    """
    success_count = 0
    fail_count = 0
    
    source_path = Path(source_dir)
    output_path = Path(output_dir)
    parser = MTFParser()
    
    for mtf_file in source_path.rglob('*.mtf'):
        try:
            # Parse the file to get era and rules level
            unit = parser.parse_file(str(mtf_file))
            
            if unit is None:
                fail_count += 1
                print(f"Failed to parse: {mtf_file}")
                continue
            
            # Get era folder from unit's year
            era_folder = get_era_folder_name(unit.era)
            
            # Get rules level folder
            rules_folder = get_rules_level_folder_name(unit.rulesLevel)
            
            # Apply era filter if specified
            if era_filter and era_filter.lower() not in era_folder.lower():
                continue
            
            # Build output path: era/rules_level/filename.json
            # Sanitize filename to replace invalid characters
            safe_name = f"{unit.chassis} {unit.model}"
            # Replace characters that are invalid in filenames
            for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
                safe_name = safe_name.replace(char, '-')
            json_filename = f"{safe_name}.json"
            json_file = output_path / era_folder / rules_folder / json_filename
            
            # Convert dataclasses to dicts
            unit_dict = dataclass_to_dict(unit)
            
            # Write JSON
            write_json_file(json_file, unit_dict)
            
            success_count += 1
            
        except Exception as e:
            fail_count += 1
            print(f"Failed: {mtf_file} - {e}")
    
    return success_count, fail_count


def generate_index(output_dir: str) -> Dict[str, Any]:
    """Generate an index.json for all converted units."""
    output_path = Path(output_dir)
    units: List[Dict[str, Any]] = []
    
    for json_file in output_path.rglob('*.json'):
        if json_file.name == 'index.json':
            continue
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                unit_data = json.load(f)
            
            # Create index entry
            relative_path = json_file.relative_to(output_path)
            units.append({
                'id': unit_data.get('id', ''),
                'chassis': unit_data.get('chassis', ''),
                'model': unit_data.get('model', ''),
                'tonnage': unit_data.get('tonnage', 0),
                'techBase': unit_data.get('techBase', ''),
                'year': unit_data.get('year', 0),
                'role': unit_data.get('role', ''),
                'rulesLevel': unit_data.get('rulesLevel', ''),
                'path': str(relative_path).replace('\\', '/')
            })
        except Exception as e:
            print(f"Error indexing {json_file}: {e}")
    
    # Sort by chassis then model
    units.sort(key=lambda x: (x['chassis'], x['model']))
    
    index = {
        'version': '1.0.0',
        'generatedAt': __import__('datetime').datetime.now().isoformat(),
        'totalUnits': len(units),
        'units': units
    }
    
    # Write index
    index_path = output_path / 'index.json'
    write_json_file(index_path, index)
    
    return index


def main():
    parser = argparse.ArgumentParser(description='Convert MTF files to JSON')
    parser.add_argument('--source', '-s', required=True, help='Source directory containing MTF files')
    parser.add_argument('--output', '-o', required=True, help='Output directory for JSON files')
    parser.add_argument('--era', '-e', help='Filter by era folder name')
    parser.add_argument('--generate-index', '-i', action='store_true', help='Generate index.json after conversion')
    
    args = parser.parse_args()
    
    print(f"Converting MTF files from: {args.source}")
    print(f"Output directory: {args.output}")
    
    success, failed = convert_directory(args.source, args.output, args.era)
    
    print(f"\nConversion complete:")
    print(f"  Successful: {success}")
    print(f"  Failed: {failed}")
    
    if args.generate_index:
        print("\nGenerating index...")
        index = generate_index(args.output)
        print(f"Index generated with {index['totalUnits']} units")


if __name__ == '__main__':
    main()
