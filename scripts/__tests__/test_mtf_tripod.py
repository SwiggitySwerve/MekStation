"""TripodMek.java:63-68 (48fcb2f6): the ninth location is a six-slot leg."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from enum_mappings import map_mech_location
from mtf_converter import MTFParser, dataclass_to_dict


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


if __name__ == '__main__':
    unittest.main()
