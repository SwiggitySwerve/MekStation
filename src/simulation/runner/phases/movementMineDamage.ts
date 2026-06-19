import {
  applyDamageResultToState,
  buildDamageState,
} from '@/simulation/runner/SimulationRunnerState';
import {
  CombatLocation,
  GameEventType,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type GamePhase,
} from '@/types/gameplay';
import { resolveDamage } from '@/utils/gameplay/damage';
import { roll2d6, type D6Roller } from '@/utils/gameplay/hitLocation';
import { determinePhysicalHitLocation } from '@/utils/gameplay/physicalAttacks';

import {
  emitMovementDamageChainEvents,
  queueMineDamageThresholdPSR,
  queueMineLegDamagePSR,
} from './movementMineDamageEvents';
import { appendUnitDestroyedEvent, createGameEvent } from './utils';

const EMP_BATTLEMECH_NO_EFFECT_MAX = 6;
const EMP_BATTLEMECH_INTERFERENCE_MAX = 8;
const MINE_DAMAGE_LOCATIONS = [
  'left_leg',
  'right_leg',
] satisfies readonly CombatLocation[];

export function applyVibrabombDamageToBattleMech(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  damage: number;
  phase: GamePhase;
  d6Roller: D6Roller;
}): IGameState {
  const { damage, d6Roller, events, gameId, phase, unitId } = options;
  let currentState = options.currentState;
  let remainingDamage = Math.trunc(damage);

  while (remainingDamage > 0) {
    const unitBeforeDamage = currentState.units[unitId];
    if (!unitBeforeDamage || unitBeforeDamage.destroyed) {
      break;
    }

    const clusterDamage = Math.min(5, remainingDamage);
    remainingDamage -= clusterDamage;

    const hitLocation = determinePhysicalHitLocation('kick', d6Roller);
    const damageState = buildDamageState(unitBeforeDamage);
    const damageResult = resolveDamage(
      damageState,
      hitLocation,
      clusterDamage,
      undefined,
      { rollCriticalHits: false },
    );

    currentState = applyDamageResultToState(
      currentState,
      unitId,
      damageResult.state,
      damageResult.result,
    );
    emitMovementDamageChainEvents({
      events,
      gameId,
      phase,
      turn: currentState.turn,
      unitId,
      damageResult,
      previouslyDestroyed: damageState.destroyedLocations,
    });

    currentState = queueMineLegDamagePSR({
      currentState,
      events,
      gameId,
      phase,
      unitId,
      damageResult,
    });

    const unitAfterDamage = currentState.units[unitId];
    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [unitId]: {
          ...unitAfterDamage,
          damageThisPhase:
            (unitAfterDamage.damageThisPhase ?? 0) + clusterDamage,
        },
      },
    };
  }

  currentState = queueMineDamageThresholdPSR({
    currentState,
    events,
    gameId,
    phase,
    unitId,
  });

  const unitAfterMines = currentState.units[unitId];
  if (unitAfterMines.destroyed) {
    appendUnitDestroyedEvent({
      events,
      gameId,
      turn: currentState.turn,
      phase,
      unitId,
      cause: unitAfterMines.destructionCause ?? 'damage',
      actorId: unitId,
    });
  }

  return currentState;
}

export function applyMineDamageToBattleMech(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  damagePerLeg: number;
  phase: GamePhase;
}): IGameState {
  const { damagePerLeg, events, gameId, phase, unitId } = options;
  let currentState = options.currentState;

  if (damagePerLeg <= 0 || !Number.isFinite(damagePerLeg)) {
    return currentState;
  }

  for (const location of MINE_DAMAGE_LOCATIONS) {
    const unitBeforeDamage = currentState.units[unitId];
    if (!unitBeforeDamage || unitBeforeDamage.destroyed) {
      break;
    }

    const damageState = buildDamageState(unitBeforeDamage);
    const damageResult = resolveDamage(
      damageState,
      location,
      damagePerLeg,
      undefined,
      { rollCriticalHits: false },
    );

    currentState = applyDamageResultToState(
      currentState,
      unitId,
      damageResult.state,
      damageResult.result,
    );
    emitMovementDamageChainEvents({
      events,
      gameId,
      phase,
      turn: currentState.turn,
      unitId,
      damageResult,
      previouslyDestroyed: damageState.destroyedLocations,
    });

    currentState = queueMineLegDamagePSR({
      currentState,
      events,
      gameId,
      phase,
      unitId,
      damageResult,
    });

    const unitAfterDamage = currentState.units[unitId];
    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [unitId]: {
          ...unitAfterDamage,
          damageThisPhase:
            (unitAfterDamage.damageThisPhase ?? 0) + damagePerLeg,
        },
      },
    };
  }

  currentState = queueMineDamageThresholdPSR({
    currentState,
    events,
    gameId,
    phase,
    unitId,
  });

  const unitAfterMines = currentState.units[unitId];
  if (unitAfterMines.destroyed) {
    appendUnitDestroyedEvent({
      events,
      gameId,
      turn: currentState.turn,
      phase,
      unitId,
      cause: unitAfterMines.destructionCause ?? 'damage',
      actorId: unitId,
    });
  }

  return currentState;
}

export function applyInfernoMinefieldExternalHeatToBattleMech(options: {
  currentState: IGameState;
  unitId: string;
  externalHeat: number;
}): IGameState {
  const { externalHeat, unitId } = options;
  const unit = options.currentState.units[unitId];
  if (
    !unit ||
    unit.destroyed ||
    externalHeat <= 0 ||
    !Number.isFinite(externalHeat)
  ) {
    return options.currentState;
  }

  return {
    ...options.currentState,
    units: {
      ...options.currentState.units,
      [unitId]: {
        ...unit,
        pendingExternalHeat:
          Math.max(0, unit.pendingExternalHeat ?? 0) + externalHeat,
        infernoBurning: true,
      },
    },
  };
}

export function applyEmpMinefieldEffectToBattleMech(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  hex: IHexCoordinate;
  phase: GamePhase;
  d6Roller: D6Roller;
}): IGameState {
  const { currentState, d6Roller, events, gameId, hex, phase, unitId } =
    options;
  const unit = currentState.units[unitId];
  if (!unit || unit.destroyed) {
    return currentState;
  }

  const roll = roll2d6(d6Roller).total;
  const modifier = unit.hasDroneOS ? 2 : 0;
  const modifiedRoll = roll + modifier;
  const effect =
    modifiedRoll <= EMP_BATTLEMECH_NO_EFFECT_MAX
      ? 'none'
      : modifiedRoll <= EMP_BATTLEMECH_INTERFERENCE_MAX
        ? 'interference'
        : 'shutdown';
  const durationTurns = effect === 'none' ? undefined : d6Roller();

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.EmpMinefieldEffectApplied,
      currentState.turn,
      phase,
      {
        unitId,
        hex,
        roll,
        modifier,
        modifiedRoll,
        effect,
        ...(durationTurns !== undefined ? { durationTurns } : {}),
        source: 'minefield',
      },
      unitId,
    ),
  );

  if (effect === 'none') {
    return currentState;
  }

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [unitId]: {
        ...unit,
        ...(effect === 'interference'
          ? { empInterferenceTurns: durationTurns }
          : {}),
        ...(effect === 'shutdown'
          ? { shutdown: true, empShutdownTurns: durationTurns }
          : {}),
      },
    },
  };
}

export function isBattleMechLikeUnitType(
  unitType: string | undefined,
): boolean {
  if (unitType === undefined) return true;
  const canonical = unitType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    canonical === 'battlemech' ||
    canonical === 'omnimech' ||
    canonical === 'industrialmech'
  );
}
