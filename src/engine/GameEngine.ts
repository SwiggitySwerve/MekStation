/**
 * Game Engine
 * Orchestrates battles with auto-resolve and interactive modes.
 */

import type { IWeapon } from '@/simulation/ai/types';

import { isGameEnded } from '@/services/game-resolution/GameOutcomeCalculator';
import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameSide,
  type IGameSession,
  type IGameConfig,
  type IGameUnit,
  type IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  createGameSession,
  startGame,
  advancePhase,
  rollInitiative,
  resolveAllAttacks,
  resolveHeatPhase,
  endGame,
} from '@/utils/gameplay/gameSession';

import type { IGameEngineConfig, IAdaptedUnit } from './types';

import { createMinimalGrid, toMovementCapability } from './GameEngine.helpers';
import { runMovementPhase, runAttackPhase } from './GameEngine.phases';
import { InteractiveSession } from './InteractiveSession';

export { InteractiveSession };

// =============================================================================
// Game Engine
// =============================================================================

export class GameEngine {
  private readonly mapRadius: number;
  private readonly turnLimit: number;
  private readonly seed: number;
  private readonly random: SeededRandom;
  private readonly grid: IHexGrid;

  constructor(config: IGameEngineConfig = {}) {
    this.mapRadius = config.mapRadius ?? 7;
    this.turnLimit = config.turnLimit ?? 30;
    this.seed = config.seed ?? Date.now();
    this.random = new SeededRandom(this.seed);
    this.grid = createMinimalGrid(this.mapRadius);
  }

  /**
   * Run a fully automated battle (both sides AI-controlled).
   * Returns the completed game session.
   */
  runToCompletion(
    playerUnits: readonly IAdaptedUnit[],
    opponentUnits: readonly IAdaptedUnit[],
    gameUnits: readonly IGameUnit[],
  ): IGameSession {
    const weaponsByUnit = new Map<string, readonly IWeapon[]>();
    const movementByUnit = new Map<string, IMovementCapability>();
    const gunneryByUnit = new Map<string, number>();

    for (const u of [...playerUnits, ...opponentUnits]) {
      weaponsByUnit.set(u.id, u.weapons);
      movementByUnit.set(u.id, toMovementCapability(u));
    }
    for (const gu of gameUnits) {
      gunneryByUnit.set(gu.id, gu.gunnery);
    }

    const gameConfig: IGameConfig = {
      mapRadius: this.mapRadius,
      turnLimit: this.turnLimit,
      victoryConditions: ['elimination'],
      optionalRules: [],
    };

    let session = createGameSession(gameConfig, gameUnits);
    session = startGame(session, GameSide.Player);

    const botPlayer = new BotPlayer(this.random);

    for (let turn = 0; turn < this.turnLimit; turn++) {
      session = rollInitiative(session);
      session = advancePhase(session);

      session = runMovementPhase(
        session,
        this.grid,
        botPlayer,
        weaponsByUnit,
        movementByUnit,
        gunneryByUnit,
      );
      session = advancePhase(session);

      session = runAttackPhase(
        session,
        botPlayer,
        weaponsByUnit,
        gunneryByUnit,
      );
      session = resolveAllAttacks(session);
      session = advancePhase(session);
      session = advancePhase(session);
      session = resolveHeatPhase(session);
      session = advancePhase(session);

      if (isGameEnded(session.currentState, gameConfig)) {
        const winner = this.determineWinnerFromState(session.currentState);
        session = endGame(session, winner, 'destruction');
        return session;
      }

      session = advancePhase(session);
    }

    // Turn limit reached
    const winner = this.determineWinnerFromState(session.currentState);
    session = endGame(session, winner, 'turn_limit');
    return session;
  }

  /**
   * Create an interactive turn-by-turn session.
   */
  createInteractiveSession(
    playerUnits: readonly IAdaptedUnit[],
    opponentUnits: readonly IAdaptedUnit[],
    gameUnits: readonly IGameUnit[],
  ): InteractiveSession {
    return new InteractiveSession(
      this.mapRadius,
      this.turnLimit,
      this.random,
      this.grid,
      playerUnits,
      opponentUnits,
      gameUnits,
    );
  }

  private determineWinnerFromState(state: IGameState): GameSide | 'draw' {
    const playerAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Player && !u.destroyed,
    );
    const opponentAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Opponent && !u.destroyed,
    );

    if (!playerAlive && !opponentAlive) return 'draw';
    if (!opponentAlive) return GameSide.Player;
    if (!playerAlive) return GameSide.Opponent;
    // Turn limit — compare surviving counts
    const pCount = Object.values(state.units).filter(
      (u) => u.side === GameSide.Player && !u.destroyed,
    ).length;
    const oCount = Object.values(state.units).filter(
      (u) => u.side === GameSide.Opponent && !u.destroyed,
    ).length;
    if (pCount > oCount) return GameSide.Player;
    if (oCount > pCount) return GameSide.Opponent;
    return 'draw';
  }
}
