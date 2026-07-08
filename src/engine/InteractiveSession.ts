/**
 * Interactive Session
 * Turn-by-turn game session with player and AI control.
 */

import type { IGameOutcome } from '@/services/game-resolution/GameOutcomeCalculator';
import type { IWeapon } from '@/simulation/ai/types';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';
import type {
  IIndirectFireResolution,
  WeaponFireMode,
} from '@/types/gameplay/IndirectFireInterfaces';
import type { D6Roller } from '@/utils/gameplay/diceTypes';
import type {
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import { type IDeriveCombatOutcomeOptions } from '@/lib/combat/outcome/combatOutcome';
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameSide,
  GameStatus,
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
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  dispatchVibroClawAttack,
  type VibroClawDispatchResult,
} from '@/utils/gameplay/battlearmor/vibroClawDispatch';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';

import type { IVolleyGroup } from './InteractiveSession.actions';
import type { IInteractiveSessionRuntimeContext } from './InteractiveSession.runtime';
import type { IInteractiveSessionLinkage } from './InteractiveSession.types';
import type { IAdaptedUnit, IAvailableActions } from './types';

import { seedHexTerrainFromGrid } from './GameEngine.helpers';
import {
  computeInteractiveSessionIndirectFireContext,
  getInteractiveSessionAvailableActions,
  getInteractiveSessionGrid,
  getInteractiveSessionMovementCapability,
  getInteractiveSessionSession,
  getInteractiveSessionState,
  getInteractiveSessionUnitWeapons,
} from './InteractiveSession.accessors';
import {
  activateInteractiveSessionMovementEnhancement,
  applyInteractiveSessionAttackCommand,
  applyInteractiveSessionMovementCommand,
  applyInteractiveSessionPhysicalAttackCommand,
  applyInteractiveSessionRuntimeMovementStateCommand,
  applyInteractiveSessionVolleyCommand,
  attemptInteractiveSessionStandUp,
  declareInteractiveSessionWithdrawal,
  ejectInteractiveSessionUnit,
  goInteractiveSessionProne,
  requestInteractiveSessionSpot,
  twistInteractiveSessionTorso,
  type ApplyMovementArgs,
  type IInteractiveSessionPhysicalAttackOptions,
} from './InteractiveSession.commands';
import {
  abortInteractiveSession,
  advanceInteractiveSession,
  applyCorrectedInteractiveSessionState,
  concedeInteractiveSession,
  getInteractiveSessionOutcome,
  getInteractiveSessionResult,
  hasInteractiveSessionPublishedOutcome,
  isInteractiveSessionGameOver,
  runInteractiveSessionAI,
} from './InteractiveSession.lifecycle';
import {
  hydrateRecoverableSessionFromMatchLog,
  hydrateSessionFromMatchLog,
  type MatchLogHydrationStorage,
} from './InteractiveSession.persistence';
import {
  createRecoveredGridFromSession,
  deriveAdaptedUnitsFromSession,
} from './InteractiveSession.recovery';
import { appendAndPersistInteractiveSessionEvent } from './InteractiveSession.sessionEvents';
import {
  buildInteractiveSessionGameConfig,
  buildInteractiveSessionUnitMaps,
  gameUnitsWithAdaptedCombatSeeds,
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
export { deriveAdaptedUnitsFromSession } from './InteractiveSession.recovery';

type InteractiveSessionConstructorArgs = [
  mapRadius: number,
  turnLimit: number,
  random: SeededRandom,
  grid: IHexGrid,
  playerUnits: readonly IAdaptedUnit[],
  opponentUnits: readonly IAdaptedUnit[],
  gameUnits: readonly IGameUnit[],
  linkage?: IInteractiveSessionLinkage,
  d6Roller?: D6Roller,
  optionalRules?: readonly string[],
  victoryConditions?: readonly string[],
];

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
  private readonly runtimeContext: IInteractiveSessionRuntimeContext;
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
  private matchLogDiverged = false;
  private readonly linkage: IInteractiveSessionLinkage;

  constructor(...args: InteractiveSessionConstructorArgs) {
    const [
      mapRadius,
      turnLimit,
      random,
      grid,
      playerUnits,
      opponentUnits,
      gameUnits,
      linkage = {},
      d6Roller,
      optionalRules = [],
      victoryConditions = ['elimination'],
    ] = args;
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
      victoryConditions,
    );
    this.linkage = linkage;

    const gameUnitsWithCombatSeeds = gameUnitsWithAdaptedCombatSeeds(
      gameUnits,
      playerUnits,
      opponentUnits,
    );

    this.session = createGameSession(
      this.gameConfig,
      gameUnitsWithCombatSeeds,
      {
        encounterMeta: linkage.encounterMeta,
        hexTerrain: seedHexTerrainFromGrid(this.grid),
      },
    );
    this.session = startGame(this.session, GameSide.Player);
    this.runtimeContext = this.createRuntimeContext();
  }

  private createRuntimeContext(): IInteractiveSessionRuntimeContext {
    return {
      gameConfig: this.gameConfig,
      weaponsByUnit: this.weaponsByUnit,
      movementByUnit: this.movementByUnit,
      gunneryByUnit: this.gunneryByUnit,
      pilotingByUnit: this.pilotingByUnit,
      tonnageByUnit: this.tonnageByUnit,
      grid: this.grid,
      botPlayer: this.botPlayer,
      d6Roller: this.d6Roller,
      startedAt: this.startedAt,
      linkage: this.linkage,
      getSession: () => this.session,
      setSession: (session) => {
        this.session = session;
      },
      getOutcomePublished: () => this.outcomePublished,
      setOutcomePublished: (published) => {
        this.outcomePublished = published;
      },
      markMatchLogDiverged: () => {
        this.matchLogDiverged = true;
      },
      hasMatchLogDiverged: () => this.matchLogDiverged,
    };
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
      session.config.victoryConditions,
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
      session.config.victoryConditions,
    );
    // Replace the fresh Setup-phase session with the replayed one so
    // `currentState` (status / turn / phase / board) matches history.
    instance.session = session;
    return instance;
  }

  getState = (): IGameState => {
    return getInteractiveSessionState(this.runtimeContext);
  };

  getSession = (): IGameSession => {
    return getInteractiveSessionSession(this.runtimeContext);
  };

  appendEvent = (event: IGameEvent): void => {
    appendAndPersistInteractiveSessionEvent(this.runtimeContext, event);
  };

  applyCorrectedState = (newState: IGameState): void =>
    applyCorrectedInteractiveSessionState(this.runtimeContext, newState);

  private assertActiveForAction = (): void => {
    if (this.session.currentState.status !== GameStatus.Active) {
      throw new Error('Game is not active');
    }
  };

  /**
   * Per `add-movement-phase-ui` § 2: surface the cached
   * `IMovementCapability` (walk/run/jump MP) for a unit so the
   * Movement-phase UI can derive reachable hexes without
   * re-adapting the unit catalog. Returns `null` when the id is
   * unknown (callers treat missing capability as "no movement").
   */
  getMovementCapability = (unitId: string): IMovementCapability | null => {
    return getInteractiveSessionMovementCapability(this.runtimeContext, unitId);
  };

  /**
   * Surface the cached engine weapons for a unit so the gameplay store can
   * derive the record sheet's weapons table (and valid-target derivation)
   * from the same catalog data the resolvers use — previously only the demo
   * fixtures populated that display map, so every real session rendered an
   * empty weapons table (board task #14, same family as the 0/0 armor bug).
   */
  getUnitWeapons = (unitId: string): readonly IWeapon[] => {
    return getInteractiveSessionUnitWeapons(this.runtimeContext, unitId);
  };

  /**
   * Per `add-movement-phase-ui` § 2: expose the cached `IHexGrid`
   * the engine builds at session start. The UI's
   * `deriveReachableHexes` + A* path-preview helpers both need the
   * same grid the pathfinder uses so movement costs stay in lockstep
   * with simulation outcomes.
   */
  getGrid = (): IHexGrid => {
    return getInteractiveSessionGrid(this.runtimeContext);
  };

  getAvailableActions = (unitId: string): IAvailableActions => {
    return getInteractiveSessionAvailableActions(this.runtimeContext, unitId);
  };

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
  computeIndirectFireContext = (
    attackerId: string,
    weaponId: string,
    targetHex: IHexCoordinate,
  ): IIndirectFireResolution => {
    return computeInteractiveSessionIndirectFireContext(
      this.runtimeContext,
      attackerId,
      weaponId,
      targetHex,
    );
  };

  applyMovement = (...args: ApplyMovementArgs): void => {
    this.assertActiveForAction();
    applyInteractiveSessionMovementCommand(this.runtimeContext, ...args);
  };

  attemptStandUp = (unitId: string, mode?: StandUpMode): void => {
    attemptInteractiveSessionStandUp(this.runtimeContext, unitId, mode);
  };

  goProne = (unitId: string): void => {
    goInteractiveSessionProne(this.runtimeContext, unitId);
  };

  activateMovementEnhancement = (
    unitId: string,
    enhancement: MovementEnhancementActivationKind,
  ): void => {
    activateInteractiveSessionMovementEnhancement(
      this.runtimeContext,
      unitId,
      enhancement,
    );
  };

  torsoTwist = (unitId: string, secondaryFacing: Facing): void => {
    twistInteractiveSessionTorso(this.runtimeContext, unitId, secondaryFacing);
  };

  applyRuntimeMovementState = (
    unitId: string,
    patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  ): void => {
    this.assertActiveForAction();
    applyInteractiveSessionRuntimeMovementStateCommand(
      this.runtimeContext,
      unitId,
      patch,
    );
  };

  applyAttack = (
    attackerId: string,
    targetId: string,
    weaponIds: readonly string[],
    weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>,
    selectedAMSWeaponIds?: Readonly<Record<string, string>>,
  ): void => {
    this.assertActiveForAction();
    applyInteractiveSessionAttackCommand(
      this.runtimeContext,
      attackerId,
      targetId,
      weaponIds,
      weaponModesByWeaponId,
      selectedAMSWeaponIds,
    );
  };

  /**
   * Commit a composed volley (change `attack-phase-intent-composer`, D2):
   * one declaration group per target, primary first, locked once so the
   * whole volley is atomic. Empty `groups` = explicit Hold Fire (lock-only).
   */
  applyVolley = (attackerId: string, groups: readonly IVolleyGroup[]): void => {
    this.assertActiveForAction();
    applyInteractiveSessionVolleyCommand(
      this.runtimeContext,
      attackerId,
      groups,
    );
  };

  applyPhysicalAttack = (
    attackerId: string,
    targetId: string,
    attackType: PhysicalAttackType,
    limb?: PhysicalAttackLimb,
    options?: IInteractiveSessionPhysicalAttackOptions,
  ): void => {
    this.assertActiveForAction();
    applyInteractiveSessionPhysicalAttackCommand(
      this.runtimeContext,
      attackerId,
      targetId,
      attackType,
      limb,
      options,
    );
  };

  requestSpot = (unitId: string, targetId: string): void => {
    requestInteractiveSessionSpot(this.runtimeContext, unitId, targetId);
  };

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
  declareWithdrawal = (
    unitId: string,
    edge: 'north' | 'south' | 'east' | 'west',
  ): void => {
    this.assertActiveForAction();
    declareInteractiveSessionWithdrawal(this.runtimeContext, unitId, edge);
  };

  ejectUnit = (unitId: string): void => {
    ejectInteractiveSessionUnit(this.runtimeContext, unitId);
  };

  /**
   * Per `wire-vibroclaw-attack-dispatch` (battle-armor-combat "Vibroclaw
   * Attack"): declare and resolve a BA vibro-claw melee attack. Legality
   * (squad attacker with claws, adjacency, supported target type) is
   * checked in the dispatch; success appends the `VibroClawAttackResolved`
   * record event plus per-cluster `DamageApplied` events; rejections
   * return the typed reason for the UI.
   */
  declareVibroClawAttack = (
    squadId: string,
    targetUnitId: string,
  ): VibroClawDispatchResult => {
    this.assertActiveForAction();
    const result = dispatchVibroClawAttack({
      session: this.runtimeContext.getSession(),
      squadId,
      targetUnitId,
      d6Roller: this.d6Roller ?? (() => this.random.nextInt(6) + 1),
    });
    if (result.ok) {
      this.runtimeContext.setSession(result.session);
    }
    return result;
  };

  advancePhase = (): void => {
    advanceInteractiveSession(this.runtimeContext);
  };

  runAITurn = (side: GameSide): void => {
    runInteractiveSessionAI(this.runtimeContext, side);
  };

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
  concede = (side: GameSide): void => {
    concedeInteractiveSession(this.runtimeContext, side);
  };

  /**
   * Wave 4 reconnect timeout: an expired grace window is neither side's
   * victory, but it must still append a terminal `GameEnded` event so
   * persisted logs and reconnect replay converge on a completed match.
   */
  abortMatch = (): void => {
    abortInteractiveSession(this.runtimeContext);
  };

  /**
   * Test-observability accessor for the once-per-session publish guard.
   * The capstone E2E test asserts double-publish suppression by reading
   * this flag.
   */
  hasPublishedOutcome = (): boolean => {
    return hasInteractiveSessionPublishedOutcome(this.runtimeContext);
  };

  hasMatchLogDiverged = (): boolean => {
    return this.matchLogDiverged;
  };

  isMatchLogHealthy = (): boolean => {
    return !this.matchLogDiverged;
  };

  isGameOver = (): boolean => {
    return isInteractiveSessionGameOver(this.runtimeContext);
  };

  getResult = (): IGameOutcome | null => {
    return getInteractiveSessionResult(this.runtimeContext);
  };

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
  getOutcome = (options: IDeriveCombatOutcomeOptions = {}): ICombatOutcome => {
    return getInteractiveSessionOutcome(this.runtimeContext, options);
  };
}

export async function recoverInteractiveSession(
  matchId: string,
  storage: MatchLogHydrationStorage = matchLogStorage,
): Promise<InteractiveSession> {
  const session = await hydrateRecoverableSessionFromMatchLog(matchId, storage);
  return InteractiveSession.fromSessionAsync(session);
}
