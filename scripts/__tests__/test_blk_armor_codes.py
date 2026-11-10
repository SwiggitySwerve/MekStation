"""Native armor identities at MegaMek 48fcb2f64 EquipmentType.java:85-136."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

CONVERSION = Path(__file__).resolve().parents[1] / 'megameklab-conversion'
sys.path.insert(0, str(CONVERSION))

from blk_common import BAR_ARMOR_CODES, BLK_ARMOR_CODE_MAP, map_armor_code


class BlkArmorCodesTest(unittest.TestCase):
    def test_explicit_unknown_or_malformed_codes_never_become_standard(self):
        for code in ('52', '', '1.5', '1junk', 'Unclassified'):
            with self.subTest(code=code), self.assertRaisesRegex(
                    ValueError, 'Unsupported BLK armor_type code'):
                map_armor_code(code, BLK_ARMOR_CODE_MAP)
        self.assertEqual(map_armor_code(None, BLK_ARMOR_CODE_MAP), 'STANDARD')

    def test_missing_mapping_module_fails_instead_of_installing_fake_rules(self):
        result = subprocess.run(
            [sys.executable, '-B', '-c', '''
import builtins
import sys
sys.path.insert(0, sys.argv[1])
original_import = builtins.__import__
def import_without_mappings(name, *args, **kwargs):
    if name == 'enum_mappings':
        raise ImportError('missing enum_mappings for regression')
    return original_import(name, *args, **kwargs)
builtins.__import__ = import_without_mappings
import blk_common
''', str(CONVERSION)],
            check=False, capture_output=True, text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('missing enum_mappings for regression', result.stderr)

    def test_native_codes_keep_their_contract_identity(self):
        for code, expected in ((0, 'STANDARD'), (1, 'FERRO_FIBROUS'),
                               (4, 'HARDENED'), (7, 'PATCHWORK'),
                               (8, 'STEALTH'), (22, 'STEALTH'),
                               (42, 'STANDARD_PROTOMEK'), (43, 'BAR'), (51, 'BAR')):
            with self.subTest(code=code):
                self.assertEqual(map_armor_code(str(code), BLK_ARMOR_CODE_MAP), expected)
        self.assertEqual(list(BAR_ARMOR_CODES), list(range(43, 52)))
        with self.assertRaises(ValueError):
            map_armor_code('52', BLK_ARMOR_CODE_MAP)

    def test_codes_load_independently_of_the_working_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(
                [sys.executable, '-B', '-c',
                 'import sys; sys.path.insert(0, sys.argv[1]); '
                 'from blk_common import BLK_ARMOR_CODE_MAP; '
                 'print(BLK_ARMOR_CODE_MAP[43])', str(CONVERSION)],
                cwd=directory, check=True, capture_output=True, text=True,
            )
        self.assertEqual(result.stdout.strip(), 'BAR')
