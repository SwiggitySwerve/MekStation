"""MtfFile.java:478-483 at 48fcb2f6 retains each patchwork type and point count."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from mtf_converter import MTFParser, dataclass_to_dict


class PatchworkConversionTest(unittest.TestCase):
    def test_patchwork_retains_location_types_and_front_rear_points(self):
        source = ['chassis:Patchwork', 'model:Test', 'armor:Patchwork',
                  'HD armor:Clan Standard(Clan):9',
                  'CT armor:IS Hardened(Inner Sphere):30', 'RTC armor:5',
                  'LL armor:IS Reactive(Inner Sphere):10']
        armor = dataclass_to_dict(MTFParser()._parse_lines(source, 'source.mtf'))['armor']
        self.assertEqual(armor['type'], 'PATCHWORK')
        self.assertEqual(armor['allocation'], {
            'HEAD': 9, 'CENTER_TORSO': {'front': 30, 'rear': 5}, 'LEFT_LEG': 10})
        self.assertEqual(armor['locationTypes'], {
            'HEAD': 'STANDARD', 'CENTER_TORSO': 'HARDENED', 'LEFT_LEG': 'REACTIVE'})

    def test_standard_armor_does_not_gain_a_location_type_map(self):
        unit = MTFParser()._parse_lines(
            ['chassis:Standard', 'model:Test', 'armor:Standard', 'HD armor:9'], 'source.mtf')
        self.assertEqual(dataclass_to_dict(unit)['armor'],
                         {'type': 'STANDARD', 'allocation': {'HEAD': 9}})


if __name__ == '__main__':
    unittest.main()
