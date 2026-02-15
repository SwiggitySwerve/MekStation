import { Faction } from '@/constants/scenario/rats';
import { GameEngine } from '@/engine/GameEngine';
import { scenarioGenerator } from '@/services/generators';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GameStatus,
  GameSide,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import {
  IQuickGameForce,
  QuickGameStep,
  createQuickGameUnit,
  createQuickGameInstance,
} from '@/types/quickgame';
import { BiomeType, ScenarioObjectiveType } from '@/types/scenario';
import { Era } from '@/types/temporal/Era';

import type { QuickGameStore } from './useQuickGameStore.types';

import { adaptUnits } from './useQuickGameStore.helpers';

type SetFn = (
  partial:
    | Partial<QuickGameStore>
    | ((state: QuickGameStore) => Partial<QuickGameStore>),
) => void;
type GetFn = () => QuickGameStore;

export function createScenarioActions(
  set: SetFn,
  get: GetFn,
): {
  generateScenario: () => void;
} {
  return {
    generateScenario: (): void => {
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

      setTimeout(() => {
        try {
          const faction =
            (game.scenarioConfig.enemyFaction as Faction) || Faction.PIRATES;
          const biome = (game.scenarioConfig.biome as BiomeType) || undefined;
          const scenarioType = game.scenarioConfig.scenarioType as
            | ScenarioObjectiveType
            | undefined;

          const scenario = scenarioGenerator.generate({
            playerBV: game.playerForce.totalBV,
            playerUnitCount: game.playerForce.units.length,
            faction,
            era: Era.LATE_SUCCESSION_WARS,
            difficulty: game.scenarioConfig.difficulty,
            maxModifiers: game.scenarioConfig.modifierCount,
            allowNegativeModifiers: game.scenarioConfig.allowNegativeModifiers,
            biome,
            scenarioType,
            seed: Date.now(),
          });

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
              maxArmor: {},
              maxStructure: {},
            }),
          );

          const opponentForce: IQuickGameForce = {
            name: `${faction} Force`,
            units: opponentUnits,
            totalBV: scenario.opFor.totalBV,
            totalTonnage: opponentUnits.reduce((sum, u) => sum + u.tonnage, 0),
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
  };
}

export function createBattleActions(
  set: SetFn,
  get: GetFn,
): {
  startBattle: () => Promise<void>;
  startSpectatorMode: () => Promise<void>;
  playAgain: (resetUnits: boolean) => void;
} {
  return {
    startBattle: async (): Promise<void> => {
      const { game } = get();
      if (!game || !game.opponentForce) {
        set({ error: 'No active game or opponent force' });
        return;
      }

      set({ isLoading: true, error: null });

      try {
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
            error instanceof Error ? error.message : 'Failed to resolve battle',
          isLoading: false,
        });
      }
    },

    startSpectatorMode: async (): Promise<void> => {
      const { game } = get();
      if (!game || !game.opponentForce) {
        set({ error: 'No active game or opponent force' });
        return;
      }

      set({ isLoading: true, error: null });

      try {
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

    playAgain: (resetUnits: boolean): void => {
      const { game } = get();
      if (!game) return;

      const newGame = createQuickGameInstance();

      if (!resetUnits) {
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
  };
}
