import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { createCampaign } from '@/types/campaign/Campaign';

import { GmCampaignInterventionControlPlane } from '../GmCampaignInterventionControlPlane';

function fixedNow(): string {
  return '3025-01-01T00:00:00.000Z';
}

describe('GmCampaignInterventionControlPlane', () => {
  it('previews and approves a funds correction with player-safe output', () => {
    const campaign = createCampaign('GM Ledger Test', 'mercenary', {
      startingFunds: 1_000_000,
    });
    const onApplyCampaignUpdate = jest.fn();

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'ready',
    );
    expect(
      screen.getByTestId('gm-ledger-preview-net-effect'),
    ).toHaveTextContent(
      '1,000,000.00 C-bills -> 997,500.00 C-bills (-2,500.00 C-bills)',
    );

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    expect(updates.finances.balance.format()).toBe('997,500.00 C-bills');
    expect(updates.finances.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gm-ledger-merchant-reversal',
          description: 'GM merchant charge reversal',
        }),
      ]),
    );

    const playerLog = within(screen.getByTestId('gm-ledger-player-log'));
    expect(
      playerLog.getByText(/Merchant charge corrected/),
    ).toBeInTheDocument();
    expect(playerLog.queryByText(/Hidden campaign/)).not.toBeInTheDocument();

    const gmLog = within(screen.getByTestId('gm-ledger-private-log'));
    expect(
      gmLog.getByText(/Hidden campaign merchant reversal/),
    ).toBeInTheDocument();
    expect(
      gmLog.getByText(/duplicated merchant charge remains/),
    ).toBeInTheDocument();
  });

  it('previews and approves a time cascade with player-safe output', () => {
    const campaign = {
      ...createCampaign('GM Time Ledger Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      currentDate: new Date('3025-02-02T00:00:00.000Z'),
      updatedAt: '2026-06-22T00:00:00.000Z',
      currentSystemId: 'terra',
    };
    const onApplyCampaignUpdate = jest.fn();

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    fireEvent.click(screen.getByTestId('gm-ledger-time-preview-btn'));

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'ready',
    );
    expect(
      screen.getByTestId('gm-ledger-preview-time-effect'),
    ).toHaveTextContent('3025-02-02 -> 3025-02-04 (2 days)');

    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    const updates = onApplyCampaignUpdate.mock.calls[0][0];
    expect(updates.currentDate.toISOString()).toBe('3025-02-04T00:00:00.000Z');
    expect(updates.timeCascadeEvents).toHaveLength(1);

    const playerLog = within(screen.getByTestId('gm-ledger-player-log'));
    expect(
      playerLog.getByText(/Campaign time corrected by 2 days/),
    ).toBeInTheDocument();
    expect(
      playerLog.queryByText(/Hidden time cascade/),
    ).not.toBeInTheDocument();

    const gmLog = within(screen.getByTestId('gm-ledger-private-log'));
    expect(
      gmLog.getByText(/Hidden time cascade correction/),
    ).toBeInTheDocument();
    expect(gmLog.getByText(/previous timeline/)).toBeInTheDocument();
  });

  it('blocks conflicted approval and records manual takeover without mutating state', () => {
    const campaign = createCampaign('GM Ledger Manual Test', 'mercenary', {
      startingFunds: 1_000_000,
    });
    const onApplyCampaignUpdate = jest.fn();

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
        now={fixedNow}
      />,
    );

    fireEvent.click(screen.getByTestId('gm-ledger-conflict-preview-btn'));

    expect(screen.getByTestId('gm-ledger-preview-status')).toHaveTextContent(
      'requires-manual-takeover',
    );
    expect(screen.getByTestId('gm-ledger-approve-btn')).toBeDisabled();
    expect(screen.getByTestId('gm-ledger-manual-btn')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('gm-ledger-manual-btn'));

    expect(onApplyCampaignUpdate).not.toHaveBeenCalled();
    expect(screen.getByTestId('gm-ledger-manual-status')).toHaveTextContent(
      'no campaign state changed',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'No campaign state changed',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      'Hidden campaign',
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Manual takeover selected',
    );
  });
});
