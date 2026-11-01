"""UL-07b loader contracts, MegaMek 48fcb2f6 / mm-data 50f7efef."""
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_capital_converter import convert_capital_blk
from schema_gate import validate_unit
from test_blk_capital_converter import with_tag

FIXTURES = json.loads((Path(__file__).parent / 'fixtures/capital-sources.json').read_text(encoding='utf-8'))


class ExtendedCapitalTest(unittest.TestCase):
    def convert(self, body):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'capital.blk'
            path.write_text(body, encoding='utf-8')
            unit = convert_capital_blk(path, logging.getLogger('capital-test'))
            self.assertIsNotNone(unit)
            return unit

    def body(self, name):
        return FIXTURES[name]['content']

    def test_fixtures_match_pinned_sources(self):
        pin = Path('E:/Projects/Personal/_scratch/upstream-pins-20261028/mm-data/data/mekfiles')
        if not pin.is_dir():
            self.skipTest('pinned mm-data unavailable')
        for fixture in FIXTURES.values():
            self.assertEqual((pin / fixture['source']).read_text(encoding='utf-8'), fixture['content'])

    def test_new_armor_types_stay_capital_only(self):
        for family in ('Vehicle', 'Support Vehicle', 'Aerospace', 'Small Craft'):
            valid = {'id': 'scope', 'unitType': family, 'tonnage': 100, 'armor': {'type': 'STANDARD', 'byArc': {'NOSE': 1}}}
            self.assertEqual(validate_unit(valid), [])
            for armor in ('FERRO_CARBIDE', 'LAMELLOR_FERRO_CARBIDE', 'IMPROVED_FERRO_ALUMINUM'):
                self.assertTrue(validate_unit({**valid, 'armor': {**valid['armor'], 'type': armor}}))

    def test_pinned_families_convert_and_validate(self):
        for name, family in [('comitatus', 'JumpShip'), ('liberty', 'JumpShip'),
                             ('aegis', 'WarShip'), ('aquilla', 'WarShip'), ('crucible', 'Space Station')]:
            with self.subTest(name=name):
                unit = self.convert(self.body(name))
                self.assertEqual(unit['unitType'], family)
                self.assertEqual(validate_unit(unit), [])

    def test_six_armor_entries_follow_java_location_indexes(self):
        for name in ('comitatus', 'aegis', 'crucible'):
            with self.subTest(name=name):
                unit = self.convert(with_tag(self.body(name), 'armor', '101\n202\n303\n404\n505\n606'))
                self.assertEqual(unit['armor']['byArc'], {
                    'NOSE': 101, 'FRONT_LEFT_SIDE': 202, 'FRONT_RIGHT_SIDE': 303,
                    'AFT': 404, 'AFT_LEFT_SIDE': 505, 'AFT_RIGHT_SIDE': 606,
                })

    def test_broadsides_are_equipment_locations_not_armor(self):
        unit = self.convert(self.body('aegis'))
        locations = {mount['location'] for mount in unit['equipment']}
        self.assertTrue({'LEFT_BROADSIDE', 'RIGHT_BROADSIDE'}.issubset(locations))
        self.assertNotIn('LEFT_BROADSIDE', unit['armor']['byArc'])
        self.assertEqual(unit['engine'], {'type': 'ICE'})

    def test_stationkeeping_ignores_thrust_and_motion_tags(self):
        for name in ('comitatus', 'crucible'):
            with self.subTest(name=name):
                body = with_tag(with_tag(self.body(name), 'SafeThrust', 7), 'motion_type', 'Spheroid')
                unit = self.convert(body)
                self.assertEqual(unit['movement'], {'safeThrust': 0, 'maxThrust': 0})
                self.assertEqual(unit['motionType'], 'AERODYNE')
                body = re.sub(r'<(SafeThrust|motion_type)>.*?</\1>', '', body, flags=re.S)
                self.assertEqual(self.convert(body)['movement']['safeThrust'], 0)

    def test_warship_thrust_is_required_and_uses_shared_rounding(self):
        unit = self.convert(with_tag(self.body('aegis'), 'SafeThrust', 3))
        self.assertEqual(unit['movement'], {'safeThrust': 3, 'maxThrust': 5})
        with self.assertRaisesRegex(ValueError, 'SafeThrust'):
            self.convert(re.sub(r'<SafeThrust>.*?</SafeThrust>', '', self.body('aegis'), flags=re.S))

    def test_required_tags_and_unknown_armor_reject_recognized_sources(self):
        for name in ('comitatus', 'aegis', 'crucible'):
            for tag in ('Name', 'year', 'type', 'tonnage', 'crew', 'passengers', 'life_boat',
                        'escape_pod', 'structural_integrity', 'heatsinks', 'sink_type', 'fuel', 'armor'):
                with self.subTest(name=name, tag=tag), self.assertRaises(ValueError):
                    self.convert(re.sub(rf'<{tag}>.*?</{tag}>', '', self.body(name), flags=re.S))
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.convert(with_tag(self.body(name), 'armor_type', 99))

    def test_design_defaults_follow_each_loader(self):
        for name, expected in [('comitatus', 'CIVILIAN'), ('crucible', 'CIVILIAN'), ('aegis', 'MILITARY')]:
            body = re.sub(r'<designtype>.*?</designtype>', '', self.body(name), flags=re.S)
            self.assertEqual(self.convert(body)['designType'], expected)

    def test_capital_armor_codes(self):
        for code, expected in [(11, 'FERRO_CARBIDE'), (12, 'LAMELLOR_FERRO_CARBIDE'), (13, 'IMPROVED_FERRO_ALUMINUM')]:
            unit = self.convert(with_tag(self.body('aegis'), 'armor_type', code))
            self.assertEqual(unit['armor']['type'], expected)
            self.assertEqual(validate_unit(unit), [])

    def test_fractional_or_malformed_armor_codes_are_rejected(self):
        for code in ('11.5', '99', 'unknown', 'nan', 'inf'):
            with self.subTest(code=code), self.assertRaises(ValueError):
                self.convert(with_tag(self.body('aegis'), 'armor_type', code))

    def test_core_sail_lithium_decks_and_crew(self):
        unit = self.convert(self.body('aquilla'))
        self.assertEqual((unit['driveCoreType'], unit['jumpRange']), (4, 15))
        self.assertFalse(unit['hasSail'])
        unit = self.convert(self.body('liberty'))
        self.assertEqual(unit['gravDecks'], [45])
        self.assertEqual(unit['dockingCollars'], 4)
        self.assertEqual((unit['crew'], unit['passengers']), (55, 22))
        body = self.body('comitatus') + '\n<lithium-fusion>\n0\n</lithium-fusion>\n<other_crew>\n7\n</other_crew>\n'
        unit = self.convert(body)
        self.assertTrue(unit['hasLFBattery'])  # presence, not payload, matches Java
        self.assertEqual(unit['otherCrew'], 7)

    def test_legacy_decks_and_location_aliases_are_additive(self):
        body = re.sub(r'<grav_decks>.*?</grav_decks>', '', self.body('aegis'), flags=re.S)
        body += '\n<grav_deck>\n1\n</grav_deck>\n<grav_deck_large>\n1\n</grav_deck_large>\n<grav_deck_huge>\n1\n</grav_deck_huge>\n<grav_decks>\n99\n251\n</grav_decks>\n'
        body += '<Front Right Side Equipment>\nISMediumLaser\n</Front Right Side Equipment>\n<Right Broadside Equipment>\nISLargeLaser\n</Right Broadside Equipment>\n'
        unit = self.convert(body)
        self.assertEqual(unit['gravDecks'], [50, 175, 375, 99, 251])
        self.assertIn({'id': 'ismediumlaser', 'name': 'ISMediumLaser', 'location': 'FRONT_RIGHT_SIDE'}, unit['equipment'])
        self.assertIn({'id': 'islargelaser', 'name': 'ISLargeLaser', 'location': 'RIGHT_BROADSIDE'}, unit['equipment'])


if __name__ == '__main__':
    unittest.main()
