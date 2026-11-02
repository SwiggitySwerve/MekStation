"""Source LAM subtype must survive conversion to the BV input boundary."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from mtf_converter import MTFParser, dataclass_to_dict
class LamSubtypeTest(unittest.TestCase):
    def test_source_subtypes_survive_serialization(self):
        for subtype in ('Standard', 'Bimodal'):
            with self.subTest(subtype=subtype):
                source = ['chassis:Shadow Hawk LAM', 'model:SHD-X1', 'Config:LAM', 'mass:55', 'lam:' + subtype]
                unit = MTFParser()._parse_lines(source, 'source.mtf')
                self.assertEqual(dataclass_to_dict(unit)['lamType'], subtype)
    def test_non_lams_do_not_gain_a_subtype(self):
        unit = MTFParser()._parse_lines(['chassis:Atlas', 'model:AS7-D', 'mass:100'], 'source.mtf')
        self.assertNotIn('lamType', dataclass_to_dict(unit))
