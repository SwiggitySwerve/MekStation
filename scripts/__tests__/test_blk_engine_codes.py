"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_blk_engine_codes.py -v."""

import logging
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk
from blk_protomech_converter import convert_protomech_blk
from blk_vehicle_converter import convert_vehicle_blk, map_engine_code
from blk_conversion_runner import BlkConversionConfig, run_blk_conversion
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
    ('SupportVTOL', convert_vehicle_blk),
    ('VTOL', convert_vehicle_blk),
    ('Aero', convert_aerospace_blk),
    ('AeroSpaceFighter', convert_aerospace_blk),
    ('ConvFighter', convert_aerospace_blk),
    ('FixedWingSupport', convert_aerospace_blk),
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

    def test_protomek_ignores_engine_tag_like_pinned_loader(self):
        # BLKProtoMekFile.java:93-95 always constructs a fusion engine.
        for value in (None, *range(14), 99, '', 'Fusion'):
            with self.subTest(code=value):
                self.assertEqual(self.convert('ProtoMek', convert_protomech_blk, value)
                                 ['engine']['type'], 'FUSION')
        with self.assertLogs('test-blk-engines', level='WARNING') as messages:
            self.convert('ProtoMek', convert_protomech_blk, 99)
        self.assertIn('99', '\n'.join(messages.output))
        self.assertIn('engine.blk', '\n'.join(messages.output))

    def test_smallcraft_ignores_engine_tag_and_identifies_upstream_placeholder(self):
        # BLKSmallCraftFile.java:146-147; SmallCraft.java:128-130.
        for value in (None, *range(14), 99, '', 'Fusion'):
            with self.subTest(code=value):
                self.assertEqual(self.convert('SmallCraft', convert_aerospace_blk, value)
                                 ['engine']['type'], 'ICE')
        with self.assertLogs('test-blk-engines', level='INFO') as messages:
            self.convert('SmallCraft', convert_aerospace_blk, 99)
        self.assertIn('99', '\n'.join(messages.output))
        self.assertIn('placeholder', '\n'.join(messages.output))

    def test_invalid_code_names_source_and_preserves_all_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, output = root / 'source', root / 'output'
            source.mkdir()
            output.mkdir()
            for name, code in [('a_good', 1), ('b_bad', 99)]:
                (source / f'{name}.blk').write_text(
                    f'<UnitType>Tank</UnitType>\n<Name>{name}</Name>\n'
                    '<year>3060</year>\n<tonnage>30</tonnage>\n'
                    f'<engine_type>{code}</engine_type>', encoding='utf-8')
            (output / 'units-manifest.json').write_bytes(b'existing manifest')
            (output / 'a_good.json').write_bytes(b'existing design')
            before = {p.name: p.read_bytes() for p in output.iterdir()}
            config = BlkConversionConfig(
                converter='test-batch', description='test', source_default=str(source),
                source_help='test', output_default=str(output), output_help='test',
                type_name='test', parity_report_filename='unused.json', run_log_filename='unused.json',
                convert_unit=convert_vehicle_blk, build_manifest_entry=lambda unit: unit,
                run_parity_checks=lambda manifest, logger: (0, []))
            with patch.object(sys, 'argv', ['test']), self.assertLogs('test-batch', 'ERROR') as messages:
                self.assertEqual(run_blk_conversion(config), 1)
            self.assertIn(str(source / 'b_bad.blk'), '\n'.join(messages.output))
            self.assertIn('99', '\n'.join(messages.output))
            self.assertEqual({p.name: p.read_bytes() for p in output.iterdir()}, before)


if __name__ == '__main__':
    unittest.main()
