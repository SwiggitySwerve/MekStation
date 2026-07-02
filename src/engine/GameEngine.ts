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
import { type D6Roller, type DiceRoller } from '@/utils/gameplay/diceTypes';
import {
  createGameSession,
  startGame,
  advancePhase,
  rollInitiative,
  resolveAllAttacks,
  resolveHeatPhase,
  endGame,
} from '@/utils/gameplay/gameSession';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';

import type { IGameEngineConfig, IAdaptedUnit } from './types';

import { createMinimalGrid, toMovementCapability } from './GameEngine.helpers';
import {
  runMovementPhase,
  runAttackPhase,
  runPhysicalAttackPhase,
} from './GameEngine.phases';
import {
  InteractiveSession,
  type IInteractiveSessionLinkage,
} from './InteractiveSession';
import { gameUnitsWithAdaptedCombatSeeds } from './InteractiveSession.setup';

export { InteractiveSession };

// =============================================================================
// Game Engine
// =============================================================================

export class GameEngine {
  private readonly mapRadius: number;
  private readonly turnLimit: number;
  private readonly victoryConditions: readonly string[];
  private readonly seed: number;
  private readonly random: SeededRandom;
  private readonly grid: IHexGrid;
  private readonly optionalRules: readonly string[];

  constructor(config: IGameEngineConfig = {}) {
    this.mapRadius = config.mapRadius ?? config.grid?.config.radius ?? 7;
    this.turnLimit = config.turnLimit ?? 30;
    this.victoryConditions = config.victoryConditions ?? ['elimination'];
    this.seed = config.seed ?? Date.now();
    this.random = new SeededRandom(this.seed);
    this.grid = config.grid ?? createMinimalGrid(this.mapRadius);
    this.optionalRules = config.optionalRules ?? [];
  }

  /**
   * Run a fully automated battle (both sides AI-controlled).
   * Returns the completed game session.
   */
  runToCompletion(
    playerUnits: readonly IAdaptedUnit[],
    opponentUnits: readonly IAdaptedUnit[],
    gameUnits: readonly IGameUnit[],
    linkage: IInteractiveSessionLinkage = {},
  ): IGameSession {
    const weaponsByUnit = new Map<string, readonly IWeapon[]>();
    const movementByUnit = new Map<string, IMovementCapability>();
    const gunneryByUnit = new Map<string, number>();
    // Per `wire-bot-ai-helpers-and-capstone`: piloting needed by
    // `runPhysicalAttackPhase` for to-hit calculation.
    const pilotingByUnit = new Map<string, number>();

    for (const u of [...playerUnits, ...opponentUnits]) {
      weaponsByUnit.set(u.id, u.weapons);
      movementByUnit.set(u.id, toMovementCapability(u));
    }
    for (const gu of gameUnits) {
      gunneryByUnit.set(gu.id, gu.gunnery);
      pilotingByUnit.set(gu.id, gu.piloting);
    }

    const gameConfig: IGameConfig = {
      mapRadius: this.mapRadius,
      turnLimit: this.turnLimit,
      victoryConditions: [...this.victoryConditions],
      optionalRules: [...this.optionalRules],
      encounterId: linkage.encounterId ?? null,
      campaignId: linkage.campaignId ?? null,
      contractId: linkage.contractId ?? null,
      scenarioId: linkage.scenarioId ?? null,
    };

    // Same combat-seed splice as the interactive constructor — without it,
    // auto-resolved battles ran every BattleMech at 0 armor / 0 structure
    // (one penetrating hit destroyed the location).
    let session = createGameSession(
      gameConfig,
      gameUnitsWithAdaptedCombatSeeds(gameUnits, playerUnits, opponentUnits),
    );
    session = startGame(session, GameSide.Player);

    const botPlayer = new BotPlayer(this.random);

    // Per `add-quick-resolve-monte-carlo`: thread the engine's
    // `SeededRandom` into every PRNG-consuming phase call so the
    // Monte Carlo wrapper can replay batches deterministically. Without
    // this, `resolveAllAttacks` / `resolveHeatPhase` / `rollInitiative`
    // fall back to `Math.random()` and the same seed produces different
    // aggregate outcomes across runs.
    const d6Roller: D6Roller = () => this.random.nextInt(6) + 1;
    const diceRoller: DiceRoller = () => {
      const die1 = d6Roller();
      const die2 = d6Roller();
      const total = die1 + die2;
      return {
        dice: [die1, die2] as const,
        total,
        isSnakeEyes: total === 2,
        isBoxcars: total === 12,
      };
    };

    for (let turn = 0; turn < this.turnLimit; turn++) {
      session = rollInitiative(session, undefined, d6Roller);
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
        this.grid,
        this.optionalRules,
      );
      session = resolveAllAttacks(session, diceRoller);
      session = advancePhase(session);
      // Per `wire-bot-ai-helpers-and-capstone`: PhysicalAttack phase
      // body — declare melee attacks via the bot, then resolve them.
      session = runPhysicalAttackPhase({
        session,
        botPlayer,
        weaponsByUnit,
        gunneryByUnit,
        pilotingByUnit,
        d6Roller,
        grid: this.grid,
      });
      session = advancePhase(session);
      // Per `wire-heat-generation-and-effects` task 5: pass a
      // grid-aware water depth resolver so flooded hexes dissipate
      // +2 (depth 1) / +4 (depth ≥2). Current `createMinimalGrid`
      // only emits `'clear'` hexes, yielding 0 bonus today — zero
      // behavioural change until water-tagged grids arrive.
      const grid = this.grid;
      session = resolveHeatPhase(session, diceRoller, {
        getWaterDepth: (unitId, position) => {
          const unit = session.currentState.units[unitId];
          return waterDepthAtPosition(grid, unit?.position ?? position);
        },
      });
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
   *
   * Per `wire-encounter-to-campaign-round-trip` Wave 5: optional
   * `linkage` argument propagates campaign linkage (contract / scenario
   * / encounter ids) onto the resulting session. The campaign
   * orchestrator passes these so `InteractiveSession.tryFinalizeAndPublish`
   * can stamp them onto the published `ICombatOutcome`.
   */
  createInteractiveSession(
    playerUnits: readonly IAdaptedUnit[],
    opponentUnits: readonly IAdaptedUnit[],
    gameUnits: readonly IGameUnit[],
    linkage?: IInteractiveSessionLinkage,
  ): InteractiveSession {
    return new InteractiveSession(
      this.mapRadius,
      this.turnLimit,
      this.random,
      this.grid,
      playerUnits,
      opponentUnits,
      gameUnits,
      linkage,
      undefined,
      this.optionalRules,
      this.victoryConditions,
    );
  }

  private determineWinnerFromState(state: IGameState): GameSide | 'draw' {
    const remainsInForce = (u: IGameState['units'][string]): boolean =>
      !u.destroyed && !u.hasRetreated && !u.hasEjected;

    const playerAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Player && remainsInForce(u),
    );
    const opponentAlive = Object.values(state.units).some(
      (u) => u.side === GameSide.Opponent && remainsInForce(u),
    );

    if (!playerAlive && !opponentAlive) return 'draw';
    if (!opponentAlive) return GameSide.Player;
    if (!playerAlive) return GameSide.Opponent;
    // Turn limit — compare surviving counts
    const pCount = Object.values(state.units).filter(
      (u) => u.side === GameSide.Player && remainsInForce(u),
    ).length;
    const oCount = Object.values(state.units).filter(
      (u) => u.side === GameSide.Opponent && remainsInForce(u),
    ).length;
    if (pCount > oCount) return GameSide.Player;
    if (oCount > pCount) return GameSide.Opponent;
    return 'draw';
  }
}
