"""Support engine contract uses the Java oracle's ownerAwareRating, not stored 0."""
import logging
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_vehicle_converter import convert_vehicle_blk
from schema_gate import validate_unit


class SupportEngineConversionTest(unittest.TestCase):
    def convert(self, family, tons, cruise):
        sides = 6 if family == 'LargeSupportTank' else 5 if family == 'SupportVTOL' else 4
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'support.blk'
            source.write_text(
                f'<UnitType>{family}</UnitType>\n<Name>Support engine</Name>\n'
                f'<year>3075</year>\n<tonnage>{tons}</tonnage>\n'
                f'<motion_type>{"VTOL" if family == "SupportVTOL" else "Tracked"}</motion_type>\n'
                f'<cruiseMP>{cruise}</cruiseMP>\n<armor>\n' + '1\n' * sides + '</armor>\n',
                encoding='utf-8',
            )
            unit = convert_vehicle_blk(source, logging.getLogger(__name__))
            self.assertEqual(validate_unit(unit), [])
            return unit['engine']['rating']

    def test_effective_rating_preserves_fractional_tonnage(self):
        for family in ('SupportTank', 'SupportVTOL'):
            with self.subTest(family=family):
                self.assertAlmostEqual(self.convert(family, 4.999, 6), 29.994)

    def test_large_support_uses_effective_rating_instead_of_stored_zero(self):
        self.assertEqual(self.convert('LargeSupportTank', 120, 3), 360)

    def test_rating_is_capped_at_500_for_every_support_family(self):
        for family in ('SupportTank', 'SupportVTOL', 'LargeSupportTank'):
            with self.subTest(family=family):
                self.assertEqual(self.convert(family, 200, 4), 500)

    def test_stationary_rating_remains_zero(self):
        self.assertEqual(self.convert('SupportTank', 20, 0), 0)


if __name__ == '__main__':
    unittest.main()
