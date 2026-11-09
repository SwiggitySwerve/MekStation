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

    def infantry_row(self, terms, total):
        row = self.row()
        row['path'] = 'infantry/a.blk'
        row['construction'].update(weightTerms=terms, weightTotal=total,
                                   weightRemainder=total - sum(terms.values()))
        return row

    def test_unsupported_is_never_accepted_for_any_family(self):
        for path in ('infantry/a.blk', 'vehicles/a.blk'):
            row = self.row()
            row['path'] = path
            row['construction'] = {'weightTermsStatus': {'status': 'unsupported', 'reason': 'native static calculation'},
                                   'reconstruction': {'ok': False, 'status': 'unsupported'}}
            self.assertTrue(construction_errors([row]), path)
            forged = copy.deepcopy(row)
            forged['construction']['reconstruction']['ok'] = True
            self.assertTrue(construction_errors([forged]), path)

    def test_infantry_unmounted_and_mounted_terms_reconstruct(self):
        unmounted = self.infantry_row({'trooper.base': 2.125, 'trooper.antiMekGear': 0.375,
                                       'fieldWeapon.0': 1.5, 'ammo.0': 0.25}, 4.25)
        mounted = self.infantry_row({'mount.weight': 6.0, 'mount.trooperGear': 1.0}, 7.0)
        self.assertEqual(construction_errors([unmounted, mounted]), [])
        drifted = copy.deepcopy(unmounted)
        drifted['construction']['weightTotal'] = 4.5
        self.assertTrue(construction_errors([drifted]))

    def test_infantry_rows_need_exactly_one_base_term(self):
        for terms in ({'ammo.0': 0.25}, {'trooper.base': 1.0, 'mount.weight': 1.0},
                      {'trooper.base': 1.0, 'mount.trooperGear': 0.5}):
            row = self.infantry_row(terms, sum(terms.values()))
            self.assertTrue(construction_errors([row]), terms)

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
        self.assertEqual(len(supported), 24)
        self.assertTrue(all('getWeight' not in c['weightTerms'] for c in supported))
        motorized = next(row['construction'] for row in fixture['rows'] if 'Motorized Platoon TC 3047+ (SRM)' in row['path'])
        self.assertEqual(motorized['weightTerms'], {'trooper.base': 5.8500000000000005, 'trooper.antiMekGear': 0.44999999999999996})
        self.assertEqual(motorized['weightTotal'], 6.300000000000001)
        self.assertTrue(any(c['weightTerms'].get('getFuelTonnage', 0) > 0 for c in supported))
        self.assertTrue(any('trooper.0.rounding' in c['weightTerms'] for c in supported))


if __name__ == '__main__':
    unittest.main()
