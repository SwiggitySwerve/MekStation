/**
 * Seam test for audit finding D-6 (2026-06-09 audit, remediation W3.4).
 *
 * The review page's Apply runs `applyPostBattle` → `updateCampaign` →
 * `markBattleReviewed`. Pre-fix, only the campaign-embedded
 * `processedBattleIds` ledger learned about the applied match — the
 * STORE-level ledger (the one `advanceDay`, `persistCampaignRecord`, and
 * the enqueue dedup guard read) was never updated, so the next
 * `advanceDay` rebuilt the campaign from the stale store ledger and a
 * re-published outcome could re-enqueue + double-apply.
 */
import type { ICampaignWithBattleState } from '@/lib/campaign/processors/postBattleProcessor';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { applyPostBattle } from '@/lib/campaign/processors/postBattleProcessor';
import { createCampaignStore } from '@/stores/campaign/useCampaignStore';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

/** Minimal campaign-linked outcome (no unit deltas — ledger-only test). */
function makeOutcome(matchId: string): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: 'contract-1',
    scenarioId: 'scenario-1',
    endReason: CombatEndReason.ObjectiveMet,
    capturedAt: '2026-06-09T00:00:00.000Z',
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

beforeEach(() => {
  localStorageMock.clear();
});

describe('review-page Apply syncs the store-level processedBattleIds ledger (D-6)', () => {
  /** Replays the exact review-page Apply sequence against a live store. */
  function applyViaReviewPage(
    store: ReturnType<typeof createCampaignStore>,
    outcome: ICombatOutcome,
  ): void {
    const state = store.getState();
    const campaign = state.campaign as ICampaignWithBattleState;
    const result = applyPostBattle(outcome, campaign);
    state.updateCampaign(result.campaign);
    state.markBattleReviewed(outcome.matchId);
  }

  it('marks the applied match processed at store level and persists it', () => {
    const store = createCampaignStore();
    const campaignId = store
      .getState()
      .createCampaign('Review Ledger Co.', 'mercenary');
    const outcome = makeOutcome('match-review-1');
    store.getState().enqueueOutcome(outcome);

    applyViaReviewPage(store, outcome);

    // Store-level ledger learned about the applied battle…
    expect(store.getState().processedBattleIds).toContain('match-review-1');
    // …and the persisted record carries it (so a reload keeps the dedup).
    const stored = localStorageMock.getItem(`campaign-${campaignId}`);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!) as {
      state: { processedBattleIds: string[] };
    };
    expect(parsed.state.processedBattleIds).toContain('match-review-1');
  });

  it('rejects a re-published outcome for an already-applied match', () => {
    const store = createCampaignStore();
    store.getState().createCampaign('Review Dedup Co.', 'mercenary');
    const outcome = makeOutcome('match-review-2');
    store.getState().enqueueOutcome(outcome);

    applyViaReviewPage(store, outcome);

    // The combat-outcome bus may re-publish the same matchId (HMR, replay,
    // reconnect). The enqueue guard reads the STORE ledger — it must now
    // know the battle was applied via the review page.
    store.getState().enqueueOutcome(makeOutcome('match-review-2'));
    expect(store.getState().getPendingOutcomes()).toHaveLength(0);
  });
});
