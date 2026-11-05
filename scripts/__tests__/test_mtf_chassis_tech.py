"""MtfFile.java:867-902 at 48fcb2f6 retains Mixed Tech chassis identity."""
import json
import sys
import unittest
from pathlib import Path
from jsonschema import Draft202012Validator

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from mtf_converter import MTFParser, dataclass_to_dict


class ChassisTechTest(unittest.TestCase):
    def test_explicit_mixed_chassis_uses_the_existing_component_contract(self):
        schema = json.loads((Path(__file__).resolve().parents[2] /
            'public/data/equipment/_schema/unit-schema.json').read_text(encoding='utf-8'))
        validator = Draft202012Validator({**schema['properties']['componentTechBases'], '$defs': schema['$defs']})
        for source, expected in [('Mixed (Clan Chassis)', 'CLAN'),
                                 ('Mixed (IS Chassis)', 'INNER_SPHERE')]:
            with self.subTest(source=source):
                unit = dataclass_to_dict(MTFParser()._parse_lines(
                    ['chassis:Mixed', 'model:Test', 'techbase:' + source], 'source.mtf'))
                self.assertEqual(unit['techBase'], 'MIXED')
                self.assertEqual(unit['componentTechBases'], {'chassis': expected})
                validator.validate(unit['componentTechBases'])

    def test_unqualified_sources_do_not_gain_inferred_component_selections(self):
        for source in ['Clan', 'Inner Sphere', 'Mixed']:
            with self.subTest(source=source):
                unit = dataclass_to_dict(MTFParser()._parse_lines(
                    ['chassis:Legacy', 'model:Test', 'techbase:' + source], 'source.mtf'))
                self.assertNotIn('componentTechBases', unit)


if __name__ == '__main__':
    unittest.main()
