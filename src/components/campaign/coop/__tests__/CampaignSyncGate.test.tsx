/**
 * The guest command gate on screen (task 5.6).
 *
 * Pins that the posture actually reaches the controls: a degraded
 * replica renders its reason persistently AND withholds the buttons,
 * and a converged one offers them. Also pins the distinction between
 * "this action is already in flight" and "none of these can be trusted
 * right now" — merging them would leave a player unable to tell a busy
 * surface from a stale one.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { toCampaignLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';
import { deriveCampaignSyncUxPosture } from '@/lib/campaign/replica/campaignSyncUxState';

import { GuestProposalSurface } from '../GuestProposalSurface';

const ACTION = {
  kind: 'HirePilot' as ICampaignIntent['kind'],
  label: 'Hire Pilot',
  buildIntent: (): ICampaignIntent =>
    ({
      campaignId: 'campaign-gate',
      intentId: 'intent-gate-1',
      kind: 'HirePilot',
      payload: { pilot: {}, cost: 0 },
    }) as unknown as ICampaignIntent,
};

/** A proposals API with nothing in flight. */
function idleApi(pendingKinds: readonly string[] = []) {
  return {
    proposals: [],
    isPending: (kind: string) => pendingKinds.includes(kind),
    submit: jest.fn(async () => undefined),
  } as never;
}

function posture(
  overrides: Partial<Parameters<typeof deriveCampaignSyncUxPosture>[0]> = {},
): ICampaignLifecyclePosture {
  // The lifecycle name rides ON the shipped sync posture, so these rows
  // keep asserting `data-sync-state` exactly as they did.
  return toCampaignLifecyclePosture(
    deriveCampaignSyncUxPosture({
      connection: 'connected',
      refusedReason: null,
      awaitingRebaseline: false,
      deliveredSequence: 3,
      appliedSequence: 3,
      joinCompleted: true,
      ...overrides,
    }),
    {
      proposalAwaitingGm: false,
      lastProposalCommitted: false,
      refusal: null,
    },
  );
}

describe('guest command gate', () => {
  it('offers the control once the replica is converged', () => {
    render(
      <GuestProposalSurface
        api={idleApi()}
        actions={[ACTION]}
        syncPosture={posture()}
      />,
    );

    expect(screen.getByTestId('guest-action-HirePilot')).toBeEnabled();
    expect(screen.getByTestId('campaign-sync-state')).toHaveAttribute(
      'data-sync-state',
      'live',
    );
  });

  it('withholds the control and says why while the share is refused', () => {
    render(
      <GuestProposalSurface
        api={idleApi()}
        actions={[ACTION]}
        syncPosture={posture({ refusedReason: 'revoked' })}
      />,
    );

    const button = screen.getByTestId('guest-action-HirePilot');
    expect(button).toBeDisabled();
    // The reason is on the button too, so the disabled state is not a
    // mystery a player has to correlate with a banner somewhere else.
    expect(button).toHaveAttribute('data-sync-blocked', 'true');
    expect(screen.getByTestId('campaign-sync-state')).toHaveAttribute(
      'data-sync-state',
      'blocked',
    );
  });

  it('withholds the control while still catching up', () => {
    render(
      <GuestProposalSurface
        api={idleApi()}
        actions={[ACTION]}
        syncPosture={posture({ joinCompleted: false })}
      />,
    );

    expect(screen.getByTestId('guest-action-HirePilot')).toBeDisabled();
    expect(screen.getByTestId('campaign-sync-state')).toHaveAttribute(
      'data-sync-state',
      'catching-up',
    );
  });

  it('shows the banner even when everything is fine', () => {
    // A banner that appears only on trouble teaches a player that its
    // absence means nothing in particular.
    render(
      <GuestProposalSurface
        api={idleApi()}
        actions={[ACTION]}
        syncPosture={posture()}
      />,
    );

    expect(screen.getByTestId('campaign-sync-state')).toBeInTheDocument();
  });

  it('distinguishes an in-flight action from a stale view', () => {
    render(
      <GuestProposalSurface
        api={idleApi(['HirePilot'])}
        actions={[ACTION]}
        syncPosture={posture()}
      />,
    );

    const button = screen.getByTestId('guest-action-HirePilot');
    expect(button).toBeDisabled();
    // Disabled because it is pending, NOT because sync is degraded.
    expect(button).not.toHaveAttribute('data-sync-blocked');
    expect(
      screen.getByTestId('guest-action-HirePilot-pending'),
    ).toBeInTheDocument();
  });

  it('leaves surfaces with no replica behind them exactly as they were', () => {
    // Omitting the posture must not silently disable controls that were
    // always safe on a non-replica surface.
    render(<GuestProposalSurface api={idleApi()} actions={[ACTION]} />);

    expect(screen.getByTestId('guest-action-HirePilot')).toBeEnabled();
    expect(screen.queryByTestId('campaign-sync-state')).not.toBeInTheDocument();
  });
});
