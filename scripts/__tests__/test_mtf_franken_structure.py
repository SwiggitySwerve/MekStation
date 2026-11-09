"""FrankenMek per-location structure tonnage: MegaMek 48fcb2f6 MtfFile.java:669-691."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from mtf_converter import MTFParser, dataclass_to_dict

# Schwerer Gustav (mm-data 50f7efef, meks/XTRs/Mercenaries) header lines.
GUSTAV = ['chassis:Schwerer Gustav', 'model:', 'Config:Biped FrankenMek', 'mass:100',
          'structure:Hybrid', 'LA structure:IS Endo Steel:65', 'RA structure:IS Endo Steel:65',
          'LT structure:Standard:100', 'RT structure:IS Endo Steel:70', 'CT structure:Standard:100',
          'HD structure:Standard:100', 'LL structure:Standard:100', 'RL structure:Standard:100']


class FrankenStructureTest(unittest.TestCase):
    def test_types_and_tech_identity(self):
        unit = dataclass_to_dict(MTFParser()._parse_lines(GUSTAV, 'source.mtf'))
        self.assertEqual(unit['structure']['typeByLocation']['LEFT_ARM'], 'ENDO_STEEL')
        lines = [line.replace('IS Endo Steel:65', 'Clan Endo Steel:65') for line in GUSTAV]
        unit = dataclass_to_dict(MTFParser()._parse_lines(lines, 'source.mtf'))
        self.assertEqual(unit['structure']['typeByLocation']['LEFT_ARM'], 'ENDO_STEEL_CLAN')

    def test_unknown_native_types_fail(self):
        for spelling in ['Unknown Alloy', 'ENDO_STEEL']:
            lines = [line.replace('IS Endo Steel:65', f'{spelling}:65') for line in GUSTAV]
            with self.assertRaisesRegex(ValueError, 'Unknown structure type for la:'):
                MTFParser()._parse_lines(lines, 'source.mtf')

    def test_missing_and_scalar_hybrid_defaults(self):
        lines = ['chassis:X', 'Config:Biped FrankenMek', 'mass:50', 'structure:Hybrid', 'LA structure:35']
        unit = dataclass_to_dict(MTFParser()._parse_lines(lines, 'source.mtf'))
        self.assertEqual(unit['structure']['typeByLocation'], {})

    def test_chassis_tech_qualifies_only_unprefixed_donors(self):
        lines = ['chassis:X', 'Config:Biped FrankenMek', 'mass:50', 'techbase:Mixed (Clan Chassis)',
                 'structure:Hybrid', 'LA structure:Endo-Composite:50', 'RA structure:IS Endo Steel:50']
        unit = dataclass_to_dict(MTFParser()._parse_lines(lines, 'source.mtf'))
        self.assertEqual(unit['structure']['typeByLocation'], {'LEFT_ARM': 'ENDO_COMPOSITE_CLAN', 'RIGHT_ARM': 'ENDO_STEEL'})

    def test_hybrid_frankenmek_keeps_each_location_tonnage(self):
        unit = dataclass_to_dict(MTFParser()._parse_lines(GUSTAV, 'source.mtf'))
        self.assertEqual(unit['structure']['locationTonnage'], {
            'HEAD': 100, 'CENTER_TORSO': 100, 'LEFT_TORSO': 100, 'RIGHT_TORSO': 70,
            'LEFT_ARM': 65, 'RIGHT_ARM': 65, 'LEFT_LEG': 100, 'RIGHT_LEG': 100})

    def test_plain_tonnage_values_without_a_type(self):
        lines = ['chassis:X', 'Config:Biped FrankenMek', 'mass:50', 'structure:Standard', 'LA structure:35']
        unit = dataclass_to_dict(MTFParser()._parse_lines(lines, 'source.mtf'))
        self.assertEqual(unit['structure']['locationTonnage'], {'LEFT_ARM': 35})

    def test_non_frankenmeks_do_not_gain_location_tonnage(self):
        lines = [line for line in GUSTAV if line != 'Config:Biped FrankenMek'] + ['Config:Biped']
        unit = dataclass_to_dict(MTFParser()._parse_lines(lines, 'source.mtf'))
        self.assertEqual(unit['structure'], {'type': 'STANDARD'})


if __name__ == '__main__':
    unittest.main()
