"""Weapon quirk metadata follows the pinned mount through every converter."""
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/megameklab-conversion'))
from blk_aerospace_converter import convert_aerospace_blk
from blk_battlearmor_converter import convert_battlearmor_blk
from blk_capital_converter import convert_capital_blk
from blk_infantry_converter import convert_infantry_blk
from blk_protomech_converter import convert_protomech_blk
from blk_vehicle_converter import convert_vehicle_blk
from mtf_converter import MTFParser, dataclass_to_dict
from schema_gate import validate_unit
from weapon_quirks import append_weapon_quirk

FIXTURES = Path(__file__).parent / 'fixtures'
read = lambda name: json.loads((FIXTURES / name).read_text(encoding='utf8'))
NATIVE = 'mod_weapons:LWG:0:Medium Laser\naccurate:LWG:0:Medium Laser\nmod_weapons:LWG:0:Medium Laser\nmod_weapons:LWG:1:Medium Laser'
EXPECTED = {'LWG:0:Medium Laser': ['mod_weapons', 'accurate', 'mod_weapons'], 'LWG:1:Medium Laser': ['mod_weapons']}


def without_quirks(body):
    return re.sub(r'<(?:quirks|weaponQuirks)>.*?</(?:quirks|weaponQuirks)>', '', body, flags=re.S)


class WeaponQuirkConversionTest(unittest.TestCase):
    def bases(self):
        common = read('blk_converter_fidelity.json')['fixtures']
        return [
            ('vehicle', convert_vehicle_blk, next(row['blk'] for row in common if row['family'] == 'vehicles')),
            ('aerospace', convert_aerospace_blk, next(row['blk'] for row in common if row['family'] == 'aerospace')),
            ('battle armor', convert_battlearmor_blk, read('blk_battlearmor_fidelity.json')['fixtures'][0]['blk']),
            ('ProtoMek', convert_protomech_blk, read('protomechs.pinned.json')[0]['blk']),
            ('infantry', convert_infantry_blk, read('blk_infantry.json')[0]['body']),
            ('capital', convert_capital_blk, read('capital-sources.json')['comitatus']['content']),
        ]

    def test_every_blk_converter_writes_unit_and_mount_quirks(self):
        # BLKFile.java:218-230 (48fcb2f64); native locations/names stay source data.
        for family, converter, base in self.bases():
            with self.subTest(family=family), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / 'source.blk'
                path.write_text(without_quirks(base) + '\n<quirks>\neasy_maintain\n</quirks>\n<weaponQuirks>\n' + NATIVE + '\n</weaponQuirks>\n', encoding='utf8')
                unit = converter(path, logging.getLogger(__name__))
                self.assertIsNotNone(unit)
                self.assertEqual(unit.get('weaponQuirks'), EXPECTED)
                self.assertEqual(unit.get('quirks'), ['easy_maintain'])
                self.assertEqual(validate_unit(unit), [])

    def test_mtf_converter_writes_mount_quirks_at_conversion_time(self):
        # Enforcer ENF-5A Enforcer II.mtf:32-34 at mm-data 50f7efef.
        lines = ['chassis:Enforcer', 'model:ENF-5A Enforcer II', 'mass:50',
                 'quirk:easy_maintain',
                 'weaponquirk:imp_cooling:RA:3:Autocannon/10',
                 'weaponquirk:ammo_feed_problems:RA:3:Autocannon/10',
                 'weaponquirk:fast_reload:RA:3:Autocannon/10']
        unit = dataclass_to_dict(MTFParser()._parse_lines(lines, 'Enforcer.mtf'))
        self.assertEqual(unit.get('weaponQuirks'), {'RA:3:Autocannon/10': ['imp_cooling', 'ammo_feed_problems', 'fast_reload']})
        self.assertEqual(unit['quirks'], ['easy_maintain'])

    def test_units_without_source_quirks_do_not_gain_empty_fields(self):
        for family, converter, base in self.bases():
            with self.subTest(family=family), tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / 'source.blk'
                path.write_text(without_quirks(base), encoding='utf8')
                unit = converter(path, logging.getLogger(__name__))
                self.assertNotIn('weaponQuirks', unit)
                self.assertNotIn('quirks', unit)

    def test_schema_accepts_mount_keyed_quirks_and_rejects_wrong_values(self):
        base = {'id': 'quirk-contract', 'unitType': 'Vehicle', 'weaponQuirks': EXPECTED}
        schema = json.loads((ROOT / 'public/data/equipment/_schema/unit-schema.json').read_text())
        self.assertIn('weaponQuirks', schema['properties'])
        self.assertEqual(validate_unit(base), [])
        self.assertTrue(validate_unit(dict(base, weaponQuirks={'LWG:0:Medium Laser': 'accurate'})))

    def test_malformed_native_locators_fail_instead_of_being_dropped(self):
        for entry in ['accurate:RA:bad:Medium Laser', 'accurate:RA:-1:Medium Laser',
                      'accurate:RA:1.5:Medium Laser', 'accurate:RA:3:', 'accurate:Medium Laser']:
            with self.subTest(entry=entry), self.assertRaisesRegex(ValueError, 'weapon quirk'):
                append_weapon_quirk({}, entry)

    def test_python_matches_the_ts_pinned_source_cases(self):
        fixture = json.loads((ROOT / 'src/services/conversion/__tests__/fixtures/weaponQuirks.pinned.json').read_text())
        self.assertEqual(fixture['mmDataPin'], '50f7efef0c9f775b0258f8283525ed4f906e1985')
        for format in ['mtf', 'blk']:
            for text, mount, quirk, path, line in fixture[format]['lines']:
                with self.subTest(path=path, line=line):
                    result = {}
                    append_weapon_quirk(result, text.split(':', 1)[1] if format == 'mtf' else text)
                    self.assertEqual(result, {mount: [quirk]})


if __name__ == '__main__':
    unittest.main()
