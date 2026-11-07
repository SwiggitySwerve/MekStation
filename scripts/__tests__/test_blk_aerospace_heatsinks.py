"""Fighter tag policy from MegaMek 48fcb2f6 BLK fighter loaders."""

import logging
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk


class AerospaceHeatSinkSourceTest(unittest.TestCase):
    def convert(self, unit_type, heat_sinks=None, tag='heatsinks', sink_type=0, type_tag='sink_type'):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'fighter-heatsinks.blk'
            sink_tag = '' if heat_sinks is None else f'<{tag}>{heat_sinks}</{tag}>\n'
            sink_type_tag = '' if sink_type is None else f'<{type_tag}>{sink_type}</{type_tag}>\n'
            source.write_text(
                f'<UnitType>{unit_type}</UnitType>\n<Name>Heat sink fixture</Name>\n'
                '<year>3050</year>\n<tonnage>50</tonnage>\n<SafeThrust>5</SafeThrust>\n'
                + sink_tag + sink_type_tag,
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

    # BLKAeroSpaceFighterFile.java:99-102; BLKConvFighterFile.java:90-93.
    def test_missing_fighter_sink_type_fails_with_source_filename(self):
        for unit_type in ('Aero', 'AeroSpaceFighter', 'ConvFighter'):
            with self.subTest(unit_type=unit_type):
                with self.assertRaisesRegex(
                    ValueError, r'fighter-heatsinks\.blk: missing required <sink_type> tag'
                ):
                    self.convert(unit_type, 10, sink_type=None)

    def test_explicit_sink_types_preserve_interpretation_and_counts(self):
        for unit_type in ('Aero', 'AeroSpaceFighter', 'ConvFighter'):
            for sink_type, expected_type in ((0, 'SINGLE'), (1, 'DOUBLE')):
                for count in (0, 10, 25):
                    with self.subTest(unit_type=unit_type, sink_type=sink_type, count=count):
                        self.assertEqual(self.convert(unit_type, count, sink_type=sink_type)['heatSinks'],
                                         {'type': expected_type, 'count': count})

    def test_existing_sink_type_alias_preserves_both_values_and_counts(self):
        for unit_type in ('Aero', 'AeroSpaceFighter', 'ConvFighter'):
            for sink_type, expected_type in ((0, 'SINGLE'), (1, 'DOUBLE')):
                for count in (0, 13):
                    with self.subTest(unit_type=unit_type, sink_type=sink_type, count=count):
                        unit = self.convert(unit_type, count, sink_type=sink_type, type_tag='heat_sinks')
                        self.assertEqual(unit['heatSinks'], {'type': expected_type, 'count': count})

    def test_excluded_family_missing_sink_type_policy_is_unchanged(self):
        for unit_type in ('FixedWingSupport', 'SmallCraft'):
            for count in (0, 7):
                with self.subTest(unit_type=unit_type, count=count):
                    self.assertEqual(self.convert(unit_type, count, sink_type=None)['heatSinks'],
                                     {'type': 'SINGLE', 'count': count})

    def test_excluded_family_explicit_sink_type_policy_is_unchanged(self):
        for unit_type in ('FixedWingSupport', 'SmallCraft'):
            for sink_type, expected_type in ((0, 'SINGLE'), (1, 'DOUBLE')):
                with self.subTest(unit_type=unit_type, sink_type=sink_type):
                    self.assertEqual(self.convert(unit_type, 7, sink_type=sink_type)['heatSinks'],
                                     {'type': expected_type, 'count': 7})


if __name__ == '__main__':
    unittest.main()
