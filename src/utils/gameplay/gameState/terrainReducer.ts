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
  return MINEFIELD_CHANGE_HANDLERS[payload.operation](state, payload);
}

type MinefieldChangeHandler = (
  state: IGameState,
  payload: IMinefieldChangedPayload,
) => IGameState;

const MINEFIELD_CHANGE_HANDLERS: Record<
  IMinefieldChangedPayload['operation'],
  MinefieldChangeHandler
> = {
  add: applyMinefieldSet,
  clear: applyMinefieldClear,
  detect: applyMinefieldDetect,
  detonate: applyMinefieldDetonate,
  remove: applyMinefieldRemove,
  reset: applyMinefieldReset,
  reveal: applyMinefieldReveal,
  set: applyMinefieldSet,
};

function applyMinefieldClear(state: IGameState): IGameState {
  return withMinefields(state, {});
}

function applyMinefieldReset(
  state: IGameState,
  payload: IMinefieldChangedPayload,
): IGameState {
  return withMinefields(state, normalizeMinefieldMap(payload.minefields ?? {}));
}

function applyMinefieldRemove(
  state: IGameState,
  payload: IMinefieldChangedPayload,
): IGameState {
  const key = minefieldPayloadKey(payload);
  if (!key) {
    return state;
  }

  const minefields = currentMinefields(state);
  delete minefields[key];
  return withMinefields(state, minefields);
}

function applyMinefieldDetonate(
  state: IGameState,
  payload: IMinefieldChangedPayload,
): IGameState {
  return updateExistingMinefield(state, payload, (minefield) => ({
    ...minefield,
    detonated: true,
  }));
}

function applyMinefieldDetect(
  state: IGameState,
  payload: IMinefieldChangedPayload,
): IGameState {
  const detectingSide =
    payload.detectingSide ??
    (payload.sourceUnitId
      ? state.units[payload.sourceUnitId]?.side
      : undefined);
  if (!detectingSide) {
    return state;
  }

  return updateExistingMinefield(state, payload, (minefield) => ({
    ...minefield,
    hidden: minefield.hidden ?? true,
    detectedBySides: Array.from(
      new Set([...(minefield.detectedBySides ?? []), detectingSide]),
    ),
  }));
}

function applyMinefieldReveal(
  state: IGameState,
  payload: IMinefieldChangedPayload,
): IGameState {
  return updateExistingMinefield(state, payload, (minefield) => ({
    ...minefield,
    hidden: false,
    revealed: true,
  }));
}

function applyMinefieldSet(
  state: IGameState,
  payload: IMinefieldChangedPayload,
): IGameState {
  const key = minefieldPayloadKey(payload);
  if (!key || !payload.minefield) {
    return state;
  }

  return withMinefields(state, {
    ...currentMinefields(state),
    [key]: normalizeMinefield(payload.minefield),
  });
}

function updateExistingMinefield(
  state: IGameState,
  payload: IMinefieldChangedPayload,
  update: (minefield: IRepresentedMinefieldState) => IRepresentedMinefieldState,
): IGameState {
  const key = minefieldPayloadKey(payload);
  if (!key) {
    return state;
  }

  const minefields = currentMinefields(state);
  const minefield = payload.minefield ?? minefields[key];
  if (!minefield) {
    return state;
  }

  return withMinefields(state, {
    ...minefields,
    [key]: normalizeMinefield(update(minefield)),
  });
}

function minefieldPayloadKey(
  payload: IMinefieldChangedPayload,
): string | undefined {
  return payload.hex ? coordToKey(payload.hex) : undefined;
}

function currentMinefields(
  state: IGameState,
): Record<string, IRepresentedMinefieldState> {
  return { ...(state.minefields ?? {}) };
}
