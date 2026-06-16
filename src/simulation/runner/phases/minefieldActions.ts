import {
  GameEventType,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IMinefieldChangedPayload,
  type IRepresentedMinefieldState,
} from '@/types/gameplay';
import { applyMinefieldChanged } from '@/utils/gameplay/gameState/terrainReducer';
import { coordToKey } from '@/utils/gameplay/hexMath';

import { createGameEvent } from './utils';

export interface IRunnerMinefieldManualDetonationOptions {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly hex: IHexCoordinate;
  readonly unitId?: string;
}

export interface IRunnerMinefieldDetectionOptions {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly hex: IHexCoordinate;
  readonly unitId: string;
}

export interface IRunnerMinefieldCommandDetonationOptions {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly hex: IHexCoordinate;
  readonly unitId?: string;
}

export interface IRunnerMinefieldClearingOptions {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly hex: IHexCoordinate;
  readonly unitId?: string;
  readonly reason?: 'clearing' | 'mine_sweeper';
}

export interface IRunnerMinefieldResetOptions {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly minefields: Readonly<Record<string, IRepresentedMinefieldState>>;
  readonly unitId?: string;
}

const MINEFIELD_CLEARING_DENSITY_STEP = 5;
const MINIMUM_REPRESENTED_MINEFIELD_DENSITY = 5;

export function applyRunnerMinefieldManualDetonation({
  events,
  gameId,
  hex,
  state,
  unitId,
}: IRunnerMinefieldManualDetonationOptions): IGameState {
  const minefield = state.minefields?.[coordToKey(hex)];
  if (!isRepresentedConventionalMinefield(minefield) || minefield.detonated) {
    return state;
  }

  const payload: IMinefieldChangedPayload = {
    operation: 'detonate',
    hex,
    minefield: {
      ...minefield,
      detonated: true,
      source: minefield.source ?? 'event',
    },
    reason: 'manual_adjustment',
    sourceUnitId: unitId,
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.MinefieldChanged,
      state.turn,
      state.phase,
      payload,
      unitId,
    ),
  );

  return applyMinefieldChanged(state, payload);
}

export function applyRunnerMinefieldCommandDetonation({
  events,
  gameId,
  hex,
  state,
  unitId,
}: IRunnerMinefieldCommandDetonationOptions): IGameState {
  const minefield = state.minefields?.[coordToKey(hex)];
  if (
    !isRepresentedCommandDetonatedMinefield(minefield) ||
    minefield.detonated
  ) {
    return state;
  }

  const payload: IMinefieldChangedPayload = {
    operation: 'detonate',
    hex,
    minefield: {
      ...minefield,
      detonated: true,
      source: minefield.source ?? 'event',
    },
    reason: 'manual_adjustment',
    sourceUnitId: unitId,
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.MinefieldChanged,
      state.turn,
      state.phase,
      payload,
      unitId,
    ),
  );

  return applyMinefieldChanged(state, payload);
}

export function applyRunnerMinefieldClearing({
  events,
  gameId,
  hex,
  reason = 'clearing',
  state,
  unitId,
}: IRunnerMinefieldClearingOptions): IGameState {
  const minefield = state.minefields?.[coordToKey(hex)];
  if (!isRepresentedConventionalMinefield(minefield)) {
    return state;
  }

  const reducedMinefield = reduceMinefieldDensityForClearing(minefield);
  const payload: IMinefieldChangedPayload = reducedMinefield
    ? {
        operation: 'set',
        hex,
        minefield: reducedMinefield,
        reason,
        sourceUnitId: unitId,
      }
    : {
        operation: 'remove',
        hex,
        reason,
        sourceUnitId: unitId,
      };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.MinefieldChanged,
      state.turn,
      state.phase,
      payload,
      unitId,
    ),
  );

  return applyMinefieldChanged(state, payload);
}

export function applyRunnerMinefieldReset({
  events,
  gameId,
  minefields,
  state,
  unitId,
}: IRunnerMinefieldResetOptions): IGameState {
  const payload: IMinefieldChangedPayload = {
    operation: 'reset',
    minefields,
    reason: 'collateral_reset',
    sourceUnitId: unitId,
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.MinefieldChanged,
      state.turn,
      state.phase,
      payload,
      unitId,
    ),
  );

  return applyMinefieldChanged(state, payload);
}

export function applyRunnerMinefieldDetection({
  events,
  gameId,
  hex,
  state,
  unitId,
}: IRunnerMinefieldDetectionOptions): IGameState {
  const minefield = state.minefields?.[coordToKey(hex)];
  const detectingSide = state.units[unitId]?.side;
  if (
    !isRepresentedConventionalMinefield(minefield) ||
    !minefield.hidden ||
    minefield.revealed ||
    !detectingSide ||
    minefield.detectedBySides?.includes(detectingSide)
  ) {
    return state;
  }

  const payload: IMinefieldChangedPayload = {
    operation: 'detect',
    hex,
    minefield,
    detectingSide,
    reason: 'detection',
    sourceUnitId: unitId,
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.MinefieldChanged,
      state.turn,
      state.phase,
      payload,
      unitId,
    ),
  );

  return applyMinefieldChanged(state, payload);
}

function reduceMinefieldDensityForClearing(
  minefield: IRepresentedMinefieldState,
): IRepresentedMinefieldState | undefined {
  const density = Math.trunc(minefield.density ?? Number.NaN);
  if (
    !Number.isFinite(density) ||
    density <= MINIMUM_REPRESENTED_MINEFIELD_DENSITY
  ) {
    return undefined;
  }

  return {
    ...minefield,
    density: Math.max(
      MINIMUM_REPRESENTED_MINEFIELD_DENSITY,
      density - MINEFIELD_CLEARING_DENSITY_STEP,
    ),
    detonated: false,
    source: 'event',
  };
}

function isRepresentedConventionalMinefield(
  minefield: IRepresentedMinefieldState | undefined,
): minefield is IRepresentedMinefieldState {
  return (
    minefield !== undefined &&
    (minefield.type === undefined || minefield.type === 'conventional')
  );
}

function isRepresentedCommandDetonatedMinefield(
  minefield: IRepresentedMinefieldState | undefined,
): minefield is IRepresentedMinefieldState {
  return minefield !== undefined && minefield.type === 'command-detonated';
}
