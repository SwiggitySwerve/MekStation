import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IUnitGameState } from '@/types/gameplay';

import { STANDARD_STRUCTURE_TABLE } from '@/utils/gameplay/damage/constants';

import { CATALOG_TO_RUNNER_LOC } from './UnitHydrationLocations';

type ArmorAllocationEntry = number | { front?: number; rear?: number };

export function hydrateArmorFromFullUnit(fullUnit: IFullUnit): {
  readonly armor: Record<string, number>;
  readonly totalArmor: number;
  readonly locationCount: number;
} {
  const armorBlock = (
    fullUnit.armor as
      | { allocation?: Record<string, ArmorAllocationEntry> }
      | undefined
  )?.allocation;
  const armor: Record<string, number> = {};
  let total = 0;
  let locationCount = 0;

  if (!armorBlock) {
    return { armor, totalArmor: 0, locationCount: 0 };
  }

  for (const [catalogLoc, value] of Object.entries(armorBlock)) {
    const runnerLoc = CATALOG_TO_RUNNER_LOC[catalogLoc];
    if (!runnerLoc) continue;
    if (typeof value === 'number') {
      armor[runnerLoc] = value;
      total += value;
      locationCount++;
    } else if (value && typeof value === 'object') {
      const front = value.front ?? 0;
      const rear = value.rear ?? 0;
      armor[runnerLoc] = front;
      total += front;
      locationCount++;
      if (rear > 0) {
        armor[`${runnerLoc}_rear`] = rear;
        total += rear;
        locationCount++;
      }
    }
  }
  return { armor, totalArmor: total, locationCount };
}

export function hydrateArmorTypeByLocationFromFullUnit(
  fullUnit: IFullUnit,
  armor: Readonly<Record<string, number>>,
): IUnitGameState['armorTypeByLocation'] | undefined {
  const armorType = (fullUnit.armor as { type?: unknown } | undefined)?.type;
  if (typeof armorType !== 'string' || armorType.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    Object.keys(armor).map((location) => [location, armorType]),
  );
}

export function hydrateStructureFromFullUnit(fullUnit: IFullUnit): {
  readonly structure: Record<string, number>;
  readonly totalStructure: number;
} {
  const tonnage = typeof fullUnit.tonnage === 'number' ? fullUnit.tonnage : 50;
  const bracketed = Math.max(20, Math.min(100, Math.round(tonnage / 5) * 5));
  const row =
    STANDARD_STRUCTURE_TABLE[bracketed] ?? STANDARD_STRUCTURE_TABLE[50];

  const structure: Record<string, number> = {
    head: row.head,
    center_torso: row.centerTorso,
    left_torso: row.sideTorso,
    right_torso: row.sideTorso,
    left_arm: row.arm,
    right_arm: row.arm,
    left_leg: row.leg,
    right_leg: row.leg,
  };

  const totalStructure =
    row.head + row.centerTorso + row.sideTorso * 2 + row.arm * 2 + row.leg * 2;

  return { structure, totalStructure };
}
