import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';
import { GameSide } from '@/types/gameplay';

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
import { createGameEvent } from './phases/utils';
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
  type UnitHydrationMap,
} from './SimulationRunnerState';
import { createMinimalGrid } from './SimulationRunnerSupport';
import { IDetectorConfig, ISimulationRunResult } from './types';

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
    if (hydration) {
      // forEach avoids relying on Map iterator protocol — tsconfig target
      // is ES5 and downlevelIteration is off, so `for..of` over a Map
      // would force a transpile flag flip across the whole project.
      hydration.forEach((data, unitId) => {
        weaponsMap.set(unitId, data.aiWeapons);
      });
    }
    this.weaponsByUnit = weaponsMap;
  }

  run(config: ISimulationConfig): ISimulationRunResult {
    const startTime = Date.now();
    const violations: IViolation[] = [];
    const events: IGameEvent[] = [];
    const gameId = `sim-${config.seed}`;

    const grid = createMinimalGrid(config.mapRadius);
    const state = createInitialState(config, this.hydration);
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

      currentState = runMovementPhase({
        state: currentState,
        botPlayer,
        grid,
        invariantRunner: this.invariantRunner,
        violations,
        events,
        gameId,
        weaponsByUnit: this.weaponsByUnit,
      });

      currentState = runAttackPhase({
        state: currentState,
        botPlayer,
        invariantRunner: this.invariantRunner,
        violations,
        events,
        gameId,
        random: this.random,
        weaponsByUnit: this.weaponsByUnit,
      });

      currentState = runPSRPhase({
        state: currentState,
        events,
        gameId,
        random: this.random,
      });

      if (isGameOver(currentState)) {
        break;
      }

      currentState = runPhysicalAttackPhase({
        state: currentState,
        invariantRunner: this.invariantRunner,
        violations,
        events,
        gameId,
        random: this.random,
      });

      currentState = runPSRPhase({
        state: currentState,
        events,
        gameId,
        random: this.random,
      });

      if (isGameOver(currentState)) {
        break;
      }

      currentState = runHeatPhase({
        state: currentState,
        events,
        gameId,
        random: this.random,
        weaponsByUnit: this.weaponsByUnit,
      });

      currentState = { ...currentState, phase: GamePhase.End };
      violations.push(...this.invariantRunner.runAll(currentState));

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
    const winner = determineWinner(currentState);

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

    // Per design D7: stamp schemaVersion: 1 on the default (non-swarm) path so
    // downstream consumers can branch on the schema explicitly. BatchRunner.runBatch
    // overrides this to schemaVersion: 2 when a participants[] payload is supplied.
    return {
      schemaVersion: 1 as const,
      seed: config.seed,
      winner,
      turns: currentState.turn,
      durationMs,
      events,
      violations,
      keyMoments,
      anomalies,
      haltedByCriticalAnomaly,
      matchTerminalState,
    };
  }
}
