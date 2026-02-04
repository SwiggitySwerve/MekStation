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
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Types
// =============================================================================

/**
 * Static information about a unit in the battle.
 * Provided by the caller to give the detector context about each unit.
 */
export interface BattleUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide;
}

/**
 * Static battle context provided to the detector.
 * Contains all participating units with their starting attributes.
 */
export interface BattleState {
  readonly units: readonly BattleUnit[];
}

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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets a unit name by ID, falling back to the ID itself.
 */
 
function _getUnitName(units: readonly BattleUnit[], unitId: string): string {
  const unit = units.find((u) => u.id === unitId);
  return unit ? unit.name : unitId;
}

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

  private initializeTrackingState(battleState: BattleState): DetectorTrackingState {
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

    switch (event.type) {
      case GameEventType.TurnEnded:
        this.processTurnEnded(event, battleState, state, threshold);
        break;

      case GameEventType.MovementDeclared:
      case GameEventType.MovementLocked:
        this.processMovement(event, state);
        break;

      case GameEventType.AttackDeclared:
      case GameEventType.AttackLocked:
      case GameEventType.AttackResolved:
        this.processAttack(event, state);
        break;

      case GameEventType.UnitDestroyed:
        this.processUnitDestroyed(event, state);
        break;

      default:
        break;
    }
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
      if (state.destroyedUnits.has(unit.id) || state.shutdownUnits.has(unit.id)) {
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

  private processMovement(event: IGameEvent, state: DetectorTrackingState): void {
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

  private processUnitDestroyed(event: IGameEvent, state: DetectorTrackingState): void {
    // eslint-disable-next-line no-restricted-syntax
    const payload = event.payload as unknown as { readonly unitId: string };
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
