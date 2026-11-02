"""BLKBattleArmorFile/BattleArmor facts at MegaMek 48fcb2f6."""
import hashlib
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_battlearmor_converter import convert_battlearmor_blk
from blk_battlearmor_fields import parse_point_equipment
from schema_gate import validate_unit

FIXTURES = json.loads((Path(__file__).parent / 'fixtures/blk_battlearmor_fidelity.json').read_text())['fixtures']


def tag(body, name):
    match = re.search(rf'<{name}>\s*(.*?)\s*</{name}>', body, re.S | re.I)
    return match.group(1) if match else None


def replace(body, name, value):
    return re.sub(rf'<{name}>.*?</{name}>', f'<{name}>\n{value}\n</{name}>', body, flags=re.S | re.I)


class BattleArmorFidelityTest(unittest.TestCase):
    def convert(self, body):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'unit.blk'
            path.write_bytes(body.encode('utf-8'))
            return convert_battlearmor_blk(path, logging.getLogger(__name__))

    def test_real_pinned_sources(self):
        weights = ['PAL', 'LIGHT', 'MEDIUM', 'HEAVY', 'ASSAULT']
        armor = {28: 'STANDARD', 30: 'BA_STANDARD_ADVANCED', 31: 'BA_STEALTH_BASIC',
                 32: 'STEALTH', 33: 'STEALTH_IMPROVED', 34: 'STEALTH_PROTOTYPE',
                 35: 'FIRE_RESISTANT', 36: 'MIMETIC', 37: 'REFLECTIVE', 38: 'REACTIVE'}
        for fixture in FIXTURES:
            with self.subTest(path=fixture['path']):
                body = fixture['blk']
                self.assertEqual(hashlib.sha256(body.encode()).hexdigest(), fixture['sha256'])
                unit = self.convert(body)
                self.assertEqual(unit['weightClass'], weights[int(tag(body, 'weightclass'))])
                self.assertEqual(unit['squadSize'], int(tag(body, 'Trooper Count')))
                self.assertEqual(unit['tonnage'], unit['squadSize'])
                self.assertEqual(unit['armor']['type'], armor[int(tag(body, 'armor_type'))])
                self.assertEqual(unit['armor']['perTrooper'], int(tag(body, 'armor')))
                self.assertEqual(unit['movement']['groundMP'], int(tag(body, 'cruiseMP')))
                propulsion = {'UMU': 'umuMP', 'VTOL': 'vtolMP'}.get(tag(body, 'motion_type'), 'jumpMP')
                self.assertEqual(unit['movement'][propulsion], int(tag(body, 'jumpingMP') or 0))
                group = 'Point' if 'Clan' in tag(body, 'type').split(')')[0] else 'Squad'
                names = [re.split(r':(?:Body|LA|RA|TU|DWP|SSWM|APM|Shots|SIZE)', line)[0]
                         for line in (tag(body, group + ' Equipment') or '').splitlines() if line.strip()]
                self.assertEqual([e['name'] for e in unit['equipment'] if e['unitLocation'] == group], names)
                self.assertEqual(validate_unit(unit), [])

    def test_required_and_invalid_fields_fail(self):
        body = FIXTURES[0]['blk']
        for name in ['Name', 'year', 'type', 'Trooper Count', 'weightclass', 'chassis', 'motion_type', 'cruiseMP', 'armor']:
            with self.subTest(missing=name):
                missing = re.sub(rf'<{name}>.*?</{name}>', '', body, flags=re.S | re.I)
                with self.assertRaises(ValueError):
                    self.convert(missing)
            with self.subTest(empty=name), self.assertRaises(ValueError):
                self.convert(replace(body, name, ''))
        for name, values in {'Trooper Count': ['0', '7', '4.5'], 'weightclass': ['-1', '5', '2.5'],
                             'chassis': ['tripod'], 'motion_type': ['None', 'nonsense'],
                             'cruiseMP': ['-1', '1.5', 'oops'], 'armor': ['1\n2', '-1', 'oops'],
                             'armor_type': ['', '999', '28.5'], 'type': ['Clan Level 1', 'Unknown']}.items():
            for value in values:
                with self.subTest(name=name, value=value), self.assertRaises(ValueError):
                    self.convert(replace(body, name, value))

    def test_zero_mp_and_java_defaults(self):
        body = replace(FIXTURES[0]['blk'], 'cruiseMP', '0')
        for name in ['armor_type', 'jumpingMP', 'Model']:
            body = re.sub(rf'<{name}>.*?</{name}>', '', body, flags=re.S | re.I)
        unit = self.convert(body)
        self.assertEqual(unit['movement']['groundMP'], 0)
        self.assertEqual(unit['movement']['jumpMP'], 0)
        self.assertEqual(unit['model'], '')
        self.assertEqual(unit['armor']['type'], 'STANDARD')

    def test_pinned_armor_types(self):
        expected = {28: 'STANDARD', 30: 'BA_STANDARD_ADVANCED', 31: 'BA_STEALTH_BASIC',
                    32: 'STEALTH', 33: 'STEALTH_IMPROVED', 34: 'STEALTH_PROTOTYPE',
                    35: 'FIRE_RESISTANT', 36: 'MIMETIC', 37: 'REFLECTIVE', 38: 'REACTIVE'}
        for fixture in FIXTURES:
            with self.subTest(path=fixture['path']):
                self.assertEqual(self.convert(fixture['blk'])['armor']['type'], expected[int(tag(fixture['blk'], 'armor_type'))])

    def test_armor_technology_source_and_precedence(self):
        body = FIXTURES[0]['blk']
        self.assertEqual(self.convert(body)['armor']['sourceTechLevel'], int(tag(body, 'armor_tech')))
        self.assertEqual(self.convert(body + '<armor_tech_level>5</armor_tech_level>')['armor']['sourceTechLevel'], 5)
        body = re.sub(r'<armor_tech>.*?</armor_tech>', '', body, flags=re.S)
        self.assertNotIn('sourceTechLevel', self.convert(body)['armor'])

    def test_pinned_umu_vtol_and_squad_equipment(self):
        for fixture in FIXTURES:
            body = fixture['blk']
            unit = self.convert(body)
            motion = tag(body, 'motion_type')
            if motion in ('UMU', 'VTOL'):
                with self.subTest(path=fixture['path'], rule='propulsion'):
                    self.assertEqual(unit['movement']['umuMP' if motion == 'UMU' else 'vtolMP'], int(tag(body, 'jumpingMP') or 0))
            squad = tag(body, 'Squad Equipment')
            if squad:
                with self.subTest(path=fixture['path'], rule='squad equipment'):
                    self.assertEqual(len([e for e in unit['equipment'] if e.get('unitLocation') == 'Squad']), len(squad.splitlines()))
            if tag(body, 'turret'):
                with self.subTest(path=fixture['path'], rule='turret'):
                    self.assertEqual(unit['turretSize'], int(tag(body, 'turret').split(':')[1]))
            if tag(body, 'exoskeleton'):
                with self.subTest(path=fixture['path'], rule='exoskeleton'):
                    self.assertTrue(unit['isExoskeleton'])

    def test_pinned_manipulator_variants(self):
        for name in ['BAHeavyBattleClawVibro', 'BABasicManipulatorMineClearance', 'BABattleClawMagnets']:
            fixture = next(f for f in FIXTURES if name + ':' in f['blk'])
            with self.subTest(name=name):
                unit = self.convert(fixture['blk'])
                self.assertIn(name, unit['manipulators'].values())

    def test_pinned_equipment_qualifiers(self):
        for fixture in FIXTURES:
            blocks = re.findall(r'<(?:Point|Squad|Trooper \d) Equipment>(.*?)</(?:Point|Squad|Trooper \d) Equipment>', fixture['blk'], re.S)
            for line in '\n'.join(blocks).splitlines():
                if not line.strip():
                    continue
                with self.subTest(path=fixture['path'], line=line):
                    equipment, _, _, _ = parse_point_equipment([line])
                    item = equipment[0]
                    for suffix, key in [('DWP', 'isDWPMounted'), ('SSWM', 'isSquadSupportWeapon'), ('APM', 'isAPMMounted')]:
                        if ':' + suffix in line:
                            self.assertTrue(item[key])
                    if ':Shots' in line:
                        self.assertEqual(item['shots'], int(re.search(r':Shots(\d+)#', line)[1]))
                    if ':SIZE:' in line:
                        self.assertEqual(item['size'], float(line.split(':SIZE:')[1]))

    def test_tech_rules_use_shared_owner(self):
        from blk_common import BLK_TECH_TYPES, map_blk_tech_type
        for value in BLK_TECH_TYPES:
            unit = self.convert(replace(FIXTURES[0]['blk'], 'type', value))
            self.assertEqual((unit['techBase'], unit['rulesLevel']), map_blk_tech_type(value, unit['year']))

    def test_mount_metadata_and_manipulators_are_retained(self):
        equipment, _, ap, mwm = parse_point_equipment([
            'BAAPMount:LA', 'BAModularWeaponMount:RA', 'InfantryAssaultRifle:APM:LA',
            'BABattleClawVibro:RA', 'Ammo:Body:DWP:SSWM:Shots4#', 'BACargoLifter:LA:SIZE:2.5', 'BAGun:TU'])
        self.assertTrue(ap and mwm)
        self.assertEqual(len(equipment), 7)
        self.assertTrue(equipment[2]['isAPMMounted'])
        self.assertEqual(equipment[4]['shots'], 4)
        self.assertTrue(equipment[4]['isDWPMounted'] and equipment[4]['isSquadSupportWeapon'])
        self.assertEqual(equipment[5]['size'], 2.5)
        self.assertEqual(equipment[6]['location'], 'TURRET')
        for bad in ['Gun:WUT', 'Ammo:Shotsx#', 'Tool:SIZE:nan']:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                parse_point_equipment([bad])

    def test_trooper_slotless_and_fallback_equipment(self):
        body = FIXTURES[0]['blk']
        body = replace(body, 'Trooper 1 Equipment', 'BABasicManipulatorMineClearance:LA')
        body = re.sub(r'<slotless_equipment>.*?</slotless_equipment>', '', body, flags=re.S)
        unit = self.convert(body)
        self.assertTrue(any(e['unitLocation'] == 'Trooper 1' and e['name'] == 'BABasicManipulatorMineClearance' for e in unit['equipment']))
        self.assertEqual(sum(e['name'] == 'BAJumpJet' for e in unit['equipment']), 1)
        unit = self.convert(body + '\n<slotless_equipment>BAJumpJet\nBAJumpJet</slotless_equipment>')
        self.assertEqual(sum(e['name'] == 'BAJumpJet' for e in unit['equipment']), 2)
        unit = self.convert(body + '\n<slotless_equipment>BAJumpJet:RA:OMNI</slotless_equipment>')
        self.assertEqual([(e['name'], e['location']) for e in unit['equipment'] if e['unitLocation'] == 'NONE'], [('BAJumpJet', 'NONE')])

    def test_java_motion_aliases_and_source_booleans(self):
        body = FIXTURES[0]['blk']
        for motion, expected in [('Jump', 'JUMP'), ('INF_UMU', 'UMU'), ('micro-copter', 'VTOL'),
                                 ('Wheeled', 'WHEELED'), ('Tracked', 'TRACKED'), ('Motorized', 'MOTORIZED')]:
            with self.subTest(motion=motion):
                self.assertEqual(self.convert(replace(body, 'motion_type', motion))['motionType'], expected)
        for extra in ['<exoskeleton>maybe</exoskeleton>', '<clan_exo_without_harjel>true</clan_exo_without_harjel>']:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                self.convert(body + extra)


if __name__ == '__main__':
    unittest.main()
