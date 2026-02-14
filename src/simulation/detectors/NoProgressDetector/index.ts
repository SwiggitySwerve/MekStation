import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import type { BattleState } from './types';

import { NoProgressDetectionEngine } from './detection';

export type { BattleUnit, BattleState } from './types';
export { getUnitName } from './types';

export type { BattleStateSnapshot } from './snapshots';
export { snapshotsEqual, createSnapshot, serializeSnapshot } from './snapshots';

/**
 * Detects no-progress anomalies from a stream of game events.
 *
 * Tracks battle state (positions, armor, structure, heat) across turns.
 * When state remains unchanged for N consecutive turns, creates an anomaly.
 * Movement-only changes count as progress and reset the counter.
 */
export class NoProgressDetector {
  private engine = new NoProgressDetectionEngine();

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
    threshold?: number,
  ): IAnomaly[] {
    return this.engine.detect(events, battleState, threshold);
  }
}
