/**
 * S1b inert display (matrix row K): a contract this build cannot process is
 * shown with its stored fields and a reason, never with a Launch link or an
 * enabled Accept.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import type { IContract } from '@/types/campaign/Mission';

import { OfferCard } from '@/components/campaign/command/ContractMarketPanel';
import { MissionCard } from '@/pages/gameplay/campaigns/[id]/missions';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';

function contract(version: unknown, status: MissionStatus): IContract {
  const base = createContract({
    id: 'c1',
    name: 'Display Test',
    employerId: 'davion',
    targetId: 'liao',
    status,
    paymentTerms: createPaymentTerms({ basePayment: new Money(400) }),
  });
  return version === undefined
    ? base
    : ({ ...base, lifecycleRulesVersion: version } as IContract);
}

describe('inert contract display', () => {
  afterEach(cleanup);

  it('shows the badge, keeps the stored fields, and offers no Launch link', () => {
    render(
      <MissionCard
        campaignId="camp"
        mission={contract(2, MissionStatus.ACTIVE)}
      />,
    );
    expect(screen.getByTestId('mission-inert-c1')).toHaveTextContent(
      'Needs a Newer MekStation',
    );
    expect(screen.getByText('davion')).toBeInTheDocument();
    expect(screen.getByTestId('mission-status-c1')).toHaveTextContent(
      MissionStatus.ACTIVE,
    );
    expect(screen.queryByTestId('mission-launch-c1')).toBeNull();
  });

  it('names unreadable contract data differently', () => {
    render(
      <MissionCard
        campaignId="camp"
        mission={contract('two', MissionStatus.ACTIVE)}
      />,
    );
    expect(screen.getByTestId('mission-inert-c1')).toHaveTextContent(
      'Unreadable Contract Data',
    );
    expect(screen.queryByTestId('mission-launch-c1')).toBeNull();
  });

  it.each([undefined, 1])(
    'control: a legacy contract (%s) keeps its Launch link and shows no badge',
    (version) => {
      render(
        <MissionCard
          campaignId="camp"
          mission={contract(version, MissionStatus.ACTIVE)}
        />,
      );
      expect(screen.queryByTestId('mission-inert-c1')).toBeNull();
      expect(screen.getByTestId('mission-launch-c1')).toBeInTheDocument();
    },
  );

  it('an inert market offer shows the badge and a disabled Accept with the reason', () => {
    render(
      <OfferCard
        offer={contract(2, MissionStatus.PENDING)}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        isBusy={false}
      />,
    );
    expect(screen.getByTestId('offer-inert-c1')).toBeInTheDocument();
    const accept = screen.getByTestId('offer-accept-c1');
    expect(accept).toBeDisabled();
    expect(accept).toHaveAttribute('title', expect.stringMatching(/newer/i));
    // Decline stays available: leaving an offer alone is always safe.
    expect(screen.getByTestId('offer-decline-c1')).toBeEnabled();
  });

  it('control: a legacy offer can be accepted', () => {
    render(
      <OfferCard
        offer={contract(undefined, MissionStatus.PENDING)}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        isBusy={false}
      />,
    );
    expect(screen.queryByTestId('offer-inert-c1')).toBeNull();
    expect(screen.getByTestId('offer-accept-c1')).toBeEnabled();
  });
});
