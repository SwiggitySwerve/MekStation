import { render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignOperationsSummary } from '@/lib/campaign/hooks/useCampaignDashboardSummary';

import { OperationsQueueCard } from '../CampaignDashboardActivityCards';

const ATTENTION_SUMMARY: ICampaignOperationsSummary = {
  unresolvedCount: 4,
  statusLabel: '4 attention items',
  items: [
    {
      id: 'pending-battle-outcomes',
      title: 'Battle outcome waiting',
      detail:
        '1 result needs campaign application before the next clean day advance.',
      href: '/gameplay/campaigns/campaign-1/gm-ledger',
      ctaLabel: 'Open GM ledger',
      priority: 'critical',
    },
    {
      id: 'salvage-review',
      title: 'Salvage review',
      detail: '1 allocation still needs accept, decline, or GM correction.',
      href: '/gameplay/campaigns/campaign-1/salvage',
      ctaLabel: 'Review salvage',
      priority: 'warning',
    },
    {
      id: 'repair-queue',
      title: 'Repair queue active',
      detail:
        '2 repair tickets can affect mission readiness and operating cost.',
      href: '/gameplay/campaigns/campaign-1/repair-bay',
      ctaLabel: 'Open repair bay',
      priority: 'warning',
    },
    {
      id: 'finance-runway',
      title: 'Finance runway low',
      detail: '7 days of runway at the current daily cost estimate.',
      href: '/gameplay/campaigns/campaign-1/finances',
      ctaLabel: 'Review finances',
      priority: 'critical',
    },
    {
      id: 'active-contract',
      title: 'Mission track ready',
      detail: 'Defense Contract has 22 days remaining.',
      href: '/gameplay/campaigns/campaign-1/missions',
      ctaLabel: 'Open missions',
      priority: 'ready',
    },
  ],
};

describe('OperationsQueueCard', () => {
  it('shows unresolved work, priority labels, and direct route links', () => {
    render(
      <OperationsQueueCard
        campaignId="campaign-1"
        summary={ATTENTION_SUMMARY}
      />,
    );

    expect(screen.getByTestId('dashboard-card-operations-queue')).toBeVisible();
    expect(screen.getByTestId('operations-queue-status')).toHaveTextContent(
      '4 attention items',
    );
    expect(screen.getByTestId('operations-queue-count')).toHaveTextContent('4');
    expect(
      screen.getByTestId('operations-queue-priority-pending-battle-outcomes'),
    ).toHaveTextContent('Critical');
    expect(
      screen.getByTestId('operations-queue-priority-salvage-review'),
    ).toHaveTextContent('Needs attention');

    expect(
      screen.getByTestId('operations-queue-link-pending-battle-outcomes'),
    ).toHaveAttribute('href', '/gameplay/campaigns/campaign-1/gm-ledger');
    expect(
      screen.getByTestId('operations-queue-link-salvage-review'),
    ).toHaveAttribute('href', '/gameplay/campaigns/campaign-1/salvage');
    expect(
      screen.getByTestId('operations-queue-link-repair-queue'),
    ).toHaveAttribute('href', '/gameplay/campaigns/campaign-1/repair-bay');
    expect(
      screen.getByTestId('operations-queue-link-finance-runway'),
    ).toHaveAttribute('href', '/gameplay/campaigns/campaign-1/finances');
  });

  it('caps the visible queue at four items so the dashboard stays scannable', () => {
    render(
      <OperationsQueueCard
        campaignId="campaign-1"
        summary={ATTENTION_SUMMARY}
      />,
    );

    expect(
      screen.queryByTestId('operations-queue-item-active-contract'),
    ).not.toBeInTheDocument();
  });

  it('renders an empty state when no operations are waiting', () => {
    render(
      <OperationsQueueCard
        campaignId="campaign-1"
        summary={{
          unresolvedCount: 0,
          statusLabel: 'No blockers',
          items: [],
        }}
      />,
    );

    expect(screen.getByTestId('operations-queue-empty')).toHaveTextContent(
      'No operational items are waiting.',
    );
    expect(screen.getByTestId('operations-queue-count')).toHaveTextContent('0');
  });
});
