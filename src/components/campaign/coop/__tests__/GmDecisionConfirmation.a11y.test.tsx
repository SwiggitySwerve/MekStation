/**
 * Accessibility of the veto confirmation (umbrella 19.3/19.4).
 *
 * A confirmation dialog is the one place where getting the accessibility
 * tree wrong is worst: it is modal, so a screen-reader user who cannot
 * identify it is trapped in something they cannot name. The shipped
 * `DialogTemplate` puts `aria-labelledby` on its CONTENT div rather than
 * on the element carrying `role="dialog"`, which leaves the dialog
 * announced as just "dialog" - the reason this surface does not build on
 * it, and the reason the name is asserted here by ROLE rather than by
 * testid.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import React from 'react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import { HostGmReviewSurface } from '@/components/campaign/coop/HostGmReviewSurface';
import { deriveGmLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';

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

function renderWithDialogOpen() {
  const view = render(
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
  return view;
}

describe('veto confirmation a11y', () => {
  it('renders with no axe violations while open', async () => {
    const { container } = renderWithDialogOpen();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('is a modal dialog with an accessible name', () => {
    renderWithDialogOpen();

    // By role and NAME. A dialog with no name is announced as "dialog"
    // and nothing else, which is indistinguishable from every other
    // dialog in the product.
    const dialog = screen.getByRole('dialog', { name: /veto this proposal/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('describes the proposal it would reject', () => {
    // The name says what the dialog is; the description says which row it
    // is about. Without the second, a queue of several proposals makes
    // "are you sure?" an invitation to reject the wrong one.
    renderWithDialogOpen();

    const dialog = screen.getByRole('dialog', { name: /veto this proposal/i });
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      'Proposal p1',
    );
  });

  it('offers both answers as real buttons', () => {
    // Keyboard activation (Enter/Space) and focusability come from the
    // platform for a <button> and have to be rebuilt by hand for anything
    // else - which is how confirmations end up mouse-only.
    renderWithDialogOpen();

    expect(screen.getByTestId('veto-confirm').tagName).toBe('BUTTON');
    expect(screen.getByTestId('veto-cancel').tagName).toBe('BUTTON');
  });
});
