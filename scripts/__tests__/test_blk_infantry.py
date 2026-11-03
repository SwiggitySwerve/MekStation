"""Infantry source fidelity: mm-data 50f7efef, MegaMek 48fcb2f6 BLKInfantryFile."""
import hashlib
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_common import extract_tags, remove_comments, map_blk_tech_type
from blk_infantry_converter import convert_infantry_blk, build_manifest_entry
from schema_gate import validate_unit

FIXTURES = json.loads((Path(__file__).parent / 'fixtures/blk_infantry.json').read_text(encoding='utf-8'))


def change(body, tag, value=None):
    return re.sub(rf'<{tag}>.*?</{tag}>', '' if value is None else f'<{tag}>{value}</{tag}>', body, flags=re.S)


class InfantryTest(unittest.TestCase):
    def convert(self, body):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp) / 'unit.blk'
            p.write_text(body, encoding='utf-8')
            return convert_infantry_blk(p, logging.getLogger('infantry-test'))

    def test_required_tags_and_numbers_fail_instead_of_guessing(self):
        body = FIXTURES[0]['body']
        for tag in ['Name', 'year', 'type', 'squad_size', 'squadn', 'motion_type', 'Primary']:
            for value in [None, '']:
                with self.subTest(tag=tag, value=value), self.assertRaises(ValueError):
                    self.convert(change(body, tag, value))
        for tag in ['year', 'squad_size', 'squadn']:
            for value in ['oops', '1.5', 'NaN', '-1', '0']:
                with self.subTest(tag=tag, value=value), self.assertRaises(ValueError):
                    self.convert(change(body, tag, value))

    def test_shared_strict_tech_owner(self):
        for fixture in FIXTURES:
            t = extract_tags(remove_comments(fixture['body']))
            u = self.convert(fixture['body'])
            self.assertEqual((u['techBase'], u['rulesLevel']), map_blk_tech_type(t['type'], int(t['year'])))
        for value in ['Clan Level 1', 'Typo']:
            with self.assertRaises(ValueError):
                self.convert(change(FIXTURES[0]['body'], 'type', value))

    def test_movement_decoding(self):
        expected = {'Leg': 'FOOT', 'Jump': 'JUMP', 'Motorized': 'MOTORIZED', 'Tracked': 'TRACKED',
                    'Wheeled': 'WHEELED', 'Hover': 'HOVER', 'Submarine': 'SUBMARINE',
                    'Microcopter': 'VTOL', 'Motorized SCUBA': 'UMU'}
        for fixture in FIXTURES:
            t = extract_tags(remove_comments(fixture['body']))
            u = self.convert(fixture['body'])
            mode = t['motion_type']
            self.assertEqual(u['motionType'], 'BEAST' if mode.startswith('Beast:') else expected[mode])
            self.assertEqual(u['motiveType'], mode)
            if mode.startswith('Beast:'):
                self.assertEqual(u['beastMount'], mode)
        for mode in ['None', 'Foot', 'Mechanized', 'Beast:Dragon', 'Warp']:
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                self.convert(change(FIXTURES[0]['body'], 'motion_type', mode))

    def test_secondary_default_and_legacy_secondn(self):
        body = next(f['body'] for f in FIXTURES if '<Secondary>' in f['body'])
        u = self.convert(change(body, 'secondn'))
        self.assertEqual(u['secondaryWeapon']['count'], 0)
        self.assertNotIn('secondaryWeapon', self.convert(change(body, 'Secondary')))
        with self.assertRaises(ValueError):
            self.convert(change(body, 'secondn', '1.5'))
        with self.assertRaises(ValueError):
            self.convert(change(body, 'Secondary', ''))

    def test_custom_beast_and_explicit_specialization_override(self):
        body = FIXTURES[0]['body']
        raw = 'Beast:Custom:Test,VERY_LARGE,7.2,5,SUBMARINE,2,1,2,10,0,180'
        unit = self.convert(change(body, 'motion_type', raw))
        self.assertEqual(unit['beastMount'], raw)
        self.assertEqual(unit['specializations'], 4096)
        self.assertEqual(unit['damageDivisor'], 4.0)
        body = change(body, 'motion_type', raw) + '<specialization>0</specialization>'
        self.assertEqual(self.convert(body)['specializations'], 0)
        with self.assertRaises(ValueError):
            self.convert(body.replace('SUBMARINE', 'WARP'))

    def test_source_equipment_order_duplicates_and_locations(self):
        for fixture in FIXTURES:
            t = extract_tags(remove_comments(fixture['body']))
            u = self.convert(fixture['body'])
            for tag, location in [('Troopers Equipment', 'TROOPERS'), ('Field Guns Equipment', 'FIELD_GUNS')]:
                self.assertEqual([e['name'] for e in u['equipment'] if e['location'] == location], t[tag])
            self.assertEqual([e['name'] for e in u.get('fieldGuns', [])], t['Field Guns Equipment'])

    def test_specializations_and_augmentations_are_explicit(self):
        for fixture in FIXTURES:
            t = extract_tags(remove_comments(fixture['body']))
            u = self.convert(fixture['body'])
            implicit = 4096 if t['motion_type'] in ('Submarine', 'Motorized SCUBA', 'Beast:Orca', 'Beast:Hipposaur') else 0
            if t.get('Secondary', '').lower() in ('infantrytag', 'infantry tag', 'tag (light, man-portable)'):
                implicit |= 1024
            self.assertEqual(u['specializations'], int(t.get('specialization', implicit)))
            self.assertEqual(build_manifest_entry(u)['specializations'], u['specializations'])
            self.assertEqual(u['augmentations'], t.get('augmentation', '').splitlines())
            self.assertNotIn('specialization', u)  # No inference from armor kit names.
        for tag, value in [('specialization', 'NaN'), ('augmentation', 'made_up_implant')]:
            with self.assertRaises(ValueError):
                self.convert(FIXTURES[0]['body'] + f'\n<{tag}>{value}</{tag}>')
        with self.assertRaises(ValueError):
            self.convert(change(FIXTURES[0]['body'], 'Primary', 'Not A Weapon'))

    def test_armor_divisor_and_presence_flags(self):
        for fixture in FIXTURES:
            t = extract_tags(remove_comments(fixture['body']))
            u = self.convert(fixture['body'])
            self.assertEqual(u['customArmorDamageDivisor'], float(t.get('armordivisor', 1)))
            self.assertNotIn('armorPoints', u)
            self.assertEqual(u['armorFlags'], [flag for flag in ['encumberingarmor', 'spacesuit', 'dest', 'sneakcamo', 'sneakir', 'sneakecm'] if flag in t])
        body = FIXTURES[0]['body'] + '\n<InfantryArmor>3</InfantryArmor><armordivisor>2.5</armordivisor>'
        self.assertEqual(self.convert(body)['customArmorDamageDivisor'], 2.5)
        with self.assertRaises(ValueError):
            self.convert(body.replace('2.5', 'NaN'))

    def test_effective_armor_uses_exact_kit_and_beast_facts(self):
        cases = [('Clan Armor Kit (All)', 2.0), ('ComStar Infantry Kit', 2.0),
                 ('Clothing, Fatigues/Civilian/Non-Armored', 1.0), ('Ballistic Plate, Standard', 2.0)]
        body = FIXTURES[0]['body']
        for kit, divisor in cases:
            with self.subTest(kit=kit):
                u = self.convert(change(body, 'Troopers Equipment', kit))
                self.assertEqual((u['armorKit'], u['damageDivisor']), (kit, divisor))
        body = change(body, 'Troopers Equipment', '')
        for aug, expected in [('tsm_implant', 0.5), ('tsm_implant\ndermal_armor', 1.5),
                              ('tsm_implant\ndermal_camo_armor', 1.0)]:
            self.assertEqual(self.convert(body + f'<augmentation>{aug}</augmentation>')['damageDivisor'], expected)
        self.assertEqual(self.convert(change(body, 'motion_type', 'Beast:Elephant'))['damageDivisor'], 2.0)
        self.assertEqual(self.convert(change(body, 'motion_type', 'Beast:Hipposaur'))['damageDivisor'], 4.0)
        u = self.convert(change(body, 'Troopers Equipment', 'Environment Suit, Marine'))
        self.assertEqual(u['effectiveArmorFlags'], ['spacesuit'])
        self.assertNotIn('specialization', u)
        with self.assertRaises(ValueError):
            self.convert(body + '<armorKit>Combat Kit Typo</armorKit>')
        for tag in ['Field Guns Equipment', 'Troopers Equipment']:
            with self.assertRaises(ValueError):
                self.convert(change(body, tag, 'Unknown Equipment'))

    def test_kit_divisors_come_from_the_generated_catalog(self):
        import blk_infantry_armor as armor
        registry = Path(__file__).resolve().parents[2] / 'public/data/equipment/official/miscellaneous/java-registry.json'
        generated = {item['name']: item['damageDivisor'] for item in
                     json.loads(registry.read_text(encoding='utf-8'))['items'] if 'damageDivisor' in item}
        self.assertEqual(len(generated), 57)
        for name, divisor in generated.items():
            self.assertEqual(armor.kit_divisor(name), divisor, name)
        self.assertEqual((armor.kit_divisor('HeatSuit'), armor.kit_divisor('MyomerSuit')), (1.0, 2.0))
        # MiscType.java:3684-3716: deprecated for removal, so not in the generated registry.
        self.assertEqual((armor.kit_divisor('Vintage Bomb Suit'), armor.kit_divisor('BulletproofVest')), (1.0, 1.0))
        self.assertIsNone(armor.kit_divisor('ablativestandard'))

    def test_prosthetic_slots_are_not_dropped(self):
        body = next(f['body'] for f in FIXTURES if '<prostheticEnhancement1>' in f['body'])
        self.assertEqual(self.convert(body)['prostheticEnhancements'], {'prostheticEnhancement1': 'BALLISTIC', 'prostheticEnhancement2': 'GRAPPLER'})
        self.assertEqual(self.convert(body)['prostheticEnhancementCounts'], {'prostheticEnhancement1': 2, 'prostheticEnhancement2': 2})

    def test_all_pinned_fixtures_validate(self):
        for fixture in FIXTURES:
            with self.subTest(path=fixture['path']):
                # Keep source-byte and normalized-text hashes distinct (the pin uses CRLF).
                self.assertEqual(hashlib.sha256(fixture['body'].encode()).hexdigest(), fixture['textSha256'])
                self.assertEqual(validate_unit(self.convert(fixture['body'])), [])


if __name__ == '__main__':
    unittest.main()
