import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import type { BattleState } from './types';

import { StateCycleDetectionEngine } from './detection';

export type { BattleUnit, BattleState } from './types';
export { getUnitName } from './types';

export type { BattleStateSnapshot } from './snapshots';
export { snapshotsEqual, createSnapshot, serializeSnapshot } from './snapshots';

/**
 * Detects state cycle anomalies from a stream of game events.
 *
 * Tracks battle state (armor, structure, heat) across turns.
 * When the same state repeats N times, creates an anomaly.
 * This indicates an infinite loop or deadlock situation.
 */
export class StateCycleDetector {
  private engine = new StateCycleDetectionEngine();

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
    threshold?: number,
  ): IAnomaly[] {
    return this.engine.detect(events, battleState, threshold);
  }
}
