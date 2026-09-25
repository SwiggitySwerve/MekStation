/**
 * No dead GM controls on the host review surface (roadmap U36).
 *
 * The campaign dashboard mounts `HostGmReviewSurface` through
 * `CampaignCoopRouteSurface`, which has no Preview, Manual or GM Fix
 * handler to pass. On the baseline the surface defaulted each missing
 * handler to `() => {}` and rendered the button anyway, so the host saw
 * three controls that did nothing when pressed. The rule these rows hold
 * is the unit's: a control either does something when pressed or is not
 * rendered.
 *
 * The first two rows mount the REAL route surface in host dashboard mode,
 * not the review surface with hand-picked props, so they fail if the
 * route ever passes a handler that does nothing, as well as if the
 * surface invents one.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { ICampaign } from '@/types/campaign/Campaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurface } from '../CampaignCoopRouteSurface';
import { HostGmReviewSurface } from '../HostGmReviewSurface';

// =============================================================================
// Fixtures
// =============================================================================

function pendingProposal(id: string): IPendingProposal {
  return {
    proposal: {
      proposalId: id,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-09-25T10:00:00.000Z',
      intent: {
        kind: 'SpendFunds',
        campaignId: 'campaign-1',
        intentId: `intent-${id}`,
        payload: { amount: 1, reason: 'x' },
      },
    },
    balanceAtSubmit: 600_000,
    relevantStanding: null,
    effectSummary: `Proposal ${id}`,
  } as unknown as IPendingProposal;
}

function hostCampaign(): ICampaign {
  return {
    ...buildPopulatedCampaign(),
    coopSession: createHostCoopSession('ROOMAA'),
  };
}

/** The dashboard mount, exactly as the dashboard renders it for a host. */
function renderDashboardMount(onDecide: jest.Mock) {
  return render(
    <CampaignCoopRouteSurface
      campaign={hostCampaign()}
      routeId="dashboard"
      dashboardMount
      pendingProposals={[pendingProposal('p1')]}
      onDecide={onDecide}
    />,
  );
}

function rowButtonIds(): (string | null)[] {
  return within(screen.getByTestId('pending-proposal-p1'))
    .getAllByRole('button')
    .map((button) => button.getAttribute('data-testid'));
}

// =============================================================================
// The dashboard mount
// =============================================================================

describe('the host dashboard review mount', () => {
  it('renders Approve and Veto only', () => {
    renderDashboardMount(jest.fn());

    expect(rowButtonIds()).toEqual(['approve-p1', 'veto-p1']);
  });

  it('renders no control that does nothing when pressed', () => {
    // One fresh mount per control, so a dialog one press opened cannot
    // be mistaken for the effect of the next.
    const ids = (() => {
      const { unmount } = renderDashboardMount(jest.fn());
      const found = rowButtonIds();
      unmount();
      return found;
    })();

    const dead: string[] = [];
    for (const id of ids) {
      const onDecide = jest.fn();
      const { container, unmount } = renderDashboardMount(onDecide);
      const before = container.innerHTML;
      fireEvent.click(screen.getByTestId(id as string));
      const didSomething =
        onDecide.mock.calls.length > 0 || container.innerHTML !== before;
      if (!didSomething) dead.push(id as string);
      unmount();
    }

    expect(dead).toEqual([]);
  });
});

// =============================================================================
// The secondary controls, one handler at a time
// =============================================================================

const SECONDARY = [
  { prop: 'onPreview', testId: 'preview-p1' },
  { prop: 'onManualTakeover', testId: 'manual-takeover-p1' },
  { prop: 'onGmCorrection', testId: 'gm-correction-p1' },
] as const;

describe('the review surface secondary controls', () => {
  it.each(SECONDARY)(
    'renders $testId only when $prop is supplied, and presses reach it',
    ({ prop, testId }) => {
      const handler = jest.fn();
      render(
        <HostGmReviewSurface
          pending={[pendingProposal('p1')]}
          onDecide={jest.fn()}
          {...{ [prop]: handler }}
        />,
      );

      const others = SECONDARY.filter((entry) => entry.testId !== testId).map(
        (entry) => entry.testId,
      );
      for (const other of others) {
        expect(screen.queryByTestId(other)).not.toBeInTheDocument();
      }

      fireEvent.click(screen.getByTestId(testId));
      expect(handler).toHaveBeenCalledWith('p1');
    },
  );
});
