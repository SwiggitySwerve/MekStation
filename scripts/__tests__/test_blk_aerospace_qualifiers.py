"""UL-06b: original pinned BLKs cross the Python catalog boundary intact."""

import hashlib
import json
import logging
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk
from blk_schema_writers import write_unit_json

FIXTURES = Path(__file__).parent / 'fixtures' / 'aerospace_source_qualifiers.json'


class AerospaceSourceQualifiersTest(unittest.TestCase):
    def test_eight_pinned_sources_round_trip(self):
        fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))['fixtures']
        self.assertEqual(len(fixtures), 8)
        for fixture in fixtures:
            with self.subTest(source=fixture['source']), tempfile.TemporaryDirectory() as temp:
                source = Path(temp) / 'source.blk'
                source.write_bytes(fixture['blk'].encode('utf-8'))
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), fixture['sha256'])
                unit = convert_aerospace_blk(source, logging.getLogger('aerospace-qualifiers'))
                self.assertIsNotNone(unit)
                for key, expected in fixture['qualifiers'].items():
                    self.assertIn(key, unit, f'{key} was dropped')
                    self.assertEqual(unit[key], expected)
                self.assertEqual(unit['armor'], fixture['armor'])
                self.assertEqual(unit, fixture['unit'])
                destination = Path(temp) / 'unit.json'
                write_unit_json(destination, unit)
                self.assertEqual(json.loads(destination.read_text(encoding='utf-8')), unit)

    def test_explicit_zero_false_empty_and_absence(self):
        from blk_aerospace_qualifiers import parse_aerospace_qualifiers

        self.assertEqual(parse_aerospace_qualifiers({}), {})
        self.assertEqual(parse_aerospace_qualifiers({
            'omni': 'false', 'omnipodheatsinks': '0',
            'clan_engine': 'false', 'transporters': '',
        }), {'isOmni': True, 'omniPodHeatSinks': 0, 'clanEngine': False, 'transporters': []})

    def test_bar_codes_read_rating_from_tag_only(self):
        from blk_aerospace_qualifiers import parse_aerospace_armor

        for code in range(43, 52):
            with self.subTest(code=code):
                tags = {'armor_type': str(code), 'barrating': '4'}
                self.assertEqual(parse_aerospace_armor(tags), {'type': 'BAR', 'barRating': 4})
                self.assertEqual(parse_aerospace_armor({'armor_type': str(code)}), {'type': 'BAR'})
        self.assertEqual(parse_aerospace_armor({'armor_type': '41'}), {'type': 'AEROSPACE'})


if __name__ == '__main__':
    unittest.main()
