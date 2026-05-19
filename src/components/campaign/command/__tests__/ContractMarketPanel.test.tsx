/**
 * Contract Market Panel — render tests
 *
 * Covers tasks.md 4.6 and the spec scenarios "Contract Market lists
 * offers", "Declining a contract hides the offer", and "Contract Market
 * empty state".
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SAMPLE_OFFERS } from '../__fixtures__/commandFixtures';
import { ContractMarketPanel } from '../ContractMarketPanel';

describe('ContractMarketPanel', () => {
  it('renders a card for every contract offer', () => {
    render(
      <ContractMarketPanel
        offers={SAMPLE_OFFERS}
        onAccept={() => {}}
        onDecline={() => {}}
      />,
    );
    for (const offer of SAMPLE_OFFERS) {
      expect(screen.getByTestId(`offer-card-${offer.id}`)).toBeInTheDocument();
    }
  });

  it('shows employer, pay, salvage rights, and duration per offer', () => {
    render(
      <ContractMarketPanel
        offers={SAMPLE_OFFERS}
        onAccept={() => {}}
        onDecline={() => {}}
      />,
    );
    const offer = SAMPLE_OFFERS[0];
    expect(
      screen.getByTestId(`offer-employer-${offer.id}`),
    ).toBeInTheDocument();
    expect(screen.getByTestId(`offer-pay-${offer.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`offer-salvage-${offer.id}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`offer-duration-${offer.id}`),
    ).toBeInTheDocument();
  });

  it('accept calls onAccept with the offer id', () => {
    const onAccept = jest.fn();
    render(
      <ContractMarketPanel
        offers={SAMPLE_OFFERS}
        onAccept={onAccept}
        onDecline={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId(`offer-accept-${SAMPLE_OFFERS[0].id}`));
    expect(onAccept).toHaveBeenCalledWith(SAMPLE_OFFERS[0].id);
  });

  it('decline calls onDecline with the offer id', () => {
    const onDecline = jest.fn();
    render(
      <ContractMarketPanel
        offers={SAMPLE_OFFERS}
        onAccept={() => {}}
        onDecline={onDecline}
      />,
    );
    fireEvent.click(screen.getByTestId(`offer-decline-${SAMPLE_OFFERS[0].id}`));
    expect(onDecline).toHaveBeenCalledWith(SAMPLE_OFFERS[0].id);
  });

  it('shows an empty state when the market has no offers', () => {
    render(
      <ContractMarketPanel
        offers={[]}
        onAccept={() => {}}
        onDecline={() => {}}
      />,
    );
    expect(screen.getByTestId('command-empty')).toBeInTheDocument();
  });
});
