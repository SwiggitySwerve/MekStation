/**
 * K14b PR4: a co-op guest's Hire and Accept proposals are disabled with a
 * visible reason.
 *
 * The guest surface used to raise a `HirePilot` naming an invented recruit
 * at 12,000 C-bills and an `AcceptContract` naming an invented contract.
 * Both kinds are now judged against the host's market, which guests do not
 * receive, so the guest has no real offer to name. The controls stay on the
 * page (so the guest learns why) but cannot raise a proposal.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { GuestProposalResult } from '@/types/campaign/CoopCampaign';

import { COOP_GUEST_MARKET_REFUSAL } from '@/lib/campaign/markets/offerLifecycle';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { createGuestCoopSession } from '@/types/campaign/CoopSession';

import { CampaignCoopRouteSurface } from '../CampaignCoopRouteSurface';

function guestCampaign(): ICampaign {
  return {
    ...buildPopulatedCampaign(),
    coopSession: createGuestCoopSession('match-1', 'ROOMAA'),
  };
}

describe('guest market proposals', () => {
  it.each([
    ['hiring', 'HireOffer', 'Propose: Hire Pilot'],
    ['personnel', 'HireOffer', 'Propose: Hire Pilot'],
    ['contract-market', 'AcceptContract', 'Propose: Accept Contract'],
  ] as const)(
    'disables the %s route proposal with a visible reason and raises nothing',
    (routeId, kind, label) => {
      const transport = jest.fn(
        async (): Promise<GuestProposalResult> =>
          ({ status: 'pending' }) as unknown as GuestProposalResult,
      );
      render(
        <CampaignCoopRouteSurface
          campaign={guestCampaign()}
          routeId={routeId}
          proposalTransport={transport}
        />,
      );

      const button = screen.getByTestId(`guest-action-${kind}`);
      expect(button).toHaveTextContent(label);
      expect(button).toBeDisabled();
      const reason = screen.getByTestId(`guest-action-${kind}-reason`);
      expect(reason).toHaveTextContent(COOP_GUEST_MARKET_REFUSAL);
      expect(button).toHaveAttribute('aria-describedby', reason.id);

      fireEvent.click(button);
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it('keeps the funds proposal available', () => {
    render(
      <CampaignCoopRouteSurface
        campaign={guestCampaign()}
        routeId="finances"
      />,
    );

    expect(screen.getByTestId('guest-action-SpendFunds')).toBeEnabled();
    expect(
      screen.queryByTestId('guest-action-SpendFunds-reason'),
    ).not.toBeInTheDocument();
  });
});
