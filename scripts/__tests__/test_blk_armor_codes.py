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
    def test_native_codes_keep_their_contract_identity(self):
        for code, expected in ((0, 'STANDARD'), (1, 'FERRO_FIBROUS'),
                               (4, 'HARDENED'), (7, 'PATCHWORK'),
                               (8, 'STEALTH'), (22, 'STEALTH'),
                               (42, 'STANDARD_PROTOMEK'), (43, 'BAR'), (51, 'BAR')):
            with self.subTest(code=code):
                self.assertEqual(map_armor_code(str(code), BLK_ARMOR_CODE_MAP, strict=True), expected)
        self.assertEqual(list(BAR_ARMOR_CODES), list(range(43, 52)))
        with self.assertRaises(ValueError):
            map_armor_code('52', BLK_ARMOR_CODE_MAP, strict=True)

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
