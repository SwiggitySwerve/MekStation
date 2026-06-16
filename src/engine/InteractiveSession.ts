/**
 * Interactive Session
 * Turn-by-turn game session with player and AI control.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';
import type {
  IIndirectFireResolution,
  WeaponFireMode,
} from '@/types/gameplay/IndirectFireInterfaces';
import type { D6Roller, DiceRoller } from '@/utils/gameplay/diceTypes';
import type {
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

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
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  type IGameCreatedPayload,
  type IGameSession,
  type IGameConfig,
  type IGameUnit,
  type IGameEvent,
  type IGameState,
  type MovementEnhancementActivationKind,
  type StandUpMode,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  MovementType,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  applyBattlefieldWreckTerrainForSessionEvents,
  terrainChangedPayloadFromBattlefieldWreckResult,
} from '@/utils/gameplay/battlefieldWreckTerrain';
import {
  createTerrainChangedEvent,
  createUnitEjectedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  activateMovementEnhancement as activateMovementEnhancementAction,
  createGameSession,
  startGame,
  appendEvent,
  attemptStandUp as attemptStandUpAction,
  declarePhysicalAttack,
  endGame,
  goProne as goProneAction,
  requestSpot as requestSpotAction,
  torsoTwist as torsoTwistAction,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';
import { declarePlayerWithdrawal } from '@/utils/gameplay/morale';
import { resolveRuntimeMovementCapability } from '@/utils/gameplay/movement';
import { applyTerrainOverridesToGrid } from '@/utils/gameplay/terrainState';

import type { IInteractiveSessionLinkage } from './InteractiveSession.types';
import type { IAdaptedUnit, IAvailableActions } from './types';

import { adaptUnit } from './adapters/CompendiumAdapter';
import {
  createGridFromHexTerrain,
  seedHexTerrainFromGrid,
} from './GameEngine.helpers';
import {
  applyInteractiveSessionAttack,
  applyInteractiveSessionMovement,
  applyInteractiveSessionRuntimeMovementState,
} from './InteractiveSession.actions';
import { runInteractiveSessionAITurn } from './InteractiveSession.ai';
import { computeIndirectFireContext as computeIndirectFireContextImpl } from './InteractiveSession.indirectFire';
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
  environmentHeatEffectAt,
  physicalContextByUnit,
  waterDepthAt,
} from './InteractiveSession.resolvers';
import {
  buildInteractiveSessionGameConfig,
  buildInteractiveSessionUnitMaps,
  gameUnitsWithAdaptedMovementModes,
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

function createRecoveredGridFromSession(session: IGameSession): IHexGrid {
  const created = session.events.find(
    (event) => event.type === GameEventType.GameCreated,
  );
  const initialTerrain =
    (created?.payload as IGameCreatedPayload | undefined)?.hexTerrain ?? [];

  return applyTerrainOverridesToGrid(
    createGridFromHexTerrain(session.config.mapRadius, initialTerrain),
    session.currentState.terrainOverrides,
  );
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
    optionalRules: readonly string[] = [],
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
      optionalRules,
    );
    this.linkage = linkage;

    const gameUnitsWithMovementModes = gameUnitsWithAdaptedMovementModes(
      gameUnits,
      playerUnits,
      opponentUnits,
    );

    this.session = createGameSession(
      this.gameConfig,
      gameUnitsWithMovementModes,
      {
        encounterMeta: linkage.encounterMeta,
        hexTerrain: seedHexTerrainFromGrid(this.grid),
      },
    );
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
      createRecoveredGridFromSession(session),
      [],
      [],
      session.units,
      {},
      undefined,
      session.config.optionalRules,
    );
    // Replace the fresh Setup-phase session with the replayed one so
    // `currentState` (status / turn / phase / board) matches history.
    instance.session = session;
    return instance;
  }

  /**
   * Per `fix-recovered-session-adapted-units` (closes playtest gap #2):
   * async recovery factory that RE-DERIVES the per-unit adapted state
   * from each game unit's `unitRef` against the canonical unit catalog,
   * matching the bootstrap path's `weaponsByUnit` / `movementByUnit` /
   * gunnery / piloting / tonnage maps.
   *
   * The plain `fromSession` adoption skipped this step, so a session
   * recovered after a server restart had EMPTY adapted-units maps —
   * which broke move/attack play (the engine's `getAvailableActions`
   * returned empty lists, and any action throw'd because the per-unit
   * weapon / movement capability lookup hit `undefined`).
   *
   * Callers that need the recovered session to accept new intents
   * (move, attack) MUST use `fromSessionAsync`. The sync `fromSession`
   * remains for callers that only need the data-shape adoption
   * (terminal-outcome derivation, replay streaming) — those paths
   * don't need adapted-units maps.
   *
   * Throws nothing — units whose `unitRef` is not in the catalog are
   * skipped with a console.warn (the recovered host still has the
   * other units' adapted state, which is better than a hard failure).
   */
  static async fromSessionAsync(
    session: IGameSession,
  ): Promise<InteractiveSession> {
    const adapted = await deriveAdaptedUnitsFromSession(session);
    const playerAdapted = adapted.filter((u) => u.side === GameSide.Player);
    const opponentAdapted = adapted.filter((u) => u.side === GameSide.Opponent);

    const instance = new InteractiveSession(
      session.config.mapRadius,
      session.config.turnLimit,
      new SeededRandom(0xc0ffee),
      createRecoveredGridFromSession(session),
      playerAdapted,
      opponentAdapted,
      session.units,
      {},
      undefined,
      session.config.optionalRules,
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
    const capability = this.movementByUnit.get(unitId);
    if (!capability) return null;
    const unit = this.session.currentState.units[unitId];
    return unit
      ? (resolveRuntimeMovementCapability(unit, capability) ?? capability)
      : capability;
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

  /**
   * Per `add-indirect-fire-and-spotter-network` §1 (Engine Integration Contract):
   * single integration point between the engine and the indirect-fire helper.
   *
   * Enumerates `ISpotterCandidate[]` from the current `gameState`, calls the
   * existing `resolveIndirectFire` helper, and returns an `IIndirectFireResolution`
   * for the to-hit pipeline to consume before the attack roll resolves.
   *
   * @param attackerId - The unit declaring the attack.
   * @param weaponId   - The weapon slot being fired (used for eligibility check).
   * @param targetHex  - Hex coordinate of the target.
   * @returns `IIndirectFireResolution` with `permitted`, `isIndirect`, `spotterId`,
   *          `basis`, `toHitPenalty`, and optionally `reason`.
   *
   * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md
   */
  computeIndirectFireContext(
    attackerId: string,
    weaponId: string,
    targetHex: IHexCoordinate,
  ): IIndirectFireResolution {
    return computeIndirectFireContextImpl(
      attackerId,
      weaponId,
      targetHex,
      this.session.currentState,
      this.grid,
      undefined,
      undefined,
      this.session.config.optionalRules,
    );
  }

  applyMovement(
    unitId: string,
    to: IHexCoordinate,
    facing: Facing,
    movementType: MovementType,
    path?: readonly IHexCoordinate[],
    standUpMode?: StandUpMode,
    options?: {
      readonly hullDownEntryAttempt?: boolean;
      readonly goProneAttempt?: boolean;
    },
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
      standUpMode,
      hullDownEntryAttempt: options?.hullDownEntryAttempt,
      goProneAttempt: options?.goProneAttempt,
      diceRoller: this.diceRollerForResolvers(),
    });
    this.tryFinalizeAndPublish();
  }

  attemptStandUp(unitId: string, mode?: StandUpMode): void {
    if (this.session.currentState.status !== GameStatus.Active) return;
    if (this.session.currentState.phase !== GamePhase.Movement) return;

    this.session = attemptStandUpAction(
      this.session,
      unitId,
      this.diceRollerForResolvers(),
      mode,
    );
    this.tryFinalizeAndPublish();
  }

  goProne(unitId: string): void {
    this.session = goProneAction(this.session, unitId);
    this.tryFinalizeAndPublish();
  }

  activateMovementEnhancement(
    unitId: string,
    enhancement: MovementEnhancementActivationKind,
  ): void {
    this.session = activateMovementEnhancementAction(
      this.session,
      unitId,
      enhancement,
    );
    this.tryFinalizeAndPublish();
  }

  torsoTwist(unitId: string, secondaryFacing: Facing): void {
    this.session = torsoTwistAction(this.session, unitId, secondaryFacing);
    this.tryFinalizeAndPublish();
  }

  applyRuntimeMovementState(
    unitId: string,
    patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  ): void {
    this.session = applyInteractiveSessionRuntimeMovementState({
      session: this.session,
      unitId,
      patch,
      diceRoller: this.d6RollerForResolvers(),
      tonnageByUnit: this.tonnageByUnit,
    });
    this.tryFinalizeAndPublish();
  }

  applyAttack(
    attackerId: string,
    targetId: string,
    weaponIds: readonly string[],
    weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>,
    selectedAMSWeaponIds?: Readonly<Record<string, string>>,
  ): void {
    // Declare-then-lock logic lives in `InteractiveSession.actions`.
    // Wave 8 PR-K5: pass the grid + target hex so the action layer can
    // pre-compute the indirect-fire resolution and thread it into
    // `declareAttack` (engine path established by PR-K + PR-K4).
    const targetUnit = this.session.currentState.units[targetId];
    this.session = applyInteractiveSessionAttack({
      session: this.session,
      weaponsByUnit: this.weaponsByUnit,
      attackerId,
      targetId,
      weaponIds,
      weaponModesByWeaponId,
      selectedAMSWeaponIds,
      grid: this.grid,
      targetHex: targetUnit?.position,
    });
    this.tryFinalizeAndPublish();
  }

  applyPhysicalAttack(
    attackerId: string,
    targetId: string,
    attackType: PhysicalAttackType,
    limb?: PhysicalAttackLimb,
  ): void {
    const baseContext = this.physicalContextByUnit().get(attackerId);
    if (!baseContext) return;
    const elevationDifference = this.elevationDifferenceBetween(
      attackerId,
      targetId,
    );
    const context: IPhysicalAttackContext = {
      ...baseContext,
      ...this.buildJumpJetAttackSessionContext(
        attackerId,
        attackType,
        limb,
        baseContext,
        elevationDifference,
      ),
      elevationDifference,
      limb,
      targetMovementComplete: true,
    };

    this.session = declarePhysicalAttack(
      this.session,
      attackerId,
      targetId,
      attackType,
      context,
    );
    this.tryFinalizeAndPublish();
  }

  private buildJumpJetAttackSessionContext(
    attackerId: string,
    attackType: PhysicalAttackType,
    limb: PhysicalAttackLimb | undefined,
    baseContext: IPhysicalAttackContext,
    elevationDifference: number,
  ): Partial<IPhysicalAttackContext> {
    if (attackType !== 'jump-jet-attack') return {};

    const jumpMP = this.movementByUnit.get(attackerId)?.jumpMP ?? 0;
    if (jumpMP <= 0) return {};

    const selectedLeg =
      baseContext.jumpJetAttackSelectedLeg ??
      (limb === 'leftLeg' ? 'left' : 'right');
    const selectedLeftLeg = selectedLeg === 'left' || selectedLeg === 'both';
    const selectedRightLeg = selectedLeg === 'right' || selectedLeg === 'both';

    return {
      attackerJumpMP: baseContext.attackerJumpMP ?? jumpMP,
      jumpJetAttackSelectedLeg: selectedLeg,
      standingAttackerHeightAboveTargetHeight:
        baseContext.standingAttackerHeightAboveTargetHeight ??
        1 - elevationDifference,
      leftReadyJumpJetCount: selectedLeftLeg
        ? (baseContext.leftReadyJumpJetCount ?? jumpMP)
        : baseContext.leftReadyJumpJetCount,
      rightReadyJumpJetCount: selectedRightLeg
        ? (baseContext.rightReadyJumpJetCount ?? jumpMP)
        : baseContext.rightReadyJumpJetCount,
    };
  }

  requestSpot(unitId: string, targetId: string): void {
    this.session = requestSpotAction(this.session, unitId, targetId);
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

  ejectUnit(unitId: string): void {
    if (this.session.currentState.status !== GameStatus.Active) return;

    const unit = this.session.currentState.units[unitId];
    if (!unit || unit.destroyed || unit.hasRetreated || unit.hasEjected) {
      return;
    }

    this.appendAndPersistEvent(
      createUnitEjectedEvent(
        this.session.id,
        this.session.events.length,
        this.session.currentState.turn,
        this.session.currentState.phase,
        unitId,
        'player_declared',
      ),
    );
    this.tryFinalizeAndPublish();
  }

  advancePhase(): void {
    // Per-phase transition logic lives in `InteractiveSession.phases`.
    // The class stays a thin coordinator: it threads its private state
    // through the phase-context callbacks and keeps ownership of the
    // trailing finalize/publish step so the once-per-session outcome
    // guard is not split across modules.
    const sessionBeforePhase = this.session;
    advanceInteractiveSessionPhase({
      getSession: () => this.session,
      setSession: (session) => {
        this.session = session;
      },
      d6RollerForResolvers: () => this.d6RollerForResolvers(),
      diceRollerForResolvers: () => this.diceRollerForResolvers(),
      physicalContextByUnit: () => this.physicalContextByUnit(),
      grid: () => this.grid,
      waterDepthAt: (position) => this.waterDepthAt(position),
      environmentHeatEffectAt: (position) =>
        this.environmentHeatEffectAt(position),
      isGameOver: () => this.isGameOver(),
    });
    this.applyBattlefieldWreckTerrainForNewEvents(sessionBeforePhase);
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
    const sessionBeforeEvent = this.session;
    this.session = appendEvent(this.session, event);
    this.persistMatchLogEvent(event);
    this.applyBattlefieldWreckTerrainForNewEvents(sessionBeforeEvent);
  }

  private persistMatchLogEvent(event: IGameEvent): void {
    void matchLogStorage
      .appendEvent(this.session.matchId ?? this.session.id, event)
      .catch((error: unknown) => {
        reportMatchLogDivergence(error);
      });
  }

  private applyBattlefieldWreckTerrainForNewEvents(
    sessionBeforeEvents: IGameSession,
  ): void {
    const newEvents = this.session.events.slice(
      sessionBeforeEvents.events.length,
    );
    const results = applyBattlefieldWreckTerrainForSessionEvents(
      this.grid,
      sessionBeforeEvents,
      newEvents,
      this.tonnageByUnit,
    );
    for (const result of results) {
      const payload = terrainChangedPayloadFromBattlefieldWreckResult(result);
      if (payload === null) continue;
      const event = createTerrainChangedEvent(
        this.session.id,
        this.session.events.length,
        this.session.currentState.turn,
        this.session.currentState.phase,
        payload,
      );
      this.session = appendEvent(this.session, event);
      this.persistMatchLogEvent(event);
    }
  }

  // Resolver-input shaping lives in `InteractiveSession.resolvers`.
  private physicalContextByUnit(): Map<string, IPhysicalAttackContext> {
    return physicalContextByUnit(
      this.session,
      this.tonnageByUnit,
      this.pilotingByUnit,
      this.grid,
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

  private elevationDifferenceBetween(
    attackerId: string,
    targetId: string,
  ): number {
    const attacker = this.session.currentState.units[attackerId];
    const target = this.session.currentState.units[targetId];
    if (!attacker || !target) return 0;
    const attackerHex = this.grid.hexes.get(
      `${attacker.position.q},${attacker.position.r}`,
    );
    const targetHex = this.grid.hexes.get(
      `${target.position.q},${target.position.r}`,
    );
    return (targetHex?.elevation ?? 0) - (attackerHex?.elevation ?? 0);
  }

  private environmentHeatEffectAt(position: IHexCoordinate): number {
    return environmentHeatEffectAt(this.grid, position);
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

/**
 * Per `fix-recovered-session-adapted-units` (closes playtest gap #2):
 * re-derive adapted units from each game unit's `unitRef` against the
 * canonical unit catalog. The bootstrap path's
 * `preBattleSessionBuilder.adaptParticipants` runs the same `adaptUnit`
 * call per participant; this helper is the recovery-path mirror. Both
 * paths converge on the same `IAdaptedUnit` shape so a recovered
 * session is byte-equivalent to a freshly-bootstrapped one with the
 * same units (bootstrap parity, per spec scenario "Recovered session
 * adapted-units match bootstrap parity").
 *
 * Exported for the recovery test only — production code should use
 * `InteractiveSession.fromSessionAsync`.
 */
export async function deriveAdaptedUnitsFromSession(
  session: IGameSession,
): Promise<IAdaptedUnit[]> {
  const adapted: IAdaptedUnit[] = [];
  for (const gameUnit of session.units) {
    const adaptedUnit = await adaptUnit(gameUnit.unitRef, {
      side: gameUnit.side,
    });
    if (adaptedUnit === null) {
      // eslint-disable-next-line no-console
      console.warn(
        `[InteractiveSession.fromSessionAsync] unit '${gameUnit.id}' ` +
          `(unitRef '${gameUnit.unitRef}') not found in the canonical ` +
          `catalog — skipping. The recovered host will not have adapted ` +
          `state for this unit and any action targeting it will fail.`,
      );
      continue;
    }
    adapted.push(adaptedUnit);
  }
  return adapted;
}
