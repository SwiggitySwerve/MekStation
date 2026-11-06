"""Fail-closed family regeneration from mount-keyed source metadata."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
import quirk_regeneration as regeneration
from quirk_regeneration import apply_family, plan_family, verify_tree, write_family


class QuirkRegenerationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.baseline = self.root / 'units'
        self.family = self.baseline / 'capital'
        self.family.mkdir(parents=True)
        self.raw = b'{"id":"fixed-id","chassis":"Ship","model":"A","unitType":"DropShip","tonnage":3.000}\n'
        (self.family / 'Ship A.json').write_bytes(self.raw)
        (self.family / 'index.json').write_bytes(b'{"units":["Ship A.json"]}\n')
        self.record = {'path': 'dropships/Ship A.blk', 'chassis': 'Ship', 'model': 'A',
                       'fields': {'quirks': ['easy_maintain'], 'weaponQuirks': {'NOS:0:PPC': ['accurate', 'mod_weapons', 'accurate']}}}

    def test_two_independent_runs_and_raw_byte_gate(self):
        plan, counts = plan_family(self.baseline, 'capital', [self.record])
        self.assertEqual(counts['source'], {'unitQuirkFiles': 1, 'weaponQuirkFiles': 1, 'weaponQuirkEntries': 3})
        for name in ['first', 'second']:
            write_family(self.family, self.root / name, plan)
            verify_tree(self.family, self.root / name)
        verify_tree(self.root / 'first', self.root / 'second', identical=True)
        result = (self.root / 'first/Ship A.json').read_bytes()
        self.assertIn(b'"tonnage":3.000', result)
        self.assertEqual(json.loads(result)['weaponQuirks'], self.record['fields']['weaponQuirks'])
        self.assertEqual((self.family / 'Ship A.json').read_bytes(), self.raw)
        apply_family(self.family, self.root / 'first', self.root / 'second')
        self.assertEqual((self.family / 'Ship A.json').read_bytes(), result)

    def test_failed_second_run_cannot_partially_apply(self):
        plan, _ = plan_family(self.baseline, 'capital', [self.record])
        write_family(self.family, self.root / 'first', plan)
        write_family(self.family, self.root / 'second', plan)
        (self.root / 'second/index.json').write_bytes(b'{}')
        with self.assertRaises(ValueError):
            apply_family(self.family, self.root / 'first', self.root / 'second')
        self.assertEqual((self.family / 'Ship A.json').read_bytes(), self.raw)

    def test_managed_generation_is_formatter_stable_and_keeps_nonquirk_bytes(self):
        repo = Path(__file__).resolve().parents[2]
        family = self.baseline / 'battlemechs'
        family.mkdir()
        raw = b'{\n  "id": "mech",\n  "chassis": "Mech",\n  "model": "A",\n  "unitType": "BattleMech",\n  "tonnage": 30\n}\n'
        (family / 'Mech A.json').write_bytes(raw)
        (family / 'index.json').write_bytes(b'{"unchanged":true}\n')
        record = {'path': 'meks/Mech A.mtf', 'chassis': 'Mech', 'model': 'A',
                  'fields': {'weaponQuirks': {'RA:4:Medium Laser': ['accurate', 'accurate']}}}
        plan, _ = plan_family(self.baseline, 'battlemechs', [record])
        for name in ['formatted-1', 'formatted-2']:
            write_family(family, self.root / name, plan, formatter_repo=repo)
        verify_tree(self.root / 'formatted-1', self.root / 'formatted-2', identical=True)
        output = self.root / 'formatted-1'
        before = {p.name: p.read_bytes() for p in output.iterdir()}
        self.assertIn(b'["accurate", "accurate"]', before['Mech A.json'])
        regeneration.format_family(output, plan, repo, 'battlemechs')
        self.assertEqual(before, {p.name: p.read_bytes() for p in output.iterdir()})
        verify_tree(family, output)
        self.assertEqual((family / 'Mech A.json').read_bytes(), raw)

    def test_formatter_uses_native_repository_family_ignore_policy(self):
        plan, _ = plan_family(self.baseline, 'capital', [self.record])
        raw_output = self.root / 'unformatted'
        formatted_output = self.root / 'policy-output'
        write_family(self.family, raw_output, plan)
        write_family(self.family, formatted_output, plan,
                     formatter_repo=Path(__file__).resolve().parents[2])
        verify_tree(raw_output, formatted_output, identical=True)

    def test_ambiguous_conflicting_sources_and_missing_identity_fail_before_writing(self):
        other = {**self.record, 'path': 'dropships/another.blk', 'fields': {'quirks': ['bad_rep']}}
        # Exact source filename disambiguates duplicate identities.
        self.assertEqual(plan_family(self.baseline, 'capital', [other, self.record])[0]['Ship A.json'],
                         plan_family(self.baseline, 'capital', [self.record])[0]['Ship A.json'])
        (self.family / 'Ship A.json').rename(self.family / 'unrelated.json')
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            plan_family(self.baseline, 'capital', [other, self.record])
        with self.assertRaisesRegex(ValueError, 'Unmatched'):
            plan_family(self.baseline, 'capital', [{**self.record, 'chassis': 'Unknown'}])

    def test_missing_family_trees_fail_closed(self):
        with self.assertRaises(ValueError):
            verify_tree(self.root / 'missing-a', self.root / 'missing-b')
        with self.assertRaises(ValueError):
            plan_family(self.root / 'missing', 'capital', [])

    def test_output_cannot_overlap_baseline(self):
        for output in [self.family / 'recursive', self.baseline, self.family]:
            with self.subTest(output=output), self.assertRaises(ValueError):
                write_family(self.family, output, {})

    def test_gate_rejects_file_sets_and_nonunit_or_construction_changes(self):
        write_family(self.family, self.root / 'out', {})
        for relative, bad in [('Ship A.json', self.raw.replace(b'3.000', b'3.0')),
                              ('index.json', b'{"units":[],"quirks":[]}\n')]:
            path = self.root / 'out' / relative
            old = path.read_bytes()
            path.write_bytes(bad)
            with self.assertRaises(ValueError):
                verify_tree(self.family, self.root / 'out')
            path.write_bytes(old)
        (self.root / 'out/extra.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'File sets'):
            verify_tree(self.family, self.root / 'out')


if __name__ == '__main__':
    unittest.main()
