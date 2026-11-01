"""UL-06b: original pinned BLKs cross the Python catalog boundary intact."""

import hashlib
import json
import logging
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_aerospace_converter import convert_aerospace_blk
from blk_schema_writers import write_unit_json
from blk_vehicle_converter import convert_vehicle_blk

FIXTURES = Path(__file__).parent / 'fixtures' / 'aerospace_source_qualifiers.json'


class SharedQualifierVehicleCompatibilityTest(unittest.TestCase):
    def test_vehicle_writer_preserves_qualifier_key_order(self):
        fixtures = json.loads((FIXTURES.parent / 'vehicle_source_qualifiers.json').read_text(encoding='utf-8'))['fixtures']
        trailer = next(fixture for fixture in fixtures if fixture['qualifiers'].get('isTrailer'))
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'trailer.blk'
            source.write_text(trailer['blk'] + '\n<omni>\nfalse\n</omni>\n<clan_engine>\nfalse\n</clan_engine>\n', encoding='utf-8')
            unit = convert_vehicle_blk(source, logging.getLogger('vehicle-writer-order'))
            self.assertIsNotNone(unit)
            self.assertIs(unit['isOmni'], True)
            self.assertIs(unit['isTrailer'], True)
            self.assertIs(unit['clanEngine'], False)
            self.assertEqual(unit['transporters'], trailer['qualifiers']['transporters'])
            destination = Path(temp) / 'trailer.json'
            write_unit_json(destination, unit)
            written = destination.read_text(encoding='utf-8')
            self.assertEqual(list(json.loads(written)), [
                'id', 'chassis', 'model', 'unitType', 'techBase', 'rulesLevel',
                'era', 'year', 'tonnage', 'weightClass', 'motionType', 'movement',
                'engine', 'armor', 'equipment', 'isOmni', 'isTrailer', 'clanEngine',
                'armorTechRating', 'transporters', 'mulId', 'role', 'source', 'fluff',
            ])
            self.assertEqual(written, json.dumps(unit, indent=2, ensure_ascii=False))


class AerospaceSourceQualifiersTest(unittest.TestCase):
    def test_vehicle_stealth_armor_keeps_aircraft_stealth_identity(self):
        # MegaMek EquipmentType.java:107: T_ARMOR_STEALTH_VEHICLE = 22.
        # Saroyan Jump Bomber and Drake Medium Stealth Fighter use this code.
        from blk_aerospace_qualifiers import parse_aerospace_armor

        for code in (8, 22):
            with self.subTest(code=code):
                self.assertEqual(parse_aerospace_armor({'armor_type': str(code)}), {'type': 'STEALTH'})

    def test_eight_pinned_sources_round_trip(self):
        fixtures = json.loads(FIXTURES.read_text(encoding='utf-8'))['fixtures']
        self.assertEqual(len(fixtures), 8)
        for fixture in fixtures:
            with self.subTest(source=fixture['source']), tempfile.TemporaryDirectory() as temp:
                source = Path(temp) / 'source.blk'
                source.write_bytes(fixture['blk'].encode('utf-8'))
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), fixture['sha256'])
                unit = convert_aerospace_blk(source, logging.getLogger('aerospace-qualifiers'))
                self.assertIsNotNone(unit)
                for key, expected in fixture['qualifiers'].items():
                    self.assertIn(key, unit, f'{key} was dropped')
                    self.assertEqual(unit[key], expected)
                self.assertEqual(unit['armor'], fixture['armor'])
                self.assertEqual(unit, fixture['unit'])
                destination = Path(temp) / 'unit.json'
                write_unit_json(destination, unit)
                self.assertEqual(json.loads(destination.read_text(encoding='utf-8')), unit)

    def test_explicit_zero_false_empty_and_absence(self):
        from blk_aerospace_qualifiers import parse_aerospace_qualifiers

        self.assertEqual(parse_aerospace_qualifiers({}), {})
        self.assertEqual(parse_aerospace_qualifiers({
            'omni': 'false', 'omnipodheatsinks': '0',
            'clan_engine': 'false', 'transporters': '',
        }), {'isOmni': True, 'omniPodHeatSinks': 0, 'clanEngine': False, 'transporters': []})

    def test_bar_codes_read_rating_from_tag_only(self):
        from blk_aerospace_qualifiers import parse_aerospace_armor

        for code in range(43, 52):
            with self.subTest(code=code):
                tags = {'armor_type': str(code), 'barrating': '4'}
                self.assertEqual(parse_aerospace_armor(tags), {'type': 'BAR', 'barRating': 4})
                self.assertEqual(parse_aerospace_armor({'armor_type': str(code)}), {'type': 'BAR'})
        self.assertEqual(parse_aerospace_armor({'armor_type': '41'}), {'type': 'AEROSPACE'})


    def test_pod_heat_sink_count_is_an_int(self):
        from blk_aerospace_qualifiers import parse_aerospace_qualifiers

        result = parse_aerospace_qualifiers({'omnipodheatsinks': '8'})
        self.assertIs(type(result['omniPodHeatSinks']), int)

    def test_transporters_drop_blank_lines_inside_the_block(self):
        from blk_aerospace_qualifiers import parse_aerospace_qualifiers

        result = parse_aerospace_qualifiers({'transporters': 'troopspace:2.0\n\n   \ncargobay:10.0:1'})
        self.assertEqual(result['transporters'], ['troopspace:2.0', 'cargobay:10.0:1'])


class SharedBarArmorTest(unittest.TestCase):
    """One owner for the BAR rule: codes 43-51 are BAR (EquipmentType.java:128-136), and a
    rating comes only from an explicit positive `barrating` (BLKFile.java:501-513)."""

    def vehicle(self, extra):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'support.blk'
            source.write_text(
                '<UnitType>SupportTank</UnitType>\n<Name>Bar fixture</Name>\n<year>3060</year>\n'
                '<tonnage>20</tonnage>\n<cruiseMP>4</cruiseMP>\n<motion_type>Tracked</motion_type>\n'
                '<engine_type>0</engine_type>\n<armor_type>47</armor_type>\n'
                '<armor>\n10\n10\n10\n10\n</armor>\n' + extra, encoding='utf-8')
            return convert_vehicle_blk(source, logging.getLogger(__name__))['armor']

    def test_vehicle_and_aerospace_agree_on_every_barrating_form(self):
        from blk_aerospace_qualifiers import parse_aerospace_armor

        for tag, expected in ((None, None), ('7', 7), ('0', None)):
            with self.subTest(barrating=tag):
                extra = '' if tag is None else f'<barrating>\n{tag}\n</barrating>\n'
                aero_tags = {'armor_type': '47', **({} if tag is None else {'barrating': tag})}
                vehicle_armor = self.vehicle(extra)
                aero_armor = parse_aerospace_armor(aero_tags)
                self.assertEqual(vehicle_armor['type'], 'BAR')
                self.assertEqual(aero_armor['type'], 'BAR')
                self.assertEqual(vehicle_armor.get('barRating'), expected)
                self.assertEqual(aero_armor.get('barRating'), expected)

    def test_rating_is_an_int_and_only_positive_ratings_are_emitted(self):
        # Follow-up 40: a "7" rating is the int 7, not 7.0; -1 and 0 are no valid rating.
        from blk_unit_fields import bar_armor_fields

        fields = bar_armor_fields({'barrating': '7'}, 47)
        self.assertEqual(fields, {'type': 'BAR', 'barRating': 7})
        self.assertIs(type(fields['barRating']), int)
        for rating in ('-1', '0'):
            with self.subTest(barrating=rating):
                self.assertEqual(bar_armor_fields({'barrating': rating}, 47), {'type': 'BAR'})

    def test_the_rule_has_one_owner(self):
        import blk_aerospace_qualifiers
        import blk_unit_fields
        import blk_vehicle_converter

        for module in (blk_aerospace_qualifiers, blk_vehicle_converter):
            with self.subTest(module=module.__name__):
                self.assertIs(module.bar_armor_fields, blk_unit_fields.bar_armor_fields)
                self.assertNotIn('barrating', Path(module.__file__).read_text(encoding='utf-8'))

if __name__ == '__main__':
    unittest.main()
