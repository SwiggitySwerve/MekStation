import {
  applyDamageResultToState,
  buildDamageState,
} from '@/simulation/runner/SimulationRunnerState';
import {
  CombatLocation,
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IHexGrid,
  type IPendingPSR,
  type IRepresentedMinefieldState,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import {
  resolveDamage,
  type IResolveDamageResult,
} from '@/utils/gameplay/damage';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import {
  coordToKey,
  hexDistance,
  hexEquals,
  keyToCoord,
} from '@/utils/gameplay/hexMath';
import { roll2d6, type D6Roller } from '@/utils/gameplay/hitLocation';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import { determinePhysicalHitLocation } from '@/utils/gameplay/physicalAttacks';
import {
  createDamagePSR,
  createLegDamagePSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import { hasSPA } from '@/utils/gameplay/spaModifiers';

import { createGameEvent } from './utils';

type MineBearingMovementStep = {
  readonly kind: string;
  readonly index: number;
  readonly from?: IHexCoordinate;
  readonly to?: IHexCoordinate;
  readonly terrainEntered?: string;
};

type RepresentedMinefieldEntry = {
  readonly effect:
    | 'active-ground-suppressed'
    | 'conventional-damage'
    | 'emp-effect'
    | 'inferno-external-heat';
  readonly damagePerLeg?: number;
  readonly externalHeat?: number;
  readonly detonationTarget: number;
  readonly stateCoord?: IHexCoordinate;
  readonly stateMinefield?: IRepresentedMinefieldState;
};

const DEFAULT_REPRESENTED_MINE_DAMAGE_PER_LEG = 10;
const DEFAULT_REPRESENTED_MINE_DETONATION_TARGET = 9;
const EAGLE_EYES_MINE_DETONATION_TARGET_MODIFIER = 2;
const EMP_BATTLEMECH_NO_EFFECT_MAX = 6;
const EMP_BATTLEMECH_INTERFERENCE_MAX = 8;
const MINEFIELD_DENSITY_REDUCTION_STEP = 5;
const MINIMUM_REPRESENTED_MINEFIELD_DENSITY = 5;
const MINEFIELD_DENSITY_DEPLETED = 0;
const MINE_DAMAGE_LOCATIONS = [
  'left_leg',
  'right_leg',
] satisfies readonly CombatLocation[];
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

function applyRepresentedMinefieldPostDetonation(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  unitId: string;
  coord: IHexCoordinate;
  minefield: IRepresentedMinefieldState;
  d6Roller: D6Roller;
}): IGameState {
  const { coord, d6Roller, events, gameId, minefield, phase, unitId } = options;
  const reducedMinefield = reduceRepresentedMinefieldDensity(
    minefield,
    d6Roller,
  );
  if (reducedMinefield) {
    if (isRepresentedDepletedMinefield(reducedMinefield)) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.MinefieldChanged,
          options.currentState.turn,
          phase,
          {
            operation: 'remove',
            hex: coord,
            reason: 'movement_detonation',
            sourceUnitId: unitId,
          },
          unitId,
        ),
      );

      const nextMinefields = { ...(options.currentState.minefields ?? {}) };
      delete nextMinefields[coordToKey(coord)];
      return {
        ...options.currentState,
        minefields: nextMinefields,
      };
    }

    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.MinefieldChanged,
        options.currentState.turn,
        phase,
        {
          operation: 'set',
          hex: coord,
          minefield: revealRepresentedMinefield(reducedMinefield),
          reason: 'movement_detonation',
          sourceUnitId: unitId,
        },
        unitId,
      ),
    );

    return {
      ...options.currentState,
      minefields: {
        ...(options.currentState.minefields ?? {}),
        [coordToKey(coord)]: revealRepresentedMinefield(reducedMinefield),
      },
    };
  }

  if (hasRepresentedMinefieldDensity(minefield)) {
    return options.currentState;
  }

  const detonatedMinefield: IRepresentedMinefieldState = {
    ...revealRepresentedMinefield(minefield),
    detonated: true,
    source: minefield.source ?? 'event',
  };
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.MinefieldChanged,
      options.currentState.turn,
      phase,
      {
        operation: 'detonate',
        hex: coord,
        minefield: detonatedMinefield,
        reason: 'movement_detonation',
        sourceUnitId: unitId,
      },
      unitId,
    ),
  );

  return {
    ...options.currentState,
    minefields: {
      ...(options.currentState.minefields ?? {}),
      [coordToKey(coord)]: detonatedMinefield,
    },
  };
}

function revealRepresentedMinefield(
  minefield: IRepresentedMinefieldState,
): IRepresentedMinefieldState {
  if (minefield.hidden !== true) {
    return minefield;
  }

  return {
    ...minefield,
    hidden: false,
    revealed: true,
  };
}

function hasRepresentedMinefieldDensity(
  minefield: IRepresentedMinefieldState,
): boolean {
  return Number.isFinite(minefield.density);
}

function reduceRepresentedMinefieldDensity(
  minefield: IRepresentedMinefieldState,
  d6Roller: D6Roller,
): IRepresentedMinefieldState | undefined {
  if (minefield.type === 'vibrabomb') {
    const density = Math.trunc(minefield.density ?? Number.NaN);
    if (!Number.isFinite(density) || density <= MINEFIELD_DENSITY_DEPLETED) {
      return undefined;
    }

    const reducedDensity = density - MINEFIELD_DENSITY_REDUCTION_STEP;
    return {
      ...minefield,
      density: Math.max(MINEFIELD_DENSITY_DEPLETED, reducedDensity),
      detonated: reducedDensity <= MINEFIELD_DENSITY_DEPLETED,
      source: 'event',
    };
  }

  if (!isRepresentedDensityReducingMinefieldType(minefield.type)) {
    return undefined;
  }

  const density = Math.trunc(minefield.density ?? Number.NaN);
  if (
    !Number.isFinite(density) ||
    density <= MINIMUM_REPRESENTED_MINEFIELD_DENSITY
  ) {
    return undefined;
  }

  if (roll2d6(d6Roller).total < minefieldDetonationTarget(density)) {
    return undefined;
  }

  return {
    ...minefield,
    density: Math.max(
      MINIMUM_REPRESENTED_MINEFIELD_DENSITY,
      density - MINEFIELD_DENSITY_REDUCTION_STEP,
    ),
    detonated: false,
    source: 'event',
  };
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

function minefieldAt(
  state: IGameState,
  grid: IHexGrid,
  coord: IHexCoordinate,
  options: {
    readonly isGroundEntry: boolean;
    readonly terrainEntered?: string;
  },
): RepresentedMinefieldEntry | undefined {
  const stateMinefield = representedMinefieldStateAt(
    state,
    coord,
    options.isGroundEntry,
  );
  if (stateMinefield) {
    return stateMinefield;
  }

  const mineFeature = mineFeatureAt(grid, coord, options.terrainEntered);
  if (!mineFeature) {
    return undefined;
  }

  return {
    effect: 'conventional-damage',
    damagePerLeg: mineDamagePerLeg(mineFeature),
    detonationTarget: DEFAULT_REPRESENTED_MINE_DETONATION_TARGET,
  };
}

function representedMinefieldStateAt(
  state: IGameState,
  coord: IHexCoordinate,
  isGroundEntry: boolean,
): RepresentedMinefieldEntry | undefined {
  const minefield = state.minefields?.[coordToKey(coord)];
  if (!minefield) {
    return undefined;
  }
  const entry = representedMinefieldEntry(minefield, isGroundEntry);
  if (!entry) {
    return undefined;
  }
  return {
    ...entry,
    stateCoord: coord,
  };
}

function representedMinefieldEntry(
  minefield: IRepresentedMinefieldState,
  isGroundEntry: boolean,
): RepresentedMinefieldEntry | undefined {
  if (minefield.detonated) {
    return undefined;
  }

  if (minefield.type === 'active') {
    if (!isGroundEntry) {
      const damagePerLeg = Math.trunc(minefield.damagePerLeg);
      if (damagePerLeg > 0 && Number.isFinite(damagePerLeg)) {
        return {
          effect: 'conventional-damage',
          damagePerLeg,
          detonationTarget: minefieldDetonationTarget(minefield.density),
          stateMinefield: minefield,
        };
      }
    }

    return {
      effect: 'active-ground-suppressed',
      detonationTarget: DEFAULT_REPRESENTED_MINE_DETONATION_TARGET,
      stateMinefield: minefield,
    };
  }

  if (minefield.type === 'inferno') {
    const externalHeat = infernoMinefieldExternalHeat(minefield.density);
    if (externalHeat === undefined) {
      return undefined;
    }

    return {
      effect: 'inferno-external-heat',
      externalHeat,
      detonationTarget: minefieldDetonationTarget(minefield.density),
      stateMinefield: minefield,
    };
  }

  if (minefield.type === 'emp') {
    return {
      effect: 'emp-effect',
      detonationTarget: minefieldDetonationTarget(minefield.density),
      stateMinefield: minefield,
    };
  }

  if (!isRepresentedConventionalMinefieldType(minefield.type)) {
    return undefined;
  }

  const damagePerLeg = Math.trunc(minefield.damagePerLeg);
  if (damagePerLeg <= 0 || !Number.isFinite(damagePerLeg)) {
    return undefined;
  }
  return {
    effect: 'conventional-damage',
    damagePerLeg,
    detonationTarget: minefieldDetonationTarget(minefield.density),
    stateMinefield: minefield,
  };
}

function isRepresentedConventionalMinefieldType(
  type: IRepresentedMinefieldState['type'],
): boolean {
  return type === undefined || type === 'conventional';
}

function isRepresentedDensityReducingMinefieldType(
  type: IRepresentedMinefieldState['type'],
): boolean {
  return (
    isRepresentedConventionalMinefieldType(type) ||
    type === 'emp' ||
    type === 'inferno' ||
    type === 'active'
  );
}

function isRepresentedDepletedMinefield(
  minefield: IRepresentedMinefieldState,
): boolean {
  return (
    minefield.type === 'vibrabomb' &&
    Math.trunc(minefield.density ?? Number.NaN) <= MINEFIELD_DENSITY_DEPLETED
  );
}

function infernoMinefieldExternalHeat(
  density: number | undefined,
): number | undefined {
  const representedDensity = Math.trunc(density ?? Number.NaN);
  if (!Number.isFinite(representedDensity) || representedDensity <= 0) {
    return undefined;
  }

  const missiles = Math.trunc(representedDensity / 2);
  return missiles > 0 ? missiles * 2 : undefined;
}

function mineFeatureAt(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrainEntered?: string,
): ITerrainFeature | undefined {
  const enteredFeatures = terrainFeaturesFromTag(
    terrainEntered ?? terrainAt(grid, coord),
  );
  return enteredFeatures.find(
    (feature) => feature.type === TerrainType.Mines && feature.level > 0,
  );
}

function terrainAt(
  grid: IHexGrid,
  coord: IHexCoordinate | undefined,
): string | undefined {
  if (!coord) return undefined;
  return grid.hexes.get(coordToKey(coord))?.terrain;
}

function terrainFeaturesFromTag(
  tag: string | undefined,
): readonly ITerrainFeature[] {
  if (!tag) return [];
  return parseTerrainFeatures(tag);
}

function mineDamagePerLeg(feature: ITerrainFeature): number {
  if (feature.level > 1 && Number.isFinite(feature.level)) {
    return Math.trunc(feature.level);
  }
  return DEFAULT_REPRESENTED_MINE_DAMAGE_PER_LEG;
}

function minefieldDetonationTarget(density: number | undefined): number {
  if (density === undefined || !Number.isFinite(density)) {
    return DEFAULT_REPRESENTED_MINE_DETONATION_TARGET;
  }
  const representedDensity = Math.trunc(density);
  if (representedDensity < 15) {
    return 9;
  }
  if (representedDensity < 25) {
    return 8;
  }
  return 7;
}

function applyRepresentedVibrabombMovementEffects(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  to: IHexCoordinate;
  phase: GamePhase;
  d6Roller: D6Roller;
  triggeredVibrabombCoords: Set<string>;
}): IGameState {
  const {
    d6Roller,
    events,
    gameId,
    phase,
    to,
    triggeredVibrabombCoords,
    unitId,
  } = options;
  let currentState = options.currentState;
  const unit = currentState.units[unitId];
  if (!unit || !isBattleMechLikeUnitType(unit.unitType)) {
    return currentState;
  }

  const unitTonnage = Math.trunc(unit.tonnage ?? Number.NaN);
  if (!Number.isFinite(unitTonnage)) {
    return currentState;
  }

  for (const [coordKey, minefield] of Object.entries(
    currentState.minefields ?? {},
  )) {
    if (
      triggeredVibrabombCoords.has(coordKey) ||
      !isRepresentedVibrabombMinefield(minefield)
    ) {
      continue;
    }

    const setting = representedVibrabombSetting(minefield);
    const density = representedVibrabombDamageDensity(minefield);
    if (setting === undefined || density === undefined) {
      continue;
    }

    if (unitTonnage <= setting - 10) {
      continue;
    }

    const mineCoord = keyToCoord(coordKey);
    const effectiveDistance = Math.trunc((unitTonnage - setting) / 10);
    const actualDistance = hexDistance(to, mineCoord);
    if (actualDistance > effectiveDistance) {
      continue;
    }

    triggeredVibrabombCoords.add(coordKey);
    const damagedUnitIds = representedVibrabombDamageTargetUnitIds(
      currentState,
      unitId,
      mineCoord,
      actualDistance === 0,
    );
    for (const targetUnitId of damagedUnitIds) {
      currentState = applyVibrabombDamageToBattleMech({
        currentState,
        events,
        gameId,
        unitId: targetUnitId,
        damage: density,
        phase,
        d6Roller,
      });
    }

    currentState = applyRepresentedMinefieldPostDetonation({
      currentState,
      events,
      gameId,
      phase,
      unitId,
      coord: mineCoord,
      minefield,
      d6Roller,
    });
  }

  return currentState;
}

function isRepresentedVibrabombMinefield(
  minefield: IRepresentedMinefieldState,
): boolean {
  return minefield.type === 'vibrabomb' && minefield.detonated !== true;
}

function representedVibrabombSetting(
  minefield: IRepresentedMinefieldState,
): number | undefined {
  const setting = Math.trunc(minefield.setting ?? Number.NaN);
  return Number.isFinite(setting) && setting > 0 ? setting : undefined;
}

function representedVibrabombDamageDensity(
  minefield: IRepresentedMinefieldState,
): number | undefined {
  const density = Math.trunc(minefield.density ?? Number.NaN);
  return Number.isFinite(density) && density > 0 ? density : undefined;
}

function representedVibrabombDamageTargetUnitIds(
  state: IGameState,
  movingUnitId: string,
  mineCoord: IHexCoordinate,
  movingUnitInMineHex: boolean,
): readonly string[] {
  const targetIds = new Set<string>();
  if (movingUnitInMineHex) {
    targetIds.add(movingUnitId);
  }

  for (const [candidateId, candidate] of Object.entries(state.units)) {
    if (
      candidate.destroyed ||
      candidate.isAirborne ||
      !isBattleMechLikeUnitType(candidate.unitType) ||
      (candidateId === movingUnitId && !movingUnitInMineHex) ||
      !hexEquals(candidate.position, mineCoord)
    ) {
      continue;
    }
    targetIds.add(candidateId);
  }

  return Array.from(targetIds);
}

function applyVibrabombDamageToBattleMech(options: {
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
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        currentState.turn,
        phase,
        {
          unitId,
          cause: unitAfterMines.destructionCause ?? 'damage',
        },
        unitId,
      ),
    );
  }

  return currentState;
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

function applyMineDamageToBattleMech(options: {
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
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        currentState.turn,
        phase,
        {
          unitId,
          cause: unitAfterMines.destructionCause ?? 'damage',
        },
        unitId,
      ),
    );
  }

  return currentState;
}

function applyInfernoMinefieldExternalHeatToBattleMech(options: {
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

function applyEmpMinefieldEffectToBattleMech(options: {
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

function emitMovementDamageChainEvents(options: {
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  turn: number;
  unitId: string;
  damageResult: IResolveDamageResult;
  previouslyDestroyed: readonly CombatLocation[];
}): void {
  const {
    damageResult,
    events,
    gameId,
    phase,
    previouslyDestroyed,
    turn,
    unitId,
  } = options;
  const newlyDestroyed = damageResult.state.destroyedLocations.filter(
    (location) => !previouslyDestroyed.includes(location),
  );

  for (let i = 0; i < damageResult.result.locationDamages.length; i++) {
    const locDamage = damageResult.result.locationDamages[i];
    const isTransferStep = i > 0;

    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.DamageApplied,
        turn,
        phase,
        {
          unitId,
          location: locDamage.location,
          damage: locDamage.damage,
          armorRemaining: locDamage.armorRemaining,
          structureRemaining: locDamage.structureRemaining,
          locationDestroyed: locDamage.destroyed,
        },
        unitId,
      ),
    );

    if (locDamage.destroyed) {
      let cascadedArm: string | undefined;
      if (
        locDamage.location === 'left_torso' &&
        newlyDestroyed.includes('left_arm')
      ) {
        cascadedArm = 'left_arm';
      } else if (
        locDamage.location === 'right_torso' &&
        newlyDestroyed.includes('right_arm')
      ) {
        cascadedArm = 'right_arm';
      }

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.LocationDestroyed,
          turn,
          phase,
          {
            unitId,
            location: locDamage.location,
            cascadedTo: cascadedArm,
            viaTransfer: isTransferStep,
          },
          unitId,
        ),
      );
    }

    if (locDamage.transferredDamage > 0 && locDamage.transferLocation) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.TransferDamage,
          turn,
          phase,
          {
            unitId,
            fromLocation: locDamage.location,
            toLocation: locDamage.transferLocation,
            damage: locDamage.transferredDamage,
          },
          unitId,
        ),
      );
    }
  }
}

function queueMineLegDamagePSR(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  unitId: string;
  damageResult: IResolveDamageResult;
}): IGameState {
  const { currentState, damageResult, events, gameId, phase, unitId } = options;
  const unit = currentState.units[unitId];
  if (!unit || unit.destroyed) return currentState;

  const legStructureDamage = damageResult.result.locationDamages.some(
    (locDamage) =>
      (locDamage.location === 'left_leg' ||
        locDamage.location === 'right_leg') &&
      locDamage.structureDamage > 0,
  );
  if (!legStructureDamage) return currentState;

  return queueMinePSR({
    currentState,
    events,
    gameId,
    phase,
    unitId,
    psr: createLegDamagePSR(unitId),
  });
}

function queueMineDamageThresholdPSR(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  unitId: string;
}): IGameState {
  const { currentState, events, gameId, phase, unitId } = options;
  const unit = currentState.units[unitId];
  if (!unit || unit.destroyed || (unit.damageThisPhase ?? 0) < 20) {
    return currentState;
  }
  if (
    (unit.pendingPSRs ?? []).some(
      (pendingPSR) => pendingPSR.triggerSource === '20+_damage',
    )
  ) {
    return currentState;
  }

  return queueMinePSR({
    currentState,
    events,
    gameId,
    phase,
    unitId,
    psr: createDamagePSR(unitId),
  });
}

function queueMinePSR(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  unitId: string;
  psr: IPendingPSR;
}): IGameState {
  const { currentState, events, gameId, phase, psr, unitId } = options;
  const unit = currentState.units[unitId];
  if (!unit) return currentState;

  events.push(
    createPSRTriggeredEvent(
      gameId,
      events.length,
      currentState.turn,
      phase,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit.piloting,
      psr.reasonCode,
    ),
  );

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [unitId]: {
        ...unit,
        pendingPSRs: [...(unit.pendingPSRs ?? []), psr],
      },
    },
  };
}

function isBattleMechLikeUnitType(unitType: string | undefined): boolean {
  if (unitType === undefined) return true;
  const canonical = unitType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    canonical === 'battlemech' ||
    canonical === 'omnimech' ||
    canonical === 'industrialmech'
  );
}
