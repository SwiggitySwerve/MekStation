"""Independent portable unit reader: only the JSON Schema and docs/data/portable-unit-contract.md.

It imports nothing from the application or the converters, so it checks that the
written contract alone is enough to consume every committed unit document.
"""
from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parents[1]
FAMILIES = {
    'battlemechs': {'BattleMech', 'OmniMech', 'IndustrialMech'},
    'vehicles': {'Vehicle', 'VTOL', 'Support Vehicle', 'SupportVehicle'},
    'aerospace': {'Aerospace', 'Conventional Fighter', 'ConventionalFighter', 'Small Craft', 'SmallCraft'},
    'capital': {'DropShip', 'JumpShip', 'WarShip', 'Space Station'},
    'battlearmor': {'Battle Armor', 'BattleArmor', 'BATTLEARMOR'},
    'infantry': {'Infantry'},
    'protomechs': {'ProtoMech'},
}
ENVELOPES = {'index.json', 'units-manifest.json'}
MOVEMENT_POINTS = ('walk', 'jump', 'cruiseMP', 'flankMP', 'jumpMP', 'groundMP', 'umuMP', 'vtolMP', 'safeThrust', 'maxThrust')


class ConformanceError(ValueError):
    pass


@dataclass(frozen=True)
class UnitDocument:
    document: dict
    version: str
    identity: tuple[str, str]
    units: dict
    stored_bv: float | None
    calculated_bv: float | None

    @property
    def battle_value(self):
        """Total BV, or None when unknown; a defensive-only subtotal is never a total."""
        scope = self.document.get('calculationScope')
        if scope == 'complete':
            return self.calculated_bv
        return None if scope == 'defensive-only' else self.stored_bv


def quantity(value, name, *, integer=False, minimum=0):
    if type(value) not in (int, float) or not math.isfinite(value) or value < minimum or (integer and value != int(value)):
        raise ConformanceError(f'{name} requires a finite {"integer" if integer else "number"} >= {minimum}')
    return value


def parse_reference(reference):
    """`family:id` for a known family; anything else is a BattleMech id."""
    prefix, separator, tail = reference.partition(':')
    if separator and prefix in FAMILIES:
        if not tail:
            raise ConformanceError('Unit reference requires an id')
        return prefix, tail
    return 'battlemechs', reference


class UnitReader:
    def __init__(self, schema_path=ROOT / 'public/data/equipment/_schema/unit-schema.json'):
        self.schema = json.loads(Path(schema_path).read_text(encoding='utf-8'))
        Draft7Validator.check_schema(self.schema)
        self.validator = Draft7Validator(self.schema)
        self.version_schema = self.schema['properties']['schemaVersion']
        self.version_validator = Draft7Validator(self.version_schema)
        self.default_version = self.version_schema['default']

    def read(self, document, family='battlemechs', reference=None):
        """Validate and interpret one document; the returned document is never rewritten."""
        if not isinstance(document, dict):
            raise ConformanceError('Unit document must be an object')
        version = document.get('schemaVersion', self.default_version)
        if not self.version_validator.is_valid(version):
            major = self.default_version.split('.')[0]
            raise ConformanceError(f'Invalid schemaVersion {version!r}; supported major {major}')
        try:
            json.dumps(document, allow_nan=False)
        except (TypeError, ValueError) as error:
            raise ConformanceError(f'Not portable JSON: {error}') from error
        error = next(iter(self.validator.iter_errors(document)), None)
        if error is not None:
            raise ConformanceError(f'{".".join(map(str, error.absolute_path)) or "<root>"}: {error.message}')
        if family not in FAMILIES or document['unitType'] not in FAMILIES[family]:
            raise ConformanceError(f'unitType {document["unitType"]!r} does not belong to family {family}')
        if document.get('family', family) != family:
            raise ConformanceError('Document family conflicts with lookup family')
        if reference is not None and parse_reference(reference) != (family, document['id']):
            raise ConformanceError(f'Unit reference {reference!r} conflicts with ({family}, {document["id"]})')
        movement = document.get('movement', {})
        for key in MOVEMENT_POINTS:
            if key in movement:
                quantity(movement[key], f'movement.{key}', integer=True)
        units = {
            'tonnage': 'nominal-troopers' if family == 'battlearmor' else 't',
            'movement': 'thrust-points' if family in ('aerospace', 'capital') else 'MP',
        }
        if 'fuel' in document:
            if family in ('aerospace', 'capital'):
                units['fuel'] = 'points'
            elif document['unitType'] in ('Support Vehicle', 'SupportVehicle'):
                units['fuel'] = 't'
        if family == 'battlearmor' and 'tonnage' in document:
            troopers = quantity(document['tonnage'], 'Battle armor nominal trooper count', integer=True, minimum=1)
            if 'squadSize' in document and document['squadSize'] != troopers:
                raise ConformanceError('Battle armor nominal trooper count conflicts with squadSize')
        stored = None if document.get('bv') is None else quantity(document['bv'], 'Stored BV')
        scope, calculated = document.get('calculationScope'), None
        if scope == 'complete':
            if document.get('final') is None:
                raise ConformanceError('A complete BV calculation requires final')
            calculated = quantity(document['final'], 'Final BV')
        elif scope == 'defensive-only':
            if any(document.get(key) is not None for key in ('final', 'offensive')):
                raise ConformanceError('A defensive-only BV calculation cannot expose final or offensive BV')
        elif scope is not None:
            raise ConformanceError(f'Unknown calculationScope {scope!r}')
        return UnitDocument(document, version, (family, document['id']), units, stored, calculated)

    def read_file(self, file, family, *, example=False):
        try:
            document = json.loads(Path(file).read_text(encoding='utf-8'))
            if example and (not isinstance(document, dict) or document.get('schemaVersion') != self.default_version):
                raise ConformanceError('Example must explicitly declare the current schemaVersion')
            return self.read(document, family)
        except (ConformanceError, ValueError) as error:
            raise ConformanceError(f'{file}: {error}') from error


def scan(reader, corpus, examples):
    """Read every catalog record under the seven family folders and one example per family."""
    corpus, examples = Path(corpus), Path(examples)
    folders = {path.name for path in corpus.iterdir() if path.is_dir()} if corpus.is_dir() else set()
    if folders != set(FAMILIES):
        raise ConformanceError(f'Catalog family coverage mismatch in {corpus}: {sorted(folders)}')
    if {path.name for path in examples.glob('*.json')} != {f'{family}.json' for family in FAMILIES}:
        raise ConformanceError(f'Example family coverage mismatch in {examples}')
    counts, identities = Counter(), set()
    for family in FAMILIES:
        for file in sorted((corpus / family).rglob('*.json')):
            if file.name in ENVELOPES:
                continue
            unit = reader.read_file(file, family)
            if unit.identity in identities:
                raise ConformanceError(f'Duplicate identity {unit.identity}: {file}')
            identities.add(unit.identity)
            counts[family] += 1
        reader.read_file(examples / f'{family}.json', family, example=True)
    return {'catalogs': dict(counts), 'examples': {family: 1 for family in FAMILIES}, 'total': sum(counts.values())}


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--corpus', type=Path, default=ROOT / 'public/data/units')
    parser.add_argument('--examples', type=Path, default=ROOT / 'docs/data/examples')
    args = parser.parse_args()
    try:
        print(json.dumps(scan(UnitReader(), args.corpus, args.examples), sort_keys=True))
    except (ConformanceError, OSError) as error:
        parser.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
