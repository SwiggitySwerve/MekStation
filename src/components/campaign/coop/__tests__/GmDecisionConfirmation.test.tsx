/**
 * The GM's veto asks first, and the keyboard can answer (umbrella 19.3).
 *
 * Veto is the destructive authority action on this surface: it rejects a
 * guest's proposal, it is GM-only, and unlike Preview / Manual / GM Fix it
 * is actually wired to a transport (`onDecide` -> `sendDecision`). Building
 * the confirmation on one of the no-op controls would have produced a
 * dialog that passed its own tests while confirming nothing.
 *
 * The keyboard rows are the point. A confirmation a mouse can answer and a
 * keyboard cannot is worse than no confirmation at all - it adds a step
 * that only some people can complete. So: focus enters the dialog, Tab
 * cycles inside it, Escape cancels, and focus RETURNS to where it came
 * from when the dialog closes. The shipped modal stack (ModalOverlay ->
 * DialogTemplate) already gives the trap and Escape; it does NOT restore
 * focus on close, which is why that is asserted here rather than assumed.
 *
 * The last group is the refusal case, which is a real stranding bug rather
 * than a nicety: when a refusal disables the very button the host just
 * pressed, the browser drops focus to <body> and a keyboard user is
 * silently thrown to the top of the document.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import { deriveGmLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';

import { HostGmReviewSurface } from '../HostGmReviewSurface';

// =============================================================================
// Fixtures
// =============================================================================

/** A pending proposal of an arbitrary kind, with the id under test. */
function pendingProposal(id: string, kind = 'SpendFunds'): IPendingProposal {
  return {
    proposal: {
      proposalId: id,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-09-02T10:00:00.000Z',
      intent: {
        kind,
        campaignId: 'campaign-1',
        intentId: `intent-${id}`,
        payload:
          kind === 'AdvanceDay' ? { days: 1 } : { amount: 1, reason: 'x' },
      },
    },
    balanceAtSubmit: 600_000,
    relevantStanding: null,
    effectSummary: `Proposal ${id}`,
  } as unknown as IPendingProposal;
}

function renderSurface(
  overrides: {
    pending?: readonly IPendingProposal[];
    onDecide?: (id: string, decision: string) => void;
    refusal?: Parameters<typeof deriveGmLifecyclePosture>[0]['refusal'];
  } = {},
) {
  const onDecide = overrides.onDecide ?? jest.fn();
  const view = render(
    <HostGmReviewSurface
      pending={overrides.pending ?? [pendingProposal('p1')]}
      onDecide={onDecide as never}
      lifecycle={deriveGmLifecyclePosture({
        refusal: overrides.refusal ?? null,
        pendingProposalCount: (overrides.pending ?? [pendingProposal('p1')])
          .length,
      })}
    />,
  );
  return { ...view, onDecide };
}

// =============================================================================
// The confirmation itself
// =============================================================================

describe('veto confirmation', () => {
  it('does not decide on the first press', () => {
    // The whole point: one press opens a question, it does not reject a
    // player's proposal.
    const { onDecide } = renderSurface();

    fireEvent.click(screen.getByTestId('veto-p1'));

    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.getByTestId('veto-confirmation')).toBeInTheDocument();
  });

  it('decides only after the host confirms', () => {
    const { onDecide } = renderSurface();

    fireEvent.click(screen.getByTestId('veto-p1'));
    fireEvent.click(screen.getByTestId('veto-confirm'));

    expect(onDecide).toHaveBeenCalledWith('p1', 'veto');
    expect(screen.queryByTestId('veto-confirmation')).toBeNull();
  });

  it('decides nothing when the host backs out', () => {
    const { onDecide } = renderSurface();

    fireEvent.click(screen.getByTestId('veto-p1'));
    fireEvent.click(screen.getByTestId('veto-cancel'));

    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.queryByTestId('veto-confirmation')).toBeNull();
  });

  it('names the proposal it is about to reject', () => {
    // A confirmation that says "are you sure?" without saying to WHAT is
    // an invitation to reject the wrong row from a queue of several.
    renderSurface({
      pending: [pendingProposal('p1'), pendingProposal('p2')],
    });

    fireEvent.click(screen.getByTestId('veto-p2'));

    expect(screen.getByTestId('veto-confirmation')).toHaveTextContent(
      'Proposal p2',
    );
  });

  it('cancels on Escape without deciding', () => {
    const { onDecide } = renderSurface();

    fireEvent.click(screen.getByTestId('veto-p1'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.queryByTestId('veto-confirmation')).toBeNull();
  });
});

// =============================================================================
// Keyboard completeness
// =============================================================================

describe('veto confirmation keyboard completeness', () => {
  it('moves focus into the dialog when it opens', () => {
    // Without this the keyboard user is still standing on the veto button
    // behind an overlay they cannot see, and Tab walks the page underneath.
    renderSurface();

    fireEvent.click(screen.getByTestId('veto-p1'));

    const dialog = screen.getByTestId('veto-confirmation');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('keeps Tab inside the dialog', () => {
    renderSurface();
    fireEvent.click(screen.getByTestId('veto-p1'));
    const dialog = screen.getByTestId('veto-confirmation');
    const focusable = within(dialog).getAllByRole('button');

    // Tab from the LAST focusable must wrap to the FIRST rather than
    // escaping to the surface behind the overlay. Asserting the identity
    // of the wrapped-to element, not merely that focus is still somewhere
    // inside: focus starts inside, so "still inside" is true before the
    // key is pressed and would pass with no trap at all.
    //
    // Dispatched on the focused element rather than on `document`, because
    // that is where a real Tab originates and `trapFocus` listens on the
    // dialog container - a document-level dispatch never reaches it and
    // makes this row vacuous.
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
  });

  it('wraps backwards from the first focusable too', () => {
    renderSurface();
    fireEvent.click(screen.getByTestId('veto-p1'));
    const dialog = screen.getByTestId('veto-confirmation');
    const focusable = within(dialog).getAllByRole('button');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(last);
  });

  it('returns focus to the veto control after cancelling', () => {
    // The shipped ModalOverlay traps focus but never restores it, so on
    // close the keyboard user is dropped on <body>.
    renderSurface();
    const veto = screen.getByTestId('veto-p1');
    veto.focus();

    fireEvent.click(veto);
    fireEvent.click(screen.getByTestId('veto-cancel'));

    expect(document.activeElement).toBe(screen.getByTestId('veto-p1'));
  });

  it('leaves focus on a real control after the decision commits', () => {
    // After confirming, the row this dialog was about is typically gone.
    // Focus must land somewhere a keyboard can continue from - never on
    // <body>, which silently returns the user to the top of the document.
    renderSurface();
    screen.getByTestId('veto-p1').focus();

    fireEvent.click(screen.getByTestId('veto-p1'));
    fireEvent.click(screen.getByTestId('veto-confirm'));

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
  });
});

// =============================================================================
// Focus after a refusal
// =============================================================================

describe('focus after a refusal', () => {
  it('rescues focus from the control the refusal disabled', () => {
    // The host presses Approve on a progression proposal; the server
    // refuses; the button they are standing on becomes disabled. A
    // disabled element cannot hold focus, so the browser drops it to
    // <body> - the keyboard user is thrown to the top of the document
    // with no signal. Focus moves to the recovery action instead, which
    // is the thing they can actually do next.
    const { rerender } = renderSurface({
      pending: [pendingProposal('p-day', 'AdvanceDay')],
    });
    const approve = screen.getByTestId('approve-p-day');
    approve.focus();
    expect(document.activeElement).toBe(approve);

    rerender(
      <HostGmReviewSurface
        pending={[pendingProposal('p-day', 'AdvanceDay')]}
        onDecide={jest.fn() as never}
        lifecycle={deriveGmLifecyclePosture({
          refusal: 'CAMPAIGN_NOT_CONVERGED',
          pendingProposalCount: 1,
        })}
      />,
    );

    expect(screen.getByTestId('approve-p-day')).toBeDisabled();
    expect(document.activeElement).toBe(
      screen.getByTestId('gm-lifecycle-recovery'),
    );
  });

  it('does not steal focus from a host who was working elsewhere', () => {
    // Focus rescue is exactly that - a rescue. Moving focus on an async
    // frame for someone who never touched the refused control would yank
    // the cursor out from under them mid-task.
    renderSurface({ pending: [pendingProposal('p-day', 'AdvanceDay')] });
    const veto = screen.getByTestId('veto-p-day');
    veto.focus();

    render(
      <HostGmReviewSurface
        pending={[pendingProposal('p-day', 'AdvanceDay')]}
        onDecide={jest.fn() as never}
        lifecycle={deriveGmLifecyclePosture({
          refusal: 'CAMPAIGN_NOT_CONVERGED',
          pendingProposalCount: 1,
        })}
      />,
    );

    expect(document.activeElement).toBe(veto);
  });
});
