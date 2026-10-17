"""Run with python -m unittest discover -s scripts/__tests__ -p test_mtf_text_regeneration.py."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from mtf_converter import convert_mtf_file
from mtf_text_regeneration import regenerate_text, regenerate_value, repair_text


class TextRegenerationTest(unittest.TestCase):
    def test_mixed_unicode_and_trimmed_nbsp(self):
        source = 'D\u00f6kk\u00e1lfar \u2013 history'
        corrupt = source.encode('utf-8').decode('latin-1') + ' \u2014 valid'
        self.assertEqual(repair_text(corrupt), source + ' \u2014 valid')
        self.assertEqual(regenerate_value('end.\u00c2', 'end.'), 'end.')
        self.assertEqual(repair_text('G\u00f9n \u2014 \u96ea'), 'G\u00f9n \u2014 \u96ea')

    def test_rejects_repair_that_disagrees_with_source(self):
        with self.assertRaises(ValueError):
            regenerate_value('D\u00c3\u00b6kk', 'Different text')

    def test_utf8_source_regeneration_preserves_ids_and_construction(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'source'
            output = root / 'output'
            source.mkdir()
            output.mkdir()
            mtf = source / 'unit.mtf'
            mtf.write_text('chassis:G\u00f9n\nmodel:GN-2O\nmass:20\nhistory:Past \u2013 future\n', encoding='utf-8')
            converted = root / 'converted.json'
            self.assertTrue(convert_mtf_file(str(mtf), str(converted)))
            unit = json.loads(converted.read_text(encoding='utf-8'))
            self.assertEqual(unit['chassis'], 'G\u00f9n')
            self.assertEqual(unit['fluff']['history'], 'Past \u2013 future')
            unit['id'] = 'shipped-unit-id'
            unit['tonnage'] = 95  # Later construction correction must survive.
            unit['chassis'] = unit['chassis'].encode('utf-8').decode('latin-1')
            unit['fluff']['history'] = unit['fluff']['history'].encode('utf-8').decode('latin-1')
            old_path = output / (unit['chassis'] + ' GN-2O.json')
            old_path.write_text(json.dumps(unit, ensure_ascii=False), encoding='utf-8')
            index = {'totalUnits': 1, 'generatedAt': 'unchanged', 'units': [{
                'id': 'shipped-index-id', 'chassis': unit['chassis'], 'model': unit['model'],
                'path': old_path.name, 'bv': 1234,
            }]}
            index_path = output / 'index.json'
            index_path.write_text(json.dumps(index), encoding='utf-8')
            before = {p: p.read_bytes() for p in output.iterdir()}
            self.assertEqual(regenerate_text(str(source), str(output), check=True), 2)
            self.assertEqual(before, {p: p.read_bytes() for p in output.iterdir()})
            self.assertEqual(regenerate_text(str(source), str(output)), 2)
            self.assertFalse(old_path.exists())
            new_path = output / 'G\u00f9n GN-2O.json'
            updated = json.loads(new_path.read_text(encoding='utf-8'))
            self.assertEqual(updated['id'], 'shipped-unit-id')
            self.assertEqual(updated['tonnage'], 95)
            self.assertEqual(updated['fluff']['history'], 'Past \u2013 future')
            updated_index = json.loads(index_path.read_text(encoding='utf-8'))
            self.assertEqual(updated_index['units'][0]['id'], 'shipped-index-id')
            self.assertEqual(updated_index['units'][0]['bv'], 1234)
            self.assertEqual(updated_index['generatedAt'], 'unchanged')
            self.assertEqual(updated_index['units'][0]['path'], new_path.name)
            self.assertEqual(regenerate_text(str(source), str(output), check=True), 0)

    def test_missing_sources_fail_without_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'index.json').write_text('{"totalUnits":0,"units":[]}', encoding='utf-8')
            before = (root / 'index.json').read_bytes()
            with self.assertRaisesRegex(ValueError, 'No MTF sources'):
                regenerate_text(str(root / 'absent'), str(root))
            self.assertEqual((root / 'index.json').read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
