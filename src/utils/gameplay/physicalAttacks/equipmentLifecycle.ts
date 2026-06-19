import type {
  ICriticalHitResolvedPayload,
  IUnitGameState,
} from '@/types/gameplay';
import type {
  CriticalHitEvent,
  CriticalSlotManifest,
  ICriticalSlotEntry,
} from '@/utils/gameplay/criticalHitResolution/types';

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

function isPartialWingEquipment(name: string): boolean {
  const normalized = normalizeEquipmentName(name);
  return (
    normalized === 'partialwing' ||
    normalized === 'ispartialwing' ||
    normalized === 'clpartialwing' ||
    normalized === 'clanpartialwing'
  );
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

type PhysicalEquipmentFlag =
  | 'leftArmHasClaw'
  | 'rightArmHasClaw'
  | 'leftArmHasTalons'
  | 'rightArmHasTalons'
  | 'leftLegHasTalons'
  | 'rightLegHasTalons';

const CLAW_FLAG_BY_LOCATION: Readonly<Record<string, PhysicalEquipmentFlag>> = {
  left_arm: 'leftArmHasClaw',
  right_arm: 'rightArmHasClaw',
};

const TALON_FLAG_BY_LOCATION: Readonly<Record<string, PhysicalEquipmentFlag>> =
  {
    left_arm: 'leftArmHasTalons',
    right_arm: 'rightArmHasTalons',
    left_leg: 'leftLegHasTalons',
    right_leg: 'rightLegHasTalons',
  };

function physicalEquipmentFlagForPayload(
  payload: ICriticalHitResolvedPayload,
): PhysicalEquipmentFlag | undefined {
  if (isClawEquipment(payload.componentName)) {
    return CLAW_FLAG_BY_LOCATION[payload.location];
  }

  if (isTalonEquipment(payload.componentName)) {
    return TALON_FLAG_BY_LOCATION[payload.location];
  }

  return undefined;
}

function clearPhysicalEquipmentFlag(
  unit: IUnitGameState,
  flag: PhysicalEquipmentFlag,
): IUnitGameState {
  return unit[flag] === true ? { ...unit, [flag]: false } : unit;
}

function decrementPartialWingJumpBonus(unit: IUnitGameState): IUnitGameState {
  if (
    typeof unit.partialWingJumpBonus !== 'number' ||
    !Number.isFinite(unit.partialWingJumpBonus)
  ) {
    return unit;
  }

  const partialWingJumpBonus = Math.max(
    0,
    Math.floor(unit.partialWingJumpBonus) - 1,
  );
  return partialWingJumpBonus === unit.partialWingJumpBonus
    ? unit
    : { ...unit, partialWingJumpBonus };
}

function sourceMountRemovesMountedEquipment(slot: ICriticalSlotEntry): boolean {
  return slot.missing === true || slot.breached === true;
}

function unitHasRepresentedPhysicalEquipment(
  unit: IUnitGameState,
  location: string,
  componentName: string,
): boolean {
  if (isClawEquipment(componentName)) {
    return (
      (location === 'left_arm' && unit.leftArmHasClaw === true) ||
      (location === 'right_arm' && unit.rightArmHasClaw === true)
    );
  }

  if (isTalonEquipment(componentName)) {
    return (
      (location === 'left_arm' && unit.leftArmHasTalons === true) ||
      (location === 'right_arm' && unit.rightArmHasTalons === true) ||
      (location === 'left_leg' && unit.leftLegHasTalons === true) ||
      (location === 'right_leg' && unit.rightLegHasTalons === true)
    );
  }

  return false;
}

function lifecycleEffectForSourceMount(slot: ICriticalSlotEntry): string {
  const state = slot.missing === true ? 'missing' : 'breached';
  return `Equipment ${state}: ${slot.componentName}`;
}

export function physicalEquipmentLifecycleEventsFromManifest(options: {
  unit: IUnitGameState;
  manifest: CriticalSlotManifest | undefined;
}): readonly CriticalHitEvent[] {
  const { manifest, unit } = options;
  if (!manifest) return [];

  const events: CriticalHitEvent[] = [];
  for (const [location, slots] of Object.entries(manifest)) {
    for (const slot of slots) {
      if (
        slot.componentType !== 'equipment' ||
        !sourceMountRemovesMountedEquipment(slot) ||
        !unitHasRepresentedPhysicalEquipment(unit, location, slot.componentName)
      ) {
        continue;
      }

      events.push({
        type: 'critical_hit_resolved',
        payload: {
          unitId: unit.id,
          location,
          slotIndex: slot.slotIndex,
          componentType: slot.componentType,
          componentName: slot.componentName,
          ...(slot.ammoBinId !== undefined
            ? { ammoBinId: slot.ammoBinId }
            : {}),
          effect: lifecycleEffectForSourceMount(slot),
          destroyed: false,
          ...(slot.missing === true ? { missing: true } : {}),
          ...(slot.breached === true ? { breached: true } : {}),
        },
      });
    }
  }

  return events;
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

  const flag = physicalEquipmentFlagForPayload(payload);
  if (flag) {
    return clearPhysicalEquipmentFlag(unit, flag);
  }

  if (isPartialWingEquipment(payload.componentName)) {
    return decrementPartialWingJumpBonus(unit);
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
