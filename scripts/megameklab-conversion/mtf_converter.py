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
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
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
)


@dataclass
class SerializedEngine:
    """Engine configuration."""
    type: str
    rating: int


@dataclass
class SerializedGyro:
    """Gyro configuration."""
    type: str


@dataclass
class SerializedStructure:
    """Internal structure configuration."""
    type: str


@dataclass
class SerializedArmor:
    """Armor configuration."""
    type: str
    allocation: Dict[str, Any]  # Can be int or {front: int, rear: int}


@dataclass
class SerializedHeatSinks:
    """Heat sink configuration."""
    type: str
    count: int


@dataclass
class SerializedMovement:
    """Movement configuration."""
    walk: int
    jump: int
    jumpJetType: Optional[str] = None
    enhancements: Optional[List[str]] = None


@dataclass
class SerializedEquipment:
    """Mounted equipment item."""
    id: str
    location: str
    slots: Optional[List[int]] = None
    isRearMounted: Optional[bool] = None
    linkedAmmo: Optional[str] = None


@dataclass
class SerializedFluff:
    """Fluff/flavor text."""
    overview: Optional[str] = None
    capabilities: Optional[str] = None
    history: Optional[str] = None
    deployment: Optional[str] = None
    variants: Optional[str] = None
    notableUnits: Optional[str] = None
    manufacturer: Optional[str] = None
    primaryFactory: Optional[str] = None
    systemManufacturer: Optional[Dict[str, str]] = None


@dataclass
class SerializedUnit:
    """Complete serialized unit matching ISerializedUnit interface."""
    id: str
    chassis: str
    model: str
    unitType: str
    configuration: str
    techBase: str
    rulesLevel: str
    era: str
    year: int
    tonnage: int
    engine: SerializedEngine
    gyro: SerializedGyro
    cockpit: str
    structure: SerializedStructure
    armor: SerializedArmor
    heatSinks: SerializedHeatSinks
    movement: SerializedMovement
    equipment: List[SerializedEquipment]
    criticalSlots: Dict[str, List[Optional[str]]]
    variant: Optional[str] = None
    quirks: Optional[List[str]] = None
    fluff: Optional[SerializedFluff] = None
    mulId: Optional[int] = None
    role: Optional[str] = None
    source: Optional[str] = None


class MTFParser:
    """Parser for MegaMek MTF files."""
    
    # Mech locations in order
    MECH_LOCATIONS = [
        "Head", "Center Torso", "Left Torso", "Right Torso",
        "Left Arm", "Right Arm", "Left Leg", "Right Leg"
    ]
    
    def __init__(self):
        self.unknown_equipment: set = set()
    
    def parse_file(self, filepath: str) -> Optional[SerializedUnit]:
        """Parse an MTF file and return a SerializedUnit."""
        try:
            with open(filepath, 'r', encoding='latin-1', errors='ignore') as f:
                lines = f.readlines()
            
            return self._parse_lines(lines, filepath)
        except Exception as e:
            print(f"Error parsing {filepath}: {e}")
            return None
    
    def _parse_lines(self, lines: List[str], filepath: str) -> Optional[SerializedUnit]:
        """Parse MTF content lines."""
        data: Dict[str, Any] = {
            'quirks': [],
            'weapons': [],
            'criticals': {},
            'armor_allocation': {},
            'fluff': {},
            'system_manufacturers': {},
        }
        
        current_section = None
        current_section_items: List[str] = []
        in_weapons_section = False
        in_fluff = False
        current_fluff_field = None
        fluff_buffer: List[str] = []
        
        fluff_fields = ['overview', 'capabilities', 'deployment', 'history', 
                        'variants', 'notable_pilots', 'notes']
        
        for line in lines:
            line_content = line.strip()
            
            # Skip empty lines and comments
            if not line_content or line_content.startswith('#'):
                # End fluff section on empty line
                if in_fluff and fluff_buffer:
                    data['fluff'][current_fluff_field] = '\n'.join(fluff_buffer).strip()
                    fluff_buffer = []
                    in_fluff = False
                    current_fluff_field = None
                continue
            
            # Check for fluff headers
            fluff_match = False
            for field in fluff_fields:
                if line_content.lower().startswith(field + ':'):
                    if in_fluff and fluff_buffer:
                        data['fluff'][current_fluff_field] = '\n'.join(fluff_buffer).strip()
                    current_fluff_field = field
                    fluff_buffer = [line_content[len(field)+1:].strip()]
                    in_fluff = True
                    fluff_match = True
                    break
            
            if fluff_match:
                continue
            
            if in_fluff:
                fluff_buffer.append(line_content)
                continue
            
            # Check for section headers (e.g., "Left Arm:")
            if line_content.endswith(':') and not ':' in line_content[:-1]:
                # Save previous section
                if current_section and current_section_items:
                    data['criticals'][current_section] = current_section_items
                
                section_name = line_content[:-1]
                if section_name in self.MECH_LOCATIONS or section_name in ['Head', 'Center Torso']:
                    current_section = section_name
                    current_section_items = []
                    in_weapons_section = False
                continue
            
            # Check for weapons section
            if line_content.lower().startswith('weapons:'):
                in_weapons_section = True
                if current_section and current_section_items:
                    data['criticals'][current_section] = current_section_items
                current_section = None
                current_section_items = []
                continue
            
            if in_weapons_section:
                # Parse weapon line: "Medium Laser, Left Arm"
                if ',' in line_content:
                    parts = line_content.split(',', 1)
                    weapon_name = parts[0].strip()
                    location = parts[1].strip() if len(parts) > 1 else 'Unknown'
                    data['weapons'].append({
                        'name': weapon_name,
                        'location': location
                    })
                continue
            
            # Parse key:value lines
            if ':' in line_content:
                key, value = line_content.split(':', 1)
                key = key.strip().lower().replace(' ', '_')
                value = value.strip()
                
                self._parse_key_value(key, value, data)
                continue
            
            # Parse critical slot items
            if current_section:
                current_section_items.append(line_content)
        
        # Save last section
        if current_section and current_section_items:
            data['criticals'][current_section] = current_section_items
        
        # Save last fluff
        if in_fluff and fluff_buffer:
            data['fluff'][current_fluff_field] = '\n'.join(fluff_buffer).strip()
        
        # Build the serialized unit
        return self._build_unit(data, filepath)
    
    def _parse_key_value(self, key: str, value: str, data: Dict[str, Any]) -> None:
        """Parse a key:value line."""
        if key == 'chassis':
            data['chassis'] = value
        elif key == 'model':
            data['model'] = value
        elif key == 'mul_id':
            try:
                data['mul_id'] = int(value)
            except ValueError:
                pass
        elif key == 'config':
            data['config'] = value
        elif key == 'techbase':
            data['techbase'] = value
        elif key == 'era':
            try:
                data['era'] = int(value)
            except ValueError:
                data['era'] = value
        elif key == 'source':
            data['source'] = value
        elif key == 'rules_level':
            data['rules_level'] = value
        elif key == 'role':
            data['role'] = value
        elif key == 'mass':
            try:
                data['mass'] = int(float(value))
            except ValueError:
                data['mass'] = 0
        elif key == 'engine':
            data['engine'] = self._parse_engine(value)
        elif key == 'structure':
            data['structure'] = value
        elif key == 'myomer':
            data['myomer'] = value
        elif key == 'heat_sinks':
            data['heat_sinks'] = self._parse_heat_sinks(value)
        elif key == 'walk_mp':
            try:
                data['walk_mp'] = int(value)
            except ValueError:
                data['walk_mp'] = 0
        elif key == 'jump_mp':
            try:
                data['jump_mp'] = int(value)
            except ValueError:
                data['jump_mp'] = 0
        elif key == 'armor':
            data['armor_type'] = value
        elif key.endswith('_armor') or key.endswith('armor'):
            # Armor allocation
            loc_key = key.replace('_armor', '').replace('armor', '').strip().upper()
            try:
                data['armor_allocation'][loc_key] = int(value)
            except ValueError:
                pass
        elif key == 'quirk':
            data['quirks'].append(value)
        elif key == 'manufacturer':
            data['manufacturer'] = value
        elif key == 'primaryfactory':
            data['primary_factory'] = value
        elif key == 'systemmanufacturer':
            # Format: "CHASSIS:Foundation Type 10X"
            if ':' in value:
                sys_type, sys_name = value.split(':', 1)
                data['system_manufacturers'][sys_type.strip()] = sys_name.strip()
    
    def _parse_engine(self, value: str) -> Dict[str, Any]:
        """Parse engine string like '300 Fusion Engine(IS)'."""
        match = re.match(r'(\d+)\s*(.*?)(?:\(([^)]+)\))?$', value)
        if match:
            rating = int(match.group(1))
            type_name = match.group(2).strip()
            # Combine type with manufacturer hint if present
            full_type = f"{type_name}({match.group(3)})" if match.group(3) else type_name
            return {'rating': rating, 'type': full_type}
        return {'rating': 0, 'type': value}
    
    def _parse_heat_sinks(self, value: str) -> Dict[str, Any]:
        """Parse heat sink string like '20 Single' or '10 Double'."""
        match = re.match(r'(\d+)\s*(.*)', value)
        if match:
            count = int(match.group(1))
            hs_type = match.group(2).strip() if match.group(2) else 'Single'
            return {'count': count, 'type': hs_type}
        return {'count': 10, 'type': 'Single'}
    
    def _build_unit(self, data: Dict[str, Any], filepath: str) -> Optional[SerializedUnit]:
        """Build a SerializedUnit from parsed data."""
        chassis = data.get('chassis', 'Unknown')
        model = data.get('model', 'Unknown')
        
        if chassis == 'Unknown':
            return None
        
        # Generate ID
        unit_id = generate_id_from_name(chassis, model)
        
        # Get year and era
        year = data.get('era', 3025)
        if isinstance(year, str):
            try:
                year = int(year)
            except ValueError:
                year = 3025
        
        era = map_year_to_era(year)
        
        # Parse engine
        engine_data = data.get('engine', {'rating': 0, 'type': 'Fusion'})
        engine = SerializedEngine(
            type=map_engine_type(engine_data.get('type', 'Fusion')),
            rating=engine_data.get('rating', 0)
        )
        
        # Parse gyro (inferred from engine type or default)
        gyro = SerializedGyro(type='STANDARD')
        
        # Parse cockpit (default for now)
        cockpit = 'STANDARD'
        
        # Parse structure
        structure_str = data.get('structure', 'Standard')
        structure = SerializedStructure(type=map_structure_type(structure_str))
        
        # Parse heat sinks
        hs_data = data.get('heat_sinks', {'count': 10, 'type': 'Single'})
        heat_sinks = SerializedHeatSinks(
            type=map_heat_sink_type(hs_data.get('type', 'Single')),
            count=hs_data.get('count', 10)
        )
        
        # Parse armor
        armor_type = map_armor_type(data.get('armor_type', 'Standard'))
        armor_allocation = self._build_armor_allocation(data.get('armor_allocation', {}))
        armor = SerializedArmor(type=armor_type, allocation=armor_allocation)
        
        # Parse movement
        movement = SerializedMovement(
            walk=data.get('walk_mp', 0),
            jump=data.get('jump_mp', 0)
        )
        
        # Build equipment list from weapons
        equipment = self._build_equipment_list(data.get('weapons', []))
        
        # Build critical slots
        critical_slots = self._build_critical_slots(data.get('criticals', {}))
        
        # Build fluff
        fluff_data = data.get('fluff', {})
        fluff = None
        if fluff_data:
            fluff = SerializedFluff(
                overview=fluff_data.get('overview'),
                capabilities=fluff_data.get('capabilities'),
                history=fluff_data.get('history'),
                deployment=fluff_data.get('deployment'),
                manufacturer=data.get('manufacturer'),
                primaryFactory=data.get('primary_factory'),
                systemManufacturer=data.get('system_manufacturers') if data.get('system_manufacturers') else None
            )
        
        return SerializedUnit(
            id=unit_id,
            chassis=chassis,
            model=model,
            unitType=map_unit_type(data.get('config', 'Biped')),
            configuration=map_mech_config(data.get('config', 'Biped')),
            techBase=map_tech_base(data.get('techbase', 'Inner Sphere')),
            rulesLevel=map_rules_level(data.get('rules_level', '1')),
            era=era,
            year=year,
            tonnage=data.get('mass', 0),
            engine=engine,
            gyro=gyro,
            cockpit=cockpit,
            structure=structure,
            armor=armor,
            heatSinks=heat_sinks,
            movement=movement,
            equipment=equipment,
            criticalSlots=critical_slots,
            quirks=data.get('quirks') if data.get('quirks') else None,
            fluff=fluff,
            mulId=data.get('mul_id'),
            role=data.get('role'),
            source=data.get('source')
        )
    
    def _build_armor_allocation(self, raw_allocation: Dict[str, int]) -> Dict[str, Any]:
        """Build armor allocation with proper location names and front/rear handling."""
        allocation: Dict[str, Any] = {}
        
        # Location mapping
        loc_map = {
            'LA': 'LEFT_ARM',
            'RA': 'RIGHT_ARM',
            'LT': 'LEFT_TORSO',
            'RT': 'RIGHT_TORSO',
            'CT': 'CENTER_TORSO',
            'HD': 'HEAD',
            'LL': 'LEFT_LEG',
            'RL': 'RIGHT_LEG',
            'RTL': 'LEFT_TORSO_REAR',
            'RTR': 'RIGHT_TORSO_REAR',
            'RTC': 'CENTER_TORSO_REAR',
        }
        
        # First pass: collect front armor
        for key, value in raw_allocation.items():
            mapped_loc = loc_map.get(key, key)
            if 'REAR' not in mapped_loc:
                allocation[mapped_loc] = value
        
        # Second pass: merge rear armor into torso locations
        for key, value in raw_allocation.items():
            mapped_loc = loc_map.get(key, key)
            if 'REAR' in mapped_loc:
                # Get the front location name
                front_loc = mapped_loc.replace('_REAR', '')
                if front_loc in allocation:
                    # Convert to front/rear object
                    front_value = allocation[front_loc]
                    if isinstance(front_value, int):
                        allocation[front_loc] = {
                            'front': front_value,
                            'rear': value
                        }
        
        return allocation
    
    def _build_equipment_list(self, weapons: List[Dict[str, str]]) -> List[SerializedEquipment]:
        """Build equipment list from weapons data."""
        equipment: List[SerializedEquipment] = []
        
        for weapon in weapons:
            name = weapon.get('name', '')
            location = weapon.get('location', '')
            
            # Check for rear-mounted
            is_rear = '(R)' in name or '(Rear)' in name.lower()
            clean_name = name.replace('(R)', '').replace('(r)', '').strip()
            
            # Generate equipment ID
            equip_id = normalize_equipment_id(clean_name)
            
            # Map location
            mapped_location = map_mech_location(location)
            
            equipment.append(SerializedEquipment(
                id=equip_id,
                location=mapped_location,
                isRearMounted=is_rear if is_rear else None
            ))
        
        return equipment
    
    def _build_critical_slots(self, criticals: Dict[str, List[str]]) -> Dict[str, List[Optional[str]]]:
        """Build critical slots dictionary with proper slot counts per location."""
        slots: Dict[str, List[Optional[str]]] = {}
        
        # BattleTech critical slot counts per location
        # Head: 6 slots, Legs: 6 slots each, Arms and Torsos: 12 slots each
        slot_counts = {
            'HEAD': 6,
            'CENTER_TORSO': 12,
            'LEFT_TORSO': 12,
            'RIGHT_TORSO': 12,
            'LEFT_ARM': 12,
            'RIGHT_ARM': 12,
            'LEFT_LEG': 6,
            'RIGHT_LEG': 6,
            # Quad mech legs
            'FRONT_LEFT_LEG': 6,
            'FRONT_RIGHT_LEG': 6,
            'REAR_LEFT_LEG': 6,
            'REAR_RIGHT_LEG': 6,
        }
        
        for location, items in criticals.items():
            mapped_location = map_mech_location(location)
            max_slots = slot_counts.get(mapped_location, 12)
            
            slot_list: List[Optional[str]] = []
            
            for item in items:
                if item == '-Empty-' or not item:
                    slot_list.append(None)
                else:
                    slot_list.append(item)
            
            # Normalize to correct slot count
            if len(slot_list) > max_slots:
                # Trim excess slots (usually trailing nulls from MTF format)
                slot_list = slot_list[:max_slots]
            elif len(slot_list) < max_slots:
                # Pad with nulls if needed
                slot_list.extend([None] * (max_slots - len(slot_list)))
            
            slots[mapped_location] = slot_list
        
        return slots


def convert_mtf_file(input_path: str, output_path: str) -> bool:
    """Convert a single MTF file to JSON."""
    parser = MTFParser()
    unit = parser.parse_file(input_path)
    
    if unit is None:
        return False
    
    # Convert dataclasses to dicts
    unit_dict = dataclass_to_dict(unit)
    
    # Write JSON
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unit_dict, f, indent=2, ensure_ascii=False)
    
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
    
    Returns tuple of (successful, failed) counts.
    """
    success_count = 0
    fail_count = 0
    
    source_path = Path(source_dir)
    output_path = Path(output_dir)
    
    for mtf_file in source_path.rglob('*.mtf'):
        # Compute relative path
        relative = mtf_file.relative_to(source_path)
        
        # Determine era folder from path
        era_folder = relative.parts[0] if relative.parts else 'unknown'
        
        # Apply era filter if specified
        if era_filter and era_filter.lower() not in era_folder.lower():
            continue
        
        # Output path
        json_file = output_path / relative.with_suffix('.json')
        
        if convert_mtf_file(str(mtf_file), str(json_file)):
            success_count += 1
        else:
            fail_count += 1
            print(f"Failed: {mtf_file}")
    
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
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    
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

