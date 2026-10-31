"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_unit_index.py -v.

UL-08: per-family ``index.json`` generator, cross-catalog id uniqueness, ``.gitignore``
allow rules for the new family directories, and ``--units-dir`` on the schema harness.
Fixtures under ``fixtures/unit-index`` are converter output from pinned mm-data
50f7efef (5 vehicles, 4 aerospace); the real ``public/data/units`` is never written.
"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

CONVERSION = Path(__file__).resolve().parents[1] / 'megameklab-conversion'
sys.path.insert(0, str(CONVERSION))

from unit_index import build_index_entry, find_id_collisions, generate_index, main  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).resolve().parent / 'fixtures' / 'unit-index'
MECH_INDEX = REPO_ROOT / 'public' / 'data' / 'units' / 'battlemechs' / 'index.json'
PYTHON = sys.executable


def mech_index_shape():
    data = json.loads(MECH_INDEX.read_text(encoding='utf-8'))
    return list(data), list(data['units'][0])


class UnitIndexShapeTest(unittest.TestCase):
    def test_top_level_keys_and_entry_keys_follow_the_mech_index(self):
        top, entry = mech_index_shape()
        index = generate_index(FIXTURES / 'vehicles', generated_at='2026-10-31T00:00:00')
        self.assertEqual(list(index), top)
        # Mech entries carry no unitType; the family indexes add it directly after `model`
        # (the only difference), because the loader reads the type from the index.
        expected = entry[:3] + ['unitType'] + entry[3:]
        for unit in index['units']:
            self.assertEqual(list(unit), expected)

    def test_entries_come_from_the_unit_files(self):
        index = generate_index(FIXTURES / 'vehicles', generated_at='x')
        by_id = {u['id']: u for u in index['units']}
        self.assertEqual(index['totalUnits'], 5)
        self.assertEqual(
            by_id['boreas-cavalry-hovercraft-prime'],
            {
                'id': 'boreas-cavalry-hovercraft-prime',
                'chassis': 'Boreas Cavalry Hovercraft',
                'model': '(Prime)',
                'unitType': 'Support Vehicle',
                'tonnage': 0.75,
                'techBase': 'INNER_SPHERE',
                'year': 3015,
                'role': 'None',  # the BLK's literal <role>None</role>, carried through
                'rulesLevel': 'STANDARD',
                'path': 'Boreas Cavalry Hovercraft (Prime).json',
            },
        )
        self.assertEqual(by_id['ferret-light-scout-vtol']['unitType'], 'VTOL')
        for unit in index['units']:
            self.assertTrue((FIXTURES / 'vehicles' / unit['path']).is_file())

    def test_sorted_by_chassis_then_model_and_skips_non_unit_files(self):
        with tempfile.TemporaryDirectory() as temp:
            family = Path(temp) / 'vehicles'
            shutil.copytree(FIXTURES / 'vehicles', family)
            (family / 'index.json').write_text('{}', encoding='utf-8')
            (family / 'units-manifest.json').write_text('{}', encoding='utf-8')
            nested = family / '3075' / 'sub'
            nested.mkdir(parents=True)
            shutil.move(str(family / 'Ferret Light Scout VTOL.json'), str(nested / 'Ferret Light Scout VTOL.json'))
            index = generate_index(family, generated_at='x')
        keys = [(u['chassis'], u['model']) for u in index['units']]
        self.assertEqual(keys, sorted(keys))
        self.assertEqual(index['totalUnits'], 5)
        paths = {u['id']: u['path'] for u in index['units']}
        self.assertEqual(paths['ferret-light-scout-vtol'], '3075/sub/Ferret Light Scout VTOL.json')

    def test_missing_role_is_an_empty_string_like_the_mech_index(self):
        entry = build_index_entry(
            {'id': 'a', 'chassis': 'A', 'model': 'B', 'unitType': 'Vehicle', 'tonnage': 5,
             'techBase': 'CLAN', 'year': 3000, 'role': None, 'rulesLevel': 'STANDARD'},
            'a.json',
        )
        self.assertEqual(entry['role'], '')


class IdUniquenessTest(unittest.TestCase):
    def test_tomahawk_c_collides_with_the_mech_index(self):
        mech_ids = [u['id'] for u in json.loads(MECH_INDEX.read_text(encoding='utf-8'))['units']]
        aero_ids = [u['id'] for u in generate_index(FIXTURES / 'aerospace', generated_at='x')['units']]
        collisions = find_id_collisions({'battlemechs': mech_ids, 'aerospace': aero_ids})
        self.assertEqual(collisions, {'tomahawk-c': ['battlemechs', 'aerospace']})

    def test_duplicate_inside_one_family_is_reported(self):
        self.assertEqual(find_id_collisions({'vehicles': ['a', 'b', 'a']}), {'a': ['vehicles', 'vehicles']})

    def test_unique_ids_report_nothing(self):
        self.assertEqual(find_id_collisions({'x': ['a'], 'y': ['b']}), {})


class UnitIndexCliTest(unittest.TestCase):
    def run_main(self, root, *extra):
        return main(['--units-dir', str(root), '--reserved-index', str(self.reserved), *extra])

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'units'
        shutil.copytree(FIXTURES, self.root)
        self.reserved = Path(self.temp.name) / 'reserved.json'
        self.reserved.write_text(json.dumps({'units': [{'id': 'some-mech'}]}), encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def test_write_creates_one_index_per_present_family(self):
        self.assertEqual(self.run_main(self.root, '--write'), 0)
        vehicles = json.loads((self.root / 'vehicles' / 'index.json').read_text(encoding='utf-8'))
        aerospace = json.loads((self.root / 'aerospace' / 'index.json').read_text(encoding='utf-8'))
        self.assertEqual((vehicles['totalUnits'], aerospace['totalUnits']), (5, 4))
        self.assertFalse((self.root / 'capital').exists())  # absent family tolerated, not created

    def test_dry_run_writes_nothing(self):
        self.assertEqual(self.run_main(self.root), 0)
        self.assertFalse((self.root / 'vehicles' / 'index.json').exists())

    def test_collision_with_reserved_index_fails_and_writes_nothing(self):
        self.reserved.write_text(json.dumps({'units': [{'id': 'tomahawk-c'}]}), encoding='utf-8')
        self.assertEqual(self.run_main(self.root, '--write'), 1)
        self.assertFalse((self.root / 'vehicles' / 'index.json').exists())
        self.assertFalse((self.root / 'aerospace' / 'index.json').exists())

    def test_default_reserved_index_is_the_real_mech_index(self):
        # The fixtures contain tomahawk-c, so the default reserved index must flag it.
        self.assertEqual(main(['--units-dir', str(self.root)]), 1)


class GitignoreAllowRuleTest(unittest.TestCase):
    def ignored(self, path):
        # --no-index: tracked battlemechs files would otherwise always read as "not ignored".
        result = subprocess.run(
            ['git', 'check-ignore', '--no-index', '-q', path], cwd=REPO_ROOT, capture_output=True
        )
        return result.returncode == 0

    def test_new_family_directories_are_not_ignored(self):
        for family in ('vehicles', 'aerospace', 'capital'):
            with self.subTest(family=family):
                self.assertFalse(self.ignored(f'public/data/units/{family}/index.json'))
                self.assertFalse(self.ignored(f'public/data/units/{family}/sub/Unit X.json'))

    def test_the_rest_of_public_data_stays_ignored(self):
        for path in (
            'public/data/units/other/index.json',
            'public/data/units/index.json',
            'public/data/scratch.json',
            'public/data/equipment/official/weapons/x.json',
        ):
            with self.subTest(path=path):
                self.assertTrue(self.ignored(path))


class UnitsDirOptionTest(unittest.TestCase):
    def validate(self, units_dir, report):
        return subprocess.run(
            [PYTHON, '-B', str(CONVERSION / 'run_schema_validation_only.py'), '--strict', '--shape', 'unit',
             '--units-dir', str(units_dir), '--report-path', str(report)],
            cwd=REPO_ROOT, capture_output=True, text=True,
        )

    def test_scratch_directory_outside_the_repo_validates(self):
        with tempfile.TemporaryDirectory() as temp:
            units = Path(temp) / 'units'
            shutil.copytree(FIXTURES, units)
            (units / 'vehicles' / 'index.json').write_text('{}', encoding='utf-8')
            report = Path(temp) / 'report.json'
            result = self.validate(units, report)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            totals = json.loads(report.read_text(encoding='utf-8'))['totals']
            self.assertEqual((totals['files'], totals['failures']), (9, 0))
            self.assertIn(str(units), result.stdout)

    def test_invalid_unit_in_scratch_directory_fails_strict(self):
        with tempfile.TemporaryDirectory() as temp:
            units = Path(temp) / 'units'
            shutil.copytree(FIXTURES, units)
            victim = units / 'vehicles' / 'Demolisher II Heavy Tank.json'
            unit = json.loads(victim.read_text(encoding='utf-8'))
            unit['engine']['type'] = 'NOT_AN_ENGINE'
            victim.write_text(json.dumps(unit), encoding='utf-8')
            result = self.validate(units, Path(temp) / 'report.json')
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertIn('Demolisher II Heavy Tank.json', result.stdout)


if __name__ == '__main__':
    unittest.main()
