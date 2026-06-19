/**
 * Cycle detection algorithm and detector tracking state
 */

import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import {
  GameEventType,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { BattleState } from './types';

import { getPayload } from '../utils/getPayload';
import {
  type BattleStateSnapshot,
  createSnapshot,
  serializeSnapshot,
  snapshotsEqual,
} from './snapshots';

/** Default threshold for state cycle detection (repetitions) */
const DEFAULT_STATE_CYCLE_THRESHOLD = 3;

/**
 * Internal tracking state for the detector
 */
interface DetectorTrackingState {
  snapshotHistory: BattleStateSnapshot[];
  unitArmor: Map<number, Map<string, Record<string, number>>>;
  unitStructure: Map<number, Map<string, Record<string, number>>>;
  unitHeat: Map<number, Map<string, number>>;
  /**
   * Per `polish-wave-6.2-gaps` (PT-001): the latest committed hex
   * position for each unit, captured from MovementDeclared events.
   * Position is keyed by unitId (not by turn) because we only need
   * the most recent position when building the turn-end snapshot.
   */
  unitPosition: Map<string, IHexCoordinate>;
  movementThisTurn: boolean;
  destroyedUnits: Set<string>;
  anomalies: IAnomaly[];
  anomalyCounter: number;
  currentTurn: number;
  anomalyTriggered: boolean;
}

interface CurrentTurnSnapshotState {
  armor: Map<string, Record<string, number>>;
  structure: Map<string, Record<string, number>>;
  heat: Map<string, number>;
}

/**
 * Detects state cycle anomalies from a stream of game events.
 *
 * Tracks battle state (armor, structure, heat) across turns.
 * When the same state repeats N times, creates an anomaly.
 * This indicates an infinite loop or deadlock situation.
 */
export class StateCycleDetectionEngine {
  /**
   * Detects state cycle anomalies from a stream of game events.
   *
   * @param events - Ordered array of game events to process
   * @param battleState - Static battle context (units, sides)
   * @param threshold - State cycle threshold (default: 3)
   * @returns Array of detected anomalies
   */
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold: number = DEFAULT_STATE_CYCLE_THRESHOLD,
  ): IAnomaly[] {
    const state = this.initializeTrackingState();

    for (const event of events) {
      this.processEvent(event, battleState, state, threshold);
    }

    return state.anomalies;
  }

  private initializeTrackingState(): DetectorTrackingState {
    return {
      snapshotHistory: [],
      unitArmor: new Map(),
      unitStructure: new Map(),
      unitHeat: new Map(),
      unitPosition: new Map(),
      movementThisTurn: false,
      destroyedUnits: new Set(),
      anomalies: [],
      anomalyCounter: 0,
      currentTurn: 0,
      anomalyTriggered: false,
    };
  }

  private processEvent(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    state.currentTurn = event.turn;

    switch (event.type) {
      case GameEventType.MovementDeclared:
      case GameEventType.MovementLocked:
        this.processMovement(event, state);
        break;

      case GameEventType.DamageApplied:
        this.processDamage(event, state);
        break;

      case GameEventType.HeatGenerated:
        this.processHeat(event, state);
        break;

      case GameEventType.UnitDestroyed:
        this.processUnitDestroyed(event, state);
        break;

      case GameEventType.TurnEnded:
        this.processTurnEnded(event, battleState, state, threshold);
        break;

      default:
        break;
    }
  }

  private processMovement(
    event: IGameEvent,
    state: DetectorTrackingState,
  ): void {
    state.movementThisTurn = true;

    // Per polish-wave-6.2-gaps (PT-001): record the destination hex from
    // MovementDeclared so the snapshot reflects post-move positions. The
    // MovementLocked branch carries only the unitId, so position only updates
    // when we see the MovementDeclared payload (which carries `to`).
    if (event.type === GameEventType.MovementDeclared) {
      const payload = getPayload(event, GameEventType.MovementDeclared);
      if (payload && payload.to) {
        state.unitPosition.set(payload.unitId, {
          q: payload.to.q,
          r: payload.to.r,
        });
      }
    }
  }

  private processDamage(event: IGameEvent, state: DetectorTrackingState): void {
    const payload = getPayload(event, GameEventType.DamageApplied);
    const { unitId, location, armorRemaining, structureRemaining } = payload;

    if (!state.unitArmor.has(event.turn)) {
      state.unitArmor.set(event.turn, new Map());
    }
    if (!state.unitStructure.has(event.turn)) {
      state.unitStructure.set(event.turn, new Map());
    }

    const turnArmor = state.unitArmor.get(event.turn)!;
    const turnStructure = state.unitStructure.get(event.turn)!;

    if (!turnArmor.has(unitId)) {
      turnArmor.set(unitId, {});
    }
    if (!turnStructure.has(unitId)) {
      turnStructure.set(unitId, {});
    }

    const armor = turnArmor.get(unitId)!;
    const structure = turnStructure.get(unitId)!;

    armor[location] = armorRemaining;
    structure[location] = structureRemaining;
  }

  private processHeat(event: IGameEvent, state: DetectorTrackingState): void {
    const payload = getPayload(event, GameEventType.HeatGenerated);
    const { unitId, newTotal } = payload;

    if (!state.unitHeat.has(event.turn)) {
      state.unitHeat.set(event.turn, new Map());
    }

    const turnHeat = state.unitHeat.get(event.turn)!;
    turnHeat.set(unitId, newTotal);
  }

  private processUnitDestroyed(
    event: IGameEvent,
    state: DetectorTrackingState,
  ): void {
    const payload = getPayload(event, GameEventType.UnitDestroyed);
    state.destroyedUnits.add(payload.unitId);
  }

  private processTurnEnded(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    const currentState = this.getCurrentTurnState(
      event.turn,
      battleState,
      state,
    );

    const currentSnapshot = createSnapshot(
      event.turn,
      currentState.armor,
      currentState.structure,
      currentState.heat,
      state.unitPosition,
    );

    this.recordCycleAnomalyIfNeeded(
      event,
      currentSnapshot,
      battleState,
      state,
      threshold,
    );

    state.snapshotHistory.push(currentSnapshot);
    state.movementThisTurn = false;
  }

  private getCurrentTurnState(
    currentTurn: number,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): CurrentTurnSnapshotState {
    this.ensureTurnMaps(currentTurn, state);

    const currentState: CurrentTurnSnapshotState = {
      armor: new Map(state.unitArmor.get(currentTurn)),
      structure: new Map(state.unitStructure.get(currentTurn)),
      heat: new Map(state.unitHeat.get(currentTurn)),
    };

    const lastSnapshot =
      state.snapshotHistory[state.snapshotHistory.length - 1];
    if (lastSnapshot) {
      this.inheritPreviousUnitState(currentState, lastSnapshot, battleState);
    }

    return currentState;
  }

  private ensureTurnMaps(
    currentTurn: number,
    state: DetectorTrackingState,
  ): void {
    if (!state.unitArmor.has(currentTurn)) {
      state.unitArmor.set(currentTurn, new Map());
    }
    if (!state.unitStructure.has(currentTurn)) {
      state.unitStructure.set(currentTurn, new Map());
    }
    if (!state.unitHeat.has(currentTurn)) {
      state.unitHeat.set(currentTurn, new Map());
    }
  }

  private inheritPreviousUnitState(
    currentState: CurrentTurnSnapshotState,
    lastSnapshot: BattleStateSnapshot,
    battleState: BattleState,
  ): void {
    for (const unit of battleState.units) {
      this.inheritUnitValue(currentState.armor, lastSnapshot.armor, unit.id);
      this.inheritUnitValue(
        currentState.structure,
        lastSnapshot.structure,
        unit.id,
      );
      this.inheritUnitValue(currentState.heat, lastSnapshot.heat, unit.id);
    }
  }

  private inheritUnitValue<T>(
    currentValues: Map<string, T>,
    lastValues: Map<string, T>,
    unitId: string,
  ): void {
    if (!currentValues.has(unitId) && lastValues.has(unitId)) {
      currentValues.set(unitId, lastValues.get(unitId)!);
    }
  }

  private recordCycleAnomalyIfNeeded(
    event: IGameEvent,
    currentSnapshot: BattleStateSnapshot,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    const cycleCount = this.countTrailingMatchingSnapshots(
      currentSnapshot,
      battleState,
      state,
    );

    if (this.shouldCreateCycleAnomaly(cycleCount, state, threshold)) {
      const anomaly = this.createAnomaly(
        event,
        state,
        currentSnapshot,
        threshold,
      );
      state.anomalies.push(anomaly);
      state.anomalyTriggered = true;
    }
  }

  private countTrailingMatchingSnapshots(
    currentSnapshot: BattleStateSnapshot,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): number {
    let cycleCount = 0;

    for (let i = state.snapshotHistory.length - 1; i >= 0; i--) {
      if (
        !snapshotsEqual(state.snapshotHistory[i], currentSnapshot, battleState)
      ) {
        break;
      }

      cycleCount++;
    }

    return cycleCount;
  }

  private shouldCreateCycleAnomaly(
    cycleCount: number,
    state: DetectorTrackingState,
    threshold: number,
  ): boolean {
    return (
      cycleCount > 0 && cycleCount >= threshold - 1 && !state.anomalyTriggered
    );
  }

  private createAnomaly(
    event: IGameEvent,
    state: DetectorTrackingState,
    snapshot: BattleStateSnapshot,
    threshold: number,
  ): IAnomaly {
    const id = `anom-state-cycle-${event.turn}-${state.anomalyCounter++}`;

    return {
      id,
      type: 'state-cycle',
      severity: 'critical',
      battleId: event.gameId,
      turn: event.turn,
      unitId: null,
      message: `Battle state repeating in cycle (threshold: ${threshold})`,
      thresholdUsed: threshold,
      actualValue: threshold,
      configKey: 'stateCycleThreshold',
      snapshot: serializeSnapshot(snapshot),
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }
}
