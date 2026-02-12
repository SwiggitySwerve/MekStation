/**
 * Quick Game Store
 * Zustand store for quick session mode - standalone games without campaign persistence.
 * Uses session storage to survive page refreshes but clears on tab close.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { IAdaptedUnit } from '@/engine/types';
import type { IQuickGameUnit } from '@/types/quickgame/QuickGameInterfaces';

import { Faction } from '@/constants/scenario/rats';
import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { scenarioGenerator } from '@/services/generators';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GameStatus,
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import {
  IQuickGameState,
  IQuickGameActions,
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
  BiomeType,
  ScenarioObjectiveType,
  IGeneratedScenario,
} from '@/types/scenario';
import { Era } from '@/types/temporal/Era';

// =============================================================================
// Types
// =============================================================================

type QuickGameStore = IQuickGameState & IQuickGameActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: IQuickGameState = {
  game: null,
  isLoading: false,
  error: null,
  isDirty: false,
};

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

      generateScenario: () => {
        const { game } = get();
        if (!game) {
          set({ error: 'No active game' });
          return;
        }

        if (game.playerForce.units.length === 0) {
          set({ error: 'Add at least one unit to generate scenario' });
          return;
        }

        set({ isLoading: true, error: null });

        // Wrap in setTimeout to make async - ensures React sees isLoading transition
        setTimeout(() => {
          try {
            // Map config to generator input
            const faction =
              (game.scenarioConfig.enemyFaction as Faction) || Faction.PIRATES;
            const biome = (game.scenarioConfig.biome as BiomeType) || undefined;
            const scenarioType = game.scenarioConfig.scenarioType as
              | ScenarioObjectiveType
              | undefined;

            // Generate scenario using the scenario generator
            const scenario = scenarioGenerator.generate({
              playerBV: game.playerForce.totalBV,
              playerUnitCount: game.playerForce.units.length,
              faction,
              era: Era.LATE_SUCCESSION_WARS,
              difficulty: game.scenarioConfig.difficulty,
              maxModifiers: game.scenarioConfig.modifierCount,
              allowNegativeModifiers:
                game.scenarioConfig.allowNegativeModifiers,
              biome,
              scenarioType,
              seed: Date.now(),
            });

            // Convert OpFor units to quick game units
            const opponentUnits = scenario.opFor.units.map((unit) =>
              createQuickGameUnit({
                sourceUnitId: `${unit.chassis}-${unit.variant}`,
                name: unit.designation,
                chassis: unit.chassis,
                variant: unit.variant,
                bv: unit.bv,
                tonnage: unit.tonnage,
                gunnery: unit.pilot.gunnery,
                piloting: unit.pilot.piloting,
                pilotName: unit.pilot.name,
                maxArmor: {}, // Would need full unit data
                maxStructure: {}, // Would need full unit data
              }),
            );

            const opponentForce: IQuickGameForce = {
              name: `${faction} Force`,
              units: opponentUnits,
              totalBV: scenario.opFor.totalBV,
              totalTonnage: opponentUnits.reduce(
                (sum, u) => sum + u.tonnage,
                0,
              ),
            };

            set({
              game: {
                ...game,
                scenario,
                opponentForce,
              },
              isLoading: false,
              isDirty: true,
            });
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to generate scenario',
              isLoading: false,
            });
          }
        }, 0);
      },

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

      startBattle: async () => {
        const { game } = get();
        if (!game || !game.opponentForce) {
          set({ error: 'No active game or opponent force' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const adaptUnits = async (
            units: readonly IQuickGameUnit[],
            side: GameSide,
          ): Promise<IAdaptedUnit[]> => {
            const adapted: IAdaptedUnit[] = [];
            for (const unit of units) {
              const result = await adaptUnit(unit.sourceUnitId, {
                side,
                gunnery: unit.gunnery,
                piloting: unit.piloting,
              });
              if (result) {
                adapted.push(result);
              }
            }
            return adapted;
          };

          const playerAdapted = await adaptUnits(
            game.playerForce.units,
            GameSide.Player,
          );
          const opponentAdapted = await adaptUnits(
            game.opponentForce.units,
            GameSide.Opponent,
          );

          const gameUnits: IGameUnit[] = [
            ...game.playerForce.units.map((u, i) => ({
              id: playerAdapted[i]?.id ?? u.instanceId,
              name: u.name,
              side: GameSide.Player as GameSide,
              unitRef: u.sourceUnitId,
              pilotRef: u.pilotName ?? 'Unknown',
              gunnery: u.gunnery,
              piloting: u.piloting,
            })),
            ...game.opponentForce.units.map((u, i) => ({
              id: opponentAdapted[i]?.id ?? u.instanceId,
              name: u.name,
              side: GameSide.Opponent as GameSide,
              unitRef: u.sourceUnitId,
              pilotRef: u.pilotName ?? 'Unknown',
              gunnery: u.gunnery,
              piloting: u.piloting,
            })),
          ];

          const engine = new GameEngine({ seed: Date.now() });
          const session = engine.runToCompletion(
            playerAdapted,
            opponentAdapted,
            gameUnits,
          );

          useGameplayStore.getState().setSession(session);

          const winner = session.currentState.result?.winner;
          const winnerStr: 'player' | 'opponent' | 'draw' =
            winner === GameSide.Player
              ? 'player'
              : winner === GameSide.Opponent
                ? 'opponent'
                : 'draw';

          set({
            game: {
              ...game,
              status: GameStatus.Completed,
              step: QuickGameStep.Results,
              winner: winnerStr,
              victoryReason:
                session.currentState.result?.reason ?? 'Battle concluded',
              endedAt: new Date().toISOString(),
              events: session.events as IGameEvent[],
              turn: session.currentState.turn,
            },
            isLoading: false,
            isDirty: true,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to resolve battle',
            isLoading: false,
          });
        }
      },

      startSpectatorMode: async () => {
        const { game } = get();
        if (!game || !game.opponentForce) {
          set({ error: 'No active game or opponent force' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const adaptUnits = async (
            units: readonly IQuickGameUnit[],
            side: GameSide,
          ): Promise<IAdaptedUnit[]> => {
            const adapted: IAdaptedUnit[] = [];
            for (const unit of units) {
              const result = await adaptUnit(unit.sourceUnitId, {
                side,
                gunnery: unit.gunnery,
                piloting: unit.piloting,
              });
              if (result) {
                adapted.push(result);
              }
            }
            return adapted;
          };

          const playerAdapted = await adaptUnits(
            game.playerForce.units,
            GameSide.Player,
          );
          const opponentAdapted = await adaptUnits(
            game.opponentForce.units,
            GameSide.Opponent,
          );

          const gameUnits: IGameUnit[] = [
            ...game.playerForce.units.map((u, i) => ({
              id: playerAdapted[i]?.id ?? u.instanceId,
              name: u.name,
              side: GameSide.Player as GameSide,
              unitRef: u.sourceUnitId,
              pilotRef: u.pilotName ?? 'Unknown',
              gunnery: u.gunnery,
              piloting: u.piloting,
            })),
            ...game.opponentForce.units.map((u, i) => ({
              id: opponentAdapted[i]?.id ?? u.instanceId,
              name: u.name,
              side: GameSide.Opponent as GameSide,
              unitRef: u.sourceUnitId,
              pilotRef: u.pilotName ?? 'Unknown',
              gunnery: u.gunnery,
              piloting: u.piloting,
            })),
          ];

          const engine = new GameEngine({ seed: Date.now() });
          const interactiveSession = engine.createInteractiveSession(
            playerAdapted,
            opponentAdapted,
            gameUnits,
          );

          useGameplayStore.getState().setSpectatorMode(interactiveSession, {
            enabled: true,
            playing: true,
            speed: 1,
          });

          set({
            game: {
              ...game,
              status: GameStatus.Active,
              step: QuickGameStep.Playing,
            },
            isLoading: false,
            isDirty: true,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to start spectator mode',
            isLoading: false,
          });
        }
      },

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

// =============================================================================
// Selectors
// =============================================================================

/**
 * Select current step.
 */
export const selectCurrentStep = (
  state: QuickGameStore,
): QuickGameStep | null => state.game?.step ?? null;

/**
 * Select player force.
 */
export const selectPlayerForce = (
  state: QuickGameStore,
): IQuickGameForce | null => state.game?.playerForce ?? null;

/**
 * Select opponent force.
 */
export const selectOpponentForce = (
  state: QuickGameStore,
): IQuickGameForce | null => state.game?.opponentForce ?? null;

/**
 * Select scenario.
 */
export const selectScenario = (
  state: QuickGameStore,
): IGeneratedScenario | null => state.game?.scenario ?? null;

/**
 * Check if game can start.
 */
export const selectCanStartGame = (state: QuickGameStore): boolean =>
  state.game ? canStartGame(state.game) : false;

/**
 * Select game status.
 */
export const selectGameStatus = (state: QuickGameStore): GameStatus | null =>
  state.game?.status ?? null;
