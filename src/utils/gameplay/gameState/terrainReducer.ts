import type {
  IGameState,
  IMinefieldChangedPayload,
  IRepresentedMinefieldState,
  ITerrainChangedPayload,
} from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';

export function applyTerrainChanged(
  state: IGameState,
  payload: ITerrainChangedPayload,
): IGameState {
  const key = coordToKey(payload.hex);
  const existing = state.terrainOverrides?.[key];

  return {
    ...state,
    terrainOverrides: {
      ...state.terrainOverrides,
      [key]: {
        hex: payload.hex,
        terrain: payload.terrain,
        elevation: payload.elevation ?? existing?.elevation ?? 0,
        reason: payload.reason,
        ...(payload.sourceEventId !== undefined
          ? { sourceEventId: payload.sourceEventId }
          : {}),
        ...(payload.sourceUnitId !== undefined
          ? { sourceUnitId: payload.sourceUnitId }
          : {}),
        ...(payload.optionalRule !== undefined
          ? { optionalRule: payload.optionalRule }
          : {}),
      },
    },
  };
}

function normalizeMinefield(
  minefield: IRepresentedMinefieldState,
): IRepresentedMinefieldState {
  return {
    ...minefield,
    source: minefield.source ?? 'event',
  };
}

function normalizeMinefieldMap(
  minefields: Readonly<Record<string, IRepresentedMinefieldState>>,
): Record<string, IRepresentedMinefieldState> {
  return Object.fromEntries(
    Object.entries(minefields).map(([key, minefield]) => [
      key,
      normalizeMinefield(minefield),
    ]),
  );
}

function withMinefields(
  state: IGameState,
  minefields: Record<string, IRepresentedMinefieldState>,
): IGameState {
  if (Object.keys(minefields).length === 0) {
    const { minefields: _minefields, ...stateWithoutMinefields } = state;
    return stateWithoutMinefields;
  }

  return {
    ...state,
    minefields,
  };
}

export function applyMinefieldChanged(
  state: IGameState,
  payload: IMinefieldChangedPayload,
): IGameState {
  if (payload.operation === 'clear') {
    return withMinefields(state, {});
  }

  if (payload.operation === 'reset') {
    return withMinefields(
      state,
      normalizeMinefieldMap(payload.minefields ?? {}),
    );
  }

  if (!payload.hex) {
    return state;
  }

  const key = coordToKey(payload.hex);
  const currentMinefields = { ...(state.minefields ?? {}) };

  if (payload.operation === 'remove') {
    delete currentMinefields[key];
    return withMinefields(state, currentMinefields);
  }

  if (payload.operation === 'detonate') {
    const minefield = payload.minefield ?? currentMinefields[key];
    if (!minefield) {
      return state;
    }

    return withMinefields(state, {
      ...currentMinefields,
      [key]: normalizeMinefield({ ...minefield, detonated: true }),
    });
  }

  if (payload.operation === 'detect') {
    const minefield = payload.minefield ?? currentMinefields[key];
    const detectingSide =
      payload.detectingSide ??
      (payload.sourceUnitId
        ? state.units[payload.sourceUnitId]?.side
        : undefined);
    if (!minefield || !detectingSide) {
      return state;
    }

    return withMinefields(state, {
      ...currentMinefields,
      [key]: normalizeMinefield({
        ...minefield,
        hidden: minefield.hidden ?? true,
        detectedBySides: Array.from(
          new Set([...(minefield.detectedBySides ?? []), detectingSide]),
        ),
      }),
    });
  }

  if (payload.operation === 'reveal') {
    const minefield = payload.minefield ?? currentMinefields[key];
    if (!minefield) {
      return state;
    }

    return withMinefields(state, {
      ...currentMinefields,
      [key]: normalizeMinefield({
        ...minefield,
        hidden: false,
        revealed: true,
      }),
    });
  }

  if (!payload.minefield) {
    return state;
  }

  return withMinefields(state, {
    ...currentMinefields,
    [key]: normalizeMinefield(payload.minefield),
  });
}
