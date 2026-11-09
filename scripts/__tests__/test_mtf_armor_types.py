"""MTF armor identities: MegaMek 48fcb2f64 MtfFile.java:414-483.

The matrix covers all 26 top-level and seven Patchwork location spellings in
mm-data 50f7efe. Clan Reactive/Reflective identity changes belong to R2, not R1.
"""

import contextlib
import io
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from enum_mappings import map_armor_type
from mtf_converter import MTFParser, dataclass_to_dict


CORPUS_ARMOR_TYPES = {
    'Anti-Penetrative Ablation(Inner Sphere)': 'ANTI_PENETRATIVE_ABLATION',
    'Ballistic-Reinforced(Inner Sphere)': 'BALLISTIC_REINFORCED',
    'Commercial(Inner Sphere)': 'COMMERCIAL',
    # C2 R1: deliberate temporary residual until the first CW1 PR-C precursor.
    'Ferro-Fibrous Prototype(Inner Sphere)': 'FERRO_FIBROUS',
    'Ferro-Fibrous(Clan)': 'FERRO_FIBROUS_CLAN',
    'Ferro-Fibrous(Inner Sphere)': 'FERRO_FIBROUS',
    'Ferro-Lamellor(Clan)': 'FERRO_LAMELLOR',
    'Hardened(Clan)': 'HARDENED',
    'Hardened(Inner Sphere)': 'HARDENED',
    'Heat-Dissipating(Clan)': 'HEAT_DISSIPATING',
    'Heat-Dissipating(Inner Sphere)': 'HEAT_DISSIPATING',
    'Heavy Ferro-Fibrous(Inner Sphere)': 'HEAVY_FERRO_FIBROUS',
    'Heavy Industrial(Clan)': 'HEAVY_INDUSTRIAL',
    'Heavy Industrial(Inner Sphere)': 'HEAVY_INDUSTRIAL',
    'Impact-Resistant(Inner Sphere)': 'IMPACT_RESISTANT',
    'Industrial(Inner Sphere)': 'INDUSTRIAL',
    'Light Ferro-Fibrous(Inner Sphere)': 'LIGHT_FERRO_FIBROUS',
    'Patchwork': 'PATCHWORK',
    'Primitive(Inner Sphere)': 'PRIMITIVE',
    'Reactive(Clan)': 'REACTIVE',
    'Reactive(Inner Sphere)': 'REACTIVE',
    'Reflective(Clan)': 'REFLECTIVE',
    'Reflective(Inner Sphere)': 'REFLECTIVE',
    'Standard(Clan)': 'STANDARD',
    'Standard(Inner Sphere)': 'STANDARD',
    'Stealth(Inner Sphere)': 'STEALTH',
    'IS Reactive(Inner Sphere)': 'REACTIVE',
    'Clan Standard(Clan)': 'STANDARD',
    'IS Reflective(Inner Sphere)': 'REFLECTIVE',
    'IS Heavy Industrial(Inner Sphere)': 'HEAVY_INDUSTRIAL',
    'IS Hardened(Inner Sphere)': 'HARDENED',
    'IS Standard(Inner Sphere)': 'STANDARD',
    'IS Ferro-Fibrous(Inner Sphere)': 'FERRO_FIBROUS',
}

UNKNOWN_ARMOR_TYPES = (
    'Unobtanium',
    'Unknown Ferro Armor',
    'Unknown Clan Ferro',
    'Unknown Ferro-Fibrous Prototype(Inner Sphere)',
    'Unknown Hardened Armor',
    'Unknown Reactive Armor',
    'Unknown Reflective Armor',
    'Standard-but-misspelled',
    '',
)


class MTFArmorTypesTest(unittest.TestCase):
    def test_every_corpus_spelling_follows_its_declared_identity_or_residual(self):
        for spelling, expected in CORPUS_ARMOR_TYPES.items():
            with self.subTest(spelling=spelling):
                diagnostic = (self.assertWarnsRegex(RuntimeWarning, 'R1_DEFERRED_ARMOR:')
                              if 'Prototype' in spelling else contextlib.nullcontext())
                with diagnostic:
                    self.assertEqual(map_armor_type(spelling), expected)
                    self.assertEqual(map_armor_type('  ' + spelling + '  '), expected)

    def test_legacy_aliases_keep_their_existing_identities(self):
        for spelling, expected in (
            ('Standard', 'STANDARD'),
            ('Standard Armor', 'STANDARD'),
            ('Ferro-Fibrous Armor', 'FERRO_FIBROUS'),
            ('IS Ferro-Fibrous', 'FERRO_FIBROUS'),
            ('Clan Ferro-Fibrous', 'FERRO_FIBROUS_CLAN'),
            ('Light Ferro-Fibrous Armor', 'LIGHT_FERRO_FIBROUS'),
            ('Heavy Ferro-Fibrous Armor', 'HEAVY_FERRO_FIBROUS'),
            ('Stealth Armor', 'STEALTH'),
            ('Reactive Armor', 'REACTIVE'),
            ('Reflective Armor', 'REFLECTIVE'),
            ('Laser-Reflective', 'REFLECTIVE'),
            ('Hardened Armor', 'HARDENED'),
            ('Primitive Armor', 'PRIMITIVE'),
            ('Industrial Armor', 'INDUSTRIAL'),
            ('Commercial Armor', 'COMMERCIAL'),
            ('Heavy Industrial Armor', 'HEAVY_INDUSTRIAL'),
            ('Impact-Resistant Armor', 'IMPACT_RESISTANT'),
        ):
            with self.subTest(spelling=spelling):
                self.assertEqual(map_armor_type(spelling), expected)

    def test_unknown_strings_raise_a_diagnostic_instead_of_guessing(self):
        for spelling in UNKNOWN_ARMOR_TYPES:
            with self.subTest(spelling=spelling):
                with self.assertRaisesRegex(ValueError, 'UNSUPPORTED_ARMOR:') as caught:
                    map_armor_type(spelling)
                self.assertIn(spelling, str(caught.exception))

    def test_missing_armor_keeps_the_explicit_standard_default(self):
        unit = MTFParser()._parse_lines(['chassis:Default', 'model:Armor'], 'default.mtf')
        self.assertEqual(dataclass_to_dict(unit)['armor'], {
            'type': 'STANDARD', 'allocation': {},
        })

    def test_corrected_source_types_reach_the_serialized_unit(self):
        for spelling, expected in (
            ('Ballistic-Reinforced(Inner Sphere)', 'BALLISTIC_REINFORCED'),
            ('Anti-Penetrative Ablation(Inner Sphere)', 'ANTI_PENETRATIVE_ABLATION'),
            ('Heat-Dissipating(Inner Sphere)', 'HEAT_DISSIPATING'),
            ('Heat-Dissipating(Clan)', 'HEAT_DISSIPATING'),
        ):
            with self.subTest(spelling=spelling):
                unit = MTFParser()._parse_lines([
                    'chassis:Identity', 'model:Armor', 'armor:' + spelling,
                    'HD armor:9', 'CT armor:30', 'RTC armor:5',
                ], 'identity.mtf')
                self.assertEqual(dataclass_to_dict(unit)['armor'], {
                    'type': expected,
                    'allocation': {'HEAD': 9, 'CENTER_TORSO': {'front': 30, 'rear': 5}},
                })

    def test_prototype_armor_is_a_visible_temporary_compatibility_residual(self):
        # Changing this policy after the CW1 PR-C loader precursor is deliberate.
        for spelling in ('Ferro-Fibrous Prototype', 'Ferro-Fibrous Prototype(Inner Sphere)'):
            with self.subTest(spelling=spelling):
                with self.assertWarnsRegex(RuntimeWarning, 'R1_DEFERRED_ARMOR:') as caught:
                    self.assertEqual(map_armor_type(spelling), 'FERRO_FIBROUS')
                message = str(caught.warning)
                self.assertIn(spelling, message)
                self.assertIn('temporary', message)
                self.assertIn('FERRO_FIBROUS_PROTO', message)
                self.assertIn('loader', message)

    def test_deferred_prototype_still_serializes_a_unit_and_reports_the_residual(self):
        with self.assertWarnsRegex(RuntimeWarning, 'R1_DEFERRED_ARMOR:'):
            unit = MTFParser()._parse_lines([
                'chassis:Deferred', 'model:Prototype',
                'armor:Ferro-Fibrous Prototype(Inner Sphere)', 'HD armor:9',
            ], 'deferred-prototype.mtf')
        self.assertEqual(dataclass_to_dict(unit)['armor'], {
            'type': 'FERRO_FIBROUS', 'allocation': {'HEAD': 9},
        })

    def test_patchwork_preserves_every_corpus_location_spelling_and_point_count(self):
        # Numeric identities are pinned EquipmentType.java:85-112 constants.
        unit = MTFParser()._parse_lines([
            'chassis:Patchwork', 'model:Armor', 'armor:Patchwork',
            'HD armor:Clan Standard(Clan):9',
            'CT armor:IS Reactive(Inner Sphere):30', 'RTC armor:5',
            'LT armor:IS Reflective(Inner Sphere):20', 'RTL armor:4',
            'RT armor:IS Heavy Industrial(Inner Sphere):21', 'RTR armor:3',
            'LA armor:IS Hardened(Inner Sphere):15',
            'RA armor:IS Standard(Inner Sphere):16',
            'LL armor:IS Ferro-Fibrous(Inner Sphere):17',
            'RL armor:IS Hardened(Inner Sphere):18',
        ], 'patchwork.mtf')
        self.assertEqual(dataclass_to_dict(unit)['armor'], {
            'type': 'PATCHWORK',
            'allocation': {
                'HEAD': 9, 'CENTER_TORSO': {'front': 30, 'rear': 5},
                'LEFT_TORSO': {'front': 20, 'rear': 4},
                'RIGHT_TORSO': {'front': 21, 'rear': 3},
                'LEFT_ARM': 15, 'RIGHT_ARM': 16, 'LEFT_LEG': 17, 'RIGHT_LEG': 18,
            },
            'typeByLocation': {
                'HEAD': 0, 'CENTER_TORSO': 2, 'LEFT_TORSO': 3, 'RIGHT_TORSO': 15,
                'LEFT_ARM': 4, 'RIGHT_ARM': 0, 'LEFT_LEG': 1, 'RIGHT_LEG': 4,
            },
        })

    def test_unknown_top_level_armor_reaches_the_parser_diagnostic_boundary(self):
        with self.assertRaisesRegex(ValueError, 'UNSUPPORTED_ARMOR:.*Unobtanium'):
            MTFParser()._parse_lines([
                'chassis:Diagnostic', 'model:Armor', 'armor:Unobtanium',
            ], 'unknown.mtf')

    def test_unknown_patchwork_type_is_not_swallowed_as_a_bad_point_count(self):
        with self.assertRaisesRegex(ValueError, 'UNSUPPORTED_ARMOR:.*Unobtanium'):
            MTFParser()._parse_lines([
                'chassis:Diagnostic', 'model:Armor', 'armor:Patchwork',
                'HD armor:Unobtanium(Inner Sphere):9',
            ], 'unknown-patchwork.mtf')

    def test_file_diagnostics_identify_the_source_and_unknown_armor(self):
        for armor_lines in (
            ['armor:Unobtanium'],
            ['armor:Patchwork', 'HD armor:Unobtanium(Inner Sphere):9'],
        ):
            with self.subTest(armor_lines=armor_lines), tempfile.TemporaryDirectory() as temp:
                source = Path(temp) / 'unknown.mtf'
                source.write_text('\n'.join([
                    'chassis:Diagnostic', 'model:Armor', *armor_lines,
                ]), encoding='utf-8')
                diagnostic = io.StringIO()
                with contextlib.redirect_stdout(diagnostic):
                    unit = MTFParser().parse_file(str(source))
                self.assertIsNone(unit)
                self.assertIn(str(source), diagnostic.getvalue())
                self.assertIn('UNSUPPORTED_ARMOR:', diagnostic.getvalue())
                self.assertIn('Unobtanium', diagnostic.getvalue())

    def test_bad_patchwork_points_keep_the_existing_ignore_behavior(self):
        unit = MTFParser()._parse_lines([
            'chassis:Points', 'model:Armor', 'armor:Patchwork',
            'HD armor:Clan Standard(Clan):bad',
        ], 'points.mtf')
        self.assertEqual(dataclass_to_dict(unit)['armor'], {
            'type': 'PATCHWORK', 'allocation': {},
        })


if __name__ == '__main__':
    unittest.main()
