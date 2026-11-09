"""Fighter tag policy from MegaMek 48fcb2f6 BLK fighter loaders."""

import hashlib
import json
import logging
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk


class AerospaceHeatSinkSourceTest(unittest.TestCase):
    def convert(self, unit_type, heat_sinks=None, tag='heatsinks', sink_type=0, type_tag='sink_type',
                tech='IS Level 2', extra=''):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'fighter-heatsinks.blk'
            sink_tag = '' if heat_sinks is None else f'<{tag}>{heat_sinks}</{tag}>\n'
            sink_type_tag = '' if sink_type is None else f'<{type_tag}>{sink_type}</{type_tag}>\n'
            source.write_text(
                f'<UnitType>{unit_type}</UnitType>\n<Name>Heat sink fixture</Name>\n'
                f'<type>{tech}</type>\n'
                '<year>3050</year>\n<tonnage>50</tonnage>\n<SafeThrust>5</SafeThrust>\n'
                + sink_tag + sink_type_tag + extra,
                encoding='utf-8',
            )
            return convert_aerospace_blk(source, logging.getLogger(__name__))

    def test_pinned_clan_fighters_keep_aerospace_double_identity(self):
        # Aero.java:102-103 and BLKAeroSpaceFighterFile.java:91-102 at 48fcb2f64.
        fixtures = json.loads((Path(__file__).parent / 'fixtures/aerospace_source_qualifiers.json')
                              .read_text(encoding='utf-8'))['fixtures']
        for name, count in (('Tyre Michiko.blk', 16), ('Jengiz A.blk', 27)):
            fixture = next(row for row in fixtures if row['source'].endswith(name))
            with self.subTest(source=fixture['source']), tempfile.TemporaryDirectory() as directory:
                source = Path(directory) / name
                source.write_bytes(fixture['blk'].encode('utf-8'))
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), fixture['sha256'])
                unit = convert_aerospace_blk(source, logging.getLogger(__name__))
                self.assertEqual(unit['techBase'], 'CLAN')
                self.assertEqual(unit['heatSinks'], {'type': 'DOUBLE', 'count': count})

    def test_aerospace_sink_identity_is_independent_of_chassis_technology(self):
        for family in ('AeroSpaceFighter', 'ConvFighter', 'SmallCraft'):
            for tech in ('IS Level 2', 'Clan Level 2', 'Mixed (Clan Chassis) Advanced',
                         'Mixed (IS Chassis) Advanced'):
                for code, expected in ((0, 'SINGLE'), (1, 'DOUBLE')):
                    with self.subTest(family=family, tech=tech, code=code):
                        unit = self.convert(family, 16, sink_type=code, tech=tech)
                        self.assertEqual(unit['heatSinks'], {'type': expected, 'count': 16})

    def test_heatsinktype_is_not_the_aerospace_sink_type_tag(self):
        # The pinned loader reads sink_type; a similarly named tag cannot replace it.
        for ignored in ('0', '1', '2', 'Double'):
            extra = f'<heatsinktype>\n{ignored}\n</heatsinktype>\n'
            for code, expected in ((0, 'SINGLE'), (1, 'DOUBLE')):
                with self.subTest(ignored=ignored, code=code):
                    unit = self.convert('AeroSpaceFighter', 16, sink_type=code,
                                        tech='Clan Level 2', extra=extra)
                    self.assertEqual(unit['heatSinks'], {'type': expected, 'count': 16})
            with self.subTest(ignored=ignored), self.assertRaisesRegex(ValueError, '<sink_type>'):
                self.convert('AeroSpaceFighter', 16, sink_type=None, extra=extra)

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
