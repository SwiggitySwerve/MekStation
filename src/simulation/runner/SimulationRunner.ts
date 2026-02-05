import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import {
  GamePhase,
  GameSide,
  GameStatus,
  GameEventType,
  IGameState,
  IUnitGameState,
  IGameEvent,
  LockState,
} from '@/types/gameplay';
import {
  Facing,
  MovementType,
  IHexCoordinate,
  IHexGrid,
  IHex,
  IMovementCapability,
} from '@/types/gameplay';

import type { IAIUnitState, IWeapon } from '../ai/types';
import type { BattleState as AnomalyBattleState } from '../detectors/HeatSuicideDetector';
import type { BattleState as KeyMomentBattleState } from '../detectors/KeyMomentDetector';

import { BotPlayer } from '../ai/BotPlayer';
import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { HeatSuicideDetector } from '../detectors/HeatSuicideDetector';
import { KeyMomentDetector } from '../detectors/KeyMomentDetector';
import { LongGameDetector } from '../detectors/LongGameDetector';
import { NoProgressDetector } from '../detectors/NoProgressDetector';
import { PassiveUnitDetector } from '../detectors/PassiveUnitDetector';
import { StateCycleDetector } from '../detectors/StateCycleDetector';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
import { ISimulationRunResult, IDetectorConfig } from './types';

const MAX_TURNS = 10;

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

  return {
    config: { radius },
    hexes,
  };
}

function createMinimalWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createMinimalUnitState(
  id: string,
  side: GameSide,
  position: IHexCoordinate,
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

function toAIUnitState(unit: IUnitGameState): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons: [createMinimalWeapon(`${unit.id}-weapon-1`)],
    ammo: {},
    destroyed: unit.destroyed,
    gunnery: 4,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
  };
}

function createMovementCapability(): IMovementCapability {
  return {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

export class SimulationRunner {
  private readonly random: SeededRandom;
  private readonly invariantRunner: InvariantRunner;
  private readonly detectorConfig: IDetectorConfig;
  private readonly keyMomentDetector: KeyMomentDetector;
  private readonly anomalyDetectors: {
    readonly heatSuicide: HeatSuicideDetector;
    readonly passiveUnit: PassiveUnitDetector;
    readonly noProgress: NoProgressDetector;
    readonly longGame: LongGameDetector;
    readonly stateCycle: StateCycleDetector;
  };

  constructor(
    seed: number,
    invariantRunner?: InvariantRunner,
    detectorConfig?: IDetectorConfig,
  ) {
    this.random = new SeededRandom(seed);
    this.invariantRunner = invariantRunner ?? new InvariantRunner();
    this.detectorConfig = detectorConfig ?? {};
    this.keyMomentDetector = new KeyMomentDetector();
    this.anomalyDetectors = {
      heatSuicide: new HeatSuicideDetector(),
      passiveUnit: new PassiveUnitDetector(),
      noProgress: new NoProgressDetector(),
      longGame: new LongGameDetector(),
      stateCycle: new StateCycleDetector(),
    };
  }

  /**
   * Runs a single simulation with integrated anomaly and key-moment detection.
   *
   * Detectors are run after the game loop on the full event stream.
   * When `haltOnCritical` is enabled, the StateCycleDetector is checked
   * per-turn to allow early termination on critical anomalies.
   */
  run(config: ISimulationConfig): ISimulationRunResult {
    const startTime = Date.now();
    const violations: IViolation[] = [];
    const events: IGameEvent[] = [];
    let eventSequence = 0;
    const gameId = `sim-${config.seed}`;

    const grid = createMinimalGrid(config.mapRadius);
    const state = this.createInitialState(config);
    const botPlayer = new BotPlayer(this.random);

    let currentState = state;
    let turn = 1;
    const turnLimit =
      config.turnLimit > 0 ? Math.min(config.turnLimit, MAX_TURNS) : MAX_TURNS;
    let haltedByCriticalAnomaly = false;

    while (turn <= turnLimit) {
      currentState = { ...currentState, turn };

      currentState = this.runMovementPhase(
        currentState,
        botPlayer,
        grid,
        violations,
        events,
        eventSequence,
        gameId,
      );
      eventSequence = events.length;

      currentState = this.runAttackPhase(
        currentState,
        botPlayer,
        violations,
        events,
        eventSequence,
        gameId,
      );
      eventSequence = events.length;

      if (this.isGameOver(currentState)) {
        break;
      }

      currentState = { ...currentState, phase: GamePhase.End };
      violations.push(...this.invariantRunner.runAll(currentState));

      // Emit TurnEnded event for detector consumption
      events.push(
        this.createGameEvent(
          gameId,
          events.length,
          GameEventType.TurnEnded,
          turn,
          currentState.phase,
          { _type: 'turn_ended' as const },
        ),
      );

      // Per-turn critical anomaly check (StateCycleDetector only)
      if (this.detectorConfig.haltOnCritical) {
        const anomalyBattleState = this.buildAnomalyBattleState(currentState);
        const cycleAnomalies = this.anomalyDetectors.stateCycle.detect(
          events,
          anomalyBattleState,
          this.detectorConfig.stateCycleLength,
        );
        const hasCritical = cycleAnomalies.some(
          (a) => a.severity === 'critical',
        );
        if (hasCritical) {
          haltedByCriticalAnomaly = true;
          break;
        }
      }

      turn++;
    }

    const durationMs = Date.now() - startTime;
    const winner = this.determineWinner(currentState);

    // Run all detectors on the complete event stream
    const keyMomentBattleState = this.buildKeyMomentBattleState(currentState);
    const anomalyBattleState = this.buildAnomalyBattleState(currentState);

    const keyMoments = this.keyMomentDetector.detect(
      events,
      keyMomentBattleState,
    );
    const anomalies = this.runAllAnomalyDetectors(events, anomalyBattleState);

    // Convert anomalies to violations for the violation log
    violations.push(...this.convertAnomaliesToViolations(anomalies));

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

  /**
   * Runs all five anomaly detectors on the complete event stream.
   */
  private runAllAnomalyDetectors(
    events: readonly IGameEvent[],
    battleState: AnomalyBattleState,
  ): IAnomaly[] {
    const cfg = this.detectorConfig;
    return [
      ...this.anomalyDetectors.heatSuicide.detect(
        events,
        battleState,
        cfg.heatSuicideThreshold,
      ),
      ...this.anomalyDetectors.passiveUnit.detect(
        events,
        battleState,
        cfg.passiveUnitTurns,
      ),
      ...this.anomalyDetectors.noProgress.detect(
        events,
        battleState,
        cfg.noProgressTurns,
      ),
      ...this.anomalyDetectors.longGame.detect(events, cfg.longGameTurns),
      ...this.anomalyDetectors.stateCycle.detect(
        events,
        battleState,
        cfg.stateCycleLength,
      ),
    ];
  }

  /**
   * Converts anomalies to the IViolation format for the violation log.
   */
  private convertAnomaliesToViolations(
    anomalies: readonly IAnomaly[],
  ): IViolation[] {
    return anomalies.map((anomaly) => ({
      invariant: `detector:${anomaly.type}`,
      severity:
        anomaly.severity === 'critical'
          ? ('critical' as const)
          : ('warning' as const),
      message: anomaly.message,
      context: {
        anomalyId: anomaly.id,
        turn: anomaly.turn,
        unitId: anomaly.unitId,
        thresholdUsed: anomaly.thresholdUsed,
        actualValue: anomaly.actualValue,
      },
    }));
  }

  /**
   * Builds a BattleState suitable for the KeyMomentDetector from game state.
   */
  private buildKeyMomentBattleState(state: IGameState): KeyMomentBattleState {
    const units = Object.values(state.units).map((unit) => ({
      id: unit.id,
      name: unit.id,
      side: unit.side,
      bv: 1000,
      weaponIds: [`${unit.id}-weapon-1`],
      initialArmor: { ...unit.armor },
      initialStructure: { ...unit.structure },
    }));
    return { units };
  }

  /**
   * Builds a BattleState suitable for anomaly detectors from game state.
   */
  private buildAnomalyBattleState(state: IGameState): AnomalyBattleState {
    const units = Object.values(state.units).map((unit) => ({
      id: unit.id,
      name: unit.id,
      side: unit.side,
    }));
    return { units };
  }

  private createGameEvent(
    gameId: string,
    sequence: number,
    type: GameEventType,
    turn: number,
    phase: GamePhase,
    payload: IGameEvent['payload'],
    actorId?: string,
  ): IGameEvent {
    return {
      id: `${gameId}-evt-${sequence}`,
      gameId,
      sequence,
      timestamp: new Date().toISOString(),
      type,
      turn,
      phase,
      payload,
      ...(actorId !== undefined ? { actorId } : {}),
    };
  }

  private runMovementPhase(
    state: IGameState,
    botPlayer: BotPlayer,
    grid: IHexGrid,
    violations: IViolation[],
    events: IGameEvent[],
    _seqStart: number,
    gameId: string,
  ): IGameState {
    let currentState = { ...state, phase: GamePhase.Movement };
    violations.push(...this.invariantRunner.runAll(currentState));

    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;

      const aiUnit = toAIUnitState(unit);
      const capability = createMovementCapability();
      const moveEvent = botPlayer.playMovementPhase(aiUnit, grid, capability);

      if (moveEvent) {
        currentState = this.applyMovementEvent(
          currentState,
          unitId,
          moveEvent.payload,
        );

        events.push(
          this.createGameEvent(
            gameId,
            events.length,
            GameEventType.MovementDeclared,
            currentState.turn,
            GamePhase.Movement,
            {
              unitId,
              from: unit.position,
              to: moveEvent.payload.to,
              facing: moveEvent.payload.facing as Facing,
              movementType: moveEvent.payload.movementType,
              mpUsed: moveEvent.payload.mpUsed,
              heatGenerated: 0,
            },
            unitId,
          ),
        );
      }
    }
    violations.push(...this.invariantRunner.runAll(currentState));

    return currentState;
  }

  private runAttackPhase(
    state: IGameState,
    botPlayer: BotPlayer,
    violations: IViolation[],
    events: IGameEvent[],
    _seqStart: number,
    gameId: string,
  ): IGameState {
    let currentState = { ...state, phase: GamePhase.WeaponAttack };
    violations.push(...this.invariantRunner.runAll(currentState));

    const allAIUnits = Object.values(currentState.units).map(toAIUnitState);
    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;

      const aiUnit = toAIUnitState(unit);
      const enemyUnits = allAIUnits.filter(
        (u) => !u.destroyed && currentState.units[u.unitId].side !== unit.side,
      );

      const attackEvent = botPlayer.playAttackPhase(aiUnit, enemyUnits);

      if (attackEvent) {
        const targetBefore = currentState.units[attackEvent.payload.targetId];
        currentState = this.applySimpleDamage(
          currentState,
          attackEvent.payload.targetId,
        );
        const targetAfter = currentState.units[attackEvent.payload.targetId];

        if (targetBefore && targetAfter) {
          events.push(
            this.createGameEvent(
              gameId,
              events.length,
              GameEventType.DamageApplied,
              currentState.turn,
              GamePhase.WeaponAttack,
              {
                unitId: attackEvent.payload.targetId,
                location: 'center_torso',
                damage: 5,
                armorRemaining: targetAfter.armor.center_torso ?? 0,
                structureRemaining: targetAfter.structure.center_torso ?? 0,
                locationDestroyed: false,
                sourceUnitId: unitId,
              },
              unitId,
            ),
          );

          if (targetAfter.destroyed && !targetBefore.destroyed) {
            events.push(
              this.createGameEvent(
                gameId,
                events.length,
                GameEventType.UnitDestroyed,
                currentState.turn,
                GamePhase.WeaponAttack,
                {
                  unitId: attackEvent.payload.targetId,
                  cause: 'damage' as const,
                  killerUnitId: unitId,
                },
              ),
            );
          }
        }
      }
    }
    violations.push(...this.invariantRunner.runAll(currentState));

    return currentState;
  }

  private createSideUnits(
    units: Record<string, IUnitGameState>,
    config: ISimulationConfig,
    side: GameSide,
    rowPosition: number,
  ): void {
    const count =
      side === GameSide.Player
        ? config.unitCount.player
        : config.unitCount.opponent;
    const prefix = side === GameSide.Player ? 'player' : 'opponent';

    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${i + 1}`;
      const position: IHexCoordinate = { q: i - 1, r: rowPosition };
      units[id] = createMinimalUnitState(id, side, position);
    }
  }

  private createInitialState(config: ISimulationConfig): IGameState {
    const units: Record<string, IUnitGameState> = {};

    this.createSideUnits(units, config, GameSide.Player, -config.mapRadius + 1);
    this.createSideUnits(
      units,
      config,
      GameSide.Opponent,
      config.mapRadius - 1,
    );

    return {
      gameId: `sim-${config.seed}`,
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Initiative,
      activationIndex: 0,
      units,
      turnEvents: [],
    };
  }

  private applyMovementEvent(
    state: IGameState,
    unitId: string,
    payload: {
      to: { q: number; r: number };
      facing: number;
      movementType: MovementType;
      mpUsed: number;
    },
  ): IGameState {
    const unit = state.units[unitId];
    if (!unit) return state;

    const updatedUnit: IUnitGameState = {
      ...unit,
      position: payload.to,
      facing: payload.facing as Facing,
      movementThisTurn: payload.movementType,
      hexesMovedThisTurn: payload.mpUsed,
    };

    return {
      ...state,
      units: {
        ...state.units,
        [unitId]: updatedUnit,
      },
    };
  }

  private applySimpleDamage(state: IGameState, targetId: string): IGameState {
    const target = state.units[targetId];
    if (!target || target.destroyed) return state;

    const SIMPLE_DAMAGE = 5;
    const newArmor = { ...target.armor };
    const ctArmor = newArmor.center_torso ?? 0;
    newArmor.center_torso = Math.max(0, ctArmor - SIMPLE_DAMAGE);

    const totalStructure = Object.values(target.structure).reduce(
      (sum, v) => sum + v,
      0,
    );
    const ctBreached =
      newArmor.center_torso === 0 &&
      (target.structure.center_torso ?? 0) <= SIMPLE_DAMAGE;
    const destroyed = totalStructure <= 0 || ctBreached;

    const updatedUnit: IUnitGameState = {
      ...target,
      armor: newArmor,
      destroyed,
    };

    return {
      ...state,
      units: {
        ...state.units,
        [targetId]: updatedUnit,
      },
    };
  }

  private isGameOver(state: IGameState): boolean {
    const playerUnits = Object.values(state.units).filter(
      (u) => u.side === GameSide.Player && !u.destroyed,
    );
    const opponentUnits = Object.values(state.units).filter(
      (u) => u.side === GameSide.Opponent && !u.destroyed,
    );
    return playerUnits.length === 0 || opponentUnits.length === 0;
  }

  private determineWinner(
    state: IGameState,
  ): 'player' | 'opponent' | 'draw' | null {
    const playerUnits = Object.values(state.units).filter(
      (u) => u.side === GameSide.Player && !u.destroyed,
    );
    const opponentUnits = Object.values(state.units).filter(
      (u) => u.side === GameSide.Opponent && !u.destroyed,
    );

    if (playerUnits.length === 0 && opponentUnits.length === 0) return 'draw';
    if (playerUnits.length === 0) return 'opponent';
    if (opponentUnits.length === 0) return 'player';
    return null;
  }
}
