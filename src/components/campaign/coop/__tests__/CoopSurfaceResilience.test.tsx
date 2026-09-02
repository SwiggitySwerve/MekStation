/**
 * Persistence and narrow-viewport contracts (umbrella 19.3).
 *
 * Both groups here are REGRESSION PINS, not fixes. The behaviours they
 * describe are already correct on `main`: a sweep for `setTimeout` /
 * `setInterval` across `src/components/campaign/coop/*.tsx` finds one hit
 * and it is in a Storybook mock transport, so nothing auto-dismisses a
 * refusal today; and the decision controls already declare `flex-wrap`.
 * Writing them as pins is the point - these are exactly the properties
 * that get quietly destroyed by a later "tidy the toast away" or a switch
 * to a horizontally scrolling toolbar, and neither change would fail any
 * other test in this tree.
 *
 * WHAT THE VIEWPORT ROWS DO AND DO NOT PROVE. jsdom loads no CSS and
 * performs no layout, so nothing here measures geometry - a
 * computed-style assertion would return an empty string and pass while
 * meaning nothing. These rows pin SOURCE ORDER and the CLASS CONTRACT,
 * and are named so in the row titles. The geometry claim is the layout
 * sweep's, at its canonical `mobile-375` viewport. 360px is NOT tested by
 * either: the sweep's narrowest canonical width is 375, and substituting
 * one for the other would be a claim about a width nothing exercises.
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import { deriveGmLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';

import { HostGmReviewSurface } from '../HostGmReviewSurface';

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

function renderRefused() {
  return render(
    <HostGmReviewSurface
      pending={[pendingProposal('p1')]}
      onDecide={() => {}}
      lifecycle={deriveGmLifecyclePosture({
        refusal: 'CAMPAIGN_NOT_CONVERGED',
        pendingProposalCount: 1,
      })}
    />,
  );
}

// =============================================================================
// Persistent text
// =============================================================================

describe('refusal text persists until acted on', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('survives ten minutes of timers without self-dismissing', () => {
    // The strongest available form of "no timer clears it": run the clock
    // far past any plausible toast duration and require the text to still
    // be there. A `setTimeout` added later to tidy the banner away would
    // fail here and nowhere else.
    jest.useFakeTimers();
    renderRefused();

    expect(
      screen.getByTestId('gm-lifecycle-recovery-description'),
    ).toBeVisible();

    // Wrapped in `act`, and that is the whole load-bearing detail. A bare
    // `advanceTimersByTime` fires the callback but leaves the resulting
    // React state update unflushed, so the DOM still holds the old markup
    // and the assertions below pass whether or not a timer just hid the
    // banner. A mutant that auto-dismissed the refusal after five seconds
    // survived this row until the advance was wrapped.
    act(() => {
      jest.advanceTimersByTime(600_000);
    });

    expect(
      screen.getByTestId('gm-lifecycle-recovery-description'),
    ).toBeVisible();
    expect(screen.getByTestId('gm-lifecycle-state')).toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('gm-lifecycle-recovery')).toBeInTheDocument();
  });

  it('survives re-renders that do not change the refusal', () => {
    // A conflict message that evaporates because the parent re-rendered
    // is indistinguishable, to a player, from one that was never shown.
    const { rerender } = renderRefused();

    for (let pass = 0; pass < 3; pass += 1) {
      rerender(
        <HostGmReviewSurface
          pending={[pendingProposal('p1'), pendingProposal(`p-extra-${pass}`)]}
          onDecide={() => {}}
          lifecycle={deriveGmLifecyclePosture({
            refusal: 'CAMPAIGN_NOT_CONVERGED',
            pendingProposalCount: 2,
          })}
        />,
      );
    }

    expect(screen.getByTestId('gm-lifecycle-recovery')).toBeInTheDocument();
    expect(screen.getByTestId('gm-lifecycle-state')).toHaveAttribute(
      'data-state',
      'blocked',
    );
  });

  it('clears only when the host acts on it', () => {
    // The other half of "until acted on": it must not be permanent
    // either, or the recovery action would be a button that does nothing.
    const onClear = jest.fn();
    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p1')]}
        onDecide={() => {}}
        onClearLifecycleRefusal={onClear}
        lifecycle={deriveGmLifecyclePosture({
          refusal: 'CAMPAIGN_NOT_CONVERGED',
          pendingProposalCount: 1,
        })}
      />,
    );

    fireEvent.click(screen.getByTestId('gm-lifecycle-recovery'));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Narrow viewport - source order and class contract only
// =============================================================================

describe('narrow-viewport contract at mobile-375', () => {
  it('source order: the decisions precede the secondary tools', () => {
    // On a wrapping row the earliest controls are the ones that stay on
    // the first line as width shrinks. Approve and Veto are what the host
    // came to the queue to do; Manual and GM Fix are escape hatches.
    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p1')]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal: null,
          pendingProposalCount: 1,
        })}
      />,
    );

    const row = screen.getByTestId('pending-proposal-p1');
    const order = within(row)
      .getAllByRole('button')
      .map((button) => button.getAttribute('data-testid'));

    expect(order.indexOf('approve-p1')).toBeLessThan(
      order.indexOf('manual-takeover-p1'),
    );
    expect(order.indexOf('veto-p1')).toBeLessThan(
      order.indexOf('gm-correction-p1'),
    );
  });

  it('class contract: the decision row wraps rather than scrolling', () => {
    // A horizontally scrolling toolbar hides its tail off-screen at
    // narrow widths with no affordance saying so. Wrapping keeps every
    // control reachable without a sideways gesture.
    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p1')]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal: null,
          pendingProposalCount: 1,
        })}
      />,
    );

    const controls = screen.getByTestId('approve-p1').parentElement;
    expect(controls?.className).toContain('flex-wrap');
    expect(controls?.className).not.toContain('overflow-x');
    expect(controls?.className).not.toContain('flex-nowrap');
  });

  it('class contract: the destructive confirmation answers wrap and are 44px tall', () => {
    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p1')]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal: null,
          pendingProposalCount: 1,
        })}
      />,
    );
    fireEvent.click(screen.getByTestId('veto-p1'));

    const confirm = screen.getByTestId('veto-confirm');
    const cancel = screen.getByTestId('veto-cancel');
    // The one place the 44px target is asserted, because it is the one
    // place the markup actually declares it. The review row's buttons use
    // a smaller pad and this suite does NOT claim otherwise.
    expect(confirm.className).toContain('min-h-[44px]');
    expect(cancel.className).toContain('min-h-[44px]');
    expect(confirm.parentElement?.className).toContain('flex-wrap');
  });
});
