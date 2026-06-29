/**
 * Campaign Navigation — Bays group tests
 *
 * Covers the spec scenario "Bay surfaces are reachable": the campaign
 * navigation exposes a "Bays" group linking to the four post-battle bay
 * surfaces (CP2a — `add-campaign-bay-ui`).
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

import { CampaignNavigation } from '../CampaignNavigation';

describe('CampaignNavigation — Bays group', () => {
  it('renders a "Bays" navigation group', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="dashboard" />,
    );
    expect(screen.getByTestId('campaign-nav-bays-group')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Bays' })).toBeInTheDocument();
  });

  it('links to all four bay surfaces', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="dashboard" />,
    );
    expect(screen.getByText('Mech Bay')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/mech-bay',
    );
    expect(screen.getByText('Repair Bay')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/repair-bay',
    );
    expect(screen.getByText('Medical Bay')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/medical-bay',
    );
    expect(screen.getByText('Salvage')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/salvage',
    );
  });

  it('marks the active bay page with aria-current', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="repair-bay" />,
    );
    expect(screen.getByText('Repair Bay')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Mech Bay')).not.toHaveAttribute('aria-current');
  });

  it('still renders the core campaign tabs alongside the Bays group', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="dashboard" />,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Personnel')).toBeInTheDocument();
    expect(screen.getByText('Forces')).toBeInTheDocument();
    expect(screen.getByText('Missions')).toBeInTheDocument();
  });
});

/**
 * Covers the spec scenario "Command surfaces are reachable": the campaign
 * navigation exposes a "Command" group linking to the three command-tier
 * surfaces (CP2b — `add-campaign-command-ui`).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */
describe('CampaignNavigation — Command group', () => {
  it('renders a "Command" navigation group', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="dashboard" />,
    );
    expect(
      screen.getByTestId('campaign-nav-command-group'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Command' })).toBeInTheDocument();
  });

  it('links to all command surfaces', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="dashboard" />,
    );
    expect(screen.getByText('Personnel & Hiring')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/hiring',
    );
    expect(screen.getByText('Finances & Loans')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/finances',
    );
    expect(screen.getByText('Contract Market')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/contract-market',
    );
    expect(screen.getByText('GM Ledger')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/gm-ledger',
    );
  });

  it('shows GM Ledger for co-op hosts', () => {
    render(
      <CampaignNavigation
        campaignId="campaign-1"
        currentPage="dashboard"
        coopSession={createHostCoopSession('HOST1', 'match-host')}
      />,
    );
    expect(screen.getByText('GM Ledger')).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-1/gm-ledger',
    );
    expect(screen.getByTestId('coop-session-badge')).toHaveTextContent(
      'Co-op session: Host',
    );
  });

  it('hides GM Ledger for co-op guests', () => {
    render(
      <CampaignNavigation
        campaignId="campaign-1"
        currentPage="dashboard"
        coopSession={createGuestCoopSession('match-host', 'GUEST1')}
      />,
    );
    expect(screen.queryByText('GM Ledger')).not.toBeInTheDocument();
    expect(screen.getByTestId('coop-session-badge')).toHaveTextContent(
      'Co-op session: Guest',
    );
  });

  it('marks the active command page with aria-current', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="finances" />,
    );
    expect(screen.getByText('Finances & Loans')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Personnel & Hiring')).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks the GM ledger command page with aria-current', () => {
    render(
      <CampaignNavigation campaignId="campaign-1" currentPage="gm-ledger" />,
    );
    expect(screen.getByText('GM Ledger')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
