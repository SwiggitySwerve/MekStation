"""Pinned ProtoMek source facts; Java authority and policies: BLK_RULES.md."""
import hashlib
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_common import BLK_TECH_TYPES
from blk_protomech_converter import convert_protomech_blk, build_manifest_entry, get_proto_weight_class
from schema_gate import validate_unit

FIXTURES = json.loads((Path(__file__).parent / 'fixtures/protomechs.pinned.json').read_text())

def tag(body, key, value):
    body = re.sub(rf'<{key}>.*?</{key}>', '', body, flags=re.S)
    return body if value is None else body + f'\n<{key}>\n{value}\n</{key}>\n'

class ProtoMekTest(unittest.TestCase):
    def convert(self, body):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'proto.blk'
            path.write_text(body, encoding='utf-8')
            return convert_protomech_blk(path, logging.getLogger(__name__))

    def test_real_sources_preserve_all_armor_and_equipment(self):
        from blk_common import extract_tags, remove_comments
        for fixture in FIXTURES:
            with self.subTest(path=fixture['path']):
                self.assertEqual(hashlib.sha256(fixture['blk'].encode()).hexdigest(), fixture['sha256'])
                tags = extract_tags(remove_comments(fixture['blk']))
                unit = self.convert(fixture['blk'])
                values = [int(v) for v in tags['armor'].splitlines()]
                self.assertEqual(list(unit['armor']['byLocation'].values()), values)
                self.assertEqual(unit['hasMainGun'], len(values) == 6)
                self.assertEqual(build_manifest_entry(unit)['hasMainGun'], len(values) == 6)
                expected = [(name, key[:-10].upper().replace(' ', '_')) for key, names in tags.items() if key.endswith(' Equipment') for name in names if key != 'Main Gun Equipment' or len(values) == 6]
                self.assertCountEqual([(v['name'], v['location']) for v in unit['equipment']], expected)
                self.assertEqual(unit['armor']['sourceTechLevel'], int(tags['armor_tech_level']))
                self.assertEqual(unit['armor']['type'], 'ELECTRIC_DISCHARGE' if tags['armor_type'] == '18' else 'STANDARD_PROTOMEK')
                self.assertEqual(validate_unit(unit), [])

    def test_weight_boundaries_and_ultraheavy(self):
        for tons, expected in ((2,'LIGHT'),(3,'LIGHT'),(4,'MEDIUM'),(5,'MEDIUM'),(6,'HEAVY'),(7,'HEAVY'),(8,'ASSAULT'),(9,'ASSAULT'),(10,'ULTRAHEAVY'),(15,'ULTRAHEAVY')):
            with self.subTest(tons=tons): self.assertEqual(get_proto_weight_class(tons), expected)

    def test_required_tags_fail_closed(self):
        for key in ('Name','year','tonnage','type','motion_type','cruiseMP','armor'):
            for value in (None, ''):
                with self.subTest(key=key,value=value), self.assertRaises(ValueError):
                    self.convert(tag(FIXTURES[0]['blk'],key,value))

    def test_numeric_tags_do_not_truncate_or_default(self):
        for key in ('year','cruiseMP','jumpingMP','armor_tech_level'):
            for value in ('bad','nan','inf','2.5',''):
                with self.subTest(key=key,value=value), self.assertRaises(ValueError):
                    self.convert(tag(FIXTURES[0]['blk'],key,value))
        for value in ('nan','inf','bad', '-1', '0'):
            with self.subTest(tonnage=value), self.assertRaises(ValueError):
                self.convert(tag(FIXTURES[0]['blk'],'tonnage',value))

    def test_armor_length_and_integer_validation(self):
        for value in ('1\n2\n3\n4','1\n2\n3\n4\n5\n6\n7','1\n2\nbad\n4\n5','1\n2\n3.5\n4\n5'):
            with self.subTest(armor=value), self.assertRaises(ValueError): self.convert(tag(FIXTURES[0]['blk'],'armor',value))
        for code in ('999','22.5','bad',''):
            with self.subTest(code=code), self.assertRaises(ValueError): self.convert(tag(FIXTURES[0]['blk'],'armor_type',code))
        self.assertEqual(self.convert(tag(FIXTURES[0]['blk'],'armor_type',None))['armor']['type'], 'STANDARD_PROTOMEK')
        self.assertEqual(self.convert(tag(FIXTURES[0]['blk'],'armor_type','0'))['armor']['type'], 'STANDARD_PROTOMEK')

    def test_movement_and_main_gun_are_source_driven(self):
        for mode, expected, glider, quad in (('biped','BIPED',False,False),('Quad','QUAD',False,True),('Glider','WIGE',True,False),('WiGE','WIGE',True,False),('UMU','INF_UMU',False,False)):
            with self.subTest(mode=mode):
                unit=self.convert(tag(FIXTURES[0]['blk'],'motion_type',mode))
                self.assertEqual((unit['motionType'],unit['isGlider'],unit['isQuad']),(expected,glider,quad))
        for mode in ('None','bad',''):
            with self.subTest(mode=mode), self.assertRaises(ValueError): self.convert(tag(FIXTURES[0]['blk'],'motion_type',mode))
        body=tag(FIXTURES[0]['blk'],'armor','1\n2\n3\n4\n5\n0')
        body=tag(body,'Main Gun Equipment','')
        self.assertTrue(build_manifest_entry(self.convert(body))['hasMainGun'])
        self.assertEqual(self.convert(tag(body,'jumpingMP',None))['movement']['jumpMP'],0)
        unit=self.convert(tag(body,'umuMP','99'))
        self.assertNotIn('umuMP',unit['movement'])  # Java counts equipment, not this tag.

    def test_optional_source_facts_and_tech_precedence(self):
        body = tag(tag(FIXTURES[0]['blk'], 'armor_tech_level', None), 'armor_tech', '8')
        body = tag(body, 'Model', None)
        self.assertEqual(self.convert(body)['model'], '')
        self.assertEqual(self.convert(body)['armor']['sourceTechLevel'], 8)
        self.assertEqual(self.convert(tag(body, 'armor_tech_level', '2'))['armor']['sourceTechLevel'], 2)
        body = tag(tag(body, 'armor', '1\n2\n3\n4\n5'), 'Main Gun Equipment', 'CLERMediumLaser')
        body = tag(body, 'Body Equipment', 'ProtoMechUMU\nProtoMechUMU')
        unit = self.convert(body)
        self.assertNotIn('mainGun', unit)
        self.assertEqual([v['name'] for v in unit['equipment'] if v['location'] == 'BODY'], ['ProtoMechUMU', 'ProtoMechUMU'])

    def test_shared_strict_tech_table(self):
        for value, expected in BLK_TECH_TYPES.items():
            with self.subTest(value=value):
                unit=self.convert(tag(FIXTURES[0]['blk'],'type',value))
                self.assertEqual((unit['techBase'],unit['rulesLevel']),expected)
        for value in ('nonsense','Clan Level 1',''):
            with self.subTest(value=value), self.assertRaises(ValueError): self.convert(tag(FIXTURES[0]['blk'],'type',value))

if __name__ == '__main__': unittest.main()
