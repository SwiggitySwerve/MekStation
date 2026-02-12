/**
 * Game Engine
 * Orchestrates battles with auto-resolve and interactive modes.
 */

import type { IWeapon, IAIUnitState } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import {
  calculateGameOutcome,
  isGameEnded,
  type IGameOutcome,
} from '@/services/game-resolution/GameOutcomeCalculator';
import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameSide,
  GamePhase,
  LockState,
  type IGameSession,
  type IGameConfig,
  type IGameUnit,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  MovementType,
  RangeBracket,
  type IHexCoordinate,
  type IHexGrid,
  type IHex,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import {
  createGameSession,
  startGame,
  advancePhase,
  rollInitiative,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  resolveAllAttacks,
  resolveHeatPhase,
  endGame,
} from '@/utils/gameplay/gameSession';

import type {
  IGameEngineConfig,
  IAdaptedUnit,
  IAvailableActions,
} from './types';

// =============================================================================
// Grid Creation
// =============================================================================

function createMinimalGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: null,
          terrain: 'clear',
          elevation: 0,
        });
      }
    }
  }
  return { config: { radius }, hexes };
}

// =============================================================================
// AI State Conversion
// =============================================================================

function toAIUnitState(
  unit: IUnitGameState,
  weapons: readonly IWeapon[],
  gunnery: number,
): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons,
    ammo: unit.ammo,
    destroyed: unit.destroyed,
    gunnery,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
  };
}

function toMovementCapability(adapted: IAdaptedUnit): IMovementCapability {
  return {
    walkMP: adapted.walkMP,
    runMP: adapted.runMP,
    jumpMP: adapted.jumpMP,
  };
}

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
      // Initiative
      session = rollInitiative(session);
      session = advancePhase(session); // → Movement

      // Movement phase
      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        if (unit.destroyed) {
          session = lockMovement(session, unitId);
          continue;
        }

        const weapons = weaponsByUnit.get(unitId) ?? [];
        const gunnery = gunneryByUnit.get(unitId) ?? 4;
        const cap = movementByUnit.get(unitId) ?? {
          walkMP: 4,
          runMP: 6,
          jumpMP: 0,
        };
        const aiUnit = toAIUnitState(unit, weapons, gunnery);
        const moveEvt = botPlayer.playMovementPhase(aiUnit, this.grid, cap);

        if (moveEvt) {
          session = declareMovement(
            session,
            unitId,
            unit.position,
            moveEvt.payload.to,
            moveEvt.payload.facing as Facing,
            moveEvt.payload.movementType,
            moveEvt.payload.mpUsed,
            moveEvt.payload.heatGenerated,
          );
        }
        session = lockMovement(session, unitId);
      }

      session = advancePhase(session); // → WeaponAttack

      // Attack phase
      const allAIUnits = Object.keys(session.currentState.units).map((uid) => {
        const u = session.currentState.units[uid];
        const w = weaponsByUnit.get(uid) ?? [];
        const g = gunneryByUnit.get(uid) ?? 4;
        return toAIUnitState(u, w, g);
      });

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        if (unit.destroyed) {
          session = lockAttack(session, unitId);
          continue;
        }

        const weapons = weaponsByUnit.get(unitId) ?? [];
        const gunnery = gunneryByUnit.get(unitId) ?? 4;
        const aiUnit = toAIUnitState(unit, weapons, gunnery);
        const enemies = allAIUnits.filter(
          (a) =>
            !a.destroyed &&
            session.currentState.units[a.unitId].side !== unit.side,
        );

        const atkEvt = botPlayer.playAttackPhase(aiUnit, enemies);
        if (atkEvt) {
          const weaponAttacks: IWeaponAttack[] = atkEvt.payload.weapons.map(
            (wId) => {
              const wData = weapons.find((w) => w.id === wId);
              return {
                weaponId: wId,
                weaponName: wData?.name ?? wId,
                damage: wData?.damage ?? 5,
                heat: wData?.heat ?? 3,
                category: 'energy' as never,
                minRange: wData?.minRange ?? 0,
                shortRange: wData?.shortRange ?? 3,
                mediumRange: wData?.mediumRange ?? 6,
                longRange: wData?.longRange ?? 9,
                isCluster: false,
              };
            },
          );

          const targetUnit =
            session.currentState.units[atkEvt.payload.targetId];
          const firingArc = calculateFiringArc(
            unit.position,
            targetUnit.position,
            targetUnit.facing,
          );

          session = declareAttack(
            session,
            unitId,
            atkEvt.payload.targetId,
            weaponAttacks,
            3,
            RangeBracket.Short,
            firingArc,
          );
        }
        session = lockAttack(session, unitId);
      }

      session = resolveAllAttacks(session);
      session = advancePhase(session); // → PhysicalAttack
      session = advancePhase(session); // → Heat
      session = resolveHeatPhase(session);
      session = advancePhase(session); // → End

      if (isGameEnded(session.currentState, gameConfig)) {
        const winner = this.determineWinnerFromState(session.currentState);
        session = endGame(session, winner, 'destruction');
        return session;
      }

      session = advancePhase(session); // → Initiative (next turn)
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

// =============================================================================
// Interactive Session
// =============================================================================

export class InteractiveSession {
  private session: IGameSession;
  private readonly gameConfig: IGameConfig;
  private readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  private readonly movementByUnit: Map<string, IMovementCapability>;
  private readonly gunneryByUnit: Map<string, number>;
  private readonly random: SeededRandom;
  private readonly grid: IHexGrid;
  private readonly botPlayer: BotPlayer;
  private startedAt: string;

  constructor(
    mapRadius: number,
    turnLimit: number,
    random: SeededRandom,
    grid: IHexGrid,
    playerUnits: readonly IAdaptedUnit[],
    opponentUnits: readonly IAdaptedUnit[],
    gameUnits: readonly IGameUnit[],
  ) {
    this.random = random;
    this.grid = grid;
    this.botPlayer = new BotPlayer(random);
    this.startedAt = new Date().toISOString();

    this.weaponsByUnit = new Map();
    this.movementByUnit = new Map();
    this.gunneryByUnit = new Map();

    for (const u of [...playerUnits, ...opponentUnits]) {
      this.weaponsByUnit.set(u.id, u.weapons);
      this.movementByUnit.set(u.id, toMovementCapability(u));
    }
    for (const gu of gameUnits) {
      this.gunneryByUnit.set(gu.id, gu.gunnery);
    }

    this.gameConfig = {
      mapRadius,
      turnLimit,
      victoryConditions: ['elimination'],
      optionalRules: [],
    };

    this.session = createGameSession(this.gameConfig, gameUnits);
    this.session = startGame(this.session, GameSide.Player);
  }

  getState(): IGameState {
    return this.session.currentState;
  }

  getSession(): IGameSession {
    return this.session;
  }

  getAvailableActions(unitId: string): IAvailableActions {
    const unit = this.session.currentState.units[unitId];
    if (!unit || unit.destroyed) {
      return { validMoves: [], validTargets: [] };
    }

    const weapons = this.weaponsByUnit.get(unitId) ?? [];
    const validMoves: IHexCoordinate[] = [];
    const validTargets: { unitId: string; weapons: string[] }[] = [];

    // Gather enemies as potential targets
    for (const [uid, u] of Object.entries(this.session.currentState.units)) {
      if (u.side !== unit.side && !u.destroyed) {
        validTargets.push({
          unitId: uid,
          weapons: weapons.filter((w) => !w.destroyed).map((w) => w.id),
        });
      }
    }

    return { validMoves, validTargets };
  }

  applyMovement(
    unitId: string,
    to: IHexCoordinate,
    facing: Facing,
    movementType: MovementType,
  ): void {
    const unit = this.session.currentState.units[unitId];
    if (!unit) return;

    this.session = declareMovement(
      this.session,
      unitId,
      unit.position,
      to,
      facing,
      movementType,
      0,
      movementType === MovementType.Jump ? 1 : 0,
    );
    this.session = lockMovement(this.session, unitId);
  }

  applyAttack(
    attackerId: string,
    targetId: string,
    weaponIds: readonly string[],
  ): void {
    const unitWeapons = this.weaponsByUnit.get(attackerId) ?? [];
    const weaponAttacks: IWeaponAttack[] = weaponIds.map((wId) => {
      const wData = unitWeapons.find((w) => w.id === wId);
      return {
        weaponId: wId,
        weaponName: wData?.name ?? wId,
        damage: wData?.damage ?? 5,
        heat: wData?.heat ?? 3,
        category: 'energy' as never,
        minRange: wData?.minRange ?? 0,
        shortRange: wData?.shortRange ?? 3,
        mediumRange: wData?.mediumRange ?? 6,
        longRange: wData?.longRange ?? 9,
        isCluster: false,
      };
    });

    const attackerState = this.session.currentState.units[attackerId];
    const targetState = this.session.currentState.units[targetId];
    const firingArc = calculateFiringArc(
      attackerState.position,
      targetState.position,
      targetState.facing,
    );

    this.session = declareAttack(
      this.session,
      attackerId,
      targetId,
      weaponAttacks,
      3,
      RangeBracket.Short,
      firingArc,
    );
    this.session = lockAttack(this.session, attackerId);
  }

  advancePhase(): void {
    const { phase } = this.session.currentState;

    if (phase === GamePhase.Initiative) {
      this.session = rollInitiative(this.session);
      this.session = advancePhase(this.session);
    } else if (phase === GamePhase.Movement) {
      // Lock any units that haven't been locked yet
      for (const unitId of Object.keys(this.session.currentState.units)) {
        const u = this.session.currentState.units[unitId];
        if (
          u.lockState !== LockState.Locked &&
          u.lockState !== LockState.Resolved
        ) {
          this.session = lockMovement(this.session, unitId);
        }
      }
      this.session = advancePhase(this.session);
    } else if (phase === GamePhase.WeaponAttack) {
      // Lock any units that haven't been locked yet
      for (const unitId of Object.keys(this.session.currentState.units)) {
        const u = this.session.currentState.units[unitId];
        if (
          u.lockState !== LockState.Locked &&
          u.lockState !== LockState.Resolved
        ) {
          this.session = lockAttack(this.session, unitId);
        }
      }
      this.session = resolveAllAttacks(this.session);
      this.session = advancePhase(this.session);
    } else if (phase === GamePhase.PhysicalAttack) {
      this.session = advancePhase(this.session);
    } else if (phase === GamePhase.Heat) {
      this.session = resolveHeatPhase(this.session);
      this.session = advancePhase(this.session);
    } else if (phase === GamePhase.End) {
      if (!this.isGameOver()) {
        this.session = advancePhase(this.session);
      }
    }
  }

  runAITurn(side: GameSide): void {
    const { phase } = this.session.currentState;

    for (const [unitId, unit] of Object.entries(
      this.session.currentState.units,
    )) {
      if (unit.side !== side || unit.destroyed) continue;

      const weapons = this.weaponsByUnit.get(unitId) ?? [];
      const gunnery = this.gunneryByUnit.get(unitId) ?? 4;
      const cap = this.movementByUnit.get(unitId) ?? {
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
      };

      if (phase === GamePhase.Movement) {
        const aiUnit = toAIUnitState(unit, weapons, gunnery);
        const moveEvt = this.botPlayer.playMovementPhase(
          aiUnit,
          this.grid,
          cap,
        );
        if (moveEvt) {
          this.session = declareMovement(
            this.session,
            unitId,
            unit.position,
            moveEvt.payload.to,
            moveEvt.payload.facing as Facing,
            moveEvt.payload.movementType,
            moveEvt.payload.mpUsed,
            moveEvt.payload.heatGenerated,
          );
        }
        this.session = lockMovement(this.session, unitId);
      } else if (phase === GamePhase.WeaponAttack) {
        const aiUnit = toAIUnitState(unit, weapons, gunnery);
        const allAI = Object.keys(this.session.currentState.units).map(
          (uid) => {
            const u = this.session.currentState.units[uid];
            return toAIUnitState(
              u,
              this.weaponsByUnit.get(uid) ?? [],
              this.gunneryByUnit.get(uid) ?? 4,
            );
          },
        );
        const enemies = allAI.filter(
          (a) =>
            !a.destroyed &&
            this.session.currentState.units[a.unitId].side !== side,
        );
        const atkEvt = this.botPlayer.playAttackPhase(aiUnit, enemies);
        if (atkEvt) {
          const weaponAttacks: IWeaponAttack[] = atkEvt.payload.weapons.map(
            (wId) => {
              const wData = weapons.find((w) => w.id === wId);
              return {
                weaponId: wId,
                weaponName: wData?.name ?? wId,
                damage: wData?.damage ?? 5,
                heat: wData?.heat ?? 3,
                category: 'energy' as never,
                minRange: wData?.minRange ?? 0,
                shortRange: wData?.shortRange ?? 3,
                mediumRange: wData?.mediumRange ?? 6,
                longRange: wData?.longRange ?? 9,
                isCluster: false,
              };
            },
          );

          const targetUnit =
            this.session.currentState.units[atkEvt.payload.targetId];
          const firingArc = calculateFiringArc(
            unit.position,
            targetUnit.position,
            targetUnit.facing,
          );

          this.session = declareAttack(
            this.session,
            unitId,
            atkEvt.payload.targetId,
            weaponAttacks,
            3,
            RangeBracket.Short,
            firingArc,
          );
        }
        this.session = lockAttack(this.session, unitId);
      }
    }
  }

  isGameOver(): boolean {
    return isGameEnded(this.session.currentState, this.gameConfig);
  }

  getResult(): IGameOutcome | null {
    if (!this.isGameOver()) return null;
    return calculateGameOutcome({
      state: this.session.currentState,
      events: this.session.events,
      config: this.gameConfig,
      startedAt: this.startedAt,
      endedAt: new Date().toISOString(),
    });
  }
}
