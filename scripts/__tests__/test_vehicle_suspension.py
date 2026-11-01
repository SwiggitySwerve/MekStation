import logging
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_vehicle_converter import convert_vehicle_blk
from combat_vehicle_engine import combat_engine_rating

class SuspensionConversionTest(unittest.TestCase):
    def convert(self, unit_type='Tank', tons=20, cruise=12, motion='Hover', engine_code=None):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'fixture.blk'
            engine_tag = '' if engine_code is None else f'<engine_type>\n{engine_code}\n</engine_type>\n'
            source.write_text(engine_tag + f'<UnitType>\n{unit_type}\n</UnitType>\n<Name>\nSuspension\n</Name>\n<year>\n3075\n</year>\n<tonnage>\n{tons}\n</tonnage>\n<motion_type>\n{motion}\n</motion_type>\n<cruiseMP>\n{cruise}\n</cruiseMP>\n', encoding='utf-8')
            with source.open('a', encoding='utf-8') as blk:
                blk.write('<armor>\n10\n10\n10\n10\n</armor>\n')
            return convert_vehicle_blk(source, logging.getLogger(__name__))

    def test_tamerlane_rating(self):
        self.assertEqual(self.convert()['engine']['rating'], 155)

    def test_round_up_not_python_bankers_rounding(self):
        self.assertEqual(self.convert(tons=52, cruise=3, motion='Tracked')['engine']['rating'], 160)

    def test_zero_cruise_and_explicit_engine_less(self):
        self.assertEqual(self.convert(cruise=0)['engine']['rating'], 10)
        self.assertEqual(self.convert(cruise=0, engine_code=8)['engine']['rating'], 0)
        self.assertEqual(combat_engine_rating(20, 0, 'Hover'), 10)
        self.assertEqual(combat_engine_rating(20, 0, 'Hover', engine_less=True), 0)
        self.assertEqual(combat_engine_rating(52.9, 3, 'Tracked'), 160)

    def test_support_keeps_legacy_output(self):
        self.assertEqual(self.convert(unit_type='SupportTank')['engine']['rating'], 240)

if __name__ == '__main__':
    unittest.main()
