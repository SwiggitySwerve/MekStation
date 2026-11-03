import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'megameklab-conversion'))
from java_bv_terms import reconstruction_errors, CALCULATORS, write_probes
from tempfile import TemporaryDirectory


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
        self.assertTrue(reconstruction_errors([row]))

    def test_small_families_cannot_claim_unsupported(self):
        for family in ('battlearmor', 'infantry', 'protomeks'):
            row = self.row()
            row['path'] = family + '/a.blk'
            row['battleValue']['termsUnsupported'] = 'deferred'
            self.assertTrue(reconstruction_errors([row]), family)

    def test_small_family_native_probes_are_generated(self):
        with TemporaryDirectory() as directory:
            sources = write_probes(Path(directory))
            self.assertEqual(len(sources), len(CALCULATORS))
            for family in ('ProtoMek', 'Infantry', 'BattleArmor'):
                code = (Path(directory) / f'Trace{family}BVCalculator.java').read_text()
                self.assertIn(f'extends {family}BVCalculator', code)
                self.assertIn('super.processWeapons()', code)

    def test_ba_reconstructs_each_trooper_and_squad_factor(self):
        row = self.row()
        row['path'] = 'battlearmor/a.blk'
        t = row['battleValue']['terms']
        trooper = dict(t, defensiveValue=60, offensiveValue=40, baseBV=100)
        for i in range(1, 5):
            t.update({f'trooper.{i}.{k}': v for k, v in trooper.items()})
        t.update({'squad.strength': 4, 'squad.averageBV': 100, 'squad.factor': 5.2, 'summaryModifier': 5.2})
        row['battleValue'].update(total=520, aggregates=dict(defensiveValue=60, offensiveValue=40, baseBV=520, adjustedBV=520))
        self.assertEqual(reconstruction_errors([row]), [])
        for key in ('trooper.2.armorBV', 'trooper.3.baseBV', 'squad.factor', 'squad.averageBV'):
            original = t[key]
            t[key] += 1
            self.assertTrue(reconstruction_errors([row]), key)
            t[key] = original
        t['trooper.2.armorBV'] += 1
        t['trooper.2.defensiveValue'] += 1
        t['trooper.2.baseBV'] += 1
        t.update({'squad.averageBV': 100.25, 'summaryModifier': 5.213})
        row['battleValue'].update(total=521, aggregates=dict(defensiveValue=60, offensiveValue=40, baseBV=521.3, adjustedBV=521))
        self.assertEqual(reconstruction_errors([row]), [])
        del t['trooper.2.ammoBV']
        self.assertTrue(reconstruction_errors([row]))


if __name__ == '__main__':
    unittest.main()
