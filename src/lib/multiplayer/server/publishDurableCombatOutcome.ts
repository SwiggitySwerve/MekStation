/** Publish only a pending durable outcome; consumption owns its receipt. */
import { publishCombatOutcome } from '@/engine/combatOutcomeBus';

import type { IMatchStore } from './IMatchStore';

import { hasCombatOutcomeOutbox } from './IMatchStore';

/** True only when this attempt consumed and marked the durable outcome. */
export async function publishDurableCombatOutcome(
  store: IMatchStore,
  matchId: string,
): Promise<boolean> {
  if (!hasCombatOutcomeOutbox(store)) return false;
  const record = await store.getCombatOutcomeOutbox(matchId);
  if (record == null || record.publishedAt != null) return false;
  const consumed = publishCombatOutcome({
    matchId: record.matchId,
    outcome: record.outcome,
  });
  if (!consumed) return false;
  await store.markCombatOutcomePublished(matchId, record.outcomeId);
  return true;
}
