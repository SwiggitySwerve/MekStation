/**
 * Co-op mission launch route probes for the staged multiplayer/co-op work.
 *
 * Pins the current honest state: the launch page renders the picker, but
 * cannot launch until the other player's participation choice is synced
 * from co-op state. Task 5.3 will flip this once CO1 participation
 * broadcast wiring lands.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

const mockRouterPush = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: { id: 'campaign-coop-1', missionId: 'mission-alpha' },
    pathname: '/gameplay/campaigns/[id]/missions/[missionId]/launch',
  }),
}));

jest.mock('@/components/campaign/CampaignNavigation', () => ({
  CampaignNavigation: () => <nav data-testid="campaign-navigation" />,
}));

const mockGetCampaign = jest.fn();
const mockCampaignStoreApi = {
  getState: () => ({ getCampaign: mockGetCampaign }),
};

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => mockCampaignStoreApi,
}));

import CoopMissionLaunchPage from '@/pages/gameplay/campaigns/[id]/missions/[missionId]/launch';

describe('CoopMissionLaunchPage - staged participation sync', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockGetCampaign.mockReset();
  });

  it('keeps co-op launch gated while the other player choice is not synchronized', async () => {
    const campaign = {
      ...createCampaign('Co-op Launch Probe', 'mercenary'),
      id: 'campaign-coop-1',
      coopSession: createHostCoopSession('ABC234'),
    };
    mockGetCampaign.mockReturnValue(campaign);

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('coop-launch-mission')).toBeInTheDocument();
    });

    expect(screen.getByTestId('campaign-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('coop-launch-waiting')).toHaveTextContent(
      "Waiting for the other player's pick",
    );
    expect(screen.getByTestId('coop-launch-mission')).toBeDisabled();

    screen.getByTestId('coop-launch-mission').click();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
