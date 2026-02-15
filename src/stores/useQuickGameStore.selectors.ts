import type { IQuickGameForce } from '@/types/quickgame/QuickGameInterfaces';
import type { IGeneratedScenario } from '@/types/scenario';

import { GameStatus } from '@/types/gameplay';
import { QuickGameStep, canStartGame } from '@/types/quickgame';

import type { QuickGameStore } from './useQuickGameStore.types';

export const selectCurrentStep = (
  state: QuickGameStore,
): QuickGameStep | null => state.game?.step ?? null;

export const selectPlayerForce = (
  state: QuickGameStore,
): IQuickGameForce | null => state.game?.playerForce ?? null;

export const selectOpponentForce = (
  state: QuickGameStore,
): IQuickGameForce | null => state.game?.opponentForce ?? null;

export const selectScenario = (
  state: QuickGameStore,
): IGeneratedScenario | null => state.game?.scenario ?? null;

export const selectCanStartGame = (state: QuickGameStore): boolean =>
  state.game ? canStartGame(state.game) : false;

export const selectGameStatus = (state: QuickGameStore): GameStatus | null =>
  state.game?.status ?? null;
