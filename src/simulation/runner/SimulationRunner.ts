import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IMovementCapability,
  ReplaySource,
} from '@/types/gameplay';
import { GameSide } from '@/types/gameplay';
import { runObjectiveControlPass } from '@/utils/gameplay/objectives';

import type { IAIPlayer, AIPlayerFactory } from '../ai/IAIPlayer';
import type { IWeapon } from '../ai/types';

import { BotPlayer } from '../ai/BotPlayer';
import { SideKeyedAIPlayer } from '../ai/SideKeyedAIPlayer';
import { DEFAULT_BEHAVIOR } from '../ai/types';
import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
import { determineMatchTerminalState } from './matchTerminalState';
import {
  runAttackPhase,
  runHeatPhase,
  runMovementPhase,
  runPhysicalAttackPhase,
  runPSRPhase,
} from './phases';
import { createGameEvent, createRunnerTurnStartedEvent } from './phases/utils';
import { MAX_TURNS } from './SimulationRunnerConstants';
import {
  buildAnomalyBattleState,
  buildKeyMomentBattleState,
  convertAnomaliesToViolations,
  createAnomalyDetectors,
  createKeyMomentDetector,
  IAnomalyDetectors,
  runAllAnomalyDetectors,
} from './SimulationRunnerDetection';
import {
  createInitialState,
  determineWinner,
  isGameOver,
  isUnitOperable,
  resetTurnState,
  synthesizeGameUnits,
  type UnitHydrationMap,
} from './SimulationRunnerState';
import { createMinimalGrid } from './SimulationRunnerSupport';
import { appendRunnerGameEndedEvent } from './SimulationRunnerTerminalEvent';
import { IDetectorConfig, ISimulationRunResult } from './types';
import {
  hydrateCriticalSlotManifestFromFullUnit,
  hydrateMovementCapabilityFromFullUnit,
} from './UnitHydration';

/**
 * Default AI player factory — constructs a `BotPlayer` with the supplied
 * behavior. Used when no factory is injected so existing callsites are
 * unaffected and produce identical battle traces to the pre-Phase-3 code.
 */
const DEFAULT_AI_FACTORY: AIPlayerFactory = (random: SeededRandom, behavior) =>
  new BotPlayer(random, behavior);

export class SimulationRunner {
  private readonly random: SeededRandom;
  private readonly invariantRunner: InvariantRunner;
  private readonly detectorConfig: IDetectorConfig;
  private readonly aiPlayerFactory: AIPlayerFactory;
  private readonly hydration: UnitHydrationMap | undefined;
  private readonly weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  private readonly criticalSlotManifestSeedsByUnit: ReadonlyMap<
    string,
    CriticalSlotManifest
  >;
  private readonly movementCapabilitiesByUnit: ReadonlyMap<
    string,
    IMovementCapability
  >;
  private readonly keyMomentDetector = createKeyMomentDetector();
  private readonly anomalyDetectors: IAnomalyDetectors =
    createAnomalyDetectors();

  /**
   * @param seed                 RNG seed for this runner instance.
   * @param invariantRunner      Optional invariant checker; defaults to a new instance.
   * @param detectorConfig       Optional anomaly-detector config.
   * @param aiPlayerFactory      Optional factory for the AI player. When omitted the
   *                             runner uses `BotPlayer` with `DEFAULT_BEHAVIOR` —
   *                             preserving exact pre-Phase-3 battle traces. When
   *                             provided, the factory is called once per `run()` with
   *                             the per-run `SeededRandom` and the `DEFAULT_BEHAVIOR`
   *                             so callers can inject alternative implementations
   *                             (e.g. `StandStillAIPlayer` in tests, or a variant
   *                             preset in the swarm harness).
   * @param aiPlayerFactoryBySide Optional side-keyed factory map. When provided,
   *                             a `SideKeyedAIPlayer` is constructed internally that
   *                             routes side-A ("player-*") units to factory A and
   *                             side-B ("opponent-*") units to factory B. When both
   *                             `aiPlayerFactory` and `aiPlayerFactoryBySide` are
   *                             supplied, `aiPlayerFactoryBySide` takes precedence.
   * @param hydration             Optional per-unit hydration map keyed by runner unit
   *                             id (`player-1`, `opponent-2`, …). When present
   *                             (Phase 1 of `add-combat-fidelity-suite`), the runner
   *                             builds initial state from real catalog `IFullUnit`
   *                             data — per-location armor, internal structure, and
   *                             a per-mount `IWeapon[]` snapshot for the AI. When
   *                             absent, the legacy synthetic single-medium-laser
   *                             path is used so existing callsites stay green.
   */
  constructor(
    seed: number,
    invariantRunner?: InvariantRunner,
    detectorConfig?: IDetectorConfig,
    aiPlayerFactory?: AIPlayerFactory,
    aiPlayerFactoryBySide?: { A: AIPlayerFactory; B: AIPlayerFactory },
    hydration?: UnitHydrationMap,
  ) {
    this.random = new SeededRandom(seed);
    this.invariantRunner = invariantRunner ?? new InvariantRunner();
    this.detectorConfig = detectorConfig ?? {};
    // Per design D3: factory defaults to BotPlayer so every existing callsite
    // continues to produce identical behavior. When aiPlayerFactoryBySide is
    // provided it takes precedence: wrap side A + B factories via SideKeyedAIPlayer
    // so each unit receives the correct variant without changing runner internals.
    if (aiPlayerFactoryBySide) {
      const { A: factoryA, B: factoryB } = aiPlayerFactoryBySide;
      this.aiPlayerFactory = (random, behavior) =>
        new SideKeyedAIPlayer(
          factoryA(random, behavior),
          factoryB(random, behavior),
        );
    } else {
      this.aiPlayerFactory = aiPlayerFactory ?? DEFAULT_AI_FACTORY;
    }
    // Pre-derive the unitId → IWeapon[] side table once at construction time
    // so each phase invocation just does a Map.get rather than re-iterating
    // hydration data per turn.
    this.hydration = hydration;
    const weaponsMap = new Map<string, readonly IWeapon[]>();
    const manifestSeedMap = new Map<string, CriticalSlotManifest>();
    const movementCapabilityMap = new Map<string, IMovementCapability>();
    if (hydration) {
      // forEach avoids relying on Map iterator protocol — tsconfig target
      // is ES5 and downlevelIteration is off, so `for..of` over a Map
      // would force a transpile flag flip across the whole project.
      hydration.forEach((data, unitId) => {
        weaponsMap.set(unitId, data.aiWeapons);
        const manifest = hydrateCriticalSlotManifestFromFullUnit(
          data.fullUnit,
          data.aiWeapons,
        );
        if (manifest !== undefined) {
          manifestSeedMap.set(unitId, manifest);
        }
        const movementCapability = hydrateMovementCapabilityFromFullUnit(
          data.fullUnit,
        );
        if (movementCapability !== undefined) {
          movementCapabilityMap.set(unitId, movementCapability);
        }
      });
    }
    this.weaponsByUnit = weaponsMap;
    this.criticalSlotManifestSeedsByUnit = manifestSeedMap;
    this.movementCapabilitiesByUnit = movementCapabilityMap;
  }

  private createCriticalSlotManifestRunMap():
    | Map<string, CriticalSlotManifest>
    | undefined {
    if (this.criticalSlotManifestSeedsByUnit.size === 0) return undefined;

    const out = new Map<string, CriticalSlotManifest>();
    this.criticalSlotManifestSeedsByUnit.forEach((manifest, unitId) => {
      const clone: Record<string, CriticalSlotManifest[string]> = {};
      for (const [location, slots] of Object.entries(manifest)) {
        clone[location] = slots.map((slot) => ({ ...slot }));
      }
      out.set(unitId, clone);
    });
    return out;
  }

  run(config: ISimulationConfig): ISimulationRunResult {
    const startTime = Date.now();
    const violations: IViolation[] = [];
    const events: IGameEvent[] = [];
    const gameId = `sim-${config.seed}`;

    const grid = createMinimalGrid(config.mapRadius);
    const state = createInitialState(config, this.hydration);
    const manifestsByUnit = this.createCriticalSlotManifestRunMap();
    // Per `add-scenario-objective-engine`: the objective map seeded
    // into the initial state is also stamped onto the GameCreated
    // payload so the persisted event log replays objective state.
    const seededObjectives = state.objectives;

    // Per `emit-game-created-from-runner` (`simulation-system` delta —
    // "Runner Emits GameCreated as Seed Event"): emit `GameCreated` as
    // event 0 so consumers of the persisted NDJSON event log (notably
    // the replay-viewer reducer) can seed their unit roster from
    // `payload.units`. Before this change, the runner produced event
    // logs that started with `movement_declared`, leaving downstream
    // consumers without the unit list; the replay viewer's hex map
    // could not render any tokens.
    const gameUnits = synthesizeGameUnits(config, this.hydration);
    events.push(
      createGameEvent(
        gameId,
        events.length, // 0 for the seed event; subsequent emissions
        // continue from `events.length` so sequence numbering stays
        // monotonic and dense.
        GameEventType.GameCreated,
        0, // turn 0 — pre-turn-loop setup
        GamePhase.Initiative,
        {
          config: {
            mapRadius: config.mapRadius,
            turnLimit: config.turnLimit,
            // Synthetic — the runner is single-mode today (destruction-
            // win). When victory conditions become
            // configurable, this MUST move to the real source.
            victoryConditions: ['destruction'],
            optionalRules: config.optionalRules ?? [],
          },
          units: gameUnits,
          // Per `add-scenario-objective-engine`: stamp the placed
          // objective markers so the event log fully replays
          // objective state. Omitted for markerless runs.
          ...(seededObjectives !== undefined &&
          Object.keys(seededObjectives).length > 0
            ? { objectives: seededObjectives }
            : {}),
          ...(state.c3Network !== undefined &&
          state.c3Network.networks.length > 0
            ? { c3Network: state.c3Network }
            : {}),
        },
      ),
    );

    // Per Phase 3: construct the AI player through the injected factory so
    // tests and the swarm harness can swap implementations without changing
    // BotPlayer's runtime behavior. DEFAULT_BEHAVIOR is passed so the
    // factory can thread the correct preset into BotPlayer (or any other
    // IAIPlayer implementation).
    const botPlayer: IAIPlayer = this.aiPlayerFactory(
      this.random,
      DEFAULT_BEHAVIOR,
    );

    let currentState = state;
    let turn = 1;
    const turnLimit =
      config.turnLimit > 0 ? Math.min(config.turnLimit, MAX_TURNS) : MAX_TURNS;
    let haltedByCriticalAnomaly = false;

    while (turn <= turnLimit) {
      currentState = { ...currentState, turn };
      currentState = resetTurnState(currentState);
      events.push(createRunnerTurnStartedEvent(gameId, events.length, turn));

      currentState = runMovementPhase({
        state: currentState,
        botPlayer,
        grid,
        environmentalConditions: config.environmentalConditions,
        optionalRules: config.optionalRules,
        invariantRunner: this.invariantRunner,
        violations,
        events,
        gameId,
        weaponsByUnit: this.weaponsByUnit,
        random: this.random,
      });

      currentState = runAttackPhase({
        state: currentState,
        botPlayer,
        grid,
        environmentalConditions: config.environmentalConditions,
        invariantRunner: this.invariantRunner,
        violations,
        events,
        gameId,
        random: this.random,
        weaponsByUnit: this.weaponsByUnit,
        manifestsByUnit,
        optionalRules: config.optionalRules,
      });

      currentState = runPSRPhase({
        state: currentState,
        events,
        gameId,
        random: this.random,
        manifestsByUnit,
      });

      if (isGameOver(currentState, config.turnLimit)) {
        break;
      }

      currentState = runPhysicalAttackPhase({
        state: currentState,
        botPlayer,
        invariantRunner: this.invariantRunner,
        violations,
        events,
        gameId,
        grid,
        random: this.random,
        movementCapabilitiesByUnit: this.movementCapabilitiesByUnit,
        optionalRules: config.optionalRules,
        manifestsByUnit,
      });

      currentState = runPSRPhase({
        state: currentState,
        events,
        gameId,
        random: this.random,
        manifestsByUnit,
      });

      if (isGameOver(currentState, config.turnLimit)) {
        break;
      }

      currentState = runHeatPhase({
        state: currentState,
        grid,
        environmentalConditions: config.environmentalConditions,
        events,
        gameId,
        random: this.random,
        weaponsByUnit: this.weaponsByUnit,
        manifestsByUnit,
      });

      currentState = { ...currentState, phase: GamePhase.End };
      violations.push(...this.invariantRunner.runAll(currentState));

      // Per `add-scenario-objective-engine` (D7 / task 7.2): run the
      // objective control-detection pass once per turn at the End
      // phase. It resolves control + hold progress from unit positions
      // and emits `ObjectiveCaptured` / `ObjectiveLost` /
      // `ObjectiveProgress` events. No-op for markerless runs.
      if (
        currentState.objectives !== undefined &&
        Object.keys(currentState.objectives).length > 0
      ) {
        const pass = runObjectiveControlPass(
          gameId,
          currentState,
          events.length,
          turn,
          GamePhase.End,
        );
        events.push(...pass.events);
        currentState = { ...currentState, objectives: pass.objectives };
      }

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.TurnEnded,
          turn,
          currentState.phase,
          { _type: 'turn_ended' as const },
        ),
      );

      // Per `add-scenario-objective-engine` (task 5): an objective win
      // detected by the End-phase control pass ends the match
      // immediately — even with units alive on both sides.
      if (isGameOver(currentState, config.turnLimit)) {
        break;
      }

      if (this.detectorConfig.haltOnCritical) {
        const anomalyBattleState = buildAnomalyBattleState(currentState);
        const cycleAnomalies = this.anomalyDetectors.stateCycle.detect(
          events,
          anomalyBattleState,
          this.detectorConfig.stateCycleLength,
        );
        const hasCritical = cycleAnomalies.some(
          (anomaly) => anomaly.severity === 'critical',
        );
        if (hasCritical) {
          haltedByCriticalAnomaly = true;
          break;
        }
      }

      turn++;
    }

    const durationMs = Date.now() - startTime;
    const winner = determineWinner(currentState, config.turnLimit);

    // Phase 0.5 — engine-layer match terminal state. Survivor counts are
    // derived from the same `isUnitOperable` predicate used by
    // `determineWinner` to keep the two classifications consistent.
    // Forfeit / withdrawal flags are not yet tracked by the runner —
    // P1 catalog hydration may surface them; until then we always pass
    // `false` and rely on survivor counts + turn ceiling.
    const allUnits = Object.values(currentState.units);
    const playerUnits = allUnits.filter(
      (unit) => unit.side === GameSide.Player,
    );
    const opforUnits = allUnits.filter(
      (unit) => unit.side === GameSide.Opponent,
    );
    const matchTerminalState = determineMatchTerminalState({
      playerSurvivors: playerUnits.filter(isUnitOperable).length,
      opforSurvivors: opforUnits.filter(isUnitOperable).length,
      playerRosterSize: playerUnits.length,
      opforRosterSize: opforUnits.length,
      turnsElapsed: currentState.turn,
      maxTurns: MAX_TURNS,
      hadWithdrawal: false,
      hadForfeit: false,
    });

    appendRunnerGameEndedEvent({
      events,
      gameId,
      state: currentState,
      turnLimit,
      winner,
      haltedByCriticalAnomaly,
    });

    const keyMomentBattleState = buildKeyMomentBattleState(currentState);
    const anomalyBattleState = buildAnomalyBattleState(currentState);

    const keyMoments = this.keyMomentDetector.detect(
      events,
      keyMomentBattleState,
    );
    const anomalies = runAllAnomalyDetectors(
      events,
      anomalyBattleState,
      this.anomalyDetectors,
      this.detectorConfig,
    );

    violations.push(...convertAnomaliesToViolations(anomalies));

    // Per `add-replay-library` PR 4 design (game-event-system delta —
    // "Event Envelope Replay Source Discriminator"): every IGameEvent
    // emitted by the swarm runner SHALL carry `replaySource: Swarm` on
    // the envelope. Threading the discriminator through every one of the
    // 30+ `createGameEvent` callsites in `SimulationRunner.run()` and
    // `phases/{movement,physicalAttack,postCombat}.ts` would be a
    // mechanical churn of comparable size to the rest of this PR; the
    // post-stamp pattern below applies the discriminator at the runner
    // boundary right before the events leave `run()` so consumers
    // (NDJSON writers, manifest builders, scenario tests) see the field
    // populated everywhere it matters.
    //
    // Existing `replaySource` values are preserved — a future emitter
    // that explicitly sets a non-Swarm source (e.g. a hypothetical
    // future code path that calls into the runner from a non-swarm
    // context) keeps its value. Only events with an undefined field are
    // back-filled.
    const stampedEvents: readonly IGameEvent[] = events.map((event) =>
      event.replaySource !== undefined
        ? event
        : { ...event, replaySource: ReplaySource.Swarm },
    );

    // Per design D7: stamp schemaVersion: 1 on the default (non-swarm) path so
    // downstream consumers can branch on the schema explicitly. BatchRunner.runBatch
    // overrides this to schemaVersion: 2 when a participants[] payload is supplied.
    return {
      schemaVersion: 1 as const,
      seed: config.seed,
      winner,
      turns: currentState.turn,
      durationMs,
      events: stampedEvents,
      violations,
      keyMoments,
      anomalies,
      haltedByCriticalAnomaly,
      matchTerminalState,
    };
  }
}
