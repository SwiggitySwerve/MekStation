"""Battle armor source facts, following pinned BLKBattleArmorFile/BattleArmor."""
from __future__ import annotations

import math
import re
from blk_common import BLK_ARMOR_CODE_MAP, map_armor_code, normalize_equipment_id

# EntityWeightClass and BattleArmor.MANIPULATOR_TYPE_STRINGS, MegaMek 48fcb2f6.
WEIGHT_CLASSES = ('PAL', 'LIGHT', 'MEDIUM', 'HEAVY', 'ASSAULT')
MANIPULATORS = {
    'BAArmoredGlove', 'BABasicManipulator', 'BABasicManipulatorMineClearance',
    'BABattleClaw', 'BABattleClawMagnets', 'BABattleClawVibro',
    'BAHeavyBattleClaw', 'BAHeavyBattleClawMagnets', 'BAHeavyBattleClawVibro',
    'BASalvageArm', 'BACargoLifter', 'BAIndustrialDrill',
}
MOUNT_LOCATIONS = {'Body': 'BODY', 'RA': 'RIGHT_ARM', 'LA': 'LEFT_ARM', 'TU': 'TURRET'}
MOTIONS = {'jump': 'JUMP', 'inf_jump': 'JUMP', 'leg': 'GROUND', 'inf_leg': 'GROUND',
           'vtol': 'VTOL', 'microcopter': 'VTOL', 'micro-copter': 'VTOL', 'microlite': 'VTOL',
           'umu': 'UMU', 'inf_umu': 'UMU', 'scuba': 'UMU', 'motorized scuba': 'UMU'}
MOTIONS.update({mode.lower(): mode for mode in (
    'BIPED', 'TRIPOD', 'QUAD', 'TRACKED', 'WHEELED', 'HOVER', 'NAVAL', 'HYDROFOIL',
    'SUBMARINE', 'BIPED_SWIM', 'QUAD_SWIM', 'WIGE', 'AERODYNE', 'SPHEROID',
    'AEROSPACE', 'AIRSHIP', 'STATION_KEEPING', 'RAIL', 'MAGLEV')})
MOTIONS.update(dict.fromkeys(('motorized', 'inf_motorized'), 'MOTORIZED'))
MOTIONS.update(dict.fromkeys(('glider',), 'WIGE'))
MOTIONS.update(dict.fromkeys(('station', 'satellite', 'station-keeping'), 'STATION_KEEPING'))
PROPULSION = {'JUMP': 'BAJumpJet', 'VTOL': 'BAVTOL', 'UMU': 'BAUMU'}


def integer(tags, key, default=None, *, signed=False):
    raw = tags.get(key, default)
    if raw is None or not re.fullmatch(r'[+-]?\d+' if signed else r'\+?\d+', str(raw)):
        raise ValueError(f'missing or invalid <{key}>: {raw!r}')
    return int(raw)


def parse_point_equipment(items):
    """Keep every mount, including manipulators/AP/MWM, and reject unknown suffixes."""
    equipment, abilities = [], []
    for line in items:
        if not line.strip():
            continue
        parts = line.strip().split(':')
        name = parts.pop(0).strip()
        if not name:
            raise ValueError(f'empty equipment name: {line!r}')
        item = {'id': normalize_equipment_id(name), 'name': name, 'location': 'NONE'}
        while parts:
            part = parts.pop(0)
            if part in MOUNT_LOCATIONS:
                if item['location'] != 'NONE':
                    raise ValueError(f'multiple mount locations: {line!r}')
                item['location'] = MOUNT_LOCATIONS[part]
            elif part in ('DWP', 'SSWM', 'APM'):
                item[{'DWP': 'isDWPMounted', 'SSWM': 'isSquadSupportWeapon', 'APM': 'isAPMMounted'}[part]] = True
            elif re.fullmatch(r'Shots\d+#', part):
                item['shots'] = int(part[5:-1])
            elif part.upper() == 'SIZE' and len(parts) == 1:
                try:
                    size = float(parts.pop())
                except ValueError:
                    raise ValueError(f'invalid equipment size: {line!r}') from None
                if not math.isfinite(size) or size < 0:
                    raise ValueError(f'invalid equipment size: {line!r}')
                item['size'] = size
            else:
                raise ValueError(f'unsupported equipment suffix: {line!r}')
        equipment.append(item)
        if name in ('SwarmMek', 'SwarmWeaponMek', 'StopSwarm', 'LegAttack', 'SwarmInfantry'):
            abilities.append(name)
    ap = any(e['name'] in ('BAAPMount', 'Anti-Personnel Weapon Mount', 'BAArmoredGlove') for e in equipment)
    mwm = any(e['name'] in ('BAModularWeaponMount', 'BAMWMount', 'Standard Modular Weapon Mount') for e in equipment)
    return equipment, abilities, ap, mwm


def extract_manipulators(equipment):
    result = {'RIGHT_ARM': None, 'LEFT_ARM': None}
    for item in equipment:
        if item['name'] in MANIPULATORS and item['location'] in result:
            result[item['location']] = item['name']
    return result


def parse_battlearmor_fields(tags):
    year = integer(tags, 'year')
    count = integer(tags, 'trooper count')
    weight = integer(tags, 'weightclass')
    if count not in range(1, 7) or weight not in range(len(WEIGHT_CLASSES)):
        raise ValueError('unsupported battle armor squad size or weight class')
    chassis = tags.get('chassis', '').upper()
    motion = MOTIONS.get(tags.get('motion_type', '').lower())
    if chassis not in ('BIPED', 'QUAD') or motion is None:
        raise ValueError('missing or unsupported battle armor chassis/motion')
    ground, jump = integer(tags, 'cruisemp'), integer(tags, 'jumpingmp', 0)
    armor = integer(tags, 'armor')  # exactly one integer, never an array fallback
    armor_type = map_armor_code(tags.get('armor_type', '28'), BLK_ARMOR_CODE_MAP)
    armor_data = {'type': armor_type, 'perTrooper': armor}
    armor_tech = next((key for key in ('armor_tech_level', 'armor_tech') if key in tags), None)
    if armor_tech:
        armor_data['sourceTechLevel'] = integer(tags, armor_tech, signed=True)
    tech = tags.get('type', '')
    clan = tech.startswith('Clan') or tech.startswith('Mixed (Clan Chassis)')
    equipment, abilities, ap, mwm = [], [], False, False
    for group in [('Point' if clan else 'Squad'), *[f'Trooper {i}' for i in range(1, count + 1)], 'NONE']:
        raw = tags.get('slotless_equipment' if group == 'NONE' else f'{group.lower()} equipment', [])
        lines = raw.splitlines() if isinstance(raw, str) else raw
        if group == 'NONE':  # BLKFile strips legacy locations from slotless mounts.
            lines = [re.sub(r':(?:Body|LA|RA|TU|OMNI)(?=:|$)', '', line) for line in lines]
        mounts, actions, has_ap, has_mwm = parse_point_equipment(lines)
        equipment.extend(dict(item, unitLocation=group) for item in mounts)
        abilities.extend(actions)
        ap, mwm = ap or has_ap, mwm or has_mwm
    propulsion = PROPULSION.get(motion)
    if propulsion and not any(e['name'] == propulsion for e in equipment):
        equipment.append({'id': normalize_equipment_id(propulsion), 'name': propulsion, 'location': 'NONE', 'unitLocation': 'NONE'})
    manipulators = extract_manipulators([e for e in equipment if e['unitLocation'] in ('Point', 'Squad')])
    turret = tags.get('turret')
    turret_data = {}
    if turret is not None:
        match = re.fullmatch(r'(Modular|Configurable|Standard):(\d+)', turret, re.I)
        if not match:
            raise ValueError(f'unsupported turret: {turret!r}')
        turret_data = {'turretSize': int(match[2]), 'hasModularTurret': match[1].lower() != 'standard'}
    for key in ('exoskeleton', 'clan_exo_without_harjel'):
        if tags.get(key, 'false').lower() not in ('true', 'false'):
            raise ValueError(f'invalid boolean <{key}>')
    exo = tags.get('exoskeleton', 'false').lower() == 'true'
    no_harjel = tags.get('clan_exo_without_harjel', 'false').lower() == 'true'
    if no_harjel and not (clan and exo):
        raise ValueError('Clan exo without HarJel requires a Clan exoskeleton')
    return {
        'year': year, 'weightClass': WEIGHT_CLASSES[weight], 'chassisType': chassis, 'motionType': motion,
        'movement': {'groundMP': ground, 'jumpMP': jump, 'umuMP': jump if motion == 'UMU' else 0, 'vtolMP': jump if motion == 'VTOL' else 0},
        'tonnage': count, 'squadSize': count, 'armorPerTrooper': armor, 'armor': armor_data,
        'manipulators': {'rightArm': manipulators['RIGHT_ARM'], 'leftArm': manipulators['LEFT_ARM']},
        'hasAntiPersonnelMount': ap, 'hasModularWeaponMount': mwm, 'abilities': abilities, 'equipment': equipment,
        'clanChassis': clan, 'isExoskeleton': exo, 'clanExoWithoutHarJel': no_harjel, **turret_data,
    }
