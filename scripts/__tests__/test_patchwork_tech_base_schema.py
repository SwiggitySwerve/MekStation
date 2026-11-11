"""`armor.techBaseByLocation` contract rules, as the Python schema gate (jsonschema) sees them.

MegaMek 48fcb2f64 MtfFile.java:483-525 reads each Patchwork line's armor type and tech level separately;
`typeByLocation` keeps only the integer type code. The map is optional, never defaulted, present only when
armor.type is PATCHWORK, a subset of typeByLocation's keys, and its values are INNER_SPHERE | CLAN.
Mirrors src/types/contracts/__tests__/unit.armor-tech-base-by-location.contract.test.ts.
"""
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator

SCHEMA = json.loads((Path(__file__).resolve().parents[2] /
                     'public/data/equipment/_schema/unit-schema.json').read_text(encoding='utf-8'))
VALIDATOR = Draft202012Validator({**SCHEMA['properties']['armor'], '$defs': SCHEMA['$defs']})
TYPES = {'HEAD': 0, 'LEFT_ARM': 2, 'RIGHT_ARM': 2, 'LEFT_LEG': 2}
ALLOCATION = {'HEAD': 9, 'LEFT_ARM': 26, 'RIGHT_ARM': 26, 'LEFT_LEG': 34}


def armor(**extra):
    base = {'type': 'PATCHWORK', 'allocation': ALLOCATION, 'typeByLocation': TYPES}
    base.update(extra)
    return {k: v for k, v in base.items() if v is not None}


def valid(doc):
    return not list(VALIDATOR.iter_errors(doc))


class ArmorTechBaseByLocationSchemaTest(unittest.TestCase):
    def test_existing_patchwork_without_the_map_is_valid(self):
        self.assertTrue(valid(armor()))

    def test_full_and_subset_maps_are_valid(self):
        self.assertTrue(valid(armor(techBaseByLocation={
            'HEAD': 'CLAN', 'LEFT_ARM': 'INNER_SPHERE', 'RIGHT_ARM': 'INNER_SPHERE', 'LEFT_LEG': 'INNER_SPHERE'})))
        self.assertTrue(valid(armor(techBaseByLocation={'HEAD': 'CLAN'})))

    def test_non_patchwork_with_the_map_is_invalid(self):
        for armor_type in ('STANDARD', 'FERRO_FIBROUS', 'REACTIVE'):
            with self.subTest(armor_type=armor_type):
                self.assertFalse(valid(armor(type=armor_type, typeByLocation=None, techBaseByLocation={'HEAD': 'CLAN'})))
        self.assertFalse(valid(armor(type='STANDARD', typeByLocation=None, techBaseByLocation={})))

    def test_location_missing_from_type_by_location_is_invalid(self):
        self.assertFalse(valid(armor(typeByLocation={'HEAD': 0}, techBaseByLocation={'LEFT_LEG': 'INNER_SPHERE'})))

    def test_map_without_type_by_location_is_invalid(self):
        self.assertFalse(valid(armor(typeByLocation=None, techBaseByLocation={'HEAD': 'CLAN'})))

    def test_bad_values_and_bad_keys_are_invalid(self):
        for value in ('MIXED', 'Clan', 'clan', 'IS', '', 1, None):
            with self.subTest(value=value):
                self.assertFalse(valid(armor(techBaseByLocation={'HEAD': value})))
        for key in ('FRONT', 'REAR', 'LEFT_TORSO_REAR', 'head'):
            with self.subTest(key=key):
                self.assertFalse(valid(armor(techBaseByLocation={key: 'CLAN'})))
        self.assertFalse(valid(armor(techBaseByLocation=['CLAN'])))


if __name__ == '__main__':
    unittest.main()
