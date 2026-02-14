import { useMemo } from 'react';

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';
import type { BattleState } from '@/types/simulation/BattleState';

import { KeyMomentDetector } from '@/simulation/detectors/KeyMomentDetector';

export function useKeyMoments(
  events: readonly IGameEvent[],
  battleState: BattleState,
): readonly IKeyMoment[] {
  return useMemo(() => {
    const detector = new KeyMomentDetector();
    return detector.detect(events, battleState);
  }, [events, battleState]);
}
