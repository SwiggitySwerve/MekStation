/**
 * PassiveUnitDetector - Detects units inactive for N consecutive turns
 *
 * Identifies units that have not moved or attacked for a configurable number
 * of consecutive turns, with exemptions for shutdown or destroyed units.
 *
 * @example
 * ```typescript
 * const detector = new PassiveUnitDetector();
 * const anomalies = detector.detect(gameEvents, battleState, 5);
 * ```
 */

import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import {
  GameEventType,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type {
  BasicBattleState as BattleState,
  BasicBattleUnit as BattleUnit,
} from './shared/battleState';

import { getPayload } from './utils/getPayload';

export type { BattleState, BattleUnit };

// =============================================================================
// Constants
// =============================================================================

/** Default inactivity threshold (turns) */
const DEFAULT_INACTIVITY_THRESHOLD = 5;

// =============================================================================
// Internal Tracking State
// =============================================================================

interface DetectorTrackingState {
  /** Inactivity counter per unit (turn number -> count) */
  inactivityCounter: Map<string, number>;
  /** Last turn a unit was active (moved or attacked) */
  lastActiveByUnit: Map<string, number>;
  /** Units that have already triggered an anomaly for current inactivity period */
  anomalyTriggeredForUnit: Set<string>;
  /** Destroyed units */
  destroyedUnits: Set<string>;
  /** Shutdown units */
  shutdownUnits: Set<string>;
  /** Anomalies detected */
  anomalies: IAnomaly[];
  /** ID counter for anomaly generation */
  anomalyCounter: number;
  /** Current turn */
  currentTurn: number;
}

type PassiveUnitEventHandler = (
  event: IGameEvent,
  battleState: BattleState,
  state: DetectorTrackingState,
  threshold: number,
) => void;

// =============================================================================
// PassiveUnitDetector
// =============================================================================

/**
 * Detects passive unit anomalies from a stream of game events.
 *
 * Processes movement and attack events to track unit activity. Units that
 * remain inactive for N consecutive turns trigger an anomaly, unless they
 * are shutdown or destroyed.
 *
 * @example
 * ```typescript
 * const detector = new PassiveUnitDetector();
 * const anomalies = detector.detect(gameEvents, battleState, 5);
 * const warnings = anomalies.filter(a => a.severity === 'warning');
 * ```
 */
export class PassiveUnitDetector {
  private readonly eventHandlers: Partial<
    Record<GameEventType, PassiveUnitEventHandler>
  > = {
    [GameEventType.TurnEnded]: (event, battleState, state, threshold) =>
      this.processTurnEnded(event, battleState, state, threshold),
    [GameEventType.MovementDeclared]: (event, _battleState, state) =>
      this.processMovement(event, state),
    [GameEventType.MovementLocked]: (event, _battleState, state) =>
      this.processMovement(event, state),
    [GameEventType.AttackDeclared]: (event, _battleState, state) =>
      this.processAttack(event, state),
    [GameEventType.AttackLocked]: (event, _battleState, state) =>
      this.processAttack(event, state),
    [GameEventType.AttackResolved]: (event, _battleState, state) =>
      this.processAttack(event, state),
    [GameEventType.UnitDestroyed]: (event, _battleState, state) =>
      this.processUnitDestroyed(event, state),
  };

  /**
   * Detects passive unit anomalies from a stream of game events.
   *
   * @param events - Ordered array of game events to process
   * @param battleState - Static battle context (units, sides)
   * @param threshold - Inactivity threshold in turns (default: 5)
   * @returns Array of detected anomalies
   */
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold: number = DEFAULT_INACTIVITY_THRESHOLD,
  ): IAnomaly[] {
    const state = this.initializeTrackingState(battleState);

    for (const event of events) {
      this.processEvent(event, battleState, state, threshold);
    }

    return state.anomalies;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private initializeTrackingState(
    battleState: BattleState,
  ): DetectorTrackingState {
    const inactivityCounter = new Map<string, number>();
    const lastActiveByUnit = new Map<string, number>();

    // Initialize all units with 0 inactivity counter and turn 0 as last active
    for (const unit of battleState.units) {
      inactivityCounter.set(unit.id, 0);
      lastActiveByUnit.set(unit.id, 0);
    }

    return {
      inactivityCounter,
      lastActiveByUnit,
      anomalyTriggeredForUnit: new Set(),
      destroyedUnits: new Set(),
      shutdownUnits: new Set(),
      anomalies: [],
      anomalyCounter: 0,
      currentTurn: 0,
    };
  }

  // ===========================================================================
  // Event Processing
  // ===========================================================================

  private processEvent(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    // Update current turn
    state.currentTurn = event.turn;

    this.eventHandlers[event.type]?.(event, battleState, state, threshold);
  }

  private processTurnEnded(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    // Check each unit for inactivity
    for (const unit of battleState.units) {
      // Skip destroyed or shutdown units
      if (
        state.destroyedUnits.has(unit.id) ||
        state.shutdownUnits.has(unit.id)
      ) {
        continue;
      }

      const lastActive = state.lastActiveByUnit.get(unit.id) || 0;
      const turnsSinceActive = event.turn - lastActive;

      // If unit has been inactive for threshold turns or more
      if (turnsSinceActive >= threshold) {
        const counter = (state.inactivityCounter.get(unit.id) || 0) + 1;
        state.inactivityCounter.set(unit.id, counter);

        // Create anomaly when counter reaches threshold (only once per inactivity period)
        if (counter === 1 && !state.anomalyTriggeredForUnit.has(unit.id)) {
          const anomaly = this.createAnomaly(
            event,
            unit.id,
            unit.name,
            turnsSinceActive,
            threshold,
            state,
          );
          state.anomalies.push(anomaly);
          state.anomalyTriggeredForUnit.add(unit.id);
        }
      } else {
        // Reset counter if unit was active recently
        state.inactivityCounter.set(unit.id, 0);
        state.anomalyTriggeredForUnit.delete(unit.id);
      }
    }
  }

  private processMovement(
    event: IGameEvent,
    state: DetectorTrackingState,
  ): void {
    if (event.actorId) {
      state.lastActiveByUnit.set(event.actorId, event.turn);
      state.inactivityCounter.set(event.actorId, 0);
    }
  }

  private processAttack(event: IGameEvent, state: DetectorTrackingState): void {
    if (event.actorId) {
      state.lastActiveByUnit.set(event.actorId, event.turn);
      state.inactivityCounter.set(event.actorId, 0);
    }
  }

  private processUnitDestroyed(
    event: IGameEvent,
    state: DetectorTrackingState,
  ): void {
    const payload = getPayload(event, GameEventType.UnitDestroyed);
    state.destroyedUnits.add(payload.unitId);
  }

  // ===========================================================================
  // Anomaly Creation
  // ===========================================================================

  private createAnomaly(
    event: IGameEvent,
    unitId: string,
    unitName: string,
    turnsSinceActive: number,
    threshold: number,
    state: DetectorTrackingState,
  ): IAnomaly {
    const id = `anom-passive-unit-${event.turn}-${state.anomalyCounter++}`;

    return {
      id,
      type: 'passive-unit',
      severity: 'warning',
      battleId: event.gameId,
      turn: event.turn,
      unitId,
      message: `${unitName} inactive for ${turnsSinceActive} turns (threshold: ${threshold})`,
      thresholdUsed: threshold,
      actualValue: turnsSinceActive,
      configKey: 'passiveUnitThreshold',
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }
}
