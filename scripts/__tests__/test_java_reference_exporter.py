"""Run: python -B -m unittest discover -s scripts/__tests__ -p test_java_reference_exporter.py -v.

The committed fixture is real output of the pinned-MegaMek exporter (MegaMek 48fcb2f6, mm-data 50f7efef); these
tests check it against the known references without running Java.
"""

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

import java_reference_exporter as exporter
from java_reference_exporter import FAMILY_DIRS, FIXTURE_EXTRAS, KNOWN_REFERENCES, list_sources, selfcheck

FIXTURE = Path(__file__).resolve().parent / 'fixtures' / 'java_reference_vehicle_aero_capital.json'
AERO_FAMILIES = ('AeroSpaceFighter', 'ConvFighter')


class JavaReferenceExporterTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(FIXTURE.read_text(encoding='utf-8'))
        cls.rows = cls.fixture['rows']
        cls.sorted_rows = sorted(cls.rows, key=lambda r: r['path'])

    def test_exporter_reproduces_the_known_references(self):
        self.assertEqual(selfcheck(self.rows), [])

    def test_selfcheck_flags_bv_drift_and_missing_reference(self):
        drifted = copy.deepcopy(self.rows)
        next(r for r in drifted if r['concreteFamily'] == 'Tank' and r['path'] in KNOWN_REFERENCES)['battleValue']['total'] += 1
        self.assertEqual(len(selfcheck(drifted)), 1)
        without = [r for r in self.rows if r['path'] != next(iter(KNOWN_REFERENCES))]
        self.assertEqual(len(selfcheck(without)), 1)

    def test_selfcheck_flags_source_hash_class_and_stage_failure(self):
        reference = next(iter(KNOWN_REFERENCES))
        for field, value in (('sha256', '0' * 64), ('concreteFamily', 'BipedMek'), ('stageFailure', 'bv: boom')):
            rows = copy.deepcopy(self.rows)
            next(r for r in rows if r['path'] == reference)[field] = value
            self.assertEqual(len(selfcheck(rows)), 1, field)

    def run_main(self, selfcheck_rows, full_rows, manifest=None):
        """Run main() with Java, the runtime guard and artifact hashing stubbed; record the run names."""
        self.calls = []

        def fake_run_java(mekfiles, paths, out_dir, name):
            self.calls.append(name)
            return selfcheck_rows if name == 'selfcheck' else full_rows

        if manifest is None:
            manifest = [{'path': 'data/mekfiles/' + r['path'], 'sha256': r['sha256']} for r in self.rows]
        sources = [r['path'] for r in self.rows]
        with (
            tempfile.TemporaryDirectory() as temp,
            mock.patch.object(exporter, 'verify_runtime'),
            mock.patch.object(exporter, 'run_java', fake_run_java),
            mock.patch.object(exporter, 'digest', return_value='0' * 64),
            mock.patch.object(exporter, 'list_sources', return_value=sources),
            mock.patch.object(exporter, 'load_manifest_rows', return_value=manifest),
            mock.patch.object(sys, 'argv', ['exporter', '--mekfiles', temp, '--out-dir', temp]),
        ):
            summary = Path(temp) / 'summary.json'
            try:
                exporter.main()
            finally:
                self.summary = json.loads(summary.read_text()) if summary.exists() else None
        return self.calls

    def test_failed_selfcheck_stops_before_the_corpus_run(self):
        drifted = copy.deepcopy(self.rows)
        next(r for r in drifted if r['path'] in KNOWN_REFERENCES)['sha256'] = '0' * 64
        with self.assertRaises(SystemExit):
            self.run_main(drifted, self.rows)
        self.assertEqual(self.calls, ['selfcheck'])
        self.assertIsNone(self.summary)

    def test_clean_selfcheck_runs_the_corpus(self):
        self.assertEqual(self.run_main(sorted(self.rows, key=lambda r: r['path']), self.rows), ['selfcheck', 'full'])
        self.assertEqual((self.summary['sourceDrift'], self.summary['pathsReconciled']), (0, True))

    def test_corpus_run_fails_when_a_non_reference_source_drifts(self):
        drifted = copy.deepcopy(self.rows)
        next(r for r in drifted if r['path'] not in KNOWN_REFERENCES)['sha256'] = '0' * 64
        with self.assertRaises(SystemExit):
            self.run_main(self.rows, drifted)
        self.assertEqual(self.summary['sourceDrift'], 1)

    def test_corpus_run_fails_when_rows_do_not_match_the_source_list(self):
        with self.assertRaises(SystemExit):
            self.run_main(self.rows, self.rows[:-1])
        self.assertFalse(self.summary['pathsReconciled'])

    def test_corpus_run_fails_when_rows_come_back_out_of_order(self):
        with self.assertRaises(SystemExit):
            self.run_main(self.rows, list(reversed(self.rows)))
        self.assertFalse(self.summary['pathsReconciled'])

    def test_corpus_run_fails_when_a_pinned_source_is_missing_from_the_snapshot(self):
        manifest = [{'path': 'data/mekfiles/' + r['path'], 'sha256': r['sha256']} for r in self.rows]
        manifest.append({'path': 'data/mekfiles/vehicles/Deleted Unit.blk', 'sha256': '0' * 64})
        with self.assertRaises(SystemExit):
            self.run_main(self.rows, self.rows, manifest)
        self.assertEqual(self.summary['missingSources'], 1)

    def test_source_missing_from_the_manifest_counts_as_drift(self):
        self.assertEqual(exporter.source_drift(self.rows, []), [r['path'] for r in self.rows])

    def test_summary_counts_load_and_stage_failures(self):
        full = copy.deepcopy(self.rows)
        others = [r for r in full if r['path'] not in KNOWN_REFERENCES]
        others[0]['status'] = 'failed'
        others[1]['stageFailure'] = {'stage': 'battle-value'}
        self.run_main(self.rows, full)
        self.assertEqual((self.summary['loadFailures'], self.summary['stageFailures']), (1, 1))

    def test_pick_fixture_takes_references_and_the_lowest_hash_extras_per_class(self):
        def row(path, family, sha):
            return {'path': path, 'concreteFamily': family, 'sha256': sha, 'status': 'loaded'}
        reference = next(p for p, (family, _, _) in KNOWN_REFERENCES.items() if family == 'Tank')
        rows = [row(reference, 'Tank', 'f' * 64)]
        rows += [row(f'vehicles/t{i}.blk', 'Tank', f'{9 - i:064d}') for i in range(FIXTURE_EXTRAS['Tank'] + 2)]
        rows.append(row('vehicles/broken.blk', 'Tank', '0' * 64) | {'status': 'failed'})
        chosen = [r['path'] for r in exporter.pick_fixture(rows)]
        lowest = [f'vehicles/t{i}.blk' for i in range(FIXTURE_EXTRAS['Tank'] + 2)][-FIXTURE_EXTRAS['Tank']:]
        self.assertEqual(chosen, sorted([reference] + lowest))

    def test_verify_runtime_rejects_a_changed_runtime_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'pinned-results').mkdir()
            jar = root / 'dep.jar'
            jar.write_bytes(b'jar')
            (root / 'pinned-results/runtime-dependencies.json').write_text(json.dumps([{'file': str(jar), 'sha256': '0' * 64}]))
            (root / 'pinned-results/compiled-runtime-files.json').write_text('[]')
            with mock.patch.object(exporter, 'RUNTIME_REFERENCE', root):
                with self.assertRaises(ValueError):
                    exporter.verify_runtime()
                (root / 'pinned-results/runtime-dependencies.json').write_text(json.dumps([{'file': str(jar), 'sha256': exporter.digest(jar)}]))
                exporter.verify_runtime()

    def test_fixture_is_about_forty_units_covering_every_family(self):
        self.assertTrue(36 <= len(self.rows) <= 44, len(self.rows))
        families = {r['concreteFamily'] for r in self.rows}
        self.assertEqual(families, {f for f, _, _ in KNOWN_REFERENCES.values()} | set(FIXTURE_EXTRAS))
        self.assertTrue(all(r['status'] == 'loaded' and 'stageFailure' not in r for r in self.rows))

    def test_rows_carry_bv_aggregate_construction_weights_and_si(self):
        for row in self.rows:
            self.assertEqual(set(row['battleValue']['aggregates']), {'defensiveValue', 'offensiveValue', 'baseBV', 'tagBV', 'adjustedBV'})
            self.assertIn('valid', row['construction'])
            self.assertTrue(row['construction']['weightMethods'])
            self.assertEqual(row['failedEquipment'], [])
        self.assertTrue(all('structuralIntegrity' in r for r in self.rows if r['concreteFamily'] in (*AERO_FAMILIES, 'SmallCraft', 'FixedWingSupport')))

    def test_fighter_si_is_derived_as_megamek_does(self):
        fighters = [r for r in self.rows if r['concreteFamily'] in AERO_FAMILIES]
        self.assertTrue(fighters)
        for row in fighters:
            self.assertEqual(row['structuralIntegrity'], max(int(row['tonnage'] // 10), row['originalWalkMP']), row['path'])

    def test_list_sources_covers_family_directories_only(self):
        with tempfile.TemporaryDirectory() as temp:
            for name in ('vehicles/b/Two.blk', 'vehicles/One.blk', 'fighters/x.blk', 'dropships/y.blk', 'meks/Atlas.mtf', 'meks/skip.blk', 'vehicles/note.txt'):
                path = Path(temp) / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('x')
            self.assertEqual(list_sources(temp), ['dropships/y.blk', 'fighters/x.blk', 'vehicles/One.blk', 'vehicles/b/Two.blk'])

    def test_list_sources_reads_every_family_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            for family in FAMILY_DIRS:
                (Path(temp) / family).mkdir()
                (Path(temp) / family / 'unit.blk').write_text('x')
            self.assertEqual(list_sources(temp), sorted(f'{family}/unit.blk' for family in FAMILY_DIRS))
            self.assertEqual(len(FAMILY_DIRS), 8)


if __name__ == '__main__':
    unittest.main()
