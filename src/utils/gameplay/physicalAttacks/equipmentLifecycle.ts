import type {
  ICriticalHitResolvedPayload,
  IUnitGameState,
} from '@/types/gameplay';
import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution/types';

function normalizeEquipmentName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isClawEquipment(name: string): boolean {
  const normalized = normalizeEquipmentName(name);
  return (
    normalized === 'claw' ||
    normalized === 'claws' ||
    normalized === 'isclaw' ||
    normalized === 'clclaw'
  );
}

function isTalonEquipment(name: string): boolean {
  return normalizeEquipmentName(name) === 'talons';
}

export function applyDestroyedPhysicalEquipmentCritical(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState {
  if (payload.componentType !== 'equipment' || payload.destroyed !== true) {
    return unit;
  }

  if (isClawEquipment(payload.componentName)) {
    if (payload.location === 'left_arm' && unit.leftArmHasClaw === true) {
      return { ...unit, leftArmHasClaw: false };
    }
    if (payload.location === 'right_arm' && unit.rightArmHasClaw === true) {
      return { ...unit, rightArmHasClaw: false };
    }
    return unit;
  }

  if (isTalonEquipment(payload.componentName)) {
    if (payload.location === 'left_leg' && unit.leftLegHasTalons === true) {
      return { ...unit, leftLegHasTalons: false };
    }
    if (payload.location === 'right_leg' && unit.rightLegHasTalons === true) {
      return { ...unit, rightLegHasTalons: false };
    }
  }

  return unit;
}

export function applyPhysicalEquipmentCriticalEvents(
  unit: IUnitGameState,
  criticalEvents: readonly CriticalHitEvent[] | undefined,
): IUnitGameState {
  if (!criticalEvents || criticalEvents.length === 0) {
    return unit;
  }

  let nextUnit = unit;
  for (const event of criticalEvents) {
    if (event.type !== 'critical_hit_resolved') {
      continue;
    }
    nextUnit = applyDestroyedPhysicalEquipmentCritical(nextUnit, event.payload);
  }

  return nextUnit;
}
