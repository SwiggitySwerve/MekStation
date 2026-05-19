/**
 * Tests for the refit classifier.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { RefitClass } from '@/types/campaign/Refit';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import { classifyRefit, diffConfigurations } from '../refitClassifier';

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

describe('classifyRefit', () => {
  it('classifies an identical target as the cheapest class (EquipmentSwap)', () => {
    expect(classifyRefit(BASE, { ...BASE })).toBe(RefitClass.EquipmentSwap);
  });

  it('classifies a cockpit/gyro-only change as EquipmentSwap', () => {
    const target: MechBuildConfig = { ...BASE, gyroType: GyroType.STANDARD };
    expect(classifyRefit(BASE, target)).toBe(RefitClass.EquipmentSwap);
  });

  it('classifies an armour-point change as VariantUpgrade', () => {
    const target: MechBuildConfig = { ...BASE, totalArmorPoints: 200 };
    expect(classifyRefit(BASE, target)).toBe(RefitClass.VariantUpgrade);
  });

  it('classifies a heat-sink loadout change as VariantUpgrade', () => {
    const target: MechBuildConfig = { ...BASE, totalHeatSinks: 14 };
    expect(classifyRefit(BASE, target)).toBe(RefitClass.VariantUpgrade);
  });

  it('classifies a jump-MP change as VariantUpgrade', () => {
    const target: MechBuildConfig = { ...BASE, jumpMP: 5 };
    expect(classifyRefit(BASE, target)).toBe(RefitClass.VariantUpgrade);
  });

  it('classifies an engine change as ChassisConversion', () => {
    const target: MechBuildConfig = { ...BASE, engineRating: 300 };
    expect(classifyRefit(BASE, target)).toBe(RefitClass.ChassisConversion);
  });

  it('classifies an internal-structure change as ChassisConversion', () => {
    const target: MechBuildConfig = {
      ...BASE,
      internalStructureType: InternalStructureType.STANDARD,
      engineRating: 300,
    };
    expect(classifyRefit(BASE, target)).toBe(RefitClass.ChassisConversion);
  });

  it('returns the least-disruptive covering class when changes span tiers', () => {
    // An armour change AND an engine change — the structural change wins.
    const target: MechBuildConfig = {
      ...BASE,
      totalArmorPoints: 200,
      engineRating: 300,
    };
    expect(classifyRefit(BASE, target)).toBe(RefitClass.ChassisConversion);
  });
});

describe('diffConfigurations', () => {
  it('reports an identical pair as identical', () => {
    expect(diffConfigurations(BASE, { ...BASE }).identical).toBe(true);
  });

  it('flags only the changed fields', () => {
    const diff = diffConfigurations(BASE, { ...BASE, totalArmorPoints: 180 });
    expect(diff.armorChanged).toBe(true);
    expect(diff.engineChanged).toBe(false);
    expect(diff.identical).toBe(false);
  });
});
