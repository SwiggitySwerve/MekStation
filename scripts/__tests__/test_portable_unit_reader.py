"""Conformance cases for the portable unit reader, a consumer independent of the app."""

import ast
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from portable_unit_reader import FAMILIES, ConformanceError, UnitReader, scan  # noqa: E402

READER = ROOT / 'scripts/portable_unit_reader.py'


class PortableUnitReaderTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reader = UnitReader()
        cls.examples = {
            family: json.loads((ROOT / 'docs/data/examples' / f'{family}.json').read_text(encoding='utf-8'))
            for family in FAMILIES
        }

    def test_family_manifest_covers_exactly_the_schema_unit_types(self):
        kinds = [kind for family in FAMILIES.values() for kind in family]
        self.assertEqual(len(kinds), len(set(kinds)))
        self.assertEqual(set(kinds), set(self.reader.schema['properties']['unitType']['enum']))

    def test_examples_read_with_family_identity_and_explicit_current_version(self):
        for family, document in self.examples.items():
            with self.subTest(family=family):
                unit = self.reader.read(document, family)
                self.assertEqual(unit.identity, (family, document['id']))
                self.assertEqual(unit.version, '1.0.0')
                self.assertEqual(unit.document, document)

    def test_absent_version_reads_as_1_0_0_without_adding_the_field(self):
        legacy = dict(self.examples['battlemechs'])
        del legacy['schemaVersion']
        unit = self.reader.read(legacy)
        self.assertEqual(unit.version, '1.0.0')
        self.assertNotIn('schemaVersion', unit.document)
        self.assertEqual(unit.document, legacy)

    def test_compatible_minor_and_unknown_extensions_survive_and_other_versions_fail(self):
        newer = dict(self.examples['battlemechs'], schemaVersion='1.99.2', **{'org.example:opaque': {'zero': 0}})
        unit = self.reader.read(newer)
        self.assertEqual(unit.version, '1.99.2')
        self.assertEqual(unit.document, newer)
        for version in ('2.0.0', '0.9.0', '1.0', '01.0.0', '1.01.0', '1.0.0-alpha', '1.0.0+build', '1.0.0\n', 1, None):
            with self.subTest(version=version), self.assertRaisesRegex(ConformanceError, 'schemaVersion.*supported major 1'):
                self.reader.read(dict(newer, schemaVersion=version))

    def test_identity_is_family_qualified_and_a_bare_reference_means_battlemech(self):
        mech = dict(self.examples['battlemechs'], id='tomahawk-c')
        fighter = dict(self.examples['aerospace'], id='tomahawk-c')
        self.assertNotEqual(self.reader.read(mech).identity, self.reader.read(fighter, 'aerospace').identity)
        self.reader.read(mech, reference='tomahawk-c')
        self.reader.read(fighter, 'aerospace', 'aerospace:tomahawk-c')
        for family, reference in (('aerospace', 'tomahawk-c'), ('aerospace', 'aerospace:other'), ('aerospace', 'vehicles:tomahawk-c')):
            with self.subTest(reference=reference), self.assertRaisesRegex(ConformanceError, 'reference'):
                self.reader.read(fighter, family, reference)
        with self.assertRaisesRegex(ConformanceError, 'family'):
            self.reader.read(fighter)
        with self.assertRaisesRegex(ConformanceError, 'family'):
            self.reader.read(dict(fighter, family='vehicles'), 'aerospace')

    def test_native_units_keep_nominal_troopers_mp_and_fuel_meanings(self):
        ba = self.reader.read(self.examples['battlearmor'], 'battlearmor')
        self.assertEqual(ba.units['tonnage'], 'nominal-troopers')
        self.assertEqual(self.reader.read(self.examples['battlemechs']).units['tonnage'], 't')
        self.assertEqual(self.reader.read(self.examples['aerospace'], 'aerospace').units['movement'], 'thrust-points')
        self.assertEqual(self.reader.read(self.examples['aerospace'], 'aerospace').units['fuel'], 'points')
        support = dict(self.examples['vehicles'], unitType='Support Vehicle', fuel=1.25)
        self.assertEqual(self.reader.read(support, 'vehicles').units['fuel'], 't')
        squad = self.examples['battlearmor']['squadSize']
        for tonnage in (0, squad + 0.5, squad + 1):
            with self.subTest(tonnage=tonnage), self.assertRaisesRegex(ConformanceError, 'trooper'):
                self.reader.read(dict(self.examples['battlearmor'], tonnage=tonnage), 'battlearmor')
        for value in (-1, 1.5, True):
            with self.subTest(mp=value), self.assertRaises(ConformanceError):
                self.reader.read(dict(self.examples['vehicles'], movement={'cruiseMP': value}), 'vehicles')

    def test_bv_missing_zero_stored_complete_and_defensive_only_stay_distinct(self):
        base = self.examples['capital']
        self.assertIsNone(self.reader.read(base, 'capital').battle_value)
        self.assertEqual(self.reader.read(dict(base, bv=0), 'capital').battle_value, 0)
        complete = self.reader.read(dict(base, bv=1897, final=1896, calculationScope='complete'), 'capital')
        self.assertEqual((complete.stored_bv, complete.calculated_bv, complete.battle_value), (1897, 1896, 1896))
        partial = self.reader.read(dict(base, bv=1897, defensive=12, calculationScope='defensive-only'), 'capital')
        self.assertEqual((partial.stored_bv, partial.calculated_bv, partial.battle_value), (1897, None, None))
        for patch in (
            {'bv': -1},
            {'bv': True},
            {'bv': '100'},
            {'bv': float('nan')},
            {'calculationScope': 'unknown'},
            {'calculationScope': 'complete'},
            {'calculationScope': 'defensive-only', 'final': 0},
            {'calculationScope': 'defensive-only', 'offensive': 0},
        ):
            with self.subTest(patch=patch), self.assertRaises(ConformanceError):
                self.reader.read(dict(base, **patch), 'capital')

    def mini_corpus(self, directory, missing=None):
        corpus, examples = directory / 'units', directory / 'examples'
        corpus.mkdir()
        examples.mkdir()
        for family, document in self.examples.items():
            (examples / f'{family}.json').write_text(json.dumps(document), encoding='utf-8')
            if family != missing:
                (corpus / family).mkdir()
                (corpus / family / 'unit.json').write_text(json.dumps(document), encoding='utf-8')
                (corpus / family / 'index.json').write_text('{"units": []}', encoding='utf-8')
        return corpus, examples

    def test_scan_fails_closed_on_coverage_duplicates_and_unversioned_examples(self):
        with tempfile.TemporaryDirectory() as temp:
            corpus, examples = self.mini_corpus(Path(temp))
            self.assertEqual(scan(self.reader, corpus, examples)['total'], 7)
            unit = corpus / 'vehicles/unit.json'
            (unit.parent / 'copy.json').write_bytes(unit.read_bytes())
            with self.assertRaisesRegex(ConformanceError, 'Duplicate identity'):
                scan(self.reader, corpus, examples)
        with tempfile.TemporaryDirectory() as temp:
            corpus, examples = self.mini_corpus(Path(temp), missing='capital')
            with self.assertRaisesRegex(ConformanceError, 'coverage'):
                scan(self.reader, corpus, examples)
        with tempfile.TemporaryDirectory() as temp:
            corpus, examples = self.mini_corpus(Path(temp))
            legacy = dict(self.examples['vehicles'])
            del legacy['schemaVersion']
            (examples / 'vehicles.json').write_text(json.dumps(legacy), encoding='utf-8')
            with self.assertRaisesRegex(ConformanceError, 'explicitly declare'):
                scan(self.reader, corpus, examples)

    def test_every_committed_catalog_record_and_example_conforms(self):
        report = scan(self.reader, ROOT / 'public/data/units', ROOT / 'docs/data/examples')
        self.assertEqual(set(report['catalogs']), set(FAMILIES))
        self.assertTrue(all(report['catalogs'].values()))
        self.assertEqual(report['examples'], {family: 1 for family in FAMILIES})

    def test_cli_fails_loudly_and_imports_nothing_from_the_app_or_converters(self):
        result = subprocess.run(
            [sys.executable, '-B', str(READER), '--corpus', str(ROOT / 'no-such-corpus')],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 1)
        self.assertTrue(result.stderr.strip())
        tree = ast.parse(READER.read_text(encoding='utf-8'))
        imports = {node.module.split('.')[0] for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
        imports |= {alias.name.split('.')[0] for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names}
        self.assertLessEqual(imports, {'__future__', 'argparse', 'collections', 'dataclasses', 'json', 'math', 'pathlib', 'jsonschema'})


if __name__ == '__main__':
    unittest.main()
