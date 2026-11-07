/**
 * Post-Battle Review Page wiring test
 *
 * Asserts the page-level wiring between the "Return to Campaign" CTA on
 * `PostBattleReviewScreen` and `useCampaignStore.markBattleReviewed` —
 * the implementation that closes `add-post-battle-review-ui` § 8.3.
 *
 * @spec openspec/changes/add-post-battle-review-ui/specs/after-combat-report/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import * as battleHelpers from '@/lib/campaign/processors/postBattleProcessor.helpers';
import PostBattleReviewPage from '@/pages/gameplay/games/[id]/review';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  type ICombatOutcome,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

jest.mock('@/lib/campaign/processors/postBattleProcessor.helpers', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/processors/postBattleProcessor.helpers')
  >('@/lib/campaign/processors/postBattleProcessor.helpers');
  return { ...actual, applyUnitDelta: jest.fn(actual.applyUnitDelta) };
});

const routerPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { id: 'match-001' },
    push: (...args: unknown[]) => routerPush(...args),
  }),
}));

function makeOutcome(): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'match-001',
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.ObjectiveMet,
    capturedAt: '2026-04-25T00:00:00.000Z',
    report: {
      version: 1,
      matchId: 'match-001',
      winner: GameSide.Player,
      reason: 'objective',
      turnCount: 1,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [
      {
        unitId: 'unit-1',
        side: GameSide.Player,
        destroyed: false,
        finalStatus: UnitFinalStatus.Intact,
        armorRemaining: {},
        internalsRemaining: {},
        destroyedLocations: [],
        destroyedComponents: [],
        heatEnd: 0,
        ammoRemaining: {},
        pilotState: {
          conscious: true,
          wounds: 0,
          killed: false,
          finalStatus: PilotFinalStatus.Active,
        },
      },
    ],
  };
}

describe('PostBattleReviewPage — Return to Campaign CTA', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    localStorage.clear();
    resetCampaignStore();
    routerPush.mockReset();
  });

  it('does not apply a stale review outcome already recorded in the store ledger', () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Review', 'mercenary');
    store.getState().enqueueOutcome(makeOutcome());
    store.setState({ processedBattleIds: ['match-001'] });
    render(<PostBattleReviewPage />);
    fireEvent.click(screen.getByTestId('apply-outcome-cta'));
    expect(store.getState().campaign?.unitCombatStates).toEqual({});
  });

  it('shows per-unit failures without navigating away or offering to repeat committed effects', () => {
    const store = useCampaignStore();
    store.getState().createCampaign('Review Failure', 'mercenary');
    store.getState().enqueueOutcome(makeOutcome());
    jest.spyOn(battleHelpers, 'applyUnitDelta').mockImplementationOnce(() => {
      throw new Error('unit data unavailable');
    });
    render(<PostBattleReviewPage />);
    fireEvent.click(screen.getByTestId('apply-outcome-cta'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'unit unit-1: unit data unavailable',
    );
    expect(routerPush).not.toHaveBeenCalled();
    expect(store.getState().processedBattleIds).toContain('match-001');
    expect(screen.getByTestId('apply-outcome-cta')).toBeDisabled();
    expect(
      screen.queryByTestId('retry-application-cta'),
    ).not.toBeInTheDocument();
  });

  it('marks the battle reviewed and drains the pending queue when no campaign is loaded', () => {
    const store = useCampaignStore();
    store.getState().enqueueOutcome(makeOutcome());
    expect(store.getState().reviewReady('match-001')).toBe(true);

    render(<PostBattleReviewPage />);

    fireEvent.click(screen.getByTestId('apply-outcome-cta'));

    expect(store.getState().reviewReady('match-001')).toBe(false);
    expect(store.getState().getReviewedAt('match-001')).not.toBeNull();
    expect(store.getState().getPendingOutcomeCount()).toBe(0);
  });
});
