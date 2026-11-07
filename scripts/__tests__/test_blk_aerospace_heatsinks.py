"""Fighter tag policy from MegaMek 48fcb2f6 BLK fighter loaders."""

import logging
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk


class AerospaceHeatSinkSourceTest(unittest.TestCase):
    def convert(self, unit_type, heat_sinks=None, tag='heatsinks'):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'fighter-heatsinks.blk'
            sink_tag = '' if heat_sinks is None else f'<{tag}>{heat_sinks}</{tag}>\n'
            source.write_text(
                f'<UnitType>{unit_type}</UnitType>\n<Name>Heat sink fixture</Name>\n'
                '<year>3050</year>\n<tonnage>50</tonnage>\n<SafeThrust>5</SafeThrust>\n'
                + sink_tag,
                encoding='utf-8',
            )
            return convert_aerospace_blk(source, logging.getLogger(__name__))

    # BLKAeroSpaceFighterFile.java:91-95; BLKConvFighterFile.java:86-89.
    def test_missing_fighter_tag_fails_with_source_filename(self):
        for unit_type in ('Aero', 'AeroSpaceFighter', 'ConvFighter'):
            with self.subTest(unit_type=unit_type):
                with self.assertRaisesRegex(
                    ValueError, r'fighter-heatsinks\.blk: missing required <heatsinks> tag'
                ):
                    self.convert(unit_type)

    def test_explicit_zero_and_existing_counts_survive(self):
        for unit_type in ('Aero', 'AeroSpaceFighter', 'ConvFighter'):
            for count in (0, 10, 25):
                with self.subTest(unit_type=unit_type, count=count):
                    self.assertEqual(self.convert(unit_type, count)['heatSinks']['count'], count)

    def test_existing_capitalized_tag_alias_survives(self):
        for unit_type in ('Aero', 'AeroSpaceFighter', 'ConvFighter'):
            for count in (0, 13):
                with self.subTest(unit_type=unit_type, count=count):
                    self.assertEqual(self.convert(unit_type, count, 'Heatsinks')['heatSinks']['count'], count)

    def test_excluded_family_missing_tag_policy_is_unchanged(self):
        for unit_type in ('FixedWingSupport', 'SmallCraft'):
            with self.subTest(unit_type=unit_type):
                self.assertEqual(self.convert(unit_type)['heatSinks']['count'], 0)

    def test_excluded_family_explicit_count_policy_is_unchanged(self):
        for unit_type in ('FixedWingSupport', 'SmallCraft'):
            with self.subTest(unit_type=unit_type):
                self.assertEqual(self.convert(unit_type, 7)['heatSinks']['count'], 7)


if __name__ == '__main__':
    unittest.main()
