import type { IAdaptedUnit } from '@/engine/types';
import type { IQuickGameUnit } from '@/types/quickgame/QuickGameInterfaces';

import {
  IQuickGameState,
  IQuickGameActions,
  IQuickGameUnitRequest,
  IQuickGameScenarioConfig,
  IQuickGameForce,
} from '@/types/quickgame';

export type QuickGameStore = IQuickGameState & IQuickGameActions;

export const initialState: IQuickGameState = {
  game: null,
  isLoading: false,
  error: null,
  isDirty: false,
};

export type {
  IQuickGameState,
  IQuickGameActions,
  IQuickGameUnitRequest,
  IQuickGameScenarioConfig,
  IQuickGameForce,
  IQuickGameUnit,
  IAdaptedUnit,
};
