import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import type { BattleState } from './types';

import { StateCycleDetectionEngine } from './detection';

export class StateCycleDetector {
  private engine = new StateCycleDetectionEngine();

  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold?: number,
  ): IAnomaly[] {
    return this.engine.detect(events, battleState, threshold);
  }
}
