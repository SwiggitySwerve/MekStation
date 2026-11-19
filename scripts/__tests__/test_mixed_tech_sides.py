"""Mixed Tech component sides (rows 2.1.3 engine, 2.1.5 armor) follow the pinned loaders, MegaMek 48fcb2f64.

Armor: ArmorType.forEntity:96-101 -> TechConstants.isClan:394-398 (Clan levels in the shared vocabulary);
the level comes from armor_tech_level, else armor_tech, else the chassis side (BLKFile:1951-1958); support
vehicles read only armor_tech_level (BLKFile:505-524). Engine: MtfFile:387-392 + Entity.itemOppositeTech:13668-13674
for meks; BLK clan_engine, else the chassis side (BLKTankFile:144-151, BLKAeroSpaceFighterFile:115-123); the
LargeSupportTank engine follows the chassis (BLKLargeSupportTankFile:98-101); SupportTank, SupportVTOL,
FixedWingSupport and SmallCraft never set CLAN_ENGINE.
"""
import json
import logging
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from blk_aerospace_converter import convert_aerospace_blk
from blk_infantry_converter import convert_infantry_blk
from blk_vehicle_converter import convert_vehicle_blk
from enum_mapping_tables import CLAN_TECH_LEVELS
from mtf_converter import MTFParser, dataclass_to_dict

FIXTURES = json.loads((Path(__file__).parent / 'fixtures' / 'blk_mixed_chassis.json').read_text(encoding='utf-8'))
BODY = {f['path']: f['body'].replace('\r\n', '\n') for f in FIXTURES}
TANK = BODY['vehicles/3150/Bardiche Heavy Strike Tank C.blk']
VTOL = BODY['vehicles/XTRs/Pirates/Anhur P-Stealth.blk']
ASF = BODY['fighters/TRO3067 Unabridged/IS Aerospace/Corax CRX-OR.blk']
INFANTRY = BODY['infantry/Clan/Clan Engineer Point (Demolition).blk']


def set_tag(body, name, value):
    """Replace, add (value given) or drop (value None) one BLK tag."""
    body = re.sub(rf'\n<{name}>.*?</{name}>\n', '\n', body, flags=re.S)
    return body if value is None else body + f'\n<{name}>\n{value}\n</{name}>\n'


def convert(converter, body):
    with tempfile.TemporaryDirectory() as temp:
        source = Path(temp) / 'source.blk'
        source.write_text(body, encoding='utf-8')
        unit = converter(source, logging.getLogger('mixed-tech-sides-test'))
    assert unit is not None
    return unit


def mtf(techbase, engine):
    return dataclass_to_dict(MTFParser()._parse_lines(
        ['chassis:Test', 'model:T', 'techbase:' + techbase, 'engine:' + engine], 'source.mtf'))


class VocabularyTest(unittest.TestCase):
    def test_clan_tech_levels_are_techconstants_isclan(self):
        # TechConstants.java:55-75 numbering; isClan:394-398 (ALL_CLAN 12 included, unknown -1 excluded).
        self.assertEqual(CLAN_TECH_LEVELS, frozenset({2, 6, 8, 10, 12}))


class MekEngineSideTest(unittest.TestCase):
    def test_every_mixed_mek_states_its_engine_side(self):
        for techbase, engine, side in [
            ('Mixed (IS Chassis)', '300 XXL (Clan) Engine', 'CLAN'),
            ('Mixed (IS Chassis)', '285 XL Engine(IS)', 'INNER_SPHERE'),
            ('Mixed (IS Chassis)', '200 Fusion Engine', 'INNER_SPHERE'),
            ('Mixed (IS Chassis)', '250 XL (C) Engine', 'CLAN'),
            ('Mixed (Clan Chassis)', '350 XXL (Clan) Engine', 'CLAN'),
            ('Mixed (Clan Chassis)', '300 Fusion Engine', 'CLAN'),
            ('Mixed (Clan Chassis)', '375 XL Engine(IS)', 'INNER_SPHERE'),
            ('Mixed (Clan Chassis)', '300 Light Fusion Engine(Inner Sphere)', 'INNER_SPHERE'),
        ]:
            with self.subTest(techbase=techbase, engine=engine):
                unit = mtf(techbase, engine)
                self.assertEqual(unit['componentTechBases']['engine'], side)
                self.assertEqual(list(unit['componentTechBases']), ['chassis', 'engine'])

    def test_xl_token_side_equals_the_engine_field(self):
        for techbase, engine in [('Mixed (IS Chassis)', '300 XL (Clan) Engine'),
                                 ('Mixed (IS Chassis)', '300 XL Engine(IS)'),
                                 ('Mixed (Clan Chassis)', '300 XL (Clan) Engine'),
                                 ('Mixed (Clan Chassis)', '300 XL Engine(IS)'),
                                 # Lines whose text alone hides the side: the token must follow the
                                 # same engine-side rule as the field (review of 42c24c51c, xl_probe.py).
                                 ('Mixed (IS Chassis)', '250 XL (C) Engine'),
                                 ('Mixed (Clan Chassis)', '300 XL Engine')]:
            with self.subTest(techbase=techbase, engine=engine):
                unit = mtf(techbase, engine)
                token_side = {'CLAN_XL': 'CLAN', 'XL': 'INNER_SPHERE'}[unit['engine']['type']]
                self.assertEqual(token_side, unit['componentTechBases']['engine'])

    def test_non_mixed_meks_gain_no_engine_side(self):
        for techbase in ['Inner Sphere', 'Clan']:
            with self.subTest(techbase=techbase):
                self.assertNotIn('componentTechBases', mtf(techbase, '300 XL Engine'))


class BlkArmorSideTest(unittest.TestCase):
    def test_level_selects_the_side_independently_of_the_chassis(self):
        cases = [  # (body, header, armor_tech_level, expected)
            (TANK, 'Mixed (IS Chassis) Experimental', 6, 'CLAN'),
            (TANK, 'Mixed (IS Chassis)', 2, 'CLAN'),
            (TANK, 'Mixed (IS Chassis)', 12, 'CLAN'),
            (TANK, 'Mixed (Clan Chassis)', 5, 'INNER_SPHERE'),
            (TANK, 'Mixed (Clan Chassis)', -1, 'INNER_SPHERE'),
            (TANK, 'Mixed (Clan Chassis)', 8, 'CLAN'),
            (VTOL, 'Mixed (Clan Chassis)', 7, 'INNER_SPHERE'),
            (ASF, 'Mixed (Clan Chassis)', 2, 'CLAN'),
            (ASF, 'Mixed (IS Chassis)', 10, 'CLAN'),
        ]
        for body, header, level, side in cases:
            with self.subTest(header=header, level=level):
                body = set_tag(set_tag(body, 'type', header), 'armor_tech_level', level)
                converter = convert_aerospace_blk if 'AeroSpaceFighter' in body else convert_vehicle_blk
                unit = convert(converter, body)
                self.assertEqual(unit['componentTechBases']['armor'], side)
                self.assertEqual(list(unit['componentTechBases']), ['chassis', 'armor'])

    def test_armor_tech_is_the_legacy_fallback_and_absence_inherits_the_chassis(self):
        base = set_tag(set_tag(TANK, 'type', 'Mixed (IS Chassis)'), 'armor_tech_level', None)
        self.assertEqual(convert(convert_vehicle_blk, set_tag(base, 'armor_tech', 8))['componentTechBases']['armor'],
                         'CLAN')
        self.assertEqual(convert(convert_vehicle_blk, base)['componentTechBases']['armor'], 'INNER_SPHERE')
        clan = set_tag(base, 'type', 'Mixed (Clan Chassis)')
        self.assertEqual(convert(convert_vehicle_blk, clan)['componentTechBases']['armor'], 'CLAN')

    def test_infantry_and_non_mixed_units_gain_no_armor_side(self):
        self.assertEqual(convert(convert_infantry_blk, INFANTRY)['componentTechBases'], {'chassis': 'CLAN'})
        for body, converter in [(TANK, convert_vehicle_blk), (ASF, convert_aerospace_blk)]:
            unit = convert(converter, set_tag(body, 'type', 'Clan Level 3'))
            self.assertNotIn('componentTechBases', unit)


class BlkEngineSideTest(unittest.TestCase):
    def test_untagged_mixed_engines_take_the_loader_side(self):
        for body, converter, header, side in [
            (TANK, convert_vehicle_blk, 'Mixed (Clan Chassis)', True),
            (TANK, convert_vehicle_blk, 'Mixed (IS Chassis)', False),
            (ASF, convert_aerospace_blk, 'Mixed (Clan Chassis)', True),
            (ASF, convert_aerospace_blk, 'Mixed (IS Chassis)', False),
        ]:
            with self.subTest(header=header, unit=converter.__name__):
                unit = convert(converter, set_tag(set_tag(body, 'type', header), 'clan_engine', None))
                self.assertIs(unit['clanEngine'], side)

    def test_a_present_tag_wins_over_the_chassis(self):
        unit = convert(convert_vehicle_blk, set_tag(set_tag(VTOL, 'type', 'Mixed (Clan Chassis)'), 'clan_engine', 'false'))
        self.assertIs(unit['clanEngine'], False)

    def test_support_loaders_never_set_a_clan_engine(self):
        body = set_tag(set_tag(set_tag(ASF, 'UnitType', 'FixedWingSupport'), 'type', 'Mixed (Clan Chassis)'),
                       'clan_engine', None)
        self.assertIs(convert(convert_aerospace_blk, body)['clanEngine'], False)

    def test_non_mixed_untagged_units_stay_untouched(self):
        unit = convert(convert_vehicle_blk, set_tag(set_tag(TANK, 'type', 'Clan Level 3'), 'clan_engine', None))
        self.assertNotIn('clanEngine', unit)


if __name__ == '__main__':
    unittest.main()
