/**
 * Interactive Session
 * Turn-by-turn game session with player and AI control.
 */

import type { IWeapon } from '@/simulation/ai/types';
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
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  MovementType,
  RangeBracket,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
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
} from '@/utils/gameplay/gameSession';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import type { IAdaptedUnit, IAvailableActions } from './types';

import { toAIUnitState, toMovementCapability } from './GameEngine.helpers';

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
    const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
      weaponIds,
      unitWeapons,
      attackerId,
    );

    // Firing arc is computed inside resolveAttack from current positions +
    // target facing at resolve time. No need to pre-compute here.
    this.session = declareAttack(
      this.session,
      attackerId,
      targetId,
      weaponAttacks,
      3,
      RangeBracket.Short,
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
          const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
            atkEvt.payload.weapons,
            weapons,
            unitId,
          );

          // Arc is computed inside resolveAttack at resolve time.
          this.session = declareAttack(
            this.session,
            unitId,
            atkEvt.payload.targetId,
            weaponAttacks,
            3,
            RangeBracket.Short,
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
