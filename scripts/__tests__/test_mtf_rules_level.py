"""Pinned MtfFile.java:828-902 decodes one-based source rules levels."""

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from enum_mappings import map_rules_level
from mtf_converter import MTFParser


class MtfRulesLevelTest(unittest.TestCase):
    def test_source_levels_follow_the_pinned_loader_for_each_chassis_base(self):
        # MegaMek 48fcb2f64 MtfFile.java:828-902. Clan and Mixed start at 2.
        levels = [(1, 'INTRODUCTORY'), (2, 'STANDARD'), (3, 'ADVANCED'),
                  (4, 'EXPERIMENTAL'), (5, 'UNOFFICIAL')]
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'rules.mtf'
            for tech_base in ['Inner Sphere', 'Clan', 'Mixed (IS Chassis)',
                              'Mixed (Clan Chassis)']:
                for level, expected in levels:
                    if level == 1 and tech_base != 'Inner Sphere':
                        continue
                    with self.subTest(tech_base=tech_base, level=level):
                        source.write_text(
                            f'chassis:Rules\nmodel:Test\nConfig:Biped\n'
                            f'techbase:{tech_base}\nrules level:{level}\n'
                            'era:3050\nmass:30\n', encoding='utf-8')
                        unit = MTFParser().parse_file(str(source))
                        self.assertIsNotNone(unit)
                        self.assertEqual(unit.rulesLevel, expected)

    def test_javelin_header_keeps_box_set_level_and_other_source_facts(self):
        # mm-data 50f7efe: meks/3025 CCE/Light/Javelin JVN-10U.mtf.
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'Javelin JVN-10U.mtf'
            source.write_text(
                'chassis:Javelin\nmodel:JVN-10U\nConfig:Biped\n'
                'techbase:Inner Sphere\nera:2751\nrules level:1\nmass:30\n',
                encoding='utf-8')
            unit = MTFParser().parse_file(str(source))
            self.assertIsNotNone(unit)
            self.assertEqual(unit.rulesLevel, 'INTRODUCTORY')
            self.assertEqual((unit.id, unit.year, unit.tonnage),
                             ('javelin-jvn-10u', 2751, 30))

    def test_named_aliases_and_legacy_zero_keep_their_existing_values(self):
        aliases = {'0': 'INTRODUCTORY', 'Introductory': 'INTRODUCTORY',
                   'Standard': 'STANDARD', 'Advanced': 'ADVANCED',
                   'Experimental': 'EXPERIMENTAL', 'Unofficial': 'UNOFFICIAL',
                   'IS Level 1': 'INTRODUCTORY', 'IS Level 2': 'STANDARD',
                   'IS Level 3': 'ADVANCED', 'IS Level 4': 'EXPERIMENTAL',
                   'Clan Level 2': 'STANDARD', 'Clan Level 3': 'ADVANCED'}
        for source, expected in aliases.items():
            with self.subTest(source=source):
                self.assertEqual(map_rules_level(source), expected)


if __name__ == '__main__':
    unittest.main()
