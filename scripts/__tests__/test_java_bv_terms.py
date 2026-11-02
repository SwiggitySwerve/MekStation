import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from java_bv_terms import reconstruction_errors


class ReconstructionTest(unittest.TestCase):
    def row(self):
        terms = dict(armorBV=60, structureBV=0, defensiveEquipmentBV=0, explosivePenalty=0,
                     typeModifier=1, defensiveFactor=1, weaponBV=40, ammoBV=0, offensiveEquipmentBV=0,
                     weightBV=0, speedFactor=1, offensiveTypeModifier=1, summaryModifier=1, adjustment=0)
        return dict(path='vehicles/a.blk', battleValue=dict(total=100, terms=terms,
                    aggregates=dict(defensiveValue=60, offensiveValue=40, baseBV=100, adjustedBV=100)))

    def test_reconstruct_and_reject_drift_missing_nonfinite_and_rounding(self):
        self.assertEqual(reconstruction_errors([self.row()]), [])
        for key, value in [('armorBV', 59), ('weaponBV', float('nan')), ('summaryModifier', 2), ('adjustment', 1)]:
            row = self.row()
            row['battleValue']['terms'][key] = value
            self.assertTrue(reconstruction_errors([row]), key)
        row = self.row()
        del row['battleValue']['terms']['ammoBV']
        self.assertTrue(reconstruction_errors([row]))
        row = self.row()
        row['battleValue']['termsUnsupported'] = 'deferred'
        self.assertTrue(reconstruction_errors([row]))
        row['path'] = 'battlearmor/a.blk'
        self.assertEqual(reconstruction_errors([row]), [])


if __name__ == '__main__':
    unittest.main()
