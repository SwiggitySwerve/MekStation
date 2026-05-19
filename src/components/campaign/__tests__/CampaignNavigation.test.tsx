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
