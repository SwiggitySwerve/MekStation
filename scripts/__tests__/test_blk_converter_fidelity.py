"""Pinned BLK type/armor identities, independent of the MTF alias tables."""

import hashlib
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_aerospace_converter import convert_aerospace_blk
from blk_vehicle_converter import convert_vehicle_blk
from schema_gate import validate_unit

FIXTURES = json.loads((Path(__file__).parent / 'fixtures/blk_converter_fidelity.json').read_text(encoding='utf-8'))['fixtures']

# BLKFile.java:669-735 at MegaMek 48fcb2f6 (not MTF rules-level ordinals).
TECH = {
    'IS': ('INNER_SPHERE', 'STANDARD'),
    'IS Level 1': ('INNER_SPHERE', 'INTRODUCTORY'),
    'IS Level 2': ('INNER_SPHERE', 'STANDARD'),
    'IS Level 3': ('INNER_SPHERE', 'ADVANCED'),
    'IS Level 4': ('INNER_SPHERE', 'EXPERIMENTAL'),
    'IS Level 5': ('INNER_SPHERE', 'UNOFFICIAL'),
    'Clan': ('CLAN', 'STANDARD'),
    'Clan Level 2': ('CLAN', 'STANDARD'),
    'Clan Level 3': ('CLAN', 'ADVANCED'),
    'Clan Level 4': ('CLAN', 'EXPERIMENTAL'),
    'Clan Level 5': ('CLAN', 'UNOFFICIAL'),
}
for chassis in ('IS', 'Clan'):
    for suffix, level in (('', 'STANDARD'), (' Advanced', 'ADVANCED'), (' Experimental', 'EXPERIMENTAL'), (' Unofficial', 'UNOFFICIAL')):
        TECH[f'Mixed ({chassis} Chassis){suffix}'] = ('MIXED', level)

# EquipmentType.java:85-136, indexed by serialized code, with shared app spellings.
ARMOR = (
    'STANDARD', 'FERRO_FIBROUS', 'REACTIVE', 'REFLECTIVE', 'HARDENED',
    'LIGHT_FERRO_FIBROUS', 'HEAVY_FERRO_FIBROUS', 'PATCHWORK', 'STEALTH',
    'FERRO_FIBROUS_PROTO', 'COMMERCIAL', 'FERRO_CARBIDE', 'LAMELLOR_FERRO_CARBIDE',
    'IMPROVED_FERRO_ALUMINUM', 'INDUSTRIAL', 'HEAVY_INDUSTRIAL', 'FERRO_LAMELLOR',
    'PRIMITIVE', 'ELECTRIC_DISCHARGE', 'FERRO_ALUMINUM', 'HEAVY_FERRO_ALUMINUM',
    'LIGHT_FERRO_ALUMINUM', 'STEALTH', 'ANTI_PENETRATIVE_ABLATION', 'HEAT_DISSIPATING',
    'IMPACT_RESISTANT', 'BALLISTIC_REINFORCED', 'FERRO_ALUMINUM_PROTO', 'STANDARD',
    'BA_STANDARD_PROTOTYPE', 'BA_STANDARD_ADVANCED', 'BA_STEALTH_BASIC', 'STEALTH',
    'STEALTH_IMPROVED', 'STEALTH_PROTOTYPE', 'FIRE_RESISTANT', 'MIMETIC',
    'REFLECTIVE', 'REACTIVE', 'PRIMITIVE', 'PRIMITIVE_AERO', 'AEROSPACE',
    'STANDARD_PROTOMEK', *(['BAR'] * 9),
)


def replace_tag(body, tag, value):
    return re.sub(rf'<{tag}>.*?</{tag}>', f'<{tag}>\n{value}\n</{tag}>', body, flags=re.S)


class BlkConverterFidelityTest(unittest.TestCase):
    def test_small_craft_hull_equipment_is_preserved(self):
        fixtures = [fixture for fixture in FIXTURES if 'hullEquipment' in fixture]
        self.assertEqual(len(fixtures), 6)
        self.assertEqual(sum(len(fixture['hullEquipment']) for fixture in fixtures), 11)
        for fixture in fixtures:
            with self.subTest(path=fixture['path']):
                unit = self.convert(fixture)
                hull = [item['name'] for item in unit['equipment'] if item['location'] == 'HULL']
                self.assertEqual(hull, fixture['hullEquipment'])
                self.assertEqual(validate_unit(unit), [])

    def test_vehicle_and_aerospace_share_the_armor_code_owner(self):
        from blk_aerospace_tables import ARMOR_CODE_MAP as aerospace
        from blk_vehicle_tables import ARMOR_CODE_MAP as vehicle
        self.assertIs(aerospace, vehicle)

    def convert(self, fixture, body=None):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / Path(fixture['path']).name
            path.write_text(fixture['blk'] if body is None else body, encoding='utf-8')
            converter = convert_vehicle_blk if fixture['family'] == 'vehicles' else convert_aerospace_blk
            return converter(path, logging.getLogger(__name__))

    def bases(self):
        return [next(f for f in FIXTURES if f['family'] == family) for family in ('vehicles', 'aerospace')]

    def test_real_pinned_sources(self):
        for fixture in FIXTURES:
            with self.subTest(path=fixture['path']):
                self.assertEqual(hashlib.sha256(fixture['blk'].encode()).hexdigest(), fixture['sha256'])
                body = fixture['blk']
                tech = re.search(r'<type>\s*(.*?)\s*</type>', body, re.S).group(1)
                armor = int(re.search(r'<armor_type>\s*(.*?)\s*</armor_type>', body, re.S).group(1))
                unit = self.convert(fixture)
                self.assertEqual((unit['techBase'], unit['rulesLevel']), TECH[tech])
                self.assertEqual(unit['armor']['type'], ARMOR[armor])
                self.assertEqual(validate_unit(unit), [])
                if fixture['family'] == 'aerospace' and '\nBombast Laser\n' in body:
                    self.assertFalse(unit['hasBombBay'])
                    self.assertEqual(unit['bombCapacity'], 0)

    def test_all_java_type_spellings_in_both_converters(self):
        for fixture in self.bases():
            for tech, expected in TECH.items():
                with self.subTest(family=fixture['family'], tech=tech):
                    unit = self.convert(fixture, replace_tag(fixture['blk'], 'type', tech))
                    self.assertEqual((unit['techBase'], unit['rulesLevel']), expected)

    def test_legacy_is_type_is_introductory_only_in_3025(self):
        for fixture in self.bases():
            for year, expected in ((3025, 'INTRODUCTORY'), (3024, 'STANDARD'), (3026, 'STANDARD')):
                with self.subTest(family=fixture['family'], year=year):
                    body = replace_tag(replace_tag(fixture['blk'], 'type', 'IS'), 'year', year)
                    self.assertEqual(self.convert(fixture, body)['rulesLevel'], expected)

    def test_unknown_type_fails_instead_of_becoming_inner_sphere(self):
        for fixture in self.bases():
            for tech in ('Level 4', 'Clan Level 1', 'Clan Level 6', 'Mixed', 'Inner Sphere', 'clan level 3', 'IS Level 2 extra', 'nonsense', ''):
                with self.subTest(family=fixture['family'], tech=tech), self.assertRaisesRegex(ValueError, 'BLK tech type'):
                    self.convert(fixture, replace_tag(fixture['blk'], 'type', tech))

    def test_exact_armor_code_table_in_both_converters(self):
        for fixture in self.bases():
            for code, expected in enumerate(ARMOR):
                with self.subTest(family=fixture['family'], code=code):
                    unit = self.convert(fixture, replace_tag(fixture['blk'], 'armor_type', code))
                    self.assertEqual(unit['armor']['type'], expected)
                    self.assertEqual(validate_unit(unit), [])

    def test_unknown_and_non_integer_armor_codes_fail(self):
        for fixture in self.bases():
            for code in (-1, 52, 999, '22.5', 'nan', 'inf', 'junk', ''):
                with self.subTest(family=fixture['family'], code=code), self.assertRaisesRegex(ValueError, 'armor_type'):
                    self.convert(fixture, replace_tag(fixture['blk'], 'armor_type', code))

    def test_unknown_per_arc_armor_fails_but_unused_fuselage_is_preserved(self):
        from blk_aerospace_qualifiers import parse_aerospace_armor
        for code in ('999', '-1'):
            with self.subTest(code=code), self.assertRaisesRegex(ValueError, 'armor_type'):
                parse_aerospace_armor({'armor_type': '7', 'Nose_armor_type': code})
        self.assertEqual(parse_aerospace_armor({'armor_type': '7', 'Fuselage_armor_type': '-1'}),
                         {'type': 'PATCHWORK', 'typeByArc': {'FUSELAGE': -1}})

    def test_only_the_registered_bomb_bay_equipment_is_a_bay(self):
        fixture = next(f for f in FIXTURES if f['family'] == 'aerospace' and '\nBombast Laser\n' in f['blk'])
        # MiscType.createLAMBombBay and EquipmentTypeLookup.LAM_BOMB_BAY: exact "Bomb Bay".
        for name, count in (('Bomb Bay', 1), ('bomb bay', 1), ('ISBombastLaser', 0), ('HE Bomb', 0), ('Bomb Bay fake', 0)):
            with self.subTest(name=name):
                body = fixture['blk'].replace('\nBombast Laser\n', f'\n{name}\n')
                unit = self.convert(fixture, body + '\n<bombcount>5</bombcount>\n<bombs>5</bombs>')
                self.assertEqual((unit['hasBombBay'], unit['bombCapacity']), (bool(count), count))


if __name__ == '__main__':
    unittest.main()
