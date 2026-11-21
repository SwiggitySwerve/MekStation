import type { IGameEvent, IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { GmReplayCorrectionEffect } from '@/types/interventions/GmReplayCorrection';

import { admitGmReplayCorrection } from '@/lib/interventions/GmReplayCorrectionAdmission';
import { GameEventType, GameStatus } from '@/types/gameplay/GameSessionCoreTypes';
import { createGmCorrectionAppliedEvent } from '@/utils/gameplay/gameEvents/gmCorrection';
import { appendEvent } from '@/utils/gameplay/gameSessionEvents';

/** Existing match-log persistence port; tests explicitly provide memory storage. */
export interface IGmCorrectionStorage {
  appendEvent(matchId: string, event: IGameEvent): Promise<unknown>;
  flushPendingWrites?(): Promise<void>;
}

export interface IApplyGmCorrectionOptions {
  readonly expectedHeadEventId: string;
  readonly storage?: IGmCorrectionStorage;
}

export function prepareInteractiveGmCorrection(
  before: IGameSession,
  effects: readonly GmReplayCorrectionEffect[],
  expectedHeadEventId: string,
): { readonly event: IGameEvent; readonly session: IGameSession } {
  if (before.currentState.status !== GameStatus.Active)
    throw new Error('gm-correction-game-not-active');
  if (before.events.at(-1)?.id !== expectedHeadEventId)
    throw new Error('gm-correction-stale-head');
  const admission = admitGmReplayCorrection(effects);
  if (admission.kind === 'refused') throw new Error(admission.reason);

  for (const effect of admission.effects) {
    if ('unitId' in effect && !before.currentState.units[effect.unitId])
      throw new Error('gm-correction-unknown-unit');
    if (effect.family === 'attack-resolution' && !before.events.some(event =>
      event.id === effect.attackId && event.type === GameEventType.AttackResolved))
      throw new Error('gm-correction-unknown-attack');
    if (effect.family === 'objective-state') {
      const former = effect.previousHexKey === undefined ? undefined : before.currentState.objectives?.[effect.previousHexKey];
      const occupied = before.currentState.objectives?.[effect.after.hexKey];
      if ((former !== undefined && former.id !== effect.objectiveId) ||
          (effect.previousHexKey !== undefined && former === undefined) ||
          (occupied !== undefined && occupied.id !== effect.objectiveId))
        throw new Error('gm-correction-objective-reference-conflict');
    }
  }

  const event = createGmCorrectionAppliedEvent(
    before.id, before.events.length, before.currentState.turn,
    before.currentState.phase, admission.effects,
  );
  return { event, session: appendEvent(before, event) };
}

/** Await transaction completion before adopting or acknowledging any values. */
export async function persistInteractiveGmCorrection(
  before: IGameSession,
  event: IGameEvent,
  storage: IGmCorrectionStorage,
): Promise<void> {
  // Drain existing normal writes first. This event remains a single atomic
  // event carrying the whole ordered multi-family effect batch.
  await storage.flushPendingWrites?.();
  const pending = storage.appendEvent(before.matchId ?? before.id, event);
  // Observe rejection immediately even if the explicit flush also rejects.
  const completed = pending.then(() => undefined);
  const flushed = storage.flushPendingWrites?.() ?? Promise.resolve();
  await Promise.all([completed, flushed]);
}
