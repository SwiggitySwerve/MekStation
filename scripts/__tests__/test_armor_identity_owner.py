"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_armor_identity_owner.py -v.

The `armor` section of src/types/formats/mtf-component-vocabulary.json is the one
owner of armor identity; the TypeScript parser and exporter read it too. This
test is the Python half of the drift guard (the TypeScript half is
src/types/formats/__tests__/armorIdentity.test.ts): it fails if the owner and the
unit contract, the BLK armor codes, or the converter's own tables stop agreeing.
It reads only repository files (no pinned mm-data), so it runs in CI.
"""

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'megameklab-conversion'))

import enum_mapping_tables  # noqa: E402
from blk_common import BLK_ARMOR_CODE_MAP  # noqa: E402
from enum_mappings import map_armor_type  # noqa: E402

OWNER = json.loads((ROOT / 'src/types/formats/mtf-component-vocabulary.json').read_text(encoding='utf-8-sig'))['armor']
SCHEMA = json.loads((ROOT / 'public/data/equipment/_schema/unit-schema.json').read_text(encoding='utf-8'))
CONTRACT_TAGS = SCHEMA['$defs']['standardArmorType']['enum']
FAMILIES = {'MTF:mech', 'BLK:battle-armor', 'BLK:aerospace', 'BLK:protomech', 'BLK:support-vehicle-BAR'}


class ArmorIdentityOwnerTest(unittest.TestCase):
    def test_one_row_per_contract_tag_in_both_directions(self):
        tags = [row['tag'] for row in OWNER]
        self.assertEqual(len(tags), len(set(tags)))
        self.assertEqual(sorted(tags), sorted(CONTRACT_TAGS))

    def test_every_row_has_a_known_family_and_an_mtf_block_exactly_on_mech_rows(self):
        self.assertEqual([r['tag'] for r in OWNER if r['family'] not in FAMILIES], [])
        self.assertEqual([r['tag'] for r in OWNER if ('mtf' in r) != (r['family'] == 'MTF:mech')], [])

    def test_names_are_unique(self):
        mech = [row for row in OWNER if 'mtf' in row]
        writes = [row['mtf']['write'] for row in mech]
        parses = [row['mtf']['parse'] for row in mech if row['mtf']['parse'] is not None]
        spellings = [s for row in mech for s in row['mtf']['spellings']]
        self.assertEqual(len(writes), len(set(writes)))
        self.assertEqual(len(parses), len(set(parses)))
        self.assertEqual(len(spellings), len(set(spellings)))

    def test_the_converter_map_is_exactly_the_owner_spellings(self):
        expected = {s: row['tag'] for row in OWNER if 'mtf' in row for s in row['mtf']['spellings']}
        self.assertEqual(enum_mapping_tables.ARMOR_TYPE_MAP, expected)
        for spelling, tag in expected.items():
            with self.subTest(spelling=spelling):
                self.assertEqual(map_armor_type(spelling), tag)

    def test_blk_armor_codes_name_only_owner_tags(self):
        tags = {row['tag'] for row in OWNER}
        shared = json.loads((ROOT / 'src/types/formats/blk-armor-codes.json').read_text(encoding='utf-8'))
        self.assertEqual([t for t in shared.values() if t not in tags], [])
        self.assertEqual([t for t in BLK_ARMOR_CODE_MAP.values() if t not in tags], [])

    def test_large_craft_code_overrides_name_only_owner_tags(self):
        # A deliberate large-craft table (blk_aerospace_tables.py) that overrides five shared codes with
        # aerospace armor; kept as a literal, but every tag it names must be an owner tag.
        import blk_aerospace_tables
        tags = {row['tag'] for row in OWNER}
        self.assertEqual([t for t in blk_aerospace_tables.LARGE_CRAFT_ARMOR_CODE_MAP.values() if t not in tags], [])
        self.assertEqual([t for t in blk_aerospace_tables.SC_ARMOR_CODE_MAP.values() if t not in tags], [])

    def test_enum_member_keys_are_unique_and_only_enum_rows_carry_one(self):
        keys = [row['enum'] for row in OWNER if row['enum'] is not None]
        self.assertEqual(len(keys), len(set(keys)))


if __name__ == '__main__':
    unittest.main()
