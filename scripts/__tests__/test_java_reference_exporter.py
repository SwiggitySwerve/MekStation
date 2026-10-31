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

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))

from java_reference_exporter import FIXTURE_EXTRAS, KNOWN_REFERENCES, list_sources, selfcheck

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


if __name__ == '__main__':
    unittest.main()
