"""MekBVCalculator.java:469-473 at 48fcb2f64 retains VRRP's cockpit identity."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from mtf_converter import MTFParser, dataclass_to_dict


class VrrpCockpitTest(unittest.TestCase):
    def test_source_identity_survives_conversion_and_schema(self):
        unit = dataclass_to_dict(MTFParser()._parse_lines(
            ['chassis:Wildfire', 'model:Test', 'cockpit:Virtual Reality Piloting Pod'],
            'source.mtf'))
        self.assertEqual(unit['cockpit'], 'VRRP')
        schema = json.loads((Path(__file__).resolve().parents[2] /
            'public/data/equipment/_schema/unit-schema.json').read_text(encoding='utf-8'))
        self.assertIn(unit['cockpit'], schema['properties']['cockpit']['enum'])


if __name__ == '__main__':
    unittest.main()
