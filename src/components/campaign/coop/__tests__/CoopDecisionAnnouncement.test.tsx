/**
 * Decisions are announced, not just drawn (umbrella 19.3).
 *
 * Before this, a case-insensitive sweep for `role="status"` / `aria-live`
 * across `src/components/campaign/coop/*.tsx` matched the two posture
 * banners and NOTHING else. So the one thing a guest most needs to hear -
 * whether the GM approved or vetoed the proposal they raised - reached a
 * screen reader only if the user happened to go looking for the feed. A
 * sighted player sees the row turn green or amber; everyone else got
 * silence at the exact moment the answer arrived.
 *
 * The announcement is DELIBERATELY separate from the feed list rather than
 * a live region wrapped around it. The feed holds pending rows too, so a
 * live region around the whole list would re-read the entire queue every
 * time anything changed - which is how live regions become noise people
 * learn to tune out.
 *
 * The host side announces what the HOST did, not what the server
 * committed: this surface hands the decision to a callback and never sees
 * the acknowledgement, so "submitted" is the strongest honest word. The
 * queue row disappearing is the commit signal.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import { deriveGmLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';

import { GuestProposalSurface } from '../GuestProposalSurface';
import { HostGmReviewSurface } from '../HostGmReviewSurface';

// =============================================================================
// Fixtures
// =============================================================================

function tracked(
  kind: string,
  status: string,
  outcomeLabel: string,
): Record<string, unknown> {
  return {
    proposal: {
      proposalId: `p-${kind}-${status}`,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-09-02T10:00:00.000Z',
      intent: { kind, campaignId: 'campaign-1', intentId: 'i1', payload: {} },
    },
    status,
    outcomeLabel,
  };
}

function guestApi(proposals: readonly Record<string, unknown>[]) {
  return {
    proposals,
    isPending: () => false,
    submit: jest.fn(async () => undefined),
  } as never;
}

function pendingProposal(id: string): IPendingProposal {
  return {
    proposal: {
      proposalId: id,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-09-02T10:00:00.000Z',
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

// =============================================================================
// Guest
// =============================================================================

describe('guest decision announcement', () => {
  it('announces the outcome through a live region', () => {
    render(
      <GuestProposalSurface
        api={guestApi([
          tracked('HirePilot', 'committed', 'Approved by the GM'),
        ])}
        actions={[]}
      />,
    );

    const announcement = screen.getByTestId('guest-decision-announcement');
    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toHaveAttribute('aria-atomic', 'true');
    expect(announcement).toHaveTextContent('HirePilot');
    expect(announcement).toHaveTextContent('Approved by the GM');
  });

  it('distinguishes a veto from a mechanical rejection when spoken', () => {
    // The surface already draws these differently (amber vs red). A
    // screen-reader user gets the same distinction only if the WORDS
    // differ - colour is not an announcement.
    const { rerender } = render(
      <GuestProposalSurface
        api={guestApi([tracked('HirePilot', 'vetoed', 'Vetoed by the GM')])}
        actions={[]}
      />,
    );
    expect(screen.getByTestId('guest-decision-announcement')).toHaveTextContent(
      'Vetoed by the GM',
    );

    rerender(
      <GuestProposalSurface
        api={guestApi([
          tracked('HirePilot', 'mechanically-rejected', 'Not possible'),
        ])}
        actions={[]}
      />,
    );
    expect(screen.getByTestId('guest-decision-announcement')).toHaveTextContent(
      'Not possible',
    );
  });

  it('stays silent while nothing has been decided', () => {
    // An empty live region is correct here: announcing "awaiting" on
    // every render would speak over the player for the whole wait.
    render(
      <GuestProposalSurface
        api={guestApi([tracked('HirePilot', 'pending', '')])}
        actions={[]}
      />,
    );

    expect(
      screen.getByTestId('guest-decision-announcement'),
    ).toBeEmptyDOMElement();
  });

  it('announces the newest decision, not the first', () => {
    render(
      <GuestProposalSurface
        api={guestApi([
          tracked('HirePilot', 'committed', 'Approved by the GM'),
          tracked('SpendFunds', 'vetoed', 'Vetoed by the GM'),
        ])}
        actions={[]}
      />,
    );

    const announcement = screen.getByTestId('guest-decision-announcement');
    expect(announcement).toHaveTextContent('SpendFunds');
    expect(announcement).not.toHaveTextContent('HirePilot');
  });
});

// =============================================================================
// Host
// =============================================================================

describe('host decision announcement', () => {
  function renderHost(onDecide = jest.fn()) {
    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p1')]}
        onDecide={onDecide as never}
        lifecycle={deriveGmLifecyclePosture({
          refusal: null,
          pendingProposalCount: 1,
        })}
      />,
    );
    return onDecide;
  }

  it('announces a confirmed veto through a live region', () => {
    renderHost();

    fireEvent.click(screen.getByTestId('veto-p1'));
    fireEvent.click(screen.getByTestId('veto-confirm'));

    const announcement = screen.getByTestId('gm-decision-announcement');
    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toHaveTextContent(/veto/i);
    expect(announcement).toHaveTextContent('Proposal p1');
  });

  it('says nothing when the host backs out of the veto', () => {
    // A cancelled destructive action that announces itself would tell a
    // screen-reader user the opposite of what happened.
    renderHost();

    fireEvent.click(screen.getByTestId('veto-p1'));
    fireEvent.click(screen.getByTestId('veto-cancel'));

    expect(
      screen.getByTestId('gm-decision-announcement'),
    ).toBeEmptyDOMElement();
  });

  it('announces an approval too', () => {
    renderHost();

    fireEvent.click(screen.getByTestId('approve-p1'));

    expect(screen.getByTestId('gm-decision-announcement')).toHaveTextContent(
      /approv/i,
    );
  });

  it('claims only that the decision was sent, never that it committed', () => {
    // This surface hands the decision to a callback and never sees an
    // acknowledgement. Saying "vetoed" would assert a server outcome it
    // has no evidence for; the row leaving the queue is that evidence.
    renderHost();

    fireEvent.click(screen.getByTestId('veto-p1'));
    fireEvent.click(screen.getByTestId('veto-confirm'));

    expect(screen.getByTestId('gm-decision-announcement')).toHaveTextContent(
      /sent|submitted/i,
    );
  });
});
