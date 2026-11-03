"""Pinned mm-data 50f7efef: retain LAM subtypes and quad critical sections."""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/megameklab-conversion'))
from mtf_converter import MTFParser, convert_directory, dataclass_to_dict, generate_index
from enum_mappings import normalize_equipment_id

PIN = Path(os.environ.get('MEKSTATION_MEKFILES',
    'E:/Projects/Personal/_scratch/upstream-pins-20261028/mm-data/data/mekfiles'))


class MechCatalogRegenerationTest(unittest.TestCase):
    # Ruling item 3; pinned Kiso K-3N-KRHQ CommandMech.mtf:97-99.
    def test_colon_sized_critical_slots_keep_their_positions_and_parameters(self):
        source = ['chassis:Kiso', 'model:Test', 'mass:100', 'Weapons:0',
                  'Right Torso:'] + ['Communications Equipment:SIZE:3.0'] * 3
        unit = dataclass_to_dict(MTFParser()._parse_lines(source, 'source.mtf'))
        self.assertEqual(unit['criticalSlots']['RIGHT_TORSO'][:3],
                         ['Communications Equipment:SIZE:3.0'] * 3)
        if (PIN / 'meks').exists():
            unit = dataclass_to_dict(MTFParser().parse_file(str(
                PIN / 'meks/XTRs/Succession Wars/Kiso K-3N-KRHQ CommandMech.mtf')))
            self.assertEqual(sum(slot == 'Communications Equipment:SIZE:3.0'
                for slots in unit['criticalSlots'].values() for slot in slots), 3)

    def test_source_display_aliases_keep_the_registered_wire_spellings(self):
        for name, expected in [('Improved ATM 9', 'iatm-9'),
                               ('Prototype ER Medium Laser (CP)', 'prototype-er-medium-laser'),
                               ('Prototype ER Small Laser (CP)', 'prototype-er-small-laser'),
                               ('Prototype Rocket Launcher 10', 'clrocketlauncher10prototype'),
                               ('Prototype Rocket Launcher 15', 'clrocketlauncher15prototype'),
                               ('Primitive Prototype Autocannon/10', 'ac-10p')]:
            with self.subTest(name=name):
                self.assertEqual(normalize_equipment_id(name), expected)

    def test_ambiguous_weapon_names_retain_the_critical_type(self):
        source = ['chassis:Source', 'model:Test', 'Weapons:2', 'Rifle (Cannon, Heavy), Right Arm',
                  'SRM 4 (OS), Left Arm', 'Right Arm:', 'ISHeavyRifle', 'ISHeavyRifle',
                  'ISHeavyRifle', 'Left Arm:', 'ISSRM4 (OS)']
        unit = MTFParser()._parse_lines(source, 'source.mtf')
        self.assertEqual([item.id for item in unit.equipment], ['heavy-rifle', 'issrm4-os'])
        self.assertEqual(unit.equipment[0].location, 'RIGHT_ARM')

    @unittest.skipUnless((PIN / 'meks').exists(), 'set MEKSTATION_MEKFILES to pinned mm-data')
    def test_real_rifle_mount_keeps_the_supported_weapon_identity(self):
        unit = MTFParser().parse_file(str(PIN / 'meks/ProtoTypes/Deep Lord RCL-Z1M MilitiaMech.mtf'))
        self.assertIn('heavy-rifle', [item.id for item in unit.equipment])

    def test_pinned_omni_quad_and_lamellor_spellings_keep_their_types(self):
        for config, expected in [('Quad OmniMek', 'Quad'), ('QuadVee OmniMek', 'QuadVee')]:
            with self.subTest(config=config):
                unit = MTFParser()._parse_lines(['chassis:Balius', 'model:A', 'Config:' + config], 'source.mtf')
                self.assertEqual(unit.configuration, expected)
        with self.subTest(armor='Ferro-Lamellor(Clan)'):
            unit = MTFParser()._parse_lines(['chassis:Shogun', 'model:C 2', 'armor:Ferro-Lamellor(Clan)'], 'source.mtf')
            self.assertEqual(unit.armor.type, 'FERRO_LAMELLOR')
        if (PIN / 'meks').exists():
            for source, expected in [('3075/Balius A.mtf', 'Quad'), ('QuadVees/Boreas A.mtf', 'QuadVee')]:
                self.assertEqual(MTFParser().parse_file(str(PIN / 'meks' / source)).configuration, expected)
            shogun = MTFParser().parse_file(str(PIN / 'meks/3145/NTNU RS/NTNU/Shogun C 2.mtf'))
            self.assertEqual(shogun.armor.type, 'FERRO_LAMELLOR')

    def test_changed_source_identity_cannot_reuse_a_retired_id(self):
        # Pinned Phoenix Hawk nickname moved from model to chassis; same slug.
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, shipped = root / 'source', root / 'shipped'
            source.mkdir()
            shipped.mkdir()
            retired = 'phoenix-hawk-l-fenikkusu-taka-pxh-11k'
            (source / 'Phoenix.mtf').write_text("chassis:Phoenix Hawk L 'Fenikkusu Taka'\nmodel:PXH-11K\nmass:35\n", encoding='utf-8')
            (shipped / 'index.json').write_text(json.dumps({'units': [
                {'id': retired, 'chassis': 'Phoenix Hawk L', 'model': "'Fenikkusu Taka' PXH-11K"}]}), encoding='utf-8')
            self.assertEqual(convert_directory(str(source), str(root / 'out'), preserve_ids_from=str(shipped)), (1, 0))
            index = generate_index(str(root / 'out'))
            self.assertNotEqual(index['units'][0]['id'], retired)

    def test_regeneration_preserves_shipped_ids_and_repeats_index_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, shipped = root / 'source', root / 'shipped'
            source.mkdir()
            shipped.mkdir()
            (source / 'Gun.mtf').write_text('chassis:G\u00f9n\nmodel:GN-2O\nmass:20\n', encoding='utf-8')
            (shipped / 'Gun.json').write_text(json.dumps({
                'id': 'ga1n-gn-2o', 'chassis': 'G\u00f9n', 'model': 'GN-2O'}), encoding='utf-8')
            (shipped / 'index.json').write_text(json.dumps({'units': [
                {'id': 'misread-index-id', 'chassis': 'G\u00f9n', 'model': 'GN-2O', 'path': 'Gun.json'}]}), encoding='utf-8')
            snapshots = []
            for name in ('first', 'second'):
                output = root / name
                self.assertEqual(convert_directory(str(source), str(output),
                                 preserve_ids_from=str(shipped)), (1, 0))
                index = generate_index(str(output), generated_at='2026-11-02T00:00:00')
                self.assertEqual(index['units'][0]['id'], 'ga1n-gn-2o')
                snapshots.append({p.relative_to(output): p.read_bytes() for p in output.rglob('*.json')})
            self.assertEqual(*snapshots)

    def test_barghest_rear_leg_source_excerpt_keeps_ammo_out_of_head(self):
        # BGS-3T.mtf: all twelve source slots, including six trailing empties.
        source = ['chassis:Barghest', 'model:BGS-3T', 'Config:Quad', 'mass:70',
                  'Head:', 'Life Support', 'Sensors', 'Cockpit', '-Empty-',
                  'Sensors', 'Life Support', 'Rear Left Leg:', 'Hip',
                  'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator',
                  'ISHeavyGauss Ammo', 'ISHeavyGauss Ammo'] + ['-Empty-'] * 6
        unit = dataclass_to_dict(MTFParser()._parse_lines(source, 'Barghest BGS-3T.mtf'))
        self.assertEqual(unit['criticalSlots']['REAR_LEFT_LEG'][4:],
                         ['ISHeavyGauss Ammo', 'ISHeavyGauss Ammo'])
        self.assertEqual(len(unit['criticalSlots']['HEAD']), 6)

    @unittest.skipUnless((PIN / 'meks').exists(), 'set MEKSTATION_MEKFILES to pinned mm-data')
    def test_real_barghests_keep_all_four_limb_sections(self):
        for rel, ammo in [('3060u/Barghest BGS-3T.mtf', 'ISHeavyGauss Ammo'),
                          ('ProtoTypes/Barghest BGS-4T.mtf', 'ISImprovedHeavyGauss Ammo')]:
            with self.subTest(source=rel):
                unit = dataclass_to_dict(MTFParser().parse_file(str(PIN / 'meks' / rel)))
                for leg in ('FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG', 'REAR_LEFT_LEG', 'REAR_RIGHT_LEG'):
                    self.assertEqual(len(unit['criticalSlots'][leg]), 6)
                self.assertEqual(sum(slot == ammo for slots in unit['criticalSlots'].values()
                                     for slot in slots), 4)

    @unittest.skipUnless((PIN / 'meks').exists(), 'set MEKSTATION_MEKFILES to pinned mm-data')
    def test_real_lams_retain_source_subtype(self):
        lams = []
        for source in (PIN / 'meks').rglob('*LAM*.mtf'):
            unit = dataclass_to_dict(MTFParser().parse_file(str(source)))
            if unit['configuration'] == 'LAM':
                lams.append(unit)
                expected = 'Bimodal' if unit['model'] in ('SHD-X1', 'SHD-X2') else 'Standard'
                self.assertEqual(unit.get('lamType'), expected, str(source))
        self.assertEqual(len(lams), 23)
