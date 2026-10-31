import logging
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_aerospace_converter import convert_aerospace_blk


class AerospaceStructuralIntegrityTest(unittest.TestCase):
    def convert(self, unit_type, tons, thrust, extra=''):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'fixture.blk'
            source.write_text(
                f'<UnitType>\n{unit_type}\n</UnitType>\n<Name>\nSI Fixture\n</Name>\n'
                f'<year>\n3050\n</year>\n<tonnage>\n{tons}\n</tonnage>\n'
                f'<SafeThrust>\n{thrust}\n</SafeThrust>\n{extra}',
                encoding='utf-8',
            )
            return convert_aerospace_blk(source, logging.getLogger(__name__))

    # MegaMek Aero.java:804-808 autoSetSI: max(floor(weight / 10), original walk MP).
    # AeroSpaceFighter.java:125-128 and BLKConvFighterFile.java:153 both call it.
    def test_fighter_thrust_above_tonnage_term(self):
        # Firebird FR-1: 45 t, safe thrust 5 -> max(4, 5)
        self.assertEqual(self.convert('AeroSpaceFighter', '45.0', 5)['structuralIntegrity'], 5)

    def test_fighter_tonnage_term_above_thrust(self):
        self.assertEqual(self.convert('AeroSpaceFighter', '100.0', 3)['structuralIntegrity'], 10)

    def test_legacy_aero_spelling_is_a_fighter(self):
        self.assertEqual(self.convert('Aero', '45.0', 5)['structuralIntegrity'], 5)

    def test_conventional_fighter_thrust_above_tonnage_term(self):
        # Boeing Jump Bomber: 20 t, safe thrust 9 -> max(2, 9)
        self.assertEqual(self.convert('ConvFighter', '20.0', 9)['structuralIntegrity'], 9)

    def test_conventional_fighter_tonnage_term_above_thrust(self):
        self.assertEqual(self.convert('ConvFighter', '100.0', 4)['structuralIntegrity'], 10)

    def test_tonnage_term_floors_fractional_weight(self):
        self.assertEqual(self.convert('ConvFighter', '19.9', 1)['structuralIntegrity'], 1)

    # FixedWingSupport.java:135-138 overrides autoSetSI: walk MP only, tonnage is ignored.
    def test_fixed_wing_support_uses_walk_mp_only(self):
        # Mosquito Radar Plane IX: 75 t, safe thrust 4 -> 4, not floor(75 / 10) = 7
        self.assertEqual(self.convert('FixedWingSupport', '75.0', 4)['structuralIntegrity'], 4)

    # BLKSmallCraftFile.java:128 reads structural_integrity; the converter must not override it.
    def test_small_craft_keeps_explicit_si(self):
        unit = self.convert('SmallCraft', '200.0', 3, '<structural_integrity>\n11\n</structural_integrity>\n')
        self.assertEqual(unit['structuralIntegrity'], 11)


if __name__ == '__main__':
    unittest.main()
