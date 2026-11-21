import { parseGmCorrectionAppliedPayload } from '@/lib/interventions/GmReplayCorrectionSchema';
import { GameEventType, type GamePhase } from '@/types/gameplay/GameSessionCoreTypes';
import type { IGameEvent } from '@/types/gameplay/GameSessionStatusEvents';
import type { GmReplayCorrectionEffect } from '@/types/interventions/GmReplayCorrection';

import { createEventBase, generateEventId } from './base';

/** Event identity and correction identity use independent platform UUIDv4 draws. */
export function createGmCorrectionAppliedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  effects: readonly GmReplayCorrectionEffect[],
): IGameEvent {
  const { actorId: _actorId, side: _side, ...base } = createEventBase(
    gameId, sequence, GameEventType.GmCorrectionApplied, turn, phase,
  );
  return {
    ...base,
    payload: parseGmCorrectionAppliedPayload({
      correctionId: generateEventId(),
      effects,
    }),
  };
}
