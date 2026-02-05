/**
 * LongGameDetector - Detects battles exceeding expected turn count
 *
 * Identifies battles that extend beyond a configurable threshold of turns.
 * This detector tracks the highest turn number seen and creates a single
 * battle-level anomaly when the threshold is exceeded.
 *
 * @example
 * ```typescript
 * const detector = new LongGameDetector();
 * const anomalies = detector.detect(gameEvents, 50);
 * ```
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

// =============================================================================
// Constants
// =============================================================================

/** Default threshold for long-game detection (turns) */
const DEFAULT_LONG_GAME_THRESHOLD = 50;

// =============================================================================
// Internal Tracking State
// =============================================================================

interface BattleTrackingState {
  /** Highest turn number seen for this battle */
  maxTurn: number;
  /** Whether anomaly has been triggered for this battle */
  anomalyTriggered: boolean;
}

interface DetectorTrackingState {
  /** Per-battle tracking state */
  battleStates: Map<string, BattleTrackingState>;
  /** Anomalies detected */
  anomalies: IAnomaly[];
  /** ID counter for anomaly generation */
  anomalyCounter: number;
}

// =============================================================================
// LongGameDetector
// =============================================================================

/**
 * Detects long-game anomalies from a stream of game events.
 *
 * Tracks the highest turn number encountered. When the turn count exceeds
 * the threshold, creates a single battle-level anomaly (turn=null, unitId=null).
 * The anomaly is only created once per battle.
 *
 * @example
 * ```typescript
 * const detector = new LongGameDetector();
 * const anomalies = detector.detect(gameEvents, 50);
 * const infoAnomalies = anomalies.filter(a => a.severity === 'info');
 * ```
 */
export class LongGameDetector {
  /**
   * Detects long-game anomalies from a stream of game events.
   *
   * @param events - Ordered array of game events to process
   * @param threshold - Long-game threshold in turns (default: 50)
   * @returns Array of detected anomalies
   */
  detect(
    events: readonly IGameEvent[],
    threshold: number = DEFAULT_LONG_GAME_THRESHOLD,
  ): IAnomaly[] {
    const state = this.initializeTrackingState();

    for (const event of events) {
      this.processEvent(event, state, threshold);
    }

    return state.anomalies;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private initializeTrackingState(): DetectorTrackingState {
    return {
      battleStates: new Map(),
      anomalies: [],
      anomalyCounter: 0,
    };
  }

  private getBattleState(
    state: DetectorTrackingState,
    battleId: string,
  ): BattleTrackingState {
    if (!state.battleStates.has(battleId)) {
      state.battleStates.set(battleId, {
        maxTurn: 0,
        anomalyTriggered: false,
      });
    }
    return state.battleStates.get(battleId)!;
  }

  // ===========================================================================
  // Event Processing
  // ===========================================================================

  private processEvent(
    event: IGameEvent,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    const battleState = this.getBattleState(state, event.gameId);

    if (event.turn > battleState.maxTurn) {
      battleState.maxTurn = event.turn;

      if (event.turn > threshold && !battleState.anomalyTriggered) {
        const anomaly = this.createAnomaly(
          event,
          state,
          battleState,
          threshold,
        );
        state.anomalies.push(anomaly);
        battleState.anomalyTriggered = true;
      }
    }
  }

  // ===========================================================================
  // Anomaly Creation
  // ===========================================================================

  private createAnomaly(
    event: IGameEvent,
    state: DetectorTrackingState,
    battleState: BattleTrackingState,
    threshold: number,
  ): IAnomaly {
    const id = `anom-long-game-${event.gameId}-${state.anomalyCounter++}`;

    return {
      id,
      type: 'long-game',
      severity: 'info',
      battleId: event.gameId,
      turn: null,
      unitId: null,
      message: `Battle exceeded expected duration (turn ${battleState.maxTurn}, threshold: ${threshold})`,
      thresholdUsed: threshold,
      actualValue: battleState.maxTurn,
      configKey: 'longGameThreshold',
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }
}
