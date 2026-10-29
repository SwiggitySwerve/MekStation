"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_blk_engine_codes.py -v."""

import logging
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk
from blk_protomech_converter import convert_protomech_blk
from blk_vehicle_converter import convert_vehicle_blk, map_engine_code
from enum_mappings import map_engine_type


# MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
# BLKFile.java:80-93,538-568. These are serialized BLK codes, not domain ordinals.
BLK_ENGINES = (
    'FUSION', 'ICE', 'XL', 'XXL', 'LIGHT', 'COMPACT', 'FUEL_CELL',
    'FISSION', 'NONE', 'MAGLEV', 'STEAM', 'BATTERY', 'SOLAR', 'EXTERNAL',
)
CONVERTERS = (
    ('Tank', convert_vehicle_blk),
    ('SupportTank', convert_vehicle_blk),
    ('VTOL', convert_vehicle_blk),
    ('Aero', convert_aerospace_blk),
    ('ConvFighter', convert_aerospace_blk),
    ('SmallCraft', convert_aerospace_blk),
    ('ProtoMek', convert_protomech_blk),
)


class BlkEngineCodeTest(unittest.TestCase):
    def convert(self, unit_type, converter, engine_code):
        engine_tag = '' if engine_code is None else f'<engine_type>{engine_code}</engine_type>'
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'engine.blk'
            source.write_text(
                f'<UnitType>{unit_type}</UnitType>\n<Name>Engine fixture</Name>\n'
                '<year>3060</year>\n<tonnage>30</tonnage>\n'
                '<cruiseMP>5</cruiseMP>\n<SafeThrust>5</SafeThrust>\n'
                + engine_tag,
                encoding='utf-8',
            )
            unit = converter(source, logging.getLogger('test-blk-engines'))
            self.assertIsNotNone(unit)
            return unit

    def test_all_serialized_codes(self):
        for code, expected in enumerate(BLK_ENGINES):
            for value in (code, f' {code} '):
                with self.subTest(code=value):
                    self.assertEqual(map_engine_code(value), expected)

    def test_every_engine_converter_emits_serialized_meaning(self):
        for unit_type, converter in CONVERTERS:
            for code, expected in enumerate(BLK_ENGINES):
                with self.subTest(unit_type=unit_type, code=code):
                    self.assertEqual(self.convert(unit_type, converter, code)['engine']['type'], expected)

    def test_unknown_or_malformed_codes_raise_explicit_errors(self):
        for value in (-1, 14, 15, 99, 'unknown', '1.5', '1.0', ''):
            with self.subTest(code=value):
                with self.assertRaisesRegex(ValueError, 'BLK engine_type'):
                    map_engine_code(value)
        for unit_type, converter in CONVERTERS:
            for value in (99, '', '1.5', 'Fusion'):
                with self.subTest(unit_type=unit_type, code=value):
                    with self.assertRaisesRegex(ValueError, 'BLK engine_type'):
                        self.convert(unit_type, converter, value)

    def test_missing_engine_tag_preserves_legacy_fusion_default(self):
        self.assertEqual(map_engine_code(None), 'FUSION')
        for unit_type, converter in CONVERTERS:
            with self.subTest(unit_type=unit_type):
                self.assertEqual(self.convert(unit_type, converter, None)['engine']['type'], 'FUSION')

    def test_generic_mtf_mapping_is_unchanged(self):
        legacy_codes = ('FUSION', 'XL', 'LIGHT', 'COMPACT', 'CLAN_XL', 'XXL')
        for code, expected in enumerate(legacy_codes):
            with self.subTest(code=code):
                self.assertEqual(map_engine_type(str(code)), expected)
        for text, expected in (
            ('Fusion Engine', 'FUSION'), ('XL Engine', 'XL'),
            ('XL Engine(Clan)', 'CLAN_XL'), ('ICE Engine', 'ICE'),
            ('Fuel Cell Engine', 'FUEL_CELL'), ('XXL Engine(Clan)', 'CLAN_XXL'),
        ):
            with self.subTest(text=text):
                self.assertEqual(map_engine_type(text), expected)


if __name__ == '__main__':
    unittest.main()
