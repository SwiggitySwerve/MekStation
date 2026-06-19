import { getShutdownTN } from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  type IComponentDamageState,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  buildDefaultCriticalSlotManifest,
  type CriticalHitEvent,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { resolvePilotWakeUpCheck } from '@/utils/gameplay/damage';

import type { IWeapon } from '../../ai/types';
import type { IHeatEmissionContext } from './postCombatHeatAccounting';

import { applyHeatInducedAmmoExplosions } from './heatAmmoExplosions';
import { applyRunnerMaxTechHeatCriticalDamage } from './heatCriticalDamage';
import { applyRunnerHeatPilotDamage } from './heatPilotDamage';
import { queueRunnerShutdownPSR } from './heatShutdownPsr';
import { applyRunnerStartupAttempt } from './heatStartup';
import { createGameEvent } from './utils';
import { applyCriticalPSRTriggers } from './weaponAttackPsrTriggers';

export type CriticalSlotManifestsByUnit = Map<string, CriticalSlotManifest>;

function getOrSeedCriticalSlotManifest(
  id: string,
  manifestsByUnit: CriticalSlotManifestsByUnit | undefined,
): CriticalSlotManifest {
  if (!manifestsByUnit) {
    return buildDefaultCriticalSlotManifest();
  }

  const existing = manifestsByUnit.get(id);
  if (existing) {
    return existing;
  }

  const seeded = buildDefaultCriticalSlotManifest();
  manifestsByUnit.set(id, seeded);
  return seeded;
}

export function wakePilotIfConsciousnessReturns(options: {
  readonly unit: IUnitGameState;
  readonly emission: IHeatEmissionContext | undefined;
}): IUnitGameState {
  const { emission, unit } = options;
  if (!emission || unit.pilotConscious || unit.destroyed) {
    return unit;
  }

  const wakeUpCheck = resolvePilotWakeUpCheck(
    unit.pilotWounds,
    unit.pilotConscious,
    unit.abilities ?? [],
    emission.d6Roller,
    unit.pilotToughness,
  );
  if (!wakeUpCheck.conscious) {
    return unit;
  }

  return {
    ...unit,
    pilotConscious: true,
  };
}

export function applyHeatStartup(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly turn: number;
  readonly hotDogTargetNumberModifier: number;
  readonly emission: IHeatEmissionContext | undefined;
}): IUnitGameState {
  const { emission, heat, hotDogTargetNumberModifier, turn, unit, unitId } =
    options;

  return applyRunnerStartupAttempt({
    unit,
    unitId,
    heat,
    turn,
    events: emission?.events,
    gameId: emission?.gameId,
    d6Roller: emission?.d6Roller,
    hotDogTargetNumberModifier,
  });
}

export function applyHeatShutdownCheck(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly turn: number;
  readonly hotDogTargetNumberModifier: number;
  readonly emission: IHeatEmissionContext | undefined;
}): { readonly unit: IUnitGameState; readonly shutdown: boolean } {
  const { emission, heat, hotDogTargetNumberModifier, turn, unit, unitId } =
    options;
  let shutdown = unit.shutdown ?? false;
  const shutdownTargetNumber = getShutdownTN(heat, hotDogTargetNumberModifier);

  if (!emission || (shutdownTargetNumber <= 0 && heat < 30)) {
    return { unit, shutdown };
  }

  const automatic = heat >= 30;
  let roll = 0;
  let shutdownOccurred = automatic;
  if (!automatic) {
    roll = emission.d6Roller() + emission.d6Roller();
    shutdownOccurred = roll < shutdownTargetNumber;
  }

  emission.events.push(
    createGameEvent(
      emission.gameId,
      emission.events.length,
      GameEventType.ShutdownCheck,
      turn,
      GamePhase.Heat,
      {
        unitId,
        heatLevel: heat,
        targetNumber: automatic ? Infinity : shutdownTargetNumber,
        roll,
        shutdownOccurred,
        automatic,
      },
      unitId,
    ),
  );

  if (!shutdownOccurred) {
    return { unit, shutdown };
  }

  shutdown = true;
  return {
    unit: queueRunnerShutdownPSR({
      unit,
      unitId,
      turn,
      events: emission.events,
      gameId: emission.gameId,
    }),
    shutdown,
  };
}

export function applyHeatAmmoExplosions(options: {
  readonly currentState: IGameState;
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly emission: IHeatEmissionContext | undefined;
  readonly weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  readonly targetNumberModifier: number;
}): { readonly state: IGameState; readonly unit: IUnitGameState } {
  const {
    currentState,
    emission,
    heat,
    targetNumberModifier,
    unit,
    unitId,
    weaponsByUnit,
  } = options;
  if (!emission) {
    return { state: currentState, unit };
  }

  const state = applyHeatInducedAmmoExplosions({
    currentState,
    unit,
    unitId,
    heat,
    events: emission.events,
    gameId: emission.gameId,
    d6Roller: emission.d6Roller,
    unitWeapons: weaponsByUnit?.get(unitId),
    targetNumberModifier,
  });
  return { state, unit: state.units[unitId] };
}

export function applyHeatPilotDamage(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly turn: number;
  readonly componentDamage: IComponentDamageState;
  readonly hotDogTargetNumberModifier: number;
  readonly maxTechHeatScale?: boolean;
  readonly emission: IHeatEmissionContext | undefined;
}): IUnitGameState {
  const {
    componentDamage,
    emission,
    heat,
    hotDogTargetNumberModifier,
    maxTechHeatScale,
    turn,
    unit,
    unitId,
  } = options;

  return applyRunnerHeatPilotDamage({
    unit,
    unitId,
    heat,
    lifeSupportHits: componentDamage.lifeSupport ?? 0,
    turn,
    events: emission?.events,
    gameId: emission?.gameId,
    d6Roller: emission?.d6Roller,
    hotDogTargetNumberModifier,
    maxTechHeatScale,
  });
}

export function applyHeatCriticalDamage(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly turn: number;
  readonly componentDamage: IComponentDamageState;
  readonly hotDogTargetNumberModifier: number;
  readonly maxTechHeatScale?: boolean;
  readonly manifestsByUnit?: CriticalSlotManifestsByUnit;
  readonly emission: IHeatEmissionContext | undefined;
}): {
  readonly unit: IUnitGameState;
  readonly criticalEvents?: readonly CriticalHitEvent[];
} {
  const {
    componentDamage,
    emission,
    heat,
    hotDogTargetNumberModifier,
    manifestsByUnit,
    maxTechHeatScale,
    turn,
    unit,
    unitId,
  } = options;
  if (!maxTechHeatScale || !emission) {
    return { unit };
  }

  const heatCriticalResult = applyRunnerMaxTechHeatCriticalDamage({
    unit,
    unitId,
    heat,
    turn,
    manifest: getOrSeedCriticalSlotManifest(unitId, manifestsByUnit),
    componentDamage: unit.componentDamage ?? componentDamage,
    d6Roller: emission.d6Roller,
    locationIndexRoller: () => emission.random.nextInt(8),
    events: emission.events,
    gameId: emission.gameId,
    hotDogTargetNumberModifier,
    maxTechHeatScale,
  });
  manifestsByUnit?.set(unitId, heatCriticalResult.manifest);
  return {
    unit: heatCriticalResult.unit,
    criticalEvents: heatCriticalResult.criticalEvents,
  };
}

export function commitHeatPhaseUnit(options: {
  readonly state: IGameState;
  readonly unitId: string;
  readonly unit: IUnitGameState;
  readonly heat: number;
  readonly shutdown: boolean;
  readonly criticalEvents?: readonly CriticalHitEvent[];
}): IGameState {
  const { criticalEvents, heat, shutdown, state, unit, unitId } = options;
  const nextState = {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        heat,
        shutdown,
      },
    },
  };

  return applyCriticalPSRTriggers(nextState, criticalEvents);
}
