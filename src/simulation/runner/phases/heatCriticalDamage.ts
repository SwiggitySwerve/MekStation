import type {
  CriticalHitEvent,
  CriticalSlotManifest,
  IComponentDamageState,
} from '@/utils/gameplay/criticalHitResolution/types';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  resolveMaxTechHeatCriticalDamage,
  type IMaxTechHeatCriticalDamageResult,
} from '@/utils/gameplay/heatCriticalDamage';
import { applyPhysicalEquipmentCriticalEvents } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import { createGameEvent } from './utils';

type UnitDestroyedCause =
  | 'damage'
  | 'ammo_explosion'
  | 'pilot_death'
  | 'engine_destroyed'
  | 'impossible_displacement'
  | 'ct_destroyed'
  | 'head_destroyed';

export interface IRunnerMaxTechHeatCriticalDamageResult {
  readonly unit: IUnitGameState;
  readonly manifest: CriticalSlotManifest;
  readonly resolution?: IMaxTechHeatCriticalDamageResult;
  readonly criticalEvents?: readonly CriticalHitEvent[];
}

function mapCriticalDestructionCause(cause: string): UnitDestroyedCause {
  return cause === 'damage'
    ? 'engine_destroyed'
    : (cause as UnitDestroyedCause);
}

function applyCriticalEventsToRunnerUnit(
  unit: IUnitGameState,
  criticalEvents: readonly CriticalHitEvent[],
): IUnitGameState {
  let nextUnit = unit;

  for (const event of criticalEvents) {
    if (event.type === 'pilot_hit') {
      const payload = event.payload;
      const pilotKilled = payload.totalWounds >= 6;
      nextUnit = {
        ...nextUnit,
        pilotWounds: payload.totalWounds,
        pilotConscious:
          pilotKilled || payload.consciousnessCheckPassed === false
            ? false
            : nextUnit.pilotConscious,
        destroyed: pilotKilled ? true : nextUnit.destroyed,
      };
      continue;
    }

    if (event.type === 'unit_destroyed') {
      nextUnit = { ...nextUnit, destroyed: true };
    }
  }

  return applyPhysicalEquipmentCriticalEvents(nextUnit, criticalEvents);
}

function emitRunnerHeatCriticalEvents(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly unitId: string;
  readonly criticalEvents: readonly CriticalHitEvent[];
  readonly pilotingSkill?: number;
}): void {
  const { criticalEvents, events, gameId, pilotingSkill, turn, unitId } =
    options;

  for (const event of criticalEvents) {
    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHit,
          turn,
          GamePhase.Heat,
          {
            unitId,
            location: payload.location,
            component: payload.componentType,
            count: 1,
          },
          unitId,
        ),
      );
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHitResolved,
          turn,
          GamePhase.Heat,
          {
            unitId,
            location: payload.location,
            slotIndex: payload.slotIndex,
            componentType: payload.componentType,
            componentName: payload.componentName,
            effect: payload.effect,
            destroyed: payload.destroyed,
          },
          unitId,
        ),
      );

      if (payload.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.ComponentDestroyed,
            turn,
            GamePhase.Heat,
            {
              unitId,
              location: payload.location,
              componentType: payload.componentType,
              slotIndex: payload.slotIndex,
              componentName: payload.componentName,
            },
            unitId,
          ),
        );
      }
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRTriggered,
          turn,
          GamePhase.Heat,
          {
            unitId,
            reason: payload.reason,
            additionalModifier: payload.additionalModifier,
            triggerSource: payload.triggerSource,
            ...(pilotingSkill !== undefined
              ? { basePilotingSkill: pilotingSkill }
              : {}),
            ...(payload.reasonCode !== undefined
              ? { reasonCode: payload.reasonCode }
              : {}),
          },
          unitId,
        ),
      );
      continue;
    }

    if (event.type === 'pilot_hit') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PilotHit,
          turn,
          GamePhase.Heat,
          {
            unitId,
            wounds: payload.wounds,
            totalWounds: payload.totalWounds,
            source: payload.source,
            consciousnessCheckRequired: payload.consciousnessCheckRequired,
            consciousnessCheckPassed: payload.consciousnessCheckPassed,
          },
          unitId,
        ),
      );
      continue;
    }

    if (event.type === 'unit_destroyed') {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitDestroyed,
          turn,
          GamePhase.Heat,
          {
            unitId,
            cause: mapCriticalDestructionCause(event.payload.cause),
          },
          unitId,
        ),
      );
    }
  }
}

export function applyRunnerMaxTechHeatCriticalDamage(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly turn: number;
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly d6Roller?: D6Roller;
  readonly locationIndexRoller?: () => number;
  readonly events?: IGameEvent[];
  readonly gameId?: string;
  readonly hotDogTargetNumberModifier?: number;
  readonly maxTechHeatScale?: boolean;
}): IRunnerMaxTechHeatCriticalDamageResult {
  const {
    componentDamage,
    d6Roller,
    events,
    gameId,
    heat,
    hotDogTargetNumberModifier = 0,
    locationIndexRoller,
    manifest,
    maxTechHeatScale = false,
    turn,
    unit,
    unitId,
  } = options;

  if (
    !maxTechHeatScale ||
    d6Roller === undefined ||
    locationIndexRoller === undefined
  ) {
    return { unit, manifest };
  }

  const resolution = resolveMaxTechHeatCriticalDamage({
    unitId,
    heat,
    manifest,
    componentDamage,
    d6Roller,
    locationIndexRoller,
    targetNumberModifier: hotDogTargetNumberModifier,
  });

  if (!resolution.applied) {
    return {
      unit,
      manifest: resolution.updatedManifest,
      resolution,
      criticalEvents: resolution.events,
    };
  }

  let updatedUnit: IUnitGameState = {
    ...unit,
    componentDamage: resolution.updatedComponentDamage,
    destroyed: resolution.unitDestroyed ? true : unit.destroyed,
  };
  updatedUnit = applyCriticalEventsToRunnerUnit(updatedUnit, resolution.events);

  if (events !== undefined && gameId !== undefined) {
    emitRunnerHeatCriticalEvents({
      events,
      gameId,
      turn,
      unitId,
      criticalEvents: resolution.events,
      pilotingSkill: unit.piloting,
    });
  }

  return {
    unit: updatedUnit,
    manifest: resolution.updatedManifest,
    resolution,
    criticalEvents: resolution.events,
  };
}
