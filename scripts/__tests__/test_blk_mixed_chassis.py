"""Reproduce #3287's trailing chassis field, plus the vehicle/fighter armor and engine sides, without changing prior BLK bytes."""
import hashlib
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_vehicle_converter import convert_vehicle_blk
from blk_aerospace_converter import convert_aerospace_blk
from blk_infantry_converter import convert_infantry_blk
from blk_battlearmor_converter import convert_battlearmor_blk

FIXTURE_DIR = Path(__file__).parent / 'fixtures'
FIXTURES = json.loads((FIXTURE_DIR / 'blk_mixed_chassis.json').read_text(encoding='utf-8'))
CONVERTERS = {'vehicles': convert_vehicle_blk, 'aerospace': convert_aerospace_blk,
              'infantry': convert_infantry_blk}
# Armor side per pinned source (armor_tech_level -> TechConstants.isClan): Bardiche 7, Anhur 7, Corax 1 -> IS;
# Goth D 2 -> Clan. Infantry carries no armor side.
ARMOR_SIDE = {'vehicles/3150/Bardiche Heavy Strike Tank C.blk': 'INNER_SPHERE',
              'vehicles/XTRs/Pirates/Anhur P-Stealth.blk': 'INNER_SPHERE',
              'fighters/TRO3067 Unabridged/IS Aerospace/Corax CRX-OR.blk': 'INNER_SPHERE',
              'fighters/Golden Century/Goth D.blk': 'CLAN'}


def with_header(body, header):
    return re.sub(r'<type>.*?</type>', f'<type>{header}</type>', body, flags=re.S)


class MixedChassisTest(unittest.TestCase):
    def convert(self, converter, body):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'source.blk'
            source.write_text(body, encoding='utf-8')
            unit = converter(source, logging.getLogger('mixed-chassis-test'))
        self.assertIsNotNone(unit)
        return unit

    def test_pinned_packet_sources_append_exact_field_and_preserve_prior_bytes(self):
        for fixture in FIXTURES:
            with self.subTest(source=fixture['path']):
                body = fixture['body'].replace('\r\n', '\n')
                self.assertEqual(hashlib.sha256(body.encode()).hexdigest(), fixture['sha256'])
                unit = self.convert(CONVERTERS[fixture['family']], body)
                self.assertEqual(unit['techBase'], 'MIXED')
                sides = {'chassis': fixture['chassis']}
                if fixture['path'] in ARMOR_SIDE:
                    sides['armor'] = ARMOR_SIDE[fixture['path']]
                self.assertEqual(list(unit)[-1], 'componentTechBases')
                self.assertEqual(unit.pop('componentTechBases'), sides)
                if fixture['family'] != 'infantry' and '<clan_engine>' not in body:
                    # The resolved engine side of an untagged Mixed source is the only other new field.
                    self.assertIs(unit.pop('clanEngine'), fixture['chassis'] == 'CLAN')
                previous = json.dumps(unit, indent=2, ensure_ascii=False).encode()
                self.assertEqual(hashlib.sha256(previous).hexdigest(), fixture['previousOutputSha256'])

    def test_all_valid_mixed_headers_use_the_same_projection(self):
        for family, converter in CONVERTERS.items():
            body = next(f['body'] for f in FIXTURES if f['family'] == family)
            for chassis, expected in [('IS', 'INNER_SPHERE'), ('Clan', 'CLAN')]:
                for suffix in ['', ' Advanced', ' Experimental', ' Unofficial']:
                    header = f'Mixed ({chassis} Chassis){suffix}'
                    with self.subTest(family=family, header=header):
                        unit = self.convert(converter, with_header(body, header))
                        sides = {'chassis': expected} if family == 'infantry' else {'chassis': expected, 'armor': 'INNER_SPHERE'}
                        self.assertEqual(unit['componentTechBases'], sides)
                        self.assertEqual(list(unit)[-1], 'componentTechBases')

    def test_non_mixed_controls_do_not_gain_component_selections(self):
        for family, converter in CONVERTERS.items():
            body = next(f['body'] for f in FIXTURES if f['family'] == family)
            for header in ['IS', 'IS Level 1', 'IS Level 2', 'Clan', 'Clan Level 3']:
                with self.subTest(family=family, header=header):
                    unit = self.convert(converter, with_header(body, header))
                    self.assertNotIn('componentTechBases', unit)

    def test_battlearmor_keeps_clan_chassis_without_component_selections(self):
        fixture = json.loads((FIXTURE_DIR / 'blk_battlearmor_fidelity.json').read_text(encoding='utf-8'))['fixtures'][0]
        for header, clan in [('Mixed (IS Chassis) Advanced', False),
                             ('Mixed (Clan Chassis) Experimental', True), ('Clan', True)]:
            with self.subTest(header=header):
                unit = self.convert(convert_battlearmor_blk, with_header(fixture['blk'], header))
                self.assertNotIn('componentTechBases', unit)
                self.assertEqual(unit['clanChassis'], clan)


if __name__ == '__main__':
    unittest.main()
