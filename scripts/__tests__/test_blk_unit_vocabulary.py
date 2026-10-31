"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_blk_unit_vocabulary.py -v.

Vehicle and aerospace converter output must pass ``unit-schema.json`` and use the
``UnitType`` spellings the app dispatches on (``BattleMechInterfaces.ts``).
"""

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

REPO_ROOT = Path(__file__).resolve().parents[2]

# MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587, EquipmentType.java:85-138
# (T_ARMOR_SV_BAR_2 = 43 ... T_ARMOR_SV_BAR_10 = 51) and BLKFile.java:501-503
# (`barrating` carries the rating). BLKFile.java:80-93 lists engine codes 8 NONE, 10 STEAM.
VEHICLE_BASE = (
    '<year>3060</year>\n<tonnage>{tonnage}</tonnage>\n<cruiseMP>{cruise}</cruiseMP>\n'
    '<engine_type>{engine}</engine_type>\n<armor_type>{armor_type}</armor_type>\n'
    '<armor>\n10\n10\n10\n10\n</armor>\n'
)


def app_unit_types():
    source = (REPO_ROOT / 'src/types/unit/BattleMechInterfaces.ts').read_text(encoding='utf-8')
    block = re.search(r'export enum UnitType \{(.*?)\n\}', source, re.S).group(1)
    return set(re.findall(r"=\s*'([^']+)'", block))


class BlkUnitVocabularyTest(unittest.TestCase):
    def convert(self, converter, body):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'unit.blk'
            source.write_text(body, encoding='utf-8')
            unit = converter(source, logging.getLogger('test-blk-vocabulary'))
        self.assertIsNotNone(unit)
        return unit

    def vehicle(self, unit_type, name, motion='Tracked', engine=0, armor_type=0, extra='', tonnage=20, cruise=4):
        return self.convert(
            convert_vehicle_blk,
            f'<UnitType>{unit_type}</UnitType>\n<Name>{name}</Name>\n<motion_type>{motion}</motion_type>\n'
            + VEHICLE_BASE.format(tonnage=tonnage, cruise=cruise, engine=engine, armor_type=armor_type) + extra,
        )

    def aero(self, unit_type):
        return self.convert(
            convert_aerospace_blk,
            f'<UnitType>{unit_type}</UnitType>\n<Name>{unit_type} fixture</Name>\n<year>3060</year>\n'
            '<tonnage>50</tonnage>\n<SafeThrust>5</SafeThrust>\n<structural_integrity>5</structural_integrity>\n'
            '<armor>\n10\n10\n10\n10\n</armor>\n',
        )

    def assert_schema_valid(self, unit):
        self.assertEqual(validate_unit(unit), [])

    def test_trailer_with_engine_none_passes_schema(self):
        # J-27 Ordnance Transport (Trailer): engine_type 8.
        unit = self.vehicle('Tank', 'J-27 Ordnance Transport', engine=8)
        self.assertEqual(unit['engine']['type'], 'NONE')
        self.assert_schema_valid(unit)

    def test_steam_engine_passes_schema(self):
        unit = self.vehicle('SupportTank', 'Steam fixture', engine=10)
        self.assertEqual(unit['engine']['type'], 'STEAM')
        self.assert_schema_valid(unit)

    def test_bar_armor_splits_into_type_and_rating(self):
        # Boreas Cavalry Hovercraft (Prime): armor_type 49, barrating 8.
        unit = self.vehicle('SupportTank', 'Boreas fixture', motion='Hover', armor_type=49,
                            extra='<barrating>\n8\n</barrating>\n')
        self.assertEqual(unit['armor']['type'], 'BAR')
        self.assertEqual(unit['armor']['barRating'], 8)
        self.assert_schema_valid(unit)

    def test_every_bar_code_maps_to_its_rating(self):
        for rating in range(2, 11):
            with self.subTest(rating=rating):
                unit = self.vehicle('SupportTank', 'Bar fixture', armor_type=41 + rating,
                                    extra=f'<barrating>\n{rating}\n</barrating>\n')
                self.assertEqual((unit['armor']['type'], unit['armor']['barRating']), ('BAR', rating))
                self.assert_schema_valid(unit)

    def test_non_bar_armor_has_no_rating(self):
        unit = self.vehicle('Tank', 'Standard fixture', armor_type=1)
        self.assertEqual(unit['armor']['type'], 'FERRO_FIBROUS')
        self.assertNotIn('barRating', unit['armor'])

    def test_support_vtol_is_a_support_vehicle_with_vtol_motion(self):
        # Tonbo Superheavy Transport.
        unit = self.vehicle('SupportVTOL', 'Tonbo fixture', motion='VTOL')
        self.assertEqual(unit['unitType'], 'Support Vehicle')
        self.assertEqual(unit['motionType'], 'VTOL')
        self.assert_schema_valid(unit)

    def test_support_tank_and_combat_vtol_spellings(self):
        self.assertEqual(self.vehicle('SupportTank', 'Support fixture')['unitType'], 'Support Vehicle')
        self.assertEqual(self.vehicle('VTOL', 'Vtol fixture', motion='VTOL')['unitType'], 'VTOL')
        self.assertEqual(self.vehicle('Tank', 'Tank fixture')['unitType'], 'Vehicle')

    def test_aerospace_spellings_match_the_app(self):
        self.assertEqual(self.aero('AeroSpaceFighter')['unitType'], 'Aerospace')
        self.assertEqual(self.aero('ConvFighter')['unitType'], 'Conventional Fighter')
        self.assertEqual(self.aero('SmallCraft')['unitType'], 'Small Craft')

    def test_emitted_unit_types_exist_in_the_app_enum(self):
        app = app_unit_types()
        for unit in (
            self.vehicle('Tank', 'Tank fixture'),
            self.vehicle('SupportTank', 'Support fixture'),
            self.vehicle('SupportVTOL', 'Tonbo fixture', motion='VTOL'),
            self.vehicle('VTOL', 'Vtol fixture', motion='VTOL'),
            self.aero('AeroSpaceFighter'),
            self.aero('ConvFighter'),
            self.aero('SmallCraft'),
        ):
            with self.subTest(unit_type=unit['unitType']):
                self.assertIn(unit['unitType'], app)


if __name__ == '__main__':
    unittest.main()
