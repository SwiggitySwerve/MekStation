"""Quirk-only regeneration must preserve raw construction bytes, not just values."""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from quirk_json import assert_quirk_only_change, core_bytes, patch_quirk_fields


class QuirkJsonTest(unittest.TestCase):
    def test_new_mount_fields_preserve_unicode_escapes_numbers_and_crlf(self):
        before = b'{\r\n  "id" : "frozen\\u00e9",\r\n  "unitType": "Vehicle",\r\n  "tonnage": 3.000,\r\n  "equipment": [{"id":"PPC","weight":0.0}],\r\n  "quirks" : [ "easy_maintain" ]\r\n}\r\n'
        fields = {'quirks': ['easy_maintain'], 'weaponQuirks': {'TU:0:PPC': ['accurate']}}
        after = patch_quirk_fields(before, fields)
        self.assertEqual(json.loads(after)['weaponQuirks'], fields['weaponQuirks'])
        self.assertIn(b'"quirks" : [ "easy_maintain" ]', after)
        self.assertIn(b'"tonnage": 3.000', after)
        self.assertEqual(core_bytes(before), core_bytes(after))
        assert_quirk_only_change(before, after)
        self.assertEqual(patch_quirk_fields(after, fields), after)

    def test_existing_field_updates_preserve_non_quirk_members(self):
        before = b'{"quirks":["easy_maintain"],"id":"u","unitType":"Vehicle","weaponQuirks":{"TU:0:PPC":["accurate"]}}'
        after = patch_quirk_fields(before, {'quirks': ['obsolete:3045'], 'weaponQuirks': {'TU:0:PPC': ['accurate', 'mod_weapons']}})
        self.assertEqual(json.loads(after)['quirks'], ['obsolete:3045'])
        self.assertEqual(core_bytes(before), core_bytes(after))

    def test_nested_quirks_and_quirk_words_in_strings_are_not_exempt(self):
        before = b'{"id":"u","unitType":"Vehicle","equipment":[{"quirks":["accurate"]}],"note":"weaponQuirks: comma , and brace }"}'
        after = patch_quirk_fields(before, {'weaponQuirks': {'TU:0:PPC': ['accurate']}})
        assert_quirk_only_change(before, after)
        with self.assertRaisesRegex(ValueError, 'outside quirk'):
            assert_quirk_only_change(after, after.replace(b'"quirks":["accurate"]', b'"quirks":["inaccurate"]'))

    def test_weight_identity_and_even_equivalent_number_bytes_are_guarded(self):
        before = b'{"id":"frozen","unitType":"Vehicle","tonnage":3.000}'
        for after in [before.replace(b'3.000', b'4.000'), before.replace(b'3.000', b'3.0'), before.replace(b'frozen', b'changed')]:
            with self.subTest(after=after), self.assertRaisesRegex(ValueError, 'outside quirk'):
                assert_quirk_only_change(before, after)

    def test_empty_patch_is_a_byte_exact_noop(self):
        before = b'{ "id":"u", "unitType":"Vehicle" }\n'
        self.assertEqual(patch_quirk_fields(before, {}), before)

    def test_other_fields_duplicate_keys_and_non_objects_fail_closed(self):
        with self.assertRaises(ValueError):
            patch_quirk_fields(b'{"id":"u"}', {'id': 'changed'})
        for source in [b'{"id":"a","id":"b"}', b'[]', b'{"id":"a",}']:
            with self.subTest(source=source), self.assertRaises(ValueError):
                core_bytes(source)


if __name__ == '__main__':
    unittest.main()
