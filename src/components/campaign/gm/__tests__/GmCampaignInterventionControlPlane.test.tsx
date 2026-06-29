import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import type {
  IGmCampaignProjectedEffect,
  IGmTimeCascadeProjectedEffect,
} from '@/types/interventions';

import { createCampaign } from '@/types/campaign/Campaign';
import { TransactionType } from '@/types/campaign/Transaction';

import { GmCampaignInterventionControlPlane } from '../GmCampaignInterventionControlPlane';
import { GmCampaignPlayerLedgerView } from '../GmCampaignPlayerLedgerView';

function fixedNow(): string {
  return '3025-01-01T00:00:00.000Z';
}

describe('GmCampaignInterventionControlPlane', () => {
  it('hydrates player-safe rows from persisted campaign and time intervention events', () => {
    const campaign = {
      ...createCampaign('GM Ledger Reload Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: 'campaign-gm-reload',
      currentDate: new Date('3025-01-03T00:00:00.000Z'),
      updatedAt: '3025-01-03T00:00:00.000Z',
      gmInterventionEvents: [
        {
          type: 'gm.campaign.funds_transaction_corrected',
          domain: 'economy',
          family: 'funds-transaction',
          interventionId: 'gm-ledger-merchant-reversal',
          transactionId: 'gm-ledger-merchant-reversal',
          changedStateRefs: ['campaign:campaign-gm-reload:finances'],
          publicSummary: 'Merchant charge corrected by -2,500.00 C-bills.',
          before: {
            balanceCents: 100_000_000,
            transactionIds: [],
          },
          after: {
            balanceCents: 99_750_000,
            transaction: {
              id: 'gm-ledger-merchant-reversal',
              type: TransactionType.PartPurchase,
              amountCents: -250_000,
              date: '3025-01-03T00:00:00.000Z',
              description: 'GM merchant charge reversal',
            },
          },
        } satisfies IGmCampaignProjectedEffect,
      ],
      timeCascadeEvents: [
        {
          type: 'gm.campaign.time_cascade_applied',
          domain: 'time',
          family: 'time-advance',
          interventionId: 'gm-ledger-time-cascade',
          days: 2,
          before: {
            currentDate: '3025-01-03T00:00:00.000Z',
            updatedAt: '3025-01-03T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          after: {
            currentDate: '3025-01-05T00:00:00.000Z',
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          afterCampaign: {
            ...createCampaign('GM Ledger Reload Test', 'mercenary', {
              startingFunds: 1_000_000,
            }),
            id: 'campaign-gm-reload',
            currentDate: new Date('3025-01-05T00:00:00.000Z'),
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          daySummaries: [],
          generatedEvents: [],
          changedStateRefs: [
            'campaign:campaign-gm-reload:currentDate',
            'campaign:campaign-gm-reload:repairQueue',
          ],
          externalEffects: [],
          publicSummary: 'Campaign time corrected by 2 days.',
        } satisfies IGmTimeCascadeProjectedEffect,
      ],
    };

    render(
      <GmCampaignInterventionControlPlane
        campaign={campaign}
        onApplyCampaignUpdate={jest.fn()}
        now={fixedNow}
      />,
    );

    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Merchant charge corrected by -2,500.00 C-bills.',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Campaign time corrected by 2 days.',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      /Hidden campaign|Hidden time|black-market|GM-only/i,
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Merchant charge corrected by -2,500.00 C-bills.',
    );
    expect(screen.getByTestId('gm-ledger-private-log')).toHaveTextContent(
      'Campaign time corrected by 2 days.',
    );
    expect(screen.getByTestId('gm-ledger-private-log')).not.toHaveTextContent(
      /Hidden campaign|Hidden time|black-market|GM-only/i,
    );
  });

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

describe('GmCampaignPlayerLedgerView', () => {
  it('renders only player-safe persisted ledger rows', () => {
    const campaign = {
      ...createCampaign('GM Ledger Guest Mirror Test', 'mercenary', {
        startingFunds: 1_000_000,
      }),
      id: 'campaign-gm-guest',
      updatedAt: '3025-01-03T00:00:00.000Z',
      gmInterventionEvents: [
        {
          type: 'gm.campaign.funds_transaction_corrected',
          domain: 'economy',
          family: 'funds-transaction',
          interventionId: 'gm-ledger-merchant-reversal',
          transactionId: 'gm-ledger-merchant-reversal',
          changedStateRefs: ['campaign:campaign-gm-guest:finances'],
          publicSummary: 'Merchant charge corrected by -2,500.00 C-bills.',
          before: {
            balanceCents: 100_000_000,
            transactionIds: [],
          },
          after: {
            balanceCents: 99_750_000,
            transaction: {
              id: 'gm-ledger-merchant-reversal',
              type: TransactionType.PartPurchase,
              amountCents: -250_000,
              date: '3025-01-03T00:00:00.000Z',
              description: 'GM merchant charge reversal',
            },
          },
        } satisfies IGmCampaignProjectedEffect,
      ],
      timeCascadeEvents: [
        {
          type: 'gm.campaign.time_cascade_applied',
          domain: 'time',
          family: 'time-advance',
          interventionId: 'gm-ledger-time-cascade',
          days: 2,
          before: {
            currentDate: '3025-01-03T00:00:00.000Z',
            updatedAt: '3025-01-03T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          after: {
            currentDate: '3025-01-05T00:00:00.000Z',
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          afterCampaign: {
            ...createCampaign('GM Ledger Guest Mirror Test', 'mercenary', {
              startingFunds: 1_000_000,
            }),
            id: 'campaign-gm-guest',
            currentDate: new Date('3025-01-05T00:00:00.000Z'),
            updatedAt: '3025-01-05T00:00:00.000Z',
            currentSystemId: 'terra',
          },
          daySummaries: [],
          generatedEvents: [],
          changedStateRefs: [
            'campaign:campaign-gm-guest:currentDate',
            'campaign:campaign-gm-guest:repairQueue',
          ],
          externalEffects: [],
          publicSummary: 'Campaign time corrected by 2 days.',
        } satisfies IGmTimeCascadeProjectedEffect,
      ],
    };

    render(<GmCampaignPlayerLedgerView campaign={campaign} />);

    expect(
      screen.getByTestId('gm-ledger-player-only-notice'),
    ).toHaveTextContent(
      'GM controls are available only to the campaign owner or co-op host',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Merchant charge corrected by -2,500.00 C-bills.',
    );
    expect(screen.getByTestId('gm-ledger-player-log')).toHaveTextContent(
      'Campaign time corrected by 2 days.',
    );
    expect(
      screen.queryByTestId('gm-ledger-private-log'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('gm-ledger-preview-btn'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('gm-ledger-approve-btn'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('gm-ledger-manual-btn'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('gm-ledger-player-log')).not.toHaveTextContent(
      /Hidden campaign|Hidden time|black-market|GM-only|default outcome/i,
    );
  });
});
