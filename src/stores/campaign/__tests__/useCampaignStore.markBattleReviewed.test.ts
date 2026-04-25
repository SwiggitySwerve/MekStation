/**
 * Campaign Store — `markBattleReviewed` action
 *
 * Per `add-post-battle-review-ui` § 8.3, the post-battle review screen's
 * "Return to Campaign" CTA stamps the matchId with an epoch-ms reviewed-at
 * timestamp AND drains it from `pendingBattleOutcomes` so the dashboard
 * banner stops surfacing it.
 *
 * @spec openspec/changes/add-post-battle-review-ui/specs/after-combat-report/spec.md
 */

import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

function makeOutcome(matchId: string): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.ObjectiveMet,
    capturedAt: '2026-04-25T00:00:00.000Z',
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'objective',
      turnCount: 1,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
  };
}

describe('useCampaignStore.markBattleReviewed', () => {
  it('removes the matched outcome from the pending queue', () => {
    const store = createCampaignStore();
    store.getState().enqueueOutcome(makeOutcome('match-1'));
    expect(store.getState().getPendingOutcomeCount()).toBe(1);

    store.getState().markBattleReviewed('match-1');

    expect(store.getState().getPendingOutcomeCount()).toBe(0);
    expect(store.getState().reviewReady('match-1')).toBe(false);
  });

  it('records an epoch-ms reviewedAt timestamp for the matchId', () => {
    const store = createCampaignStore();
    store.getState().enqueueOutcome(makeOutcome('match-1'));

    const before = Date.now();
    store.getState().markBattleReviewed('match-1');
    const after = Date.now();

    const reviewedAt = store.getState().getReviewedAt('match-1');
    expect(reviewedAt).not.toBeNull();
    expect(reviewedAt as number).toBeGreaterThanOrEqual(before);
    expect(reviewedAt as number).toBeLessThanOrEqual(after);
  });

  it('returns null reviewedAt for an unreviewed matchId', () => {
    const store = createCampaignStore();
    expect(store.getState().getReviewedAt('match-x')).toBeNull();
  });

  it('leaves other pending outcomes untouched', () => {
    const store = createCampaignStore();
    store.getState().enqueueOutcome(makeOutcome('match-1'));
    store.getState().enqueueOutcome(makeOutcome('match-2'));

    store.getState().markBattleReviewed('match-1');

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
    expect(store.getState().reviewReady('match-2')).toBe(true);
    expect(store.getState().getReviewedAt('match-2')).toBeNull();
  });

  it('is a no-op for an unknown matchId (no entry in queue)', () => {
    const store = createCampaignStore();
    store.getState().enqueueOutcome(makeOutcome('match-1'));

    store.getState().markBattleReviewed('match-x');

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
    expect(store.getState().getReviewedAt('match-x')).not.toBeNull();
  });

  it('is a no-op for an empty matchId', () => {
    const store = createCampaignStore();
    store.getState().enqueueOutcome(makeOutcome('match-1'));

    store.getState().markBattleReviewed('');

    expect(store.getState().getPendingOutcomeCount()).toBe(1);
    expect(store.getState().getReviewedAt('')).toBeNull();
  });
});
