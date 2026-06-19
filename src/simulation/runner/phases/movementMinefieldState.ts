import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IHexGrid,
  type IRepresentedMinefieldState,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { roll2d6, type D6Roller } from '@/utils/gameplay/hitLocation';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';

import { createGameEvent } from './utils';

export type RepresentedMinefieldEntry = {
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
const MINEFIELD_DENSITY_REDUCTION_STEP = 5;
const MINIMUM_REPRESENTED_MINEFIELD_DENSITY = 5;
const MINEFIELD_DENSITY_DEPLETED = 0;

export function applyRepresentedMinefieldPostDetonation(options: {
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

export function minefieldAt(
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
  if (stateMinefield) return stateMinefield;

  const mineFeature = mineFeatureAt(grid, coord, options.terrainEntered);
  if (!mineFeature) return undefined;

  return {
    effect: 'conventional-damage',
    damagePerLeg: mineDamagePerLeg(mineFeature),
    detonationTarget: DEFAULT_REPRESENTED_MINE_DETONATION_TARGET,
  };
}

export function minefieldDetonationTarget(density: number | undefined): number {
  if (density === undefined || !Number.isFinite(density)) {
    return DEFAULT_REPRESENTED_MINE_DETONATION_TARGET;
  }
  const representedDensity = Math.trunc(density);
  if (representedDensity < 15) return 9;
  if (representedDensity < 25) return 8;
  return 7;
}

function revealRepresentedMinefield(
  minefield: IRepresentedMinefieldState,
): IRepresentedMinefieldState {
  if (minefield.hidden !== true) return minefield;
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

function representedMinefieldStateAt(
  state: IGameState,
  coord: IHexCoordinate,
  isGroundEntry: boolean,
): RepresentedMinefieldEntry | undefined {
  const minefield = state.minefields?.[coordToKey(coord)];
  if (!minefield) return undefined;

  const entry = representedMinefieldEntry(minefield, isGroundEntry);
  if (!entry) return undefined;

  return {
    ...entry,
    stateCoord: coord,
  };
}

function representedMinefieldEntry(
  minefield: IRepresentedMinefieldState,
  isGroundEntry: boolean,
): RepresentedMinefieldEntry | undefined {
  if (minefield.detonated) return undefined;

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
    if (externalHeat === undefined) return undefined;

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

  if (!isRepresentedConventionalMinefieldType(minefield.type)) return undefined;

  const damagePerLeg = Math.trunc(minefield.damagePerLeg);
  if (damagePerLeg <= 0 || !Number.isFinite(damagePerLeg)) return undefined;
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
