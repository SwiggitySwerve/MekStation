/**
 * Quick Game Store
 * Zustand store for quick session mode - standalone games without campaign persistence.
 * Uses session storage to survive page refreshes but clears on tab close.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { GameStatus, GamePhase, type IGameEvent } from '@/types/gameplay';
import {
  IQuickGameUnitRequest,
  IQuickGameScenarioConfig,
  IQuickGameForce,
  QuickGameStep,
  createQuickGameInstance,
  createQuickGameUnit,
  calculateForceTotals,
  canStartGame,
  QUICK_GAME_STORAGE_KEY,
} from '@/types/quickgame';

import {
  createScenarioActions,
  createBattleActions,
} from './useQuickGameStore.actions';
import { QuickGameStore, initialState } from './useQuickGameStore.types';

export * from './useQuickGameStore.selectors';

// =============================================================================
// Store
// =============================================================================

export const useQuickGameStore = create<QuickGameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // Game Lifecycle
      // =========================================================================

      startNewGame: () => {
        const game = createQuickGameInstance();
        set({ game, isDirty: true, error: null });
      },

      clearGame: () => {
        set({ game: null, isDirty: false, error: null });
      },

      clearError: () => {
        set({ error: null });
      },

      // =========================================================================
      // Unit Management
      // =========================================================================

      addUnit: (request: IQuickGameUnitRequest) => {
        const { game } = get();
        if (!game) {
          set({ error: 'No active game' });
          return;
        }

        const unit = createQuickGameUnit(request);
        const units = [...game.playerForce.units, unit];
        const totals = calculateForceTotals(units);

        const playerForce: IQuickGameForce = {
          ...game.playerForce,
          units,
          totalBV: totals.totalBV,
          totalTonnage: totals.totalTonnage,
        };

        set({
          game: { ...game, playerForce },
          isDirty: true,
        });
      },

      removeUnit: (instanceId: string) => {
        const { game } = get();
        if (!game) {
          set({ error: 'No active game' });
          return;
        }

        const units = game.playerForce.units.filter(
          (u) => u.instanceId !== instanceId,
        );
        const totals = calculateForceTotals(units);

        const playerForce: IQuickGameForce = {
          ...game.playerForce,
          units,
          totalBV: totals.totalBV,
          totalTonnage: totals.totalTonnage,
        };

        set({
          game: { ...game, playerForce },
          isDirty: true,
        });
      },

      updateUnitSkills: (
        instanceId: string,
        gunnery: number,
        piloting: number,
      ) => {
        const { game } = get();
        if (!game) {
          set({ error: 'No active game' });
          return;
        }

        const units = game.playerForce.units.map((u) =>
          u.instanceId === instanceId ? { ...u, gunnery, piloting } : u,
        );

        // Recalculate BV with new skills
        // Note: In a full implementation, BV would be recalculated based on skills
        const playerForce: IQuickGameForce = {
          ...game.playerForce,
          units,
        };

        set({
          game: { ...game, playerForce },
          isDirty: true,
        });
      },

      // =========================================================================
      // Scenario Configuration
      // =========================================================================

      setScenarioConfig: (config: Partial<IQuickGameScenarioConfig>) => {
        const { game } = get();
        if (!game) {
          set({ error: 'No active game' });
          return;
        }

        set({
          game: {
            ...game,
            scenarioConfig: { ...game.scenarioConfig, ...config },
          },
          isDirty: true,
        });
      },

      ...createScenarioActions(set, get),

      // =========================================================================
      // Step Navigation
      // =========================================================================

      nextStep: () => {
        const { game } = get();
        if (!game) return;

        const stepOrder: QuickGameStep[] = [
          QuickGameStep.SelectUnits,
          QuickGameStep.ConfigureScenario,
          QuickGameStep.Review,
        ];

        const currentIndex = stepOrder.indexOf(game.step);
        if (currentIndex < stepOrder.length - 1) {
          // Validate before advancing
          if (
            game.step === QuickGameStep.SelectUnits &&
            game.playerForce.units.length === 0
          ) {
            set({ error: 'Add at least one unit to continue' });
            return;
          }

          set({
            game: { ...game, step: stepOrder[currentIndex + 1] },
            isDirty: true,
            error: null,
          });
        }
      },

      previousStep: () => {
        const { game } = get();
        if (!game) return;

        const stepOrder: QuickGameStep[] = [
          QuickGameStep.SelectUnits,
          QuickGameStep.ConfigureScenario,
          QuickGameStep.Review,
        ];

        const currentIndex = stepOrder.indexOf(game.step);
        if (currentIndex > 0) {
          set({
            game: { ...game, step: stepOrder[currentIndex - 1] },
            isDirty: true,
            error: null,
          });
        }
      },

      // =========================================================================
      // Game Control
      // =========================================================================

      startGame: () => {
        const { game } = get();
        if (!game) {
          set({ error: 'No active game' });
          return;
        }

        if (!canStartGame(game)) {
          set({ error: 'Cannot start game - setup incomplete' });
          return;
        }

        set({
          game: {
            ...game,
            status: GameStatus.Active,
            step: QuickGameStep.Playing,
            turn: 1,
            phase: GamePhase.Initiative,
          },
          isDirty: true,
          error: null,
        });
      },

      ...createBattleActions(set, get),

      recordEvent: (event: IGameEvent) => {
        const { game } = get();
        if (!game) return;

        set({
          game: {
            ...game,
            events: [...game.events, event],
          },
          isDirty: true,
        });
      },

      endGame: (winner: 'player' | 'opponent' | 'draw', reason: string) => {
        const { game } = get();
        if (!game) return;

        set({
          game: {
            ...game,
            status: GameStatus.Completed,
            step: QuickGameStep.Results,
            winner,
            victoryReason: reason,
            endedAt: new Date().toISOString(),
          },
          isDirty: true,
        });
      },

      playAgain: (resetUnits: boolean) => {
        const { game } = get();
        if (!game) return;

        // Create new game instance
        const newGame = createQuickGameInstance();

        if (!resetUnits) {
          // Keep the same units but reset their damage and restore armor/structure to max
          const resetPlayerUnits = game.playerForce.units.map((unit) => ({
            ...unit,
            instanceId: `unit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            heat: 0,
            isDestroyed: false,
            isWithdrawn: false,
            armor: { ...unit.maxArmor },
            structure: { ...unit.maxStructure },
          }));

          newGame.playerForce = {
            ...game.playerForce,
            units: resetPlayerUnits,
          };
          newGame.scenarioConfig = { ...game.scenarioConfig };
        }

        set({ game: newGame, isDirty: true, error: null });
      },

      // =========================================================================
      // Session Storage
      // =========================================================================

      restoreFromSession: () => {
        // This is handled by zustand persist middleware
        // Return true if there's a game to restore
        const { game } = get();
        return game !== null;
      },

      saveToSession: () => {
        // This is handled by zustand persist middleware automatically
        set({ isDirty: false });
      },
    }),
    {
      name: QUICK_GAME_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        game: state.game,
      }),
    },
  ),
);
