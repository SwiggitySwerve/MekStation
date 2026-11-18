"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_armor_accepted_names.py -v.

Pins the armor spellings the Python converter accepts today. The fixture was
generated from the code BEFORE armor identity moved into the shared vocabulary
file, and this test passes unchanged before and after that move. The TypeScript
half of the same fixture is
src/services/conversion/__tests__/MTFVocabulary.armorAccepted.test.ts. The two
languages accept different sets; this test keeps Python's as it is. It reads only
repository files (no pinned mm-data), so it also runs in CI.
"""

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'megameklab-conversion'))

from enum_mappings import map_armor_type  # noqa: E402

FIXTURE = json.loads(
    (ROOT / 'src/types/formats/__tests__/fixtures/armor-accepted-names.json').read_text(encoding='utf-8')
)


def resolve(candidate: str) -> str:
    try:
        return map_armor_type(candidate)
    except ValueError:
        return 'UNSUPPORTED'


class PythonArmorAcceptedNamesTest(unittest.TestCase):
    def test_accepts_exactly_the_pinned_candidates_with_the_pinned_tags(self):
        self.assertEqual(set(FIXTURE['python']), set(FIXTURE['candidates']))
        mismatches = [
            (candidate, expected, resolve(candidate))
            for candidate, expected in FIXTURE['python'].items()
            if resolve(candidate) != expected
        ]
        self.assertEqual(mismatches, [])

    def test_an_unlisted_name_is_refused_not_guessed(self):
        for candidate in ('Bogus', '', 'Standard(Mixed)', 'standard', 'STANDARD'):
            with self.subTest(candidate=candidate):
                with self.assertRaises(ValueError):
                    map_armor_type(candidate)


if __name__ == '__main__':
    unittest.main()
