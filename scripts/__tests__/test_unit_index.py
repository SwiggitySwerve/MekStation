"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_unit_index.py -v.

UL-08: per-family ``index.json`` generator, ``.gitignore`` allow rules for the new family
directories, and ``--units-dir`` on the schema harness. UL-08b: ids are unique per family,
not across families (owner ruling 2026-11-01: a unit's identity is (family, id)).
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

from unit_index import build_index_entry, find_duplicate_ids, generate_index, main  # noqa: E402

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
    def test_duplicate_inside_one_family_is_reported_once(self):
        self.assertEqual(find_duplicate_ids(['a', 'b', 'a', 'c', 'a']), ['a'])

    def test_unique_ids_report_nothing(self):
        self.assertEqual(find_duplicate_ids(['a', 'b']), [])


class UnitIndexCliTest(unittest.TestCase):
    def run_main(self, root, *extra):
        return main(['--units-dir', str(root), *extra])

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'units'
        shutil.copytree(FIXTURES, self.root)

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

    def test_id_shared_with_the_mech_catalog_is_allowed(self):
        # tomahawk-c is a Clan OmniMech and, separately, a Clan aerospace fighter. Identity is
        # (family, id), so the aerospace index keeps the id unchanged.
        mech_ids = {u['id'] for u in json.loads(MECH_INDEX.read_text(encoding='utf-8'))['units']}
        self.assertIn('tomahawk-c', mech_ids)
        self.assertEqual(self.run_main(self.root, '--write'), 0)
        aerospace = json.loads((self.root / 'aerospace' / 'index.json').read_text(encoding='utf-8'))
        self.assertIn('tomahawk-c', [u['id'] for u in aerospace['units']])

    def test_no_reserved_index_option(self):
        with self.assertRaises(SystemExit):
            self.run_main(self.root, '--reserved-index', str(MECH_INDEX))

    def test_missing_units_dir_fails(self):
        self.assertEqual(self.run_main(Path(self.temp.name) / 'no-such-dir', '--write'), 1)

    def test_same_id_in_two_families_is_allowed(self):
        shutil.copy(self.root / 'vehicles' / 'Demolisher II Heavy Tank.json', self.root / 'aerospace' / 'Dup.json')
        self.assertEqual(self.run_main(self.root, '--write'), 0)
        aerospace = json.loads((self.root / 'aerospace' / 'index.json').read_text(encoding='utf-8'))
        self.assertEqual(aerospace['totalUnits'], 5)

    def test_duplicate_id_within_a_family_fails_and_writes_nothing(self):
        nested = self.root / 'vehicles' / 'sub'
        nested.mkdir()
        shutil.copy(self.root / 'vehicles' / 'Demolisher II Heavy Tank.json', nested / 'Dup.json')
        sentinel = self.root / 'aerospace' / 'index.json'
        sentinel.write_text('{"units": []}', encoding='utf-8')
        self.assertEqual(self.run_main(self.root, '--write'), 1)
        self.assertFalse((self.root / 'vehicles' / 'index.json').exists())
        self.assertEqual(sentinel.read_text(encoding='utf-8'), '{"units": []}')

    def test_duplicate_in_a_later_family_fails_and_writes_nothing(self):
        shutil.copy(self.root / 'aerospace' / 'Sabre SB-27b-EC.json', self.root / 'aerospace' / 'Dup.json')
        self.assertEqual(self.run_main(self.root, '--write'), 1)
        self.assertFalse((self.root / 'vehicles' / 'index.json').exists())
        self.assertFalse((self.root / 'aerospace' / 'index.json').exists())

    def test_family_option_is_not_blocked_by_a_sibling_family(self):
        # A duplicate inside aerospace concerns aerospace only; a vehicles write goes ahead.
        shutil.copy(self.root / 'aerospace' / 'Sabre SB-27b-EC.json', self.root / 'aerospace' / 'Dup.json')
        self.assertEqual(self.run_main(self.root, '--family', 'vehicles', '--write'), 0)
        self.assertTrue((self.root / 'vehicles' / 'index.json').exists())
        self.assertFalse((self.root / 'aerospace' / 'index.json').exists())

    def test_named_family_that_does_not_exist_fails_and_writes_nothing(self):
        # Follow-up 31 L1: a named family that is absent must not exit 0 with nothing written.
        self.assertEqual(self.run_main(self.root, '--family', 'aerospace', '--family', 'capital', '--write'), 1)
        self.assertFalse((self.root / 'aerospace' / 'index.json').exists())

    def test_only_converted_families_can_be_indexed(self):
        # The BattleMech index belongs to mtf_converter and the shipped catalog; the owner ruling
        # of 2026-11-01 does not allow editing it. Typos, path forms and the units root itself
        # are refused too, before anything is written.
        mechs = self.root / 'battlemechs'
        mechs.mkdir()
        shutil.copy(self.root / 'aerospace' / 'Sabre SB-27b-EC.json', mechs / 'Mech.json')
        shipped = mechs / 'index.json'
        shipped.write_text('{"units": []}', encoding='utf-8')
        for family in ('battlemechs', '.', 'vehicles/', 'Vehicles', 'vehicle'):
            with self.subTest(family=family):
                (self.root / 'vehicles' / 'index.json').unlink(missing_ok=True)  # isolate subtests
                shipped.write_text('{"units": []}', encoding='utf-8')
                self.assertEqual(self.run_main(self.root, '--family', 'vehicles', '--family', family, '--write'), 1)
                self.assertEqual(shipped.read_text(encoding='utf-8'), '{"units": []}')
                self.assertFalse((self.root / 'vehicles' / 'index.json').exists())
                self.assertFalse((self.root / 'index.json').exists())

    def test_family_option_indexes_only_that_family(self):
        self.assertEqual(self.run_main(self.root, '--family', 'vehicles', '--write'), 0)
        self.assertTrue((self.root / 'vehicles' / 'index.json').exists())
        self.assertFalse((self.root / 'aerospace' / 'index.json').exists())

    def test_absent_default_family_is_tolerated(self):
        self.assertEqual(self.run_main(self.root), 0)  # no capital/ in the fixtures


class SharedIndexShapeTest(unittest.TestCase):
    def test_mtf_generator_uses_the_shared_columns_and_envelope(self):
        from mtf_converter import generate_index as generate_mech_index
        from unit_index import INDEX_COLUMNS
        with tempfile.TemporaryDirectory() as temp:
            unit = {'id': 'm', 'chassis': 'C', 'model': 'M', 'tonnage': 50, 'techBase': 'CLAN',
                    'year': 3050, 'rulesLevel': 'STANDARD'}  # no role: the MTF default is ''
            (Path(temp) / 'm.json').write_text(json.dumps(unit), encoding='utf-8')
            index = generate_mech_index(temp)
        self.assertEqual(list(index), ['version', 'generatedAt', 'totalUnits', 'units'])
        self.assertEqual(list(index['units'][0]), list(INDEX_COLUMNS))
        self.assertEqual(index['units'][0]['role'], '')


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
            'public/data/units/battlearmor/x.json',
            'public/data/units/infantry/x.json',
            'public/data/units/battlemechs/new.json',
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
            self.assertIn(str(units.resolve()), result.stdout)

    def test_missing_or_empty_units_dir_fails_strict(self):
        with tempfile.TemporaryDirectory() as temp:
            empty = Path(temp) / 'empty'
            empty.mkdir()
            for units in (Path(temp) / 'missing', empty):
                with self.subTest(units=units.name):
                    result = self.validate(units, Path(temp) / 'report.json')
                    self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                    # Follow-up 31 L2: the exit code alone would also pass on an import crash.
                    self.assertIn('no unit files under', result.stdout)

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
