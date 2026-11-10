"""Native critical weapons; shared profiles/formula ASTs and catalog inputs."""
from functools import lru_cache
import json
import math
from pathlib import Path
import re
import warnings

from enum_mappings import map_mech_location, normalize_equipment_id
from mtf_serialized_models import SerializedEquipment

ROOT = Path(__file__).resolve().parents[2]
# MtfFile.java:545-548, 48fcb2f64: reverse native location traversal.
ORDER = ('CENTER_LEG', 'LEFT_LEG', 'REAR_LEFT_LEG', 'RIGHT_LEG', 'REAR_RIGHT_LEG',
         'LEFT_ARM', 'FRONT_LEFT_LEG', 'RIGHT_ARM', 'FRONT_RIGHT_LEG',
         'LEFT_TORSO', 'RIGHT_TORSO', 'CENTER_TORSO', 'HEAD')


def _key(name):
    return re.sub(r'[^a-z0-9]', '', re.sub(r'^\d+[- ]', '', name.lower()))


@lru_cache(maxsize=1)
def _facts():
    read = lambda name: json.loads((ROOT / name).read_text(encoding='utf-8'))
    profiles = read('src/types/equipment/sourceWeaponMountProfiles.json')
    formulas = read('src/types/equipment/physicalWeaponFormulas.json')
    spec = read('scripts/megameklab-conversion/strict-provenance-inputs.json')
    files = [p for p in spec['files'] if '/official/weapons/' in p or '/official/miscellaneous/' in p]
    catalog = {}
    for filename in sorted(files, key=lambda p: ('/weapons/' not in p, not p.endswith('/java-registry.json'), p)):
        for item in read(filename).get('items', []):
            if '/weapons/' in filename or item['id'] not in catalog:
                catalog[item['id']] = item
    aliases = {_key(name): id for id, p in profiles.items() for name in [id, *p.get('aliases', [])]}
    lookup = {_key(name): id for id, item in catalog.items() for name in [id, item['name']]}
    routes = read('public/data/equipment/registry-routing.json')
    for name, id in read('public/data/equipment/name-mappings.json').items():
        if isinstance(id, str):
            lookup[_key(name)] = routes['previousIds'].get(id, id)
            lookup[_key(normalize_equipment_id(name))] = routes['previousIds'].get(id, id)
    summaries = {}
    for name, id in lookup.items():
        summaries.setdefault(id.removeprefix('clan-'), set()).add(name)
    for name, route in routes.get('techRoutes', {}).items():
        for id in route.values():
            summaries.setdefault(id.removeprefix('clan-'), set()).update([_key(name), _key(normalize_equipment_id(name))])
    return profiles, formulas, catalog, aliases, lookup, {_key(k): v for k, v in routes.get('techRoutes', {}).items()}, summaries


def _formula(node, context):
    kind = node['type']
    if kind == 'FIXED':
        return node['value']
    if kind == 'EQUALS_WEIGHT':
        return context['weight']
    if kind == 'PLUS':
        return _formula(node['base'], context) + node['bonus']
    value = context[node['field']]
    if kind == 'CEIL_DIVIDE':
        return math.ceil(value / node['divisor'])
    if kind == 'MULTIPLY':
        return value * node['multiplier']
    if kind == 'MULTIPLY_ROUND':
        return math.floor(value * node['multiplier'] / node['roundTo'] + 0.5) * node['roundTo']
    raise ValueError(f'Unsupported source physical formula: {kind}')


def _resolve(token, tonnage, quad, clan):
    profiles, formulas, catalog, aliases, lookup, routes, summaries = _facts()
    if re.search(r'ammo|ammunition|\bshots?\b', token, re.IGNORECASE):
        return None
    clean = re.sub(r'\s*\((?:r|rear|omnipod|armored|t)\)', '', token, flags=re.IGNORECASE)
    clean = re.sub(r':SIZE:[\d.]+', '', clean, flags=re.IGNORECASE).strip()
    key = _key(clean)
    physical_key = re.sub(r'^(?:clan|is|cl)', '', key)
    id = aliases.get(key) or aliases.get(physical_key)
    if id is None:
        route = routes.get(key)
        id = route['CLAN' if clan else 'INNER_SPHERE'] if route else lookup.get(key)
    item = catalog.get(id)
    if item is None or (id not in profiles and item.get('category') not in ('Energy', 'Ballistic', 'Missile', 'Physical', 'Artillery')):
        return None
    context = {'tonnage': tonnage, 'isQuad': int(quad)}
    formula = formulas.get(item.get('variableEquipmentId', id))
    if formula:
        context['weight'] = _formula(formula['weight'], context)
        count = _formula(formula['criticalSlots'], context)
    else:
        count = item.get('criticalSlots', 0)
    # Mek.java:3484-3492 / MtfFile.java:1156-1166: physical entries once.
    count = math.ceil(count / 2) if tonnage > 100 else count
    names = [id, id.removeprefix('clan-'), clean, item['name'],
             re.sub(r'\s*\((?:Clan|IS)\)', '', item['name'], flags=re.IGNORECASE).removeprefix('Clan ')]
    names += [alias for alias, target in aliases.items() if target == id]
    names += list(summaries.get(id.removeprefix('clan-'), ()))
    return {'id': id, 'count': count, 'physical': id in profiles,
            'spread': profiles.get(id, {}).get('grouping') == 'spread',
            'aliases': {_key(name) for name in names},
            'rear': bool(re.search(r'\((?:r|rear)\)', token, re.IGNORECASE)),
            'omni': bool(re.search(r'\(omnipod\)', token, re.IGNORECASE))}


def _inner(location):
    if location in ('HEAD', 'CENTER_LEG', 'LEFT_TORSO', 'RIGHT_TORSO'):
        return 'CENTER_TORSO'
    if location != 'CENTER_TORSO':
        return 'LEFT_TORSO' if 'LEFT' in location else 'RIGHT_TORSO'
    return None


def append_source_weapons(equipment, criticals, tonnage, configuration='', clan=False):
    """Consume summary instances once; append only complete unrepresented mounts."""
    if tonnage is None:
        return equipment
    locations = {map_mech_location(loc): tokens for loc, tokens in criticals.items()}
    quad = any(loc.startswith('FRONT_') for loc in locations)
    locations = {loc: locations[loc] for loc in ORDER if loc in locations}
    resolved = {loc: [(i, item) for i, token in enumerate(tokens)
                      if token and (item := _resolve(token, tonnage, quad, clan))]
                for loc, tokens in locations.items()}
    claimed = {loc: set() for loc in locations}
    available = set(range(len(equipment)))
    result = list(equipment)
    for loc, slots in resolved.items():
        for index, item in slots:
            count = item['count']
            if index in claimed[loc] or count <= 0:
                continue
            def take(where, demand):
                return [i for i, candidate in resolved[where]
                        if i not in claimed[where] and candidate['id'] == item['id']][:demand]
            parts = [(where, take(where, count)) for where in (resolved if item['spread'] else [loc])]
            parts = [(where, indices) for where, indices in parts if indices]
            if not item['spread'] and len(parts[0][1]) < count and count >= 8 and not item['physical']:
                partners = [_inner(loc)] + [where for where in ORDER if _inner(where) == loc]
                for partner in partners:
                    if partner not in resolved:
                        continue
                    rest = take(partner, count - len(parts[0][1]))
                    if len(rest) + len(parts[0][1]) == count:
                        parts.append((partner, rest))
                        break
            if sum(len(indices) for _, indices in parts) != count:
                warnings.warn(f"Incomplete source weapon allocation: {item['id']} at {loc}", stacklevel=2)
                continue
            for where, indices in parts:
                claimed[where].update(indices)
            match = next((i for i in sorted(available)
                          if _key(equipment[i].id) in item['aliases']
                          and any(equipment[i].location == where
                                  and (not equipment[i].slots or set(equipment[i].slots) <= set(indices))
                                  for where, indices in parts)), None)
            if match is not None:
                available.remove(match)
                continue
            primary, indices = parts[0]
            result.append(SerializedEquipment(id=item['id'], location=primary, slots=indices,
                                             isRearMounted=True if item['rear'] else None,
                                             isOmniPodMounted=True if item['omni'] else None))
    return result
