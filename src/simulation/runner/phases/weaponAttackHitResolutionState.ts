import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';
import type { IResolveDamageResult } from '@/utils/gameplay/damage/types';

import { IGameState, type CombatLocation } from '@/types/gameplay';
import { isHeadHit } from '@/utils/gameplay/hitLocation';
import { applyPhysicalEquipmentCriticalEvents } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';
import {
  applyLowProfileGlancingDamage,
  getLowProfileGlancingCriticalHitModifier,
  isLowProfileGlancingBlow,
} from '@/utils/gameplay/quirkModifiers';

import { HEAD_HIT_DAMAGE_CAP } from '../SimulationRunnerConstants';

export function applyHitLocationEdgePoints(
  currentState: IGameState,
  targetId: string,
  edgePointsRemaining: number | undefined,
): IGameState {
  if (edgePointsRemaining === undefined) return currentState;

  const target = currentState.units[targetId];
  return {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...target,
        edgePointsRemaining,
      },
    },
  };
}

export function resolveWeaponHitDamage(options: {
  baseDamage: number;
  isINarcExplosiveAmmo: boolean;
  location: CombatLocation;
  target: IGameState['units'][string] | undefined;
  attackRoll: number;
  toHitNumber: number;
  projectileCount?: number;
}): {
  readonly damage: number;
  readonly lowProfileCriticalHitModifier: number;
} {
  const {
    attackRoll,
    baseDamage,
    isINarcExplosiveAmmo,
    location,
    projectileCount,
    target,
    toHitNumber,
  } = options;
  let damage = isINarcExplosiveAmmo ? 6 : baseDamage;

  if (isHeadHit(location) && damage > HEAD_HIT_DAMAGE_CAP) {
    damage = HEAD_HIT_DAMAGE_CAP;
  }

  const lowProfileGlancingBlow = isLowProfileGlancingBlow(
    target?.unitQuirks,
    attackRoll,
    toHitNumber,
  );
  if (projectileCount === undefined && lowProfileGlancingBlow) {
    damage = applyLowProfileGlancingDamage(damage);
  }

  return {
    damage,
    lowProfileCriticalHitModifier: getLowProfileGlancingCriticalHitModifier(
      target?.unitQuirks,
      attackRoll,
      toHitNumber,
    ),
  };
}

export function persistDamageManifest(options: {
  manifestsByUnit: Map<string, CriticalSlotManifest> | undefined;
  targetId: string;
  manifest: CriticalSlotManifest | undefined;
}): void {
  const { manifest, manifestsByUnit, targetId } = options;
  if (manifestsByUnit && manifest) {
    manifestsByUnit.set(targetId, manifest);
  }
}

export function applyEquipmentCriticalEventsToState(
  currentState: IGameState,
  targetId: string,
  criticalEvents: IResolveDamageResult['criticalEvents'],
): IGameState {
  const targetAfterCriticals = applyPhysicalEquipmentCriticalEvents(
    currentState.units[targetId],
    criticalEvents,
  );
  if (targetAfterCriticals === currentState.units[targetId]) {
    return currentState;
  }

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: targetAfterCriticals,
    },
  };
}
