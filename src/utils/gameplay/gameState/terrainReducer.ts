import type { IGameState, ITerrainChangedPayload } from '@/types/gameplay';

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
