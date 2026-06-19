import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IHexGrid,
} from '@/types/gameplay';
import { coordToKey, hexEquals } from '@/utils/gameplay/hexMath';
import { roll2d6, type D6Roller } from '@/utils/gameplay/hitLocation';
import { hasSPA } from '@/utils/gameplay/spaModifiers';

import {
  applyEmpMinefieldEffectToBattleMech,
  applyInfernoMinefieldExternalHeatToBattleMech,
  applyMineDamageToBattleMech,
  isBattleMechLikeUnitType,
} from './movementMineDamage';
import {
  applyRepresentedMinefieldPostDetonation,
  minefieldAt,
  minefieldDetonationTarget,
  type RepresentedMinefieldEntry,
} from './movementMinefieldState';
import { applyRepresentedVibrabombMovementEffects } from './movementVibrabombMines';

type MineBearingMovementStep = {
  readonly kind: string;
  readonly index: number;
  readonly from?: IHexCoordinate;
  readonly to?: IHexCoordinate;
  readonly terrainEntered?: string;
};

const DEFAULT_REPRESENTED_MINE_DETONATION_TARGET = 9;
const EAGLE_EYES_MINE_DETONATION_TARGET_MODIFIER = 2;
const DEFAULT_D6_ROLLER: D6Roller = () => 6;

export function applyMovementMinefieldEffects(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  grid: IHexGrid;
  unitId: string;
  steps: readonly MineBearingMovementStep[];
  d6Roller?: D6Roller;
}): IGameState {
  const {
    d6Roller = DEFAULT_D6_ROLLER,
    events,
    gameId,
    grid,
    steps,
    unitId,
  } = options;
  let currentState = options.currentState;

  const unit = currentState.units[unitId];
  if (!unit || !isBattleMechLikeUnitType(unit.unitType)) {
    return currentState;
  }

  const triggeredMineCoords = new Set<string>();
  const triggeredVibrabombCoords = new Set<string>();
  for (const step of steps) {
    if (!isMineEntryStep(step)) {
      continue;
    }

    currentState = applyRepresentedVibrabombMovementEffects({
      currentState,
      events,
      gameId,
      unitId,
      to: step.to,
      phase: GamePhase.Movement,
      d6Roller,
      triggeredVibrabombCoords,
    });

    const minefield = minefieldForStep(currentState, grid, step);
    if (!minefield) {
      continue;
    }

    const coordKey = coordToKey(step.to);
    if (triggeredMineCoords.has(coordKey)) {
      continue;
    }
    triggeredMineCoords.add(coordKey);

    currentState = applyRepresentedMinefieldEntryDamage({
      currentState,
      events,
      gameId,
      grid,
      unitId,
      to: step.to,
      isGroundEntry: isGroundMinefieldEntryStep(step),
      terrainEntered: step.terrainEntered,
      phase: GamePhase.Movement,
      d6Roller,
    });
  }

  return currentState;
}

export function applyRepresentedMinefieldEntryDamage(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  grid: IHexGrid;
  unitId: string;
  to: IHexCoordinate;
  isGroundEntry?: boolean;
  terrainEntered?: string;
  phase?: GamePhase;
  d6Roller?: D6Roller;
}): IGameState {
  const {
    currentState,
    d6Roller = DEFAULT_D6_ROLLER,
    events,
    gameId,
    isGroundEntry = true,
    grid,
    phase = GamePhase.Movement,
    terrainEntered,
    to,
    unitId,
  } = options;
  const unit = currentState.units[unitId];
  if (!unit || !isBattleMechLikeUnitType(unit.unitType)) {
    return currentState;
  }

  const minefield = minefieldAt(currentState, grid, to, {
    isGroundEntry,
    terrainEntered,
  });
  if (!minefield) {
    return currentState;
  }
  if (minefield.effect === 'active-ground-suppressed') {
    return currentState;
  }
  if (
    !representedMinefieldDetonates(
      unit.abilities ?? [],
      d6Roller,
      minefield.detonationTarget,
    )
  ) {
    return currentState;
  }

  let nextState = currentState;
  if (minefield.effect === 'inferno-external-heat') {
    nextState = applyInfernoMinefieldExternalHeatToBattleMech({
      currentState,
      unitId,
      externalHeat: minefield.externalHeat ?? 0,
    });
  } else if (minefield.effect === 'emp-effect') {
    nextState = applyEmpMinefieldEffectToBattleMech({
      currentState,
      events,
      gameId,
      unitId,
      hex: to,
      phase,
      d6Roller,
    });
  } else {
    nextState = applyMineDamageToBattleMech({
      currentState,
      events,
      gameId,
      unitId,
      damagePerLeg: minefield.damagePerLeg ?? 0,
      phase,
    });
  }

  if (minefield.stateCoord && minefield.stateMinefield) {
    nextState = applyRepresentedMinefieldPostDetonation({
      currentState: nextState,
      events,
      gameId,
      phase,
      unitId,
      coord: minefield.stateCoord,
      minefield: minefield.stateMinefield,
      d6Roller,
    });
  }

  return nextState;
}

function isMineEntryStep(
  step: MineBearingMovementStep,
): step is MineBearingMovementStep & { readonly to: IHexCoordinate } {
  return (
    (step.kind === 'forward' ||
      step.kind === 'lateral' ||
      step.kind === 'jump') &&
    step.to !== undefined &&
    (step.from === undefined || !hexEquals(step.from, step.to))
  );
}

function isGroundMinefieldEntryStep(step: MineBearingMovementStep): boolean {
  return step.kind !== 'jump';
}

function minefieldForStep(
  state: IGameState,
  grid: IHexGrid,
  step: MineBearingMovementStep & { readonly to: IHexCoordinate },
): RepresentedMinefieldEntry | undefined {
  return minefieldAt(state, grid, step.to, {
    isGroundEntry: isGroundMinefieldEntryStep(step),
    terrainEntered: step.terrainEntered,
  });
}

function representedMinefieldDetonates(
  abilities: readonly string[],
  d6Roller: D6Roller,
  baseTarget = DEFAULT_REPRESENTED_MINE_DETONATION_TARGET,
): boolean {
  const target =
    baseTarget +
    (hasSPA(abilities, 'eagle_eyes')
      ? EAGLE_EYES_MINE_DETONATION_TARGET_MODIFIER
      : 0);
  return roll2d6(d6Roller).total >= target;
}
