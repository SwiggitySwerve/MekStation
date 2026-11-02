"""Pinned append preserves historical reference bytes and records provenance."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from append_pinned_bv_references import append_references, entry_spans


class PinnedBVAppendTest(unittest.TestCase):
    def test_shipped_historical_entries_are_byte_frozen_and_additions_tagged(self):
        root = Path(__file__).resolve().parents[2]
        cache = (root / 'scripts/data-migration/megamek-bv-cache.json').read_bytes()
        values, spans = json.loads(cache)['entries'], entry_spans(cache)[2]
        removed = json.loads((root / 'src/services/units/__tests__/fixtures/battleMechRemovedIds.json').read_text())
        historical = [spans[key] for key in sorted(spans) if key not in removed and not values[key].get('source', '').startswith('pinned-java-')]
        self.assertEqual(hashlib.sha256('\n'.join(historical).encode()).hexdigest(), 'd1d1fb04ee0536ccadb7090470f4ffecf6b314f91310485018f96ea24346773f')
        self.assertEqual(sum(entry.get('source') == 'pinned-java-48fcb2f6' for entry in values.values()), 82)

    def test_only_appends_tagged_missing_ids_and_drops_approved_retirements(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'meks').mkdir()
            (root / 'meks/new.mtf').write_bytes(b'chassis:New\r\nmodel:N\r\n')
            digest = hashlib.sha256(b'chassis:New\nmodel:N\n').hexdigest()
            cache = b'{\n  "entries": {\n    "old": { "megamekBV" : 777, "note": "historical" },\n    "retired": { "megamekBV": 500 }\n  }\n}'
            oracle = [{'path': 'meks/new.mtf', 'sha256': digest, 'chassis': 'New', 'model': 'N', 'battleValue': {'total': 1234}}]
            index = {'units': [{'id': 'old', 'chassis': 'Old', 'model': 'O'}, {'id': 'new', 'chassis': 'New', 'model': 'N'}]}
            after = append_references(cache, oracle, index, ['retired'], root)
            self.assertEqual(entry_spans(cache)[2]['old'], entry_spans(after)[2]['old'])
            entries = json.loads(after)['entries']
            self.assertEqual(set(entries), {'old', 'new'})
            self.assertEqual(entries['new'], {'megamekBV': 1234, 'source': 'pinned-java-48fcb2f6', 'sourcePath': 'meks/new.mtf', 'sourceSha256': digest})
            self.assertEqual(append_references(after, oracle, index, ['retired'], root), after)
            with self.assertRaisesRegex(ValueError, 'catalog'):
                append_references(cache, oracle, index, ['old'], root)
            oracle[0]['sha256'] = '0' * 64
            with self.assertRaisesRegex(ValueError, 'hash'):
                append_references(cache, oracle, index, ['retired'], root)
