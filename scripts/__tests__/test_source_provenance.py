"""Actual immutable-inventory producer boundary, including CLI failure atomicity."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CONVERSION = Path(__file__).resolve().parents[1] / 'megameklab-conversion'
sys.path.insert(0, str(CONVERSION))
from source_provenance import build_source_provenance
from source_inventory import InventoryError, build_inventory


class SourceProvenanceProducerTest(unittest.TestCase):
    repository = 'https://example.invalid/fixtures/units'

    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.repo = Path(temp.name)
        self.git('init', '-q')
        self.git('config', 'core.autocrlf', 'false')
        self.files = {
            'data/mekfiles/A/Same.MTF': b'Config:Biped\r\n',
            'data/mekfiles/B/Same.MTF': b'Config:Biped\r\n',
            'data/mekfiles/C/Source.blk': b'<UnitType>Tank</UnitType>\n',
            'data/mekfiles/D/Card.bfs': b'assetType: Emplacement\n',
            'data/mekfiles/info.txt': b'metadata\n',
        }
        for path, content in self.files.items():
            target = self.repo / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        self.commit = self.save()

    def git(self, *args, input=None):
        return subprocess.run(['git', '-C', str(self.repo), *args],
                              check=True, capture_output=True, input=input).stdout

    def save(self):
        self.git('add', '.')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                 'commit', '-qm', 'fixture')
        return self.git('rev-parse', 'HEAD').decode().strip()

    def produce(self, repository=None):
        return build_source_provenance(self.repo, self.commit,
                                       repository=self.repository if repository is None else repository)

    def command(self):
        return [sys.executable, '-B', str(CONVERSION / 'source_provenance.py'),
                '--repo', str(self.repo), '--commit', self.commit,
                '--repository', self.repository]

    def test_all_rows_order_multiplicity_and_original_bytes(self):
        inventory = build_inventory(self.repo, self.commit, repository=self.repository)
        document = self.produce()
        self.assertEqual(document['format'], 'battletech-source-provenance')
        self.assertEqual(document['version'], '1.0.0')
        expected = [row for row in inventory['entries'] if row['kind'] == 'source']
        self.assertEqual(len(document['sources']), inventory['summary']['sourceFiles'])
        for actual, row in zip(document['sources'], expected):
            self.assertEqual(actual, {
                'source': {'kind': 'git', 'repository': self.repository,
                           'commit': self.commit, 'path': row['path'], 'blob': row['blob']},
                'originalFormat': row['format'], 'sha256': row['sha256'],
            })
            self.assertEqual(actual['sha256'], hashlib.sha256(self.files[row['path']]).hexdigest())
        self.assertEqual(document['sources'][0]['sha256'], document['sources'][1]['sha256'])
        self.assertNotEqual(document['sources'][0]['sha256'], hashlib.sha256(b'Config:Biped\n').hexdigest())

    def test_dirty_tree_is_irrelevant_and_cli_is_deterministic(self):
        before = self.produce()
        (self.repo / 'data/mekfiles/A/Same.MTF').write_bytes(b'changed')
        (self.repo / 'data/mekfiles/B/Same.MTF').unlink()
        (self.repo / 'data/mekfiles/untracked.mtf').write_bytes(b'untracked')
        first = subprocess.run(self.command(), check=True, capture_output=True)
        second = subprocess.run(self.command(), check=True, capture_output=True)
        self.assertEqual(first.stdout, second.stdout)
        self.assertEqual(json.loads(first.stdout), before)
        self.assertEqual(first.stderr, b'')

    def test_actual_cli_output_passes_independent_node_zod_consumer(self):
        root = CONVERSION.parents[1]
        output = self.repo / 'provenance.json'
        output.write_bytes(subprocess.run(self.command(), check=True, capture_output=True).stdout)
        inventory = self.repo / 'inventory.json'
        inventory.write_text(json.dumps(build_inventory(self.repo, self.commit,
                                                       repository=self.repository)), encoding='utf-8')
        consumer = root / 'scripts/__tests__/support/source-provenance-consumer.ts'
        result = subprocess.run([os.environ.get('NODE_BINARY', 'node'),
                                 str(root / 'node_modules/tsx/dist/cli.mjs'),
                                 str(consumer), str(output), str(inventory)],
                                check=True, capture_output=True)
        self.assertEqual(json.loads(result.stdout)['acceptedRows'], 4)

    def test_identity_is_required_and_schema_rejects_unrepresentable_values(self):
        with self.assertRaises(TypeError):
            build_source_provenance(self.repo, self.commit)
        for identity in ['', ' https://example.invalid/units', 'ssh://example.invalid/units',
                         'https://example.invalid/units/', 'https://user:secret@example.invalid/units',
                         'https://example.invalid/units?query=1', 'https://example.invalid/units\n']:
            with self.subTest(identity=identity), self.assertRaises(InventoryError):
                self.produce(identity)
        missing = subprocess.run(self.command()[:-2], capture_output=True)
        self.assertNotEqual(missing.returncode, 0)
        self.assertEqual(missing.stdout, b'')

    def test_archives_fail_with_path_and_no_partial_stdout(self):
        (self.repo / 'data/mekfiles/Archive.ZIP').write_bytes(b'unsupported container')
        self.commit = self.save()
        with self.assertRaisesRegex(InventoryError, 'archive.*Archive.ZIP'):
            self.produce()
        result = subprocess.run(self.command(), capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b'')
        self.assertIn(b'Archive.ZIP', result.stderr)

    def test_full_commit_required(self):
        for revision in ['HEAD', self.commit[:8], '0' * 40]:
            with self.subTest(revision=revision), self.assertRaises(InventoryError):
                build_source_provenance(self.repo, revision, repository=self.repository)

    def test_schema_rejects_exact_unrepresentable_path_without_normalization(self):
        blob = self.git('rev-parse', f'{self.commit}:data/mekfiles/A/Same.MTF').decode().strip()
        tree = self.git('mktree', '-z', input=f'100644 blob {blob}\tbad\tname.mtf\0'.encode()).decode().strip()
        for name in ['mekfiles', 'data']:
            tree = self.git('mktree', '-z', input=f'040000 tree {tree}\t{name}\0'.encode()).decode().strip()
        self.commit = self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                               'commit-tree', tree, input=b'fixture\n').decode().strip()
        with self.assertRaisesRegex(InventoryError, 'schema'):
            self.produce()


if __name__ == '__main__':
    unittest.main()
