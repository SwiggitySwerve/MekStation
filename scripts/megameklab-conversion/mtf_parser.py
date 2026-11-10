"""MTF parser for MegaMek text-format units."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from blk_common import BLK_ARMOR_CODE_MAP
from weapon_quirks import append_weapon_quirk

from enum_mappings import (
    generate_id_from_name,
    map_armor_type,
    map_cockpit_type,
    map_chassis_tech_base,
    map_engine_type,
    map_gyro_type,
    map_heat_sink_type,
    map_mech_location,
    map_mech_config,
    map_rules_level,
    map_tech_base,
    map_unit_type,
    map_year_to_era,
)
from mtf_parser_builders import (
    build_armor_allocation,
    build_critical_slots,
    build_equipment_list,
    build_structure,
)
from mtf_serialized_models import (
    SerializedArmor,
    SerializedEngine,
    SerializedFluff,
    SerializedGyro,
    SerializedHeatSinks,
    SerializedMovement,
    SerializedUnit,
)

class MTFParser:
    """Parser for MegaMek MTF files."""

    # Mech locations in order
    MECH_LOCATIONS = [
        "Head", "Center Torso", "Left Torso", "Right Torso",
        "Left Arm", "Right Arm", "Left Leg", "Right Leg", "Center Leg"
    ]

    def __init__(self):
        self.unknown_equipment: set = set()

    @staticmethod
    def _is_weapon_metadata(value: str) -> bool:
        """Return true for non-location weapon metadata fields."""
        return bool(re.match(r'^(ammo|shots?)\s*:', value.strip(), re.IGNORECASE))

    def _parse_weapon_line(self, line_content: str) -> Optional[Dict[str, str]]:
        """Parse a weapon line, ignoring metadata fields after the location."""
        # Rifle names include a comma inside parentheses; it is not a location.
        parts = [part.strip() for part in re.split(r',\s*(?![^()]*\))', line_content)]
        if not parts or not parts[0]:
            return None

        location = 'Unknown'
        for part in parts[1:]:
            if part and not self._is_weapon_metadata(part):
                location = part
                break

        return {
            'name': parts[0],
            'location': location
        }

    def parse_file(self, filepath: str) -> Optional[SerializedUnit]:
        """Parse an MTF file and return a SerializedUnit."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            return self._parse_lines(lines, filepath)
        except Exception as e:
            print(f"Error parsing {filepath}: {e}")
            return None

    def _parse_lines(self, lines: List[str], filepath: str) -> Optional[SerializedUnit]:
        """Parse MTF content lines."""
        data: Dict[str, Any] = {
            'quirks': [],
            'weapon_quirks': {},
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
                if section_name in self.MECH_LOCATIONS or map_mech_location(section_name) in {
                    'FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG', 'REAR_LEFT_LEG', 'REAR_RIGHT_LEG'
                }:
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
                    weapon = self._parse_weapon_line(line_content)
                    if weapon:
                        data['weapons'].append(weapon)
                continue

            # Parse key:value lines
            # SIZE parameters belong to critical items, not unit metadata.
            if ':' in line_content and not (
                current_section and ':SIZE:' in line_content.upper()
            ):
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
        elif key == 'clanname':
            # MtfFile.java:1745-1746; a blank name is not a name (Mek.java:5155 writes it only when not blank).
            if value:
                data['clan_name'] = value
        elif key == 'base_chassis_heat_sinks':
            # MtfFile.java:371 parses the value with Integer.parseInt, so an unparsable line fails the load there.
            try:
                data['base_chassis_heat_sinks'] = int(value)
            except ValueError as error:
                raise ValueError(f'Invalid base chassis heat sinks value: {value!r}') from error
        elif key == 'lam':
            data['lam_type'] = value
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
        elif key.endswith('_structure'):
            data.setdefault('location_structure', {})[key[:-len('_structure')]] = value
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
            patchwork = data.get('armor_type', '').lower() == 'patchwork' and ':' in value
            armor_name, points = value.rsplit(':', 1) if patchwork else (None, value)
            try:
                data['armor_allocation'][loc_key] = int(points)
            except ValueError:
                return
            if patchwork:
                # Keep unknown type diagnostics outside the bad-point-count handler.
                armor_type = map_armor_type(armor_name).removesuffix('_CLAN')
                code = next(code for code, name in BLK_ARMOR_CODE_MAP.items() if name == armor_type)
                data.setdefault('armor_location_types', {})[map_mech_location(loc_key)] = code
        elif key == 'quirk':
            data['quirks'].append(value)
        elif key == 'weaponquirk':
            append_weapon_quirk(data['weapon_quirks'], value)
        elif key == 'cockpit':
            data['cockpit'] = value
        elif key == 'gyro':
            data['gyro'] = value
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

        # Parse gyro
        gyro = SerializedGyro(type=map_gyro_type(data.get('gyro', 'Standard Gyro')))

        # Parse cockpit
        cockpit = map_cockpit_type(data.get('cockpit', 'Standard Cockpit'))

        # Parse structure
        structure_str = data.get('structure', 'Standard')
        structure = build_structure(
            data.get('config', ''), structure_str, data.get('location_structure', {}), data.get('techbase', ''))

        # Parse heat sinks
        hs_data = data.get('heat_sinks', {'count': 10, 'type': 'Single'})
        heat_sinks = SerializedHeatSinks(
            type=map_heat_sink_type(hs_data.get('type', 'Single')),
            count=hs_data.get('count', 10)
        )

        # Parse armor
        armor_type = ('PATCHWORK' if data.get('armor_type', '').lower() == 'patchwork'
                      else map_armor_type(data.get('armor_type', 'Standard')))
        armor_allocation = build_armor_allocation(data.get('armor_allocation', {}))
        armor = SerializedArmor(type=armor_type, allocation=armor_allocation,
                                typeByLocation=data.get('armor_location_types'))

        # Parse movement
        movement = SerializedMovement(
            walk=data.get('walk_mp', 0),
            jump=data.get('jump_mp', 0)
        )

        # Build equipment list from weapons and selected critical-only mounted equipment.
        equipment = build_equipment_list(data.get('weapons', []), data.get('criticals', {}))

        # Build critical slots
        critical_slots = build_critical_slots(data.get('criticals', {}))

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

        chassis_tech_base = map_chassis_tech_base(data.get('techbase', ''))
        return SerializedUnit(
            id=unit_id,
            chassis=chassis,
            model=model,
            unitType=map_unit_type(data.get('config', 'Biped')),
            configuration=map_mech_config(data.get('config', 'Biped')),
            lamType=data.get('lam_type'),
            techBase=map_tech_base(data.get('techbase', 'Inner Sphere')),
            componentTechBases={'chassis': chassis_tech_base} if chassis_tech_base else None,
            # MtfFile.java:358-359: the Omni suffix is a contains() test, independent of the geometry. Never written as False.
            isOmni=True if 'Omni' in data.get('config', '') else None,
            baseChassisHeatSinks=data.get('base_chassis_heat_sinks'),
            clanName=data.get('clan_name'),
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
            weaponQuirks=data.get('weapon_quirks') or None,
            fluff=fluff,
            mulId=data.get('mul_id'),
            role=data.get('role'),
            source=data.get('source')
        )
