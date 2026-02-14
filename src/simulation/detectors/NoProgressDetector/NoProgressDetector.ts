import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import type { BattleState } from './types';

import { NoProgressDetectionEngine } from './detection';

export class NoProgressDetector {
  private engine = new NoProgressDetectionEngine();

  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold?: number,
  ): IAnomaly[] {
    return this.engine.detect(events, battleState, threshold);
  }
}
