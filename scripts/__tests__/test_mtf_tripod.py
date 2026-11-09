"""TripodMek.java:63-68 (48fcb2f6): the ninth location is a six-slot leg."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from enum_mappings import map_mech_config, map_mech_location
from mtf_converter import MTFParser, dataclass_to_dict

# Every distinct `Config:` value of the 4,263 pinned mm-data 50f7efe BattleMech sources, with the class
# MtfFile.java:283-310 (48fcb2f6) builds: contains() in the order QuadVee, Quad, LAM, Tripod, else BipedMek.
PINNED_CONFIGS = [
    ('Biped', 'Biped'),
    ('Biped OmniMek', 'Biped'),
    ('Biped FrankenMek', 'Biped'),
    ('Quad', 'Quad'),
    ('Quad OmniMek', 'Quad'),
    ('QuadVee', 'QuadVee'),
    ('QuadVee OmniMek', 'QuadVee'),
    ('LAM', 'LAM'),
    ('Tripod', 'Tripod'),
    ('Tripod OmniMek', 'Tripod'),
]


class TripodConversionTest(unittest.TestCase):
    def test_center_leg_preserves_criticals_armor_and_mount_location(self):
        source = ['chassis:Ares', 'model:Test', 'Config:Tripod', 'mass:135',
                  'CL armor:40', 'Weapons:1', 'A-Pod, Center Leg',
                  'Right Leg:', 'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator',
                  'Foot Actuator', 'ISA-Pod', 'ISA-Pod',
                  'Center Leg:', 'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator',
                  'Foot Actuator', 'ISA-Pod', 'ISA-Pod', '-Empty-',
                  'Left Leg:', 'Hip', 'Upper Leg Actuator', 'Lower Leg Actuator',
                  'Foot Actuator', 'ISA-Pod', 'ISA-Pod']
        unit = dataclass_to_dict(MTFParser()._parse_lines(source, 'source.mtf'))
        self.assertEqual(unit['criticalSlots']['CENTER_LEG'],
                         ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator',
                          'Foot Actuator', 'ISA-Pod', 'ISA-Pod'])
        self.assertEqual(len(unit['criticalSlots']['RIGHT_LEG']), 6)
        self.assertEqual(sum(slot == 'ISA-Pod' for slots in
                             unit['criticalSlots'].values() for slot in slots), 6)
        self.assertEqual(unit['armor']['allocation'], {'CENTER_LEG': 40})
        self.assertEqual(unit['equipment'][0]['location'], 'CENTER_LEG')

    def test_center_leg_abbreviation_uses_the_same_location(self):
        self.assertEqual(map_mech_location('CL'), 'CENTER_LEG')

    def test_short_center_leg_section_is_padded_to_six_slots(self):
        unit = MTFParser()._parse_lines(
            ['chassis:Tripod', 'model:Test', 'Center Leg:', 'Hip'], 'source.mtf')
        self.assertEqual(unit.criticalSlots['CENTER_LEG'], ['Hip'] + [None] * 5)


class MechConfigurationTest(unittest.TestCase):
    """MtfFile.java:283-310 picks the class by contains(), so the Omni suffix never changes the geometry."""

    def test_tripod_omnimek_source_converts_to_tripod(self):
        unit = MTFParser()._parse_lines(
            ['chassis:Ares', 'model:Test', 'Config:Tripod OmniMek', 'mass:135'], 'source.mtf')
        self.assertEqual(unit.configuration, 'Tripod')

    def test_every_pinned_config_string_maps_like_the_java_loader(self):
        for source, expected in PINNED_CONFIGS:
            with self.subTest(config=source):
                self.assertEqual(map_mech_config(source), expected)

    def test_quadvee_is_not_taken_for_quad(self):
        # "QuadVee" contains "Quad": the loader tests QuadVee first.
        self.assertEqual(map_mech_config('QuadVee OmniMek'), 'QuadVee')
        self.assertEqual(map_mech_config('Quad OmniMek'), 'Quad')

    def test_token_match_is_case_sensitive_like_java_contains(self):
        # String.contains is case-sensitive, so only the exact token counts. The suffix after it is irrelevant,
        # which is why `Tripod omnimek` is a Tripod while `tripod omnimek` has no token and is Biped.
        for source, expected in (
            ('tripod omnimek', 'Biped'),
            ('quadvee omnimek', 'Biped'),
            ('QUADVEE', 'Biped'),
            ('Tripod omnimek', 'Tripod'),
            ('QuadVee omnimek', 'QuadVee'),
        ):
            with self.subTest(config=source):
                self.assertEqual(map_mech_config(source), expected)

    def test_lower_case_tripod_omnimek_source_stays_biped(self):
        unit = MTFParser()._parse_lines(
            ['chassis:Ares', 'model:Test', 'Config:tripod omnimek', 'mass:135'], 'source.mtf')
        self.assertEqual(unit.configuration, 'Biped')

    def test_unmatched_config_is_biped_like_the_java_else_branch(self):
        # contains() is case-sensitive in Java, so a lower-case token does not match either.
        for source in ('', 'Hexapod', 'tripod', 'quad'):
            with self.subTest(config=source):
                self.assertEqual(map_mech_config(source), 'Biped')


if __name__ == '__main__':
    unittest.main()
