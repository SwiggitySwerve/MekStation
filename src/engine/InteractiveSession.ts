/**
 * Interactive Session
 * Turn-by-turn game session with player and AI control.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import {
  publishCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import {
  deriveCombatOutcome,
  type IDeriveCombatOutcomeOptions,
} from '@/lib/combat/outcome/combatOutcome';
import {
  calculateGameOutcome,
  isGameEnded,
  type IGameOutcome,
} from '@/services/game-resolution/GameOutcomeCalculator';
import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  CombatNotCompleteError,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import {
  GameSide,
  GamePhase,
  GameStatus,
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
import { createRetreatTriggeredEvent } from '@/utils/gameplay/gameEvents';
import {
  createGameSession,
  startGame,
  advancePhase,
  appendEvent,
  rollInitiative,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  resolveAllAttacks,
  resolveHeatPhase,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  endGame,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import type { IAdaptedUnit, IAvailableActions } from './types';

import { toAIUnitState, toMovementCapability } from './GameEngine.helpers';

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5: campaign linkage
 * the orchestrator threads into a session at construction time. The
 * engine never reads these fields itself — they're held verbatim and
 * stamped onto the published `ICombatOutcome` when the session ends so
 * the campaign store knows which contract / scenario / encounter the
 * outcome resolves.
 */
export interface IInteractiveSessionLinkage {
  readonly contractId?: string | null;
  readonly scenarioId?: string | null;
  readonly encounterId?: string | null;
}

export class InteractiveSession {
  private session: IGameSession;
  private readonly gameConfig: IGameConfig;
  private readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  private readonly movementByUnit: Map<string, IMovementCapability>;
  private readonly gunneryByUnit: Map<string, number>;
  // Per `wire-bot-ai-helpers-and-capstone`: piloting + tonnage are
  // required by `declarePhysicalAttack` / `resolveAllPhysicalAttacks`.
  // Sourced from `IGameUnit` (piloting) and the adapter (tonnage stays
  // as the Phase 1 default until catalog data flows through).
  private readonly pilotingByUnit: Map<string, number>;
  private readonly tonnageByUnit: Map<string, number>;
  private readonly random: SeededRandom;
  private readonly grid: IHexGrid;
  private readonly botPlayer: BotPlayer;
  private startedAt: string;
  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5: dedupe guard so
   * `CombatOutcomeReady` fires exactly once per session even when
   * multiple methods ((concede + advancePhase) cause us to re-evaluate
   * `isGameOver`). Spec: "Event idempotent per session".
   */
  private outcomePublished = false;
  private readonly linkage: IInteractiveSessionLinkage;

  constructor(
    mapRadius: number,
    turnLimit: number,
    random: SeededRandom,
    grid: IHexGrid,
    playerUnits: readonly IAdaptedUnit[],
    opponentUnits: readonly IAdaptedUnit[],
    gameUnits: readonly IGameUnit[],
    linkage: IInteractiveSessionLinkage = {},
  ) {
    this.random = random;
    this.grid = grid;
    this.botPlayer = new BotPlayer(random);
    this.startedAt = new Date().toISOString();

    this.weaponsByUnit = new Map();
    this.movementByUnit = new Map();
    this.gunneryByUnit = new Map();
    this.pilotingByUnit = new Map();
    this.tonnageByUnit = new Map();

    for (const u of [...playerUnits, ...opponentUnits]) {
      this.weaponsByUnit.set(u.id, u.weapons);
      this.movementByUnit.set(u.id, toMovementCapability(u));
      // Phase 1 stand-in: catalog tonnage isn't on `IAdaptedUnit` yet,
      // so we default to 65t (matches `SimulationRunnerConstants`).
      this.tonnageByUnit.set(u.id, 65);
    }
    for (const gu of gameUnits) {
      this.gunneryByUnit.set(gu.id, gu.gunnery);
      this.pilotingByUnit.set(gu.id, gu.piloting);
    }

    this.gameConfig = {
      mapRadius,
      turnLimit,
      victoryConditions: ['elimination'],
      optionalRules: [],
      // Wave 5 linkage: round-trip identifiers stamped on the config so
      // any later consumer of `IGameSession` (review UI, persistence
      // layer) can read them without keeping a parallel map.
      encounterId: linkage.encounterId ?? null,
      contractId: linkage.contractId ?? null,
      scenarioId: linkage.scenarioId ?? null,
    };
    this.linkage = linkage;

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
    this.tryFinalizeAndPublish();
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
    this.tryFinalizeAndPublish();
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
      // Per `wire-bot-ai-helpers-and-capstone`: resolve any
      // PhysicalAttackDeclared events for the current turn before
      // advancing — without this, declarations made by `runAITurn`
      // would silently expire when the phase rolls over.
      this.session = resolveAllPhysicalAttacks(
        this.session,
        this.physicalContextByUnit(),
      );
      this.session = advancePhase(this.session);
    } else if (phase === GamePhase.Heat) {
      this.session = resolveHeatPhase(this.session);
      this.session = advancePhase(this.session);
    } else if (phase === GamePhase.End) {
      if (!this.isGameOver()) {
        this.session = advancePhase(this.session);
      }
    }
    // Wave 5: any phase transition can land us in a victory condition
    // (e.g., the final attack resolution destroys the last opponent
    // unit). Try to finalize+publish here so the campaign store is
    // notified within the same call.
    this.tryFinalizeAndPublish();
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
        // Per `wire-bot-ai-helpers-and-capstone`: evaluate retreat
        // BEFORE movement so the move scorer sees `isRetreating: true`
        // when picking the destination.
        this.maybeEmitRetreat(unitId, weapons, gunnery);
        const refreshedUnit = this.session.currentState.units[unitId];
        const aiUnit = toAIUnitState(refreshedUnit, weapons, gunnery);
        const moveEvt = this.botPlayer.playMovementPhase(
          aiUnit,
          this.grid,
          cap,
        );
        if (moveEvt) {
          this.session = declareMovement(
            this.session,
            unitId,
            refreshedUnit.position,
            moveEvt.payload.to,
            moveEvt.payload.facing as Facing,
            moveEvt.payload.movementType,
            moveEvt.payload.mpUsed,
            moveEvt.payload.heatGenerated,
          );
        }
        this.session = lockMovement(this.session, unitId);
      } else if (phase === GamePhase.WeaponAttack) {
        // Per `wire-bot-ai-helpers-and-capstone`: re-evaluate retreat
        // here too — a unit might trigger retreat from damage taken
        // during weapon resolution this turn.
        this.maybeEmitRetreat(unitId, weapons, gunnery);
        const refreshedUnit = this.session.currentState.units[unitId];
        const aiUnit = toAIUnitState(refreshedUnit, weapons, gunnery);
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
      } else if (phase === GamePhase.PhysicalAttack) {
        // Per `wire-bot-ai-helpers-and-capstone`: declare physical
        // attacks during the PhysicalAttack phase. The phase resolver
        // (advancePhase) calls `resolveAllPhysicalAttacks` to actually
        // apply damage / PSRs / `PhysicalAttackResolved` events.
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
        const physEvt = this.botPlayer.playPhysicalAttackPhase(aiUnit, enemies);
        if (physEvt) {
          const piloting = this.pilotingByUnit.get(unitId) ?? 5;
          this.session = declarePhysicalAttack(
            this.session,
            physEvt.payload.attackerId,
            physEvt.payload.targetId,
            physEvt.payload.attackType,
            {
              attackerTonnage: this.tonnageByUnit.get(unitId) ?? 65,
              pilotingSkill: piloting,
              hexesMoved: unit.hexesMovedThisTurn,
            },
          );
        }
      }
    }
    // Wave 5: AI turn might have eliminated the player force; check
    // game-over here so the bus fires before control returns to the
    // caller.
    this.tryFinalizeAndPublish();
  }

  /**
   * Per `wire-bot-ai-helpers-and-capstone`: helper that runs the bot's
   * retreat evaluation against the live session and appends the
   * resulting RetreatTriggered event when the trigger fires. Idempotent
   * — once `isRetreating` is true, `evaluateRetreat` returns null on
   * subsequent calls.
   */
  private maybeEmitRetreat(
    unitId: string,
    weapons: readonly IWeapon[],
    gunnery: number,
  ): void {
    const unit = this.session.currentState.units[unitId];
    if (!unit) return;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const evt = this.botPlayer.evaluateRetreat(aiUnit, this.session);
    if (!evt) return;
    const sequence = this.session.events.length;
    const { turn, phase } = this.session.currentState;
    this.session = appendEvent(
      this.session,
      createRetreatTriggeredEvent(
        this.session.id,
        sequence,
        turn,
        phase,
        evt.payload.unitId,
        evt.payload.edge,
        evt.payload.reason,
      ),
    );
  }

  /**
   * Per `wire-bot-ai-helpers-and-capstone`: build the per-attacker
   * physical-attack context map needed by `resolveAllPhysicalAttacks`.
   * Defaults match the SimulationRunner stand-ins (65t / piloting 5)
   * when caller-supplied data is absent.
   */
  private physicalContextByUnit(): Map<string, IPhysicalAttackContext> {
    const map = new Map<string, IPhysicalAttackContext>();
    for (const [unitId, unit] of Object.entries(
      this.session.currentState.units,
    )) {
      map.set(unitId, {
        attackerTonnage: this.tonnageByUnit.get(unitId) ?? 65,
        pilotingSkill: this.pilotingByUnit.get(unitId) ?? 5,
        hexesMoved: unit.hexesMovedThisTurn,
      });
    }
    return map;
  }

  /**
   * Per `add-victory-and-post-battle-summary` task 1.3 + B3 from the
   * Phase 1 review: end the match by surrender from `side`. Appends a
   * `GameEnded` event with `reason: 'concede'` and the OPPOSITE side
   * as winner. No-op if the game is already over (or in setup).
   *
   * Wave 5 (`wire-encounter-to-campaign-round-trip`): every entry point
   * that may transition the session into `Completed` (concede here,
   * advancePhase / runAITurn / applyAttack indirectly via the auto-end
   * check) routes through `tryFinalizeAndPublish` so the
   * `CombatOutcomeReady` bus event fires exactly once per session.
   */
  concede(side: GameSide): void {
    if (this.isGameOver()) {
      this.tryFinalizeAndPublish();
      return;
    }
    if (this.session.currentState.status !== GameStatus.Active) return;
    const winner =
      side === GameSide.Player ? GameSide.Opponent : GameSide.Player;
    this.session = endGame(this.session, winner, 'concede');
    this.tryFinalizeAndPublish();
  }

  /**
   * Auto-finalize the session when the win-condition predicate trips
   * (turn limit reached, side eliminated) but no explicit `endGame` has
   * fired yet, then publish `CombatOutcomeReady` exactly once. Idempotent
   * — once `outcomePublished` is true, subsequent calls are no-ops.
   *
   * The publishing path is intentionally synchronous: subscribers run
   * inside `publishCombatOutcome`, so by the time this method returns
   * the campaign store has already enqueued the outcome (see
   * `useCampaignStore.subscribeToOutcomeBus`). This makes the round-trip
   * provable in a single tick — exactly what the capstone integration
   * test relies on.
   */
  private tryFinalizeAndPublish(): void {
    if (this.outcomePublished) return;
    if (!this.isGameOver()) return;

    // Auto-end via the win-condition predicate when status is still
    // Active. Without this, naturally-ended games (turn limit, side
    // elimination) never reach `Completed`, and `getOutcome()` would
    // throw `CombatNotCompleteError`.
    if (this.session.currentState.status === GameStatus.Active) {
      const result = calculateGameOutcome({
        state: this.session.currentState,
        events: this.session.events,
        config: this.gameConfig,
        startedAt: this.startedAt,
        endedAt: new Date().toISOString(),
      });
      const reason: 'destruction' | 'concede' | 'turn_limit' | 'objective' =
        result.reason === 'concede'
          ? 'concede'
          : result.reason === 'turn_limit'
            ? 'turn_limit'
            : result.reason === 'objective'
              ? 'objective'
              : 'destruction';
      // `IGameOutcome.winner` uses the string-literal form ("player" /
      // "opponent" / "draw") while `endGame` expects `GameSide | "draw"`.
      // The string values are identical to GameSide enum values, so the
      // cast is sound — we re-narrow to the engine's enum form here.
      const winner: GameSide | 'draw' =
        result.winner === 'draw' ? 'draw' : (result.winner as GameSide);
      this.session = endGame(this.session, winner, reason);
    }

    if (this.session.currentState.status !== GameStatus.Completed) {
      return;
    }

    let outcome: ICombatOutcome;
    try {
      outcome = deriveCombatOutcome(this.session, {
        contractId: this.linkage.contractId ?? undefined,
        scenarioId: this.linkage.scenarioId ?? undefined,
      });
    } catch {
      // Defensive: outcome derivation should never throw post-Completed,
      // but we don't want a derivation bug to make the engine unusable.
      return;
    }

    this.outcomePublished = true;
    const event: ICombatOutcomeReadyEvent = {
      matchId: outcome.matchId,
      outcome,
    };
    publishCombatOutcome(event);
  }

  /**
   * Test-observability accessor for the once-per-session publish guard.
   * The capstone E2E test asserts double-publish suppression by reading
   * this flag.
   */
  hasPublishedOutcome(): boolean {
    return this.outcomePublished;
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

  /**
   * Per `add-combat-outcome-model` task 3.1: derive the campaign-facing
   * `ICombatOutcome` for the just-finished match. Only valid once the
   * session has reached `GameStatus.Completed`; throws
   * `CombatNotCompleteError` otherwise so callers cannot accidentally
   * persist outcomes mid-match.
   *
   * `options.contractId` / `options.scenarioId` are the Wave 5 wiring
   * hooks: the engine never knows them, but the campaign orchestrator
   * passes them through here so the persisted outcome is self-describing.
   */
  getOutcome(options: IDeriveCombatOutcomeOptions = {}): ICombatOutcome {
    if (!this.isGameOver()) {
      throw new CombatNotCompleteError();
    }
    // Wave 5: ensure the session reaches `Completed` and the bus event
    // fires before we return — keeps `getOutcome()` as a one-stop entry
    // for legacy callers (review page, tests) that don't go through the
    // phase-transition methods.
    this.tryFinalizeAndPublish();
    // Merge caller-provided options with our linkage so explicit
    // callsite overrides win (tests sometimes inject deterministic
    // capturedAt values).
    const merged: IDeriveCombatOutcomeOptions = {
      contractId: options.contractId ?? this.linkage.contractId ?? undefined,
      scenarioId: options.scenarioId ?? this.linkage.scenarioId ?? undefined,
      capturedAt: options.capturedAt,
    };
    return deriveCombatOutcome(this.session, merged);
  }
}
