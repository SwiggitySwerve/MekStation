"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_blk_capital_converter.py -v.

DropShip converter (UL-07a). MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587 BLKDropshipFile.java is the
reference for which tags are read and how: BLK armor index 1 is the right side and index 2 the left
(:132-136, via BLKAeroSpaceFighterFile.RW/LW); armor_type 0 is rewritten to aerospace armor (:120-125);
engine_type is never read (SmallCraft ICE placeholder); structural_integrity is explicit (:92-96).
The committed fixtures are real converter output for pinned mm-data 50f7efef.
"""

import json
import logging
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from blk_capital_converter import convert_capital_blk
from schema_gate import validate_unit

FIXTURES = Path(__file__).resolve().parents[2] / 'src/types/contracts/__tests__/fixtures'
PINNED_MM_DATA = Path(r'E:\Projects\Personal\_scratch\upstream-pins-20261028\mm-data\data')
MM_DATA = Path(os.environ.get('MM_DATA_ROOT', PINNED_MM_DATA))

# fixture file -> (source BLK under mekfiles, DropShip class facts from the pinned-Java oracle)
SOURCE_FIXTURES = {
    'dropship-union-3070.json': 'dropships/Other/Union (3070).blk',
    'dropship-dragau-ii-assault-interceptor.json': 'dropships/TRO3085/Supplemental/Dragau II Assault Interceptor.blk',
    'dropship-lee-cargo-carrier.json': 'dropships/Historicals/Liberation of Terra I and II/Lee (2756 Cargo).blk',
    'dropship-vulture-2312.json': 'dropships/TRO3075/Age of War/Vulture (2312).blk',
    'dropship-behemoth-c-arcship.json': 'dropships/TRO3057R/Clan/Behemoth C (Arcship).blk',
}

UNION_BLK = """<UnitType>
Dropship
</UnitType>
<Name>
Union
</Name>
<Model>
(3070)
</Model>
<mul id:>
5512
</mul id:>
<year>
3070
</year>
<originalBuildYear>
3055
</originalBuildYear>
<type>
IS Level 2
</type>
<role>
None
</role>
<motion_type>
Spheroid
</motion_type>
<tonnage>
3600.0
</tonnage>
<transporters>
mekbay:4.0:2:-1::-1:0
asfbay:2.0:2:3::-1:0
cargobay:75.0:1:6::-1:0
</transporters>
<SafeThrust>
3
</SafeThrust>
<structural_integrity>
11
</structural_integrity>
<heatsinks>
80
</heatsinks>
<sink_type>
1
</sink_type>
<fuel>
6450
</fuel>
<engine_type>
1
</engine_type>
<armor_type>
41
</armor_type>
<armor>
180
170
160
120
</armor>
<crew>
42
</crew>
<officers>
7
</officers>
<gunners>
18
</gunners>
<passengers>
10
</passengers>
<battlearmor>
12
</battlearmor>
<marines>
8
</marines>
<otherpassenger>
2
</otherpassenger>
<life_boat>
2
</life_boat>
<escape_pod>
4
</escape_pod>
<designtype>
1
</designtype>
<Nose Equipment>
(B) ISERPPC
(B) ISGaussRifle
IS Gauss Ammo:24
</Nose Equipment>
<Left Side Equipment>
(R) (B) ISERLargeLaser
</Left Side Equipment>
<Right Side Equipment>
ISArtemisIV
</Right Side Equipment>
<Aft Equipment>
ISAntiMissileSystem
</Aft Equipment>
<Hull Equipment>
ISCASE
</Hull Equipment>
"""


def with_tag(body, tag, value):
    """Replace one single-value tag in a fixture body."""
    start = body.index(f'<{tag}>\n') + len(tag) + 3
    end = body.index(f'</{tag}>', start)
    return body[:start] + f'{value}\n' + body[end:]


class CapitalConverterTest(unittest.TestCase):
    def convert(self, body):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'unit.blk'
            source.write_text(body, encoding='utf-8')
            return convert_capital_blk(source, logging.getLogger('test-blk-capital'))

    def test_union_converts_to_a_schema_valid_dropship(self):
        unit = self.convert(UNION_BLK)
        self.assertEqual(validate_unit(unit), [])
        self.assertEqual(
            (unit['id'], unit['chassis'], unit['model'], unit['unitType'], unit['subType']),
            ('union-3070', 'Union', '(3070)', 'DropShip', 'DropShip'),
        )
        self.assertEqual((unit['tonnage'], unit['year'], unit['originalBuildYear'], unit['mulId']), (3600, 3070, 3055, 5512))
        self.assertEqual(unit['motionType'], 'SPHEROID')
        self.assertEqual(unit['movement'], {'safeThrust': 3, 'maxThrust': 5})
        self.assertEqual((unit['structuralIntegrity'], unit['fuel']), (11, 6450))
        self.assertEqual(unit['heatSinks'], {'type': 'DOUBLE', 'count': 80})
        self.assertEqual(unit['designType'], 'MILITARY')

    def test_crew_and_life_support_counts_are_kept(self):
        unit = self.convert(UNION_BLK)
        self.assertEqual(
            {k: unit[k] for k in ('crew', 'officers', 'gunners', 'passengers', 'battleArmor', 'marines', 'otherPassengers', 'escapePods', 'lifeBoats')},
            {'crew': 42, 'officers': 7, 'gunners': 18, 'passengers': 10, 'battleArmor': 12, 'marines': 8, 'otherPassengers': 2, 'escapePods': 4, 'lifeBoats': 2},
        )
        self.assertEqual(unit['transporters'], ['mekbay:4.0:2:-1::-1:0', 'asfbay:2.0:2:3::-1:0', 'cargobay:75.0:1:6::-1:0'])

    def test_blk_armor_index_one_is_the_right_side(self):
        # BLKDropshipFile.java:132-136: armor[RW=1] -> LOC_RIGHT_WING, armor[LW=2] -> LOC_LEFT_WING.
        self.assertEqual(
            self.convert(UNION_BLK)['armor']['byArc'],
            {'NOSE': 180, 'RIGHT_SIDE': 170, 'LEFT_SIDE': 160, 'AFT': 120},
        )

    def test_equipment_keeps_every_mount_with_its_location_and_source_name(self):
        equipment = self.convert(UNION_BLK)['equipment']
        self.assertEqual(
            [(e['location'], e['name']) for e in equipment],
            [
                ('NOSE', '(B) ISERPPC'), ('NOSE', '(B) ISGaussRifle'), ('NOSE', 'IS Gauss Ammo:24'),
                ('LEFT_SIDE', '(R) (B) ISERLargeLaser'), ('RIGHT_SIDE', 'ISArtemisIV'),
                ('AFT', 'ISAntiMissileSystem'), ('HULL', 'ISCASE'),
            ],
        )

    def test_engine_is_the_small_craft_placeholder_whatever_engine_type_says(self):
        # BLKDropshipFile never reads engine_type; Dropship extends SmallCraft, whose engine is the ICE placeholder.
        self.assertEqual(self.convert(UNION_BLK)['engine'], {'type': 'ICE'})

    def test_armor_codes_map_to_their_large_craft_types(self):
        # EquipmentType.java T_ARMOR_ALUM=19, T_ARMOR_HEAVY_ALUM=20, T_ARMOR_PRIMITIVE_AERO=40, T_ARMOR_AEROSPACE=41;
        # BLKDropshipFile.java:120-125 turns the legacy standard code 0 into aerospace armor.
        for code, expected in ((41, 'AEROSPACE'), (0, 'AEROSPACE'), (19, 'FERRO_ALUMINUM'), (20, 'HEAVY_FERRO_ALUMINUM'), (40, 'PRIMITIVE_AERO')):
            with self.subTest(code=code):
                unit = self.convert(with_tag(UNION_BLK, 'armor_type', code))
                self.assertEqual(unit['armor']['type'], expected)
                self.assertEqual(validate_unit(unit), [])

    def test_an_unmapped_armor_code_is_refused_not_defaulted(self):
        with self.assertRaises(ValueError):
            self.convert(with_tag(UNION_BLK, 'armor_type', 99))

    def test_heavy_ferro_aluminum_aerodyne_dragau_class_case(self):
        body = with_tag(with_tag(with_tag(UNION_BLK, 'armor_type', 20), 'motion_type', 'Aerodyne'), 'type', 'IS Level 3')
        body = with_tag(with_tag(body, 'SafeThrust', 9), 'designtype', 0)
        unit = self.convert(body)
        self.assertEqual((unit['motionType'], unit['rulesLevel'], unit['designType']), ('AERODYNE', 'ADVANCED', 'CIVILIAN'))
        self.assertEqual(unit['movement'], {'safeThrust': 9, 'maxThrust': 14})
        self.assertEqual(validate_unit(unit), [])

    def test_collar_type_defaults_to_standard(self):
        # Dropship.java:134 collarType = COLLAR_STANDARD (0); the tag only appears on 8 sources.
        self.assertEqual(self.convert(UNION_BLK)['collarType'], 0)
        self.assertEqual(self.convert(UNION_BLK.replace('<designtype>', '<collartype>\n2\n</collartype>\n<designtype>'))['collarType'], 2)

    def test_tonnage_above_the_mech_cap_is_valid_for_a_dropship(self):
        # Behemoth C Arcship is 100,000 t; unit-schema.json capped every unit at 250 t.
        unit = self.convert(with_tag(UNION_BLK, 'tonnage', '100000.0'))
        self.assertEqual(unit['tonnage'], 100000)
        self.assertEqual(validate_unit(unit), [])

    def test_mechs_stay_capped_at_250_tons(self):
        for unit_type in ('BattleMech', 'OmniMech', 'IndustrialMech'):
            with self.subTest(unit_type=unit_type):
                self.assertTrue(any('tonnage' in e for e in validate_unit({'id': 'x', 'unitType': unit_type, 'tonnage': 251})))
                self.assertFalse(any('tonnage' in e for e in validate_unit({'id': 'x', 'unitType': unit_type, 'tonnage': 250})))

    def test_other_unit_types_are_skipped(self):
        self.assertIsNone(self.convert(UNION_BLK.replace('Dropship', 'SmallCraft')))

    def test_missing_mandatory_identity_tags_are_rejected(self):
        for tag in ('Name', 'year', 'tonnage', 'type'):
            with self.subTest(tag=tag), self.assertRaisesRegex(ValueError, tag):
                self.convert(re.sub(rf'<{tag}>.*?</{tag}>\n', '', UNION_BLK, flags=re.S))

    def test_unknown_technology_is_rejected(self):
        for tech in ('Unknown', 'Mixed', 'IS Level 99', 'Clan Level 1'):
            with self.subTest(tech=tech), self.assertRaisesRegex(ValueError, 'tech'):
                self.convert(with_tag(UNION_BLK, 'type', tech))

    def test_all_java_technology_strings_are_accepted(self):
        technologies = ['IS', 'Clan'] + [f'IS Level {level}' for level in range(1, 6)]
        technologies += [f'Clan Level {level}' for level in range(2, 6)]
        technologies += [f'Mixed ({chassis} Chassis){suffix}' for chassis in ('IS', 'Clan')
                         for suffix in ('', ' Advanced', ' Experimental', ' Unofficial')]
        for tech in technologies:
            with self.subTest(tech=tech):
                self.assertIsNotNone(self.convert(with_tag(UNION_BLK, 'type', tech)))

    def test_spheroid_motion_is_case_insensitive_with_aerodyne_fallback(self):
        for motion in ('Spheroid', 'spheroid', 'SPHEROID', 'Aerodyne', 'unknown'):
            with self.subTest(motion=motion):
                self.assertEqual(self.convert(with_tag(UNION_BLK, 'motion_type', motion))['motionType'],
                                 'SPHEROID' if motion.lower() == 'spheroid' else 'AERODYNE')

    def test_thrust_requires_a_source_value_but_accepts_zero(self):
        self.assertEqual(self.convert(with_tag(UNION_BLK, 'SafeThrust', 0))['movement'], {'safeThrust': 0, 'maxThrust': 0})
        with self.assertRaisesRegex(ValueError, 'SafeThrust'):
            self.convert(re.sub(r'<SafeThrust>.*?</SafeThrust>\n', '', UNION_BLK, flags=re.S))

    def test_damaged_source_rejects_the_batch_before_any_output_is_written(self):
        for tag in ('Name', 'year', 'tonnage', 'type'):
            with self.subTest(tag=tag), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                source = root / 'source' / 'dropships'
                source.mkdir(parents=True)
                for name in ('Union', 'Leopard', 'Overlord', 'Behemoth'):
                    (source / f'{name}.blk').write_text(with_tag(UNION_BLK, 'Name', name), encoding='utf-8')
                damaged = re.sub(rf'<{tag}>.*?</{tag}>\n', '', UNION_BLK, flags=re.S)
                (source / 'damaged.blk').write_text(damaged, encoding='utf-8')
                output = root / 'output'
                result = subprocess.run(
                    [sys.executable, '-B', str(Path(__file__).resolve().parents[1] / 'megameklab-conversion/blk_capital_converter.py'),
                     '--source', str(source.parent), '--output', str(output)], capture_output=True, text=True,
                )
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertEqual(list(output.rglob('*')), [], result.stdout + result.stderr)

    def test_family_tonnage_boundaries(self):
        for unit_type, maximum in (
            ('Aerospace', 250), ('ProtoMech', 250), ('VTOL', 250), ('Vehicle', 250),
            ('Conventional Fighter', 250), ('Small Craft', 250), ('Infantry', 250), ('Battle Armor', 250),
            ('Support Vehicle', 600), ('SupportVehicle', 600),
            ('DropShip', 2400000), ('JumpShip', 2400000), ('WarShip', 2400000), ('Space Station', 2400000),
        ):
            with self.subTest(unit_type=unit_type):
                unit = {'id': 'boundary', 'unitType': unit_type, 'tonnage': maximum}
                self.assertEqual(validate_unit(unit), [])
                self.assertTrue(validate_unit({**unit, 'tonnage': maximum + 1}))

    def test_existing_catalog_still_validates(self):
        catalog = Path(__file__).resolve().parents[2] / 'public/data/units'
        files = [path for path in sorted(catalog.rglob('*.json'))
                 if path.name not in ('index.json', 'units-manifest.json')]
        self.assertGreater(len(files), 0)
        for path in files:
            with self.subTest(path=path.relative_to(catalog)):
                self.assertEqual(validate_unit(json.loads(path.read_text(encoding='utf-8'))), [])


class CommittedFixturesTest(unittest.TestCase):
    def test_each_fixture_is_schema_valid(self):
        for fixture in SOURCE_FIXTURES:
            with self.subTest(fixture=fixture):
                self.assertEqual(validate_unit(json.loads((FIXTURES / fixture).read_text(encoding='utf-8'))), [])

    @unittest.skipUnless(MM_DATA.is_dir(), 'pinned mm-data not available')
    def test_each_fixture_regenerates_exactly_from_its_pinned_source(self):
        for fixture, source in SOURCE_FIXTURES.items():
            with self.subTest(fixture=fixture):
                committed = json.loads((FIXTURES / fixture).read_text(encoding='utf-8'))
                regenerated = convert_capital_blk(MM_DATA / 'mekfiles' / source, logging.getLogger('test-blk-capital'))
                self.assertEqual(regenerated, committed)


if __name__ == '__main__':
    unittest.main()
