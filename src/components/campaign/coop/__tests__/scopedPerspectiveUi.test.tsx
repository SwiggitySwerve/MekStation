/**
 * Scoped-perspective UI (task 3.6).
 *
 * Two properties, one per audience:
 *
 * - A guest view legitimately omits events outside its grant. A view
 *   that omits SILENTLY is indistinguishable from a quiet campaign, so
 *   the partial nature must be stated. It must equally NOT report how
 *   much was withheld - a count or gap marker rebuilds exactly the
 *   inference channel the scoped projection and snapshot proofs close.
 * - The GM sees the full stream WITH each event's emission scope, so a
 *   misclassification (which every downstream filter would then
 *   faithfully obey) is discoverable by a human rather than silent.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-access-projection/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurface } from '../CampaignCoopRouteSurface';

/** Words a withheld-count indicator would plausibly use. */
const OMISSION_WORDS = [
  /hidden/i,
  /withheld/i,
  /omitted/i,
  /\b\d+\s+(events?|entries|items)\b/i,
];

function hostCampaign(): ICampaign {
  return {
    ...buildPopulatedCampaign(),
    coopSession: createHostCoopSession('ROOMAA'),
  };
}

function guestCampaign(): ICampaign {
  return {
    ...buildPopulatedCampaign(),
    coopSession: createGuestCoopSession('match-1', 'ROOMAA'),
  };
}

function event(sequence: number, type: string, scope: string): ICampaignEvent {
  return {
    type,
    sequence,
    campaignId: 'campaign-1',
    ts: '2026-08-23T10:00:00.000Z',
    authorPlayerId: 'pid-host',
    scope,
    payload: {},
  } as unknown as ICampaignEvent;
}

describe('scoped-perspective UI', () => {
  it('labels the guest view as scoped without reporting what was withheld', () => {
    render(
      <CampaignCoopRouteSurface
        campaign={guestCampaign()}
        routeId="dashboard"
        dashboardMount
        guestMirrorSummary={{ status: 'synced', balance: 100 }}
      />,
    );

    const label = screen.getByTestId('guest-scoped-perspective-label');
    expect(label).toBeInTheDocument();
    // The omission is stated...
    expect(label.textContent ?? '').toMatch(/scoped view/i);
    // ...but its SIZE never is. A future "3 events hidden" addition
    // fails here, which is the point of asserting the absence.
    const banner = screen.getByTestId(
      'campaign-coop-route-surface-guest-dashboard-banner',
    );
    for (const pattern of OMISSION_WORDS) {
      expect(banner.textContent ?? '').not.toMatch(pattern);
    }
  });

  it('never renders the GM scope audit on a guest surface', () => {
    render(
      <CampaignCoopRouteSurface
        campaign={guestCampaign()}
        routeId="dashboard"
        dashboardMount
        auditEvents={[event(1, 'FundsChanged', 'gm')]}
      />,
    );
    expect(screen.queryByTestId('gm-scope-audit')).not.toBeInTheDocument();
  });

  it('shows the GM every event with the scope it was stamped with', () => {
    render(
      <CampaignCoopRouteSurface
        campaign={hostCampaign()}
        routeId="dashboard"
        dashboardMount
        auditEvents={[
          event(1, 'FundsChanged', 'campaign'),
          event(2, 'PilotHired', 'gm'),
          event(3, 'ContractAccepted', 'team:alpha'),
        ]}
      />,
    );

    expect(screen.getByTestId('gm-scope-audit')).toBeInTheDocument();
    expect(screen.getByTestId('gm-scope-audit-scope-1')).toHaveTextContent(
      'campaign',
    );
    expect(screen.getByTestId('gm-scope-audit-scope-2')).toHaveTextContent(
      'gm',
    );
    expect(screen.getByTestId('gm-scope-audit-scope-3')).toHaveTextContent(
      'team:alpha',
    );
  });

  it('renders no audit chrome when the GM stream is empty', () => {
    render(
      <CampaignCoopRouteSurface
        campaign={hostCampaign()}
        routeId="dashboard"
        dashboardMount
        auditEvents={[]}
      />,
    );
    expect(screen.queryByTestId('gm-scope-audit')).not.toBeInTheDocument();
  });
});
