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
            {'structural_tech_rating': '2.5'},
            {'engine_tech_rating': '2.5'},
            {'armor_tech_rating': '2.5'},
            {'internal_type': 'x'},
        ):
            with self.subTest(tags=tags), self.assertRaises(ValueError):
                parse_vehicle_qualifiers(tags)

    def test_integer_qualifiers_are_ints_and_tons_stay_floats(self):
        result = parse_vehicle_qualifiers(
            {'structural_tech_rating': '2', 'engine_tech_rating': '4', 'armor_tech_rating': '3',
             'internal_type': '-1', 'fuel': '2', 'clan_engine': 'FALSE'}
        )
        self.assertEqual(result, {'structuralTechRating': 2, 'engineTechRating': 4, 'armorTechRating': 3,
                                  'internalType': -1, 'fuel': 2.0, 'clanEngine': False})
        for field in ('structuralTechRating', 'engineTechRating', 'armorTechRating', 'internalType'):
            self.assertIs(type(result[field]), int, field)
        self.assertIs(type(result['fuel']), float)

class VehiclePatchworkArmorTest(unittest.TestCase):
    def test_patchwork_location_types_and_support_bar_survive_schema_gate(self):
        for unit_type, armor_code in (('Tank', 7), ('VTOL', 7), ('SupportTank', 7), ('SupportTank', 3)):
            with self.subTest(unit_type=unit_type), tempfile.TemporaryDirectory() as temp:
                locations = ['Front', 'Right', 'Left', 'Rear', 'Rotor' if unit_type == 'VTOL' else 'Turret']
                tags = ''.join(f'<{loc}_armor_type>{code}</{loc}_armor_type>\n' for loc, code in zip(locations, [3, 4, 0, 16, 26]))
                if unit_type == 'SupportTank':
                    tags += '<Front_barrating>6</Front_barrating>\n'
                    if armor_code != 7:
                        tags += '<barrating>6</barrating>\n'
                source = Path(temp) / 'patchwork.blk'
                source.write_text(f'<UnitType>{unit_type}</UnitType>\n<Name>Patchwork</Name>\n<year>3050</year>\n<tonnage>20</tonnage>\n<cruiseMP>4</cruiseMP>\n<motion_type>{"VTOL" if unit_type == "VTOL" else "Tracked"}</motion_type>\n<armor_type>{armor_code}</armor_type>\n<armor>\n10\n10\n0\n10\n2\n</armor>\n' + tags, encoding='utf-8')
                unit = convert_vehicle_blk(source, logging.getLogger(__name__))
                self.assertIsNotNone(unit)
                if armor_code != 7:
                    self.assertEqual(unit['armor']['type'], 'REFLECTIVE')
                    self.assertEqual(unit['armor']['barRating'], 6)
                    write_unit_json(Path(temp) / 'unit.json', unit)
                    continue
                self.assertEqual(unit['armor']['typeByLocation']['RIGHT'], 4)
                self.assertEqual(unit['armor']['typeByLocation'][locations[-1].upper()], 26)
                if unit_type == 'SupportTank':
                    self.assertEqual(unit['armor']['typeByLocation']['FRONT'], 47)
                    self.assertEqual(unit['armor']['barRatingByLocation']['FRONT'], 6)
                    self.assertEqual(unit['armor']['barRatingByLocation']['RIGHT'], 10)
                write_unit_json(Path(temp) / 'unit.json', unit)

if __name__ == '__main__':
    unittest.main()
