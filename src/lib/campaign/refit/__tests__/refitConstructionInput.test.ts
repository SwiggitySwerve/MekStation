import { writeFileSync } from 'node:fs';

import type { UnitState } from '@/stores/unitState';

import { extractMechBuildConfigFromUnitState } from '@/lib/campaign/customizer/campaignCustomizerSession';
import {
  armorResultToAllocation,
  createDefaultUnitState,
} from '@/stores/unitState';
import { CockpitType } from '@/types/construction/CockpitType';
import { GyroType } from '@/types/construction/GyroType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums';
import { calculateOptimalArmorAllocation } from '@/utils/construction/armorCalculations';
import { validateConstruction } from '@/utils/construction/constructionRules/validation';

import { advanceRefitOrder, createRefitOrder } from '../refitPipeline';

// MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
// verifier/Structure.java:64-109 (Tripod and superheavy),
// verifier/TestMek.java:118-139 and units/Mek.java:1052-1060 (donor sections).
const cases: [string, Partial<UnitState>, number, number, boolean][] = [
  ['biped', {}, 5, 50, true],
  ['Tripod', { configuration: MechConfiguration.TRIPOD }, 5.5, 50.5, false],
  [
    'FrankenMek',
    {
      heatSinkCount: 21,
      frankenStructure: {
        type: 'STANDARD',
        typeByLocation: {
          HEAD: 'ENDO_STEEL',
          CENTER_TORSO: 'ENDO_STEEL',
          LEFT_TORSO: 'ENDO_STEEL_CLAN',
          RIGHT_TORSO: 'ENDO_STEEL_CLAN',
        },
      },
    },
    3.5,
    49.5,
    true,
  ],
  [
    'superheavy',
    {
      tonnage: 150,
      gyroType: GyroType.SUPERHEAVY,
      cockpitType: CockpitType.SUPER_HEAVY,
    },
    30,
    79,
    true,
  ],
  [
    'LAM',
    { configuration: MechConfiguration.LAM, lamType: 'Bimodal' },
    5,
    50,
    true,
  ],
  ['Mixed', { techBaseMode: TechBaseMode.MIXED }, 5, 50, true],
];

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.REFIT_CONSTRUCTION_RECEIPT) {
    writeFileSync(
      process.env.REFIT_CONSTRUCTION_RECEIPT,
      JSON.stringify(receipts, null, 2),
    );
  }
});

describe('campaign editor → refit construction gate', () => {
  test.each(cases)(
    '%s preserves pinned structure mass through order admission',
    (_name, patch, structureWeight, totalWeight, advanced) => {
      const state = {
        ...createDefaultUnitState({
          name: 'Refit',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        }),
        engineRating: 300,
        heatSinkCount: 20,
        armorAllocation: armorResultToAllocation(
          calculateOptimalArmorAllocation(160, 50),
        ),
        ...patch,
      };
      const target = extractMechBuildConfigFromUnitState(state);
      const validation = validateConstruction(target);
      const result = advanceRefitOrder(
        createRefitOrder({
          id: 'refit-input',
          unitId: state.id,
          currentConfiguration: target,
          targetConfiguration: target,
          createdAt: '3025-01-01T00:00:00.000Z',
        }),
      );
      receipts.push({ name: _name, target, validation, admission: result });
      expect(validation.steps.find((step) => step.step === 2)?.weight).toBe(
        structureWeight,
      );
      expect(validation.totalWeight).toBe(totalWeight);
      expect(result.advanced).toBe(advanced);
      expect(result.order.targetConfiguration).toEqual(target);
      expect(result.order.status).toBe(advanced ? 'in-progress' : 'proposed');
      expect(result.errors).toEqual(
        advanced ? [] : ['Total weight (50.5t) exceeds tonnage (50t)'],
      );
    },
  );
});
