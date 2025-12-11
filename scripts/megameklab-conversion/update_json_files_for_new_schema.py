#!/usr/bin/env python3
"""
Script to update all converted JSON files to match the new schema requirements.
Adds tech_base fields to equipment items and OmniMech-specific fields.
"""

import os
import json
import re
from pathlib import Path

# Base directory for the converted files
CONVERTED_DIR = Path("mekstation-app/data/megameklab_converted_output/mekfiles")

def determine_equipment_tech_base(item_name: str, unit_tech_base: str) -> str:
    """
    Determine the technology base for an equipment item based on naming patterns.
    """
    item_lower = item_name.lower()
    
    # Clear Inner Sphere indicators
    if any(pattern in item_lower for pattern in [
        'is', 'inner sphere', 'autocannon', 'ac/', 'ac1', 'ac2', 'ac5', 'ac10', 'ac20',
        'standard', 'medium laser', 'large laser', 'small laser', 'ppc',
        'lrm', 'srm', 'machine gun', 'flamer'
    ]) and not any(clan_pattern in item_lower for clan_pattern in ['cl', 'er ', 'ultra', 'lb ', 'streak']):
        return "IS"
    
    # Clear Clan indicators  
    if any(pattern in item_lower for pattern in [
        'cl', 'clan', 'er ', 'ultra', 'lb ', 'streak', 'gauss'
    ]):
        return "Clan"
    
    # Special cases for equipment that could be either
    if any(pattern in item_lower for pattern in [
        'heat sink', 'double heat sink', 'jump jet', 'case'
    ]):
        # Use unit's primary tech base
        if unit_tech_base == "Clan" or "clan chassis" in unit_tech_base.lower():
            return "Clan" 
        else:
            return "IS"
    
    # Ammo typically follows the weapon tech base
    if 'ammo' in item_lower:
        # Try to determine from ammo type
        if any(clan_ammo in item_lower for clan_ammo in ['er', 'ultra', 'lb', 'streak']):
            return "Clan"
        else:
            return "IS"
    
    # Default based on unit tech base
    if unit_tech_base == "Clan" or "clan chassis" in unit_tech_base.lower():
        return "Clan"
    else:
        return "IS"

def determine_omnimech_info(unit_data: dict) -> dict:
    """
    Determine OmniMech-specific information from unit data.
    """
    config = unit_data.get('config', '')
    model = unit_data.get('model', '')
    chassis = unit_data.get('chassis', '')
    clanname = unit_data.get('clanname', '')
    
    omnimech_info = {}
    
    # Check if it's an OmniMech
    is_omnimech = 'omnimech' in config.lower()
    
    if is_omnimech:
        omnimech_info['is_omnimech'] = True
        
        # Determine base chassis - prefer clanname if available
        base_chassis = clanname if clanname else chassis
        omnimech_info['omnimech_base_chassis'] = base_chassis
        
        # Determine configuration variant
        if model:
            # Handle variants like "Prime", "A", "B", etc.
            variant_patterns = [
                r'\b(Prime)\b',
                r'\b([A-Z])\b(?!.*\d)',  # Single letter variants
                r'\b(\d+)\b'  # Numeric variants
            ]
            
            for pattern in variant_patterns:
                match = re.search(pattern, model)
                if match:
                    omnimech_info['omnimech_configuration'] = match.group(1)
                    break
            
            # Fallback - use the model as configuration if no pattern matched
            if 'omnimech_configuration' not in omnimech_info:
                omnimech_info['omnimech_configuration'] = model
    
    return omnimech_info

def is_equipment_omnipod(item_name: str, unit_data: dict) -> bool:
    """
    Determine if equipment is pod-mounted (for OmniMechs).
    For now, assume most weapons are pod-mounted on OmniMechs,
    but structure, engine, etc. are fixed.
    """
    if not unit_data.get('is_omnimech', False):
        return False
    
    # Fixed equipment that's never pod-mounted
    fixed_equipment = [
        'engine', 'structure', 'heat sink', 'jump jet', 
        'life support', 'sensors', 'cockpit'
    ]
    
    item_lower = item_name.lower()
    if any(fixed in item_lower for fixed in fixed_equipment):
        return False
    
    # Most weapons and ammo are pod-mounted on OmniMechs
    return True

def update_unit_file(file_path: Path):
    """
    Update a single unit JSON file with new schema requirements.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            unit_data = json.load(f)
        
        # Track if we made any changes
        changed = False
        
        # Add OmniMech information
        omnimech_info = determine_omnimech_info(unit_data)
        if omnimech_info:
            for key, value in omnimech_info.items():
                if key not in unit_data:
                    unit_data[key] = value
                    changed = True
        
        # Update weapons and equipment
        if 'weapons_and_equipment' in unit_data:
            unit_tech_base = unit_data.get('tech_base', 'Inner Sphere')
            
            for item in unit_data['weapons_and_equipment']:
                # Add tech_base if missing
                if 'tech_base' not in item:
                    item['tech_base'] = determine_equipment_tech_base(
                        item.get('item_name', ''), 
                        unit_tech_base
                    )
                    changed = True
                
                # Add is_omnipod if missing and it's an OmniMech
                if 'is_omnipod' not in item:
                    item['is_omnipod'] = is_equipment_omnipod(
                        item.get('item_name', ''), 
                        unit_data
                    )
                    changed = True
        
        # Save the file if we made changes
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(unit_data, f, indent=2, ensure_ascii=False)
            print(f"Updated: {file_path}")
            return True
        
        return False
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def update_all_unit_files():
    """
    Update all unit JSON files in the converted directory.
    """
    total_files = 0
    updated_files = 0
    
    # Process all JSON files recursively
    for root, dirs, files in os.walk(CONVERTED_DIR):
        for file in files:
            if file.endswith('.json') and file not in ['derivedEquipment.json', 'UnitVerifierOptions.json']:
                file_path = Path(root) / file
                total_files += 1
                
                if update_unit_file(file_path):
                    updated_files += 1
                
                # Progress indicator
                if total_files % 100 == 0:
                    print(f"Processed {total_files} files, updated {updated_files}")
    
    print(f"\nCompleted: {total_files} files processed, {updated_files} files updated")

def validate_sample_files():
    """
    Validate a few sample files to ensure updates are working correctly.
    """
    sample_files = [
        "meks/3050U/Annihilator ANH-1A.json",
        "meks/3050U/Black Hawk (Nova) Prime.json",
        "meks/3050U/Daishi (Dire Wolf) Prime.json"
    ]
    
    print("Validating sample files:")
    for sample_file in sample_files:
        file_path = CONVERTED_DIR / sample_file
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    unit_data = json.load(f)
                
                # Check if equipment has tech_base
                equipment_valid = True
                if 'weapons_and_equipment' in unit_data:
                    for item in unit_data['weapons_and_equipment']:
                        if 'tech_base' not in item:
                            equipment_valid = False
                            break
                
                # Check OmniMech fields
                config = unit_data.get('config', '')
                is_omnimech = 'omnimech' in config.lower()
                omnimech_valid = True
                
                if is_omnimech:
                    if 'is_omnimech' not in unit_data:
                        omnimech_valid = False
                
                status = "✅" if equipment_valid and omnimech_valid else "❌"
                print(f"  {status} {sample_file}")
                
                if not equipment_valid:
                    print(f"    ❌ Missing equipment tech_base fields")
                if is_omnimech and not omnimech_valid:
                    print(f"    ❌ Missing OmniMech fields")
                    
            except Exception as e:
                print(f"  ❌ {sample_file} - Error: {e}")
        else:
            print(f"  ❌ {sample_file} - File not found")

if __name__ == "__main__":
    print("Starting JSON file updates for new schema...")
    
    # Check if the directory exists
    if not CONVERTED_DIR.exists():
        print(f"Error: Directory {CONVERTED_DIR} does not exist")
        exit(1)
    
    # Validate before updates
    print("\nBefore updates:")
    validate_sample_files()
    
    # Perform updates
    print(f"\nUpdating files in {CONVERTED_DIR}...")
    update_all_unit_files()
    
    # Validate after updates  
    print("\nAfter updates:")
    validate_sample_files()
    
    print("\nUpdate complete!")
