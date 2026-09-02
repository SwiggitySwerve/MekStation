/**
 * Tests for `HostGmReviewSurface` (CO2, tasks 7.4).
 *
 * Covers: the review surface lists pending proposals with campaign
 * context (balance, standing, roster effect); approve and veto controls
 * forward the host's decision.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import { buildCoopCampaignAuthorityProjection } from '@/lib/command-screen';

import { HostGmReviewSurface } from '../HostGmReviewSurface';

function pendingSpend(id: string): IPendingProposal {
  return {
    proposal: {
      proposalId: id,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-05-19T10:00:00.000Z',
      intent: {
        kind: 'SpendFunds',
        campaignId: 'campaign-1',
        intentId: `intent-${id}`,
        payload: { amount: 80_000, reason: 'Refit' },
      },
    },
    balanceAtSubmit: 600_000,
    relevantStanding: null,
    effectSummary: 'Spend 80,000 C-bills — Refit',
  };
}

function pendingContract(id: string): IPendingProposal {
  return {
    proposal: {
      proposalId: id,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-05-19T10:00:00.000Z',
      intent: {
        kind: 'AcceptContract',
        campaignId: 'campaign-1',
        intentId: `intent-${id}`,
        payload: {
          contract: {
            contractId: 'c1',
            name: 'Garrison Duty',
            employerFactionId: 'davion',
          },
        },
      },
    },
    balanceAtSubmit: 600_000,
    relevantStanding: 12,
    effectSummary: 'Accept contract Garrison Duty',
  };
}

describe('HostGmReviewSurface — pending list', () => {
  it('shows host-GM command authority and full decision controls', () => {
    const onPreview = jest.fn();
    const onManualTakeover = jest.fn();
    const onGmCorrection = jest.fn();
    render(
      <HostGmReviewSurface
        pending={[pendingSpend('p1')]}
        onDecide={() => {}}
        onPreview={onPreview}
        onManualTakeover={onManualTakeover}
        onGmCorrection={onGmCorrection}
        authorityProjection={buildCoopCampaignAuthorityProjection({
          mode: 'host',
          routeId: 'dashboard',
          pendingProposalCount: 1,
        })}
      />,
    );

    expect(
      screen.getByTestId('host-command-authority-projection'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('host-command-authority-summary'),
    ).toHaveTextContent('Host GM authority');
    expect(
      screen.getByTestId('host-command-authority-private'),
    ).toHaveTextContent('GM-private');

    screen.getByTestId('preview-p1').click();
    screen.getByTestId('manual-takeover-p1').click();
    screen.getByTestId('gm-correction-p1').click();

    expect(onPreview).toHaveBeenCalledWith('p1');
    expect(onManualTakeover).toHaveBeenCalledWith('p1');
    expect(onGmCorrection).toHaveBeenCalledWith('p1');
  });

  it('lists pending proposals with balance and effect context', () => {
    render(
      <HostGmReviewSurface
        pending={[pendingSpend('p1'), pendingContract('p2')]}
        onDecide={() => {}}
      />,
    );
    expect(screen.getByTestId('pending-proposal-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pending-proposal-p2')).toBeInTheDocument();
    // Balance context is shown for each.
    expect(screen.getByTestId('proposal-balance-p1')).toHaveTextContent(
      '600,000',
    );
    // Faction standing is shown only when relevant (the contract).
    expect(screen.getByTestId('proposal-standing-p2')).toHaveTextContent('12');
    expect(screen.queryByTestId('proposal-standing-p1')).toBeNull();
    // The roster/ledger effect summary is shown.
    expect(
      screen.getByText('Spend 80,000 C-bills — Refit'),
    ).toBeInTheDocument();
  });

  it('renders an empty state when there are no pending proposals', () => {
    render(<HostGmReviewSurface pending={[]} onDecide={() => {}} />);
    expect(screen.getByTestId('host-gm-review-empty')).toBeInTheDocument();
  });
});

describe('HostGmReviewSurface — decisions', () => {
  it('forwards an approve decision', () => {
    const onDecide = jest.fn();
    render(
      <HostGmReviewSurface
        pending={[pendingSpend('p1')]}
        onDecide={onDecide}
      />,
    );
    screen.getByTestId('approve-p1').click();
    expect(onDecide).toHaveBeenCalledWith('p1', 'approve');
  });

  it('forwards a veto decision once the host confirms it', () => {
    // Veto became a two-step action in umbrella 19.3: it rejects another
    // player's proposal irreversibly, so it asks before it decides. This
    // row keeps asserting that the decision still reaches `onDecide` with
    // the same arguments - only the step that raises it moved.
    const onDecide = jest.fn();
    render(
      <HostGmReviewSurface
        pending={[pendingSpend('p1')]}
        onDecide={onDecide}
      />,
    );

    // `fireEvent` rather than a raw `.click()`: opening the confirmation
    // is a React state update, and only the act()-wrapped helper flushes
    // the re-render that puts the dialog in the DOM.
    fireEvent.click(screen.getByTestId('veto-p1'));
    expect(onDecide).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('veto-confirm'));
    expect(onDecide).toHaveBeenCalledWith('p1', 'veto');
  });
});
