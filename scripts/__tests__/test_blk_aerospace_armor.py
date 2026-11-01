"""Armor regression seam: pinned MegaMek 48fcb2f6 BLK loaders and EquipmentType."""

import logging
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk
from schema_gate import validate_unit


class AerospaceArmorTest(unittest.TestCase):
    def convert(self, unit_type, code=None, extra=''):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'armor.blk'
            armor_type = '' if code is None else f'<armor_type>{code}</armor_type>\n'
            source.write_text(
                f'<UnitType>{unit_type}</UnitType>\n<Name>Armor fixture</Name>\n'
                '<year>3050</year>\n<tonnage>100</tonnage>\n<SafeThrust>4</SafeThrust>\n'
                '<armor>\n100\n201\n302\n400\n</armor>\n' + armor_type + extra,
                encoding='utf-8',
            )
            unit = convert_aerospace_blk(source, logging.getLogger(__name__))
            self.assertIsNotNone(unit)
            self.assertEqual(validate_unit(unit), [])
            return unit['armor']

    def test_blk_index_one_is_right_and_two_is_left_for_every_aircraft_loader(self):
        # BLKAeroSpaceFighterFile:63-66,186-189; BLKSmallCraftFile:180-183;
        # BLKConvFighterFile:146-149; BLKFixedWingSupportFile:126-129.
        for unit_type in ('Aero', 'AeroSpaceFighter', 'ConvFighter', 'FixedWingSupport', 'SmallCraft'):
            with self.subTest(unit_type=unit_type):
                side = 'SIDE' if unit_type == 'SmallCraft' else 'WING'
                self.assertEqual(self.convert(unit_type)['byArc'], {
                    'NOSE': 100, f'RIGHT_{side}': 201, f'LEFT_{side}': 302, 'AFT': 400,
                })

    def test_equipment_type_codes_use_existing_schema_names(self):
        # EquipmentType.java:85-126; check code 25 as well as the former wrong alias 40.
        for code, expected in ((19, 'FERRO_ALUMINUM'), (20, 'HEAVY_FERRO_ALUMINUM'),
                               (40, 'PRIMITIVE_AERO'), (41, 'AEROSPACE'),
                               (22, 'STEALTH'), (25, 'IMPACT_RESISTANT'),
                               (10, 'COMMERCIAL'), (14, 'INDUSTRIAL'),
                               (15, 'HEAVY_INDUSTRIAL'), (16, 'FERRO_LAMELLOR'),
                               (17, 'PRIMITIVE'), (39, 'PRIMITIVE')):
            with self.subTest(code=code):
                self.assertEqual(self.convert('AeroSpaceFighter', code)['type'], expected)

    def test_small_craft_default_and_zero_use_aerospace_armor(self):
        # BLKSmallCraftFile.java:154-161 normalizes legacy standard to aerospace.
        for code in (None, 0, 19, 20, 40, 41):
            with self.subTest(code=code):
                expected = {19: 'FERRO_ALUMINUM', 20: 'HEAVY_FERRO_ALUMINUM', 40: 'PRIMITIVE_AERO'}.get(code, 'AEROSPACE')
                self.assertEqual(self.convert('SmallCraft', code)['type'], expected)

    def test_other_aircraft_retain_standard_default_and_zero(self):
        for unit_type in ('AeroSpaceFighter', 'ConvFighter', 'FixedWingSupport'):
            for code in (None, 0):
                with self.subTest(unit_type=unit_type, code=code):
                    self.assertEqual(self.convert(unit_type, code)['type'], 'STANDARD')

    def test_patchwork_codes_stay_on_the_named_wing_with_its_points(self):
        armor = self.convert('AeroSpaceFighter', 7,
                             '<Left Wing_armor_type>19</Left Wing_armor_type>\n'
                             '<Right Wing_armor_type>20</Right Wing_armor_type>\n')
        self.assertEqual(armor, {'type': 'PATCHWORK',
                                'typeByArc': {'LEFT_WING': 19, 'RIGHT_WING': 20},
                                'byArc': {'NOSE': 100, 'RIGHT_WING': 201, 'LEFT_WING': 302, 'AFT': 400}})


if __name__ == '__main__':
    unittest.main()
