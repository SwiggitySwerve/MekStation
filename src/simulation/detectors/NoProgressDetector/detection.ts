/**
 * No-progress detection algorithm and detector tracking state
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
  snapshotsEqual,
} from './snapshots';

/** Default threshold for no-progress detection (turns) */
const DEFAULT_NO_PROGRESS_THRESHOLD = 5;

/**
 * Internal tracking state for the detector
 */
interface DetectorTrackingState {
  /** Last snapshot of battle state */
  lastSnapshot: BattleStateSnapshot | null;
  /** Counter for consecutive turns with no progress */
  noProgressCounter: number;
  /** Unit armor per turn */
  unitArmor: Map<number, Map<string, Record<string, number>>>;
  /** Unit structure per turn */
  unitStructure: Map<number, Map<string, Record<string, number>>>;
  /** Unit heat per turn */
  unitHeat: Map<number, Map<string, number>>;
  /**
   * Per polish-wave-6.2-gaps (PT-001): latest committed hex position
   * for each unit, captured from MovementDeclared events. Keyed by
   * unitId rather than turn since we only ever need the most recent
   * position when building the turn-end snapshot.
   */
  unitPosition: Map<string, IHexCoordinate>;
  /** Whether movement occurred this turn */
  movementThisTurn: boolean;
  /** Destroyed units */
  destroyedUnits: Set<string>;
  /** Anomalies detected */
  anomalies: IAnomaly[];
  /** ID counter for anomaly generation */
  anomalyCounter: number;
  /** Current turn */
  currentTurn: number;
  /** Whether anomaly has been triggered for current no-progress period */
  anomalyTriggered: boolean;
}

interface CurrentTurnSnapshotState {
  armor: Map<string, Record<string, number>>;
  structure: Map<string, Record<string, number>>;
  heat: Map<string, number>;
}

/**
 * Detects no-progress anomalies from a stream of game events.
 *
 * Tracks battle state (armor, structure, heat) across turns.
 * When state remains unchanged for N consecutive turns, creates an anomaly.
 * Movement-only changes count as progress and reset the counter.
 */
export class NoProgressDetectionEngine {
  /**
   * Detects no-progress anomalies from a stream of game events.
   *
   * @param events - Ordered array of game events to process
   * @param battleState - Static battle context (units, sides)
   * @param threshold - No-progress threshold in turns (default: 5)
   * @returns Array of detected anomalies
   */
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold: number = DEFAULT_NO_PROGRESS_THRESHOLD,
  ): IAnomaly[] {
    const state = this.initializeTrackingState();

    for (const event of events) {
      this.processEvent(event, battleState, state, threshold);
    }

    return state.anomalies;
  }

  private initializeTrackingState(): DetectorTrackingState {
    return {
      lastSnapshot: null,
      noProgressCounter: 0,
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
    // MovementDeclared so snapshots reflect post-move positions. The
    // MovementLocked branch carries only the unitId; position only updates
    // from MovementDeclared payloads (which carry `to`).
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
    const currentTurn = event.turn;
    const currentState = this.getCurrentTurnState(
      currentTurn,
      battleState,
      state,
    );
    const currentSnapshot = createSnapshot(
      currentTurn,
      currentState.armor,
      currentState.structure,
      currentState.heat,
      state.unitPosition,
    );

    if (this.initializeFirstSnapshot(currentSnapshot, state)) {
      return;
    }

    this.updateNoProgressState(
      event,
      currentSnapshot,
      battleState,
      state,
      threshold,
    );

    state.lastSnapshot = currentSnapshot;
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

    if (state.lastSnapshot !== null) {
      this.inheritPreviousUnitState(
        currentState,
        state.lastSnapshot,
        battleState,
      );
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

  private initializeFirstSnapshot(
    currentSnapshot: BattleStateSnapshot,
    state: DetectorTrackingState,
  ): boolean {
    if (state.lastSnapshot === null) {
      state.lastSnapshot = currentSnapshot;
      state.noProgressCounter = state.movementThisTurn ? 0 : 1;
      state.movementThisTurn = false;
      return true;
    }

    return false;
  }

  private updateNoProgressState(
    event: IGameEvent,
    currentSnapshot: BattleStateSnapshot,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    const stateChanged = !snapshotsEqual(
      state.lastSnapshot!,
      currentSnapshot,
      battleState,
    );
    const progressDetected = stateChanged || state.movementThisTurn;

    if (progressDetected) {
      state.noProgressCounter = 0;
      state.anomalyTriggered = false;
    } else {
      state.noProgressCounter++;

      if (state.noProgressCounter >= threshold && !state.anomalyTriggered) {
        const anomaly = this.createAnomaly(event, state, threshold);
        state.anomalies.push(anomaly);
        state.anomalyTriggered = true;
      }
    }
  }

  private createAnomaly(
    event: IGameEvent,
    state: DetectorTrackingState,
    threshold: number,
  ): IAnomaly {
    const id = `anom-no-progress-${event.turn}-${state.anomalyCounter++}`;

    return {
      id,
      type: 'no-progress',
      severity: 'warning',
      battleId: event.gameId,
      turn: event.turn,
      unitId: null,
      message: `Battle state unchanged for ${state.noProgressCounter} turns (threshold: ${threshold})`,
      thresholdUsed: threshold,
      actualValue: state.noProgressCounter,
      configKey: 'noProgressThreshold',
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }
}
