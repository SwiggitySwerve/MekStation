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

# MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587, EquipmentType.java:128-136
# (T_ARMOR_SV_BAR_2 = 43 ... T_ARMOR_SV_BAR_10 = 51) and BLKFile.java:501-503
# (`barrating` carries the rating). BLKFile.java:80-93 lists engine codes 8 NONE, 10 STEAM.
VEHICLE_BASE = (
    '<year>3060</year>\n<tonnage>{tonnage}</tonnage>\n<cruiseMP>{cruise}</cruiseMP>\n'
    '<engine_type>{engine}</engine_type>\n<armor_type>{armor_type}</armor_type>\n'
    '<armor>\n{armor}\n</armor>\n'
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
            + VEHICLE_BASE.format(tonnage=tonnage, cruise=cruise, engine=engine, armor_type=armor_type,
                                  armor='10\n10\n10\n10\n2' if unit_type in ('VTOL', 'SupportVTOL') else '10\n10\n10\n10') + extra,
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

    def test_barrating_tag_wins_over_the_armor_code(self):
        # BLKFile.java:501-513 takes the rating from `barrating` only; the code just marks BAR.
        unit = self.vehicle('SupportTank', 'Tag fixture', armor_type=43,
                            extra='<barrating>\n7\n</barrating>\n')
        self.assertEqual((unit['armor']['type'], unit['armor']['barRating']), ('BAR', 7))

    def test_bar_code_without_barrating_has_no_rating(self):
        # Without the tag MegaMek never calls setBARRating, so a support vehicle's rating stays 0
        # (SupportTank.java:63,80), which is no valid BAR rating: emit BAR with no barRating.
        unit = self.vehicle('SupportTank', 'Untagged fixture', armor_type=47)
        self.assertEqual(unit['armor']['type'], 'BAR')
        self.assertNotIn('barRating', unit['armor'])
        self.assert_schema_valid(unit)

    def test_only_support_vehicles_read_barrating(self):
        # Only the support loaders call loadSVArmor (BLKSupportTankFile, BLKLargeSupportTankFile,
        # BLKSupportVTOLFile, BLKFixedWingSupportFile); BLKTankFile and BLKVTOLFile ignore the tag.
        unit = self.vehicle('Tank', 'Tagged tank', armor_type=47,
                            extra='<barrating>\n6\n</barrating>\n')
        self.assertEqual(unit['armor']['type'], 'BAR')
        self.assertNotIn('barRating', unit['armor'])
        support = self.vehicle('SupportTank', 'Tagged support', armor_type=47,
                               extra='<barrating>\n6\n</barrating>\n')
        self.assertEqual(support['armor']['barRating'], 6)

    def test_large_support_tank_reads_barrating(self):
        # Follow-up 42: BLKLargeSupportTankFile also calls loadSVArmor; 22 pinned units rely on it.
        large = self.convert(
            convert_vehicle_blk,
            '<UnitType>LargeSupportTank</UnitType>\n<Name>Large tagged</Name>\n<motion_type>Tracked</motion_type>\n'
            + VEHICLE_BASE.format(tonnage=200, cruise=2, engine=0, armor_type=47,
                                  armor='10\n10\n10\n10\n10\n10') + '<barrating>\n6\n</barrating>\n',
        )
        self.assertEqual((large['armor']['type'], large['armor']['barRating']), ('BAR', 6))

    def test_only_fixed_wing_support_aircraft_read_barrating(self):
        # Follow-up 42: codes 43-51 are BAR for every aircraft, but only BLKFixedWingSupportFile
        # calls loadSVArmor; a fighter's barrating tag is ignored.
        def aircraft(unit_type):
            return self.convert(
                convert_aerospace_blk,
                f'<UnitType>{unit_type}</UnitType>\n<Name>{unit_type} bar</Name>\n<year>3060</year>\n'
                '<tonnage>50</tonnage>\n<SafeThrust>5</SafeThrust>\n<structural_integrity>5</structural_integrity>\n'
                '<armor_type>47</armor_type>\n<barrating>\n6\n</barrating>\n<armor>\n10\n10\n10\n10\n</armor>\n',
            )['armor']
        fighter = aircraft('AeroSpaceFighter')
        self.assertEqual(fighter['type'], 'BAR')
        self.assertNotIn('barRating', fighter)
        self.assertEqual(aircraft('FixedWingSupport')['barRating'], 6)

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
