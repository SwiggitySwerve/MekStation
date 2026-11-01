"""UL-05: converter layouts mirror blkVehicleArmorLayout.ts and pinned Java."""

import hashlib
import json
import logging
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk, main as aerospace_main
from blk_vehicle_converter import convert_vehicle_blk
from schema_gate import validate_unit

FIXTURES = Path(__file__).parent / 'fixtures/vehicle_source_qualifiers.json'


class VehicleLocationsTest(unittest.TestCase):
    def test_pinned_sources_match_java_armor_and_pass_schema(self):
        for fixture in json.loads(FIXTURES.read_text(encoding='utf-8'))['locationFixtures']:
            with self.subTest(source=fixture['source']), tempfile.TemporaryDirectory() as temp:
                source = Path(temp) / 'source.blk'
                source.write_bytes(fixture['blk'].encode('utf-8'))
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), fixture['sha256'])
                converter = convert_aerospace_blk if fixture['family'] == 'FixedWingSupport' else convert_vehicle_blk
                unit = converter(source, logging.getLogger(__name__))
                self.assertIsNotNone(unit)
                armor_key = 'byArc' if fixture['family'] == 'FixedWingSupport' else 'byLocation'
                self.assertEqual(unit['armor'][armor_key], fixture['armor'])
                self.assertEqual(validate_unit(unit), [])
                if fixture['family'] == 'LargeSupportTank':
                    self.assertEqual(unit['unitType'], 'Support Vehicle')
                if fixture['family'] == 'FixedWingSupport':
                    self.assertEqual(unit['unitType'], 'Conventional Fighter')
                    self.assertEqual(unit['subType'], 'FixedWingSupport')
                    self.assertEqual(unit['armor']['type'], 'BAR')

    def convert(self, unit_type, motion, tons, count, extra=''):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'layout.blk'
            armor = '\n'.join(str(i) for i in range(1, count + 1))
            source.write_text(
                f'<UnitType>{unit_type}</UnitType>\n<Name>Layout fixture</Name>\n'
                f'<year>3060</year>\n<tonnage>{tons}</tonnage>\n<motion_type>{motion}</motion_type>\n'
                f'<armor>\n{armor}\n</armor>\n{extra}', encoding='utf-8')
            return convert_vehicle_blk(source, logging.getLogger(__name__))

    def test_motion_weight_boundary_matches_ts_owner(self):
        standard = ['FRONT', 'RIGHT', 'LEFT', 'REAR', 'TURRET', 'TURRET_2']
        six_side = ['FRONT', 'FRONT_RIGHT', 'FRONT_LEFT', 'REAR_RIGHT', 'REAR_LEFT', 'REAR', 'TURRET', 'TURRET_2']
        for motion, limit in [('Hover', 50), ('Wheeled', 80), ('WiGE', 80), ('Glider', 80),
                              ('Tracked', 100), ('Naval', 300), ('Submarine', 300)]:
            for unit_type in ('Tank', 'Naval'):
                for weight, keys in ((limit, standard), (limit + 0.1, six_side)):
                    with self.subTest(type=unit_type, motion=motion, weight=weight):
                        unit = self.convert(unit_type, motion, weight, len(keys))
                        self.assertEqual(unit['armor']['byLocation'], dict(zip(keys, range(1, len(keys) + 1))))
        # SupportTank does not promote, LargeSupportTank always uses six sides.
        self.assertEqual(list(self.convert('SupportTank', 'Tracked', 150, 6)['armor']['byLocation']), standard)
        self.assertEqual(list(self.convert('LargeSupportTank', 'Hover', 40, 8)['armor']['byLocation']), six_side)

    def test_loader_array_lengths_are_rejected_instead_of_truncated(self):
        for unit_type, motion, tons, minimum, maximum in (
            ('Tank', 'Tracked', 50, 4, 6), ('Tank', 'Hover', 51, 6, 8),
            ('LargeSupportTank', 'Tracked', 200, 6, 8), ('VTOL', 'VTOL', 20, 5, 6),
            ('SupportTank', 'Tracked', 150, 4, 6), ('SupportVTOL', 'VTOL', 20, 5, 6),
        ):
            for count in range(10):
                with self.subTest(type=unit_type, count=count):
                    if minimum <= count <= maximum:
                        self.assertIsNotNone(self.convert(unit_type, motion, tons, count))
                    else:
                        with self.assertRaisesRegex(ValueError, 'Incorrect armor array length'):
                            self.convert(unit_type, motion, tons, count)

    def test_equipment_uses_the_same_extended_locations(self):
        expected = {'FRONT_RIGHT': 'Front Right', 'FRONT_LEFT': 'Front Left',
                    'REAR_RIGHT': 'Rear Right', 'REAR_LEFT': 'Rear Left',
                    'TURRET': 'Rear Turret', 'TURRET_2': 'Front Turret', 'ROTOR': 'Rotor'}
        extra = ''.join(f'<{name} Equipment>\n{name} fixture\n</{name} Equipment>\n' for name in expected.values())
        unit = self.convert('Tank', 'Tracked', 150, 8, extra)
        self.assertEqual({item['location']: item['name'] for item in unit['equipment']},
                         {key: f'{name} fixture' for key, name in expected.items()})

    def test_aerospace_runner_discovers_fixed_wing_support_in_vehicles(self):
        fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))['locationFixtures']
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for fixture in fixtures:
                source = root / fixture['source']
                source.parent.mkdir(parents=True, exist_ok=True)
                source.write_bytes(fixture['blk'].encode('utf-8'))
            with patch('blk_aerospace_converter.run_blk_conversion') as run:
                aerospace_main()
            config = run.call_args.args[0]
            files = config.collect_files(root, logging.getLogger(__name__))
            results = [config.convert_unit(path, logging.getLogger(__name__)) for path in files]
            converted = [unit for unit in results if unit is not None]
            self.assertEqual(len(converted), 3)
            self.assertTrue(all(unit['subType'] == 'FixedWingSupport' for unit in converted))

    def test_support_tonnage_exception_keeps_other_family_storage_bounds(self):
        for unit_type in ('Support Vehicle', 'SupportVehicle'):
            self.assertEqual(validate_unit(dict(id='adelante', unitType=unit_type, tonnage=600)), [])
        for unit_type in ('Vehicle', 'VTOL', 'Aerospace', 'Conventional Fighter'):
            self.assertEqual(validate_unit(dict(id='boundary', unitType=unit_type, tonnage=250)), [])
            self.assertTrue(validate_unit(dict(id='boundary', unitType=unit_type, tonnage=251)))


if __name__ == '__main__':
    unittest.main()
