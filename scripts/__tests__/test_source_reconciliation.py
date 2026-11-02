"""Exact source/load accounting; collisions never remove source rows."""
import copy
import io
import json
from pathlib import Path
import subprocess
import sys
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
import source_inventory as inventory
import test_source_inventory


class ReconciliationTest(unittest.TestCase):
    def setUp(self):
        self.entries = [{'path': 'data/mekfiles/meks/A.mtf', 'sha256': 'a' * 64,
                         'kind': 'source', 'format': 'mtf'}]
        self.loads = [{'path': 'meks/A.mtf', 'sha256': 'a' * 64, 'status': 'loaded',
                       'entityClass': 'megamek.BipedMek', 'chassis': 'Atlas', 'model': ''}]

    def run_report(self, exclusions=()):
        return inventory.reconcile_inventory({'entries': self.entries}, self.loads, exclusions)

    def test_match_retains_configuration_identity_and_counts(self):
        report = self.run_report()
        self.assertEqual(report['rows'][0]['designIdentity'], ['megamek.BipedMek', 'Atlas', ''])
        self.assertEqual(report['byFamily']['meks']['loaded'], 1)
        self.assertEqual(report['byClass']['megamek.BipedMek']['uniqueDesigns'], 1)
        self.assertEqual(report['totals']['archiveMembers'], 0)
        self.loads[0]['stageFailure'] = {'stage': 'construction', 'message': 'later failure'}
        row = self.run_report()['rows'][0]
        self.assertEqual(row['status'], 'loaded')
        self.assertEqual(row['stageFailure'], self.loads[0]['stageFailure'])

    def test_missing_extra_and_mismatched_rows_fail_closed(self):
        saved = copy.deepcopy(self.loads)
        for change, message in [('missing', 'Missing load'), ('extra', 'Extra load'), ('hash', 'Hash mismatch')]:
            with self.subTest(change=change):
                self.loads = copy.deepcopy(saved)
                if change == 'missing':
                    self.loads.clear()
                elif change == 'extra':
                    self.loads.append(dict(self.loads[0], path='meks/B.mtf'))
                else:
                    self.loads[0]['sha256'] = 'b' * 64
                with self.assertRaisesRegex(ValueError, message):
                    self.run_report()
                self.loads = saved

    def test_excluded_folder_and_bfs_pending_are_named(self):
        self.entries += [dict(self.entries[0], path='data/mekfiles/ge/A.blk', format='blk'),
                         dict(self.entries[0], path='data/mekfiles/vehicles/A.bfs', format='bfs')]
        report = self.run_report([
            {'prefix': 'ge/', 'reason': 'Owner exclusion', 'status': 'excluded',
             'entityClass': 'GunEmplacement'},
            {'path': 'vehicles/A.bfs', 'reason': 'Owner scope unresolved', 'status': 'pending'}])
        self.assertEqual(report['totals']['excluded'], 1)
        self.assertEqual(report['totals']['pending'], 1)
        self.assertEqual(report['byFamily']['battlefield-support-pending']['pending'], 1)

    def test_duplicate_designs_collapse_only_exact_loaded_keys(self):
        self.entries.append(dict(self.entries[0], path='data/mekfiles/meks/B.mtf'))
        self.loads.append(dict(self.loads[0], path='data/mekfiles/meks/B.mtf'))
        report = self.run_report()
        self.assertEqual(report['totals']['loaded'], 2)
        self.assertEqual(report['totals']['uniqueDesigns'], 1)
        self.assertEqual(len(report['duplicateDesigns'][0]['sourceRows']), 2)
        self.loads[1]['model'] = 'Prime'
        self.assertEqual(self.run_report()['totals']['uniqueDesigns'], 2)

    def test_failed_load_requires_and_retains_reason(self):
        self.loads[0] = dict(self.loads[0], status='failed', failure={'message': 'bad source'})
        report = self.run_report()
        self.assertEqual(report['totals']['failed'], 1)
        self.assertEqual(report['totals']['uniqueDesigns'], 0)
        self.assertEqual(report['rows'][0]['reason'], {'message': 'bad source'})
        del self.loads[0]['failure']
        with self.assertRaisesRegex(ValueError, 'reason'):
            self.run_report()

    def test_bad_rows_and_exclusions_cannot_hide_coverage(self):
        for row in [dict(self.loads[0], status='unknown'), dict(self.loads[0], chassis=None),
                    dict(self.loads[0], sha256=None), dict(self.loads[0], path='../meks/A.mtf')]:
            with self.subTest(row=row), self.assertRaises(ValueError):
                inventory.reconcile_inventory({'entries': self.entries}, [row], [])
        self.loads *= 2
        with self.assertRaisesRegex(ValueError, 'Duplicate load'):
            self.run_report()
        self.loads.pop()
        with self.assertRaisesRegex(ValueError, 'Unused exclusion'):
            self.run_report([{'prefix': 'typo/', 'reason': 'mistake', 'status': 'excluded'}])
        with self.assertRaisesRegex(ValueError, 'Hash mismatch'):
            self.loads[0]['sha256'] = 'b' * 64
            self.run_report([{'prefix': 'meks/', 'reason': 'scope', 'status': 'excluded'}])

    def test_exemption_for_extra_row_is_explicit_and_keeps_its_origin(self):
        self.loads.append(dict(self.loads[0], path='other/B.mtf'))
        report = self.run_report([{'path': 'other/B.mtf', 'status': 'excluded', 'reason': 'Recorded extra'}])
        self.assertEqual(report['totals']['excluded'], 1)
        self.assertFalse(report['rows'][1]['inventoryPresent'])


class ArchiveReconciliationTest(test_source_inventory.SourceInventoryTest):
    def test_cli_reconciliation_is_deterministic_and_failure_has_no_output(self):
        loads = self.repo / 'loads.jsonl'
        rows = [dict(path=e['path'], sha256=e['sha256'], status='loaded',
                     entityClass='Fixture', chassis=e['path'], model='')
                for e in self.inventory()['entries'] if e['kind'] == 'source']
        loads.write_text('\n'.join(json.dumps(r) for r in rows), encoding='utf-8')
        # The original fixture's archive is intentionally unreadable.
        command = [sys.executable, '-B', inventory.__file__,
                   '--repo', str(self.repo), '--repository', self.REPOSITORY,
                   '--commit', self.commit, '--loads', str(loads)]
        failure = subprocess.run(command, capture_output=True)
        self.assertNotEqual(failure.returncode, 0)
        self.assertEqual(failure.stdout, b'')
        self.assertIn(b'Cannot expand archive', failure.stderr)
        self.git('rm', 'data/mekfiles/archive.zip')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'No archive')
        command[command.index('--commit') + 1] = self.git('rev-parse', 'HEAD').decode().strip()
        first = subprocess.run(command, check=True, capture_output=True)
        self.assertEqual(first.stdout, subprocess.run(command, check=True, capture_output=True).stdout)
        self.assertEqual(json.loads(first.stdout)['entityLoading'], 'reconciled-java-loads')
        loads.write_text('', encoding='utf-8')
        failure = subprocess.run(command, capture_output=True)
        self.assertNotEqual(failure.returncode, 0)
        self.assertEqual(failure.stdout, b'')

    def test_archive_members_are_hashed_and_joined(self):
        content = io.BytesIO()
        with zipfile.ZipFile(content, 'w') as archive:
            archive.writestr('A.mtf', b'Config:Biped\n')
        archive_path = self.repo / 'data/mekfiles/archive.zip'
        archive_path.write_bytes(content.getvalue())
        self.git('rm', *[p for p in self.files if p.endswith(('.MTF', '.blk', '.bfs'))])
        self.git('add', '.')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Archive')
        pin = self.git('rev-parse', 'HEAD').decode().strip()
        report = inventory.build_inventory(self.repo, pin, repository=self.REPOSITORY, archive_members=True)
        member = next(e for e in report['entries'] if '!/' in e['path'])
        self.assertEqual(member['sha256'], inventory.hashlib.sha256(b'Config:Biped\n').hexdigest())
        self.assertEqual(report['summary']['archiveMembers'], 1)
        loads = [dict(path=e['path'], sha256=e['sha256'], status='loaded',
                      entityClass='Fixture', chassis=e['path'], model='')
                 for e in report['entries'] if e['kind'] == 'source']
        self.assertEqual(inventory.reconcile_inventory(report, loads)['totals']['archiveMembers'], 1)


if __name__ == '__main__':
    unittest.main()
