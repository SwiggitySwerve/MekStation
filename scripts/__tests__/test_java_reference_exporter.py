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

    def run_main(self, selfcheck_rows, full_rows):
        """Run main() with Java, the runtime guard and artifact hashing stubbed; return the run names."""
        calls = []

        def fake_run_java(mekfiles, paths, out_dir, name):
            calls.append(name)
            return selfcheck_rows if name == 'selfcheck' else full_rows

        manifest = [{'path': 'data/mekfiles/' + r['path'], 'sha256': r['sha256']} for r in self.rows]
        with tempfile.TemporaryDirectory() as temp,                 mock.patch.object(exporter, 'verify_runtime'),                 mock.patch.object(exporter, 'run_java', fake_run_java),                 mock.patch.object(exporter, 'digest', return_value='0' * 64),                 mock.patch.object(exporter, 'list_sources', return_value=[r['path'] for r in self.rows]),                 mock.patch.object(exporter, 'load_manifest_rows', return_value=manifest),                 mock.patch.object(sys, 'argv', ['exporter', '--mekfiles', temp, '--out-dir', temp]):
            try:
                exporter.main()
            finally:
                self.summary = json.loads((Path(temp) / 'summary.json').read_text()) if (Path(temp) / 'summary.json').exists() else None
        return calls

    def test_failed_selfcheck_stops_before_the_corpus_run(self):
        drifted = copy.deepcopy(self.rows)
        next(r for r in drifted if r['path'] in KNOWN_REFERENCES)['sha256'] = '0' * 64
        with self.assertRaises(SystemExit):
            self.run_main(drifted, self.rows)
        self.assertIsNone(self.summary)

    def test_clean_selfcheck_runs_the_corpus(self):
        self.assertEqual(self.run_main(self.rows, self.rows), ['selfcheck', 'full'])
        self.assertEqual((self.summary['sourceDrift'], self.summary['pathsReconciled']), (0, True))

    def test_corpus_run_fails_when_a_non_reference_source_drifts(self):
        drifted = copy.deepcopy(self.rows)
        next(r for r in drifted if r['path'] not in KNOWN_REFERENCES)['sha256'] = '0' * 64
        with self.assertRaises(SystemExit):
            self.run_main(self.rows, drifted)
        self.assertEqual(self.summary['sourceDrift'], 1)

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
