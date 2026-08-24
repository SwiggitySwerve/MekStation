/**
 * Campaign share panel (task 2.2).
 *
 * Pins the two decisions that carry the meaning:
 *
 * - A revoked grant stays visible and marked, because "never shared with
 *   them" and "shared and later withdrawn" are different answers to the
 *   question an owner is actually asking when auditing access.
 * - A replica renders no share controls, and says why. The server
 *   refuses a replica's share anyway, so offering a control that always
 *   fails would be its own lie.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';

import { CampaignSharePanel } from '../CampaignSharePanel';

function grant(overrides: Partial<ICampaignGrant> = {}): ICampaignGrant {
  return {
    grantId: 'grant-1',
    campaignId: 'campaign-1',
    participantId: 'participant-guest',
    issuerPublicKey: 'pk',
    scopes: ['campaign'],
    issuedAt: '2026-08-23T00:00:00.000Z',
    expiresAt: '2026-09-23T00:00:00.000Z',
    revokedAt: null,
    ...overrides,
  } as ICampaignGrant;
}

describe('CampaignSharePanel', () => {
  it('lists a grant with its scopes and offers revoke', () => {
    const onRevoke = jest.fn();
    render(
      <CampaignSharePanel
        authority={{ role: 'source' }}
        grants={[grant({ scopes: ['campaign', 'team:alpha'] })]}
        onRevoke={onRevoke}
      />,
    );

    // The SCOPE is shown, not just the fact of access: "shared" without
    // "shared how widely" is not an answer.
    expect(screen.getByTestId('share-grant-scopes-grant-1')).toHaveTextContent(
      'campaign, team:alpha',
    );
    fireEvent.click(screen.getByTestId('share-grant-revoke-grant-1'));
    expect(onRevoke).toHaveBeenCalledWith('grant-1');
  });

  it('keeps a revoked grant visible and marked, with no revoke control', () => {
    render(
      <CampaignSharePanel
        authority={{ role: 'source' }}
        grants={[grant({ revokedAt: '2026-08-25T00:00:00.000Z' })]}
      />,
    );

    expect(
      screen.getByTestId('share-grant-revoked-grant-1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('share-grant-revoke-grant-1'),
    ).not.toBeInTheDocument();
  });

  it('distinguishes never-shared from all-revoked', () => {
    const { rerender } = render(
      <CampaignSharePanel authority={{ role: 'source' }} grants={[]} />,
    );
    expect(screen.getByTestId('campaign-share-empty')).toBeInTheDocument();

    rerender(
      <CampaignSharePanel
        authority={{ role: 'source' }}
        grants={[grant({ revokedAt: '2026-08-25T00:00:00.000Z' })]}
      />,
    );
    // A campaign whose only grant was withdrawn is NOT "never shared".
    expect(
      screen.queryByTestId('campaign-share-empty'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('share-grant-revoked-grant-1'),
    ).toBeInTheDocument();
  });

  it('offers no share controls on a replica, and says why', () => {
    render(
      <CampaignSharePanel
        authority={{
          role: 'replica',
          sourceInstanceId: 'other-host',
          grantId: 'grant-upstream',
          scopes: ['campaign'],
        }}
        grants={[grant()]}
      />,
    );

    expect(
      screen.getByTestId('campaign-share-replica-notice'),
    ).toBeInTheDocument();
    // Not merely hidden - no grant row or revoke affordance is rendered
    // at all, so nothing can be clicked into a guaranteed failure.
    expect(screen.queryByTestId('share-grant-grant-1')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('share-grant-revoke-grant-1'),
    ).not.toBeInTheDocument();
  });
});
