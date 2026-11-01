"""UL-06a: pinned source -> converter -> schema-gated JSON round trips."""

import hashlib
import json
import logging
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_schema_writers import write_unit_json
from blk_vehicle_converter import convert_vehicle_blk
from blk_vehicle_qualifiers import parse_vehicle_qualifiers

FIXTURES = Path(__file__).parent / 'fixtures' / 'vehicle_source_qualifiers.json'


class VehicleSourceQualifiersTest(unittest.TestCase):
    def test_six_pinned_sources_round_trip_without_losing_qualifiers(self):
        fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))['fixtures']
        self.assertEqual(len(fixtures), 6)
        for fixture in fixtures:
            with self.subTest(source=fixture['source']), tempfile.TemporaryDirectory() as temp:
                source = Path(temp) / 'source.blk'
                source.write_bytes(fixture['blk'].encode('utf-8'))
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), fixture['sha256'])
                unit = convert_vehicle_blk(source, logging.getLogger('vehicle-qualifiers'))
                self.assertIsNotNone(unit)
                for key, expected in fixture['qualifiers'].items():
                    self.assertIn(key, unit, f'{key} was dropped')
                    self.assertEqual(unit[key], expected)
                self.assertEqual(unit, fixture['unit'])
                destination = Path(temp) / 'unit.json'
                write_unit_json(destination, unit)
                self.assertEqual(json.loads(destination.read_text(encoding='utf-8')), unit)



class VehicleQualifierParsingTest(unittest.TestCase):
    def test_invalid_values_fail_closed(self):
        for tags in (
            {'clan_engine': 'maybe'},
            {'fuel': 'nan'},
            {'fuel': 'inf'},
            {'fuel': 'ten'},
            {'armor_tech_rating': '2.5'},
            {'internal_type': 'x'},
        ):
            with self.subTest(tags=tags), self.assertRaises(ValueError):
                parse_vehicle_qualifiers(tags)

    def test_integer_qualifiers_are_ints_and_tons_stay_floats(self):
        result = parse_vehicle_qualifiers(
            {'armor_tech_rating': '3', 'internal_type': '-1', 'fuel': '2', 'clan_engine': 'FALSE'}
        )
        self.assertEqual(result, {'armorTechRating': 3, 'internalType': -1, 'fuel': 2.0, 'clanEngine': False})
        self.assertIs(type(result['armorTechRating']), int)
        self.assertIs(type(result['internalType']), int)
        self.assertIs(type(result['fuel']), float)

if __name__ == '__main__':
    unittest.main()
