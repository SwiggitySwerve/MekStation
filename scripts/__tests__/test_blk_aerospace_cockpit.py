"""Native cockpit facts are shared; the existing Python output must not drift."""
import hashlib
import json
import logging
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/megameklab-conversion'))
from blk_aerospace_converter import convert_aerospace_blk, map_cockpit_code


class AerospaceCockpitSourceTest(unittest.TestCase):
    def test_native_codes_and_legacy_python_aliases_are_preserved(self):
        # Aero.java:106-109. Codes 4..6 are existing Python compatibility only.
        for code, expected in ((0, 'STANDARD'), (1, 'SMALL'), (2, 'COMMAND_CONSOLE'),
                               (3, 'PRIMITIVE'), (4, 'STANDARD_AERO'), (5, 'PRIMITIVE_AERO'), (6, 'CLAN')):
            with self.subTest(code=code):
                self.assertEqual(map_cockpit_code(code), expected)
        for code in (None, 99, 'bad'):
            with self.subTest(code=code):
                self.assertEqual(map_cockpit_code(code), 'STANDARD')

    def test_twelve_original_byte_sources_keep_their_python_cockpit(self):
        fixture = ROOT / 'src/services/units/handlers/__tests__/fixtures/aerospace-cockpit-source.json'
        rows = json.loads(fixture.read_text(encoding='utf-8'))['fixtures']
        self.assertEqual(len(rows), 12)
        for row in rows:
            with self.subTest(path=row['path']), tempfile.TemporaryDirectory() as directory:
                raw = row['blk'].encode('utf-8')
                self.assertEqual(hashlib.sha256(raw).hexdigest(), row['sha256'])
                source = Path(directory) / 'cockpit.blk'
                source.write_bytes(raw)
                unit = convert_aerospace_blk(source, logging.getLogger(__name__))
                self.assertIsNotNone(unit)
                self.assertEqual(unit['cockpit'], row['cockpitType'])


if __name__ == '__main__':
    unittest.main()
