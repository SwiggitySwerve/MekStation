/**
 * Campaign Store — `reviewReady` selector
 *
 * Per `add-post-battle-review-ui` § 10.1, the post-battle review page
 * gates rendering on `reviewReady(matchId)`. This focused test asserts
 * the selector tracks the pending-outcome queue without subscribing to
 * the full list (so the dashboard banner can call it cheaply).
 *
 * @spec openspec/changes/add-post-battle-review-ui/specs/post-battle-ui/spec.md
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

describe('useCampaignStore.reviewReady', () => {
  it('returns false for an unknown matchId', () => {
    const store = createCampaignStore();
    expect(store.getState().reviewReady('match-x')).toBe(false);
  });

  it('returns false for an empty matchId', () => {
    const store = createCampaignStore();
    expect(store.getState().reviewReady('')).toBe(false);
  });

  it('returns true once the matching outcome has been enqueued', () => {
    const store = createCampaignStore();
    store.getState().enqueueOutcome(makeOutcome('match-1'));
    expect(store.getState().reviewReady('match-1')).toBe(true);
    expect(store.getState().reviewReady('match-2')).toBe(false);
  });

  it('returns false again after the outcome has been dequeued', () => {
    const store = createCampaignStore();
    store.getState().enqueueOutcome(makeOutcome('match-1'));
    expect(store.getState().reviewReady('match-1')).toBe(true);
    store.getState().dequeueOutcome('match-1');
    expect(store.getState().reviewReady('match-1')).toBe(false);
  });
});
