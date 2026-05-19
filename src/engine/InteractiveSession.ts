/**
 * Interactive Session
 * Turn-by-turn game session with player and AI control.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { D6Roller, DiceRoller } from '@/utils/gameplay/diceTypes';

import {
  deriveCombatOutcome,
  type IDeriveCombatOutcomeOptions,
} from '@/lib/combat/outcome/combatOutcome';
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
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
  GameStatus,
  type IGameSession,
  type IGameConfig,
  type IGameUnit,
  type IGameEvent,
  type IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  MovementType,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  createGameSession,
  startGame,
  appendEvent,
  endGame,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';
import { declarePlayerWithdrawal } from '@/utils/gameplay/morale';

import type { IInteractiveSessionLinkage } from './InteractiveSession.types';
import type { IAdaptedUnit, IAvailableActions } from './types';

import { createMinimalGrid } from './GameEngine.helpers';
import {
  applyInteractiveSessionAttack,
  applyInteractiveSessionMovement,
} from './InteractiveSession.actions';
import { runInteractiveSessionAITurn } from './InteractiveSession.ai';
import { finalizeSessionOutcome } from './InteractiveSession.outcome';
import {
  hydrateSessionFromMatchLog,
  reportMatchLogDivergence,
  type MatchLogHydrationStorage,
} from './InteractiveSession.persistence';
import { advanceInteractiveSessionPhase } from './InteractiveSession.phases';
import { getAvailableActionsForState } from './InteractiveSession.queries';
import {
  d6RollerForResolvers,
  diceRollerForResolvers,
  physicalContextByUnit,
  waterDepthAt,
} from './InteractiveSession.resolvers';
import {
  buildInteractiveSessionGameConfig,
  buildInteractiveSessionUnitMaps,
} from './InteractiveSession.setup';

/**
 * Per `wire-encounter-to-campaign-round-trip` Wave 5: campaign linkage
 * the orchestrator threads into a session at construction time. The
 * engine never reads these fields itself — they're held verbatim and
 * stamped onto the published `ICombatOutcome` when the session ends so
 * the campaign store knows which contract / scenario / encounter the
 * outcome resolves.
 */
export type { IInteractiveSessionLinkage } from './InteractiveSession.types';

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
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): on the server
   * path, callers (`ServerMatchHost`) inject a roller backed by
   * `crypto.randomBytes` (or by a debug `SeededRandom` when the
   * `?seed=N` query param is set) so the server is the SOLE source of
   * randomness for game events. When omitted, resolvers fall back to
   * the engine's existing `defaultD6Roller` (`Math.random`) — preserves
   * single-player + hot-seat behavior.
   */
  private readonly d6Roller?: D6Roller;
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
    d6Roller?: D6Roller,
  ) {
    this.random = random;
    this.grid = grid;
    this.botPlayer = new BotPlayer(random);
    this.startedAt = new Date().toISOString();
    this.d6Roller = d6Roller;

    // Per-unit lookup maps + game-config assembly live in
    // `InteractiveSession.setup` so the constructor stays thin wiring.
    const maps = buildInteractiveSessionUnitMaps(
      playerUnits,
      opponentUnits,
      gameUnits,
    );
    this.weaponsByUnit = maps.weaponsByUnit;
    this.movementByUnit = maps.movementByUnit;
    this.gunneryByUnit = maps.gunneryByUnit;
    this.pilotingByUnit = maps.pilotingByUnit;
    this.tonnageByUnit = maps.tonnageByUnit;

    this.gameConfig = buildInteractiveSessionGameConfig(
      mapRadius,
      turnLimit,
      linkage,
    );
    this.linkage = linkage;

    this.session = createGameSession(this.gameConfig, gameUnits, {
      encounterMeta: linkage.encounterMeta,
    });
    this.session = startGame(this.session, GameSide.Player);
  }

  static async fromMatchLog(
    matchId: string,
    storage: MatchLogHydrationStorage = matchLogStorage,
  ): Promise<IGameSession> {
    return hydrateSessionFromMatchLog(matchId, storage);
  }

  /**
   * Per `harden-multiplayer-transport` (M2), design D3 — adopt a
   * pre-built `IGameSession` (rebuilt by replaying a persisted event
   * log) into a live `InteractiveSession`.
   *
   * Server-startup match recovery uses this to re-instantiate a
   * `ServerMatchHost` for every `active` match after a process restart.
   * The session's `config` + `units` drive the per-unit lookup maps so
   * the recovered host can continue to drive the engine — terminal
   * outcomes (`concede` / `abortMatch`), replay streaming, and host
   * migration all operate on the adopted state directly.
   *
   * The constructor would normally `createGameSession` + `startGame`
   * from scratch; here we skip that and splice the already-derived
   * session in over the freshly-created one so `currentState` reflects
   * the full replayed history rather than a fresh Setup-phase board.
   */
  static fromSession(session: IGameSession): InteractiveSession {
    const instance = new InteractiveSession(
      session.config.mapRadius,
      session.config.turnLimit,
      new SeededRandom(0xc0ffee),
      createMinimalGrid(session.config.mapRadius),
      [],
      [],
      session.units,
    );
    // Replace the fresh Setup-phase session with the replayed one so
    // `currentState` (status / turn / phase / board) matches history.
    instance.session = session;
    return instance;
  }

  getState(): IGameState {
    return this.session.currentState;
  }

  getSession(): IGameSession {
    return this.session;
  }

  appendEvent(event: IGameEvent): void {
    this.appendAndPersistEvent(event);
  }

  /**
   * Per `add-movement-phase-ui` § 2: surface the cached
   * `IMovementCapability` (walk/run/jump MP) for a unit so the
   * Movement-phase UI can derive reachable hexes without
   * re-adapting the unit catalog. Returns `null` when the id is
   * unknown (callers treat missing capability as "no movement").
   */
  getMovementCapability(unitId: string): IMovementCapability | null {
    return this.movementByUnit.get(unitId) ?? null;
  }

  /**
   * Per `add-movement-phase-ui` § 2: expose the cached `IHexGrid`
   * the engine builds at session start. The UI's
   * `deriveReachableHexes` + A* path-preview helpers both need the
   * same grid the pathfinder uses so movement costs stay in lockstep
   * with simulation outcomes.
   */
  getGrid(): IHexGrid {
    return this.grid;
  }

  getAvailableActions(unitId: string): IAvailableActions {
    return getAvailableActionsForState(
      this.session.currentState,
      unitId,
      this.weaponsByUnit,
    );
  }

  applyMovement(
    unitId: string,
    to: IHexCoordinate,
    facing: Facing,
    movementType: MovementType,
    path?: readonly IHexCoordinate[],
  ): void {
    // Declare-then-lock logic lives in `InteractiveSession.actions`.
    this.session = applyInteractiveSessionMovement({
      session: this.session,
      grid: this.grid,
      movementByUnit: this.movementByUnit,
      unitId,
      to,
      facing,
      movementType,
      path,
    });
    this.tryFinalizeAndPublish();
  }

  applyAttack(
    attackerId: string,
    targetId: string,
    weaponIds: readonly string[],
  ): void {
    // Declare-then-lock logic lives in `InteractiveSession.actions`.
    this.session = applyInteractiveSessionAttack({
      session: this.session,
      weaponsByUnit: this.weaponsByUnit,
      attackerId,
      targetId,
      weaponIds,
    });
    this.tryFinalizeAndPublish();
  }

  /**
   * Per `add-combat-morale-and-withdrawal` (D4): the player-facing
   * withdrawal action. Declares withdrawal for an owned unit toward the
   * chosen map `edge`. Emits a `WithdrawalDeclared` event
   * (`declaredBy: 'player'`) — the unit is then routed through the same
   * edge-ward movement + `UnitRetreated` exit the bot uses, and exits
   * when it reaches an edge hex.
   *
   * The declaration is sticky: a unit that is already withdrawing,
   * destroyed, or already retreated is a no-op (the player cannot
   * cancel a declared withdrawal).
   */
  declareWithdrawal(
    unitId: string,
    edge: 'north' | 'south' | 'east' | 'west',
  ): void {
    this.session = declarePlayerWithdrawal(this.session, unitId, edge);
    this.tryFinalizeAndPublish();
  }

  advancePhase(): void {
    // Per-phase transition logic lives in `InteractiveSession.phases`.
    // The class stays a thin coordinator: it threads its private state
    // through the phase-context callbacks and keeps ownership of the
    // trailing finalize/publish step so the once-per-session outcome
    // guard is not split across modules.
    advanceInteractiveSessionPhase({
      getSession: () => this.session,
      setSession: (session) => {
        this.session = session;
      },
      d6RollerForResolvers: () => this.d6RollerForResolvers(),
      diceRollerForResolvers: () => this.diceRollerForResolvers(),
      physicalContextByUnit: () => this.physicalContextByUnit(),
      waterDepthAt: (position) => this.waterDepthAt(position),
      isGameOver: () => this.isGameOver(),
    });
    // Wave 5: any phase transition can land us in a victory condition
    // (e.g., the final attack resolution destroys the last opponent
    // unit). Try to finalize+publish here so the campaign store is
    // notified within the same call.
    this.tryFinalizeAndPublish();
  }

  runAITurn(side: GameSide): void {
    runInteractiveSessionAITurn({
      side,
      getSession: () => this.session,
      setSession: (session) => {
        this.session = session;
      },
      appendAndPersistEvent: (event) => this.appendAndPersistEvent(event),
      weaponsByUnit: this.weaponsByUnit,
      movementByUnit: this.movementByUnit,
      gunneryByUnit: this.gunneryByUnit,
      pilotingByUnit: this.pilotingByUnit,
      tonnageByUnit: this.tonnageByUnit,
      grid: this.grid,
      botPlayer: this.botPlayer,
    });
    this.tryFinalizeAndPublish();
  }

  private appendAndPersistEvent(event: IGameEvent): void {
    this.session = appendEvent(this.session, event);
    void matchLogStorage
      .appendEvent(this.session.matchId ?? this.session.id, event)
      .catch((error: unknown) => {
        reportMatchLogDivergence(error);
      });
  }

  // Resolver-input shaping lives in `InteractiveSession.resolvers`.
  private physicalContextByUnit(): Map<string, IPhysicalAttackContext> {
    return physicalContextByUnit(
      this.session,
      this.tonnageByUnit,
      this.pilotingByUnit,
    );
  }

  /**
   * Per `add-victory-and-post-battle-summary` task 1.3 + B3 from the
   * Phase 1 review: end the match by surrender from `side`. Appends a
   * `GameEnded` event with `reason: 'concede'` and the OPPOSITE side
   * as winner.
   *
   * Per `add-victory-and-post-battle-summary` design D2 + spec scenario
   * "Concede rejected after completion": when the session is not in
   * `GameStatus.Active` (e.g., already `Completed` because the AI just
   * destroyed the player force, or the session is still in `Setup`),
   * the call SHALL throw `Error('Game is not active')` rather than
   * silently no-op. Surfacing the contract violation is what lets
   * tests + UI guards catch a wrongly-routed concede press.
   *
   * Wave 5 (`wire-encounter-to-campaign-round-trip`): every entry point
   * that may transition the session into `Completed` (concede here,
   * advancePhase / runAITurn / applyAttack indirectly via the auto-end
   * check) routes through `tryFinalizeAndPublish` so the
   * `CombatOutcomeReady` bus event fires exactly once per session.
   */
  concede(side: GameSide): void {
    if (this.session.currentState.status !== GameStatus.Active) {
      throw new Error('Game is not active');
    }
    const winner =
      side === GameSide.Player ? GameSide.Opponent : GameSide.Player;
    this.session = endGame(this.session, winner, 'concede');
    this.tryFinalizeAndPublish();
  }

  /**
   * Wave 4 reconnect timeout: an expired grace window is neither side's
   * victory, but it must still append a terminal `GameEnded` event so
   * persisted logs and reconnect replay converge on a completed match.
   */
  abortMatch(): void {
    if (this.session.currentState.status !== GameStatus.Active) {
      throw new Error('Game is not active');
    }
    this.session = endGame(this.session, 'draw', 'aborted');
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

    const result = finalizeSessionOutcome({
      session: this.session,
      gameConfig: this.gameConfig,
      startedAt: this.startedAt,
      linkage: this.linkage,
    });
    this.session = result.session;
    this.outcomePublished = result.published;
  }

  /**
   * Test-observability accessor for the once-per-session publish guard.
   * The capstone E2E test asserts double-publish suppression by reading
   * this flag.
   */
  hasPublishedOutcome(): boolean {
    return this.outcomePublished;
  }

  // Resolver-roller adapters live in `InteractiveSession.resolvers`.
  private d6RollerForResolvers(): D6Roller | undefined {
    return d6RollerForResolvers(this.d6Roller);
  }

  private diceRollerForResolvers(): DiceRoller | undefined {
    return diceRollerForResolvers(this.d6Roller);
  }

  // Heat-phase water-depth lookup lives in `InteractiveSession.resolvers`.
  private waterDepthAt(position: IHexCoordinate): number {
    return waterDepthAt(this.grid, position);
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
