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

function payloadRemovesMountedEquipment(
  payload: ICriticalHitResolvedPayload,
): boolean {
  return (
    payload.destroyed === true ||
    payload.missing === true ||
    payload.breached === true
  );
}

export function applyDamagedPhysicalEquipmentCritical(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState {
  if (
    payload.componentType !== 'equipment' ||
    !payloadRemovesMountedEquipment(payload)
  ) {
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
    if (payload.location === 'left_arm' && unit.leftArmHasTalons === true) {
      return { ...unit, leftArmHasTalons: false };
    }
    if (payload.location === 'right_arm' && unit.rightArmHasTalons === true) {
      return { ...unit, rightArmHasTalons: false };
    }
    if (payload.location === 'left_leg' && unit.leftLegHasTalons === true) {
      return { ...unit, leftLegHasTalons: false };
    }
    if (payload.location === 'right_leg' && unit.rightLegHasTalons === true) {
      return { ...unit, rightLegHasTalons: false };
    }
  }

  return unit;
}

export const applyDestroyedPhysicalEquipmentCritical =
  applyDamagedPhysicalEquipmentCritical;

export function applyDestroyedLocationPhysicalEquipmentState(
  unit: IUnitGameState,
  destroyedLocations: readonly string[],
): IUnitGameState {
  let nextUnit = unit;

  for (const location of destroyedLocations) {
    if (location === 'left_arm') {
      const updates: {
        leftArmHasClaw?: boolean;
        leftArmHasTalons?: boolean;
      } = {};
      if (nextUnit.leftArmHasClaw === true) {
        updates.leftArmHasClaw = false;
      }
      if (nextUnit.leftArmHasTalons === true) {
        updates.leftArmHasTalons = false;
      }
      if (
        updates.leftArmHasClaw !== undefined ||
        updates.leftArmHasTalons !== undefined
      ) {
        nextUnit = { ...nextUnit, ...updates };
      }
      continue;
    }

    if (location === 'right_arm') {
      const updates: {
        rightArmHasClaw?: boolean;
        rightArmHasTalons?: boolean;
      } = {};
      if (nextUnit.rightArmHasClaw === true) {
        updates.rightArmHasClaw = false;
      }
      if (nextUnit.rightArmHasTalons === true) {
        updates.rightArmHasTalons = false;
      }
      if (
        updates.rightArmHasClaw !== undefined ||
        updates.rightArmHasTalons !== undefined
      ) {
        nextUnit = { ...nextUnit, ...updates };
      }
      continue;
    }

    if (location === 'left_leg' && nextUnit.leftLegHasTalons === true) {
      nextUnit = { ...nextUnit, leftLegHasTalons: false };
      continue;
    }
    if (location === 'right_leg' && nextUnit.rightLegHasTalons === true) {
      nextUnit = { ...nextUnit, rightLegHasTalons: false };
    }
  }

  return nextUnit;
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
    nextUnit = applyDamagedPhysicalEquipmentCritical(nextUnit, event.payload);
  }

  return nextUnit;
}
