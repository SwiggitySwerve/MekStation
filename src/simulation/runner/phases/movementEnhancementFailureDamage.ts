import {
  type GamePhase,
  type IComponentDamageState,
  type IGameEvent,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  applyCriticalHitEffect,
  buildDefaultCriticalSlotManifest,
  selectCriticalSlot,
  type CriticalHitEvent,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { roll2d6, type D6Roller } from '@/utils/gameplay/hitLocation';
import { applyPhysicalEquipmentCriticalEvents } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import { emitMovementEnhancementFailureCriticalEvents } from './movementEnhancementFailureEvents';

const MASC_FAILURE_LEG_CRITICAL_LOCATIONS = ['left_leg', 'right_leg'] as const;
const SUPERCHARGER_ENGINE_CRITICAL_LOCATION = 'center_torso';
const SUPERCHARGER_DESTROYED_LABEL = 'Supercharger';

export interface IMASCFailureCriticalDamageResult {
  readonly unit: IUnitGameState;
  readonly manifest: CriticalSlotManifest;
  readonly criticalEvents: readonly CriticalHitEvent[];
}

export interface ISuperchargerFailureCriticalDamageResult {
  readonly unit: IUnitGameState;
  readonly manifest: CriticalSlotManifest;
  readonly criticalEvents: readonly CriticalHitEvent[];
  readonly engineCriticalRoll: number;
  readonly engineHits: number;
}

function markCriticalSlotDestroyed(
  manifest: CriticalSlotManifest,
  location: string,
  slotIndex: number,
): CriticalSlotManifest {
  const slots = manifest[location] ?? [];
  return {
    ...manifest,
    [location]: slots.map((slot) =>
      slot.slotIndex === slotIndex ? { ...slot, destroyed: true } : slot,
    ),
  };
}

function isSuperchargerSlotName(componentName: string): boolean {
  return componentName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .includes('supercharger');
}

function findSuperchargerSlot(manifest: CriticalSlotManifest):
  | {
      readonly location: string;
      readonly slotIndex: number;
    }
  | undefined {
  for (const [location, slots] of Object.entries(manifest)) {
    const slot = slots.find(
      (entry) =>
        !entry.destroyed &&
        entry.componentType === 'equipment' &&
        isSuperchargerSlotName(entry.componentName),
    );
    if (slot) {
      return { location, slotIndex: slot.slotIndex };
    }
  }
  return undefined;
}

function selectEngineCriticalSlots(
  manifest: CriticalSlotManifest,
  engineHits: number,
): readonly { readonly location: string; readonly slotIndex: number }[] {
  if (engineHits <= 0) return [];
  const slots = manifest[SUPERCHARGER_ENGINE_CRITICAL_LOCATION] ?? [];
  return slots
    .filter((slot) => !slot.destroyed && slot.componentType === 'engine')
    .slice(0, engineHits)
    .map((slot) => ({
      location: SUPERCHARGER_ENGINE_CRITICAL_LOCATION,
      slotIndex: slot.slotIndex,
    }));
}

function criticalSlotAt(
  manifest: CriticalSlotManifest,
  location: string,
  slotIndex: number,
) {
  return manifest[location]?.find((slot) => slot.slotIndex === slotIndex);
}

function applyManifestCriticalSlot(options: {
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly unitId: string;
  readonly location: string;
  readonly slotIndex: number;
}): {
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly events: readonly CriticalHitEvent[];
} {
  const { componentDamage, location, manifest, slotIndex, unitId } = options;
  const slot = criticalSlotAt(manifest, location, slotIndex);
  if (!slot || slot.destroyed) {
    return { manifest, componentDamage, events: [] };
  }

  const updatedManifest = markCriticalSlotDestroyed(
    manifest,
    location,
    slotIndex,
  );
  const applied = applyCriticalHitEffect(
    slot,
    unitId,
    location,
    componentDamage,
  );
  return {
    manifest: updatedManifest,
    componentDamage: applied.updatedComponentDamage,
    events: applied.events,
  };
}

function superchargerEngineHitsFromRoll(roll: number): number {
  if (roll <= 7) return 0;
  if (roll <= 9) return 1;
  if (roll <= 11) return 2;
  return 3;
}

function appendDestroyedEquipment(
  unit: IUnitGameState,
  equipmentName: string,
): readonly string[] {
  return unit.destroyedEquipment.includes(equipmentName)
    ? unit.destroyedEquipment
    : [...unit.destroyedEquipment, equipmentName];
}

function destroyedByCriticalEvents(
  criticalEvents: readonly CriticalHitEvent[],
): boolean {
  return criticalEvents.some((event) => event.type === 'unit_destroyed');
}

export function applyMASCFailureCriticalDamage(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly manifest?: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly slotRoller: D6Roller;
  readonly events?: IGameEvent[];
  readonly gameId?: string;
  readonly turn?: number;
  readonly phase?: GamePhase;
}): IMASCFailureCriticalDamageResult {
  const {
    componentDamage,
    events,
    gameId,
    phase,
    slotRoller,
    turn,
    unit,
    unitId,
  } = options;
  let currentManifest = options.manifest ?? buildDefaultCriticalSlotManifest();
  let currentDamage = componentDamage;
  const criticalEvents: CriticalHitEvent[] = [];

  for (const location of MASC_FAILURE_LEG_CRITICAL_LOCATIONS) {
    const slot = selectCriticalSlot(currentManifest, location, slotRoller);
    if (!slot) continue;

    currentManifest = markCriticalSlotDestroyed(
      currentManifest,
      location,
      slot.slotIndex,
    );
    const applied = applyCriticalHitEffect(
      slot,
      unitId,
      location,
      currentDamage,
    );
    currentDamage = applied.updatedComponentDamage;
    criticalEvents.push(...applied.events);
  }

  if (
    criticalEvents.length > 0 &&
    events !== undefined &&
    gameId !== undefined &&
    turn !== undefined &&
    phase !== undefined
  ) {
    emitMovementEnhancementFailureCriticalEvents({
      events,
      gameId,
      turn,
      phase,
      unitId,
      criticalEvents,
      pilotingSkill: unit.piloting,
    });
  }

  const unitAfterPhysicalEquipmentCriticals =
    applyPhysicalEquipmentCriticalEvents(unit, criticalEvents);

  return {
    unit: {
      ...unitAfterPhysicalEquipmentCriticals,
      componentDamage: currentDamage,
    },
    manifest: currentManifest,
    criticalEvents,
  };
}

export function applySuperchargerFailureCriticalDamage(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly manifest?: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly d6Roller: D6Roller;
  readonly events?: IGameEvent[];
  readonly gameId?: string;
  readonly turn?: number;
  readonly phase?: GamePhase;
}): ISuperchargerFailureCriticalDamageResult {
  const {
    componentDamage,
    d6Roller,
    events,
    gameId,
    phase,
    turn,
    unit,
    unitId,
  } = options;
  let currentManifest = options.manifest ?? buildDefaultCriticalSlotManifest();
  let currentDamage = componentDamage;
  const criticalEvents: CriticalHitEvent[] = [];

  const superchargerSlot = findSuperchargerSlot(currentManifest);
  if (superchargerSlot) {
    const applied = applyManifestCriticalSlot({
      manifest: currentManifest,
      componentDamage: currentDamage,
      unitId,
      location: superchargerSlot.location,
      slotIndex: superchargerSlot.slotIndex,
    });
    currentManifest = applied.manifest;
    currentDamage = applied.componentDamage;
    criticalEvents.push(...applied.events);
  }

  const engineCriticalRoll = roll2d6(d6Roller).total;
  const engineHits = superchargerEngineHitsFromRoll(engineCriticalRoll);
  for (const engineSlot of selectEngineCriticalSlots(
    currentManifest,
    engineHits,
  )) {
    const applied = applyManifestCriticalSlot({
      manifest: currentManifest,
      componentDamage: currentDamage,
      unitId,
      location: engineSlot.location,
      slotIndex: engineSlot.slotIndex,
    });
    currentManifest = applied.manifest;
    currentDamage = applied.componentDamage;
    criticalEvents.push(...applied.events);
  }

  if (
    criticalEvents.length > 0 &&
    events !== undefined &&
    gameId !== undefined &&
    turn !== undefined &&
    phase !== undefined
  ) {
    emitMovementEnhancementFailureCriticalEvents({
      events,
      gameId,
      turn,
      phase,
      unitId,
      criticalEvents,
      pilotingSkill: unit.piloting,
    });
  }

  const unitAfterPhysicalEquipmentCriticals =
    applyPhysicalEquipmentCriticalEvents(unit, criticalEvents);

  return {
    unit: {
      ...unitAfterPhysicalEquipmentCriticals,
      hasSupercharger: false,
      activeSupercharger: false,
      destroyedEquipment: appendDestroyedEquipment(
        unit,
        SUPERCHARGER_DESTROYED_LABEL,
      ),
      componentDamage: currentDamage,
      destroyed: destroyedByCriticalEvents(criticalEvents)
        ? true
        : unit.destroyed,
      destructionCause: destroyedByCriticalEvents(criticalEvents)
        ? 'engine_destroyed'
        : unit.destructionCause,
    },
    manifest: currentManifest,
    criticalEvents,
    engineCriticalRoll,
    engineHits,
  };
}
