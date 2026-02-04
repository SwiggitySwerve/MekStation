/**
 * HeatSuicideDetector - Detects units generating excessive heat
 *
 * Identifies units that generate heat above a configurable threshold,
 * with an exemption for units in last-ditch scenarios (outnumbered 3:1 or more).
 *
 * @example
 * ```typescript
 * const detector = new HeatSuicideDetector();
 * const anomalies = detector.detect(gameEvents, battleState, 30);
 * ```
 */

import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';
import {
  GameEventType,
  GameSide,
  type IGameEvent,
  type IHeatPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import { getPayload } from './utils/getPayload';

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

/** Default heat threshold for anomaly detection */
const DEFAULT_HEAT_THRESHOLD = 30;

/** Outnumbering ratio for last-ditch exemption (3:1 or more) */
const LAST_DITCH_RATIO = 3;

// =============================================================================
// Internal Tracking State
// =============================================================================

interface DetectorTrackingState {
  /** Total heat per unit per turn */
  heatPerUnitPerTurn: Map<number, Map<string, number>>;
  /** Destroyed units */
  destroyedUnits: Set<string>;
  /** Anomalies detected */
  anomalies: IAnomaly[];
  /** ID counter for anomaly generation */
  anomalyCounter: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Counts operational (non-destroyed) units for a given side.
 */
function countOperationalUnits(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
  side: GameSide,
): number {
  let count = 0;
  for (const unit of units) {
    if (unit.side === side && !destroyedUnits.has(unit.id)) {
      count++;
    }
  }
  return count;
}

/**
 * Gets a unit name by ID, falling back to the ID itself.
 */
function getUnitName(units: readonly BattleUnit[], unitId: string): string {
  const unit = units.find((u) => u.id === unitId);
  return unit ? unit.name : unitId;
}

/**
 * Gets the side of a unit by ID.
 */
function getUnitSide(units: readonly BattleUnit[], unitId: string): GameSide | undefined {
  const unit = units.find((u) => u.id === unitId);
  return unit?.side;
}

/**
 * Checks if a unit is outnumbered 3:1 or more (last-ditch scenario).
 */
function isLastDitchScenario(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
  unitId: string,
): boolean {
  const unitSide = getUnitSide(units, unitId);
  if (!unitSide) return false;

  const allyCount = countOperationalUnits(units, destroyedUnits, unitSide);
  const enemyCount = countOperationalUnits(
    units,
    destroyedUnits,
    unitSide === GameSide.Player ? GameSide.Opponent : GameSide.Player,
  );

  // Unit is outnumbered 3:1 or more if enemy count >= 3 * ally count
  return enemyCount >= LAST_DITCH_RATIO * allyCount;
}

// =============================================================================
// HeatSuicideDetector
// =============================================================================

/**
 * Detects units generating excessive heat from a stream of game events.
 *
 * Processes HeatGenerated events and identifies units that exceed a heat threshold,
 * with an exemption for units in last-ditch scenarios (outnumbered 3:1 or more).
 *
 * @example
 * ```typescript
 * const detector = new HeatSuicideDetector();
 * const anomalies = detector.detect(gameEvents, battleState, 30);
 * const warnings = anomalies.filter(a => a.severity === 'warning');
 * ```
 */
export class HeatSuicideDetector {
  /**
   * Detects heat suicide anomalies from a stream of game events.
   *
   * @param events - Ordered array of game events to process
   * @param battleState - Static battle context (units, sides)
   * @param threshold - Heat threshold for anomaly detection (default: 30)
   * @returns Array of detected anomalies
   */
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold: number = DEFAULT_HEAT_THRESHOLD,
  ): IAnomaly[] {
    const state = this.initializeTrackingState();

    for (const event of events) {
      this.processEvent(event, battleState, state, threshold);
    }

    return state.anomalies;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private initializeTrackingState(): DetectorTrackingState {
    return {
      heatPerUnitPerTurn: new Map(),
      destroyedUnits: new Set(),
      anomalies: [],
      anomalyCounter: 0,
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
    switch (event.type) {
      case GameEventType.HeatGenerated:
        this.processHeatGenerated(event, battleState, state, threshold);
        break;

      case GameEventType.UnitDestroyed:
        this.processUnitDestroyed(event, state);
        break;

      default:
        break;
    }
  }

  private processHeatGenerated(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    const payload = getPayload<IHeatPayload>(event);
    const { unitId, newTotal } = payload;

    // Track heat per unit per turn
    if (!state.heatPerUnitPerTurn.has(event.turn)) {
      state.heatPerUnitPerTurn.set(event.turn, new Map());
    }
    const turnHeat = state.heatPerUnitPerTurn.get(event.turn)!;
    turnHeat.set(unitId, newTotal);

    // Check if heat exceeds threshold
    if (newTotal > threshold) {
      // Check for last-ditch exemption
      if (isLastDitchScenario(battleState.units, state.destroyedUnits, unitId)) {
        return; // Exempt from anomaly detection
      }

      // Create anomaly
      const unitName = getUnitName(battleState.units, unitId);
      const anomaly = this.createAnomaly(
        event,
        unitId,
        unitName,
        newTotal,
        threshold,
        state,
      );
      state.anomalies.push(anomaly);
    }
  }

  private processUnitDestroyed(event: IGameEvent, state: DetectorTrackingState): void {
    const payload = getPayload<{ readonly unitId: string }>(event);
    state.destroyedUnits.add(payload.unitId);
  }

  // ===========================================================================
  // Anomaly Creation
  // ===========================================================================

  private createAnomaly(
    event: IGameEvent,
    unitId: string,
    unitName: string,
    actualValue: number,
    threshold: number,
    state: DetectorTrackingState,
  ): IAnomaly {
    const id = `anom-heat-suicide-${event.turn}-${state.anomalyCounter++}`;

    return {
      id,
      type: 'heat-suicide',
      severity: 'warning',
      battleId: event.gameId,
      turn: event.turn,
      unitId,
      message: `${unitName} generated ${actualValue} heat (threshold: ${threshold})`,
      thresholdUsed: threshold,
      actualValue,
      configKey: 'heatSuicideThreshold',
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }
}
