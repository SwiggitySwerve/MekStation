import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import { BotPlayer } from '../ai/BotPlayer';
import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
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
import { runMovementPhase } from './SimulationRunnerMovementPhase';
import { createGameEvent } from './SimulationRunnerPhaseUtils';
import { runPhysicalAttackPhase } from './SimulationRunnerPhysicalAttackPhase';
import { runHeatPhase, runPSRPhase } from './SimulationRunnerPostCombatPhases';
import {
  createInitialState,
  determineWinner,
  isGameOver,
  resetTurnState,
} from './SimulationRunnerState';
import { createMinimalGrid } from './SimulationRunnerSupport';
import { runAttackPhase } from './SimulationRunnerWeaponAttackPhase';
import { IDetectorConfig, ISimulationRunResult } from './types';

export class SimulationRunner {
  private readonly random: SeededRandom;
  private readonly invariantRunner: InvariantRunner;
  private readonly detectorConfig: IDetectorConfig;
  private readonly keyMomentDetector = createKeyMomentDetector();
  private readonly anomalyDetectors: IAnomalyDetectors =
    createAnomalyDetectors();

  constructor(
    seed: number,
    invariantRunner?: InvariantRunner,
    detectorConfig?: IDetectorConfig,
  ) {
    this.random = new SeededRandom(seed);
    this.invariantRunner = invariantRunner ?? new InvariantRunner();
    this.detectorConfig = detectorConfig ?? {};
  }

  run(config: ISimulationConfig): ISimulationRunResult {
    const startTime = Date.now();
    const violations: IViolation[] = [];
    const events: IGameEvent[] = [];
    const gameId = `sim-${config.seed}`;

    const grid = createMinimalGrid(config.mapRadius);
    const state = createInitialState(config);
    const botPlayer = new BotPlayer(this.random);

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
      });

      currentState = runAttackPhase({
        state: currentState,
        botPlayer,
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

      currentState = runHeatPhase(currentState);

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

    return {
      seed: config.seed,
      winner,
      turns: currentState.turn,
      durationMs,
      events,
      violations,
      keyMoments,
      anomalies,
      haltedByCriticalAnomaly,
    };
  }
}
