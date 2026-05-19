/**
 * Tests for the refit estimator.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import { estimateRefit } from '../refitEstimator';

const BASE: MechBuildConfig = {
  tonnage: 50,
  engineRating: 250,
  engineType: EngineType.STANDARD,
  gyroType: GyroType.STANDARD,
  internalStructureType: InternalStructureType.STANDARD,
  armorType: ArmorTypeEnum.STANDARD,
  totalArmorPoints: 160,
  cockpitType: CockpitType.STANDARD,
  heatSinkType: HeatSinkType.SINGLE,
  totalHeatSinks: 10,
  jumpMP: 0,
};

describe('estimateRefit', () => {
  it('estimates an equipment swap lower than a chassis conversion in both cost and hours', () => {
    const swap = estimateRefit(BASE, { ...BASE, gyroType: GyroType.STANDARD });
    const conversion = estimateRefit(BASE, { ...BASE, engineRating: 320 });

    expect(conversion.estimatedCost).toBeGreaterThan(swap.estimatedCost);
    expect(conversion.estimatedHours).toBeGreaterThan(swap.estimatedHours);
  });

  it('estimates a variant upgrade between equipment swap and chassis conversion', () => {
    const swap = estimateRefit(BASE, { ...BASE });
    const variant = estimateRefit(BASE, { ...BASE, totalArmorPoints: 200 });
    const conversion = estimateRefit(BASE, { ...BASE, engineRating: 320 });

    expect(variant.estimatedCost).toBeGreaterThan(swap.estimatedCost);
    expect(variant.estimatedCost).toBeLessThan(conversion.estimatedCost);
  });

  it('is deterministic for the same diff', () => {
    const target: MechBuildConfig = { ...BASE, totalArmorPoints: 190 };
    const a = estimateRefit(BASE, target);
    const b = estimateRefit(BASE, target);
    expect(a).toEqual(b);
  });

  it('produces positive cost and hours even for an identical target', () => {
    const estimate = estimateRefit(BASE, { ...BASE });
    expect(estimate.estimatedCost).toBeGreaterThan(0);
    expect(estimate.estimatedHours).toBeGreaterThan(0);
    expect(estimate.changedFieldCount).toBe(0);
  });

  it('scales the estimate with the number of changed fields', () => {
    const oneField = estimateRefit(BASE, { ...BASE, totalArmorPoints: 200 });
    const twoFields = estimateRefit(BASE, {
      ...BASE,
      totalArmorPoints: 200,
      totalHeatSinks: 14,
    });
    expect(twoFields.changedFieldCount).toBe(2);
    expect(twoFields.estimatedHours).toBeGreaterThan(oneField.estimatedHours);
  });
});
