import type { CockpitType } from '../src/utils/construction/battleValueCalculations';
import type { UnitData } from './validate-bv-types';

import { EngineType } from '../src/types/construction/EngineType';
import {
  calcTotalArmor,
  calcTotalStructure,
  mapCockpitType,
  mapEngineType,
  mapGyroType,
  mapStructureType,
} from './validate-bv-unit-derived';

export interface UnitBvCalculatorSetup {
  engineType: EngineType;
  structureType: string;
  gyroType: string;
  cockpitType: CockpitType;
  cockpitUpper: string;
  unitIsSuperheavy: boolean;
  engineBVOverride: number | undefined;
  totalArmor: number;
  totalStructure: number;
  effectiveConfig: string | undefined;
}

export function deriveUnitBvCalculatorSetup(
  unit: UnitData,
): UnitBvCalculatorSetup {
  const engineType = mapEngineType(unit.engine.type, unit.techBase);
  const structureType = mapStructureType(unit.structure.type);
  const gyroType = mapGyroType(unit.gyro.type);
  const cockpitType = mapCockpitType(unit.cockpit || 'STANDARD');
  const unitIsSuperheavy = unit.tonnage > 100;
  const engineBVOverride = deriveEngineBVOverride(
    unit,
    engineType,
    unitIsSuperheavy,
  );
  const totalArmor = deriveTotalArmorForBv(unit, cockpitType);
  const cockpitUpper = (
    typeof unit.cockpit === 'string' ? unit.cockpit : ''
  ).toUpperCase();
  const effectiveConfig = deriveEffectiveConfiguration(unit, cockpitUpper);
  const totalStructure = calcTotalStructure(unit.tonnage, effectiveConfig);

  return {
    engineType,
    structureType,
    gyroType,
    cockpitType,
    cockpitUpper,
    unitIsSuperheavy,
    engineBVOverride,
    totalArmor,
    totalStructure,
    effectiveConfig,
  };
}

export function deriveDefensiveMovementInputs(
  runMP: number,
  jumpMP: number,
  umuMP: number,
): { correctMaxTMM: number; defRunMP: number } {
  const tmmToMinMP = [0, 3, 5, 7, 10, 18, 25];
  const runTMM = tmmFromMP(runMP);
  const effectiveJump = Math.max(jumpMP, umuMP);
  const jumpTMM = effectiveJump > 0 ? tmmFromMP(effectiveJump) + 1 : 0;
  const correctMaxTMM = Math.max(runTMM, jumpTMM);

  return {
    correctMaxTMM,
    defRunMP: correctMaxTMM <= 6 ? tmmToMinMP[correctMaxTMM] : 25,
  };
}

function deriveEngineBVOverride(
  unit: UnitData,
  engineType: EngineType,
  unitIsSuperheavy: boolean,
): number | undefined {
  let engineBVOverride: number | undefined;

  if (unitIsSuperheavy) {
    switch (engineType) {
      case EngineType.XL_IS:
        return 0.75;
      case EngineType.XXL:
        if (unit.techBase === 'CLAN') return 0.75;
        if (unit.techBase !== 'MIXED') return 0.5;
        break;
      case EngineType.LIGHT:
      case EngineType.XL_CLAN:
        return 1.0;
    }
  }

  if (
    engineType === EngineType.XXL &&
    unit.techBase === 'CLAN' &&
    !unitIsSuperheavy
  ) {
    return 0.5;
  }

  if (
    engineType === EngineType.XXL &&
    unit.techBase === 'MIXED' &&
    unit.criticalSlots
  ) {
    const stLocs = ['LEFT_TORSO', 'LT', 'RIGHT_TORSO', 'RT'];
    let maxSTEngineSlots = 0;
    for (const loc of stLocs) {
      const slots = unit.criticalSlots[loc];
      if (!Array.isArray(slots)) continue;
      const engSlots = slots.filter(
        (s): s is string =>
          typeof s === 'string' && s.toLowerCase().includes('engine'),
      ).length;
      maxSTEngineSlots = Math.max(maxSTEngineSlots, engSlots);
    }
    if (maxSTEngineSlots > 0 && maxSTEngineSlots <= 4) {
      engineBVOverride = maxSTEngineSlots <= 2 ? 0.75 : 0.5;
    }
  }

  return engineBVOverride;
}

function deriveTotalArmorForBv(
  unit: UnitData,
  cockpitType: CockpitType,
): number {
  let totalArmor = calcTotalArmor(unit.armor.allocation);
  if (cockpitType !== 'torso-mounted') return totalArmor;

  const ctAlloc =
    unit.armor?.allocation?.CENTER_TORSO ?? unit.armor?.allocation?.CT;
  if (typeof ctAlloc === 'number') return totalArmor + ctAlloc;
  if (!ctAlloc) return totalArmor;
  totalArmor += (ctAlloc.front ?? 0) + (ctAlloc.rear ?? 0);
  return totalArmor;
}

function deriveEffectiveConfiguration(
  unit: UnitData,
  cockpitUpper: string,
): string | undefined {
  const armorLocKeys = Object.keys(unit.armor?.allocation || {}).map(
    (k: string) => k.toUpperCase(),
  );
  const hasQuadArmorLocs = armorLocKeys.some((k: string) =>
    [
      'FLL',
      'FRL',
      'RLL',
      'RRL',
      'FRONT_LEFT_LEG',
      'FRONT_RIGHT_LEG',
      'REAR_LEFT_LEG',
      'REAR_RIGHT_LEG',
    ].includes(k),
  );
  const isTripodCockpit =
    cockpitUpper.includes('TRIPOD') || cockpitUpper === 'SUPERHEAVY_TRIPOD';

  return hasQuadArmorLocs && unit.configuration?.toLowerCase() !== 'quad'
    ? 'Quad'
    : isTripodCockpit && unit.configuration?.toLowerCase() !== 'tripod'
      ? 'Tripod'
      : unit.configuration;
}

function tmmFromMP(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}
