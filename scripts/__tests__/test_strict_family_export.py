"""Family exports must reconstruct the complete strict export byte for byte."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from export_vehicle_aero_json import export_strict


class StrictFamilyExportTest(unittest.TestCase):
    def test_family_exports_equal_full_export_including_failed_sources(self):
        families = json.loads((Path(__file__).resolve().parents[1] / 'megameklab-conversion/strict-families.json').read_text())
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            mekfiles = root / 'mekfiles'
            for folders in families.values():
                for folder in folders:
                    directory = mekfiles / folder
                    directory.mkdir(parents=True)
                    extension = 'mtf' if folder == 'meks' else 'blk'
                    for name in ['z', 'a']:
                        (directory / f'{name}.{extension}').write_bytes(b'unsupported\r\n')
            export_strict(mekfiles, root / 'serial')
            pieces = []
            for family in families:
                export_strict(mekfiles, root / family, family=family)
                receipt = json.loads((root / family / 'sources.ndjson.manifest.json').read_text())
                self.assertEqual(receipt['scope'], family)
                self.assertEqual(receipt['folders'], families[family])
                self.assertEqual(receipt['sourceCount'], 2 * len(families[family]))
                pieces.append((root / family / 'sources.ndjson').read_bytes())
            self.assertEqual(b''.join(pieces), (root / 'serial/sources.ndjson').read_bytes())
            rows = [json.loads(line) for line in b''.join(pieces).splitlines()]
            self.assertEqual(len(rows), 24)
            self.assertTrue(any('reason' in row for row in rows))

    def test_unknown_family_fails_before_creating_output(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'output'
            with self.assertRaisesRegex(ValueError, 'family'):
                export_strict(Path(temp), output, family='unknown')
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
