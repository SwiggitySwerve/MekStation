"""Native mounting regressions; shared catalog/formula facts, no generated fixture."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from mtf_parser import MTFParser
from mtf_converter import dataclass_to_dict


def parse(sections, weapons=(), mass=80, config='Biped'):
    text = f'chassis:Slot source\nmodel:Native\nConfig:{config}\ntechbase:Inner Sphere\nmass:{mass}\nWeapons:{len(weapons)}\n'
    text += '\n'.join(weapons) + '\n' + sections
    return dataclass_to_dict(MTFParser()._parse_lines(text.splitlines(), 'source.mtf'))


class SlotOnlyEquipmentTest(unittest.TestCase):
    def test_variable_mace_and_summary_multiplicity(self):
        unit = parse('Left Arm:\n' + '\n'.join(['Mace'] * 8))
        self.assertEqual(unit['equipment'], [{'id': 'mace', 'location': 'LEFT_ARM', 'slots': list(range(8))}])
        unit = parse('Left Arm:\n' + '\n'.join(['Mace'] * 8), ['Mace, Left Arm'], 40)
        self.assertEqual(unit['equipment'], [
            {'id': 'mace', 'location': 'LEFT_ARM'},
            {'id': 'mace', 'location': 'LEFT_ARM', 'slots': [4, 5, 6, 7]},
        ])

    def test_repeated_fixed_shields_keep_qualifiers(self):
        unit = parse('Left Arm:\n' + '\n'.join(['ISSmallShield (R) (OMNIPOD) (ARMORED)'] * 6))
        self.assertEqual(unit['equipment'], [
            {'id': 'smallshield', 'location': 'LEFT_ARM', 'slots': [0, 1, 2], 'isRearMounted': True, 'isOmniPodMounted': True},
            {'id': 'smallshield', 'location': 'LEFT_ARM', 'slots': [3, 4, 5], 'isRearMounted': True, 'isOmniPodMounted': True},
        ])

    def test_ordinary_weapon_and_ammunition_are_distinct(self):
        unit = parse('Left Arm:\nISMediumLaser\nRight Torso:\nIS Ammo AC/20')
        self.assertEqual(unit['equipment'], [{'id': 'medium-laser', 'location': 'LEFT_ARM', 'slots': [0]}])

    def test_quad_talons_have_one_native_reverse_anchor(self):
        sections = '\n'.join(f'{loc}:\nTalons\nTalons' for loc in ['Front Left Leg', 'Front Right Leg', 'Rear Right Leg', 'Rear Left Leg'])
        unit = parse(sections, mass=60, config='Quad')
        self.assertEqual(unit['equipment'], [{'id': 'talons', 'location': 'REAR_LEFT_LEG', 'slots': [0, 1]}])

    def test_split_weapon_summary_can_name_inner_location(self):
        sections = 'Left Arm:\n' + '\n'.join(['ISAC20'] * 6) + '\nLeft Torso:\n' + '\n'.join(['ISAC20'] * 4)
        self.assertEqual(parse(sections)['equipment'], [{'id': 'ac-20', 'location': 'LEFT_ARM', 'slots': list(range(6))}])
        self.assertEqual(parse(sections, ['AC/20, Left Torso'])['equipment'], [{'id': 'ac-20', 'location': 'LEFT_TORSO'}])

    def test_superheavy_entry_count_applies_once(self):
        unit = parse('Left Arm:\n' + '\n'.join(['Mace'] * 6), mass=110)
        self.assertEqual(unit['equipment'], [{'id': 'mace', 'location': 'LEFT_ARM', 'slots': list(range(6))}])

    def test_catalog_summary_alias_reserves_an_inner_split_mount(self):
        sections = 'Left Arm:\n' + '\n'.join(['CLArrowIV'] * 10) + '\nLeft Torso:\n' + '\n'.join(['CLArrowIV'] * 5)
        self.assertEqual(parse(sections, ['Arrow IV, Left Torso'])['equipment'], [{'id': 'arrow-iv', 'location': 'LEFT_TORSO'}])

    def test_incomplete_recognized_mount_is_diagnostic_not_fabricated(self):
        with self.assertWarnsRegex(UserWarning, 'Incomplete source weapon allocation'):
            unit = parse('Left Arm:\nMace\nUnknown widget')
        self.assertEqual(unit['equipment'], [])
        self.assertEqual(unit['criticalSlots']['LEFT_ARM'][:2], ['Mace', 'Unknown widget'])

    def test_size_tokens_do_not_hide_kiso_tools(self):
        for tool, identity, count in [('Rock Cutter', 'rock-cutter', 5), ('Backhoe', 'backhoe', 6)]:
            slots = ['Communications Equipment:SIZE:3.0'] * 3 + [tool] * count
            unit = parse('Left Torso:\n' + '\n'.join(slots), mass=100)
            self.assertEqual(unit['equipment'], [{'id': identity, 'location': 'LEFT_TORSO', 'slots': list(range(3, 3 + count))}])


if __name__ == '__main__':
    unittest.main()
