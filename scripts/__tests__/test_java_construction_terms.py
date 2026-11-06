"""Construction reference validation; native Java captures are proved in the queued corpus run."""
import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from java_construction_terms import construction_errors


class ConstructionTermsTest(unittest.TestCase):
    def row(self):
        return {'path': 'vehicles/a.blk', 'status': 'loaded', 'construction': {
            'weightTerms': {'getWeightEngine': 2, 'getWeightArmor': 3, 'getWeightAmmo': 0},
            'weightTotal': 5, 'weightRemainder': 0,
            'reconstruction': {'ok': True, 'absoluteTolerance': 1e-9, 'relativeTolerance': 1e-12}}}

    def test_zero_is_supported_but_missing_or_failed_is_not(self):
        self.assertEqual(construction_errors([self.row()]), [])
        for field in ('weightTerms', 'weightTotal', 'weightRemainder', 'reconstruction'):
            row = self.row()
            del row['construction'][field]
            self.assertTrue(construction_errors([row]), field)
        row = self.row()
        row['construction']['weightTerms'] = {}
        self.assertTrue(construction_errors([row]))

    def test_rejects_nonfinite_drift_forged_remainder_and_false_reconstruction(self):
        for field, value in (('weightTotal', float('nan')), ('weightTotal', 6),
                             ('weightRemainder', 1), ('weightRemainder', float('inf'))):
            row = self.row()
            row['construction'][field] = value
            self.assertTrue(construction_errors([row]), field)
        for value in (float('nan'), float('inf'), True, '0'):
            row = self.row()
            row['construction']['weightTerms']['getWeightAmmo'] = value
            self.assertTrue(construction_errors([row]), value)
        row = self.row()
        row['construction']['reconstruction']['ok'] = False
        self.assertTrue(construction_errors([row]))
        row = self.row()
        row['construction']['reconstruction']['absoluteTolerance'] = 1
        self.assertTrue(construction_errors([row]))

    def test_unsupported_is_retained_separately_never_a_reconstruction_pass(self):
        row = self.row()
        row['path'] = 'infantry/a.blk'
        row['construction'] = {'weightTermsStatus': {'status': 'unsupported', 'reason': 'native static calculation'},
                               'reconstruction': {'ok': False, 'status': 'unsupported'}}
        self.assertEqual(construction_errors([row]), [])
        forged = copy.deepcopy(row)
        forged['construction']['reconstruction']['ok'] = True
        self.assertTrue(construction_errors([forged]))
        row['path'] = 'vehicles/a.blk'
        self.assertTrue(construction_errors([row]))
        row['path'] = 'infantry/a.blk'
        row['construction']['weightTermsStatus']['reason'] = ''
        self.assertTrue(construction_errors([row]))

    def test_failure_stages_remain_visible(self):
        row = self.row()
        row['stageFailure'] = {'stage': 'construction'}
        self.assertTrue(construction_errors([row]))
        row = self.row()
        row['status'] = 'failed'
        self.assertTrue(construction_errors([row]))
        row = self.row()
        row['construction']['verifierQuantities'] = {'weightExact': {'status': 'failed', 'reason': 'native getter failed', 'unit': 't'}}
        self.assertTrue(construction_errors([row]))

    def test_pinned_native_captures_reconstruct_without_summing_legacy_subtotals(self):
        fixture = json.loads((Path(__file__).parent / 'fixtures/java_reference_construction.json').read_text())
        self.assertEqual(len(fixture['rows']), 24)
        self.assertEqual(construction_errors(fixture['rows']), [])
        supported = [row['construction'] for row in fixture['rows'] if 'weightTerms' in row['construction']]
        self.assertEqual(len(supported), 21)
        self.assertTrue(all('getWeight' not in c['weightTerms'] for c in supported))
        self.assertTrue(any(c['weightTerms'].get('getFuelTonnage', 0) > 0 for c in supported))
        self.assertTrue(any('trooper.0.rounding' in c['weightTerms'] for c in supported))


if __name__ == '__main__':
    unittest.main()
